// 🚀 SELLADO CFDI - SOLO SERVICIO EXTERNO
const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    console.log('🔥🔥🔥 SELLADO HANDLER EJECUTANDOSE - DEPLOY FORZADO - COMMIT NUEVO 🔥🔥🔥');
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
      
      // Llamar directamente al servicio externo

      
      // ⚠️ CRÍTICO: Usar certificado y llave SIN MANIPULACIÓN (tal como están almacenados)
      const certificadoBase64Puro = emisor.certificado_cer;
      const llavePrivadaBase64Pura = emisor.certificado_key;
      

      
      // 🚀 SELLADO DIRECTO CON SERVICIO EXTERNO consulta.click
      console.log('🚀 SELLADO DIRECTO: Iniciando proceso de sellado externo');
      console.log('🚀 SELLADO DIRECTO: Parámetros:', {
        xmlLength: xmlContent?.length || 0,
        certificadoLength: certificadoBase64Puro?.length || 0,
        llaveLength: llavePrivadaBase64Pura?.length || 0,
        passwordLength: emisor.password_key?.length || 0,
        rfc: emisor.rfc,
        version: version || '4.0'
      });
      
      // 1. LOGIN al servicio externo
      const email = process.env.EXTERNAL_SEALER_EMAIL || 'admin@cfdi.test';
      const password = process.env.EXTERNAL_SEALER_PASSWORD || 'password123';
      
      console.log('🔐 SELLADO DIRECTO: Haciendo login a consulta.click...');
      console.log('🔐 SELLADO DIRECTO: Email:', email);
      
      const loginResponse = await fetch('https://consulta.click/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      if (!loginResponse.ok) {
        throw new Error(`Login fallido: ${loginResponse.status}`);
      }
      
      const loginData = await loginResponse.json();
      const token = loginData.access_token;
      console.log('✅ SELLADO DIRECTO: Token obtenido:', token ? `${token.substring(0, 20)}...` : 'VACIO');
      console.log('🔍 SELLADO DIRECTO: Login response completo:', JSON.stringify(loginData, null, 2));
      console.log('🔍 SELLADO DIRECTO: Token completo length:', token ? token.length : 0);
      
      // 2. SELLADO con el servicio externo
      console.log('🚀 SELLADO DIRECTO: Enviando datos para sellado...');
      
      // 🔧 CONVERTIR ARCHIVOS A BINARIOS
      let certificadoBuffer, llaveBuffer;
      
      // Procesar certificado
      if (certificadoBase64Puro.includes('-----BEGIN')) {
        // Es PEM, convertir a buffer UTF-8
        certificadoBuffer = Buffer.from(certificadoBase64Puro, 'utf8');
        console.log('📄 SELLADO DIRECTO: Certificado procesado como PEM');
      } else {
        // Es base64, convertir a buffer binario
        certificadoBuffer = Buffer.from(certificadoBase64Puro, 'base64');
        console.log('📄 SELLADO DIRECTO: Certificado procesado como base64');
      }
      
      // Procesar llave privada
      if (llavePrivadaBase64Pura.includes('-----BEGIN')) {
        // Es PEM, convertir a buffer UTF-8
        llaveBuffer = Buffer.from(llavePrivadaBase64Pura, 'utf8');
        console.log('🔑 SELLADO DIRECTO: Llave procesada como PEM');
      } else {
        // Es base64, convertir a buffer binario
        llaveBuffer = Buffer.from(llavePrivadaBase64Pura, 'base64');
        console.log('🔑 SELLADO DIRECTO: Llave procesada como base64');
      }
      
      // Crear FormData con archivos binarios
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('xml', xmlContent);
      formData.append('certificado', certificadoBuffer, { filename: 'certificado.cer', contentType: 'application/octet-stream' });
      formData.append('key', llaveBuffer, { filename: 'llave.key', contentType: 'application/octet-stream' });
      formData.append('password', emisor.password_key);
      
      console.log('📊 SELLADO DIRECTO: Datos enviados:');
      console.log('  - XML length:', xmlContent.length);
      console.log('  - XML preview:', xmlContent.substring(0, 100));
      console.log('  - Certificado buffer length:', certificadoBuffer.length);
      console.log('  - Key buffer length:', llaveBuffer.length);
      console.log('  - Password length:', emisor.password_key.length);
      console.log('  - Password:', emisor.password_key);
      
      // 🔍 VERIFICAR FORMATO DE ARCHIVOS ORIGINALES
      console.log('🔍 SELLADO DIRECTO: Verificando formato de archivos originales:');
      console.log('  - Certificado original length:', certificadoBase64Puro.length);
      console.log('  - Key original length:', llavePrivadaBase64Pura.length);
      console.log('  - Certificado empieza con PEM?', certificadoBase64Puro.startsWith('-----BEGIN'));
      console.log('  - Key empieza con PEM?', llavePrivadaBase64Pura.startsWith('-----BEGIN'));
      
      // 🔍 DEBUG COMPLETO DEL TOKEN
      console.log('🔍 SELLADO DIRECTO: Token completo para debug:', token);
      console.log('🔍 SELLADO DIRECTO: Token length:', token.length);
      console.log('🔍 SELLADO DIRECTO: Token válido?', token && token.length > 0);
      
      // 🔍 DEBUG HEADERS FORMDATA
      const formDataHeaders = formData.getHeaders();
      console.log('🔍 SELLADO DIRECTO: FormData headers:', formDataHeaders);
      
      const finalHeaders = {
        'Authorization': `Bearer ${token}`,
        ...formDataHeaders
      };
      
      console.log('🔐 SELLADO DIRECTO: Headers finales que se envían:', finalHeaders);
      console.log('🕐 SELLADO DIRECTO: Tiempo entre login y sellado: inmediato');
      
      const selladoResponse = await fetch('https://consulta.click/api/v1/sellado', {
        method: 'POST',
        headers: finalHeaders,
        body: formData
      });
      
      console.log('📝 SELLADO DIRECTO: Response status:', selladoResponse.status);
      const responseText = await selladoResponse.text();
      console.log('📝 SELLADO DIRECTO: Response length:', responseText.length);
      console.log('📝 SELLADO DIRECTO: Response preview:', responseText.substring(0, 200));
      
      // Detectar si es HTML (redirección a login)
      if (responseText.trim().startsWith('<!DOCTYPE html>')) {
        throw new Error('ERROR DE AUTENTICACIÓN: El servicio externo redirigió a la página de login');
      }
      
      // Parsear respuesta JSON
      const resultadoExterno = JSON.parse(responseText);
      console.log('✅ SELLADO DIRECTO: Sellado completado exitosamente');
      
      // Adaptar respuesta del servicio externo al formato esperado
      resultado = {
        exito: true,
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
        metodoSellado: 'Servicio externo consulta.click'
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
