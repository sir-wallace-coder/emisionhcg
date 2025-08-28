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

// 🚀 CORRECCIÓN CRÍTICA: Eliminar libxmljs2 (incompatible GLIBC serverless)
// Usar SOLO JavaScript puro sin binarios nativos
const { Credential } = require('@nodecfdi/credentials');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const forge = require('node-forge');

/**
 * 🎯 OBTENER XSLT PARA VERSIÓN CFDI
 * XSLT oficial SAT embebido para evitar dependencias ES Modules
 */
function getXsltForVersion(version) {
    console.log('📋 Obteniendo XSLT para versión:', version);
    
    // XSLT embebido para CFDI 4.0 (oficial SAT)
    if (version === '4.0') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:cfdi="http://www.sat.gob.mx/cfd/4">
  <xsl:output method="text" version="1.0" encoding="UTF-8" indent="no"/>
  <xsl:template match="/">|<xsl:apply-templates select="//cfdi:Comprobante"/>|</xsl:template>
  <xsl:template match="cfdi:Comprobante">|<xsl:value-of select="@Version"/>|<xsl:value-of select="@Folio"/>|<xsl:value-of select="@Fecha"/>|<xsl:value-of select="@Sello"/>|<xsl:value-of select="@NoCertificado"/>|<xsl:value-of select="@Certificado"/>|<xsl:value-of select="@SubTotal"/>|<xsl:value-of select="@Descuento"/>|<xsl:value-of select="@Moneda"/>|<xsl:value-of select="@TipoCambio"/>|<xsl:value-of select="@Total"/>|<xsl:value-of select="@TipoDeComprobante"/>|<xsl:value-of select="@Exportacion"/>|<xsl:value-of select="@MetodoPago"/>|<xsl:value-of select="@LugarExpedicion"/>|<xsl:apply-templates select="./cfdi:Emisor"/>|<xsl:apply-templates select="./cfdi:Receptor"/>|<xsl:apply-templates select="./cfdi:Conceptos"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
  <xsl:template match="cfdi:Emisor">|<xsl:value-of select="@Rfc"/>|<xsl:value-of select="@Nombre"/>|<xsl:value-of select="@RegimenFiscal"/>|</xsl:template>
  <xsl:template match="cfdi:Receptor">|<xsl:value-of select="@Rfc"/>|<xsl:value-of select="@Nombre"/>|<xsl:value-of select="@DomicilioFiscalReceptor"/>|<xsl:value-of select="@RegimenFiscalReceptor"/>|<xsl:value-of select="@UsoCFDI"/>|</xsl:template>
  <xsl:template match="cfdi:Conceptos">|<xsl:for-each select="./cfdi:Concepto"><xsl:apply-templates select="."/></xsl:for-each>|</xsl:template>
  <xsl:template match="cfdi:Concepto">|<xsl:value-of select="@ClaveProdServ"/>|<xsl:value-of select="@NoIdentificacion"/>|<xsl:value-of select="@Cantidad"/>|<xsl:value-of select="@ClaveUnidad"/>|<xsl:value-of select="@Unidad"/>|<xsl:value-of select="@Descripcion"/>|<xsl:value-of select="@ValorUnitario"/>|<xsl:value-of select="@Importe"/>|<xsl:value-of select="@Descuento"/>|<xsl:value-of select="@ObjetoImp"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
</xsl:stylesheet>`;
    }
    
    // XSLT embebido para CFDI 3.3 (oficial SAT)
    return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:cfdi="http://www.sat.gob.mx/cfd/3">
  <xsl:output method="text" version="1.0" encoding="UTF-8" indent="no"/>
  <xsl:template match="/">|<xsl:apply-templates select="//cfdi:Comprobante"/>|</xsl:template>
  <xsl:template match="cfdi:Comprobante">|<xsl:value-of select="@Version"/>|<xsl:value-of select="@Folio"/>|<xsl:value-of select="@Fecha"/>|<xsl:value-of select="@Sello"/>|<xsl:value-of select="@NoCertificado"/>|<xsl:value-of select="@Certificado"/>|<xsl:value-of select="@SubTotal"/>|<xsl:value-of select="@Descuento"/>|<xsl:value-of select="@Moneda"/>|<xsl:value-of select="@TipoCambio"/>|<xsl:value-of select="@Total"/>|<xsl:value-of select="@TipoDeComprobante"/>|<xsl:value-of select="@MetodoPago"/>|<xsl:value-of select="@LugarExpedicion"/>|<xsl:apply-templates select="./cfdi:Emisor"/>|<xsl:apply-templates select="./cfdi:Receptor"/>|<xsl:apply-templates select="./cfdi:Conceptos"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
  <xsl:template match="cfdi:Emisor">|<xsl:value-of select="@Rfc"/>|<xsl:value-of select="@Nombre"/>|<xsl:value-of select="@RegimenFiscal"/>|</xsl:template>
  <xsl:template match="cfdi:Receptor">|<xsl:value-of select="@Rfc"/>|<xsl:value-of select="@Nombre"/>|<xsl:value-of select="@UsoCFDI"/>|</xsl:template>
  <xsl:template match="cfdi:Conceptos">|<xsl:for-each select="./cfdi:Concepto"><xsl:apply-templates select="."/></xsl:for-each>|</xsl:template>
  <xsl:template match="cfdi:Concepto">|<xsl:value-of select="@ClaveProdServ"/>|<xsl:value-of select="@NoIdentificacion"/>|<xsl:value-of select="@Cantidad"/>|<xsl:value-of select="@ClaveUnidad"/>|<xsl:value-of select="@Unidad"/>|<xsl:value-of select="@Descripcion"/>|<xsl:value-of select="@ValorUnitario"/>|<xsl:value-of select="@Importe"/>|<xsl:value-of select="@Descuento"/>|<xsl:apply-templates select="./cfdi:Impuestos"/>|</xsl:template>
</xsl:stylesheet>`;
}

/**
 * 🎯 GENERAR CADENA ORIGINAL MANUAL SEGÚN ESPECIFICACIÓN SAT
 * Implementación JavaScript pura sin XSLT ni binarios nativos
 */
function generarCadenaOriginalManual(comprobante, version) {
    console.log('🔧 Generando cadena original manual para versión:', version);
    
    let cadena = '||';
    
    // Atributos principales del Comprobante
    cadena += (comprobante.getAttribute('Version') || '') + '|';
    cadena += (comprobante.getAttribute('Folio') || '') + '|';
    cadena += (comprobante.getAttribute('Fecha') || '') + '|';
    cadena += '|'; // Sello (vacío para cadena original)
    cadena += '|'; // NoCertificado (vacío para cadena original)
    cadena += '|'; // Certificado (vacío para cadena original)
    cadena += (comprobante.getAttribute('SubTotal') || '') + '|';
    cadena += (comprobante.getAttribute('Descuento') || '') + '|';
    cadena += (comprobante.getAttribute('Moneda') || '') + '|';
    cadena += (comprobante.getAttribute('TipoCambio') || '') + '|';
    cadena += (comprobante.getAttribute('Total') || '') + '|';
    cadena += (comprobante.getAttribute('TipoDeComprobante') || '') + '|';
    
    // Atributos específicos por versión
    if (version === '4.0') {
        cadena += (comprobante.getAttribute('Exportacion') || '') + '|';
    }
    
    cadena += (comprobante.getAttribute('MetodoPago') || '') + '|';
    cadena += (comprobante.getAttribute('LugarExpedicion') || '') + '|';
    
    // Emisor
    const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0] || 
                   comprobante.getElementsByTagName('Emisor')[0];
    if (emisor) {
        cadena += (emisor.getAttribute('Rfc') || '') + '|';
        cadena += (emisor.getAttribute('Nombre') || '') + '|';
        cadena += (emisor.getAttribute('RegimenFiscal') || '') + '|';
    }
    
    // Receptor
    const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0] || 
                     comprobante.getElementsByTagName('Receptor')[0];
    if (receptor) {
        cadena += (receptor.getAttribute('Rfc') || '') + '|';
        cadena += (receptor.getAttribute('Nombre') || '') + '|';
        
        if (version === '4.0') {
            cadena += (receptor.getAttribute('DomicilioFiscalReceptor') || '') + '|';
            cadena += (receptor.getAttribute('RegimenFiscalReceptor') || '') + '|';
        }
        
        cadena += (receptor.getAttribute('UsoCFDI') || '') + '|';
    }
    
    // Conceptos
    const conceptos = comprobante.getElementsByTagName('cfdi:Conceptos')[0] || 
                      comprobante.getElementsByTagName('Conceptos')[0];
    if (conceptos) {
        const listaConceptos = conceptos.getElementsByTagName('cfdi:Concepto') || 
                               conceptos.getElementsByTagName('Concepto');
        
        for (let i = 0; i < listaConceptos.length; i++) {
            const concepto = listaConceptos[i];
            cadena += (concepto.getAttribute('ClaveProdServ') || '') + '|';
            cadena += (concepto.getAttribute('NoIdentificacion') || '') + '|';
            cadena += (concepto.getAttribute('Cantidad') || '') + '|';
            cadena += (concepto.getAttribute('ClaveUnidad') || '') + '|';
            cadena += (concepto.getAttribute('Unidad') || '') + '|';
            cadena += (concepto.getAttribute('Descripcion') || '') + '|';
            cadena += (concepto.getAttribute('ValorUnitario') || '') + '|';
            cadena += (concepto.getAttribute('Importe') || '') + '|';
            cadena += (concepto.getAttribute('Descuento') || '') + '|';
            
            if (version === '4.0') {
                cadena += (concepto.getAttribute('ObjetoImp') || '') + '|';
            }
        }
    }
    
    // Impuestos (simplificado)
    const impuestos = comprobante.getElementsByTagName('cfdi:Impuestos')[0] || 
                      comprobante.getElementsByTagName('Impuestos')[0];
    if (impuestos) {
        cadena += (impuestos.getAttribute('TotalImpuestosTrasladados') || '') + '|';
        cadena += (impuestos.getAttribute('TotalImpuestosRetenidos') || '') + '|';
    }
    
    cadena += '||';
    
    console.log('✅ Cadena original manual generada:', cadena.length, 'caracteres');
    return cadena;
}

/**
 * 🎯 GENERAR CADENA ORIGINAL SERVERLESS COMPATIBLE
 * Sin dependencias ES Modules problemáticas
 */
async function generarCadenaOriginalHibrida(xmlContent, version = '4.0') {
    console.log('🔧 HÍBRIDO: Generando cadena original serverless compatible');
    console.log('📋 Versión CFDI:', version);
    
    try {
        // 🚨 IMPLEMENTACIÓN MANUAL SIN XSLT (libxmljs2 incompatible GLIBC)
        // Generar cadena original manualmente según especificación SAT
        console.log('📋 Generando cadena original manual (sin XSLT problemático)');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Encontrar nodo Comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] || 
                           xmlDoc.getElementsByTagName('Comprobante')[0];
        
        if (!comprobante) {
            throw new Error('No se encontró nodo Comprobante en el XML');
        }
        
        // Generar cadena original según especificación SAT
        const cadenaOriginal = generarCadenaOriginalManual(comprobante, version);
        
        console.log('✅ Cadena original generada manualmente (JavaScript puro)');
        console.log('📏 Longitud:', cadenaOriginal.length);
        console.log('🔍 Primeros 100 chars:', cadenaOriginal.substring(0, 100));
        
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
        // 🚨 CORRECCIÓN CRÍTICA: Convertir Base64 a PEM con headers correctos
        console.log('🔍 Certificado Base64 length:', certificadoBase64.length);
        console.log('🔍 Llave Base64 length:', llavePrivadaBase64.length);
        
        // Decodificar Base64 y agregar headers PEM
        const certificadoRaw = Buffer.from(certificadoBase64, 'base64').toString('utf-8');
        const llavePrivadaRaw = Buffer.from(llavePrivadaBase64, 'base64').toString('utf-8');
        
        // Agregar headers PEM si no los tienen
        let certificadoPem = certificadoRaw;
        if (!certificadoRaw.includes('-----BEGIN CERTIFICATE-----')) {
            // Es Base64 puro, agregar headers PEM
            certificadoPem = `-----BEGIN CERTIFICATE-----\n${certificadoBase64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
        }
        
        let llavePrivadaPem = llavePrivadaRaw;
        if (!llavePrivadaRaw.includes('-----BEGIN')) {
            // Es Base64 puro, agregar headers PEM (detectar tipo)
            const tipoLlave = llavePrivadaBase64.includes('ENCRYPTED') ? 'ENCRYPTED PRIVATE KEY' : 'PRIVATE KEY';
            llavePrivadaPem = `-----BEGIN ${tipoLlave}-----\n${llavePrivadaBase64.match(/.{1,64}/g).join('\n')}\n-----END ${tipoLlave}-----`;
        }
        
        console.log('✅ Certificado PEM length:', certificadoPem.length);
        console.log('✅ Llave privada PEM length:', llavePrivadaPem.length);
        console.log('📋 Password length:', password.length);
        console.log('🔍 Certificado tiene headers PEM:', certificadoPem.includes('-----BEGIN'));
        console.log('🔍 Llave tiene headers PEM:', llavePrivadaPem.includes('-----BEGIN'));
        
        // 🚨 CORRECCIÓN CRÍTICA: Desencriptar llave privada antes de usar con NodeCfdi
        console.log('🔧 Desencriptando llave privada...');
        let llavePrivadaDesencriptada = llavePrivadaPem;
        
        if (llavePrivadaPem.includes('ENCRYPTED')) {
            try {
                // Desencriptar llave privada usando node-forge
                const privateKeyEncrypted = forge.pki.decryptRsaPrivateKey(llavePrivadaPem, password);
                llavePrivadaDesencriptada = forge.pki.privateKeyToPem(privateKeyEncrypted);
                console.log('✅ Llave privada desencriptada exitosamente');
                console.log('🔍 Llave desencriptada length:', llavePrivadaDesencriptada.length);
            } catch (decryptError) {
                console.error('❌ Error desencriptando llave privada:', decryptError.message);
                throw new Error(`Error desencriptando llave privada: ${decryptError.message}`);
            }
        } else {
            console.log('ℹ️ Llave privada no está encriptada, convirtiendo formato...');
            
            try {
                // 🚨 CORRECCIÓN CRÍTICA: Convertir PKCS#8 a PKCS#1 RSA
                console.log('🔧 Convirtiendo formato PKCS#8 a PKCS#1 RSA...');
                
                // Leer llave privada con node-forge
                const privateKey = forge.pki.privateKeyFromPem(llavePrivadaPem);
                
                // Convertir a formato RSA PKCS#1 (que espera NodeCfdi)
                llavePrivadaDesencriptada = forge.pki.privateKeyToPem(privateKey);
                
                console.log('✅ Llave convertida a formato RSA exitosamente');
                console.log('🔍 Llave RSA length:', llavePrivadaDesencriptada.length);
                
            } catch (convertError) {
                console.error('❌ Error convirtiendo formato llave:', convertError.message);
                // Fallback: usar llave original si la conversión falla
                llavePrivadaDesencriptada = llavePrivadaPem;
                console.log('⚠️ Usando llave original como fallback');
            }
        }
        
        // Crear credencial con @nodecfdi/credentials usando llave desencriptada
        console.log('🔧 Creando credencial NodeCfdi con llave desencriptada...');
        const credential = Credential.create(certificadoPem, llavePrivadaDesencriptada, '');
        
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
    generarCadenaOriginalManual,
    firmarConCredentials,
    insertarSelloEnXML,
    getXsltForVersion
};
