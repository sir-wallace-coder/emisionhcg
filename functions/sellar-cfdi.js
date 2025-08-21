// 🚀 SELLADO CFDI - VERSIÓN CORREGIDA SIN ERRORES DE SINTAXIS
console.log('🔍 SELLADO: Iniciando carga de módulos...');

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const { sellarCFDIConNodeCfdi } = require('./utils/nodecfdi-sealer');
const FormData = require('form-data');
const fetch = require('node-fetch');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SELLADO_EXTERNO_URL = 'https://consulta.click/api/v1/sellado';
const SELLADO_EXTERNO_TOKEN = process.env.SELLADO_EXTERNO_TOKEN; // Token obtenido del login

console.log('✅ SELLADO: Todos los módulos cargados correctamente');

/**
 * Función para sellar CFDI usando servicio externo
 * @param {string} xmlContent - Contenido XML del CFDI
 * @param {string} certificadoCer - Certificado en base64
 * @param {string} certificadoKey - Llave privada en base64
 * @param {string} password - Contraseña del certificado
 * @returns {Object} Resultado del sellado
 */
async function sellarCFDIExterno(xmlContent, certificadoCer, certificadoKey, password) {
    console.log('🌐 SELLADO EXTERNO: Iniciando sellado con servicio externo...');
    console.log('🔗 SELLADO EXTERNO: URL:', SELLADO_EXTERNO_URL);
    
    try {
        // Crear FormData para multipart/form-data
        const formData = new FormData();
        
        // Agregar XML como archivo
        formData.append('xml', Buffer.from(xmlContent, 'utf8'), {
            filename: 'cfdi.xml',
            contentType: 'application/xml'
        });
        
        // Agregar certificado como archivo
        formData.append('certificado', Buffer.from(certificadoCer, 'base64'), {
            filename: 'certificado.cer',
            contentType: 'application/octet-stream'
        });
        
        // Agregar llave privada como archivo
        formData.append('key', Buffer.from(certificadoKey, 'base64'), {
            filename: 'llave.key',
            contentType: 'application/octet-stream'
        });
        
        // Agregar contraseña como texto
        formData.append('password', password);
        
        console.log('📦 SELLADO EXTERNO: FormData preparado con archivos y contraseña');
        
        // Realizar request al servicio externo
        const response = await fetch(SELLADO_EXTERNO_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SELLADO_EXTERNO_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        console.log('📊 SELLADO EXTERNO: Status:', response.status);
        console.log('📊 SELLADO EXTERNO: Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ SELLADO EXTERNO: Error HTTP:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const resultado = await response.json();
        console.log('✅ SELLADO EXTERNO: Respuesta recibida exitosamente');
        
        // Procesar respuesta del servicio externo
        console.log('📋 SELLADO EXTERNO: Procesando respuesta del servicio...');
        console.log('📋 SELLADO EXTERNO: Claves de respuesta:', Object.keys(resultado));
        
        // El servicio regresa el XML sellado en base64
        let xmlSelladoBase64 = resultado.xml || resultado.data || resultado.xmlSellado || resultado.xml_sellado;
        
        if (!xmlSelladoBase64) {
            console.error('❌ SELLADO EXTERNO: No se encontró XML sellado en la respuesta');
            console.error('❌ SELLADO EXTERNO: Respuesta completa:', resultado);
            throw new Error('El servicio no regresó XML sellado');
        }
        
        console.log('📎 SELLADO EXTERNO: XML sellado recibido en base64, longitud:', xmlSelladoBase64.length);
        
        // Decodificar el XML sellado de base64 a string
        let xmlSelladoString;
        try {
            xmlSelladoString = Buffer.from(xmlSelladoBase64, 'base64').toString('utf8');
            console.log('✅ SELLADO EXTERNO: XML decodificado exitosamente, longitud:', xmlSelladoString.length);
        } catch (decodeError) {
            console.error('❌ SELLADO EXTERNO: Error decodificando base64:', decodeError.message);
            throw new Error('Error decodificando XML sellado desde base64');
        }
        
        // Extraer sello digital del XML sellado para compatibilidad con el flujo existente
        let selloExtraido = null;
        let numeroCertificadoExtraido = null;
        
        try {
            // Buscar el atributo Sello en el XML
            const selloMatch = xmlSelladoString.match(/Sello="([^"]+)"/i);
            if (selloMatch) {
                selloExtraido = selloMatch[1];
                console.log('✅ SELLADO EXTERNO: Sello extraído del XML, longitud:', selloExtraido.length);
            }
            
            // Buscar el número de certificado
            const certMatch = xmlSelladoString.match(/NoCertificado="([^"]+)"/i);
            if (certMatch) {
                numeroCertificadoExtraido = certMatch[1];
                console.log('✅ SELLADO EXTERNO: Número de certificado extraído:', numeroCertificadoExtraido);
            }
        } catch (parseError) {
            console.warn('⚠️ SELLADO EXTERNO: No se pudo extraer sello del XML:', parseError.message);
        }
        
        console.log('🎉 SELLADO EXTERNO: Sellado completado exitosamente');
        
        return {
            exito: true,
            xmlSellado: xmlSelladoString, // XML como string para el flujo existente
            sello: selloExtraido,
            cadenaOriginal: null, // El servicio externo no regresa cadena original
            numeroCertificado: numeroCertificadoExtraido,
            selloValido: true, // Asumimos válido si el servicio externo lo procesó
            implementacion: 'Servicio externo consulta.click'
        };
        
    } catch (error) {
        console.error('❌ SELLADO EXTERNO: Excepción:', error.message);
        throw error;
    }
}

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

    // 🚀 SELLADO: Determinar método de sellado
    const usarSelladorExterno = process.env.USAR_SELLADOR_EXTERNO === 'true' && SELLADO_EXTERNO_TOKEN;
    
    let resultado;
    
    if (usarSelladorExterno) {
      console.log('🌐 SELLADO: Usando servicio externo de sellado...');
      console.log('🔗 SELLADO: Endpoint:', SELLADO_EXTERNO_URL);
      
      try {
        resultado = await sellarCFDIExterno(
          xmlContent,
          emisor.certificado_cer,
          emisor.certificado_key,
          emisor.password_key
        );
      } catch (errorExterno) {
        console.error('❌ SELLADO EXTERNO: Falló, intentando con NodeCFDI como fallback...');
        console.error('❌ SELLADO EXTERNO: Error:', errorExterno.message);
        
        // Fallback a NodeCFDI si el servicio externo falla
        console.log('🔄 SELLADO: Fallback a NodeCFDI oficial...');
        resultado = await sellarCFDIConNodeCfdi(
          xmlContent,
          emisor.certificado_cer,
          emisor.certificado_key,
          emisor.password_key,
          version,
          emisor.numero_certificado
        );
      }
    } else {
      console.log('🚀 SELLADO: Usando NodeCFDI oficial (método por defecto)...');
      console.log('📋 SELLADO: NodeCFDI maneja correctamente llaves privadas SAT encriptadas');
      
      resultado = await sellarCFDIConNodeCfdi(
        xmlContent,
        emisor.certificado_cer,
        emisor.certificado_key,
        emisor.password_key,
        version,
        emisor.numero_certificado
      );
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
