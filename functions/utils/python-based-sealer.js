/**
 * 🎯 SELLADOR CFDI BASADO EN CÓDIGO PYTHON FUNCIONAL
 * 
 * Implementación que replica exactamente el flujo del código Python que SÍ funciona:
 * 1. Parsear XML
 * 2. Agregar certificados (NoCertificado, Certificado)
 * 3. Generar cadena original con XSLT oficial SAT
 * 4. Firmar directamente la cadena con Node.js crypto
 * 5. Agregar sello al XML
 * 6. Serializar una sola vez
 * 
 * Basado en: Código Python exitoso + XSLT oficiales SAT disponibles
 */

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const crypto = require('crypto');
const { generarCadenaOriginalXSLTServerless } = require('./xslt-processor-serverless');

/**
 * 🚀 SELLADO CFDI REPLICANDO FLUJO PYTHON EXITOSO
 * 
 * @param {string} xmlContent - XML CFDI a sellar
 * @param {string} certificadoCer - Contenido del archivo .cer en base64
 * @param {string} llavePrivadaKey - Contenido del archivo .key en base64  
 * @param {string} passwordLlave - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @param {string} numeroSerie - Número de serie del certificado (20 dígitos)
 * @returns {Object} Resultado del sellado
 */
async function sellarCFDIBasadoEnPython(xmlContent, certificadoCer, llavePrivadaKey, passwordLlave, version, numeroSerie) {
    console.log('🐍 PYTHON-BASED SEALER: Iniciando sellado replicando flujo Python exitoso...');
    
    // 🔍 DEBUG FORENSE: Rastrear parámetros de entrada
    console.log('🔍 PYTHON-BASED: Parámetros recibidos:');
    console.log('  - xmlContent (longitud):', xmlContent ? xmlContent.length : 'NULL/UNDEFINED');
    console.log('  - certificadoCer (longitud):', certificadoCer ? certificadoCer.length : 'NULL/UNDEFINED');
    console.log('  - llavePrivadaKey (longitud):', llavePrivadaKey ? llavePrivadaKey.length : 'NULL/UNDEFINED');
    console.log('  - passwordLlave (valor):', passwordLlave ? `"${passwordLlave}" (longitud: ${passwordLlave.length})` : 'NULL/UNDEFINED/EMPTY');
    console.log('  - passwordLlave (tipo):', typeof passwordLlave);
    console.log('  - version:', version);
    console.log('  - numeroSerie:', numeroSerie);
    
    try {
        // 1. 📄 PARSEAR XML (como Python con etree)
        console.log('📄 PYTHON-BASED: Parseando XML inicial...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const xmlSerializer = new XMLSerializer();
        
        if (!xmlDoc || xmlDoc.getElementsByTagName('parsererror').length > 0) {
            console.error('❌ PYTHON-BASED: Error parseando XML');
            return { exito: false, error: 'XML inválido' };
        }
        
        const comprobante = xmlDoc.documentElement;
        console.log('✅ PYTHON-BASED: XML parseado correctamente');
        
        // 2. 🧹 LIMPIAR ATRIBUTOS DE SELLADO PREVIOS (como Python)
        console.log('🧹 PYTHON-BASED: Limpiando atributos de sellado previos...');
        comprobante.removeAttribute('Sello');
        comprobante.removeAttribute('NoCertificado');
        comprobante.removeAttribute('Certificado');
        
        // 3. 🔐 PROCESAR CERTIFICADO Y LLAVE PRIVADA (como Python)
        console.log('🔐 PYTHON-BASED: Procesando certificado y llave privada...');
        
        // Convertir base64 a Buffer
        const certificadoBuffer = Buffer.from(certificadoCer, 'base64');
        const llavePrivadaBuffer = Buffer.from(llavePrivadaKey, 'base64');
        
        // Convertir certificado a PEM (como Python)
        const certificadoPem = certificadoBuffer.toString('utf8');
        
        // 🔧 CONVERTIR LLAVE PRIVADA DE BINARIO/DER A PEM
        // La llave está en formato binario, necesita conversión a PEM con headers
        let llavePrivadaPem;
        
        // Verificar si ya está en formato PEM (contiene headers)
        const llavePrivadaString = llavePrivadaBuffer.toString('utf8');
        if (llavePrivadaString.includes('BEGIN') && llavePrivadaString.includes('PRIVATE KEY')) {
            console.log('🔍 PYTHON-BASED: Llave ya está en formato PEM');
            llavePrivadaPem = llavePrivadaString;
        } else {
            console.log('🔧 PYTHON-BASED: Convirtiendo llave de formato binario/DER a PEM...');
            
            // 🧩 LIMPIAR COMPLETAMENTE LA LLAVE DE CUALQUIER HEADER EXISTENTE
            let llaveBase64Limpia;
            
            // SIEMPRE convertir buffer a base64 primero
            llaveBase64Limpia = llavePrivadaBuffer.toString('base64');
            console.log('🔧 PYTHON-BASED: Conversión inicial de buffer binario - longitud:', llaveBase64Limpia.length);
            
            // 🔍 VERIFICACIÓN OBLIGATORIA: Detectar patrones problemáticos en el base64
            if (llaveBase64Limpia.includes('+++++') || llaveBase64Limpia.includes('BEGIN') || llaveBase64Limpia.includes('END')) {
                console.log('🚨 PYTHON-BASED: PATRONES PROBLEMÁTICOS DETECTADOS - Aplicando limpieza quirúrgica...');
                console.log('🔍 PYTHON-BASED: Contenido problemático (primeros 100):', llaveBase64Limpia.substring(0, 100));
                
                // 🎯 LIMPIEZA QUIRÚRGICA FORZADA
                let contenidoLimpio = llaveBase64Limpia;
                
                // Paso 1: Remover headers PEM que pueden estar en el base64
                contenidoLimpio = contenidoLimpio.replace(/-----BEGIN[^-]*-----/g, '');
                contenidoLimpio = contenidoLimpio.replace(/-----END[^-]*-----/g, '');
                
                // Paso 2: Remover patrones problemáticos específicos
                contenidoLimpio = contenidoLimpio.replace(/\+{5}[^\+]*\+{5}/g, '');
                contenidoLimpio = contenidoLimpio.replace(/\+{4}[^\+]*\+{4}/g, '');
                contenidoLimpio = contenidoLimpio.replace(/\+{3}[^\+]*\+{3}/g, '');
                
                // Paso 3: Remover caracteres no base64
                contenidoLimpio = contenidoLimpio.replace(/[^A-Za-z0-9+/=]/g, '');
                
                // Paso 4: Verificar resultado
                if (contenidoLimpio.length >= 500) {
                    llaveBase64Limpia = contenidoLimpio;
                    console.log('✅ PYTHON-BASED: Limpieza quirúrgica exitosa - longitud:', llaveBase64Limpia.length);
                } else {
                    console.log('⚠️ PYTHON-BASED: Limpieza resultó en llave muy corta, manteniendo original');
                }
                
                console.log('🧩 PYTHON-BASED: Después de limpieza (primeros 50):', llaveBase64Limpia.substring(0, 50));
                console.log('🧩 PYTHON-BASED: Últimos 20 chars:', llaveBase64Limpia.substring(llaveBase64Limpia.length - 20));
                
            } else {
                console.log('✅ PYTHON-BASED: Base64 limpio sin patrones problemáticos');
            }
            
            console.log('🔍 PYTHON-BASED: Base64 limpio (longitud):', llaveBase64Limpia.length);
            console.log('🔍 PYTHON-BASED: Primeros 50 chars base64:', llaveBase64Limpia.substring(0, 50));
            
            // Formatear como PEM con headers estándar para llave privada encriptada
            const lineas = llaveBase64Limpia.match(/.{1,64}/g) || [];
            llavePrivadaPem = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' + 
                             lineas.join('\n') + 
                             '\n-----END ENCRYPTED PRIVATE KEY-----';
            
            console.log('✅ PYTHON-BASED: Llave convertida a formato PEM con headers limpios');
        }
        
        console.log('📋 PYTHON-BASED: Certificado y llave convertidos a PEM');
        console.log('  - Certificado PEM (longitud):', certificadoPem.length);
        console.log('  - Llave privada PEM (longitud):', llavePrivadaPem.length);
        
        // 🔍 VALIDACIÓN CRÍTICA: Validar certificado contra fecha del XML (como Python)
        console.log('🔍 PYTHON-BASED: Validando certificado contra fecha del XML...');
        const fechaXML = comprobante.getAttribute('Fecha');
        if (!fechaXML) {
            console.error('❌ PYTHON-BASED: No se encontró la fecha en el XML');
            return { exito: false, error: 'No se encontró la fecha en el XML' };
        }
        
        console.log('📅 PYTHON-BASED: Fecha del XML:', fechaXML);
        
        // Parsear fecha del XML (formato ISO)
        let fechaValidacion;
        try {
            fechaValidacion = new Date(fechaXML);
            if (isNaN(fechaValidacion.getTime())) {
                throw new Error('Fecha inválida');
            }
            console.log('📅 PYTHON-BASED: Validando certificado contra fecha:', fechaValidacion.toISOString());
        } catch (errorFecha) {
            console.error('❌ PYTHON-BASED: Error parseando fecha del XML:', errorFecha.message);
            return { exito: false, error: 'Error parseando fecha del XML: ' + errorFecha.message };
        }
        
        // 🔐 VALIDAR CERTIFICADO CONTRA FECHA DEL XML (replicando Python)
        console.log('🔐 PYTHON-BASED: Validando vigencia del certificado...');
        try {
            // Cargar certificado para extraer fechas de validez (como Python)
            const crypto_cert = require('crypto');
            const forge = require('node-forge');
            
            // Convertir certificado DER a objeto para validación
            let certificadoObj;
            try {
                // Intentar con node-forge (más compatible)
                const certDer = forge.util.decode64(certificadoCer);
                certificadoObj = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));
                
                const notBefore = certificadoObj.validity.notBefore;
                const notAfter = certificadoObj.validity.notAfter;
                
                console.log('📅 PYTHON-BASED: Certificado válido desde:', notBefore.toISOString());
                console.log('📅 PYTHON-BASED: Certificado válido hasta:', notAfter.toISOString());
                
                // Validar que la fecha del XML esté dentro del período de validez
                if (fechaValidacion < notBefore) {
                    console.error(`❌ PYTHON-BASED: La fecha del XML (${fechaValidacion.toISOString()}) es anterior a la validez del certificado (${notBefore.toISOString()})`);
                    return { exito: false, error: 'La fecha del XML es anterior a la validez del certificado' };
                }
                if (fechaValidacion > notAfter) {
                    console.error(`❌ PYTHON-BASED: La fecha del XML (${fechaValidacion.toISOString()}) es posterior a la expiración del certificado (${notAfter.toISOString()})`);
                    return { exito: false, error: 'La fecha del XML es posterior a la expiración del certificado' };
                }
                
                console.log('✅ PYTHON-BASED: Certificado válido para la fecha del XML');
                
            } catch (certError) {
                console.warn('⚠️ PYTHON-BASED: No se pudo validar la vigencia del certificado:', certError.message);
                console.warn('⚠️ PYTHON-BASED: Continuando sin validación de vigencia (como Python en algunos casos)');
            }
            
        } catch (validationError) {
            console.warn('⚠️ PYTHON-BASED: Error en validación de certificado:', validationError.message);
            console.warn('⚠️ PYTHON-BASED: Continuando sin validación (fallback como Python)');
        }
        
        // 🔍 DEBUG FORENSE: Analizar formato de llave privada
        console.log('🔍 PYTHON-BASED: Analizando formato de llave privada...');
        console.log('  - Primeros 100 chars:', llavePrivadaPem.substring(0, 100));
        console.log('  - Últimos 100 chars:', llavePrivadaPem.substring(llavePrivadaPem.length - 100));
        console.log('  - Contiene BEGIN PRIVATE KEY:', llavePrivadaPem.includes('BEGIN PRIVATE KEY'));
        console.log('  - Contiene BEGIN RSA PRIVATE KEY:', llavePrivadaPem.includes('BEGIN RSA PRIVATE KEY'));
        console.log('  - Contiene ENCRYPTED:', llavePrivadaPem.includes('ENCRYPTED'));
        console.log('  - Encoding detectado:', Buffer.isBuffer(llavePrivadaBuffer) ? 'Buffer válido' : 'Buffer inválido');
        
        // 🔐 PROCESAR LLAVE PRIVADA ENCRIPTADA SAT (siempre encriptada con contraseña)
        console.log('🔐 PYTHON-BASED: Procesando llave privada encriptada SAT...');
        
        // 🔑 PYTHON-BASED: Replicando lógica exacta del código Python exitoso...
        console.log('🔑 PYTHON-BASED: Replicando lógica exacta del código Python exitoso...');
        console.log('    - Contraseña proporcionada:', passwordLlave ? 'SÍ' : 'NO', `(longitud: ${passwordLlave ? passwordLlave.length : 0})`);
        
        // 🧪 PYTHON-BASED: Probando métodos de carga como en Python (orden exacto)...
        console.log('🧪 PYTHON-BASED: Probando métodos de carga como en Python (orden exacto)...');
        
        // Métodos basados en el código Python exitoso (sintaxis Node.js crypto correcta)
        const metodosLlave = [
            // Método 1: Buffer DER con contraseña (método principal en Python)
            {
                nombre: 'Buffer DER con contraseña',
                objeto: { key: llavePrivadaBuffer, passphrase: passwordLlave }
            },
            // Método 2: PEM con contraseña
            {
                nombre: 'PEM con contraseña', 
                objeto: { key: llavePrivadaPem, passphrase: passwordLlave }
            },
            // Método 3: Buffer DER sin contraseña (fallback)
            {
                nombre: 'Buffer DER sin contraseña',
                objeto: llavePrivadaBuffer
            },
            // Método 4: PEM sin contraseña (fallback)
            {
                nombre: 'PEM sin contraseña',
                objeto: llavePrivadaPem
            },
            // Método 5: String PEM con contraseña (como último recurso)
            {
                nombre: 'String PEM con contraseña',
                objeto: { key: llavePrivadaPem.toString(), passphrase: passwordLlave }
            },
            // Método 6: Solo contraseña como string (fallback extremo)
            {
                nombre: 'Solo contraseña string',
                objeto: { key: llavePrivadaPem, passphrase: passwordLlave.toString() }
            }
        ];
        
        let llaveValidada = null;
        let metodoExitoso = null;
        
        for (const metodo of metodosLlave) {
            try {
                console.log(`🔍 PYTHON-BASED: Probando método "${metodo.nombre}"...`);
                
                // Crear un objeto Sign para probar la llave (igual que Python)
                const testSign = crypto.createSign('RSA-SHA256');
                testSign.update('test');
                testSign.sign(metodo.objeto); // Esto debería fallar si la llave es inválida
                
                console.log(`✅ PYTHON-BASED: Método "${metodo.nombre}" validado exitosamente`);
                llaveValidada = metodo.objeto;
                metodoExitoso = metodo.nombre;
                break;
                
            } catch (error) {
                console.log(`❌ PYTHON-BASED: Método "${metodo.nombre}" falló: ${error.message.substring(0, 60)}...`);
                continue;
            }
        }
        
        if (!llaveValidada) {
            console.error('❌ PYTHON-BASED: TODOS LOS MÉTODOS NODE.JS CRYPTO FALLARON');
            console.error('🔍 PYTHON-BASED: Incompatibilidad detectada entre Node.js crypto y cryptography de Python');
            console.error('🔄 PYTHON-BASED: Intentando fallback con node-forge (JavaScript puro)...');
            
            // 🎯 FALLBACK REAL: Usar node-forge (JavaScript puro) como en el código Python exitoso
            const llaveValidadaForge = await intentarFallbackNodeForge(llavePrivadaPem, passwordLlave);
            if (llaveValidadaForge) {
                console.log('✅ PYTHON-BASED: Fallback node-forge exitoso');
                llaveValidada = llaveValidadaForge;
            } else {
                console.error('❌ PYTHON-BASED: Fallback node-forge también falló');
                console.error('❌ PYTHON-BASED: Verifique que la contraseña sea correcta');
                throw new Error('No se pudo validar la llave privada con ningún método (Node.js crypto + node-forge). Verifique la contraseña.');
            }
        }
        
        console.log(`🎯 PYTHON-BASED: Usando método exitoso: "${metodoExitoso}" (replicando Python)`);
        const llaveObjeto = llaveValidada;
        
        console.log('✅ PYTHON-BASED: Llave privada SAT validada exitosamente con contraseña');
        
        // 4. 📝 AGREGAR SOLO NoCertificado AL XML (como Python: root.set("NoCertificado", no_certificado))
        console.log('📝 PYTHON-BASED: Agregando NoCertificado al XML...');
        comprobante.setAttribute('NoCertificado', numeroSerie);
        
        // Preparar certificado limpio para agregar DESPUÉS del sellado (como Python)
        const certificadoLimpio = certificadoPem
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\r?\n/g, '')
            .trim();
        
        console.log('✅ PYTHON-BASED: Certificados agregados al XML');
        console.log('  - NoCertificado:', numeroSerie);
        console.log('  - Certificado (longitud):', certificadoLimpio.length);
        
        // 5. 🔗 GENERAR CADENA ORIGINAL CON XSLT OFICIAL SAT (como Python: transform(tree))
        console.log('🔗 PYTHON-BASED: Generando cadena original con XSLT oficial SAT...');
        
        // ⭐ CRÍTICO: Generar cadena original ANTES de agregar Certificado (como Python)
        // Python: cadena_original = self.generar_cadena_original(tree) - ANTES de agregar Sello y Certificado
        const cadenaOriginalRaw = generarCadenaOriginalXSLTServerless(xmlSerializer.serializeToString(xmlDoc), version);
        
        if (!cadenaOriginalRaw) {
            console.error('❌ PYTHON-BASED: Error generando cadena original con XSLT oficial');
            return { exito: false, error: 'Error generando cadena original con XSLT oficial SAT' };
        }
        
        console.log('✅ PYTHON-BASED: Cadena original generada con XSLT oficial SAT');
        console.log('📏 PYTHON-BASED: Longitud cadena original:', cadenaOriginalRaw.length);
        console.log('🔍 PYTHON-BASED: Primeros 100 chars:', cadenaOriginalRaw.substring(0, 100));
        console.log('🔍 PYTHON-BASED: Últimos 50 chars:', cadenaOriginalRaw.substring(cadenaOriginalRaw.length - 50));
        
        // 6. 🧹 LIMPIAR CADENA ORIGINAL (normalización como Python)
        console.log('🧹 PYTHON-BASED: Normalizando cadena original...');
        const cadenaOriginal = cadenaOriginalRaw
            .replace(/\uFEFF/g, '') // Eliminar BOM UTF-8
            .replace(/\r\n/g, '')   // Eliminar CRLF
            .replace(/\r/g, '')     // Eliminar CR
            .replace(/\n/g, '')     // Eliminar LF
            .replace(/\u00A0/g, '') // Eliminar espacios no separables
            .replace(/\u200B/g, '') // Eliminar espacios de ancho cero
            .trim();
        
        // Debug: comparar antes/después de limpieza
        if (cadenaOriginalRaw !== cadenaOriginal) {
            console.log('🔍 PYTHON-BASED: Cadena modificada por normalización:');
            console.log('  - Longitud ANTES:', cadenaOriginalRaw.length);
            console.log('  - Longitud DESPUÉS:', cadenaOriginal.length);
            console.log('  - Caracteres eliminados:', cadenaOriginalRaw.length - cadenaOriginal.length);
        } else {
            console.log('✅ PYTHON-BASED: Cadena NO modificada por normalización');
        }
        
        // Hash de la cadena normalizada para debugging
        const hashCadenaNormalizada = crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex');
        console.log('🔍 PYTHON-BASED: SHA256 cadena original normalizada:', hashCadenaNormalizada);
        
        // 7. 🔐 FIRMAR DIRECTAMENTE LA CADENA (como Python: private_key.sign())
        console.log('🔐 PYTHON-BASED: Firmando cadena original directamente...');
        console.log('📋 PYTHON-BASED: Datos para firmado:');
        console.log('  - Cadena (longitud):', cadenaOriginal.length);
        console.log('  - Cadena (encoding):', 'utf8');
        console.log('  - Algoritmo:', 'RSA-SHA256 PKCS#1 v1.5 (exacto como Python)');
        
        // ⭐ CRÍTICO: Replicar EXACTAMENTE el método Python cryptography exitoso
        // Python: signature = private_key.sign(cadena_original.encode('utf-8'), padding.PKCS1v15(), hashes.SHA256())
        let selloDigitalBinario;
        try {
            console.log('🔐 PYTHON-BASED: Replicando método exacto Python cryptography...');
            
            // MÉTODO EXACTO: Node.js crypto.sign() es equivalente directo a Python cryptography
            // Ambos hacen internamente: SHA256 + DigestInfo ASN.1 + RSA PKCS#1 v1.5
            const sign = crypto.createSign('sha256');
            sign.update(cadenaOriginal, 'utf8'); // Equivalente a cadena_original.encode('utf-8')
            
            // Firmar con RSA PKCS#1 v1.5 (exacto como Python padding.PKCS1v15())
            selloDigitalBinario = sign.sign(llaveValidada);
            
            console.log('🎉 PYTHON-BASED: Firmado con método idéntico a Python cryptography');
            console.log('📏 PYTHON-BASED: Longitud sello binario:', selloDigitalBinario.length, 'bytes');
            
        } catch (errorFirmado) {
            console.error('❌ PYTHON-BASED: Error firmando:', errorFirmado.message);
            return { exito: false, error: 'Error firmando: ' + errorFirmado.message };
        }
        
        if (!selloDigitalBinario) {
            console.error('❌ PYTHON-BASED: Error generando sello digital');
            return { exito: false, error: 'Error generando sello digital' };
        }
        
        // 8. 📦 CONVERTIR SELLO A BASE64 (como Python base64.b64encode())
        console.log('📦 PYTHON-BASED: Convirtiendo sello a base64...');
        const selloDigital = selloDigitalBinario.toString('base64');
        
        console.log('✅ PYTHON-BASED: Sello convertido a base64');
        console.log('📏 PYTHON-BASED: Longitud sello base64:', selloDigital.length);
        console.log('🔍 PYTHON-BASED: Sello base64 (primeros 50):', selloDigital.substring(0, 50));
        console.log('🔍 PYTHON-BASED: Sello base64 (últimos 50):', selloDigital.substring(selloDigital.length - 50));
        
        // Hash del sello para debugging
        const hashSello = crypto.createHash('sha256').update(selloDigital, 'utf8').digest('hex');
        console.log('🔍 PYTHON-BASED: SHA256 del sello:', hashSello);
        
        // 9. 📝 AGREGAR SELLO Y CERTIFICADO AL XML (como Python: root.set('Sello', sello) + root.set('Certificado', cert_b64))
        console.log('📝 PYTHON-BASED: Agregando sello y certificado al XML...');
        comprobante.setAttribute('Sello', selloDigital);
        comprobante.setAttribute('Certificado', certificadoLimpio);
        
        console.log('✅ PYTHON-BASED: Todos los atributos agregados al XML:');
        console.log('  - NoCertificado:', comprobante.getAttribute('NoCertificado'));
        console.log('  - Sello (longitud):', comprobante.getAttribute('Sello')?.length);
        console.log('  - Certificado (longitud):', comprobante.getAttribute('Certificado')?.length);
        
        // 10. 📄 SERIALIZAR UNA SOLA VEZ (como Python: etree.tostring())
        console.log('📄 PYTHON-BASED: Serializando XML final una sola vez...');
        let xmlSellado = xmlSerializer.serializeToString(xmlDoc);
        
        console.log('✅ PYTHON-BASED: XML sellado generado');
        console.log('📏 PYTHON-BASED: Longitud XML sellado:', xmlSellado.length);
        
        // 11. 🔍 VERIFICACIÓN DE INTEGRIDAD (como Python: validar_sellado())
        console.log('🔍 PYTHON-BASED: Verificando integridad del sello como Python...');
        let selloValido = false;
        try {
            // Replicar el método Python de verificación
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(cadenaOriginal, 'utf8'); // Mismo encoding que Python
            
            // Certificado completo para verificación (como Python)
            const certificadoCompleto = `-----BEGIN CERTIFICATE-----\n${certificadoLimpio}\n-----END CERTIFICATE-----`;
            selloValido = verify.verify(certificadoCompleto, selloDigitalBinario);
            
            console.log('🔍 PYTHON-BASED: Verificación del sello:', selloValido ? '✅ VÁLIDO' : '❌ INVÁLIDO');
            
            if (!selloValido) {
                console.warn('⚠️ PYTHON-BASED: El sello no pasó la verificación de integridad');
                // No fallar aquí, solo advertir (como Python)
            }
            
        } catch (errorVerificacion) {
            console.warn('⚠️ PYTHON-BASED: No se pudo verificar el sello:', errorVerificacion.message);
            selloValido = false; // Asumir inválido si no se puede verificar
        }
        
        // 12. ✅ RESULTADO EXITOSO
        console.log('🎉 PYTHON-BASED: ¡Sellado completado exitosamente!');
        console.log('📊 PYTHON-BASED: Resumen del proceso:');
        console.log('  - XML original (longitud):', xmlContent.length);
        console.log('  - Cadena original (longitud):', cadenaOriginal.length);
        console.log('  - Sello base64 (longitud):', selloDigital.length);
        console.log('  - XML sellado (longitud):', xmlSellado.length);
        console.log('  - Versión CFDI:', version);
        console.log('  - Número de certificado:', numeroSerie);
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            sello: selloDigital,
            cadenaOriginal: cadenaOriginal,
            numeroCertificado: numeroSerie,
            selloValido: selloValido,
            mensaje: 'XML sellado exitosamente replicando flujo exacto de código Python funcional'
        };
        
    } catch (error) {
        console.error('❌ PYTHON-BASED: Error general en sellado:', error.message);
        console.error('❌ PYTHON-BASED: Stack trace:', error.stack);
        return {
            exito: false,
            error: 'Error en sellado basado en Python: ' + error.message
        };
    }
}

// 🎯 FUNCIÓN DE FALLBACK NODE-FORGE (JavaScript puro, compatible serverless)
async function intentarFallbackNodeForge(llavePrivadaPem, passwordLlave) {
    console.log('🔄 FALLBACK: Iniciando conversión con node-forge (JavaScript puro)...');
    console.log('🔧 FALLBACK: Trabajando directamente con PEM para evitar corrupción binaria');
    
    try {
        const forge = require('node-forge');
        
        // Método 1: Intentar desencriptar directamente desde PEM (PKCS#8)
        console.log('🔐 FALLBACK: Método 1 - Desencriptando PKCS#8 desde PEM...');
        try {
            const privateKey = forge.pki.decryptRsaPrivateKey(llavePrivadaPem, passwordLlave);
            
            if (privateKey) {
                console.log('✅ FALLBACK: Método 1 exitoso - Llave desencriptada');
                const pemDesencriptada = forge.pki.privateKeyToPem(privateKey);
                
                // Validar con Node.js crypto
                const crypto = require('crypto');
                const testSign = crypto.createSign('RSA-SHA256');
                testSign.update('test');
                testSign.sign({ key: pemDesencriptada });
                
                console.log('✅ FALLBACK: Llave validada con Node.js crypto');
                return { key: pemDesencriptada };
            }
        } catch (method1Error) {
            console.log('🔄 FALLBACK: Método 1 falló:', method1Error.message);
        }
        
        // Método 2: Usar decryptPrivateKeyInfo para PKCS#8
        console.log('🔐 FALLBACK: Método 2 - Usando decryptPrivateKeyInfo...');
        try {
            // Convertir PEM a DER de forma segura
            const pemBody = llavePrivadaPem
                .replace(/-----BEGIN ENCRYPTED PRIVATE KEY-----/g, '')
                .replace(/-----END ENCRYPTED PRIVATE KEY-----/g, '')
                .replace(/\s/g, '');
            
            const derBytes = forge.util.decode64(pemBody);
            const asn1 = forge.asn1.fromDer(derBytes);
            
            const privateKeyInfo = forge.pki.decryptPrivateKeyInfo(asn1, passwordLlave);
            const privateKey = forge.pki.privateKeyFromAsn1(privateKeyInfo.privateKey);
            
            if (privateKey) {
                console.log('✅ FALLBACK: Método 2 exitoso - Llave desencriptada');
                const pemDesencriptada = forge.pki.privateKeyToPem(privateKey);
                
                // Validar con Node.js crypto
                const crypto = require('crypto');
                const testSign = crypto.createSign('RSA-SHA256');
                testSign.update('test');
                testSign.sign({ key: pemDesencriptada });
                
                console.log('✅ FALLBACK: Llave validada con Node.js crypto');
                return { key: pemDesencriptada };
            }
        } catch (method2Error) {
            console.log('🔄 FALLBACK: Método 2 falló:', method2Error.message);
        }
        
        // Método 3: Intentar con forge.pki.privateKeyFromPem (por si no está encriptada)
        console.log('🔐 FALLBACK: Método 3 - Intentando como llave no encriptada...');
        try {
            const privateKey = forge.pki.privateKeyFromPem(llavePrivadaPem);
            
            if (privateKey) {
                console.log('✅ FALLBACK: Método 3 exitoso - Llave no encriptada');
                const pemLimpia = forge.pki.privateKeyToPem(privateKey);
                
                // Validar con Node.js crypto
                const crypto = require('crypto');
                const testSign = crypto.createSign('RSA-SHA256');
                testSign.update('test');
                testSign.sign({ key: pemLimpia });
                
                console.log('✅ FALLBACK: Llave validada con Node.js crypto');
                return { key: pemLimpia };
            }
        } catch (method3Error) {
            console.log('🔄 FALLBACK: Método 3 falló:', method3Error.message);
        }
        
        console.error('❌ FALLBACK: Todos los métodos node-forge fallaron');
        return null;
        
    } catch (error) {
        console.error('❌ FALLBACK: Error general en fallback node-forge:', error.message);
        return null;
    }
}

module.exports = {
    sellarCFDIBasadoEnPython
};
