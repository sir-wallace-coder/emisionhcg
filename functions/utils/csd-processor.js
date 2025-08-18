const crypto = require('crypto');
const forge = require('node-forge');

/**
 * Utilidades para procesamiento de certificados CSD (Certificado de Sello Digital)
 * Basado en las mejores prácticas para CFDI en México
 */

/**
 * Procesa un certificado .cer y extrae información relevante
 * @param {string} cerBase64 - Certificado .cer en base64
 * @returns {object} Información del certificado
 */
function procesarCertificado(cerBase64) {
    try {
        // Convertir de base64 a buffer
        const cerBuffer = Buffer.from(cerBase64, 'base64');
        
        // Parsear el certificado con node-forge
        const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(cerBuffer.toString('binary')));
        
        // Extraer información del certificado
        const subject = cert.subject.attributes;
        const issuer = cert.issuer.attributes;
        
        // Buscar RFC en el subject
        let rfc = '';
        let nombre = '';
        
        for (let attr of subject) {
            if (attr.shortName === 'serialNumber' || attr.name === 'serialNumber') {
                rfc = attr.value;
            }
            if (attr.shortName === 'CN' || attr.name === 'commonName') {
                nombre = attr.value;
            }
        }
        
        // Extraer número de certificado del serial number
        const numeroCertificado = cert.serialNumber;
        
        // Fechas de vigencia
        const vigenciaDesde = cert.validity.notBefore;
        const vigenciaHasta = cert.validity.notAfter;
        
        // Verificar si el certificado está vigente
        const ahora = new Date();
        const vigente = ahora >= vigenciaDesde && ahora <= vigenciaHasta;
        
        return {
            rfc: rfc,
            nombre: nombre,
            numeroCertificado: numeroCertificado,
            vigenciaDesde: vigenciaDesde,
            vigenciaHasta: vigenciaHasta,
            vigente: vigente,
            emisor: issuer.find(attr => attr.shortName === 'CN')?.value || 'SAT',
            certificadoPem: forge.pki.certificateToPem(cert)
        };
        
    } catch (error) {
        console.error('Error procesando certificado:', error);
        throw new Error('Error al procesar el certificado .cer: ' + error.message);
    }
}

/**
 * Valida una llave privada .key con su contraseña
 * @param {string} keyBase64 - Llave privada .key en base64
 * @param {string} password - Contraseña de la llave privada
 * @returns {object} Información de la llave privada
 */
function validarLlavePrivada(keyBase64, password) {
    try {
        // Convertir de base64 a buffer
        const keyBuffer = Buffer.from(keyBase64, 'base64');
        
        // Intentar parsear la llave privada con la contraseña
        const privateKey = forge.pki.decryptRsaPrivateKey(keyBuffer.toString('binary'), password);
        
        if (!privateKey) {
            throw new Error('Contraseña incorrecta o llave privada inválida');
        }
        
        // Convertir a PEM para almacenamiento
        const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
        
        return {
            valida: true,
            llavePrivadaPem: privateKeyPem,
            mensaje: 'Llave privada válida'
        };
        
    } catch (error) {
        console.error('Error validando llave privada:', error);
        return {
            valida: false,
            mensaje: 'Error al validar la llave privada: ' + error.message
        };
    }
}

/**
 * Valida que el certificado y la llave privada coincidan
 * @param {string} certificadoPem - Certificado en formato PEM
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {boolean} True si coinciden
 */
function validarParCertificadoLlave(certificadoPem, llavePrivadaPem) {
    try {
        const cert = forge.pki.certificateFromPem(certificadoPem);
        const privateKey = forge.pki.privateKeyFromPem(llavePrivadaPem);
        
        // Crear un mensaje de prueba
        const mensajePrueba = 'test-message-for-validation';
        const md = forge.md.sha256.create();
        md.update(mensajePrueba, 'utf8');
        
        // Firmar con la llave privada
        const signature = privateKey.sign(md);
        
        // Verificar con la llave pública del certificado
        const publicKey = cert.publicKey;
        const verified = publicKey.verify(md.digest().bytes(), signature);
        
        return verified;
        
    } catch (error) {
        console.error('Error validando par certificado-llave:', error);
        return false;
    }
}

/**
 * Valida formato de RFC mexicano
 * @param {string} rfc - RFC a validar
 * @returns {object} Resultado de la validación
 */
function validarRFC(rfc) {
    if (!rfc || typeof rfc !== 'string') {
        return { valido: false, mensaje: 'RFC no proporcionado' };
    }
    
    // Limpiar RFC (mayúsculas, sin espacios)
    const rfcLimpio = rfc.trim().toUpperCase();
    
    // Patrones para RFC
    const patronPersonaFisica = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const patronPersonaMoral = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;
    
    if (patronPersonaFisica.test(rfcLimpio) || patronPersonaMoral.test(rfcLimpio)) {
        return { 
            valido: true, 
            rfc: rfcLimpio,
            tipo: rfcLimpio.length === 13 ? 'FISICA' : 'MORAL'
        };
    }
    
    return { 
        valido: false, 
        mensaje: 'Formato de RFC inválido. Debe ser de 12 (moral) o 13 (física) caracteres' 
    };
}

/**
 * Valida código postal mexicano
 * @param {string} codigoPostal - Código postal a validar
 * @returns {object} Resultado de la validación
 */
function validarCodigoPostal(codigoPostal) {
    if (!codigoPostal || typeof codigoPostal !== 'string') {
        return { valido: false, mensaje: 'Código postal no proporcionado' };
    }
    
    const cpLimpio = codigoPostal.trim();
    const patron = /^[0-9]{5}$/;
    
    if (patron.test(cpLimpio)) {
        return { valido: true, codigoPostal: cpLimpio };
    }
    
    return { 
        valido: false, 
        mensaje: 'Código postal inválido. Debe ser de 5 dígitos' 
    };
}

module.exports = {
    procesarCertificado,
    validarLlavePrivada,
    validarParCertificadoLlave,
    validarRFC,
    validarCodigoPostal
};
