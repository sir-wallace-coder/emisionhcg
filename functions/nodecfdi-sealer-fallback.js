/**
 * Sellado CFDI usando @nodecfdi/credentials + nuestro procesador XSLT
 * Versión fallback sin dependencia de Saxon-B para serverless
 */

const { Credential } = require('@nodecfdi/credentials/node');
const { generarCadenaOriginal } = require('./xslt-processor');

/**
 * Genera la cadena original usando nuestro procesador XSLT existente
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<string>} - Cadena original generada
 */
async function generarCadenaOriginalFallback(xmlContent, version = '4.0') {
    console.log('🔍 Generando cadena original con procesador XSLT fallback...');
    console.log('📋 Versión CFDI:', version);
    
    try {
        // Usar nuestro procesador XSLT existente
        const cadenaOriginal = generarCadenaOriginal(xmlContent, version);
        
        console.log('✅ Cadena original generada exitosamente (fallback)');
        console.log('📏 Longitud cadena original:', cadenaOriginal.length);
        console.log('🔍 Preview cadena original:', cadenaOriginal.substring(0, 100) + '...');
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('❌ Error generando cadena original (fallback):', error);
        throw new Error(`Error generando cadena original: ${error.message}`);
    }
}

/**
 * Firma una cadena de texto usando certificados CSD con NodeCfdi
 * @param {string} cadenaOriginal - Cadena original a firmar
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @returns {Promise<Object>} - Resultado del firmado
 */
async function firmarCadenaNodeCfdiFallback(cadenaOriginal, certificadoBase64, llavePrivadaBase64, password) {
    console.log('🔐 Firmando cadena original con NodeCfdi (fallback)...');
    console.log('📏 Longitud cadena a firmar:', cadenaOriginal.length);
    
    try {
        // Convertir de base64 a contenido binario
        const certificadoContent = Buffer.from(certificadoBase64, 'base64').toString('binary');
        const llavePrivadaContent = Buffer.from(llavePrivadaBase64, 'base64').toString('binary');
        
        console.log('📋 Creando credencial con certificados...');
        
        // Crear credencial con certificados
        const credential = Credential.create(certificadoContent, llavePrivadaContent, password);
        
        // Obtener información del certificado
        const certificado = credential.certificate();
        console.log('📋 RFC del certificado:', certificado.rfc());
        console.log('📋 Nombre legal:', certificado.legalName());
        console.log('📋 Número de serie:', certificado.serialNumber().bytes());
        
        // Firmar la cadena original
        console.log('✍️ Firmando cadena original...');
        const sello = credential.sign(cadenaOriginal);
        
        console.log('✅ Sello digital generado exitosamente (fallback)');
        console.log('📏 Longitud sello:', sello.length);
        console.log('🔍 Preview sello:', sello.substring(0, 100) + '...');
        
        // Verificar la firma
        console.log('🔍 Verificando firma...');
        const verificacion = credential.verify(cadenaOriginal, sello);
        console.log('✅ Verificación de firma:', verificacion ? 'VÁLIDA' : 'INVÁLIDA');
        
        if (!verificacion) {
            throw new Error('La verificación de la firma falló');
        }
        
        return {
            sello,
            numeroCertificado: certificado.serialNumber().bytes(),
            certificadoBase64: certificadoBase64,
            rfcCertificado: certificado.rfc(),
            nombreLegal: certificado.legalName()
        };
        
    } catch (error) {
        console.error('❌ Error firmando cadena con NodeCfdi (fallback):', error);
        throw new Error(`Error firmando cadena: ${error.message}`);
    }
}

/**
 * Agrega el sello digital al XML CFDI usando manipulación de string
 * @param {string} xmlContent - Contenido XML original
 * @param {string} sello - Sello digital generado
 * @param {string} numeroCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} - XML con sello agregado
 */
function agregarSelloAlXMLFallback(xmlContent, sello, numeroCertificado, certificadoBase64) {
    console.log('📝 Agregando sello al XML (fallback)...');
    
    try {
        // Buscar el tag de apertura del Comprobante
        const comprobanteMatch = xmlContent.match(/<cfdi:Comprobante[^>]*>/);
        
        if (!comprobanteMatch) {
            throw new Error('No se encontró el elemento cfdi:Comprobante en el XML');
        }
        
        let comprobanteTag = comprobanteMatch[0];
        
        // Remover atributos de sellado existentes si los hay
        comprobanteTag = comprobanteTag.replace(/\s+Sello="[^"]*"/g, '');
        comprobanteTag = comprobanteTag.replace(/\s+NoCertificado="[^"]*"/g, '');
        comprobanteTag = comprobanteTag.replace(/\s+Certificado="[^"]*"/g, '');
        
        // Agregar los nuevos atributos de sellado antes del cierre del tag
        const nuevoComprobanteTag = comprobanteTag.replace(
            /(\s*)>/,
            ` Sello="${sello}" NoCertificado="${numeroCertificado}" Certificado="${certificadoBase64}"$1>`
        );
        
        // Reemplazar en el XML completo
        const xmlSellado = xmlContent.replace(comprobanteMatch[0], nuevoComprobanteTag);
        
        console.log('✅ Sello agregado al XML exitosamente (fallback)');
        
        return xmlSellado;
        
    } catch (error) {
        console.error('❌ Error agregando sello al XML (fallback):', error);
        throw new Error(`Error agregando sello al XML: ${error.message}`);
    }
}

/**
 * Función principal de sellado CFDI con NodeCfdi (versión fallback)
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<Object>} - Resultado del sellado
 */
async function sellarCFDINodeCfdiFallback(xmlContent, certificadoBase64, llavePrivadaBase64, password, version = '4.0') {
    console.log('🚀 INICIANDO SELLADO CFDI CON NODECFDI (FALLBACK)');
    console.log('📋 Versión CFDI:', version);
    console.log('📏 Tamaño XML:', xmlContent.length);
    
    const startTime = Date.now();
    
    try {
        // Paso 1: Generar cadena original con nuestro procesador
        console.log('\n📋 PASO 1: Generando cadena original (fallback)...');
        const cadenaOriginal = await generarCadenaOriginalFallback(xmlContent, version);
        
        // Paso 2: Firmar cadena original con NodeCfdi
        console.log('\n🔐 PASO 2: Firmando cadena original con NodeCfdi...');
        const resultadoFirma = await firmarCadenaNodeCfdiFallback(
            cadenaOriginal, 
            certificadoBase64, 
            llavePrivadaBase64, 
            password
        );
        
        // Paso 3: Agregar sello al XML
        console.log('\n📝 PASO 3: Agregando sello al XML...');
        const xmlSellado = agregarSelloAlXMLFallback(
            xmlContent,
            resultadoFirma.sello,
            resultadoFirma.numeroCertificado,
            resultadoFirma.certificadoBase64
        );
        
        const endTime = Date.now();
        const tiempoTotal = endTime - startTime;
        
        console.log('\n🎉 SELLADO COMPLETADO EXITOSAMENTE (FALLBACK)');
        console.log('⏱️ Tiempo total:', tiempoTotal, 'ms');
        console.log('📋 RFC certificado:', resultadoFirma.rfcCertificado);
        console.log('📋 Nombre legal:', resultadoFirma.nombreLegal);
        
        return {
            success: true,
            xmlSellado,
            cadenaOriginal,
            sello: resultadoFirma.sello,
            numeroCertificado: resultadoFirma.numeroCertificado,
            rfcCertificado: resultadoFirma.rfcCertificado,
            nombreLegal: resultadoFirma.nombreLegal,
            tiempoMs: tiempoTotal,
            metodo: 'NodeCfdi-Fallback'
        };
        
    } catch (error) {
        console.error('❌ ERROR EN SELLADO NODECFDI (FALLBACK):', error);
        
        return {
            success: false,
            error: error.message,
            metodo: 'NodeCfdi-Fallback'
        };
    }
}

module.exports = {
    sellarCFDINodeCfdiFallback,
    generarCadenaOriginalFallback,
    firmarCadenaNodeCfdiFallback,
    agregarSelloAlXMLFallback
};
