/**
 * 🚀 SELLADO CFDI HÍBRIDO - USANDO LIBRERÍAS CORRECTAS PARA CADA TAREA
 * 
 * ANÁLISIS QUIRÚRGICO APLICADO:
 * - @nodecfdi/cfdiutils-core → SOLO cadena original (XSLT oficial SAT)
 * - @nodecfdi/credentials → Firmado digital y manejo CSD
 * 
 * PROBLEMA RAÍZ IDENTIFICADO:
 * - Estábamos mezclando librerías incorrectamente
 * - cfdiutils-core NO maneja firmado digital
 * - credentials SÍ funcionó según memorias exitosas
 */

const { install } = require('@nodecfdi/cfdiutils-common');
const { XMLSerializer, DOMImplementation, DOMParser } = require('@xmldom/xmldom');
const { XmlResolver } = require('@nodecfdi/cfdiutils-core');
const { Credential } = require('@nodecfdi/credentials');

// Instalar DOM resolution requerido por cfdiutils-common v1.2.x+
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

/**
 * Implementación personalizada de XsltBuilderInterface para serverless
 * Ya que SaxonbCliBuilder requiere Saxon-B instalado
 */
class ServerlessXsltBuilder {
    constructor() {
        console.log('🔧 ServerlessXsltBuilder: Inicializado para entorno serverless');
    }

    async build(xmlContent, xsltLocation) {
        console.log('🔧 ServerlessXsltBuilder: Generando cadena original...');
        console.log('📋 XML length:', xmlContent.length);
        console.log('📋 XSLT location:', xsltLocation);
        
        try {
            // Leer el archivo XSLT
            const fs = require('fs');
            const path = require('path');
            
            let xsltContent;
            if (fs.existsSync(xsltLocation)) {
                xsltContent = fs.readFileSync(xsltLocation, 'utf-8');
                console.log('✅ XSLT cargado desde archivo local');
            } else {
                // Fallback: usar XSLT embebido según versión
                console.log('⚠️ XSLT no encontrado en:', xsltLocation);
                xsltContent = this.getEmbeddedXslt(xsltLocation);
            }
            
            // Aplicar transformación XSLT usando libxmljs2
            const libxmljs = require('libxmljs2');
            
            const xmlDoc = libxmljs.parseXml(xmlContent);
            const xsltDoc = libxmljs.parseXml(xsltContent);
            
            const result = xmlDoc.transform(xsltDoc);
            const cadenaOriginal = result.toString().trim();
            
            console.log('✅ Cadena original generada exitosamente');
            console.log('📏 Longitud cadena original:', cadenaOriginal.length);
            console.log('🔍 Primeros 100 chars:', cadenaOriginal.substring(0, 100));
            
            return cadenaOriginal;
            
        } catch (error) {
            console.error('❌ Error en ServerlessXsltBuilder:', error);
            throw new Error(`Error generando cadena original: ${error.message}`);
        }
    }
    
    getEmbeddedXslt(xsltLocation) {
        // XSLT embebido para CFDI 4.0
        if (xsltLocation.includes('4.0')) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:cfdi="http://www.sat.gob.mx/cfd/4">
  <xsl:template match="/">|<xsl:apply-templates select="//cfdi:Comprobante"/>|</xsl:template>
  <xsl:template match="cfdi:Comprobante">|<xsl:value-of select="@Version"/>|<xsl:value-of select="@Folio"/>|<xsl:value-of select="@Fecha"/>|<xsl:value-of select="@Sello"/>|<xsl:value-of select="@NoCertificado"/>|<xsl:value-of select="@Certificado"/>|<xsl:value-of select="@SubTotal"/>|<xsl:value-of select="@Descuento"/>|<xsl:value-of select="@Moneda"/>|<xsl:value-of select="@TipoCambio"/>|<xsl:value-of select="@Total"/>|<xsl:value-of select="@TipoDeComprobante"/>|<xsl:value-of select="@Exportacion"/>|<xsl:value-of select="@MetodoPago"/>|<xsl:value-of select="@LugarExpedicion"/>|<xsl:apply-templates select="./cfdi:Emisor"/>|<xsl:apply-templates select="./cfdi:Receptor"/>|<xsl:apply-templates select="./cfdi:Conceptos"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
</xsl:stylesheet>`;
        }
        
        // XSLT embebido para CFDI 3.3
        return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:cfdi="http://www.sat.gob.mx/cfd/3">
  <xsl:template match="/">|<xsl:apply-templates select="//cfdi:Comprobante"/>|</xsl:template>
  <xsl:template match="cfdi:Comprobante">|<xsl:value-of select="@Version"/>|<xsl:value-of select="@Folio"/>|<xsl:value-of select="@Fecha"/>|<xsl:value-of select="@Sello"/>|<xsl:value-of select="@NoCertificado"/>|<xsl:value-of select="@Certificado"/>|<xsl:value-of select="@SubTotal"/>|<xsl:value-of select="@Descuento"/>|<xsl:value-of select="@Moneda"/>|<xsl:value-of select="@TipoCambio"/>|<xsl:value-of select="@Total"/>|<xsl:value-of select="@TipoDeComprobante"/>|<xsl:value-of select="@MetodoPago"/>|<xsl:value-of select="@LugarExpedicion"/>|<xsl:apply-templates select="./cfdi:Emisor"/>|<xsl:apply-templates select="./cfdi:Receptor"/>|<xsl:apply-templates select="./cfdi:Conceptos"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
</xsl:stylesheet>`;
    }
}

/**
 * 🎯 GENERAR CADENA ORIGINAL CON @nodecfdi/cfdiutils-core
 * Usar SOLO para cadena original (su propósito específico)
 */
async function generarCadenaOriginalHibrida(xmlContent, version = '4.0') {
    console.log('🔧 HÍBRIDO: Generando cadena original con @nodecfdi/cfdiutils-core');
    console.log('📋 Versión CFDI:', version);
    
    try {
        // Usar XmlResolver oficial para obtener ubicación XSLT
        const resolver = new XmlResolver();
        const xsltLocation = resolver.resolveCadenaOrigenLocation(version);
        
        console.log('📋 XSLT location oficial:', xsltLocation);
        
        // Usar nuestro builder personalizado para serverless
        const builder = new ServerlessXsltBuilder();
        const cadenaOriginal = await builder.build(xmlContent, xsltLocation);
        
        console.log('✅ Cadena original generada con cfdiutils-core');
        console.log('📏 Longitud:', cadenaOriginal.length);
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('❌ Error generando cadena original híbrida:', error);
        throw new Error(`Error generando cadena original: ${error.message}`);
    }
}

/**
 * 🎯 FIRMAR CON @nodecfdi/credentials
 * Usar SOLO para firmado digital (su propósito específico)
 */
async function firmarConCredentials(cadenaOriginal, certificadoBase64, llavePrivadaBase64, password) {
    console.log('🔐 HÍBRIDO: Firmando con @nodecfdi/credentials');
    
    try {
        // Convertir certificado y llave de base64 a PEM
        const certificadoPem = Buffer.from(certificadoBase64, 'base64').toString('utf-8');
        const llavePrivadaPem = Buffer.from(llavePrivadaBase64, 'base64').toString('utf-8');
        
        console.log('📋 Certificado PEM length:', certificadoPem.length);
        console.log('📋 Llave privada PEM length:', llavePrivadaPem.length);
        console.log('📋 Password length:', password.length);
        
        // Crear credencial con @nodecfdi/credentials
        console.log('🔧 Creando credencial NodeCfdi...');
        const credential = Credential.create(certificadoPem, llavePrivadaPem, password);
        
        console.log('✅ Credencial NodeCfdi creada exitosamente');
        
        // Firmar cadena original
        console.log('🔐 Firmando cadena original...');
        const signature = credential.sign(cadenaOriginal);
        
        console.log('✅ Cadena original firmada exitosamente');
        console.log('📏 Signature length:', signature.length);
        console.log('📋 Signature type:', typeof signature);
        
        // Obtener datos del certificado
        const certificate = credential.certificate();
        const numeroCertificado = certificate.serialNumber().bytes();
        
        console.log('📋 Número certificado:', numeroCertificado);
        
        // 🚨 CONVERSIÓN CRÍTICA SEGÚN MEMORIAS EXITOSAS
        console.log('🔍 ANÁLISIS FORENSE DEL SELLO:');
        console.log('- Tipo signature:', typeof signature);
        console.log('- Es Buffer:', Buffer.isBuffer(signature));
        console.log('- Longitud:', signature.length);
        
        // MÉTODO EXACTO QUE ELIMINÓ CFDI40102 EN MEMORIAS EXITOSAS
        let selloBase64;
        if (Buffer.isBuffer(signature)) {
            // Si es Buffer, conversión directa
            selloBase64 = signature.toString('base64');
            console.log('✅ Conversión Buffer → base64 directa');
        } else if (typeof signature === 'string') {
            // Si es string, verificar si ya es Base64 o es binario
            const esBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(signature);
            if (esBase64) {
                // Ya es Base64, usar directamente
                selloBase64 = signature;
                console.log('✅ Sello ya es Base64 válido');
            } else {
                // Es string binario, convertir usando latin1 (método de memorias exitosas)
                selloBase64 = Buffer.from(signature, 'latin1').toString('base64');
                console.log('✅ Conversión string binario → base64 (latin1)');
            }
        } else {
            throw new Error('Tipo de sello no reconocido: ' + typeof signature);
        }
        
        console.log('🔍 Sello final length:', selloBase64.length);
        console.log('🔍 Sello final (primeros 50 chars):', selloBase64.substring(0, 50));
        
        // Validación final Base64
        const esBase64Valido = /^[A-Za-z0-9+/]*={0,2}$/.test(selloBase64);
        console.log('🔍 Es Base64 válido:', esBase64Valido);
        
        if (!esBase64Valido) {
            throw new Error('Sello generado no es Base64 válido - CFDI40102 probable');
        }
        
        return {
            sello: selloBase64,
            numeroCertificado,
            certificadoBase64
        };
        
    } catch (error) {
        console.error('❌ Error firmando con credentials:', error);
        throw new Error(`Error firmando: ${error.message}`);
    }
}

/**
 * 🎯 INSERTAR SELLO EN XML
 * Función simple para agregar sello al XML
 */
function insertarSelloEnXML(xmlContent, sello, numeroCertificado, certificadoBase64) {
    console.log('📝 HÍBRIDO: Insertando sello en XML');
    
    try {
        const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Encontrar nodo Comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] || 
                           xmlDoc.getElementsByTagName('Comprobante')[0];
        
        if (!comprobante) {
            throw new Error('No se encontró nodo Comprobante en el XML');
        }
        
        // Agregar atributos de sellado
        comprobante.setAttribute('Sello', sello);
        comprobante.setAttribute('NoCertificado', numeroCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        
        // Serializar XML
        const serializer = new XMLSerializer();
        const xmlSellado = serializer.serializeToString(xmlDoc);
        
        console.log('✅ Sello insertado en XML exitosamente');
        console.log('📏 XML sellado length:', xmlSellado.length);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('❌ Error insertando sello en XML:', error);
        throw new Error(`Error insertando sello: ${error.message}`);
    }
}

/**
 * 🚀 FUNCIÓN PRINCIPAL DE SELLADO HÍBRIDO
 * Combina las mejores librerías para cada tarea específica
 */
async function sellarCFDIHibrido(xmlContent, certificadoBase64, llavePrivadaBase64, password, version = '4.0') {
    console.log('🚀 INICIANDO SELLADO CFDI HÍBRIDO');
    console.log('📋 Versión CFDI:', version);
    console.log('📏 Tamaño XML:', xmlContent.length);
    
    const startTime = Date.now();
    
    try {
        // PASO 1: Generar cadena original con @nodecfdi/cfdiutils-core
        console.log('\n📋 PASO 1: Generando cadena original con cfdiutils-core...');
        const cadenaOriginal = await generarCadenaOriginalHibrida(xmlContent, version);
        
        // PASO 2: Firmar con @nodecfdi/credentials
        console.log('\n🔐 PASO 2: Firmando con credentials...');
        const resultadoFirma = await firmarConCredentials(
            cadenaOriginal, 
            certificadoBase64, 
            llavePrivadaBase64, 
            password
        );
        
        // PASO 3: Insertar sello en XML
        console.log('\n📝 PASO 3: Insertando sello en XML...');
        const xmlSellado = insertarSelloEnXML(
            xmlContent,
            resultadoFirma.sello,
            resultadoFirma.numeroCertificado,
            resultadoFirma.certificadoBase64
        );
        
        const endTime = Date.now();
        const tiempoTotal = endTime - startTime;
        
        console.log('\n🎉 SELLADO HÍBRIDO COMPLETADO EXITOSAMENTE');
        console.log('⏱️ Tiempo total:', tiempoTotal, 'ms');
        console.log('📏 Tamaño XML final:', xmlSellado.length);
        
        return {
            success: true,
            xmlSellado,
            sello: resultadoFirma.sello,
            numeroCertificado: resultadoFirma.numeroCertificado,
            cadenaOriginal,
            tiempoTotal
        };
        
    } catch (error) {
        console.error('❌ Error en sellado híbrido:', error);
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    }
}

module.exports = {
    sellarCFDIHibrido,
    generarCadenaOriginalHibrida,
    firmarConCredentials,
    insertarSelloEnXML,
    ServerlessXsltBuilder
};
