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
        return await getXMLs(userId, headers);
      case 'POST':
        return await saveXML(userId, body, headers);
      case 'DELETE':
        const xmlId = event.queryStringParameters?.id;
        return await deleteXML(userId, xmlId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Método no permitido' })
        };
    }
  } catch (error) {
    console.error('XMLs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};

async function getXMLs(userId, headers) {
  try {
    const { data: xmls, error } = await supabase
      .from('xmls_generados')
      .select(`
        *,
        emisores (
          rfc,
          nombre
        )
      `)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ xmls })
    };
  } catch (error) {
    console.error('Get XMLs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al obtener XMLs' })
    };
  }
}

async function saveXML(userId, data, headers) {
  try {
    const {
      xml_content,
      version_cfdi,
      emisor_rfc,
      emisor_nombre,
      receptor_rfc,
      receptor_nombre,
      serie,
      folio,
      total,
      emisor_id
    } = data;

    // Guardar XML
    const { data: xmlRecord, error } = await supabase
      .from('xmls_generados')
      .insert([
        {
          usuario_id: userId,
          emisor_id: emisor_id || null,
          xml_content,
          version_cfdi,
          emisor_rfc,
          emisor_nombre,
          receptor_rfc,
          receptor_nombre,
          serie,
          folio,
          total: parseFloat(total),
          estado: 'generado',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'XML guardado exitosamente',
        xml: xmlRecord
      })
    };
  } catch (error) {
    console.error('Save XML error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al guardar XML' })
    };
  }
}

async function deleteXML(userId, xmlId, headers) {
  try {
    if (!xmlId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de XML requerido' })
      };
    }

    const { error } = await supabase
      .from('xmls_generados')
      .delete()
      .eq('id', xmlId)
      .eq('usuario_id', userId);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'XML eliminado exitosamente' })
    };
  } catch (error) {
    console.error('Delete XML error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al eliminar XML' })
    };
  }
}
