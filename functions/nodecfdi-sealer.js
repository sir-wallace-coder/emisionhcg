/**
 * Sellado CFDI usando @nodecfdi/cfdiutils-core y @nodecfdi/credentials
 * Implementación para arquitectura serverless (Netlify Functions)
 */

const { install, XmlNodeUtils } = require('@nodecfdi/cfdiutils-common');
const { XMLSerializer, DOMImplementation, DOMParser } = require('@xmldom/xmldom');
const { XmlResolver, SaxonbCliBuilder } = require('@nodecfdi/cfdiutils-core');
const { Credential } = require('@nodecfdi/credentials/node');

// Instalar resolución DOM requerida por NodeCfdi
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

/**
 * Genera la cadena original de un CFDI usando XSLT oficial del SAT
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<string>} - Cadena original generada
 */
async function generarCadenaOriginalNodeCfdi(xmlContent, version = '4.0') {
    console.log('🔍 Generando cadena original con NodeCfdi...');
    console.log('📋 Versión CFDI:', version);
    
    try {
        // Crear resolvedor XML para obtener ubicación XSLT
        const resolver = new XmlResolver();
        const xsltLocation = resolver.resolveCadenaOrigenLocation(version);
        
        console.log('📁 Ubicación XSLT:', xsltLocation);
        
        // NOTA: Saxon-B es requerido para XSLT processing
        // En serverless, esto podría ser una limitación
        // Por ahora, intentaremos usar SaxonbCliBuilder
        const builder = new SaxonbCliBuilder('saxonb-xslt'); // Comando Saxon-B
        
        const cadenaOriginal = await builder.build(xmlContent, xsltLocation);
        
        console.log('✅ Cadena original generada exitosamente');
        console.log('📏 Longitud cadena original:', cadenaOriginal.length);
        console.log('🔍 Preview cadena original:', cadenaOriginal.substring(0, 100) + '...');
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('❌ Error generando cadena original con NodeCfdi:', error);
        throw new Error(`Error generando cadena original: ${error.message}`);
    }
}

/**
 * Firma una cadena de texto usando certificados CSD con NodeCfdi
 * @param {string} cadenaOriginal - Cadena original a firmar
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @returns {Promise<string>} - Sello digital generado
 */
async function firmarCadenaNodeCfdi(cadenaOriginal, certificadoBase64, llavePrivadaBase64, password) {
    console.log('🔐 Firmando cadena original con NodeCfdi...');
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
        
        console.log('✅ Sello digital generado exitosamente');
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
            certificadoBase64: certificadoBase64
        };
        
    } catch (error) {
        console.error('❌ Error firmando cadena con NodeCfdi:', error);
        throw new Error(`Error firmando cadena: ${error.message}`);
    }
}

/**
 * Agrega el sello digital al XML CFDI
 * @param {string} xmlContent - Contenido XML original
 * @param {string} sello - Sello digital generado
 * @param {string} numeroCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} - XML con sello agregado
 */
function agregarSelloAlXMLNodeCfdi(xmlContent, sello, numeroCertificado, certificadoBase64) {
    console.log('📝 Agregando sello al XML...');
    
    try {
        // Parsear el XML
        const xmlDoc = XmlNodeUtils.nodeFromXmlString(xmlContent);
        
        // Buscar el nodo Comprobante
        const comprobante = xmlDoc.searchNode('cfdi:Comprobante');
        
        if (!comprobante) {
            throw new Error('No se encontró el nodo cfdi:Comprobante en el XML');
        }
        
        // Agregar atributos de sellado
        comprobante.attributes().set('Sello', sello);
        comprobante.attributes().set('NoCertificado', numeroCertificado);
        comprobante.attributes().set('Certificado', certificadoBase64);
        
        // Convertir de vuelta a XML string
        const xmlSellado = XmlNodeUtils.nodeToXmlString(xmlDoc);
        
        console.log('✅ Sello agregado al XML exitosamente');
        
        return xmlSellado;
        
    } catch (error) {
        console.error('❌ Error agregando sello al XML:', error);
        throw new Error(`Error agregando sello al XML: ${error.message}`);
    }
}

/**
 * Función principal de sellado CFDI con NodeCfdi
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<Object>} - Resultado del sellado
 */
async function sellarCFDINodeCfdi(xmlContent, certificadoBase64, llavePrivadaBase64, password, version = '4.0') {
    console.log('🚀 INICIANDO SELLADO CFDI CON NODECFDI');
    console.log('📋 Versión CFDI:', version);
    console.log('📏 Tamaño XML:', xmlContent.length);
    
    const startTime = Date.now();
    
    try {
        // Paso 1: Generar cadena original
        console.log('\n📋 PASO 1: Generando cadena original...');
        const cadenaOriginal = await generarCadenaOriginalNodeCfdi(xmlContent, version);
        
        // Paso 2: Firmar cadena original
        console.log('\n🔐 PASO 2: Firmando cadena original...');
        const resultadoFirma = await firmarCadenaNodeCfdi(
            cadenaOriginal, 
            certificadoBase64, 
            llavePrivadaBase64, 
            password
        );
        
        // Paso 3: Agregar sello al XML
        console.log('\n📝 PASO 3: Agregando sello al XML...');
        const xmlSellado = agregarSelloAlXMLNodeCfdi(
            xmlContent,
            resultadoFirma.sello,
            resultadoFirma.numeroCertificado,
            resultadoFirma.certificadoBase64
        );
        
        const endTime = Date.now();
        const tiempoTotal = endTime - startTime;
        
        console.log('\n🎉 SELLADO COMPLETADO EXITOSAMENTE');
        console.log('⏱️ Tiempo total:', tiempoTotal, 'ms');
        
        return {
            success: true,
            xmlSellado,
            cadenaOriginal,
            sello: resultadoFirma.sello,
            numeroCertificado: resultadoFirma.numeroCertificado,
            tiempoMs: tiempoTotal,
            metodo: 'NodeCfdi'
        };
        
    } catch (error) {
        console.error('❌ ERROR EN SELLADO NODECFDI:', error);
        
        return {
            success: false,
            error: error.message,
            metodo: 'NodeCfdi'
        };
    }
}

module.exports = {
    sellarCFDINodeCfdi,
    generarCadenaOriginalNodeCfdi,
    firmarCadenaNodeCfdi,
    agregarSelloAlXMLNodeCfdi
};
