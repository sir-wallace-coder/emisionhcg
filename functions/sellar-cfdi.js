// 🚀 SELLADO CFDI - VERSIÓN CORREGIDA SIN ERRORES DE SINTAXIS
console.log('🔍 SELLADO: Iniciando carga de módulos...');

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
// const { sellarCFDIConNodeCfdi } = require('./utils/nodecfdi-sealer'); // ⚠️ DESACTIVADO TEMPORALMENTE
const { sellarConServicioExterno } = require('./utils/external-sealer-client');
const FormData = require('form-data');
// node-fetch es ES module, se carga dinámicamente
let fetch;

/**
 * Carga dinámicamente node-fetch (ES module)
 * @returns {Promise<Function>} fetch function
 */
async function loadFetch() {
    if (!fetch) {
        const { default: nodeFetch } = await import('node-fetch');
        fetch = nodeFetch;
    }
    return fetch;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SELLADO_EXTERNO_URL = 'https://consulta.click/api/v1/sellado';
const SELLADO_EXTERNO_TOKEN = process.env.SELLADO_EXTERNO_TOKEN; // Token obtenido del login

console.log('✅ SELLADO: Todos los módulos cargados correctamente');

// ✅ FUNCIÓN sellarCFDIExterno ELIMINADA - Ahora se usa external-sealer-client.js con autenticación automática

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

    // 🚀 SELLADO: USANDO SOLO ENDPOINT EXTERNO CON AUTENTICACIÓN AUTOMÁTICA
    console.log('🌐 SELLADO: Usando EXCLUSIVAMENTE servicio externo consulta.click...');
    console.log('🔗 SELLADO: Endpoint con autenticación automática');
    console.log('⚠️ SELLADO: NodeCFDI desactivado temporalmente por solicitud del usuario');
    
    let resultado;
    
    try {
      console.log('🔐 SELLADO EXTERNO: Iniciando sellado con autenticación automática...');
      
      // Usar cliente externo que maneja login automático
      const resultadoExterno = await sellarConServicioExterno({
        xmlSinSellar: xmlContent,
        certificadoBase64: emisor.certificado_cer,
        llavePrivadaBase64: emisor.certificado_key,
        passwordLlave: emisor.password_key,
        rfc: emisor.rfc,
        versionCfdi: version || '4.0'
      });
      
      console.log('✅ SELLADO EXTERNO: Respuesta recibida:', {
        exito: resultadoExterno.exito,
        tieneXmlSellado: !!resultadoExterno.xmlSellado,
        longitudXml: resultadoExterno.xmlSellado?.length || 0
      });
      
      // Adaptar respuesta del cliente externo al formato esperado
      resultado = {
        exito: resultadoExterno.exito,
        xmlSellado: resultadoExterno.xmlSellado,
        sello: resultadoExterno.sello,
        cadenaOriginal: resultadoExterno.cadenaOriginal,
        numeroCertificado: resultadoExterno.numeroCertificado || emisor.numero_certificado,
        selloValido: resultadoExterno.selloValido,
        implementacion: 'Servicio externo consulta.click con autenticación automática'
      };
      
    } catch (errorExterno) {
      console.error('❌ SELLADO EXTERNO: Error en servicio externo:', errorExterno.message);
      console.error('❌ SELLADO EXTERNO: Stack:', errorExterno.stack);
      
      // NO HAY FALLBACK - Solo endpoint externo
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error en servicio externo de sellado: ' + errorExterno.message,
          detalles: 'NodeCFDI desactivado temporalmente. Solo se usa endpoint externo con autenticación automática.'
        })
      };
    }
    
    if (!resultado || !resultado.exito) {
      console.error('❌ SELLADO: Error durante el sellado:', resultado?.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          exito: false,
          error: 'Error en sellado: ' + (resultado?.error || 'Error desconocido')
        })
      };
    }

    console.log('✅ SELLADO: Completado exitosamente');
    console.log('📊 SELLADO: Sello generado:', resultado.sello ? 'SÍ' : 'NO');
    console.log('📊 SELLADO: Certificado:', resultado.numeroCertificado ? 'SÍ' : 'NO');
    console.log('📊 SELLADO: Implementación:', resultado.implementacion || 'NodeCFDI oficial');
    
    // Responder con el XML sellado y metadata
    const respuesta = {
      message: `CFDI sellado exitosamente con ${resultado.implementacion || 'NodeCFDI oficial'}`,
      exito: true,
      xmlSellado: resultado.xmlSellado,
      selloDigital: resultado.sello,
      cadenaOriginal: resultado.cadenaOriginal,
      selloValido: resultado.selloValido,
      numeroCertificado: resultado.numeroCertificado,
      metadata: {
        version: version,
        fechaSellado: new Date().toISOString(),
        longitudXmlOriginal: xmlContent.length,
        longitudXmlSellado: resultado.xmlSellado ? resultado.xmlSellado.length : 0,
        longitudSello: resultado.sello ? resultado.sello.length : 0,
        longitudCadenaOriginal: resultado.cadenaOriginal ? resultado.cadenaOriginal.length : 0,
        implementacion: resultado.implementacion || 'NodeCFDI oficial (compatible llaves SAT)',
        metodoSellado: usarSelladorExterno ? 'Servicio externo' : 'NodeCFDI local'
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
