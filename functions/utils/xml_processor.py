mport os
import base64
import hashlib
from lxml import etree
from pathlib import Path
import logging
import re

# Importaciones con manejo de errores
try:
    from OpenSSL import crypto
    OPENSSL_AVAILABLE = True
except ImportError:
    OPENSSL_AVAILABLE = False
    print("⚠️ pyOpenSSL no disponible")

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography import x509
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False
    print("⚠️ Librería 'cryptography' no disponible")
    print("💡 Instala con: pip install cryptography")


class XMLProcessor:
    def __init__(self, cert_folder):
        self.cert_folder = Path(cert_folder)
        self.logger = logging.getLogger(__name__)

    def sellar_xml(self, xml_path):
        try:
            is_valid, error = self.validate_xml(xml_path)
            if not is_valid:
                self.logger.error(f"❌ XML mal formado: {error}")
                return None

            tree = etree.parse(xml_path)
            root = tree.getroot()

            # Si ya está sellado, retornar el XML actual como está
            if self.esta_sellado(root):
                self.logger.info(f"ℹ️ El archivo ya está sellado: {xml_path}")
                return etree.tostring(tree, encoding="utf-8", 
                                    xml_declaration=True, 
                                    pretty_print=True).decode('utf-8')

            rfc = self.extraer_rfc_emisor(root)
            if not rfc:
                self.logger.error("❌ No se pudo extraer el RFC del emisor")
                return None

            emisor_folder = self.cert_folder / rfc
            cer_path = emisor_folder / f"{rfc}.cer"
            key_path = emisor_folder / f"{rfc}.key"
            pass_path = emisor_folder / "contraseña.txt"

            if not cer_path.exists() or not key_path.exists() or not pass_path.exists():
                self.logger.error(f"❌ Archivos de certificados faltantes para {rfc}")
                return None

            with open(pass_path, 'r', encoding='utf-8') as f:
                password = f.read().rstrip('\r\n')  # Solo eliminar saltos de línea, preservar espacios

            cert, cert_b64, no_certificado = self.cargar_certificado(cer_path)
            if not cert:
                self.logger.error("❌ Error al cargar certificado")
                return None

            # Extraer la fecha del XML para validar el certificado
            fecha_xml = self.extraer_fecha_xml(root)
            if not fecha_xml:
                self.logger.error("❌ No se pudo extraer la fecha del XML")
                return None
                
            if not self.validar_certificado(cert, fecha_xml):
                self.logger.error("❌ Certificado inválido o la fecha del XML está fuera del período de validez del certificado")
                return None

            self.limpiar_atributos_sellado(root)
            root.set("NoCertificado", no_certificado)
            self.logger.info(f"✅ NoCertificado asignado: {no_certificado}")

            cadena_original = self.generar_cadena_original(tree)
            if not cadena_original:
                return None

            self.logger.info(f"📝 Cadena original generada: {cadena_original[:100]}...")

            sello = self.firmar_cadena(key_path, password, cadena_original)
            if not sello:
                self.logger.error("❌ No se pudo generar el sello - DETENIENDO PROCESO")
                return None

            self.logger.info(f"🔐 Sello generado correctamente")
            root.set("Sello", sello)
            root.set("Certificado", cert_b64)

            # Verificar que los atributos se asignaron correctamente
            if not root.get("Sello") or not root.get("NoCertificado") or not root.get("Certificado"):
                self.logger.error("❌ Error: Los atributos no se asignaron correctamente al XML")
                return None

            if not self.validar_sellado(cer_path, cadena_original, sello):
                self.logger.error("❌ Validación del sello falló")
                return None

            # Convertir el XML a string
            xml_sellado = etree.tostring(tree, encoding="utf-8", 
                                       xml_declaration=True, 
                                       pretty_print=True).decode('utf-8')

            self.logger.info(f"✅ XML sellado exitosamente: {xml_path}")
            return xml_sellado

        except Exception as e:
            self.logger.error(f"❌ Error sellando XML: {e}")
            return None

    def cargar_certificado(self, cer_path):
        """
        Carga el certificado usando múltiples métodos y extrae el número de certificado
        siguiendo la misma lógica que el código exitoso del diagnóstico
        """
        try:
            with open(cer_path, 'rb') as cer_file:
                cert_der = cer_file.read()

            cert = None
            cert_b64 = base64.b64encode(cert_der).decode('utf-8')

            # Método 1: pyOpenSSL (si está disponible)
            if OPENSSL_AVAILABLE:
                try:
                    if cert_der.startswith(b'-----BEGIN'):
                        cert = crypto.load_certificate(
                            crypto.FILETYPE_PEM, cert_der)
                    else:
                        cert = crypto.load_certificate(
                            crypto.FILETYPE_ASN1, cert_der)
                    print("✅ Certificado cargado con pyOpenSSL")
                except Exception as e:
                    print(f"⚠️ Error con pyOpenSSL: {e}")

            # Método 2: cryptography (más confiable)
            crypto_cert = None
            if CRYPTOGRAPHY_AVAILABLE:
                try:
                    if cert_der.startswith(b'-----BEGIN'):
                        crypto_cert = x509.load_pem_x509_certificate(cert_der)
                    else:
                        crypto_cert = x509.load_der_x509_certificate(cert_der)
                    print("✅ Certificado cargado con cryptography")
                except Exception as e:
                    print(f"⚠️ Error con cryptography: {e}")

            if not cert and not crypto_cert:
                print("❌ No se pudo cargar el certificado con ningún método")
                return None, None, None

            # Extraer número de serie (usar el método que funcione)
            if crypto_cert:
                serial_number = crypto_cert.serial_number
            elif cert:
                serial_number = cert.get_serial_number()
            else:
                return None, None, None

            # Aplicar la misma lógica exitosa del diagnóstico
            no_certificado = self._extraer_numero_certificado(serial_number)

            if not no_certificado:
                print("❌ No se pudo extraer número de certificado válido")
                return None, None, None

            print(f"🔢 Número de certificado extraído: {no_certificado}")

            # Retornar el certificado que se pudo cargar
            return cert or crypto_cert, cert_b64, no_certificado

        except Exception as e:
            print(f"❌ Error al cargar certificado: {e}")
            self.logger.error(
                f"Error detallado cargando certificado: {e}", exc_info=True)
            return None, None, None

    def _extraer_numero_certificado(self, serial_number):
        """Extrae el número de certificado usando la lógica exitosa del diagnóstico"""
        try:
            # Convertir a hexadecimal
            serial_hex = format(serial_number, 'x')

            # Asegurar que tenga longitud par para hex2bin
            if len(serial_hex) % 2 != 0:
                serial_hex = '0' + serial_hex

            # Convertir hex a bytes y luego extraer solo dígitos (igual que PHP)
            try:
                serial_bytes = bytes.fromhex(serial_hex)
                serial_ascii = serial_bytes.decode('ascii', errors='ignore')
                # Extraer solo dígitos (mismo proceso que PHP)
                no_certificado = re.sub(r'[^0-9]', '', serial_ascii)

                # Verificar que tenga exactamente 20 dígitos
                if len(no_certificado) == 20:
                    return no_certificado

                # Métodos alternativos si no es exactamente 20
                print(
                    f"⚠️ Longitud incorrecta: {len(no_certificado)}, aplicando métodos alternativos")

                # Alternativa 1: usar los últimos 20 caracteres del hex
                if len(serial_hex) >= 20:
                    alt1 = serial_hex[-20:]
                    if alt1.isdigit():
                        return alt1

                # Alternativa 2: usar el número serial directo
                serial_str = str(serial_number)
                if len(serial_str) >= 20:
                    alt2 = serial_str[-20:]
                else:
                    alt2 = serial_str.zfill(20)

                return alt2 if alt2.isdigit() else None

            except Exception as e:
                print(f"Error procesando serial hex: {e}")
                # Fallback al método original
                serial_str = str(serial_number)
                if len(serial_str) >= 20:
                    return serial_str[-20:]
                else:
                    return serial_str.zfill(20)

        except Exception as e:
            print(f"❌ Error extrayendo número de certificado: {e}")
            return None

    def extraer_fecha_xml(self, root):
        """Extrae la fecha del XML para validar contra el certificado"""
        try:
            fecha_str = root.get("Fecha")
            if not fecha_str:
                print("❌ No se encontró la fecha en el XML")
                return None
            
            # Parsear la fecha del XML (formato ISO: 2024-01-15T10:30:00)
            import datetime
            # Remover la zona horaria si existe para simplificar
            if 'T' in fecha_str:
                fecha_str = fecha_str.split('T')[0] + 'T' + fecha_str.split('T')[1].split('-')[0].split('+')[0]
            
            try:
                fecha_xml = datetime.datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                if fecha_xml.tzinfo is None:
                    fecha_xml = fecha_xml.replace(tzinfo=datetime.timezone.utc)
                print(f"📅 Fecha del XML: {fecha_xml}")
                return fecha_xml
            except ValueError:
                # Intentar otros formatos comunes
                for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
                    try:
                        fecha_xml = datetime.datetime.strptime(fecha_str[:len(fmt.replace('%', ''))], fmt)
                        fecha_xml = fecha_xml.replace(tzinfo=datetime.timezone.utc)
                        print(f"📅 Fecha del XML: {fecha_xml}")
                        return fecha_xml
                    except ValueError:
                        continue
                print(f"❌ No se pudo parsear la fecha del XML: {fecha_str}")
                return None
                
        except Exception as e:
            print(f"❌ Error extrayendo fecha del XML: {e}")
            return None

    def validar_certificado(self, cert, fecha_xml=None):
        """Valida el certificado usando la fecha del XML en lugar de la fecha actual"""
        try:
            import datetime
            
            # Si no se proporciona fecha del XML, usar fecha actual (comportamiento anterior)
            fecha_validacion = fecha_xml or datetime.datetime.now(datetime.timezone.utc)
            print(f"📅 Validando certificado contra fecha: {fecha_validacion}")
            
            # Si es un certificado de pyOpenSSL
            if hasattr(cert, 'has_expired'):
                # Para pyOpenSSL, necesitamos comparar manualmente con las fechas
                try:
                    not_before_str = cert.get_notBefore().decode('utf-8')
                    not_after_str = cert.get_notAfter().decode('utf-8')
                    
                    # Parsear fechas del certificado (formato: 20240101000000Z)
                    not_before = datetime.datetime.strptime(not_before_str, '%Y%m%d%H%M%SZ')
                    not_after = datetime.datetime.strptime(not_after_str, '%Y%m%d%H%M%SZ')
                    not_before = not_before.replace(tzinfo=datetime.timezone.utc)
                    not_after = not_after.replace(tzinfo=datetime.timezone.utc)
                    
                    print(f"📅 Certificado válido desde: {not_before}")
                    print(f"📅 Certificado válido hasta: {not_after}")
                    
                    if fecha_validacion < not_before:
                        print(f"❌ La fecha del XML ({fecha_validacion}) es anterior a la validez del certificado ({not_before})")
                        return False
                    if fecha_validacion > not_after:
                        print(f"❌ La fecha del XML ({fecha_validacion}) es posterior a la expiración del certificado ({not_after})")
                        return False
                        
                except Exception as e:
                    print(f"⚠️ Error parseando fechas del certificado pyOpenSSL: {e}")
                    # Fallback al método original
                    if cert.has_expired():
                        print("❌ Certificado expirado (validación actual)")
                        return False
                
                version = cert.get_version()
                if version < 2:
                    print(f"❌ Versión de certificado inválida: {version+1}")
                    return False
                return True

            # Si es un certificado de cryptography
            elif hasattr(cert, 'not_valid_after_utc'):
                not_before = cert.not_valid_before_utc
                not_after = cert.not_valid_after_utc
                
                print(f"📅 Certificado válido desde: {not_before}")
                print(f"📅 Certificado válido hasta: {not_after}")
                
                if fecha_validacion < not_before:
                    print(f"❌ La fecha del XML ({fecha_validacion}) es anterior a la validez del certificado ({not_before})")
                    return False
                if fecha_validacion > not_after:
                    print(f"❌ La fecha del XML ({fecha_validacion}) es posterior a la expiración del certificado ({not_after})")
                    return False
                return True

            # Si es un certificado de cryptography (versión anterior)
            elif hasattr(cert, 'not_valid_after'):
                # Manejar tanto naive como aware datetime
                try:
                    not_before = getattr(cert, 'not_valid_before_utc', cert.not_valid_before)
                    not_after = getattr(cert, 'not_valid_after_utc', cert.not_valid_after)
                    
                    # Asegurar que las fechas tengan timezone
                    if not_before.tzinfo is None:
                        not_before = not_before.replace(tzinfo=datetime.timezone.utc)
                    if not_after.tzinfo is None:
                        not_after = not_after.replace(tzinfo=datetime.timezone.utc)
                        
                    print(f"📅 Certificado válido desde: {not_before}")
                    print(f"📅 Certificado válido hasta: {not_after}")
                    
                    if fecha_validacion < not_before:
                        print(f"❌ La fecha del XML ({fecha_validacion}) es anterior a la validez del certificado ({not_before})")
                        return False
                    if fecha_validacion > not_after:
                        print(f"❌ La fecha del XML ({fecha_validacion}) es posterior a la expiración del certificado ({not_after})")
                        return False
                        
                except AttributeError as e:
                    print(f"⚠️ Error accediendo a fechas del certificado: {e}")
                    return True  # Asumir válido si no se puede verificar
                    
                return True

            print("⚠️ No se pudo validar la expiración del certificado")
            return True  # Asumir válido si no se puede verificar

        except Exception as e:
            print(f"❌ Error validando certificado: {e}")
            return False

    def limpiar_atributos_sellado(self, root):
        """Limpia atributos de sellado previos"""
        for attr in ["NoCertificado", "Certificado", "Sello"]:
            if attr in root.attrib:
                del root.attrib[attr]
        print("🧹 Atributos de sellado limpiados")

    def generar_cadena_original(self, tree):
        try:
            xslt_path = Path(__file__).resolve().parent / \
                "xslt" / "cadenaoriginal_4_0.xslt"
            if not xslt_path.exists():
                print(f"❌ Archivo XSLT no encontrado: {xslt_path}")
                return None
            xslt_root = etree.parse(str(xslt_path))
            transform = etree.XSLT(xslt_root)
            return str(transform(tree)).strip()
        except Exception as e:
            print(f"❌ Error generando cadena original: {e}")
            return None

    def firmar_cadena(self, key_path, password, cadena_original):
        """
        Firma la cadena original priorizando cryptography (que sabemos que funciona)
        y usando métodos de fallback
        """
        print("🔐 Iniciando proceso de firma...")

        # Método 1: cryptography library (PRIORIDAD - sabemos que funciona)
        if CRYPTOGRAPHY_AVAILABLE:
            print("🔄 Método 1: Probando firma con cryptography...")
            sello = self._firmar_con_cryptography(
                key_path, password, cadena_original)
            if sello:
                print("✅ Firma exitosa con cryptography")
                return sello
        else:
            print("⚠️ cryptography no disponible")

        # Método 2: pyOpenSSL directo (solo si crypto.sign está disponible)
        if OPENSSL_AVAILABLE:
            print("🔄 Método 2: Probando firma con pyOpenSSL...")
            sello = self._firmar_con_pyopenssl(
                key_path, password, cadena_original)
            if sello:
                print("✅ Firma exitosa con pyOpenSSL")
                return sello

        # Método 3: Conversión con openssl command line
        print("🔄 Método 3: Probando conversión con openssl command line...")
        sello = self._firmar_con_openssl_cli(
            key_path, password, cadena_original)
        if sello:
            print("✅ Firma exitosa con openssl CLI")
            return sello

        print("❌ No se pudo generar el sello con ningún método")
        return None

    def _firmar_con_cryptography(self, key_path, password, cadena_original):
        """Firma usando cryptography library - MÉTODO PRINCIPAL"""
        try:
            with open(key_path, 'rb') as key_file:
                key_data = key_file.read()

            # Métodos de carga basados en el diagnóstico exitoso
            load_methods = [
                ("DER con contraseña", lambda: serialization.load_der_private_key(
                    key_data, password=password.encode('utf-8'))),
                ("PEM con contraseña", lambda: serialization.load_pem_private_key(
                    key_data, password=password.encode('utf-8'))),
                ("DER sin contraseña", lambda: serialization.load_der_private_key(
                    key_data, password=None)),
                ("PEM sin contraseña", lambda: serialization.load_pem_private_key(
                    key_data, password=None)),
            ]

            private_key = None
            for desc, loader in load_methods:
                try:
                    private_key = loader()
                    print(f"   ✅ {desc}: Llave cargada correctamente")
                    break
                except Exception as e:
                    print(f"   ❌ {desc}: {str(e)[:60]}...")
                    continue

            if not private_key:
                print("❌ No se pudo cargar la llave privada con cryptography")
                return None

            # Firmar con SHA256 + RSA PKCS1v15 (estándar CFDI)
            signature = private_key.sign(
                cadena_original.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )

            sello = base64.b64encode(signature).decode('utf-8')
            print(f"✅ Sello generado con cryptography: {sello[:50]}...")
            return sello

        except Exception as e:
            print(f"❌ Error firmando con cryptography: {e}")
            return None

    def _firmar_con_pyopenssl(self, key_path, password, cadena_original):
        """Firma usando pyOpenSSL directo"""
        try:
            # Verificar que crypto.sign esté disponible
            if not hasattr(crypto, 'sign'):
                print("❌ crypto.sign no disponible en esta versión de pyOpenSSL")
                return None

            with open(key_path, 'rb') as key_file:
                key_data = key_file.read()

            # Intentar diferentes formatos de carga
            load_methods = [
                (crypto.FILETYPE_ASN1, True, "ASN1/DER con contraseña"),
                (crypto.FILETYPE_PEM, True, "PEM con contraseña"),
                (crypto.FILETYPE_ASN1, False, "ASN1/DER sin contraseña"),
                (crypto.FILETYPE_PEM, False, "PEM sin contraseña"),
            ]

            for file_type, use_pass, desc in load_methods:
                try:
                    if use_pass:
                        pkey = crypto.load_privatekey(
                            file_type, key_data, passphrase=password.encode('utf-8'))
                    else:
                        pkey = crypto.load_privatekey(file_type, key_data)

                    print(f"   ✅ {desc}: Llave cargada correctamente")

                    # Firmar
                    signature = crypto.sign(
                        pkey, cadena_original.encode('utf-8'), 'sha256')
                    sello = base64.b64encode(signature).decode('utf-8')
                    print(f"✅ Sello generado con pyOpenSSL: {sello[:50]}...")
                    return sello

                except Exception as e:
                    print(f"   ❌ {desc}: {str(e)[:60]}...")
                    continue

            print("❌ No se pudo cargar la llave con pyOpenSSL")
            return None

        except Exception as e:
            print(f"❌ Error firmando con pyOpenSSL: {e}")
            return None

    def _firmar_con_openssl_cli(self, key_path, password, cadena_original):
        """Firma usando openssl command line como fallback"""
        import subprocess
        import tempfile

        try:
            # Verificar que openssl esté disponible
            result = subprocess.run(['openssl', 'version'],
                                    capture_output=True, text=True)
            if result.returncode != 0:
                print("❌ OpenSSL command line no disponible")
                return None

            # Crear archivo temporal para la llave convertida
            with tempfile.NamedTemporaryFile(mode='w+b', delete=False, suffix='.pem') as temp_file:
                temp_pem_path = temp_file.name

            try:
                # Convertir DER a PEM
                cmd = [
                    'openssl', 'rsa',
                    '-in', str(key_path),
                    '-inform', 'DER',
                    '-out', temp_pem_path,
                    '-outform', 'PEM',
                    '-passin', f'pass:{password}'
                ]

                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode == 0:
                    print("   ✅ Conversión DER->PEM exitosa")

                    # Cargar la llave convertida y firmar
                    with open(temp_pem_path, 'rb') as f:
                        pem_data = f.read()

                    # Intentar con cryptography primero
                    if CRYPTOGRAPHY_AVAILABLE:
                        try:
                            private_key = serialization.load_pem_private_key(
                                pem_data, password=None)
                            signature = private_key.sign(
                                cadena_original.encode('utf-8'),
                                padding.PKCS1v15(),
                                hashes.SHA256()
                            )
                            sello = base64.b64encode(signature).decode('utf-8')
                            print(
                                f"✅ Sello con llave convertida (cryptography): {sello[:50]}...")
                            return sello
                        except Exception as e:
                            print(f"   ❌ Error con cryptography: {e}")

                    # Fallback a pyOpenSSL
                    if OPENSSL_AVAILABLE and hasattr(crypto, 'sign'):
                        try:
                            pkey = crypto.load_privatekey(
                                crypto.FILETYPE_PEM, pem_data)
                            signature = crypto.sign(
                                pkey, cadena_original.encode('utf-8'), 'sha256')
                            sello = base64.b64encode(signature).decode('utf-8')
                            print(
                                f"✅ Sello con llave convertida (pyOpenSSL): {sello[:50]}...")
                            return sello
                        except Exception as e:
                            print(f"   ❌ Error con pyOpenSSL: {e}")

                else:
                    print(f"   ❌ Error en conversión: {result.stderr.strip()}")

            finally:
                # Limpiar archivo temporal
                try:
                    os.unlink(temp_pem_path)
                except:
                    pass

            return None

        except FileNotFoundError:
            print("❌ openssl no disponible en el sistema")
            return None
        except Exception as e:
            print(f"❌ Error en conversión con openssl: {e}")
            return None

    def validar_sellado(self, cer_path, cadena_original, sello):
        """Valida el sello usando múltiples métodos"""
        try:
            signature = base64.b64decode(sello)

            # Cargar certificado para verificación
            with open(cer_path, 'rb') as f:
                cert_data = f.read()

            # Método 1: Con cryptography (más confiable)
            if CRYPTOGRAPHY_AVAILABLE:
                try:
                    if cert_data.startswith(b'-----BEGIN'):
                        cert = x509.load_pem_x509_certificate(cert_data)
                    else:
                        cert = x509.load_der_x509_certificate(cert_data)

                    public_key = cert.public_key()
                    public_key.verify(
                        signature,
                        cadena_original.encode('utf-8'),
                        padding.PKCS1v15(),
                        hashes.SHA256()
                    )
                    print("✅ Sello validado correctamente con cryptography")
                    return True
                except Exception as e:
                    print(f"⚠️ Validación con cryptography falló: {e}")

            # Método 2: Con pyOpenSSL (fallback)
            if OPENSSL_AVAILABLE and hasattr(crypto, 'verify'):
                try:
                    if cert_data.startswith(b'-----BEGIN'):
                        cert = crypto.load_certificate(
                            crypto.FILETYPE_PEM, cert_data)
                    else:
                        cert = crypto.load_certificate(
                            crypto.FILETYPE_ASN1, cert_data)

                    crypto.verify(cert, signature,
                                  cadena_original.encode('utf-8'), 'sha256')
                    print("✅ Sello validado correctamente con pyOpenSSL")
                    return True
                except Exception as e:
                    print(f"⚠️ Validación con pyOpenSSL falló: {e}")

            print("❌ No se pudo validar el sello con ningún método")
            return False

        except Exception as e:
            print(f"❌ Error validando sello: {e}")
            return False

    def esta_sellado(self, root):
        sellado = all(root.get(attr)
                      for attr in ["Sello", "NoCertificado", "Certificado"])
        if sellado:
            print("📋 El XML ya contiene todos los atributos de sellado")
        return sellado

    def validate_xml(self, xml_path):
        try:
            tree = etree.parse(xml_path)
            root = tree.getroot()
            if root.tag != "{http://www.sat.gob.mx/cfd/4}Comprobante":
                return False, "Elemento raíz incorrecto"
            for attr in ["Version", "Fecha", "TipoDeComprobante"]:
                if not root.get(attr):
                    return False, f"Falta atributo: {attr}"
            return True, None
        except etree.XMLSyntaxError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Error general: {e}"

    def extraer_rfc_emisor(self, root):
        try:
            emisor = root.find(".//{http://www.sat.gob.mx/cfd/4}Emisor")
            if emisor is not None:
                rfc = emisor.get("Rfc") or emisor.get("RFC")
                print(f"📋 RFC del emisor extraído: {rfc}")
                return rfc
            print("❌ No se encontró el elemento Emisor")
            return None
        except Exception as e:
            print(f"❌ Error extrayendo RFC: {e}")
            return None

    def verificar_xml_sellado(self, xml_path):
        try:
            tree = etree.parse(xml_path)
            root = tree.getroot()
            atributos = ["NoCertificado", "Sello", "Certificado"]
            for attr in atributos:
                value = root.get(attr)
                if not value:
                    print(f"❌ Falta atributo {attr} en el XML guardado")
                    return False
                print(f"✅ {attr}: {value[:50]}..." if len(
                    value) > 50 else f"✅ {attr}: {value}")
            return True
        except Exception as e:
            print(f"❌ Error verificando XML sellado: {e}")
            return False
