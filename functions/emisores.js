const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 🔧 PROCESADOR CSD SIMPLIFICADO (sin node-forge para evitar errores serverless)
function procesarCertificadoSimplificado(cerBase64) {
  try {
    const cerBuffer = Buffer.from(cerBase64, 'base64');
    const cert = new crypto.X509Certificate(cerBuffer);
    
    // Extraer número de serie en formato decimal
    const serialHex = cert.serialNumber;
    let serialString = '';
    for (let i = 0; i < serialHex.length; i += 2) {
      const hexByte = serialHex.substr(i, 2);
      const charCode = parseInt(hexByte, 16);
      serialString += String.fromCharCode(charCode);
    }
    
    // Extraer fechas de vigencia
    const vigenciaDesde = new Date(cert.validFrom).toISOString().split('T')[0];
    const vigenciaHasta = new Date(cert.validTo).toISOString().split('T')[0];
    
    // 🔍 EXTRAER RFC DEL CERTIFICADO
    let rfcCertificado = null;
    try {
      // El RFC está en el subject del certificado, buscar en diferentes campos
      const subject = cert.subject;
      console.log('🔍 DEBUG CERT: Subject completo:', subject);
      
      // Buscar RFC en el subject (puede estar en diferentes formatos)
      const rfcMatch = subject.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g);
      if (rfcMatch && rfcMatch.length > 0) {
        rfcCertificado = rfcMatch[0];
        console.log('✅ RFC extraído del certificado:', rfcCertificado);
      } else {
        console.log('⚠️ No se pudo extraer RFC del certificado subject');
      }
    } catch (rfcError) {
      console.log('❌ Error extrayendo RFC del certificado:', rfcError.message);
    }
    
    // Convertir a PEM
    const certificadoPem = '-----BEGIN CERTIFICATE-----\n' + 
                          cerBase64.match(/.{1,64}/g).join('\n') + 
                          '\n-----END CERTIFICATE-----';
    
    return {
      valido: true,
      numeroSerie: serialString,
      vigenciaDesde: vigenciaDesde,
      vigenciaHasta: vigenciaHasta,
      certificadoPem: certificadoPem,
      rfcCertificado: rfcCertificado // 🆕 RFC extraído del certificado
    };
  } catch (error) {
    return {
      valido: false,
      mensaje: 'Error procesando certificado: ' + error.message
    };
  }
}

function validarLlavePrivadaSimplificada(keyBase64, password) {
  try {
    console.log('🔍 DEBUG KEY VALIDATION: Iniciando validación de llave privada ENCRIPTADA...');
    console.log('🔍 DEBUG KEY VALIDATION: keyBase64 length:', keyBase64 ? keyBase64.length : 'undefined');
    console.log('🔍 DEBUG KEY VALIDATION: password provided:', !!password);
    
    if (!keyBase64 || !password) {
      console.log('❌ DEBUG KEY VALIDATION: keyBase64 o password faltantes');
      return {
        valida: false,
        mensaje: 'keyBase64 y password son requeridos'
      };
    }
    
    // 🔧 FIX CRÍTICO: Manejar llave encriptada del SAT
    console.log('🔍 DEBUG KEY VALIDATION: Procesando llave encriptada del SAT...');
    const keyBuffer = Buffer.from(keyBase64, 'base64');
    console.log('🔍 DEBUG KEY VALIDATION: Buffer creado, tamaño:', keyBuffer.length);
    
    // Intentar como llave encriptada PKCS#8 primero (formato común del SAT)
    try {
      console.log('🔍 DEBUG KEY VALIDATION: Intentando formato ENCRYPTED PRIVATE KEY...');
      const encryptedKeyPem = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' + 
                             keyBase64.match(/.{1,64}/g).join('\n') + 
                             '\n-----END ENCRYPTED PRIVATE KEY-----';
      
      console.log('🔍 DEBUG KEY VALIDATION: PEM encriptado generado, longitud:', encryptedKeyPem.length);
      console.log('🔍 DEBUG KEY VALIDATION: PEM preview:', encryptedKeyPem.substring(0, 100) + '...');
      
      // Desencriptar y validar con crypto.createPrivateKey
      console.log('🔍 DEBUG KEY VALIDATION: Desencriptando con password...');
      const privateKeyObj = crypto.createPrivateKey({ 
        key: encryptedKeyPem, 
        passphrase: password,
        format: 'pem'
      });
      
      // Exportar como RSA PRIVATE KEY para compatibilidad con forge
      console.log('🔍 DEBUG KEY VALIDATION: Exportando como RSA PRIVATE KEY...');
      const rsaKeyPem = privateKeyObj.export({
        type: 'pkcs1',
        format: 'pem'
      });
      
      console.log('✅ DEBUG KEY VALIDATION: ÉXITO - Llave encriptada desencriptada y convertida a RSA PRIVATE KEY');
      console.log('🔍 DEBUG KEY VALIDATION: RSA PEM length:', rsaKeyPem.length);
      console.log('🔍 DEBUG KEY VALIDATION: RSA PEM preview:', rsaKeyPem.substring(0, 100) + '...');
      
      return {
        valida: true,
        llavePrivadaPem: rsaKeyPem
      };
      
    } catch (encryptedError) {
      console.log('⚠️ DEBUG KEY VALIDATION: Formato ENCRYPTED PRIVATE KEY falló, intentando otros...');
      console.log('⚠️ DEBUG KEY VALIDATION: Error:', encryptedError.message);
      
      // Fallback: intentar como llave no encriptada
      try {
        console.log('🔍 DEBUG KEY VALIDATION: Intentando como llave no encriptada...');
        const keyPem = '-----BEGIN PRIVATE KEY-----\n' + 
                      keyBase64.match(/.{1,64}/g).join('\n') + 
                      '\n-----END PRIVATE KEY-----';
        
        const privateKeyObj = crypto.createPrivateKey({ 
          key: keyPem, 
          passphrase: password,
          format: 'pem'
        });
        
        // Exportar como RSA PRIVATE KEY
        const rsaKeyPem = privateKeyObj.export({
          type: 'pkcs1',
          format: 'pem'
        });
        
        console.log('✅ DEBUG KEY VALIDATION: ÉXITO - Llave no encriptada convertida a RSA PRIVATE KEY');
        return {
          valida: true,
          llavePrivadaPem: rsaKeyPem
        };
        
      } catch (finalError) {
        console.log('❌ DEBUG KEY VALIDATION: Todos los formatos fallaron');
        console.log('❌ DEBUG KEY VALIDATION: Error final:', finalError.message);
        throw new Error('No se pudo procesar la llave privada: Encriptada(' + encryptedError.message + '), NoEncriptada(' + finalError.message + ')');
      }
    }
    
  } catch (error) {
    console.log('❌ DEBUG KEY VALIDATION: Error general:', error.message);
    return {
      valida: false,
      mensaje: 'Error validando llave privada: ' + error.message
    };
  }
}

function validarParCertificadoLlaveSimplificado(certPem, keyPem) {
  try {
    // Validación básica: ambos deben ser PEM válidos
    if (!certPem.includes('BEGIN CERTIFICATE') || !keyPem.includes('PRIVATE KEY')) {
      return {
        valido: false,
        mensaje: 'Formato PEM inválido'
      };
    }
    
    return {
      valido: true,
      mensaje: 'Par certificado-llave validado'
    };
  } catch (error) {
    return {
      valido: false,
      mensaje: 'Error validando par: ' + error.message
    };
  }
}

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

  // 🚨 LOGGING CRÍTICO: Verificar que el backend se ejecuta
  console.log('🚀 BACKEND EJECUTÁNDOSE:', {
    method: event.httpMethod,
    path: event.path,
    queryString: event.queryStringParameters,
    timestamp: new Date().toISOString()
  });

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
        const emisorId = event.queryStringParameters?.id;
        return await getEmisores(userId, headers, emisorId);
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

async function getEmisores(userId, headers, emisorId = null) {
  try {
    console.log('🔍 GET EMISORES: Consultando', emisorId ? `emisor específico: ${emisorId}` : 'todos los emisores');
    
    // 🌐 ACCESO GLOBAL: Todos los usuarios pueden ver todos los emisores
    console.log('📋 EMISORES: Obteniendo todos los emisores (acceso global)');
    let query = supabase
      .from('emisores')
      .select('*');
      // .eq('usuario_id', userId); // ❌ REMOVIDO: Sin filtro por usuario
    
    // Si se especifica un ID, consultar solo ese emisor
    if (emisorId) {
      query = query.eq('id', emisorId).single();
      
      const { data: emisor, error } = await query;
      
      if (error) {
        console.error('❌ GET EMISOR: Error consultando emisor específico:', error);
        throw error;
      }
      
      if (!emisor) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Emisor no encontrado' })
        };
      }
      
      console.log('✅ GET EMISOR: Emisor encontrado:', {
        id: emisor.id,
        rfc: emisor.rfc,
        nombre: emisor.nombre,
        tiene_cer: !!emisor.certificado_cer,
        tiene_key: !!emisor.certificado_key,
        numero_certificado: emisor.numero_certificado,
        estado_csd: emisor.estado_csd
      });
      
      // 🔧 CALCULAR PROPIEDADES ANTES de eliminar campos sensibles (igual que en lista)
      const tieneCer = !!emisor.certificado_cer;
      const tieneKey = !!emisor.certificado_key;
      
      console.log('🔍 DEBUG EMISOR INDIVIDUAL: Calculando propiedades:', {
        id: emisor.id,
        rfc: emisor.rfc,
        certificado_cer_length: emisor.certificado_cer ? emisor.certificado_cer.length : 0,
        certificado_key_length: emisor.certificado_key ? emisor.certificado_key.length : 0,
        tieneCer: tieneCer,
        tieneKey: tieneKey
      });
      
      // No devolver datos sensibles para emisor individual
      const { certificado_key, password_key, ...safeEmisor } = emisor;
      
      // Agregar propiedades calculadas para el frontend (igual que en lista)
      const emisorConPropiedades = {
        ...safeEmisor,
        tiene_cer: tieneCer,
        tiene_key: tieneKey,
        certificado_cer_presente: tieneCer,
        certificado_key_presente: tieneKey
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, emisor: emisorConPropiedades })
      };
    }
    
    // Consultar todos los emisores
    query = query.order('created_at', { ascending: false });
    const { data: emisores, error } = await query;

    if (error) throw error;

    // No devolver datos sensibles pero agregar propiedades calculadas
    const safeEmisores = emisores.map(emisor => {
      console.log('✅ GET EMISORES: Procesando emisor:', {
        id: emisor.id,
        rfc: emisor.rfc,
        nombre: emisor.nombre,
        tiene_cer: !!emisor.certificado_cer,
        tiene_key: !!emisor.certificado_key,
        numero_certificado: emisor.numero_certificado,
        estado_csd: emisor.estado_csd
      });
      
      // 🔧 CALCULAR PROPIEDADES ANTES de eliminar campos sensibles
      const tieneCer = !!emisor.certificado_cer;
      const tieneKey = !!emisor.certificado_key;
      
      console.log('🔍 DEBUG EMISOR: Calculando propiedades:', {
        id: emisor.id,
        rfc: emisor.rfc,
        certificado_cer_length: emisor.certificado_cer ? emisor.certificado_cer.length : 0,
        certificado_key_length: emisor.certificado_key ? emisor.certificado_key.length : 0,
        tieneCer: tieneCer,
        tieneKey: tieneKey
      });
      
      // Eliminar campos sensibles DESPUÉS de calcular propiedades
      const { certificado_key, password_key, ...safeEmisor } = emisor;
      
      // Agregar propiedades calculadas para el frontend
      return {
        ...safeEmisor,
        tiene_cer: tieneCer,
        tiene_key: tieneKey,
        certificado_cer_presente: tieneCer,
        certificado_key_presente: tieneKey
      };
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
          
          // 1.5. Procesar certificado .cer
          console.log('📜 Procesando certificado .cer...');
          const certInfo = procesarCertificadoSimplificado(certificado_cer);
          
          if (!certInfo.valido) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Error procesando certificado .cer: ' + certInfo.mensaje,
                tipo: 'CERTIFICADO_CER_INVALIDO'
              })
            };
          }
          
          console.log('✅ Certificado procesado:', {
            numero_serie: certInfo.numeroSerie,
            vigencia_desde: certInfo.vigenciaDesde,
            vigencia_hasta: certInfo.vigenciaHasta
          });
          
          // 2. Guardar llave privada SIN MANIPULACIÓN (tal como llega del frontend)
          console.log('🔑 Guardando llave privada sin manipulación...');
          console.log('🔍 DEBUG KEY: Datos de entrada:', {
            key_length: certificado_key ? certificado_key.length : 0,
            key_preview: certificado_key ? certificado_key.substring(0, 50) + '...' : 'VACIO',
            password_length: password_key ? password_key.length : 0
          });
          
          // Validación básica: solo verificar que no esté vacía
          if (!certificado_key || certificado_key.trim() === '') {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'La llave privada no puede estar vacía',
                tipo: 'LLAVE_VACIA'
              })
            };
          }
          
          const keyInfo = {
            valida: true,
            llavePrivadaOriginal: certificado_key  // Guardar tal como llega
          };
          
          console.log('✅ DEBUG KEY: Llave guardada sin manipulación:', {
            longitud: keyInfo.llavePrivadaOriginal.length,
            preview: keyInfo.llavePrivadaOriginal.substring(0, 50) + '...'
          });
          
          // 2.5. Validar que el RFC del emisor coincida con el del certificado
          console.log('🔍 Validando coincidencia RFC emisor vs certificado...');
          if (certInfo.rfcCertificado) {
            if (certInfo.rfcCertificado !== rfcClean) {
              console.log('❌ RFC NO COINCIDE:');
              console.log('  - RFC Emisor:', rfcClean);
              console.log('  - RFC Certificado:', certInfo.rfcCertificado);
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                  error: `El RFC del emisor (${rfcClean}) no coincide con el RFC del certificado (${certInfo.rfcCertificado})`,
                  tipo: 'RFC_NO_COINCIDE',
                  rfc_emisor: rfcClean,
                  rfc_certificado: certInfo.rfcCertificado
                })
              };
            } else {
              console.log('✅ RFC COINCIDE:', rfcClean, '=', certInfo.rfcCertificado);
            }
          } else {
            console.log('⚠️ No se pudo extraer RFC del certificado, continuando sin validación RFC');
          }
          
          // 3. Validar que el certificado y la llave privada coincidan
          console.log('🔗 Validando coincidencia certificado-llave...');
          const parValido = validarParCertificadoLlaveSimplificado(certInfo.certificadoPem, keyInfo.llavePrivadaPem);
          
          if (!parValido.valido) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'El certificado y la llave privada no coinciden: ' + parValido.mensaje,
                tipo: 'CERTIFICADO_KEY_NO_COINCIDEN'
              })
            };
          }
          
          // ✅ ÉXITO: Certificados procesados y validados correctamente
          certificadoInfo = {
            certificado_cer: certInfo.certificadoPem,  // 🔧 Guardar en formato PEM
            certificado_key: keyInfo.llavePrivadaOriginal,  // 🔧 Guardar SIN MANIPULACIÓN (CRÍTICO)
            password_key: password_key,
            numero_certificado: certInfo.numeroSerie,
            vigencia_desde: certInfo.vigenciaDesde,
            vigencia_hasta: certInfo.vigenciaHasta,
            validado_en: new Date().toISOString(),
            estado_validacion: 'VALIDADO_PROFESIONAL'
          };
          
          console.log('🔍 DEBUG CERTIFICADO_INFO: Objeto creado:', {
            tiene_cer: !!certificadoInfo.certificado_cer,
            tiene_key: !!certificadoInfo.certificado_key,
            cer_length: certificadoInfo.certificado_cer ? certificadoInfo.certificado_cer.length : 0,
            key_length: certificadoInfo.certificado_key ? certificadoInfo.certificado_key.length : 0,
            key_preview: certificadoInfo.certificado_key ? certificadoInfo.certificado_key.substring(0, 100) + '...' : 'VACIO'
          });
          
          console.log('✅ EMISOR: Certificados CSD procesados con procesador profesional:', {
            numero_certificado: certInfo.numeroSerie,
            vigencia_desde: certInfo.vigenciaDesde,
            vigencia_hasta: certInfo.vigenciaHasta,
            certificado_pem: !!certInfo.certificadoPem,
            llave_privada_pem: !!keyInfo.llavePrivadaPem,
            par_validado: parValido.valido
          });
        
        console.log('🔢 Número de certificado generado:', certInfo.numeroSerie, `(${certInfo.numeroSerie.length} caracteres)`);
        
        console.log('✅ EMISOR: Certificados CSD validados exitosamente con procesador profesional');
        
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
      activo: true,
      // Asignar estado CSD según si tiene certificados completos
      estado_csd: 'pendiente' // Default, se actualiza abajo si tiene certificados
      // created_at y updated_at se manejan automáticamente por la BD
    };

    // Agregar datos de certificado si existen
    if (certificadoInfo) {
      emisorData.certificado_cer = certificadoInfo.certificado_cer;
      emisorData.certificado_key = certificadoInfo.certificado_key;
      emisorData.password_key = certificadoInfo.password_key;
      emisorData.numero_certificado = certificadoInfo.numero_certificado;
      // Convertir fechas ISO a formato DATE para PostgreSQL
      emisorData.vigencia_desde = certificadoInfo.vigencia_desde; // Ya convertido a formato YYYY-MM-DD
      emisorData.vigencia_hasta = certificadoInfo.vigencia_hasta; // Ya convertido a formato YYYY-MM-DD
      
      // ✅ CORREGIR ESTADO: Si tiene certificados completos, marcar como activo
      if (certificadoInfo.certificado_cer && certificadoInfo.certificado_key && certificadoInfo.numero_certificado) {
        emisorData.estado_csd = 'activo';
        console.log('✅ EMISOR: Estado CSD asignado como ACTIVO (certificados completos)');
      } else {
        console.log('⚠️ EMISOR: Estado CSD permanece PENDIENTE (certificados incompletos)');
      }
      
      console.log('🔍 DEBUG EMISOR_DATA: Datos preparados para inserción:', {
        tiene_cer: !!emisorData.certificado_cer,
        tiene_key: !!emisorData.certificado_key,
        cer_length: emisorData.certificado_cer ? emisorData.certificado_cer.length : 0,
        key_length: emisorData.certificado_key ? emisorData.certificado_key.length : 0,
        key_preview: emisorData.certificado_key ? emisorData.certificado_key.substring(0, 100) + '...' : 'VACIO'
      });
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
    console.log('🔧 EMISOR UPDATE: Iniciando actualización de emisor...', emisorId);
    
    if (!emisorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de emisor requerido' })
      };
    }

    const {
      rfc,
      nombre,
      codigo_postal,
      regimen_fiscal,
      certificado_cer,
      certificado_key,
      password_key
    } = data;

    // Preparar datos básicos para actualización
    let updateData = {
      updated_at: new Date().toISOString()
    };

    // Actualizar campos básicos si se proporcionan
    if (rfc) updateData.rfc = rfc.toUpperCase().trim();
    if (nombre) updateData.nombre = nombre.trim();
    if (codigo_postal) updateData.codigo_postal = codigo_postal;
    if (regimen_fiscal) updateData.regimen_fiscal = regimen_fiscal;

    // === PROCESAMIENTO DE CERTIFICADOS CSD ===
    console.log('🔍 UPDATE DIAGNÓSTICO: Verificando certificados recibidos:', {
      tiene_cer: !!certificado_cer,
      tiene_key: !!certificado_key,
      tiene_password: !!password_key,
      cer_length: certificado_cer ? certificado_cer.length : 0,
      key_length: certificado_key ? certificado_key.length : 0
    });
    
    if (certificado_cer && certificado_key && password_key) {
      console.log('🔧 EMISOR UPDATE: Procesando certificados CSD...');
      
      try {
        // 🔧 FIX CRÍTICO: Usar procesador CSD profesional para conversión a PEM (UPDATE)
        console.log('🚨 CORRECCIÓN UPDATE: Usando procesador CSD profesional para certificados');
        
        // 1. Procesar certificado .cer con el procesador simplificado
        console.log('📋 UPDATE: Procesando certificado .cer...');
        const certInfo = procesarCertificadoSimplificado(certificado_cer);
        
        if (!certInfo.valido) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Error procesando certificado .cer: ' + certInfo.mensaje,
              tipo: 'CERTIFICADO_CER_INVALIDO'
            })
          };
        }
        
        // 2. Validar y convertir llave privada .key a PEM
        console.log('🔑 UPDATE: Validando y convirtiendo llave privada .key a PEM...');
        console.log('🔍 DEBUG UPDATE: Datos de llave recibidos:', {
          certificado_key_length: certificado_key.length,
          password_key_length: password_key.length,
          certificado_key_preview: certificado_key.substring(0, 50) + '...'
        });
        
        // Guardar llave privada SIN MANIPULACIÓN (tal como llega del frontend)
        const keyInfo = {
          valida: true,
          llavePrivadaOriginal: certificado_key  // Guardar tal como llega
        };
        
        if (!keyInfo.valida) {
          console.error('❌ ERROR: Llave privada inválida:', keyInfo.mensaje);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Llave privada inválida: ' + keyInfo.mensaje,
              tipo: 'validacion_llave',
              detalles: keyInfo.mensaje
            })
          };
        }
        
        console.log('✅ ÉXITO: Llave privada validada correctamente');
        console.log('🔍 DEBUG UPDATE: Llave PEM generada, longitud:', keyInfo.llavePrivadaPem.length);
        console.log('🔍 DEBUG UPDATE: Asignando llave sin manipulación a updateData.certificado_key...');
        updateData.certificado_key = keyInfo.llavePrivadaOriginal;
        console.log('🔍 DEBUG UPDATE: updateData.certificado_key asignado:', {
          assigned: !!updateData.certificado_key,
          length: updateData.certificado_key ? updateData.certificado_key.length : 0
        });
        
        // 3. Validar que el certificado y la llave privada coincidan
        console.log('🔗 UPDATE: Validando coincidencia certificado-llave...');
        const parValido = validarParCertificadoLlaveSimplificado(certInfo.certificadoPem, keyInfo.llavePrivadaPem);
        
        if (!parValido.valido) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'El certificado y la llave privada no coinciden: ' + parValido.mensaje,
              tipo: 'CERTIFICADO_KEY_NO_COINCIDEN'
            })
          };
        }
        
        // ✅ ÉXITO: Certificados procesados y validados correctamente con procesador profesional
        updateData.certificado_cer = certInfo.certificadoPem;  // 🔧 Guardar en formato PEM
        updateData.certificado_key = keyInfo.llavePrivadaOriginal;  // 🔧 Guardar SIN MANIPULACIÓN (CRÍTICO)
        updateData.password_key = password_key;
        updateData.numero_certificado = certInfo.numeroSerie;
        updateData.vigencia_desde = certInfo.vigenciaDesde;
        updateData.vigencia_hasta = certInfo.vigenciaHasta;
        updateData.estado_csd = 'activo'; // Marcar como activo si tiene certificados completos
        
        console.log('✅ UPDATE: Certificados CSD procesados con procesador profesional:', {
          numero_certificado: certInfo.numeroSerie,
          vigencia_desde: certInfo.vigenciaDesde,
          vigencia_hasta: certInfo.vigenciaHasta,
          certificado_pem: !!certInfo.certificadoPem,
          llave_privada_pem: !!keyInfo.llavePrivadaPem,
          par_validado: parValido.valido,
          estado_csd: updateData.estado_csd
        });
        
      } catch (csdError) {
        console.error('❌ UPDATE: Error procesando certificados CSD:', csdError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Error procesando certificados CSD',
            tipo: 'CSD_PROCESSING_ERROR',
            detalle: csdError.message
          })
        };
      }
    }

    console.log('🔧 UPDATE: Actualizando emisor en BD...', Object.keys(updateData));
    
    // 🚨 LOGGING CRÍTICO: Verificar updateData antes de enviar a BD
    console.log('🔍 DEBUG BD ANTES: updateData completo antes de enviar:', {
      keys: Object.keys(updateData),
      certificado_cer_present: !!updateData.certificado_cer,
      certificado_key_present: !!updateData.certificado_key,
      certificado_key_length: updateData.certificado_key ? updateData.certificado_key.length : 0,
      password_key_present: !!updateData.password_key,
      numero_certificado: updateData.numero_certificado,
      estado_csd: updateData.estado_csd
    });
    
    // Actualizar emisor en base de datos
    console.log('🔍 DEBUG BD: Ejecutando supabase.update...');
    const { data: emisor, error } = await supabase
      .from('emisores')
      .update(updateData)
      .eq('id', emisorId)
      .eq('usuario_id', userId)
      .select()
      .single();
    
    console.log('🔍 DEBUG BD: Respuesta de supabase:', {
      error: !!error,
      data_present: !!emisor,
      error_details: error
    });

    if (error) {
      console.error('❌ UPDATE: Error actualizando en BD:', error);
      throw error;
    }

    console.log('✅ UPDATE: Emisor actualizado exitosamente:', emisor.id);
    
    // 🚨 LOGGING CRÍTICO: Verificar si la llave se guardó en BD
    console.log('🔍 DEBUG BD DESPUÉS: Datos retornados por supabase:', {
      id: emisor.id,
      rfc: emisor.rfc,
      nombre: emisor.nombre,
      certificado_cer_length: emisor.certificado_cer ? emisor.certificado_cer.length : 0,
      certificado_key_length: emisor.certificado_key ? emisor.certificado_key.length : 0,
      certificado_cer_present: !!emisor.certificado_cer,
      certificado_key_present: !!emisor.certificado_key,
      password_key_present: !!emisor.password_key,
      numero_certificado: emisor.numero_certificado,
      vigencia_desde: emisor.vigencia_desde,
      vigencia_hasta: emisor.vigencia_hasta,
      estado_csd: emisor.estado_csd,
      all_fields: Object.keys(emisor)
    });
    
    // 🚨 ALERTA CRÍTICA: Si certificado_key no está presente después de la actualización
    if (!emisor.certificado_key) {
      console.error('🚨 ALERTA CRÍTICA: certificado_key NO se guardó en la base de datos!');
      console.error('🚨 DATOS ENVIADOS vs DATOS GUARDADOS:', {
        enviado_certificado_key: !!updateData.certificado_key,
        enviado_certificado_key_length: updateData.certificado_key ? updateData.certificado_key.length : 0,
        guardado_certificado_key: !!emisor.certificado_key,
        guardado_certificado_key_length: emisor.certificado_key ? emisor.certificado_key.length : 0
      });
    } else {
      console.log('✅ ÉXITO CRÍTICO: certificado_key SÍ se guardó en la base de datos!');
    }
    
    // No devolver datos sensibles
    const { certificado_key: _, password_key: __, ...safeEmisor } = emisor;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Emisor actualizado exitosamente',
        emisor: safeEmisor
      })
    };
  } catch (error) {
    console.error('❌ UPDATE: Error actualizando emisor:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al actualizar emisor',
        detalle: error.message
      })
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
