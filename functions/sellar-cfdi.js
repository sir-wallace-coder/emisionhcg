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

    console.log('🔍 SELLADO ENDPOINT: Iniciando proceso de sellado CFDI...');
    console.log('🔍 SELLADO ENDPOINT: Usuario:', userId, 'Emisor:', emisorId, 'Versión:', version);

    // Validar parámetros requeridos
    if (!xmlContent || !emisorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'XML content y emisorId son requeridos' })
      };
    }

    // Validación adicional del XML
    if (typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'XML content debe ser una cadena válida no vacía' })
      };
    }

    // Validar que el XML contenga elementos CFDI básicos
    if (!xmlContent.includes('cfdi:Comprobante')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'XML no parece ser un CFDI válido - no contiene cfdi:Comprobante' })
      };
    }

    console.log('✅ SELLADO ENDPOINT: XML content validado');
    console.log('🔍 SELLADO ENDPOINT: Longitud XML recibido:', xmlContent.length);

    // 1. Obtener información del emisor y sus certificados
    console.log('🔍 SELLADO ENDPOINT: Obteniendo información del emisor...');
    const { data: emisor, error: emisorError } = await supabase
      .from('emisores')
      .select('*')
      .eq('id', emisorId)
      .eq('usuario_id', userId)
      .single();

    if (emisorError || !emisor) {
      console.error('❌ SELLADO ENDPOINT: Error obteniendo emisor:', emisorError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Emisor no encontrado' })
      };
    }

    console.log('✅ SELLADO ENDPOINT: Emisor encontrado:', emisor.rfc);

    // 2. Verificar que el emisor tenga certificados CSD
    if (!emisor.certificado_cer || !emisor.certificado_key || !emisor.numero_certificado) {
      console.error('❌ SELLADO ENDPOINT: Emisor sin certificados completos');
      console.error('❌ SELLADO ENDPOINT: certificado_cer:', !!emisor.certificado_cer);
      console.error('❌ SELLADO ENDPOINT: certificado_key:', !!emisor.certificado_key);
      console.error('❌ SELLADO ENDPOINT: numero_certificado:', !!emisor.numero_certificado);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Por favor, sube los certificados primero.',
          detalles: {
            certificado_cer: !!emisor.certificado_cer,
            certificado_key: !!emisor.certificado_key,
            numero_certificado: !!emisor.numero_certificado
          }
        })
      };
    }

    console.log('✅ SELLADO ENDPOINT: Emisor válido con certificados CSD');
    console.log('🔍 SELLADO ENDPOINT: RFC:', emisor.rfc);
    console.log('🔍 SELLADO ENDPOINT: Certificado No:', emisor.numero_certificado);
    console.log('🔍 SELLADO ENDPOINT: Vigencia hasta:', emisor.vigencia_hasta);

    // 3. Validar vigencia del certificado (opcional pero recomendado)
    if (emisor.vigencia_hasta) {
      const vigenciaDate = new Date(emisor.vigencia_hasta);
      const ahora = new Date();
      
      if (vigenciaDate < ahora) {
        console.error('❌ SELLADO ENDPOINT: Certificado vencido');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'El certificado ha vencido',
            vigencia_hasta: emisor.vigencia_hasta
          })
        };
      }
      
      // Advertir si vence pronto (30 días)
      const treintaDias = new Date();
      treintaDias.setDate(treintaDias.getDate() + 30);
      
      if (vigenciaDate < treintaDias) {
        console.log('⚠️ SELLADO ENDPOINT: Certificado vence pronto:', emisor.vigencia_hasta);
      }
    }

    // 4. Procesar el sellado del CFDI
    try {
      console.log('🔐 SELLADO ENDPOINT: Iniciando proceso de sellado digital...');
      
      // Convertir certificado .cer de base64 a PEM si es necesario
      let certificadoPem = emisor.certificado_cer;
      if (!certificadoPem.includes('-----BEGIN CERTIFICATE-----')) {
        // Si está en base64, convertir a PEM
        console.log('🔧 SELLADO ENDPOINT: Convirtiendo certificado de base64 a PEM...');
        const certBase64Clean = emisor.certificado_cer.replace(/\n/g, '');
        certificadoPem = `-----BEGIN CERTIFICATE-----\n${certBase64Clean.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
        console.log('✅ SELLADO ENDPOINT: Certificado convertido a PEM');
      } else {
        console.log('✅ SELLADO ENDPOINT: Certificado ya está en formato PEM');
      }

      // Validar que la llave privada esté en formato PEM
      const llavePrivadaPem = emisor.certificado_key;
      if (!llavePrivadaPem.includes('-----BEGIN') || !llavePrivadaPem.includes('-----END')) {
        console.error('❌ SELLADO ENDPOINT: Llave privada no está en formato PEM');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'La llave privada no está en formato PEM válido' 
          })
        };
      }

      console.log('✅ SELLADO ENDPOINT: Llave privada en formato PEM válido');

      const numeroCertificado = emisor.numero_certificado;

      console.log('🔐 SELLADO ENDPOINT: Parámetros de sellado preparados');
      console.log('🔐 SELLADO ENDPOINT: - Version CFDI:', version);
      console.log('🔐 SELLADO ENDPOINT: - Numero certificado:', numeroCertificado);
      console.log('🔐 SELLADO ENDPOINT: - Longitud llave PEM:', llavePrivadaPem.length);
      console.log('🔐 SELLADO ENDPOINT: - Longitud cert PEM:', certificadoPem.length);

      // Realizar el sellado con el módulo corregido
      console.log('🚀 SELLADO ENDPOINT: Llamando a sellarCFDI...');
      const resultadoSellado = sellarCFDI(
        xmlContent,
        llavePrivadaPem,
        certificadoPem,
        numeroCertificado,
        version
      );

      console.log('📋 SELLADO ENDPOINT: Resultado del sellado recibido');
      console.log('📋 SELLADO ENDPOINT: Éxito:', resultadoSellado.exito);

      if (!resultadoSellado.exito) {
        console.error('❌ SELLADO ENDPOINT: Error en el proceso de sellado:', resultadoSellado.error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error en el proceso de sellado: ' + resultadoSellado.error,
            version: version,
            emisor_rfc: emisor.rfc
          })
        };
      }

      console.log('✅ SELLADO ENDPOINT: Sellado completado exitosamente');
      console.log('✅ SELLADO ENDPOINT: Sello válido:', resultadoSellado.selloValido);
      console.log('🔍 SELLADO ENDPOINT: Longitud XML sellado:', resultadoSellado.xmlSellado.length);
      console.log('🔍 SELLADO ENDPOINT: Longitud sello digital:', resultadoSellado.selloDigital.length);
      console.log('🔍 SELLADO ENDPOINT: Longitud cadena original:', resultadoSellado.cadenaOriginal.length);

      // 5. Responder con el XML sellado y metadata adicional
      const respuesta = {
        message: 'CFDI sellado exitosamente',
        exito: true,
        xmlSellado: resultadoSellado.xmlSellado,
        selloDigital: resultadoSellado.selloDigital,
        cadenaOriginal: resultadoSellado.cadenaOriginal,
        selloValido: resultadoSellado.selloValido,
        numeroCertificado: resultadoSellado.noCertificado,
        metadata: {
          version: version,
          fechaSellado: new Date().toISOString(),
          longitudXmlOriginal: xmlContent.length,
          longitudXmlSellado: resultadoSellado.xmlSellado.length,
          longitudSello: resultadoSellado.selloDigital.length,
          longitudCadenaOriginal: resultadoSellado.cadenaOriginal.length
        },
        emisor: {
          rfc: emisor.rfc,
          nombre: emisor.nombre,
          vigencia_hasta: emisor.vigencia_hasta,
          numero_certificado: emisor.numero_certificado
        }
      };

      console.log('📤 SELLADO ENDPOINT: Enviando respuesta exitosa');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(respuesta)
      };

    } catch (selladoError) {
      console.error('❌ SELLADO ENDPOINT: Error durante el sellado:', selladoError);
      console.error('❌ SELLADO ENDPOINT: Stack trace:', selladoError.stack);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error durante el proceso de sellado: ' + selladoError.message,
          tipo_error: 'SellFail',
          version: version,
          emisor_rfc: emisor?.rfc || 'unknown'
        })
      };
    }

  } catch (error) {
    console.error('❌ SELLADO ENDPOINT: Error general:', error);
    console.error('❌ SELLADO ENDPOINT: Stack trace:', error.stack);
    
    // Determinar tipo de error para mejor debugging
    let tipoError = 'GeneralError';
    if (error.name === 'JsonWebTokenError') {
      tipoError = 'AuthError';
    } else if (error.message.includes('supabase')) {
      tipoError = 'DatabaseError';
    } else if (error.message.includes('JSON')) {
      tipoError = 'ParseError';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor: ' + error.message,
        tipo_error: tipoError,
        timestamp: new Date().toISOString()
      })
    };
  }
};