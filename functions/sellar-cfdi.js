// 🚨 LOGGING CRÍTICO PARA DEBUGGING 502
console.log('🔍 SELLADO: Iniciando carga de módulos...');

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const { sellarCFDI } = require('./utils/cfdi-sealer');
const { sellarCFDIConNodeCfdi } = require('./utils/nodecfdi-sealer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

console.log('✅ SELLADO: Todos los módulos cargados correctamente');
console.log('🔑 SELLADO: Variables de entorno verificadas');

exports.handler = async (event, context) => {
  // 🚨 WRAPPER DE SEGURIDAD PARA CAPTURAR ERRORES 502
  try {
    console.log('🚀 SELLADO ENDPOINT: Handler iniciado exitosamente');
    
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

  // 🚨 MANEJO DE ERRORES ROBUSTO PARA DEBUGGING 502
  try {
    console.log('🚀 SELLADO ENDPOINT: Iniciando handler...');
    console.log('📋 SELLADO ENDPOINT: HTTP Method:', event.httpMethod);
    console.log('📋 SELLADO ENDPOINT: Headers recibidos:', JSON.stringify(event.headers, null, 2));
    console.log('📋 SELLADO ENDPOINT: Body length:', event.body ? event.body.length : 0);
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
    console.log('🔍 SELLADO ENDPOINT: Verificando certificados del emisor...');
    console.log('🔍 SELLADO ENDPOINT: certificado_cer existe:', !!emisor.certificado_cer);
    console.log('🔍 SELLADO ENDPOINT: certificado_key existe:', !!emisor.certificado_key);
    console.log('🔍 SELLADO ENDPOINT: numero_certificado existe:', !!emisor.numero_certificado);
    console.log('🔍 SELLADO ENDPOINT: certificado_cer longitud:', emisor.certificado_cer?.length || 0);
    console.log('🔍 SELLADO ENDPOINT: certificado_key longitud:', emisor.certificado_key?.length || 0);
    
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

    // 3. VALIDACIÓN DE VIGENCIA DESHABILITADA (permite certificados vencidos)
    if (emisor.vigencia_hasta) {
      const vigenciaDate = new Date(emisor.vigencia_hasta);
      const ahora = new Date();
      
      // SOLO LOG INFORMATIVO - NO BLOQUEAR
      if (vigenciaDate < ahora) {
        console.log('ℹ️ SELLADO ENDPOINT: Certificado vencido (permitido):', emisor.vigencia_hasta);
      } else {
        console.log('✅ SELLADO ENDPOINT: Certificado vigente hasta:', emisor.vigencia_hasta);
      }
    } else {
      console.log('ℹ️ SELLADO ENDPOINT: Sin información de vigencia del certificado');
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

      // 🎯 SELLADO ÚNICAMENTE CON NODECFDI (OFICIAL SAT)
      console.log('🎯 SELLADO: Sellando ÚNICAMENTE con NodeCfdi oficial...');
      console.log('📋 SELLADO: Sin fallback - debe funcionar con librería oficial');
      
      const resultadoNodeCfdi = await sellarCFDIConNodeCfdi(
        xmlContent,
        emisor.certificado_cer,
        emisor.certificado_key,
        emisor.password_certificado,
        version
      );
      
      if (!resultadoNodeCfdi || !resultadoNodeCfdi.xmlSellado) {
        throw new Error('Error en sellado NodeCfdi: No se pudo generar el XML sellado con la librería oficial');
      }

      console.log('✅ SELLADO: NodeCfdi completado exitosamente');
      console.log('📊 SELLADO: Sello generado:', resultadoNodeCfdi.selloDigital ? 'SÍ' : 'NO');
      console.log('📊 SELLADO: Certificado:', resultadoNodeCfdi.numeroCertificado ? 'SÍ' : 'NO');
      
      // 5. Responder con el XML sellado y metadata adicional
      const respuesta = {
        message: 'CFDI sellado exitosamente',
        exito: true,
        xmlSellado: resultadoNodeCfdi.xmlSellado,
        selloDigital: resultadoNodeCfdi.selloDigital,
        cadenaOriginal: resultadoNodeCfdi.cadenaOriginal,
        selloValido: resultadoNodeCfdi.selloValido,
        numeroCertificado: resultadoNodeCfdi.numeroCertificado,
        metadata: {
          version: version,
          fechaSellado: new Date().toISOString(),
          longitudXmlOriginal: xmlContent.length,
          longitudXmlSellado: resultadoNodeCfdi.xmlSellado.length,
          longitudSello: resultadoNodeCfdi.selloDigital.length,
          longitudCadenaOriginal: resultadoNodeCfdi.cadenaOriginal.length
        },
        emisor: {
          rfc: emisor.rfc,
          nombre: emisor.nombre,
          vigencia_hasta: emisor.vigencia_hasta,
          numero_certificado: emisor.numero_certificado
        }
      };

      console.log(' SELLADO ENDPOINT: Enviando respuesta exitosa');
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
    console.error('❌ SELLADO ENDPOINT: Error name:', error.name);
    console.error('❌ SELLADO ENDPOINT: Error message:', error.message);
    
    // Determinar tipo de error para mejor debugging
    let tipoError = 'GeneralError';
    let detalleError = error.message || 'Error desconocido';
    
    if (error.name === 'JsonWebTokenError') {
      tipoError = 'AuthError';
    } else if (error.message && error.message.includes('supabase')) {
      tipoError = 'DatabaseError';
    } else if (error.message && error.message.includes('JSON')) {
      tipoError = 'ParseError';
    } else if (error.message && error.message.includes('require')) {
      tipoError = 'ModuleError';
    } else if (error.message && error.message.includes('nodecfdi')) {
      tipoError = 'NodeCfdiError';
    }

    // 🚨 MANEJO ESPECIAL PARA ERRORES 502
    console.error('🚨 SELLADO ENDPOINT: DEBUGGING ERROR 502:');
    console.error('  - Error type:', typeof error);
    console.error('  - Error constructor:', error.constructor.name);
    console.error('  - Error keys:', Object.keys(error));
    console.error('  - Error string:', String(error));

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor: ' + detalleError,
        tipo_error: tipoError,
        timestamp: new Date().toISOString(),
        debug_info: {
          error_name: error.name,
          error_constructor: error.constructor.name,
          stack_preview: error.stack ? error.stack.substring(0, 500) : 'No stack available'
        }
      })
    };
  }
  
  // 🚨 CATCH DEL WRAPPER DE SEGURIDAD PARA ERRORES 502
  } catch (wrapperError) {
    console.error('🚨 SELLADO ENDPOINT: ERROR CRÍTICO EN WRAPPER:', wrapperError);
    console.error('🚨 SELLADO ENDPOINT: Stack wrapper:', wrapperError.stack);
    
    // Respuesta de emergencia para errores 502
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Error crítico en función: ' + (wrapperError.message || 'Error desconocido'),
        tipo_error: 'WrapperError',
        timestamp: new Date().toISOString(),
        debug_wrapper: {
          error_name: wrapperError.name,
          error_message: wrapperError.message,
          stack_preview: wrapperError.stack ? wrapperError.stack.substring(0, 300) : 'No stack'
        }
      })
    };
  }
};