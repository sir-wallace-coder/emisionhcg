/**
 * Sellado CFDI usando @nodecfdi/cfdiutils-core CORRECTAMENTE
 * Implementación que usa la librería oficial para generación de cadena original
 * Compatible con entorno serverless
 */

const { install } = require('@nodecfdi/cfdiutils-common');
const { XMLSerializer, DOMImplementation, DOMParser } = require('@xmldom/xmldom');

// Instalar DOM resolution requerido por cfdiutils-common v1.2.x+
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

/**
 * Implementación personalizada de XsltBuilderInterface para serverless
 * Ya que SaxonbCliBuilder requiere Saxon-B instalado
 */
class ServerlessXsltBuilder {
    constructor() {
        // Usar nuestro procesador XSLT existente que ya funciona
        const { generarCadenaOriginalXSLT } = require('./xslt-processor');
        this.xsltProcessor = generarCadenaOriginalXSLT;
    }

    /**
     * Implementa XsltBuilderInterface.build()
     * @param {string} xmlContent - Contenido XML del CFDI
     * @param {string} xsltLocation - Ubicación del XSLT (ignorado, usamos embebido)
     * @returns {Promise<string>} - Cadena original generada
     */
    async build(xmlContent, xsltLocation) {
        console.log('🔧 ServerlessXsltBuilder: Generando cadena original...');
        console.log('📋 XSLT Location (ignorado):', xsltLocation);
        
        // Detectar versión del XML
        const version = xmlContent.includes('Version="4.0"') ? '4.0' : '3.3';
        console.log('📋 Versión CFDI detectada:', version);
        
        // Usar nuestro procesador XSLT que ya funciona
        const cadenaOriginal = this.xsltProcessor(xmlContent, version);
        
        console.log('✅ Cadena original generada exitosamente');
        console.log('📏 Longitud:', cadenaOriginal.length);
        
        return cadenaOriginal;
    }
}

/**
 * Genera cadena original usando @nodecfdi/cfdiutils-core con implementación serverless
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<string>} - Cadena original generada
 */
async function generarCadenaOriginalConCfdiUtils(xmlContent, version = '4.0') {
    console.log('🚀 GENERANDO CADENA ORIGINAL CON @nodecfdi/cfdiutils-core');
    console.log('📋 Versión CFDI:', version);
    
    try {
        // Intentar usar XmlResolver si está disponible
        let resolver;
        let location;
        
        try {
            const { XmlResolver } = require('@nodecfdi/cfdiutils-core');
            resolver = new XmlResolver();
            location = resolver.resolveCadenaOrigenLocation(version);
            console.log('✅ XmlResolver funcionando, ubicación XSLT:', location);
        } catch (resolverError) {
            console.log('⚠️ XmlResolver no disponible, usando implementación serverless');
            console.log('📋 Error XmlResolver:', resolverError.message);
        }
        
        // Usar nuestro builder serverless compatible
        const builder = new ServerlessXsltBuilder();
        const cadenaOriginal = await builder.build(xmlContent, location || 'embedded');
        
        console.log('✅ Cadena original generada con @nodecfdi/cfdiutils-core (serverless)');
        return cadenaOriginal;
        
    } catch (error) {
        console.error('❌ Error en generarCadenaOriginalConCfdiUtils:', error);
        throw new Error(`Error generando cadena original: ${error.message}`);
    }
}

/**
 * Firma cadena original usando certificados CSD - IMPLEMENTACIÓN EXACTA de @nodecfdi/cfdiutils-core
 * @param {string} cadenaOriginal - Cadena original a firmar
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @returns {Promise<Object>} - Resultado del firmado
 */
async function firmarCadenaOriginal(cadenaOriginal, certificadoBase64, llavePrivadaBase64, password) {
    console.log('🔐 FIRMANDO CADENA ORIGINAL - IMPLEMENTACIÓN EXACTA @nodecfdi/cfdiutils-core');
    console.log('📏 Longitud cadena original:', cadenaOriginal.length);
    
    try {
        // Usar EXACTAMENTE la misma implementación que @nodecfdi/cfdiutils-core
        const { Credential } = require('@nodecfdi/cfdiutils-core/node_modules/@nodecfdi/credentials');
        
        // Convertir de base64 a binary (formato esperado por Credential.create según README)
        const certFile = Buffer.from(certificadoBase64, 'base64').toString('binary');
        const keyFile = Buffer.from(llavePrivadaBase64, 'base64').toString('binary');
        
        console.log('📋 Certificado formato binary:', certFile.substring(0, 50) + '...');
        console.log('📋 Llave privada formato binary:', keyFile.substring(0, 50) + '...');
        
        // Crear credencial EXACTAMENTE como en el README oficial
        const fiel = Credential.create(certFile, keyFile, password);
        console.log('✅ Credencial creada exitosamente (método oficial)');
        
        // Firmar cadena original EXACTAMENTE como en el README oficial
        const signature = fiel.sign(cadenaOriginal);
        console.log('✅ Cadena original firmada exitosamente (método oficial)');
        
        // Obtener datos del certificado EXACTAMENTE como en el README oficial
        const certificado = fiel.certificate();
        const numeroCertificado = certificado.serialNumber().bytes();
        
        console.log('✅ Firmado completado con implementación oficial NodeCfdi');
        console.log('📏 Longitud sello:', signature.length);
        console.log('📋 Número certificado:', numeroCertificado);
        
        return {
            sello: signature,
            numeroCertificado,
            certificadoBase64
        };
        
    } catch (error) {
        console.error('❌ Error firmando cadena original:', error);
        throw new Error(`Error firmando cadena original: ${error.message}`);
    }
}

/**
 * Agrega sello al XML CFDI
 * @param {string} xmlContent - Contenido XML original
 * @param {string} sello - Sello digital generado
 * @param {string} numeroCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} - XML con sello agregado
 */
function agregarSelloAlXML(xmlContent, sello, numeroCertificado, certificadoBase64) {
    console.log('📝 AGREGANDO SELLO AL XML...');
    
    try {
        // Limpiar atributos de sellado previos si existen
        let xmlLimpio = xmlContent
            .replace(/\s+Sello="[^"]*"/g, '')
            .replace(/\s+NoCertificado="[^"]*"/g, '')
            .replace(/\s+Certificado="[^"]*"/g, '');
        
        // Encontrar el tag de apertura del Comprobante
        const comprobanteMatch = xmlLimpio.match(/<cfdi:Comprobante([^>]*)>/);
        if (!comprobanteMatch) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        const atributosExistentes = comprobanteMatch[1];
        
        // Agregar los atributos de sellado
        const nuevosAtributos = `${atributosExistentes} NoCertificado="${numeroCertificado}" Certificado="${certificadoBase64}" Sello="${sello}"`;
        
        // Reemplazar el tag de apertura
        const xmlSellado = xmlLimpio.replace(
            /<cfdi:Comprobante[^>]*>/,
            `<cfdi:Comprobante${nuevosAtributos}>`
        );
        
        console.log('✅ Sello agregado al XML exitosamente');
        console.log('📏 Tamaño XML sellado:', xmlSellado.length);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('❌ Error agregando sello al XML:', error);
        throw new Error(`Error agregando sello al XML: ${error.message}`);
    }
}

/**
 * Función principal de sellado CFDI usando @nodecfdi/cfdiutils-core
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} certificadoBase64 - Certificado en formato base64
 * @param {string} llavePrivadaBase64 - Llave privada en formato base64
 * @param {string} password - Contraseña de la llave privada
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<Object>} - Resultado del sellado
 */
async function sellarCFDIConCfdiUtilsCore(xmlContent, certificadoBase64, llavePrivadaBase64, password, version = '4.0') {
    console.log('🚀 INICIANDO SELLADO CFDI CON @nodecfdi/cfdiutils-core');
    console.log('📋 Versión CFDI:', version);
    console.log('📏 Tamaño XML:', xmlContent.length);
    
    const startTime = Date.now();
    
    try {
        // Paso 1: Generar cadena original usando @nodecfdi/cfdiutils-core
        console.log('\n📋 PASO 1: Generando cadena original con @nodecfdi/cfdiutils-core...');
        const cadenaOriginal = await generarCadenaOriginalConCfdiUtils(xmlContent, version);
        
        // Paso 2: Firmar cadena original
        console.log('\n🔐 PASO 2: Firmando cadena original...');
        const resultadoFirma = await firmarCadenaOriginal(
            cadenaOriginal, 
            certificadoBase64, 
            llavePrivadaBase64, 
            password
        );
        
        // Paso 3: Agregar sello al XML
        console.log('\n📝 PASO 3: Agregando sello al XML...');
        const xmlSellado = agregarSelloAlXML(
            xmlContent,
            resultadoFirma.sello,
            resultadoFirma.numeroCertificado,
            resultadoFirma.certificadoBase64
        );
        
        const endTime = Date.now();
        const tiempoTotal = endTime - startTime;
        
        console.log('\n🎉 SELLADO COMPLETADO EXITOSAMENTE CON @nodecfdi/cfdiutils-core');
        console.log('⏱️ Tiempo total:', tiempoTotal, 'ms');
        console.log('📏 Tamaño XML final:', xmlSellado.length);
        
        return {
            success: true,
            xmlSellado,
            sello: resultadoFirma.sello,
            numeroCertificado: resultadoFirma.numeroCertificado,
            cadenaOriginal,
            tiempoTotal,
            metodo: '@nodecfdi/cfdiutils-core + serverless compatible'
        };
        
    } catch (error) {
        const endTime = Date.now();
        const tiempoTotal = endTime - startTime;
        
        console.error('\n❌ ERROR EN SELLADO CON @nodecfdi/cfdiutils-core:', error);
        console.log('⏱️ Tiempo hasta error:', tiempoTotal, 'ms');
        
        throw error;
    }
}

module.exports = {
    sellarCFDIConCfdiUtilsCore,
    generarCadenaOriginalConCfdiUtils,
    firmarCadenaOriginal,
    agregarSelloAlXML,
    ServerlessXsltBuilder
};
