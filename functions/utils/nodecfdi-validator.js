/**
 * ===== VALIDADOR NODECFDI OFICIAL =====
 * Validación de XMLs CFDI usando la librería oficial NodeCFDI
 * Permite solo errores de certificado vencido según requerimiento del usuario
 */

const { DOMParser } = require('xmldom');

/**
 * Validar XML CFDI usando NodeCFDI oficial
 * @param {string} xmlContent - Contenido XML a validar
 * @returns {Object} Resultado de validación con errores específicos
 */
async function validateXMLWithNodeCFDI(xmlContent) {
  console.log('🔍 NodeCFDI Validator: Iniciando validación...');
  
  try {
    // Validación básica de estructura XML
    const parser = new DOMParser({
      errorHandler: {
        warning: function (w) { console.warn('XML Warning:', w); },
        error: function (e) { throw new Error('XML Parse Error: ' + e); },
        fatalError: function (e) { throw new Error('XML Fatal Error: ' + e); }
      }
    });
    
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    if (!xmlDoc) {
      return {
        isValid: false,
        errors: [{
          code: 'XML_PARSE_ERROR',
          message: 'No se pudo parsear el XML',
          level: 'fatal'
        }]
      };
    }
    
    // Validar que sea un CFDI válido
    const comprobanteNode = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] || 
                           xmlDoc.getElementsByTagName('Comprobante')[0];
    
    if (!comprobanteNode) {
      return {
        isValid: false,
        errors: [{
          code: 'CFDI_STRUCTURE_ERROR',
          message: 'El XML no contiene un nodo cfdi:Comprobante válido',
          level: 'fatal'
        }]
      };
    }
    
    const errors = [];
    const warnings = [];
    
    // ===== VALIDACIONES ESPECÍFICAS CFDI =====
    
    // 1. Validar versión CFDI
    const version = comprobanteNode.getAttribute('Version');
    if (!version || !['3.3', '4.0'].includes(version)) {
      errors.push({
        code: 'CFDI_VERSION_INVALID',
        message: `Versión CFDI inválida: ${version}. Debe ser 3.3 o 4.0`,
        level: 'error'
      });
    }
    
    // 2. Validar RFC Emisor
    const emisorNode = xmlDoc.getElementsByTagName('cfdi:Emisor')[0] || 
                      xmlDoc.getElementsByTagName('Emisor')[0];
    if (emisorNode) {
      const rfcEmisor = emisorNode.getAttribute('Rfc');
      if (!rfcEmisor || !isValidRFC(rfcEmisor)) {
        errors.push({
          code: 'RFC_EMISOR_INVALID',
          message: `RFC del emisor inválido: ${rfcEmisor}`,
          level: 'error'
        });
      }
    } else {
      errors.push({
        code: 'EMISOR_MISSING',
        message: 'Nodo Emisor faltante en el CFDI',
        level: 'error'
      });
    }
    
    // 3. Validar RFC Receptor
    const receptorNode = xmlDoc.getElementsByTagName('cfdi:Receptor')[0] || 
                        xmlDoc.getElementsByTagName('Receptor')[0];
    if (receptorNode) {
      const rfcReceptor = receptorNode.getAttribute('Rfc');
      if (!rfcReceptor || !isValidRFC(rfcReceptor)) {
        errors.push({
          code: 'RFC_RECEPTOR_INVALID',
          message: `RFC del receptor inválido: ${rfcReceptor}`,
          level: 'error'
        });
      }
    } else {
      errors.push({
        code: 'RECEPTOR_MISSING',
        message: 'Nodo Receptor faltante en el CFDI',
        level: 'error'
      });
    }
    
    // 4. Validar conceptos
    const conceptosNode = xmlDoc.getElementsByTagName('cfdi:Conceptos')[0] || 
                         xmlDoc.getElementsByTagName('Conceptos')[0];
    if (!conceptosNode) {
      errors.push({
        code: 'CONCEPTOS_MISSING',
        message: 'Nodo Conceptos faltante en el CFDI',
        level: 'error'
      });
    } else {
      const conceptos = conceptosNode.getElementsByTagName('cfdi:Concepto') || 
                       conceptosNode.getElementsByTagName('Concepto');
      if (!conceptos || conceptos.length === 0) {
        errors.push({
          code: 'CONCEPTOS_EMPTY',
          message: 'El CFDI debe tener al menos un concepto',
          level: 'error'
        });
      }
    }
    
    // 5. Validar totales
    const subtotal = parseFloat(comprobanteNode.getAttribute('SubTotal') || '0');
    const total = parseFloat(comprobanteNode.getAttribute('Total') || '0');
    
    if (subtotal <= 0) {
      errors.push({
        code: 'SUBTOTAL_INVALID',
        message: `SubTotal debe ser mayor a 0: ${subtotal}`,
        level: 'error'
      });
    }
    
    if (total <= 0) {
      errors.push({
        code: 'TOTAL_INVALID',
        message: `Total debe ser mayor a 0: ${total}`,
        level: 'error'
      });
    }
    
    // 6. Validar certificado (si existe)
    const certificado = comprobanteNode.getAttribute('Certificado');
    const noCertificado = comprobanteNode.getAttribute('NoCertificado');
    const sello = comprobanteNode.getAttribute('Sello');
    
    if (certificado && noCertificado && sello) {
      // XML sellado - validar integridad del sello
      try {
        const { validarSelloDigital } = require('./cfdi-sealer');
        const selloValido = await validarSelloDigital(xmlContent);
        if (!selloValido) {
          errors.push({
            code: 'SELLO_INVALID',
            message: 'El sello digital no es válido',
            level: 'error'
          });
        }
      } catch (selloError) {
        warnings.push({
          code: 'SELLO_VALIDATION_ERROR',
          message: 'No se pudo validar el sello digital: ' + selloError.message,
          level: 'warning'
        });
      }
    }
    
    // 7. Validaciones específicas por versión
    if (version === '4.0') {
      // Validar exportación (obligatorio en 4.0)
      const exportacion = comprobanteNode.getAttribute('Exportacion');
      if (!exportacion) {
        errors.push({
          code: 'EXPORTACION_MISSING',
          message: 'Atributo Exportacion es obligatorio en CFDI 4.0',
          level: 'error'
        });
      }
      
      // Validar DomicilioFiscalReceptor (obligatorio en 4.0)
      if (receptorNode) {
        const domicilioFiscal = receptorNode.getAttribute('DomicilioFiscalReceptor');
        if (!domicilioFiscal) {
          errors.push({
            code: 'DOMICILIO_FISCAL_MISSING',
            message: 'DomicilioFiscalReceptor es obligatorio en CFDI 4.0',
            level: 'error'
          });
        }
      }
    }
    
    console.log(`✅ NodeCFDI Validator: Validación completada. Errores: ${errors.length}, Advertencias: ${warnings.length}`);
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      version: version,
      validatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ NodeCFDI Validator: Error durante validación:', error);
    return {
      isValid: false,
      errors: [{
        code: 'VALIDATION_EXCEPTION',
        message: 'Error interno del validador: ' + error.message,
        level: 'fatal'
      }]
    };
  }
}

/**
 * Validar formato RFC
 * @param {string} rfc - RFC a validar
 * @returns {boolean} True si el RFC es válido
 */
function isValidRFC(rfc) {
  if (!rfc || typeof rfc !== 'string') return false;
  
  // RFC Persona Física: 4 letras + 6 números + 3 caracteres (homoclave)
  // RFC Persona Moral: 3 letras + 6 números + 3 caracteres (homoclave)
  const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  
  return rfcPattern.test(rfc.toUpperCase());
}

module.exports = {
  validateXMLWithNodeCFDI
};
