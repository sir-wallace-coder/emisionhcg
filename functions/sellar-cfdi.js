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
    
    // 🚨 DEBUG FORENSE TEMPRANO: Extraer RFC del certificado ANTES del sellado
    console.log('🚨 DEBUG FORENSE TEMPRANO: Analizando discrepancia RFC...');
    let rfcDelCertificadoTemprano = null;
    try {
      const crypto = require('crypto');
      const certificadoPemTemprano = '-----BEGIN CERTIFICATE-----\n' + 
                                    emisor.certificado_cer.match(/.{1,64}/g).join('\n') + 
                                    '\n-----END CERTIFICATE-----';
      const certTemprano = new crypto.X509Certificate(certificadoPemTemprano);
      const subjectTemprano = certTemprano.subject;
      console.log('🔍 DEBUG TEMPRANO CERT: Subject completo:', subjectTemprano);
      
      const rfcMatchTemprano = subjectTemprano.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g);
      if (rfcMatchTemprano && rfcMatchTemprano.length > 0) {
        rfcDelCertificadoTemprano = rfcMatchTemprano[0];
      }
    } catch (certErrorTemprano) {
      console.log('❌ DEBUG TEMPRANO CERT: Error:', certErrorTemprano.message);
    }
    
    // 🚨 COMPARACIÓN CRÍTICA TEMPRANA
    console.log('🚨 COMPARACIÓN RFC CRÍTICA TEMPRANA:');
    console.log('  📋 RFC Emisor (BD):', emisor.rfc);
    console.log('  🔐 RFC Certificado:', rfcDelCertificadoTemprano || 'NO_EXTRAIDO');
    console.log('  ⚖️ COINCIDEN:', emisor.rfc === rfcDelCertificadoTemprano ? '✅ SÍ' : '❌ NO');
    
    if (emisor.rfc !== rfcDelCertificadoTemprano && rfcDelCertificadoTemprano) {
      console.log('🚨 PROBLEMA IDENTIFICADO:');
      console.log('  - RFC en BD/XML:', emisor.rfc);
      console.log('  - RFC en Certificado:', rfcDelCertificadoTemprano);
      console.log('  - ESTO CAUSARÁ ERROR 500 en servicio externo');
    }

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
      
      // 🔍 DEBUG FORENSE: Extraer RFC del XML (lo que realmente usa el servicio externo)
      console.log('🔍 DEBUG FORENSE XML: Analizando XML para extraer RFC del emisor...');
      let rfcDelXML = null;
      try {
        // Buscar RFC en el XML usando regex (atributo Rfc en cfdi:Emisor)
        const rfcXmlMatch = xmlContent.match(/Rfc="([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})"/g);
        if (rfcXmlMatch && rfcXmlMatch.length > 0) {
          // Extraer solo el RFC del primer match (emisor)
          const rfcValue = rfcXmlMatch[0].match(/Rfc="([^"]+)"/)[1];
          rfcDelXML = rfcValue;
        }
        console.log('🔍 DEBUG XML: RFC encontrado en XML:', rfcDelXML || 'NO_ENCONTRADO');
        console.log('🔍 DEBUG XML: Matches RFC completos:', rfcXmlMatch || 'NINGUNO');
      } catch (xmlError) {
        console.log('❌ DEBUG XML: Error extrayendo RFC del XML:', xmlError.message);
      }
      
      // 🔍 DEBUG FORENSE: Extraer RFC del certificado para comparación (solo análisis interno)
      console.log('🔍 DEBUG FORENSE CERT: Analizando certificado para extraer RFC...');
      let rfcDelCertificado = null;
      try {
        const crypto = require('crypto');
        // Convertir base64 a PEM válido SOLO para análisis interno (se envía tal cual se guarda)
        const certificadoPemDebug = '-----BEGIN CERTIFICATE-----\n' + 
                                   emisor.certificado_cer.match(/.{1,64}/g).join('\n') + 
                                   '\n-----END CERTIFICATE-----';
        const cert = new crypto.X509Certificate(certificadoPemDebug);
        const subject = cert.subject;
        console.log('🔍 DEBUG CERT: Subject completo:', subject);
        console.log('📋 DEBUG CERT: Certificado se envía tal cual se guarda (base64 string)');
        console.log('📏 DEBUG CERT: Longitud base64:', emisor.certificado_cer.length, 'chars');
        
        // Buscar RFC en el subject
        const rfcMatch = subject.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g);
        if (rfcMatch && rfcMatch.length > 0) {
          rfcDelCertificado = rfcMatch[0];
        }
      } catch (certError) {
        console.log('❌ DEBUG CERT: Error extrayendo RFC:', certError.message);
      }
      
      // 🚨 DEBUG FORENSE: COMPARACIÓN CRÍTICA (XML vs CERTIFICADO)
      console.log('🚨 DEBUG FORENSE: COMPARACIÓN RFC CRÍTICA:');
      console.log('  📋 RFC Emisor (BD):', emisor.rfc);
      console.log('  📜 RFC en XML (lo que usa servicio):', rfcDelXML || 'NO_EXTRAIDO');
      console.log('  🔐 RFC Certificado:', rfcDelCertificado || 'NO_EXTRAIDO');
      console.log('  🔢 Número Certificado:', emisor.numero_certificado);
      console.log('  📏 Longitud Certificado:', emisor.certificado_cer?.length || 0, 'chars');
      console.log('  📏 Longitud Llave:', emisor.certificado_key?.length || 0, 'chars');
      console.log('  🔑 Password Length:', emisor.password_key?.length || 0, 'chars');
      console.log('  ⚖️ XML vs CERT COINCIDE:', rfcDelXML === rfcDelCertificado ? '✅ SÍ' : '❌ NO');
      console.log('  ⚖️ BD vs XML COINCIDE:', emisor.rfc === rfcDelXML ? '✅ SÍ' : '❌ NO');
      
      // 🚨 ALERTA CRÍTICA: El servicio externo compara RFC del XML vs RFC del certificado
      if (rfcDelXML !== rfcDelCertificado && rfcDelXML && rfcDelCertificado) {
        console.log('🚨 ALERTA CRÍTICA: RFC XML vs CERTIFICADO NO COINCIDEN');
        console.log('  - RFC en XML (que usará servicio):', rfcDelXML);
        console.log('  - RFC en Certificado:', rfcDelCertificado);
        console.log('  - ESTO CAUSARÁ ERROR 500 en servicio externo');
      } else if (rfcDelXML === rfcDelCertificado && rfcDelXML) {
        console.log('✅ VALIDACIÓN OK: RFC XML y CERTIFICADO COINCIDEN:', rfcDelXML);
      }
      
      // 🚨 DEBUG CRÍTICO: VALIDAR CERTIFICADO ANTES DEL ENVÍO
      console.log('🚨 DEBUG CRÍTICO PRE-ENVÍO: Validando certificado desde BD...');
      console.log('🚨 DEBUG CRÍTICO: Certificado CER length:', emisor.certificado_cer?.length || 'NULL');
      console.log('🚨 DEBUG CRÍTICO: Certificado KEY length:', emisor.certificado_key?.length || 'NULL');
      console.log('🚨 DEBUG CRÍTICO: Password length:', emisor.password_key?.length || 'NULL');
      
      // Intentar extraer RFC del certificado ANTES del envío
      let rfcCertificadoPreEnvio = 'ERROR_EXTRACCION';
      try {
        if (emisor.certificado_cer) {
          console.log('🚨 DEBUG CRÍTICO: Intentando extraer RFC del certificado...');
          const crypto = require('crypto');
          
          // Limpiar y formatear certificado
          const cleanCert = emisor.certificado_cer.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
          console.log('🚨 DEBUG CRÍTICO: Certificado limpio length:', cleanCert.length);
          
          if (cleanCert.length > 0) {
            const pemCert = '-----BEGIN CERTIFICATE-----\n' + cleanCert.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----';
            console.log('🚨 DEBUG CRÍTICO: PEM formateado, intentando crear X509Certificate...');
            
            const cert = new crypto.X509Certificate(pemCert);
            const subject = cert.subject;
            
            console.log('🚨 DEBUG CRÍTICO CERT: Subject completo:', subject);
            
            const rfcMatch = subject.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g);
            if (rfcMatch && rfcMatch.length > 0) {
              rfcCertificadoPreEnvio = rfcMatch[0];
              console.log('🚨 DEBUG CRÍTICO: RFC EXTRAÍDO DEL CERTIFICADO:', rfcCertificadoPreEnvio);
            } else {
              console.log('🚨 DEBUG CRÍTICO: No se encontró RFC en el subject');
            }
          } else {
            console.log('❌ DEBUG CRÍTICO: Certificado vacío después de limpiar');
          }
        } else {
          console.log('❌ DEBUG CRÍTICO: Certificado CER es null/undefined');
        }
      } catch (certError) {
        console.log('❌ DEBUG CRÍTICO CERT: Error extrayendo RFC:', certError.message);
        console.log('❌ DEBUG CRÍTICO CERT: Stack:', certError.stack);
      }
      
      // 🚨 COMPARACIÓN FINAL CRÍTICA
      console.log('🚨 COMPARACIÓN FINAL CRÍTICA PRE-ENVÍO:');
      console.log('  📋 RFC Emisor (BD):', emisor.rfc);
      console.log('  🔐 RFC del Certificado:', rfcCertificadoPreEnvio);
      console.log('  ⚖️ COINCIDEN:', emisor.rfc === rfcCertificadoPreEnvio ? '✅ SÍ' : '❌ NO');
      
      if (emisor.rfc !== rfcCertificadoPreEnvio && rfcCertificadoPreEnvio !== 'ERROR_EXTRACCION') {
        console.log('🚨 PROBLEMA CRÍTICO CONFIRMADO:');
        console.log('  - RFC que enviaremos (emisor):', emisor.rfc);
        console.log('  - RFC en el certificado CSD:', rfcCertificadoPreEnvio);
        console.log('  - EL SERVICIO EXTERNO RECHAZARÁ ESTO CON ERROR 500');
        console.log('  - SOLUCIÓN: Actualizar emisor al RFC', rfcCertificadoPreEnvio, 'o usar certificado del RFC', emisor.rfc);
      }
      
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
