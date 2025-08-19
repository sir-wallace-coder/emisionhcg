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
      body: JSON.stringify({ success: true, xmls })
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
      uuid,
      sello,
      estado
    } = data;

    // === VALIDACIONES DE LONGITUD DE CAMPOS CRÍTICOS ===
    const validacionCampos = {
      version_cfdi: { valor: version_cfdi, limite: 5, actual: version_cfdi?.length || 0 },
      emisor_rfc: { valor: emisor_rfc, limite: 13, actual: emisor_rfc?.length || 0 },
      emisor_nombre: { valor: emisor_nombre, limite: 300, actual: emisor_nombre?.length || 0 },
      receptor_rfc: { valor: receptor_rfc, limite: 13, actual: receptor_rfc?.length || 0 },
      receptor_nombre: { valor: receptor_nombre, limite: 300, actual: receptor_nombre?.length || 0 },
      serie: { valor: serie, limite: 25, actual: serie?.length || 0 },
      folio: { valor: folio, limite: 40, actual: folio?.length || 0 },
      uuid: { valor: uuid, limite: 36, actual: uuid?.length || 0 },
      estado: { valor: estado, limite: 20, actual: estado?.length || 0 }
    };

    console.log('📏 XML: Validación de longitudes de campos:');
    for (const [campo, info] of Object.entries(validacionCampos)) {
      if (info.actual > 0) {
        const status = info.actual <= info.limite ? '✅' : '❌';
        console.log(`${status} ${campo}: ${info.actual}/${info.limite} caracteres - "${info.valor}"`);

        if (info.actual > info.limite) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: `Campo '${campo}' excede el límite de ${info.limite} caracteres (actual: ${info.actual})`,
              tipo: 'CAMPO_XML_DEMASIADO_LARGO',
              campo: campo,
              valor_actual: info.valor,
              longitud_actual: info.actual,
              longitud_maxima: info.limite
            })
          };
        }
      }
    }

    // Validaciones específicas adicionales
    if (uuid && uuid.length !== 36) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `UUID debe tener exactamente 36 caracteres (formato: 12345678-1234-1234-1234-123456789012)`,
          tipo: 'UUID_LONGITUD_INVALIDA',
          uuid_actual: uuid,
          longitud_actual: uuid.length,
          longitud_requerida: 36
        })
      };
    }

    // Validar estados permitidos
    const estadosValidos = ['generado', 'sellado', 'timbrado', 'cancelado'];
    if (estado && !estadosValidos.includes(estado)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Estado '${estado}' no es válido. Estados permitidos: ${estadosValidos.join(', ')}`,
          tipo: 'ESTADO_XML_INVALIDO',
          estado_actual: estado,
          estados_validos: estadosValidos
        })
      };
    }

    console.log('💾 Preparando datos para inserción en BD...');
    
    // Preparar datos con todos los campos del esquema
    const xmlData = {
      usuario_id: userId,
      emisor_id: null, // Campo requerido por esquema, null si no hay emisor específico
      xml_content,
      version_cfdi,
      emisor_rfc,
      emisor_nombre,
      receptor_rfc,
      receptor_nombre,
      serie: serie || null, // Permitir serie vacía
      folio,
      total: parseFloat(total),
      uuid: uuid || null, // UUID opcional hasta timbrado
      sello: sello || null, // Sello opcional hasta sellado
      estado: estado || 'generado',
      fecha_timbrado: null // NULL hasta que se timbre
      // created_at y updated_at se manejan automáticamente por la BD
    };
    
    console.log('📋 Datos validados para inserción:', {
      usuario_id: xmlData.usuario_id,
      version_cfdi: xmlData.version_cfdi,
      emisor_rfc: xmlData.emisor_rfc,
      receptor_rfc: xmlData.receptor_rfc,
      serie: xmlData.serie,
      folio: xmlData.folio,
      total: xmlData.total,
      estado: xmlData.estado,
      tiene_uuid: !!xmlData.uuid,
      tiene_sello: !!xmlData.sello
    });
    
    // Guardar XML
    const { data: xmlRecord, error } = await supabase
      .from('xmls_generados')
      .insert([xmlData])
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
