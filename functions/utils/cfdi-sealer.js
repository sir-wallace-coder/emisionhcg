const crypto = require('crypto');
const forge = require('node-forge');
const { DOMParser, XMLSerializer } = require('xmldom');

/**
 * Utilidades para sellado digital de CFDIs
 * Implementa el proceso completo de sellado según especificaciones SAT
 */

/**
 * Genera la cadena original de un XML CFDI
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} version - Versión del CFDI (3.3 o 4.0)
 * @returns {string} Cadena original para sellado
 */
function generarCadenaOriginal(xmlContent, version = '4.0') {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el nodo raíz del comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante en el XML');
        }
        
        // Construir cadena original según la versión
        let cadenaOriginal = '';
        
        if (version === '4.0') {
            cadenaOriginal = construirCadenaOriginal40(comprobante);
        } else if (version === '3.3') {
            cadenaOriginal = construirCadenaOriginal33(comprobante);
        } else {
            throw new Error('Versión de CFDI no soportada: ' + version);
        }
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('Error generando cadena original:', error);
        throw new Error('Error al generar cadena original: ' + error.message);
    }
}

/**
 * Construye la cadena original para CFDI 4.0
 * @param {Element} comprobante - Elemento XML del comprobante
 * @returns {string} Cadena original
 */
function construirCadenaOriginal40(comprobante) {
    let cadena = '||';
    
    // Atributos del comprobante según XSLT oficial SAT
    // CRÍTICO: Distinguir entre Requeridos y Opcionales según especificación SAT
    
    // ATRIBUTOS REQUERIDOS (siempre agregan |valor aunque esté vacío)
    const requeridos = [
        'Version', 'Fecha', 'NoCertificado', 'SubTotal', 'Moneda', 'Total', 
        'TipoDeComprobante', 'Exportacion', 'LugarExpedicion'
    ];
    
    // ATRIBUTOS OPCIONALES (solo agregan |valor si tienen valor)
    const opcionales = [
        'Serie', 'Folio', 'FormaPago', 'CondicionesDePago', 'Descuento', 
        'TipoCambio', 'MetodoPago', 'Confirmacion'
    ];
    
    // Procesar en orden exacto según XSLT SAT
    const ordenSAT = [
        'Version', 'Serie', 'Folio', 'Fecha', 'FormaPago', 'NoCertificado',
        'CondicionesDePago', 'SubTotal', 'Descuento', 'Moneda',
        'TipoCambio', 'Total', 'TipoDeComprobante', 'Exportacion', 'MetodoPago',
        'LugarExpedicion', 'Confirmacion'
    ];
    
    // Agregar atributos del comprobante según lógica SAT
    for (let attr of ordenSAT) {
        const valor = comprobante.getAttribute(attr) || '';
        
        if (requeridos.includes(attr)) {
            // REQUERIDO: Siempre agregar |valor
            cadena += valor + '|';
        } else if (opcionales.includes(attr) && valor) {
            // OPCIONAL: Solo agregar |valor si tiene valor
            cadena += valor + '|';
        }
        // Si es opcional y no tiene valor, no se agrega nada
    }
    
    // Procesar emisor
    const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
    if (emisor) {
        cadena += emisor.getAttribute('Rfc') + '|';
        cadena += emisor.getAttribute('Nombre') + '|';
        cadena += emisor.getAttribute('RegimenFiscal') + '|';
    }
    
    // Procesar receptor
    const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
    if (receptor) {
        cadena += receptor.getAttribute('Rfc') + '|';
        cadena += receptor.getAttribute('Nombre') + '|';
        cadena += receptor.getAttribute('DomicilioFiscalReceptor') + '|';
        cadena += receptor.getAttribute('RegimenFiscalReceptor') + '|';
        cadena += receptor.getAttribute('UsoCFDI') + '|';
    }
    
    // Procesar conceptos
    const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
    for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        cadena += concepto.getAttribute('ClaveProdServ') + '|';
        cadena += concepto.getAttribute('NoIdentificacion') + '|';
        cadena += concepto.getAttribute('Cantidad') + '|';
        cadena += concepto.getAttribute('ClaveUnidad') + '|';
        cadena += concepto.getAttribute('Unidad') + '|';
        cadena += concepto.getAttribute('Descripcion') + '|';
        cadena += concepto.getAttribute('ValorUnitario') + '|';
        cadena += concepto.getAttribute('Importe') + '|';
        cadena += concepto.getAttribute('Descuento') + '|';
        cadena += concepto.getAttribute('ObjetoImp') + '|';
        
        // Procesar impuestos del concepto
        const impuestos = concepto.getElementsByTagName('cfdi:Impuestos')[0];
        if (impuestos) {
            // Traslados
            const traslados = impuestos.getElementsByTagName('cfdi:Traslado');
            for (let j = 0; j < traslados.length; j++) {
                const traslado = traslados[j];
                cadena += traslado.getAttribute('Base') + '|';
                cadena += traslado.getAttribute('Impuesto') + '|';
                cadena += traslado.getAttribute('TipoFactor') + '|';
                cadena += traslado.getAttribute('TasaOCuota') + '|';
                cadena += traslado.getAttribute('Importe') + '|';
            }
        }
    }
    
    cadena += '|';
    return cadena;
}

/**
 * Construye la cadena original para CFDI 3.3
 * @param {Element} comprobante - Elemento XML del comprobante
 * @returns {string} Cadena original
 */
function construirCadenaOriginal33(comprobante) {
    let cadena = '||';
    
    // Atributos del comprobante para versión 3.3 según estándar SAT
    // CRÍTICO: Distinguir entre Requeridos y Opcionales según especificación SAT
    
    // ATRIBUTOS REQUERIDOS (siempre agregan |valor aunque esté vacío)
    const requeridos = [
        'Version', 'Fecha', 'NoCertificado', 'SubTotal', 'Moneda', 'Total', 
        'TipoDeComprobante', 'LugarExpedicion'
    ];
    
    // ATRIBUTOS OPCIONALES (solo agregan |valor si tienen valor)
    const opcionales = [
        'Serie', 'Folio', 'FormaPago', 'CondicionesDePago', 'Descuento', 
        'TipoCambio', 'MetodoPago'
    ];
    
    // Procesar en orden exacto según estándar SAT 3.3
    const ordenSAT = [
        'Version', 'Serie', 'Folio', 'Fecha', 'FormaPago', 'NoCertificado',
        'CondicionesDePago', 'SubTotal', 'Descuento', 'Moneda',
        'TipoCambio', 'Total', 'TipoDeComprobante', 'MetodoPago', 'LugarExpedicion'
    ];
    
    // Agregar atributos del comprobante según lógica SAT
    for (let attr of ordenSAT) {
        const valor = comprobante.getAttribute(attr) || '';
        
        if (requeridos.includes(attr)) {
            // REQUERIDO: Siempre agregar |valor
            cadena += valor + '|';
        } else if (opcionales.includes(attr) && valor) {
            // OPCIONAL: Solo agregar |valor si tiene valor
            cadena += valor + '|';
        }
        // Si es opcional y no tiene valor, no se agrega nada
    }
    
    // Procesar emisor (similar a 4.0)
    const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
    if (emisor) {
        cadena += emisor.getAttribute('Rfc') + '|';
        cadena += emisor.getAttribute('Nombre') + '|';
        cadena += emisor.getAttribute('RegimenFiscal') + '|';
    }
    
    // Procesar receptor
    const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
    if (receptor) {
        cadena += receptor.getAttribute('Rfc') + '|';
        cadena += receptor.getAttribute('Nombre') + '|';
        cadena += receptor.getAttribute('UsoCFDI') + '|';
    }
    
    // Procesar conceptos (sin ObjetoImp que es específico de 4.0)
    const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
    for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        cadena += concepto.getAttribute('ClaveProdServ') + '|';
        cadena += concepto.getAttribute('NoIdentificacion') + '|';
        cadena += concepto.getAttribute('Cantidad') + '|';
        cadena += concepto.getAttribute('ClaveUnidad') + '|';
        cadena += concepto.getAttribute('Unidad') + '|';
        cadena += concepto.getAttribute('Descripcion') + '|';
        cadena += concepto.getAttribute('ValorUnitario') + '|';
        cadena += concepto.getAttribute('Importe') + '|';
        cadena += concepto.getAttribute('Descuento') + '|';
    }
    
    cadena += '|';
    return cadena;
}

/**
 * Genera el sello digital de un CFDI
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {string} Sello digital en base64
 */
function generarSelloDigital(cadenaOriginal, llavePrivadaPem) {
    try {
        // Parsear la llave privada
        const privateKey = forge.pki.privateKeyFromPem(llavePrivadaPem);
        
        // Crear hash SHA-256 de la cadena original
        const md = forge.md.sha256.create();
        md.update(cadenaOriginal, 'utf8');
        
        // Firmar con la llave privada
        const signature = privateKey.sign(md);
        
        // Convertir a base64
        const selloBase64 = forge.util.encode64(signature);
        
        return selloBase64;
        
    } catch (error) {
        console.error('Error generando sello digital:', error);
        throw new Error('Error al generar sello digital: ' + error.message);
    }
}

/**
 * Valida un sello digital
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} selloBase64 - Sello digital en base64
 * @param {string} certificadoPem - Certificado en formato PEM
 * @returns {boolean} True si el sello es válido
 */
function validarSelloDigital(cadenaOriginal, selloBase64, certificadoPem) {
    try {
        // Parsear el certificado para obtener la llave pública
        const cert = forge.pki.certificateFromPem(certificadoPem);
        const publicKey = cert.publicKey;
        
        // Decodificar el sello de base64
        const signature = forge.util.decode64(selloBase64);
        
        // Crear hash SHA-256 de la cadena original
        const md = forge.md.sha256.create();
        md.update(cadenaOriginal, 'utf8');
        
        // Verificar la firma con la llave pública
        const verified = publicKey.verify(md.digest().bytes(), signature);
        
        return verified;
        
    } catch (error) {
        console.error('Error validando sello digital:', error);
        return false;
    }
}

/**
 * Agrega SOLO los certificados (NoCertificado y Certificado) al XML CFDI
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} XML con certificados agregados
 */
function agregarCertificadosAlXML(xmlContent, noCertificado, certificadoBase64) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar SOLO certificados (NoCertificado y Certificado)
        comprobante.setAttribute('NoCertificado', noCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlConCertificados = serializer.serializeToString(xmlDoc);
        
        return xmlConCertificados;
        
    } catch (error) {
        console.error('Error agregando certificados al XML:', error);
        throw new Error('Error al agregar certificados al XML: ' + error.message);
    }
}

/**
 * Agrega SOLO el sello digital a un XML CFDI que ya tiene certificados
 * @param {string} xmlContent - Contenido del XML CFDI con certificados
 * @param {string} selloDigital - Sello digital en base64
 * @returns {string} XML con sello agregado
 */
function agregarSoloSelloAlXML(xmlContent, selloDigital) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar SOLO el sello
        comprobante.setAttribute('Sello', selloDigital);
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlSellado = serializer.serializeToString(xmlDoc);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('Error agregando sello al XML:', error);
        throw new Error('Error al agregar sello al XML: ' + error.message);
    }
}

/**
 * Agrega el sello digital a un XML CFDI (FUNCIÓN LEGACY - MANTENER COMPATIBILIDAD)
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} selloDigital - Sello digital en base64
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} XML con sello agregado
 */
function agregarSelloAlXML(xmlContent, selloDigital, noCertificado, certificadoBase64) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar atributos del sello EN ORDEN CORRECTO SAT
        // CRÍTICO: NoCertificado PRIMERO, luego Certificado, SELLO AL FINAL
        comprobante.setAttribute('NoCertificado', noCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        comprobante.setAttribute('Sello', selloDigital); // SELLO SIEMPRE AL FINAL
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlSellado = serializer.serializeToString(xmlDoc);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('Error agregando sello al XML:', error);
        throw new Error('Error al agregar sello al XML: ' + error.message);
    }
}

/**
 * Proceso completo de sellado de un CFDI
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @param {string} certificadoPem - Certificado en formato PEM
 * @param {string} noCertificado - Número de certificado
 * @param {string} version - Versión del CFDI
 * @returns {object} Resultado del sellado
 */
function sellarCFDI(xmlContent, llavePrivadaPem, certificadoPem, noCertificado, version = '4.0') {
    try {
        // 1. Convertir certificado a base64 (sin headers PEM)
        const certificadoBase64 = certificadoPem
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\n/g, '');
        
        // 2. CRÍTICO: Agregar NoCertificado y Certificado al XML ANTES de generar cadena original
        const xmlConCertificados = agregarCertificadosAlXML(xmlContent, noCertificado, certificadoBase64);
        
        // 3. Generar cadena original del XML con certificados (sin Sello)
        const cadenaOriginal = generarCadenaOriginal(xmlConCertificados, version);
        
        // 4. Generar sello digital basado en cadena original correcta
        const selloDigital = generarSelloDigital(cadenaOriginal, llavePrivadaPem);
        
        // 5. Agregar SOLO el sello al XML con certificados
        const xmlSellado = agregarSoloSelloAlXML(xmlConCertificados, selloDigital);
        
        // 6. Validar el sello generado
        const selloValido = validarSelloDigital(cadenaOriginal, selloDigital, certificadoPem);
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            cadenaOriginal: cadenaOriginal,
            selloDigital: selloDigital,
            selloValido: selloValido,
            noCertificado: noCertificado
        };
        
    } catch (error) {
        console.error('Error en proceso de sellado:', error);
        return {
            exito: false,
            error: error.message
        };
    }
}

module.exports = {
    generarCadenaOriginal,
    generarSelloDigital,
    validarSelloDigital,
    agregarCertificadosAlXML,
    agregarSoloSelloAlXML,
    agregarSelloAlXML,
    sellarCFDI
};
