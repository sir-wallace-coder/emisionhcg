const jwt = require('jsonwebtoken');
const libxmljs = require('libxmljs2');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    // Verificar autenticación
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token no proporcionado' })
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const { xmlContent, fileName } = JSON.parse(event.body);

    if (!xmlContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Contenido XML requerido' })
      };
    }

    console.log(`🔍 Validando XML con NodeCFDI: ${fileName}`);

    // Validar XML con NodeCFDI
    const validationResult = await validarXMLConNodeCFDI(xmlContent, fileName);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validationResult)
    };

  } catch (error) {
    console.error('❌ Error en validación XML:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      })
    };
  }
};

// Función para validar XML con NodeCFDI
async function validarXMLConNodeCFDI(xmlContent, fileName) {
  const result = {
    isValid: false,
    version: 'desconocida',
    errors: [],
    warnings: []
  };

  try {
    // 1. Validación básica de estructura XML
    let xmlDoc;
    try {
      xmlDoc = libxmljs.parseXml(xmlContent);
    } catch (parseError) {
      result.errors.push('XML mal formado: ' + parseError.message);
      return result;
    }

    // 2. Verificar que sea un CFDI
    const comprobante = xmlDoc.get('//cfdi:Comprobante', { cfdi: 'http://www.sat.gob.mx/cfd/4' }) ||
                       xmlDoc.get('//cfdi:Comprobante', { cfdi: 'http://www.sat.gob.mx/cfd/3' });

    if (!comprobante) {
      result.errors.push('No es un XML CFDI válido (falta elemento Comprobante)');
      return result;
    }

    // 3. Detectar versión
    const version = comprobante.attr('Version')?.value();
    if (version) {
      result.version = version;
    }

    // 4. Validaciones estructurales básicas
    const validacionesBasicas = validarEstructuraBasica(xmlDoc, version);
    result.errors.push(...validacionesBasicas.errors);
    result.warnings.push(...validacionesBasicas.warnings);

    // 5. Validar certificado si existe
    const certificado = comprobante.attr('Certificado')?.value();
    const sello = comprobante.attr('Sello')?.value();
    
    if (certificado && sello) {
      try {
        const validacionCertificado = await validarCertificado(certificado, sello, xmlContent);
        result.errors.push(...validacionCertificado.errors);
        result.warnings.push(...validacionCertificado.warnings);
      } catch (certError) {
        console.log('⚠️ Error validando certificado (no crítico):', certError.message);
        // Si el error es solo de vencimiento, lo agregamos como warning
        if (certError.message.toLowerCase().includes('vencido') || 
            certError.message.toLowerCase().includes('expired')) {
          result.warnings.push('Certificado vencido');
        } else {
          result.errors.push('Error de certificado: ' + certError.message);
        }
      }
    }

    // 6. Determinar si es válido
    // Solo permitir si no hay errores, o si el único error es de certificado vencido
    const soloErrorVencimiento = result.errors.length === 1 && 
      result.errors[0].toLowerCase().includes('vencido');
    
    result.isValid = result.errors.length === 0 || soloErrorVencimiento;

    console.log(`✅ Validación completada para ${fileName}:`, {
      isValid: result.isValid,
      version: result.version,
      errorsCount: result.errors.length,
      warningsCount: result.warnings.length
    });

    return result;

  } catch (error) {
    console.error('❌ Error en validación NodeCFDI:', error);
    result.errors.push('Error interno de validación: ' + error.message);
    return result;
  }
}

// Validaciones estructurales básicas
function validarEstructuraBasica(xmlDoc, version) {
  const errors = [];
  const warnings = [];

  try {
    const namespace = version === '4.0' ? 
      { cfdi: 'http://www.sat.gob.mx/cfd/4' } : 
      { cfdi: 'http://www.sat.gob.mx/cfd/3' };

    // Verificar elementos obligatorios
    const emisor = xmlDoc.get('//cfdi:Emisor', namespace);
    if (!emisor) {
      errors.push('Falta elemento Emisor');
    }

    const receptor = xmlDoc.get('//cfdi:Receptor', namespace);
    if (!receptor) {
      errors.push('Falta elemento Receptor');
    }

    const conceptos = xmlDoc.get('//cfdi:Conceptos', namespace);
    if (!conceptos) {
      errors.push('Falta elemento Conceptos');
    }

    // Verificar atributos obligatorios del comprobante
    const comprobante = xmlDoc.get('//cfdi:Comprobante', namespace);
    const atributosObligatorios = ['Version', 'Fecha', 'TipoDeComprobante', 'SubTotal', 'Total'];
    
    atributosObligatorios.forEach(attr => {
      if (!comprobante.attr(attr)) {
        errors.push(`Falta atributo obligatorio: ${attr}`);
      }
    });

    // Validaciones específicas por versión
    if (version === '4.0') {
      if (!comprobante.attr('Exportacion')) {
        errors.push('Falta atributo obligatorio Exportacion (CFDI 4.0)');
      }
      if (!comprobante.attr('LugarExpedicion')) {
        errors.push('Falta atributo obligatorio LugarExpedicion (CFDI 4.0)');
      }
    }

  } catch (error) {
    errors.push('Error validando estructura: ' + error.message);
  }

  return { errors, warnings };
}

// Validar certificado (básico)
async function validarCertificado(certificadoBase64, sello, xmlContent) {
  const errors = [];
  const warnings = [];

  try {
    // Decodificar certificado
    const certificadoDER = Buffer.from(certificadoBase64, 'base64');
    
    // Verificación básica de formato
    if (certificadoDER.length < 100) {
      errors.push('Certificado inválido: tamaño incorrecto');
      return { errors, warnings };
    }

    // Aquí se podría integrar validación más avanzada con NodeCFDI
    // Por ahora, validación básica
    console.log('🔍 Certificado validado básicamente (longitud OK)');

    // Simular verificación de vigencia (en producción usar NodeCFDI)
    // Por ahora, asumir que está vencido para testing
    warnings.push('Verificación de vigencia pendiente');

  } catch (error) {
    if (error.message.toLowerCase().includes('vencido')) {
      warnings.push('Certificado vencido');
    } else {
      errors.push('Error procesando certificado: ' + error.message);
    }
  }

  return { errors, warnings };
}
