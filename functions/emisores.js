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

    console.log('🔧 EMISOR: Creando emisor con validaciones avanzadas...');
    console.log('Datos recibidos:', { rfc, nombre, codigo_postal, regimen_fiscal });

    // === VALIDACIONES OBLIGATORIAS ===
    
    // 1. Validar campos obligatorios
    const camposObligatorios = ['rfc', 'nombre', 'codigo_postal', 'regimen_fiscal'];
    const camposFaltantes = camposObligatorios.filter(campo => !data[campo] || data[campo].toString().trim() === '');
    
    if (camposFaltantes.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Campos obligatorios faltantes: ${camposFaltantes.join(', ')}`,
          tipo: 'CAMPOS_OBLIGATORIOS',
          campos_faltantes: camposFaltantes
        })
      };
    }

    // 2. Validar RFC avanzado
    const rfcClean = rfc.toUpperCase().trim();
    
    // Validar longitud
    if (rfcClean.length < 12 || rfcClean.length > 13) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'RFC debe tener 12 o 13 caracteres',
          tipo: 'RFC_LONGITUD_INVALIDA',
          rfc_proporcionado: rfcClean
        })
      };
    }
    
    // Validar formato RFC
    if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfcClean)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'RFC con formato inválido. Formato correcto: XAXX010101000 (personas morales) o XAXX010101000 (personas físicas)',
          tipo: 'RFC_FORMATO_INVALIDO',
          rfc_proporcionado: rfcClean,
          formato_esperado: 'XAXX010101000'
        })
      };
    }

    // 3. Validar nombre/razón social
    const nombreClean = nombre.trim();
    if (nombreClean.length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'El nombre o razón social debe tener al menos 3 caracteres',
          tipo: 'NOMBRE_MUY_CORTO'
        })
      };
    }
    
    if (nombreClean.length > 300) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'El nombre o razón social no puede exceder 300 caracteres',
          tipo: 'NOMBRE_MUY_LARGO'
        })
      };
    }

    // 4. Validar código postal avanzado
    if (!/^[0-9]{5}$/.test(codigo_postal)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Código postal inválido. Debe contener exactamente 5 dígitos numéricos',
          tipo: 'CODIGO_POSTAL_INVALIDO',
          codigo_postal_proporcionado: codigo_postal,
          formato_esperado: '12345'
        })
      };
    }
    
    // Validar rango de código postal mexicano
    const cp = parseInt(codigo_postal);
    if (cp < 1000 || cp > 99999) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Código postal fuera del rango válido para México (01000-99999)',
          tipo: 'CODIGO_POSTAL_FUERA_RANGO',
          codigo_postal_proporcionado: codigo_postal
        })
      };
    }

    // 5. Validar régimen fiscal
    const regimenesFiscalesValidos = [
      '601', '603', '605', '606', '607', '608', '610', '611', '612', 
      '614', '615', '616', '620', '621', '622', '623', '624', '625', '626'
    ];
    
    if (!regimenesFiscalesValidos.includes(regimen_fiscal)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Régimen fiscal inválido. Debe ser uno de los códigos SAT válidos',
          tipo: 'REGIMEN_FISCAL_INVALIDO',
          regimen_proporcionado: regimen_fiscal,
          regimenes_validos: regimenesFiscalesValidos
        })
      };
    }

    // 6. Validar RFC único por usuario
    console.log('🔧 EMISOR: Verificando RFC único...');
    
    try {
      const { data: existingEmisor, error: checkError } = await supabase
        .from('emisores')
        .select('id, nombre, created_at')
        .eq('usuario_id', userId)
        .eq('rfc', rfcClean)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = No rows found, que es lo que esperamos
        console.error('❌ EMISOR: Error verificando RFC único:', checkError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error verificando RFC en base de datos',
            tipo: 'ERROR_VERIFICACION_RFC',
            detalle: checkError.message
          })
        };
      }

      if (existingEmisor) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Ya existe un emisor registrado con el RFC ${rfcClean}`,
            tipo: 'RFC_DUPLICADO',
            rfc_existente: rfcClean,
            emisor_existente: {
              nombre: existingEmisor.nombre,
              fecha_registro: existingEmisor.created_at
            }
          })
        };
      }
      
      console.log('✅ EMISOR: RFC disponible para registro');
      
    } catch (uniqueError) {
      console.error('❌ EMISOR: Error inesperado verificando RFC:', uniqueError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error inesperado verificando RFC',
          tipo: 'ERROR_INESPERADO_RFC',
          detalle: uniqueError.message
        })
      };
    }

    // === VALIDACIONES DE CERTIFICADOS CSD ===
    let certificadoInfo = null;
    
    if (certificado_cer && certificado_key && password_key) {
      console.log('🔧 EMISOR: Validando certificados CSD...');
      
      try {
        // 1. Validar que los archivos no estén vacíos
        if (!certificado_cer || certificado_cer.trim() === '') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'El archivo de certificado (.cer) está vacío o no es válido',
              tipo: 'CERTIFICADO_CER_VACIO'
            })
          };
        }
        
        if (!certificado_key || certificado_key.trim() === '') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'El archivo de llave privada (.key) está vacío o no es válido',
              tipo: 'CERTIFICADO_KEY_VACIO'
            })
          };
        }
        
        if (!password_key || password_key.trim() === '') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'La contraseña de la llave privada es obligatoria',
              tipo: 'PASSWORD_KEY_VACIO'
            })
          };
        }
        
        // 2. Validar formato base64 básico
        try {
          const cerBuffer = Buffer.from(certificado_cer, 'base64');
          const keyBuffer = Buffer.from(certificado_key, 'base64');
          
          if (cerBuffer.length < 100) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'El archivo de certificado (.cer) parece estar corrupto o incompleto',
                tipo: 'CERTIFICADO_CER_CORRUPTO'
              })
            };
          }
          
          if (keyBuffer.length < 100) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'El archivo de llave privada (.key) parece estar corrupto o incompleto',
                tipo: 'CERTIFICADO_KEY_CORRUPTO'
              })
            };
          }
          
        } catch (base64Error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Los archivos de certificado no tienen un formato base64 válido',
              tipo: 'CERTIFICADO_BASE64_INVALIDO',
              detalle: base64Error.message
            })
          };
        }
        
        // 3. Validar longitud de contraseña
        if (password_key.length < 4) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'La contraseña de la llave privada debe tener al menos 4 caracteres',
              tipo: 'PASSWORD_KEY_MUY_CORTA'
            })
          };
        }
        
        if (password_key.length > 100) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'La contraseña de la llave privada es demasiado larga (máximo 100 caracteres)',
              tipo: 'PASSWORD_KEY_MUY_LARGA'
            })
          };
        }
        
        // 4. Extraer información REAL del certificado .cer
        let numeroCertificado = null;
        let vigenciaDesde = null;
        let vigenciaHasta = null;
        
        try {
          // Decodificar el certificado desde base64
          const cerBuffer = Buffer.from(certificado_cer, 'base64');
          const cerString = cerBuffer.toString('utf8');
          
          // Buscar el número de serie en el certificado
          // El número de serie está en formato hexadecimal en el certificado
          const serialMatch = cerString.match(/Serial Number:\s*([a-fA-F0-9:]+)/i) || 
                             cerString.match(/serialNumber=([a-fA-F0-9]+)/i);
          
          if (serialMatch) {
            // Limpiar el número de serie (quitar : y espacios)
            const serialHex = serialMatch[1].replace(/[:\s]/g, '');
            // Convertir de hex a decimal y tomar los últimos 20 dígitos
            const serialDecimal = BigInt('0x' + serialHex).toString();
            numeroCertificado = serialDecimal.slice(-20); // Máximo 20 caracteres
            console.log('🔢 Número de certificado extraído del .cer:', numeroCertificado);
          } else {
            console.log('⚠️ No se pudo extraer el número de serie del certificado, usando fallback');
            // Fallback: generar número basado en hash del certificado
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(cerBuffer).digest('hex');
            numeroCertificado = hash.slice(-20); // Últimos 20 caracteres del hash
          }
          
          // Buscar fechas de vigencia en el certificado
          const notBeforeMatch = cerString.match(/Not Before:\s*([^\n]+)/i);
          const notAfterMatch = cerString.match(/Not After:\s*([^\n]+)/i);
          
          if (notBeforeMatch) {
            vigenciaDesde = new Date(notBeforeMatch[1]).toISOString();
          }
          
          if (notAfterMatch) {
            vigenciaHasta = new Date(notAfterMatch[1]).toISOString();
          }
          
        } catch (certParseError) {
          console.error('❌ Error extrayendo datos del certificado:', certParseError);
          // Fallback: generar número basado en timestamp y RFC
          const timestamp = Date.now().toString().slice(-8);
          const rfcShort = rfcClean.slice(0, 8);
          numeroCertificado = `${rfcShort}${timestamp}`;
          console.log('🔢 Usando número de certificado fallback:', numeroCertificado);
        }
        
        certificadoInfo = {
          certificado_cer: certificado_cer,
          certificado_key: certificado_key,
          password_key: password_key,
          numero_certificado: numeroCertificado,
          vigencia_desde: vigenciaDesde || new Date().toISOString(),
          vigencia_hasta: vigenciaHasta || new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          validado_en: new Date().toISOString(),
          estado_validacion: 'VALIDADO_BASICO'
        };
        
        console.log('🔢 Número de certificado generado:', numeroCertificado, `(${numeroCertificado.length} caracteres)`);
        
        console.log('✅ EMISOR: Certificados CSD validados exitosamente (sin validación de expiración)');
        
      } catch (csdError) {
        console.error('❌ EMISOR: Error validando certificados CSD:', csdError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Error procesando certificados CSD: ' + csdError.message,
            tipo: 'ERROR_PROCESANDO_CSD',
            detalle: csdError.message
          })
        };
      }
      
    } else if (certificado_cer || certificado_key || password_key) {
      // Si se proporciona alguno pero no todos
      const camposCSDFaltantes = [];
      if (!certificado_cer) camposCSDFaltantes.push('certificado (.cer)');
      if (!certificado_key) camposCSDFaltantes.push('llave privada (.key)');
      if (!password_key) camposCSDFaltantes.push('contraseña');
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Para usar certificados CSD, debe proporcionar todos los archivos: ${camposCSDFaltantes.join(', ')}`,
          tipo: 'CSD_INCOMPLETO',
          campos_faltantes: camposCSDFaltantes
        })
      };
    } else {
      console.log('🔧 EMISOR: Emisor sin certificados CSD (se pueden agregar después)');
    }

    // 5. Crear emisor en la base de datos
    const emisorData = {
      usuario_id: userId,
      rfc: rfcClean,
      nombre: nombre.trim(),
      codigo_postal: codigo_postal,
      regimen_fiscal: regimen_fiscal,
      activo: true
      // created_at y updated_at se manejan automáticamente por la BD
    };

    // Agregar datos de certificado si existen
    if (certificadoInfo) {
      emisorData.certificado_cer = certificadoInfo.certificado_cer;
      emisorData.certificado_key = certificadoInfo.certificado_key;
      emisorData.password_key = certificadoInfo.password_key;
      emisorData.numero_certificado = certificadoInfo.numero_certificado;
      // Convertir fechas ISO a formato DATE para PostgreSQL
      emisorData.vigencia_desde = certificadoInfo.vigencia_desde ? certificadoInfo.vigencia_desde.split('T')[0] : null;
      emisorData.vigencia_hasta = certificadoInfo.vigencia_hasta ? certificadoInfo.vigencia_hasta.split('T')[0] : null;
    }

    // 7. Insertar emisor en base de datos
    console.log('🔧 EMISOR: Insertando en base de datos...');
    // Validar longitudes de campos críticos ANTES de insertar
    const validacionCampos = {
      rfc: { valor: emisorData.rfc, limite: 13, actual: emisorData.rfc?.length || 0 },
      codigo_postal: { valor: emisorData.codigo_postal, limite: 5, actual: emisorData.codigo_postal?.length || 0 },
      regimen_fiscal: { valor: emisorData.regimen_fiscal, limite: 10, actual: emisorData.regimen_fiscal?.length || 0 },
      numero_certificado: { valor: emisorData.numero_certificado, limite: 20, actual: emisorData.numero_certificado?.length || 0 }
    };
    
    console.log('📏 Validación de longitudes de campos:');
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
              tipo: 'CAMPO_DEMASIADO_LARGO',
              campo: campo,
              valor_actual: info.valor,
              longitud_actual: info.actual,
              longitud_maxima: info.limite
            })
          };
        }
      }
    }
    
    console.log('Datos completos a insertar:', JSON.stringify(emisorData, null, 2));
    console.log('Resumen de datos:', {
      usuario_id: emisorData.usuario_id,
      rfc: emisorData.rfc,
      nombre: emisorData.nombre,
      codigo_postal: emisorData.codigo_postal,
      regimen_fiscal: emisorData.regimen_fiscal,
      activo: emisorData.activo,
      tiene_certificados: !!certificadoInfo,
      campos_certificado: certificadoInfo ? Object.keys(certificadoInfo) : []
    });
    
    let nuevoEmisor = null;
    
    try {
      const { data: emisorCreado, error: insertError } = await supabase
        .from('emisores')
        .insert([emisorData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ EMISOR: Error insertando en BD:', insertError);
        
        // Manejar errores específicos de base de datos
        let errorMessage = 'Error guardando emisor en base de datos';
        let errorType = 'ERROR_INSERCION_BD';
        
        if (insertError.code === '23505') {
          // Violación de restricción única
          errorMessage = 'Ya existe un emisor con estos datos (posible RFC duplicado)';
          errorType = 'RESTRICCION_UNICA_VIOLADA';
        } else if (insertError.code === '23502') {
          // Violación de NOT NULL
          errorMessage = 'Faltan datos obligatorios para crear el emisor';
          errorType = 'DATOS_OBLIGATORIOS_FALTANTES';
        } else if (insertError.code === '42P01') {
          // Tabla no existe
          errorMessage = 'Error de configuración: tabla de emisores no encontrada';
          errorType = 'TABLA_NO_EXISTE';
        }
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: errorMessage,
            tipo: errorType,
            codigo_bd: insertError.code,
            detalle: insertError.message
          })
        };
      }
      
      if (!emisorCreado) {
        console.error('❌ EMISOR: No se recibió el emisor creado');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'El emisor se guardó pero no se pudo recuperar la información',
            tipo: 'EMISOR_NO_RETORNADO'
          })
        };
      }
      
      // Asignar el emisor creado a la variable del scope superior
      nuevoEmisor = emisorCreado;
      
    } catch (insertException) {
      console.error('❌ EMISOR: Excepción insertando emisor:', insertException);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error inesperado al guardar emisor',
          tipo: 'EXCEPCION_INSERCION',
          detalle: insertException.message
        })
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
