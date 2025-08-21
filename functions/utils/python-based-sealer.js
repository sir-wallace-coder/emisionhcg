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
        
        // Convertir a PEM (como Python)
        const certificadoPem = certificadoBuffer.toString('utf8');
        let llavePrivadaPem = llavePrivadaBuffer.toString('utf8');
        
        console.log('📋 PYTHON-BASED: Certificado y llave convertidos a PEM');
        console.log('  - Certificado PEM (longitud):', certificadoPem.length);
        console.log('  - Llave privada PEM (longitud):', llavePrivadaPem.length);
        
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
        
        // Las llaves SAT siempre están encriptadas, usar objeto con key y passphrase
        console.log('🔑 PYTHON-BASED: Preparando objeto de llave con contraseña...');
        console.log('  - Contraseña proporcionada:', passwordLlave ? 'SÍ (longitud: ' + passwordLlave.length + ')' : 'NO');
        
        const llavePrivadaParaFirmar = {
            key: llavePrivadaPem,
            passphrase: passwordLlave || ''
        };
        
        // Validar que la llave es válida con la contraseña
        try {
            console.log('🧪 PYTHON-BASED: Probando validación de llave privada...');
            const testSign = crypto.createSign('RSA-SHA256');
            testSign.update('test', 'utf8');
            testSign.sign(llavePrivadaParaFirmar); // Esto lanzará error si la llave/contraseña es inválida
            
            console.log('✅ PYTHON-BASED: Llave privada SAT validada exitosamente con contraseña');
            
        } catch (errorLlave) {
            console.error('❌ PYTHON-BASED: Error validando llave privada SAT:', errorLlave.message);
            console.error('❌ PYTHON-BASED: Código de error:', errorLlave.code);
            console.error('❌ PYTHON-BASED: Stack trace:', errorLlave.stack);
            console.error('❌ PYTHON-BASED: Verifique que la contraseña sea correcta');
            
            // Intentar diagnóstico adicional
            if (errorLlave.message.includes('unsupported')) {
                console.error('🔍 PYTHON-BASED: Error de formato no soportado - posible problema con encoding o formato de llave');
            }
            if (errorLlave.message.includes('bad decrypt')) {
                console.error('🔍 PYTHON-BASED: Error de desencriptación - contraseña incorrecta');
            }
            
            return { exito: false, error: 'Error validando llave privada SAT (verifique contraseña): ' + errorLlave.message };
        }
        
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
        
        // ⭐ CRÍTICO: Replicar exactamente el método Python cryptography
        // Python: signature = private_key.sign(cadena_original.encode('utf-8'), padding.PKCS1v15(), hashes.SHA256())
        let selloDigitalBinario;
        try {
            // Método exacto como Python cryptography
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(cadenaOriginal, 'utf8'); // Equivalente a cadena_original.encode('utf-8')
            
            // Firmar con PKCS1v15 (exacto como Python)
            selloDigitalBinario = sign.sign({
                key: llavePrivadaParaFirmar,
                padding: crypto.constants.RSA_PKCS1_PADDING // Equivalente a padding.PKCS1v15()
            });
            
            console.log('🎉 PYTHON-BASED: Cadena firmada con método idéntico a Python cryptography');
            console.log('📏 PYTHON-BASED: Longitud sello binario:', selloDigitalBinario.length);
            
        } catch (errorFirmado) {
            console.error('❌ PYTHON-BASED: Error firmando cadena original:', errorFirmado.message);
            return { exito: false, error: 'Error firmando cadena original: ' + errorFirmado.message };
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

module.exports = {
    sellarCFDIBasadoEnPython
};
