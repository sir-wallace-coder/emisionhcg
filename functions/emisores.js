const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');

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

    // No devolver datos sensibles
    const safeEmisores = emisores.map(emisor => {
      const { certificado_key, password_key, ...safeEmisor } = emisor;
      return safeEmisor;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, emisores: safeEmisores })
    };
  } catch (error) {
    console.error('Error obteniendo emisores:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error obteniendo emisores' })
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

    console.log('🔧 EMISOR: Creando emisor (versión simplificada)...');
    console.log('Datos recibidos:', { rfc, nombre, codigo_postal, regimen_fiscal });

    // Validaciones básicas
    if (!rfc || !nombre || !codigo_postal || !regimen_fiscal) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan campos obligatorios' })
      };
    }

    // 1. Validar RFC básico
    const rfcClean = rfc.toUpperCase().trim();
    if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfcClean)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'RFC inválido. Formato: XAXX010101000' })
      };
    }

    // 2. Validar código postal básico
    if (!/^[0-9]{5}$/.test(codigo_postal)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Código postal inválido. Debe tener 5 dígitos' })
      };
    }

    // 3. Validar RFC único por usuario
    const { data: existingEmisor } = await supabase
      .from('emisores')
      .select('id')
      .eq('usuario_id', userId)
      .eq('rfc', rfcClean)
      .single();

    if (existingEmisor) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ya existe un emisor con este RFC' })
      };
    }

    // 4. Procesar certificados CSD (versión simplificada)
    let certificadoInfo = null;
    
    if (certificado_cer && certificado_key && password_key) {
      console.log('🔧 EMISOR: Guardando certificados CSD (sin validación compleja)...');
      
      // Por ahora, solo guardamos los certificados sin validación compleja
      // La validación completa se implementará en una versión posterior
      certificadoInfo = {
        certificado_cer: certificado_cer,
        certificado_key: certificado_key,
        password_key: password_key,
        numero_certificado: 'TEMP_' + Date.now(),
        vigencia_desde: new Date().toISOString(),
        vigencia_hasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 año
      };
      
      console.log('🔧 EMISOR: Certificados preparados para guardado');
    } else {
      console.log('🔧 EMISOR: No se proporcionaron certificados CSD');
    }

    // 5. Crear emisor en la base de datos
    const emisorData = {
      usuario_id: userId,
      rfc: rfcClean,
      nombre: nombre.trim(),
      codigo_postal: codigo_postal,
      regimen_fiscal: regimen_fiscal,
      activo: true,
      created_at: new Date().toISOString()
    };

    // Agregar datos de certificado si existen
    if (certificadoInfo) {
      emisorData.certificado_cer = certificadoInfo.certificado_cer;
      emisorData.certificado_key = certificadoInfo.certificado_key;
      emisorData.password_key = certificadoInfo.password_key;
      emisorData.numero_certificado = certificadoInfo.numero_certificado;
      emisorData.vigencia_desde = certificadoInfo.vigencia_desde;
      emisorData.vigencia_hasta = certificadoInfo.vigencia_hasta;
    }

    console.log('🔧 EMISOR: Insertando en base de datos...');
    const { data: nuevoEmisor, error } = await supabase
      .from('emisores')
      .insert([emisorData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error insertando emisor:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error guardando emisor en base de datos' })
      };
    }

    console.log('✅ Emisor creado exitosamente:', nuevoEmisor.id);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        emisor: {
          id: nuevoEmisor.id,
          usuario_id: nuevoEmisor.usuario_id,
          rfc: nuevoEmisor.rfc,
          nombre: nuevoEmisor.nombre,
          codigo_postal: nuevoEmisor.codigo_postal,
          regimen_fiscal: nuevoEmisor.regimen_fiscal,
          activo: nuevoEmisor.activo,
          created_at: nuevoEmisor.created_at
        },
        message: 'Emisor registrado exitosamente'
      })
    };
  } catch (error) {
    console.error('Error creando emisor:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' })
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

    const { data: emisor, error } = await supabase
      .from('emisores')
      .update(data)
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
