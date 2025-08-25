const crypto = require('crypto');
const { DOMParser, XMLSerializer } = require('xmldom');

// FUNCIÓN MASIVA ELIMINADA (200+ líneas de lógica de sellado local innecesaria)
// El servicio externo maneja TODO: cadena original, firmado, manipulación XML

/**
 * NUEVA FUNCIÓN: Remueve COMPLETAMENTE el atributo Sello de un XML
 * CRÍTICO: NO poner Sello="", sino REMOVER el atributo completamente
 */
function removerAtributoSelloCompletamente(xmlString) {
    try {
        console.log('🔧 REMOVE SELLO: Removiendo atributo Sello completamente...');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró cfdi:Comprobante para remover Sello');
        }
        
        // CRÍTICO: REMOVER completamente (no poner vacío)
        if (comprobante.hasAttribute('Sello')) {
            const selloValor = comprobante.getAttribute('Sello');
            comprobante.removeAttribute('Sello');
            console.log('✅ REMOVE SELLO: Atributo Sello removido completamente');
            console.log('🔍 REMOVE SELLO: Valor removido tenía longitud:', selloValor.length);
        } else {
            console.log('🔍 REMOVE SELLO: No había atributo Sello que remover');
        }
        
        const serializer = new XMLSerializer();
        const xmlSinSello = serializer.serializeToString(xmlDoc);
        
        console.log('✅ REMOVE SELLO: XML regenerado sin atributo Sello');
        console.log('🔍 REMOVE SELLO: Longitud XML sin Sello:', xmlSinSello.length);
        
        // Verificar que efectivamente no tenga Sello
        if (xmlSinSello.includes('Sello=')) {
            console.error('❌ REMOVE SELLO: ¡ERROR! El XML todavía contiene atributo Sello');
            throw new Error('No se pudo remover completamente el atributo Sello');
        }
        
        return xmlSinSello;
        
    } catch (error) {
        console.error('❌ REMOVE SELLO ERROR:', error);
        throw error;
    }
}

// Funciones de cadena original eliminadas - el servicio externo maneja todo el proceso

// generarCadenaOriginal eliminada - servicio externo maneja todo

// construirCadenaOriginal40 eliminada - servicio externo maneja todo

// construirCadenaOriginal33 eliminada - servicio externo maneja todo

/**
 * Valida que el certificado y la llave privada sean el par correcto
 * Recomendación ChatGPT: Validar antes de firmar
 * @param {string} certificadoPem - Certificado en formato PEM
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {boolean} True si son el par correcto
 */
function validarParCertificadoLlave(certificadoPem, llavePrivadaPem) {
    try {
        console.log('🔐 VALIDACIÓN PAR: Verificando que certificado y llave correspondan...');
        
        // 1. Validar que el cert PEM parsea (recomendación ChatGPT)
        if (crypto.X509Certificate) {
            new crypto.X509Certificate(certificadoPem);
            console.log('✅ VALIDACIÓN PAR: Certificado PEM válido');
        }
        
        // 2. Confirmar que llave hace par con cert (recomendación ChatGPT)
        const prueba = Buffer.from('probe', 'utf8');
        const testSig = crypto.sign('RSA-SHA256', prueba, llavePrivadaPem);
        
        const pubKeyPem = new crypto.X509Certificate(certificadoPem).publicKey.export({ type: 'spki', format: 'pem' });
        const ok = crypto.verify('RSA-SHA256', prueba, pubKeyPem, testSig);
        
        if (!ok) {
            console.error('❌ VALIDACIÓN PAR: La llave privada NO corresponde al certificado (.cer)');
            return false;
        }
        
        console.log('✅ VALIDACIÓN PAR: Certificado y llave privada son el par correcto');
        return true;
        
    } catch (error) {
        console.error('❌ VALIDACIÓN PAR: Error validando par certificado/llave:', error);
        return false;
    }
}

// generarSelloDigitalCrypto eliminada - servicio externo maneja todo el firmado

// generarSelloDigital eliminada - servicio externo maneja todo el firmado

// validarSelloDigital eliminada - servicio externo maneja toda la validación

// agregarCertificadosAlXML eliminada - servicio externo maneja toda la manipulación XML

// agregarSoloSelloAlXML eliminada - servicio externo maneja toda la manipulación XML

// agregarSelloAlXML eliminada - servicio externo maneja toda la manipulación XML

// sellarCFDI eliminada - servicio externo maneja el proceso completo de sellado

module.exports = {
    // SOLO funciones que aún se usan (muy pocas tras eliminación masiva)
    validarParCertificadoLlave, // Aún se usa para validar certificados
    removerAtributoSelloCompletamente // Aún se usa para limpiar XML antes de enviar
    
    // TODAS LAS DEMÁS ELIMINADAS - servicio externo maneja:
    // - generarSelloDigitalCrypto: Eliminada
    // - sellarXMLUnificado: Eliminada  
    // - generarSelloDigital: Eliminada
    // - validarSelloDigital: Eliminada
    // - agregarCertificadosAlXML: Eliminada
    // - agregarSoloSelloAlXML: Eliminada
    // - agregarSelloAlXML: Eliminada
    // - sellarCFDI: Eliminada
};