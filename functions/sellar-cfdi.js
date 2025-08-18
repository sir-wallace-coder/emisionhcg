const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const { sellarCFDI } = require('./utils/cfdi-sealer');

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
    const userId = decoded.userId;

    const { xmlContent, emisorId, version = '4.0' } = JSON.parse(event.body || '{}');

    console.log('🔐 SELLADO: Iniciando proceso de sellado CFDI...');
    console.log('🔐 SELLADO: Usuario:', userId, 'Emisor:', emisorId, 'Versión:', version);

    // Validar parámetros requeridos
    if (!xmlContent || !emisorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'XML content y emisorId son requeridos' })
      };
    }

    // 1. Obtener información del emisor y sus certificados
    console.log('🔐 SELLADO: Obteniendo información del emisor...');
    const { data: emisor, error: emisorError } = await supabase
      .from('emisores')
      .select('*')
      .eq('id', emisorId)
      .eq('usuario_id', userId)
      .single();

    if (emisorError || !emisor) {
      console.error('🔐 SELLADO: Error obteniendo emisor:', emisorError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Emisor no encontrado' })
      };
    }

    // 2. Verificar que el emisor tenga certificados CSD
    if (!emisor.certificado_cer || !emisor.certificado_key || !emisor.numero_certificado) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Por favor, sube los certificados primero.' 
        })
      };
    }

    console.log('🔐 SELLADO: Emisor válido con certificados CSD');
    console.log('🔐 SELLADO: RFC:', emisor.rfc, 'Certificado:', emisor.numero_certificado);

    // 4. Procesar el sellado del CFDI
    try {
      console.log('🔐 SELLADO: Iniciando proceso de sellado digital...');
      
      // Convertir certificado .cer de base64 a PEM si es necesario
      let certificadoPem = emisor.certificado_cer;
      if (!certificadoPem.includes('-----BEGIN CERTIFICATE-----')) {
        // Si está en base64, convertir a PEM
        const certBase64Clean = emisor.certificado_cer.replace(/\n/g, '');
        certificadoPem = `-----BEGIN CERTIFICATE-----\n${certBase64Clean.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
      }

      // La llave privada ya debería estar en formato PEM desde el procesamiento
      const llavePrivadaPem = emisor.certificado_key;
      const numeroCertificado = emisor.numero_certificado;

      // Realizar el sellado
      const resultadoSellado = sellarCFDI(
        xmlContent,
        llavePrivadaPem,
        certificadoPem,
        numeroCertificado,
        version
      );

      if (!resultadoSellado.exito) {
        console.error('🔐 SELLADO: Error en el proceso de sellado:', resultadoSellado.error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error en el proceso de sellado: ' + resultadoSellado.error 
          })
        };
      }

      console.log('🔐 SELLADO: Sellado completado exitosamente');
      console.log('🔐 SELLADO: Sello válido:', resultadoSellado.selloValido);

      // 5. Responder con el XML sellado
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'CFDI sellado exitosamente',
          xmlSellado: resultadoSellado.xmlSellado,
          selloDigital: resultadoSellado.selloDigital,
          cadenaOriginal: resultadoSellado.cadenaOriginal,
          selloValido: resultadoSellado.selloValido,
          numeroCertificado: resultadoSellado.noCertificado,
          emisor: {
            rfc: emisor.rfc,
            nombre: emisor.nombre,
            vigencia_hasta: emisor.vigencia_hasta
          }
        })
      };

    } catch (selladoError) {
      console.error('🔐 SELLADO: Error durante el sellado:', selladoError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error durante el proceso de sellado: ' + selladoError.message 
        })
      };
    }

  } catch (error) {
    console.error('🔐 SELLADO: Error general:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor: ' + error.message 
      })
    };
  }
};
