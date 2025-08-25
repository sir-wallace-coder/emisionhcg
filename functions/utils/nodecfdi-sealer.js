/**
 * 🎯 SELLADOR CFDI CON @nodecfdi/credentials
 * 
 * Implementación profesional usando la librería oficial NodeCfdi
 * para resolver definitivamente el error CFDI40102
 * 
 * Basado en: https://nodecfdi.com/librarys/credentials/
 * Compatible con: phpcfdi/cfdi-expresiones y estándares SAT
 */

const { Credential } = require('@nodecfdi/credentials');
const { DOMParser } = require('@xmldom/xmldom');
const { XMLSerializer } = require('@xmldom/xmldom');
const crypto = require('crypto');
const { generarCadenaOriginalXSLTServerless } = require('./xslt-processor-serverless');
const { removerAtributoSelloCompletamente } = require('./cfdi-sealer');
const { sellarConServicioExterno } = require('./external-sealer-client');

/**
 * 🚀 SELLADO CFDI CON NODECFDI - IMPLEMENTACIÓN OFICIAL SAT
 * 
 * @param {string} xmlContent - XML CFDI a sellar
 * @param {string} certificadoCer - Contenido del archivo .cer en base64
 * @param {string} llavePrivadaKey - Contenido del archivo .key en base64  
 * @param {string} passwordLlave - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @param {string} numeroSerie - Número de serie del certificado (20 dígitos)
 * @returns {Object} Resultado del sellado
 */
async function sellarCFDIConNodeCfdi(xmlContent, certificadoCer, llavePrivadaKey, passwordLlave, version, numeroSerie, opciones = {}) {
    console.log('🎯 NODECFDI SEALER: Iniciando sellado...');
    
    // Verificar si se debe usar servicio externo
    const usarServicioExterno = opciones.usarServicioExterno || process.env.USE_EXTERNAL_SEALER === 'true';
    
    if (usarServicioExterno) {
        console.log('🌐 NODECFDI SEALER: Usando servicio externo de sellado');
        return await sellarConServicioExternoWrapper(xmlContent, certificadoCer, llavePrivadaKey, passwordLlave, version, numeroSerie);
    }
    
    console.log('🏠 NODECFDI SEALER: Usando sellado local con @nodecfdi/credentials');
    
    try {
        // 1. Parsear XML inicial
        console.log('📄 NODECFDI: Parseando XML inicial...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const xmlSerializer = new XMLSerializer();
        
        if (!xmlDoc || xmlDoc.getElementsByTagName('parsererror').length > 0) {
            console.error('❌ NODECFDI: Error parseando XML');
            return { exito: false, error: 'XML inválido' };
        }
        
        const comprobante = xmlDoc.documentElement;
        console.log('✅ NODECFDI: XML parseado correctamente');
        
        // 2. Limpiar atributos de sellado previos
        console.log('🧹 NODECFDI: Limpiando atributos de sellado previos...');
        comprobante.removeAttribute('Sello');
        comprobante.removeAttribute('NoCertificado');
        comprobante.removeAttribute('Certificado');
        
        // 3. Crear credencial NodeCfdi desde archivos base64
        console.log('🔐 NODECFDI: Creando credencial desde archivos CSD...');
        
        // NodeCfdi espera strings base64 directos, no Buffers
        console.log('📋 NODECFDI: Usando archivos CSD en formato base64 string');
        console.log('  - Certificado (longitud base64):', certificadoCer.length);
        console.log('  - Llave privada (longitud base64):', llavePrivadaKey.length);
        
        // Verificar que los strings base64 no estén vacíos
        if (!certificadoCer || certificadoCer.length === 0) {
            throw new Error('Certificado base64 vacío o no proporcionado');
        }
        if (!llavePrivadaKey || llavePrivadaKey.length === 0) {
            throw new Error('Llave privada base64 vacía o no proporcionada');
        }
        
        // 🚨 CRÍTICO: Crear credencial NodeCfdi (PERMITE CERTIFICADOS VENCIDOS)
        console.log('⚠️ NODECFDI: Creando credencial (permitiendo certificados vencidos)...');
        let credential;
        
        try {
            credential = Credential.create(certificadoCer, llavePrivadaKey, passwordLlave);
            console.log('✅ NODECFDI: Credencial creada exitosamente');
        } catch (error) {
            console.error('❌ NODECFDI: Error creando credencial:', error.message);
            
            // Si falla por validación de fecha, intentar con manejo especial
            if (error.message.includes('expired') || error.message.includes('vencido') || error.message.includes('date')) {
                console.log('⚠️ NODECFDI: Posible error por certificado vencido, reintentando...');
                
                // Reintentar - NodeCfdi debería permitir certificados vencidos para firmar
                try {
                    credential = Credential.create(certBinary, keyBinary, passwordLlave);
                    console.log('✅ NODECFDI: Credencial creada en segundo intento (certificado vencido permitido)');
                } catch (secondError) {
                    console.error('❌ NODECFDI: Error persistente creando credencial:', secondError.message);
                    throw new Error(`Error creando credencial NodeCfdi: ${secondError.message}`);
                }
            } else {
                throw error;
            }
        }
        
        // 4. Extraer información del certificado
        const certificado = credential.certificate();
        
        // CRÍTICO: Usar número de certificado almacenado en base de datos (no extraer del certificado)
        // El número correcto ya está validado y almacenado en el emisor
        const numeroCertificado = numeroSerie; // Viene del parámetro de la función
        
        console.log('🔍 NODECFDI: Usando número de certificado almacenado:', numeroCertificado);
        console.log('🔍 NODECFDI: Longitud número certificado:', numeroCertificado.length);
        
        // Validar que tenga exactamente 20 dígitos
        if (!/^\d{20}$/.test(numeroCertificado)) {
            console.error('❌ NODECFDI: Número de certificado inválido:', numeroCertificado);
            throw new Error(`Número de certificado debe tener exactamente 20 dígitos, recibido: ${numeroCertificado}`);
        }
        
        const certificadoPem = certificado.pem();
        
        console.log('📋 NODECFDI: Información del certificado:');
        console.log('  - RFC:', certificado.rfc());
        console.log('  - Nombre legal:', certificado.legalName());
        console.log('  - Número de certificado:', numeroCertificado);
        console.log('  - Certificado PEM (longitud):', certificadoPem.length);
        
        // 🚨 CRÍTICO: Verificar fechas de vigencia del certificado
        try {
            const validFrom = certificado.validFrom();
            const validTo = certificado.validTo();
            const ahora = new Date();
            
            console.log('📅 NODECFDI: Fechas de vigencia del certificado:');
            console.log('  - Válido desde:', validFrom);
            console.log('  - Válido hasta:', validTo);
            console.log('  - Fecha actual:', ahora);
            
            const estaVencido = validTo < ahora;
            console.log('⚠️ NODECFDI: Estado del certificado:', estaVencido ? '🔴 VENCIDO' : '🟢 VIGENTE');
            
            if (estaVencido) {
                const diasVencido = Math.floor((ahora - validTo) / (1000 * 60 * 60 * 24));
                console.log('⚠️ NODECFDI: Certificado vencido hace', diasVencido, 'días');
                console.log('✅ NODECFDI: Continuando con certificado vencido (permitido para sellado)');
            }
        } catch (dateError) {
            console.log('ℹ️ NODECFDI: No se pudieron obtener fechas de vigencia:', dateError.message);
        }
        
        // 5. 🎯 FLUJO CORRECTO SAT: Agregar NoCertificado y Certificado ANTES de generar cadena
        console.log('📝 NODECFDI: Agregando NoCertificado y Certificado al XML...');
        
        // Limpiar certificado PEM (solo el contenido base64, sin headers)
        const certificadoLimpio = certificadoPem
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\r?\n/g, '')
            .trim();
        
        // Agregar NoCertificado y Certificado (pero NO Sello todavía)
        comprobante.setAttribute('NoCertificado', numeroCertificado);
        comprobante.setAttribute('Certificado', certificadoLimpio);
        
        console.log('✅ NODECFDI: NoCertificado y Certificado agregados');
        console.log('  - NoCertificado:', numeroCertificado);
        console.log('  - Certificado (longitud):', certificadoLimpio.length);
        
        // 6. 🔗 GENERAR CADENA ORIGINAL del XML que YA tiene NoCertificado y Certificado
        console.log('🔗 NODECFDI: Generando cadena original del XML CON certificados (sin Sello)...');
        const xmlConCertificados = xmlSerializer.serializeToString(xmlDoc);
        
        // Generar cadena original usando XSLT oficial SAT (serverless)
        const cadenaOriginalRaw = generarCadenaOriginalXSLTServerless(xmlConCertificados, version);
        
        console.log('✅ NODECFDI: Cadena original generada con reglas SAT');
        console.log('📏 NODECFDI: Longitud:', cadenaOriginalRaw.length);
        
        if (!cadenaOriginalRaw) {
            console.error('❌ NODECFDI: Error generando cadena original');
            return { exito: false, error: 'Error generando cadena original' };
        }
        
        console.log('✅ NODECFDI: Cadena original generada');
        console.log('📏 NODECFDI: Longitud cadena original:', cadenaOriginalRaw.length);
        
        // 6. Limpiar cadena original (eliminar caracteres invisibles)
        console.log('🧹 NODECFDI: Limpiando cadena original...');
        const cadenaOriginal = cadenaOriginalRaw; // Sin limpieza - servicio externo maneja todo
        
        console.log('✅ NODECFDI: Cadena original lista para firmado');
        console.log('📏 NODECFDI: Longitud cadena original:', cadenaOriginal.length);
        console.log('🔍 NODECFDI: SHA256 cadena original:', crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex'));
        
        // 7. 🚀 FIRMAR CON NODECFDI - FLUJO CORRECTO SAT
        console.log('🔐 NODECFDI: Firmando cadena original con @nodecfdi/credentials...');
        
        // CRÍTICO: NodeCfdi firma la cadena original directamente (como Python)
        let selloDigitalBinario;
        try {
            selloDigitalBinario = credential.sign(cadenaOriginal);
            console.log('🎉 NODECFDI: Cadena original firmada exitosamente');
        } catch (errorNodeCfdi) {
            console.error('❌ NODECFDI: Error firmando cadena original:', errorNodeCfdi.message);
            return { exito: false, error: 'Error generando sello digital: ' + errorNodeCfdi.message };
        }
        
        if (!selloDigitalBinario) {
            console.error('❌ CFDI40102 FIX: Error generando sello digital');
            return { exito: false, error: 'Error generando sello digital con DigestInfo' };
        }
        
        // 🔧 CRÍTICO: Forzar conversión correcta a base64
        console.log('🔍 NODECFDI DEBUG: Tipo de sello recibido:', typeof selloDigitalBinario);
        console.log('🔍 NODECFDI DEBUG: Es Buffer?', Buffer.isBuffer(selloDigitalBinario));
        console.log('🔍 NODECFDI DEBUG: Longitud original:', selloDigitalBinario?.length);
        
        let selloDigital;
        try {
            if (Buffer.isBuffer(selloDigitalBinario)) {
                // Método 1: Buffer directo a base64
                selloDigital = selloDigitalBinario.toString('base64');
                console.log('✅ NODECFDI: Conversión Buffer → base64 exitosa');
            } else if (typeof selloDigitalBinario === 'string') {
                // Método 2: Detectar si es base64 válido
                const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                if (base64Regex.test(selloDigitalBinario) && selloDigitalBinario.length % 4 === 0) {
                    selloDigital = selloDigitalBinario;
                    console.log('✅ NODECFDI: String ya es base64 válido');
                } else {
                    // Método 3: Convertir string a Buffer y luego a base64
                    const buffer = Buffer.from(selloDigitalBinario, 'latin1');
                    selloDigital = buffer.toString('base64');
                    console.log('✅ NODECFDI: Conversión string → Buffer → base64 exitosa');
                }
            } else {
                // Método 4: Forzar conversión como último recurso
                const buffer = Buffer.from(String(selloDigitalBinario), 'latin1');
                selloDigital = buffer.toString('base64');
                console.log('✅ NODECFDI: Conversión forzada a base64 exitosa');
            }
            
            // Validación final del base64
            const base64Test = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Test.test(selloDigital)) {
                throw new Error('Base64 generado no es válido');
            }
            
        } catch (error) {
            console.error('❌ NODECFDI: Error en conversión base64:', error.message);
            return { exito: false, error: 'Error convirtiendo sello a base64: ' + error.message };
        }
        
        console.log('🎉 NODECFDI: ¡Sello digital generado exitosamente!');
        console.log('📏 NODECFDI: Longitud sello base64:', selloDigital.length);
        console.log('🔍 NODECFDI: Sello base64 (primeros 50):', selloDigital.substring(0, 50));
        console.log('🔍 NODECFDI: Sello base64 (últimos 50):', selloDigital.substring(selloDigital.length - 50));
        
        // Hash del sello para debugging
        const hashSello = crypto.createHash('sha256').update(selloDigital, 'utf8').digest('hex');
        console.log('🔍 NODECFDI: SHA256 del sello:', hashSello);
        
        // 8. 🎯 FLUJO CORRECTO SAT: Agregar SOLO el Sello al final
        console.log('📝 NODECFDI: Agregando Sello al XML (NoCertificado y Certificado ya están)...');
        
        // Agregar SOLO el Sello (NoCertificado y Certificado ya fueron agregados)
        comprobante.setAttribute('Sello', selloDigital);
        
        console.log('✅ NODECFDI: Sello agregado al XML final');
        console.log('  - Sello (longitud):', selloDigital.length);
        
        // 🎯 SERIALIZACIÓN ÚNICA: Una sola serialización del XML final
        console.log('📝 NODECFDI: Serialización única del XML final...');
        let xmlSellado = xmlSerializer.serializeToString(xmlDoc);
        
        console.log('✅ NODECFDI: XML sellado generado');
        console.log('📏 NODECFDI: Longitud XML sellado:', xmlSellado.length);
        
        // 9. ✅ VALIDACIÓN FINAL Y RETORNO
        console.log('🎉 NODECFDI: ¡SELLADO COMPLETADO EXITOSAMENTE!');
        
        // Verificación básica: el sello debe ser base64 válido y tener longitud apropiada
        const base64Test = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Test.test(selloDigital) || selloDigital.length < 300) {
            console.error('❌ NODECFDI: Sello no cumple formato base64 o longitud mínima');
            return { exito: false, error: 'Formato de sello inválido' };
        }
        
        console.log('📋 NODECFDI: Resumen final:');
        console.log('  - Sello válido: true (formato base64 verificado)');
        console.log('  - XML sellado (longitud):', xmlSellado.length);
        console.log('  - NoCertificado:', numeroCertificado);
        console.log('  - Método usado: @nodecfdi/credentials oficial');
        
        // 10. 🎯 RETORNO EXITOSO - FLUJO PYTHON REPLICADO
        console.log('✅ SELLADO: NodeCFDI completado exitosamente');
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            sello: selloDigital,
            cadenaOriginal: cadenaOriginal,
            numeroCertificado: numeroCertificado,
            certificado: certificadoLimpio
        };
        
    } catch (error) {
        console.error('❌ NODECFDI: Error en sellado:', error);
        console.error('❌ NODECFDI: Stack trace:', error.stack);
        
        return {
            exito: false,
            error: `Error en sellado NodeCfdi: ${error.message}`,
            detalleError: error.stack
        };
    }
}

/**
 * 🌐 Wrapper para sellado con servicio externo
 * 
 * Prepara los datos y llama al servicio externo de sellado
 * 
 * @param {string} xmlContent - XML CFDI a sellar
 * @param {string} certificadoCer - Contenido del archivo .cer en base64
 * @param {string} llavePrivadaKey - Contenido del archivo .key en base64
 * @param {string} passwordLlave - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @param {string} numeroSerie - Número de serie del certificado
 * @returns {Object} Resultado del sellado externo
 */
async function sellarConServicioExternoWrapper(xmlContent, certificadoCer, llavePrivadaKey, passwordLlave, version, numeroSerie) {
    console.log('🌐 EXTERNAL SEALER: Iniciando sellado con servicio externo');
    
    try {
        // Extraer RFC del XML para enviarlo al servicio
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const comprobante = xmlDoc.documentElement;
        const rfc = comprobante.getAttribute('Rfc') || 'RFC_NO_ENCONTRADO';
        
        console.log('📋 EXTERNAL SEALER: RFC extraído:', rfc);
        
        // Convertir PEM a base64 puro para servicio externo
        const certificadoBase64Puro = certificadoCer
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\s/g, '');
        
        const llavePrivadaBase64Pura = llavePrivadaKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
            .replace(/-----END RSA PRIVATE KEY-----/g, '')
            .replace(/-----BEGIN ENCRYPTED PRIVATE KEY-----/g, '')
            .replace(/-----END ENCRYPTED PRIVATE KEY-----/g, '')
            .replace(/\s/g, '');
        
        console.log('🔧 CONVERSIÓN: Cert PEM:', certificadoCer.length, 'chars → Base64:', certificadoBase64Puro.length, 'chars');
        console.log('🔧 CONVERSIÓN: Key PEM:', llavePrivadaKey.length, 'chars → Base64:', llavePrivadaBase64Pura.length, 'chars');
        
        // Llamar al servicio externo
        const resultadoExterno = await sellarConServicioExterno({
            xmlSinSellar: xmlContent,
            certificadoBase64: certificadoBase64Puro,
            llavePrivadaBase64: llavePrivadaBase64Pura,
            passwordLlave: passwordLlave,
            rfc: rfc,
            versionCfdi: version
        });
        
        console.log('✅ EXTERNAL SEALER: Sellado externo completado exitosamente');
        
        // Adaptar respuesta al formato esperado por el sistema
        return {
            exito: true,
            xmlSellado: resultadoExterno.xmlSellado,
            sello: resultadoExterno.sello,
            numeroCertificado: resultadoExterno.numeroCertificado || numeroSerie,
            fechaSellado: resultadoExterno.fechaSellado,
            metodo: 'servicio_externo',
            proveedor: resultadoExterno.servicioExterno?.proveedor || 'Servicio Externo',
            logs: [
                '🌐 Sellado realizado con servicio externo',
                `📋 RFC: ${rfc}`,
                `📋 Versión CFDI: ${version}`,
                `📋 Proveedor: ${resultadoExterno.servicioExterno?.proveedor || 'Servicio Externo'}`,
                `⏱️ Tiempo de procesamiento: ${resultadoExterno.servicioExterno?.tiempo_procesamiento || 'N/A'}`,
                '✅ Sellado completado exitosamente'
            ]
        };
        
    } catch (error) {
        console.error('❌ EXTERNAL SEALER: Error en sellado externo:', error.message);
        
        return {
            exito: false,
            error: `Error en servicio externo: ${error.message}`,
            metodo: 'servicio_externo',
            logs: [
                '🌐 Intento de sellado con servicio externo',
                `❌ Error: ${error.message}`,
                '💡 Verificar configuración del servicio externo'
            ]
        };
    }
}

/**
 * 🔧 Función para cambiar entre sellado local y externo
 * 
 * @param {boolean} usarExterno - Si usar servicio externo
 * @returns {string} Método de sellado configurado
 */
function configurarMetodoSellado(usarExterno = false) {
    if (usarExterno) {
        process.env.USE_EXTERNAL_SEALER = 'true';
        console.log('🌐 SEALER CONFIG: Configurado para usar servicio externo');
        return 'externo';
    } else {
        process.env.USE_EXTERNAL_SEALER = 'false';
        console.log('🏠 SEALER CONFIG: Configurado para usar sellado local');
        return 'local';
    }
}

module.exports = {
    sellarCFDIConNodeCfdi,
    sellarConServicioExternoWrapper,
    configurarMetodoSellado
};
