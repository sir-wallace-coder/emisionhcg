const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const { 
  procesarCertificado, 
  validarLlavePrivada, 
  validarParCertificadoLlave,
  validarRFC,
  validarCodigoPostal 
} = require('./utils/csd-processor');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    switch (method) {
      case 'GET':
        return await getEmisores(userId, headers);
      case 'POST':
        return await createEmisor(userId, body, headers);
      case 'PUT':
        const updateId = event.queryStringParameters?.id;
        return await updateEmisor(userId, updateId, body, headers);
      case 'DELETE':
        const deleteId = event.queryStringParameters?.id;
        return await deleteEmisor(userId, deleteId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Método no permitido' })
        };
    }
  } catch (error) {
    console.error('Emisores error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};

async function getEmisores(userId, headers) {
  try {
    const { data: emisores, error } = await supabase
      .from('emisores')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, emisores })
    };
  } catch (error) {
    console.error('Get emisores error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al obtener emisores' })
    };
  }
}

async function createEmisor(userId, data, headers) {
  try {
    const {
      rfc,
      nombre,
      codigo_postal,
      regimen_fiscal,
      certificado_cer,
      certificado_key,
      password_key
    } = data;

    console.log('🔧 EMISOR: Creando emisor con validaciones CSD...');

    // 1. Validar RFC
    const validacionRFC = validarRFC(rfc);
    if (!validacionRFC.valido) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validacionRFC.mensaje })
      };
    }

    // 2. Validar código postal
    const validacionCP = validarCodigoPostal(codigo_postal);
    if (!validacionCP.valido) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validacionCP.mensaje })
      };
    }

    // 3. Validar RFC único por usuario
    const { data: existingEmisor } = await supabase
      .from('emisores')
      .select('id')
      .eq('usuario_id', userId)
      .eq('rfc', validacionRFC.rfc)
      .single();

    if (existingEmisor) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ya existe un emisor con este RFC' })
      };
    }

    // 4. Procesar certificados CSD si se proporcionan
    let infoCertificado = null;
    let llavePrivadaPem = null;
    let certificadoPem = null;
    let numeroCertificado = null;
    let vigenciaDesde = null;
    let vigenciaHasta = null;

    if (certificado_cer && certificado_key && password_key) {
      console.log('🔧 EMISOR: Procesando certificados CSD...');
      
      try {
        // Procesar certificado .cer
        infoCertificado = procesarCertificado(certificado_cer);
        console.log('🔧 EMISOR: Certificado procesado:', {
          rfc: infoCertificado.rfc,
          vigente: infoCertificado.vigente,
          numeroCertificado: infoCertificado.numeroCertificado
        });

        // Validar que el RFC del certificado coincida
        if (infoCertificado.rfc !== validacionRFC.rfc) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: `El RFC del certificado (${infoCertificado.rfc}) no coincide con el RFC proporcionado (${validacionRFC.rfc})` 
            })
          };
        }

        // Validar que el certificado esté vigente
        if (!infoCertificado.vigente) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: `El certificado no está vigente. Vigencia: ${infoCertificado.vigenciaDesde} - ${infoCertificado.vigenciaHasta}` 
            })
          };
        }

        // Validar llave privada
        const validacionLlave = validarLlavePrivada(certificado_key, password_key);
        if (!validacionLlave.valida) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: validacionLlave.mensaje })
          };
        }

        // Validar que certificado y llave privada coincidan
        const parValido = validarParCertificadoLlave(infoCertificado.certificadoPem, validacionLlave.llavePrivadaPem);
        if (!parValido) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'El certificado y la llave privada no coinciden' })
          };
        }

        // Guardar información procesada
        llavePrivadaPem = validacionLlave.llavePrivadaPem;
        certificadoPem = infoCertificado.certificadoPem;
        numeroCertificado = infoCertificado.numeroCertificado;
        vigenciaDesde = infoCertificado.vigenciaDesde;
        vigenciaHasta = infoCertificado.vigenciaHasta;

        console.log('🔧 EMISOR: Certificados CSD validados exitosamente');

      } catch (error) {
        console.error('🔧 EMISOR: Error procesando certificados:', error);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Error procesando certificados: ' + error.message })
        };
      }
    }

    // 5. Crear emisor en la base de datos
    console.log('🔧 EMISOR: Insertando en base de datos...');
    const { data: emisor, error } = await supabase
      .from('emisores')
      .insert([
        {
          usuario_id: userId,
          rfc: validacionRFC.rfc,
          nombre: nombre.trim(),
          codigo_postal: validacionCP.codigoPostal,
          regimen_fiscal,
          certificado_cer: certificado_cer || null,
          certificado_key: llavePrivadaPem || null, // Guardamos la llave en formato PEM
          password_key: password_key || null, // Guardamos la contraseña (debería encriptarse)
          numero_certificado: numeroCertificado,
          vigencia_desde: vigenciaDesde,
          vigencia_hasta: vigenciaHasta,
          activo: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('🔧 EMISOR: Error insertando en BD:', error);
      throw error;
    }

    console.log('🔧 EMISOR: Emisor creado exitosamente:', emisor.id);

    // 6. No devolver datos sensibles
    const { certificado_key: _, password_key: __, ...safeEmisor } = emisor;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Emisor creado exitosamente',
        emisor: {
          ...safeEmisor,
          certificado_info: infoCertificado ? {
            vigente: infoCertificado.vigente,
            vigencia_desde: infoCertificado.vigenciaDesde,
            vigencia_hasta: infoCertificado.vigenciaHasta,
            numero_certificado: infoCertificado.numeroCertificado
          } : null
        }
      })
    };
  } catch (error) {
    console.error('🔧 EMISOR: Error general:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al crear emisor: ' + error.message })
    };
  }
}

async function updateEmisor(userId, emisorId, data, headers) {
  try {
    if (!emisorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de emisor requerido' })
      };
    }

    const {
      nombre,
      codigo_postal,
      regimen_fiscal,
      certificado_cer,
      certificado_key,
      password_key,
      activo
    } = data;

    const updateData = {
      nombre,
      codigo_postal,
      regimen_fiscal,
      activo,
      updated_at: new Date().toISOString()
    };

    // Solo actualizar certificados si se proporcionan
    if (certificado_cer) updateData.certificado_cer = certificado_cer;
    if (certificado_key) updateData.certificado_key = certificado_key;
    if (password_key) updateData.password_key = password_key;

    const { data: emisor, error } = await supabase
      .from('emisores')
      .update(updateData)
      .eq('id', emisorId)
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) throw error;

    // No devolver datos sensibles
    const { certificado_key: _, password_key: __, ...safeEmisor } = emisor;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Emisor actualizado exitosamente',
        emisor: safeEmisor
      })
    };
  } catch (error) {
    console.error('Update emisor error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al actualizar emisor' })
    };
  }
}

async function deleteEmisor(userId, emisorId, headers) {
  try {
    if (!emisorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de emisor requerido' })
      };
    }

    const { error } = await supabase
      .from('emisores')
      .delete()
      .eq('id', emisorId)
      .eq('usuario_id', userId);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Emisor eliminado exitosamente' })
    };
  } catch (error) {
    console.error('Delete emisor error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al eliminar emisor' })
    };
  }
}
