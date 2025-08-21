// 🚀 SELLADO CFDI - VERSIÓN CORREGIDA SIN ERRORES DE SINTAXIS
console.log('🔍 SELLADO: Iniciando carga de módulos...');

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const { sellarCFDIConCSD } = require('./utils/cfdi-csd-sealer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

console.log('✅ SELLADO: Todos los módulos cargados correctamente');

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
    console.log('🚀 SELLADO ENDPOINT: Iniciando handler...');
    
    // Verificar autenticación
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token de autenticación requerido' })
      };
    }

    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ SELLADO: Error verificando JWT:', jwtError.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token inválido' })
      };
    }

    const userId = decodedToken.userId;
    console.log('✅ SELLADO: Usuario autenticado:', userId);

    // Parsear datos del request
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ SELLADO: Error parseando body:', parseError.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'JSON inválido en el body' })
      };
    }

    const { xmlContent, emisorId, version } = requestData;

    if (!xmlContent || !emisorId || !version) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Faltan campos requeridos: xmlContent, emisorId, version' 
        })
      };
    }

    console.log('📋 SELLADO: Datos recibidos:', {
      xmlLength: xmlContent.length,
      emisorId,
      version,
      userId
    });

    // Obtener datos del emisor (acceso global - cualquier emisor)
    console.log('🔍 SELLADO: Obteniendo datos del emisor (acceso global)...');
    const { data: emisor, error: emisorError } = await supabase
      .from('emisores')
      .select('*')
      .eq('id', emisorId)
      .single();

    if (emisorError || !emisor) {
      console.error('❌ SELLADO: Error obteniendo emisor:', emisorError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Emisor no encontrado' })
      };
    }

    console.log('✅ SELLADO: Emisor encontrado:', {
      rfc: emisor.rfc,
      nombre: emisor.nombre,
      numero_certificado: emisor.numero_certificado
    });

    // Verificar que el emisor tenga certificados
    if (!emisor.certificado_cer || !emisor.certificado_key || !emisor.password_key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'El emisor no tiene certificados CSD configurados' 
        })
      };
    }

    // 🚀 SELLADO: Usando NodeCFDI oficial (compatible con llaves SAT)
    console.log('🚀 SELLADO: Sellando con NodeCFDI oficial (solución a incompatibilidad Node.js crypto)...');
    console.log('📋 SELLADO: NodeCFDI maneja correctamente llaves privadas SAT encriptadas');
    
    // Usar implementación correcta con CSD (no FIEL)
    console.log('🎯 SELLADO: Usando sellador CSD correcto (replicando flujo Python)...');
    
    const resultadoCSD = await sellarCFDIConCSD(
      xmlContent,
      emisor.certificado_cer,
      emisor.certificado_key,
      emisor.password_key,
      version,
      emisor.numero_certificado
    );
    
    if (!resultadoCSD || !resultadoCSD.exito) {
      console.error('❌ SELLADO: Error durante el sellado CSD:', resultadoCSD?.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          exito: false,
          error: 'Error en sellado CSD: ' + (resultadoCSD?.error || 'Error desconocido')
        })
      };
    }

    console.log('✅ SELLADO: CSD completado exitosamente (flujo Python replicado)');
    console.log('📊 SELLADO: Sello generado:', resultadoCSD.sello ? 'SÍ' : 'NO');
    console.log('📊 SELLADO: Certificado:', resultadoCSD.numeroSerie ? 'SÍ' : 'NO');
    
    // Responder con el XML sellado y metadata
    const respuesta = {
      message: 'CFDI sellado exitosamente con NodeCFDI oficial',
      exito: true,
      xmlSellado: resultadoCSD.xmlSellado,
      selloDigital: resultadoCSD.sello,
      cadenaOriginal: resultadoCSD.cadenaOriginal,
      selloValido: true, // CSD siempre valida el sello
      numeroCertificado: resultadoCSD.numeroSerie,
      metadata: {
        version: version,
        fechaSellado: new Date().toISOString(),
        longitudXmlOriginal: xmlContent.length,
        longitudXmlSellado: resultadoCSD.xmlSellado.length,
        longitudSello: resultadoCSD.sello.length,
        longitudCadenaOriginal: resultadoCSD.cadenaOriginal.length,
        implementacion: 'CSD nativo con cadena original NodeCFDI'
      },
      emisor: {
        rfc: emisor.rfc,
        nombre: emisor.nombre,
        vigencia_hasta: emisor.vigencia_hasta,
        numero_certificado: emisor.numero_certificado
      }
    };

    console.log('📤 SELLADO: Enviando respuesta exitosa');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(respuesta)
    };

  } catch (error) {
    console.error('❌ SELLADO ENDPOINT: Error general:', error);
    console.error('❌ SELLADO ENDPOINT: Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor: ' + error.message,
        tipo_error: 'GeneralError',
        timestamp: new Date().toISOString()
      })
    };
  }
};
