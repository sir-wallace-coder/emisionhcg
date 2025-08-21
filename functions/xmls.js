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
      case 'PUT':
        return await updateXML(userId, body, headers);
      case 'DELETE':
        const xmlId = event.queryStringParameters?.id || body.xmlId;
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
    // 🌐 ACCESO GLOBAL: Todos los usuarios pueden ver todos los XMLs
    console.log('📋 XMLS: Obteniendo todos los XMLs (acceso global)');
    const { data: xmls, error } = await supabase
      .from('xmls_generados')
      .select(`
        *,
        emisores (
          rfc,
          nombre
        )
      `)
      // .eq('usuario_id', userId) // ❌ REMOVIDO: Sin filtro por usuario
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
    console.log('📎 XML IMPORT: Datos recibidos:', {
      keys: Object.keys(data),
      xml_content_length: data.xml_content?.length || 0,
      version_cfdi: data.version_cfdi,
      emisor_rfc: data.emisor_rfc,
      folio: data.folio,
      total: data.total,
      estado: data.estado
    });
    
    // ===== VALIDACIÓN PREVIA CON NODECFDI =====
    console.log('🔍 XML IMPORT: Iniciando validación previa con NodeCFDI...');
    try {
      const { validateXMLWithNodeCFDI } = require('./utils/nodecfdi-validator');
      const validationResult = await validateXMLWithNodeCFDI(data.xml_content);
      
      console.log('📊 XML IMPORT: Resultado de validación NodeCFDI:', validationResult);
      
      if (!validationResult.isValid) {
        // Filtrar solo errores críticos, permitir errores de certificado vencido
        const criticalErrors = validationResult.errors.filter(error => {
          const errorMsg = error.message || error.toString();
          // Permitir errores de certificado vencido según requerimiento
          return !errorMsg.toLowerCase().includes('certificado') || 
                 !errorMsg.toLowerCase().includes('vencido') ||
                 !errorMsg.toLowerCase().includes('expired');
        });
        
        if (criticalErrors.length > 0) {
          console.error('❌ XML IMPORT: Errores críticos de validación NodeCFDI:', criticalErrors);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'XML no válido según validador oficial NodeCFDI',
              tipo: 'VALIDACION_NODECFDI_FALLIDA',
              errores_nodecfdi: criticalErrors.map(err => ({
                codigo: err.code || 'UNKNOWN',
                mensaje: err.message || err.toString(),
                nivel: err.level || 'error'
              })),
              total_errores: criticalErrors.length,
              validador: 'NodeCFDI oficial'
            })
          };
        } else {
          console.log('⚠️ XML IMPORT: Solo errores de certificado vencido detectados, continuando importación...');
        }
      } else {
        console.log('✅ XML IMPORT: XML válido según NodeCFDI');
      }
    } catch (validationError) {
      console.error('❌ XML IMPORT: Error en validación NodeCFDI:', validationError);
      // Continuar con importación si hay error en el validador, pero registrar el error
      console.log('⚠️ XML IMPORT: Continuando importación pese a error en validador NodeCFDI');
    }
    
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
    
    // Validar campos obligatorios ANTES de validaciones de longitud
    const camposObligatorios = {
      xml_content: xml_content,
      version_cfdi: version_cfdi,
      emisor_rfc: emisor_rfc,
      emisor_nombre: emisor_nombre,
      receptor_rfc: receptor_rfc,
      receptor_nombre: receptor_nombre,
      folio: folio,
      total: total
    };
    
    console.log('📋 XML: Validando campos obligatorios...');
    for (const [campo, valor] of Object.entries(camposObligatorios)) {
      if (!valor || valor.toString().trim() === '') {
        console.error(`❌ Campo obligatorio faltante: ${campo}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Campo obligatorio '${campo}' está vacío o faltante`,
            tipo: 'CAMPO_OBLIGATORIO_FALTANTE',
            campo: campo,
            valor_recibido: valor,
            campos_recibidos: Object.keys(data)
          })
        };
      }
    }

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
    const estadosValidos = ['generado', 'sellado', 'timbrado', 'cancelado', 'importado'];
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
    
    // VALIDACIONES DE LONGITUD PARA PREVENIR CONFLICTOS CON BD
    const validaciones = {
      version_cfdi: { valor: version_cfdi, max: 5, nombre: 'Version CFDI' },
      emisor_rfc: { valor: emisor_rfc, max: 13, nombre: 'RFC Emisor' },
      emisor_nombre: { valor: emisor_nombre, max: 300, nombre: 'Nombre Emisor' },
      receptor_rfc: { valor: receptor_rfc, max: 13, nombre: 'RFC Receptor' },
      receptor_nombre: { valor: receptor_nombre, max: 300, nombre: 'Nombre Receptor' },
      serie: { valor: serie, max: 25, nombre: 'Serie' },
      folio: { valor: folio, max: 40, nombre: 'Folio' },
      uuid: { valor: uuid, max: 36, nombre: 'UUID' },
      estado: { valor: estado || 'generado', max: 20, nombre: 'Estado' }
    };
    
    // Verificar longitudes
    for (const [campo, config] of Object.entries(validaciones)) {
      if (config.valor && config.valor.length > config.max) {
        console.error(`❌ LONGITUD EXCEDIDA: ${config.nombre}`, {
          campo: campo,
          longitud_actual: config.valor.length,
          longitud_maxima: config.max,
          valor_truncado: config.valor.substring(0, config.max)
        });
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `El campo '${config.nombre}' excede la longitud máxima permitida`,
            campo: campo,
            longitud_actual: config.valor.length,
            longitud_maxima: config.max,
            tipo: 'LONGITUD_CAMPO_EXCEDIDA'
          })
        };
      }
    }
    
    console.log('✅ Validaciones de longitud pasadas exitosamente');
    
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
      total: isNaN(parseFloat(total)) ? 0.00 : parseFloat(total),
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
    console.error('❌ XML IMPORT ERROR:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    
    // Determinar tipo de error y respuesta apropiada
    let statusCode = 500;
    let errorResponse = {
      error: 'Error interno del servidor al guardar XML',
      tipo: 'ERROR_INTERNO'
    };
    
    // Error de base de datos (Supabase/PostgreSQL)
    if (error.code) {
      statusCode = 400;
      errorResponse = {
        error: `Error de base de datos: ${error.message}`,
        tipo: 'ERROR_BASE_DATOS',
        codigo_bd: error.code,
        detalles_bd: error.details,
        sugerencia_bd: error.hint
      };
    }
    
    // Error de validación JSON
    if (error.name === 'SyntaxError') {
      statusCode = 400;
      errorResponse = {
        error: 'Datos JSON inválidos en la solicitud',
        tipo: 'JSON_INVALIDO',
        mensaje_original: error.message
      };
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify(errorResponse)
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

    // 🌐 ACCESO GLOBAL: Permitir eliminar cualquier XML
    console.log('🗑️ XMLS: Eliminando XML (acceso global):', xmlId);
    const { error } = await supabase
      .from('xmls_generados')
      .delete()
      .eq('id', xmlId);
      // .eq('usuario_id', userId); // ❌ REMOVIDO: Sin filtro por usuario

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

// Función para actualizar XML existente (usado para sellado)
async function updateXML(userId, data, headers) {
  try {
    const { id, estado, sello, xml_content } = data;
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID del XML es requerido' })
      };
    }

    console.log('🔄 Actualizando XML en BD:', { id, estado, tiene_sello: !!sello });
    
    // VALIDACIONES DE LONGITUD PARA PREVENIR CONFLICTOS CON BD
    const validacionesUpdate = {
      estado: { valor: estado || 'sellado', max: 20, nombre: 'Estado' }
      // sello y xml_content son TEXT (sin límite)
    };
    
    // Verificar longitudes en campos con restricción
    for (const [campo, config] of Object.entries(validacionesUpdate)) {
      if (config.valor && config.valor.length > config.max) {
        console.error(`❌ LONGITUD EXCEDIDA EN UPDATE: ${config.nombre}`, {
          campo: campo,
          longitud_actual: config.valor.length,
          longitud_maxima: config.max,
          valor_truncado: config.valor.substring(0, config.max)
        });
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `El campo '${config.nombre}' excede la longitud máxima permitida en actualización`,
            campo: campo,
            longitud_actual: config.valor.length,
            longitud_maxima: config.max,
            tipo: 'LONGITUD_CAMPO_EXCEDIDA_UPDATE'
          })
        };
      }
    }
    
    console.log('✅ Validaciones de longitud UPDATE pasadas exitosamente');
    
    // LOGGING DETALLADO PARA DIAGNÓSTICO - SOLO CAMPOS QUE EXISTEN EN ESQUEMA
    const updateData = {
      estado: estado || 'sellado',
      sello: sello,
      xml_content: xml_content
    };
    
    console.log('📊 DATOS PARA ACTUALIZAR:', {
      id: id,
      userId: userId,
      estado: updateData.estado,
      sello_length: updateData.sello ? updateData.sello.length : 0,
      xml_content_length: updateData.xml_content ? updateData.xml_content.length : 0
    });

    // 🌐 ACCESO GLOBAL: Actualizar XML sin restricción por usuario
    console.log('🌐 UPDATE XML: Acceso global habilitado - sin filtro por usuario');
    const { data: result, error } = await supabase
      .from('xmls_generados')
      .update(updateData)
      .eq('id', id)
      // .eq('usuario_id', userId) // ❌ REMOVIDO: Sin filtro por usuario
      .select();

    if (error) {
      console.error('❌ ERROR SUPABASE COMPLETO:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        full_error: error
      });
      
      console.error('❌ DATOS QUE CAUSARON ERROR:', {
        updateData: updateData,
        id: id,
        userId: userId
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error al actualizar XML en base de datos',
          supabase_error: error.message,
          details: error.details,
          hint: error.hint
        })
      };
    }

    if (!result || result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'XML no encontrado o no pertenece al usuario' })
      };
    }

    console.log('✅ XML actualizado exitosamente en BD:', result[0].id);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'XML actualizado exitosamente',
        xml: result[0]
      })
    };
  } catch (error) {
    console.error('❌ Update XML error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al actualizar XML' })
    };
  }
}
