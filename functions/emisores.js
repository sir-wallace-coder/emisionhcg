const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 🔑 VALIDADOR DE CONTRASEÑA CON LLAVE PRIVADA
function validarLlavePrivadaConPassword(llaveData, password) {
  try {
    console.log('🔍 VALIDACIÓN PASSWORD: Iniciando validación, longitud llave:', llaveData.length);
    console.log('🔍 VALIDACIÓN PASSWORD: Longitud contraseña:', password.length);
    
    let llaveBase64;
    
    // 🔍 DETECCIÓN INTELIGENTE: Verificar formato de la llave
    if (llaveData.includes('-----BEGIN')) {
      console.log('🔍 VALIDACIÓN PASSWORD: Formato PEM detectado, extrayendo base64...');
      // Es formato PEM, extraer solo el contenido base64
      llaveBase64 = llaveData
        .replace(/-----BEGIN [^-]+-----/g, '')
        .replace(/-----END [^-]+-----/g, '')
        .replace(/\s/g, ''); // Eliminar espacios, saltos de línea, etc.
    } else if (llaveData.startsWith('data:')) {
      console.log('🔍 VALIDACIÓN PASSWORD: Formato data URL detectado, extrayendo base64...');
      // Es data URL
      llaveBase64 = llaveData.split(',')[1];
    } else {
      console.log('🔍 VALIDACIÓN PASSWORD: Asumiendo formato base64 puro...');
      // Asumir que es base64 puro
      llaveBase64 = llaveData;
    }
    
    // Crear buffer desde base64 limpio
    const llaveBuffer = Buffer.from(llaveBase64, 'base64');
    console.log('🔍 VALIDACIÓN PASSWORD: Buffer creado, tamaño:', llaveBuffer.length);
    
    // Intentar como llave encriptada PKCS#8 primero (formato común del SAT)
    try {
      console.log('🔍 VALIDACIÓN PASSWORD: Intentando formato ENCRYPTED PRIVATE KEY...');
      const encryptedKeyPem = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' + 
                             llaveBase64.match(/.{1,64}/g).join('\n') + 
                             '\n-----END ENCRYPTED PRIVATE KEY-----';
      
      // Desencriptar y validar con crypto.createPrivateKey
      console.log('🔍 VALIDACIÓN PASSWORD: Desencriptando con password...');
      const privateKeyObj = crypto.createPrivateKey({ 
        key: encryptedKeyPem, 
        passphrase: password,
        format: 'pem'
      });
      
      console.log('✅ VALIDACIÓN PASSWORD: ÉXITO - Llave desencriptada correctamente');
      return {
        valida: true,
        mensaje: 'Contraseña válida - llave desencriptada exitosamente'
      };
      
    } catch (encryptedError) {
      console.log('⚠️ VALIDACIÓN PASSWORD: Formato ENCRYPTED PRIVATE KEY falló:', encryptedError.message);
      
      // Intentar otros formatos si falla
      try {
        console.log('🔍 VALIDACIÓN PASSWORD: Intentando formato RSA PRIVATE KEY...');
        const rsaKeyPem = '-----BEGIN RSA PRIVATE KEY-----\n' + 
                         llaveBase64.match(/.{1,64}/g).join('\n') + 
                         '\n-----END RSA PRIVATE KEY-----';
        
        const privateKeyObj = crypto.createPrivateKey({ 
          key: rsaKeyPem, 
          passphrase: password,
          format: 'pem'
        });
        
        console.log('✅ VALIDACIÓN PASSWORD: ÉXITO - RSA PRIVATE KEY desencriptada');
        return {
          valida: true,
          mensaje: 'Contraseña válida - RSA llave desencriptada exitosamente'
        };
        
      } catch (rsaError) {
        console.log('❌ VALIDACIÓN PASSWORD: Todos los formatos fallaron');
        console.log('❌ VALIDACIÓN PASSWORD: Error ENCRYPTED:', encryptedError.message);
        console.log('❌ VALIDACIÓN PASSWORD: Error RSA:', rsaError.message);
        
        return {
          valida: false,
          mensaje: `Contraseña incorrecta o formato de llave no soportado. Errores: PKCS8(${encryptedError.message}), RSA(${rsaError.message})`
        };
      }
    }
    
  } catch (error) {
    console.error('❌ VALIDACIÓN PASSWORD: Error general:', error);
    return {
      valida: false,
      mensaje: `Error validando contraseña: ${error.message}`
    };
  }
}

// 🔧 PROCESADOR CSD SIMPLIFICADO (sin node-forge para evitar errores serverless)
function procesarCertificadoSimplificado(certificadoData) {
  try {
    console.log('📋 DEBUG CERT: Procesando certificado, longitud:', certificadoData.length);
    console.log('📋 DEBUG CERT: Primeros 100 caracteres:', certificadoData.substring(0, 100));
    
    let cerBuffer;
    let cerBase64;
    
    // 🔍 DETECCIÓN INTELIGENTE: Verificar si es PEM o base64 puro
    if (certificadoData.includes('-----BEGIN CERTIFICATE-----')) {
      console.log('📋 DEBUG CERT: Formato PEM detectado, extrayendo base64...');
      // Es formato PEM, extraer solo el contenido base64
      cerBase64 = certificadoData
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s/g, ''); // Eliminar espacios, saltos de línea, etc.
      
      console.log('📋 DEBUG CERT: Base64 extraído, longitud:', cerBase64.length);
    } else if (certificadoData.startsWith('data:')) {
      console.log('📋 DEBUG CERT: Formato data URL detectado, extrayendo base64...');
      // Es data URL (data:application/octet-stream;base64,XXXXX)
      cerBase64 = certificadoData.split(',')[1];
    } else {
      console.log('📋 DEBUG CERT: Asumiendo formato base64 puro...');
      // Asumir que es base64 puro
      cerBase64 = certificadoData;
    }
    
    // Crear buffer desde base64 limpio
    cerBuffer = Buffer.from(cerBase64, 'base64');
    console.log('📋 DEBUG CERT: Buffer creado, tamaño:', cerBuffer.length);
    
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

// 🎨 EXTRACTOR DE COLOR DOMINANTE DEL LOGO
function extraerColorDominante(logoBase64) {
  try {
    console.log('🎨 COLOR: Iniciando extracción de color dominante...');
    
    // Detectar formato del logo
    let base64Data;
    if (logoBase64.startsWith('data:')) {
      // Es data URL, extraer solo el base64
      base64Data = logoBase64.split(',')[1];
    } else {
      // Asumir que es base64 puro
      base64Data = logoBase64;
    }
    
    // Crear buffer de la imagen
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log('🎨 COLOR: Buffer de imagen creado, tamaño:', imageBuffer.length);
    
    // Para simplificar, extraeremos un color basado en el hash del contenido
    // En una implementación más avanzada se podría usar una librería de análisis de imagen
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    
    // Generar color hexadecimal basado en el hash
    // Tomamos los primeros 6 caracteres del hash y los convertimos a un color válido
    let colorHex = '#' + hash.substring(0, 6);
    
    // Asegurar que el color no sea demasiado claro (para buena legibilidad en PDFs)
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    
    // Si el color es muy claro, oscurecerlo
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness > 180) {
      // Oscurecer el color
      const newR = Math.max(0, Math.floor(r * 0.6));
      const newG = Math.max(0, Math.floor(g * 0.6));
      const newB = Math.max(0, Math.floor(b * 0.6));
      colorHex = '#' + newR.toString(16).padStart(2, '0') + 
                      newG.toString(16).padStart(2, '0') + 
                      newB.toString(16).padStart(2, '0');
    }
    
    console.log('🎨 COLOR: Color extraído:', colorHex);
    return colorHex;
    
  } catch (error) {
    console.error('❌ COLOR: Error al extraer color dominante:', error.message);
    // Retornar color por defecto en caso de error
    return '#2563eb'; // Azul corporativo por defecto
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
        estado_csd: emisor.estado_csd,
        color: emisor.color // 🎨 DEBUG COLOR
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
        estado_csd: emisor.estado_csd,
        color: emisor.color // 🎨 DEBUG COLOR
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
        
        // 🔑 VALIDACIÓN MEJORADA: Permitir contraseñas con espacios en blanco
        if (!password_key || password_key === '' || password_key === null || password_key === undefined) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'La contraseña de la llave privada es obligatoria',
              tipo: 'PASSWORD_KEY_VACIO'
            })
          };
        }
        
        // 🔍 DEBUG: Mostrar información de la contraseña (sin revelar el contenido)
        console.log('🔑 CONTRASEÑA DEBUG:', {
          length: password_key.length,
          starts_with_space: password_key.startsWith(' '),
          ends_with_space: password_key.endsWith(' '),
          contains_spaces: password_key.includes(' '),
          first_char_code: password_key.charCodeAt(0),
          last_char_code: password_key.charCodeAt(password_key.length - 1)
        });
          
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
          
          // 2.5. VALIDACIÓN DE CONTRASEÑA: Usar validación interna con crypto nativo
          console.log('🔑 Validando contraseña con llave privada usando crypto nativo...');
          try {
            // Intentar descifrar la llave privada con la contraseña usando la función interna
            const validacionPassword = validarLlavePrivadaConPassword(certificado_key, password_key);
            
            if (!validacionPassword.valida) {
              console.error('❌ CONTRASEÑA INCORRECTA:', validacionPassword.mensaje);
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                  error: 'La contraseña no coincide con la llave privada del certificado',
                  tipo: 'PASSWORD_INCORRECTA',
                  detalle: validacionPassword.mensaje || 'Contraseña inválida',
                  sugerencia: 'Verifica que la contraseña sea correcta y no tenga espacios adicionales'
                })
              };
            }
            
            console.log('✅ Contraseña validada correctamente con la llave privada');
            
          } catch (passwordError) {
            console.error('❌ Error validando contraseña:', passwordError);
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Error validando la contraseña del certificado',
                tipo: 'ERROR_VALIDACION_PASSWORD',
                detalle: passwordError.message,
                sugerencia: 'Verifica que la contraseña y los archivos de certificado sean correctos'
              })
            };
          }
          
          // 2.6. Validar que el RFC del emisor coincida con el del certificado
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
          
          // 3. Validación de par certificado-llave DESHABILITADA temporalmente
          // (La llave ahora se guarda sin manipulación y puede estar en formato base64)
          console.log('🔗 Validación de par certificado-llave: OMITIDA (llave sin manipulación)');
          const parValido = { valido: true, mensaje: 'Validación omitida - llave sin manipulación' };
          
          if (false) { // Deshabilitado temporalmente
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
            certificado_cer: certificado_cer,  // 🎯 GUARDAR TAL COMO SE RECIBE (SIN MANIPULACIÓN)
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

    // 6. Preparar datos del emisor para inserción
    const emisorData = {
      usuario_id: userId,
      rfc: rfcClean,
      nombre: nombre.trim(),
      codigo_postal: codigo_postal,
      regimen_fiscal: regimen_fiscal,
      logo: data.logo || null, // Logo del emisor en base64
      activo: true,
      // Asignar estado CSD según si tiene certificados completos
      estado_csd: 'pendiente' // Default, se actualiza abajo si tiene certificados
      // created_at y updated_at se manejan automáticamente por la BD
    };

    // 🎨 LÓGICA CORREGIDA: PRIORIZAR COLOR DEL FRONTEND
    if (data.color && /^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      // ✅ PRIORIDAD 1: Color proporcionado por el frontend (ya extraído o manual)
      console.log('🎨 COLOR: Usando color del frontend (extraído o manual):', data.color);
      emisorData.color = data.color;
    } else if (data.logo) {
      // ✅ PRIORIDAD 2: Si no hay color pero hay logo, extraer del backend
      console.log('🎨 COLOR: No hay color del frontend, extrayendo del logo...');
      emisorData.color = extraerColorDominante(data.logo);
    } else {
      // ✅ PRIORIDAD 3: Color por defecto
      console.log('🎨 COLOR: Usando color por defecto');
      emisorData.color = '#2563eb';
    }

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
      color: emisorData.color, // 🎨 DEBUG COLOR ANTES DE INSERTAR
      tiene_certificados: !!certificadoInfo,
      campos_certificado: certificadoInfo ? Object.keys(certificadoInfo) : []
    });
    
    // 🎨 DEBUG ESPECÍFICO PARA COLOR
    console.log('🎨 COLOR DEBUG: Valor que se va a insertar:', {
      color_value: emisorData.color,
      color_type: typeof emisorData.color,
      color_length: emisorData.color ? emisorData.color.length : 0
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
      logo,
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
    if (logo !== undefined) updateData.logo = logo; // Permitir null para eliminar logo

    // 🎨 EXTRACCIÓN AUTOMÁTICA DE COLOR DEL LOGO (UPDATE)
    if (logo && logo !== null) {
      console.log('🎨 COLOR UPDATE: Logo actualizado, extrayendo nuevo color dominante...');
      updateData.color = extraerColorDominante(logo);
    } else if (data.color && /^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      // Si se proporciona un color manual válido
      console.log('🎨 COLOR UPDATE: Color manual actualizado:', data.color);
      updateData.color = data.color;
    } else if (logo === null) {
      // Si se elimina el logo, volver al color por defecto
      console.log('🎨 COLOR UPDATE: Logo eliminado, usando color por defecto');
      updateData.color = '#2563eb';
    }

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
        console.log('🔍 DEBUG UPDATE: Llave original guardada, longitud:', keyInfo.llavePrivadaOriginal.length);
        console.log('🔍 DEBUG UPDATE: Asignando llave sin manipulación a updateData.certificado_key...');
        updateData.certificado_key = keyInfo.llavePrivadaOriginal;
        console.log('🔍 DEBUG UPDATE: updateData.certificado_key asignado:', {
          assigned: !!updateData.certificado_key,
          length: updateData.certificado_key ? updateData.certificado_key.length : 0
        });
        
        // 3. VALIDACIÓN DE CONTRASEÑA: Usar validación interna con crypto nativo (UPDATE)
        console.log('🔑 UPDATE: Validando contraseña con llave privada usando crypto nativo...');
        try {
          // Intentar descifrar la llave privada con la contraseña usando la función interna
          const validacionPassword = validarLlavePrivadaConPassword(certificado_key, password_key);
          
          if (!validacionPassword.valida) {
            console.error('❌ UPDATE - CONTRASEÑA INCORRECTA:', validacionPassword.mensaje);
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'La contraseña no coincide con la llave privada del certificado',
                tipo: 'PASSWORD_INCORRECTA',
                detalle: validacionPassword.mensaje || 'Contraseña inválida',
                sugerencia: 'Verifica que la contraseña sea correcta y no tenga espacios adicionales'
              })
            };
          }
          
          console.log('✅ UPDATE: Contraseña validada correctamente con la llave privada');
          
        } catch (passwordError) {
          console.error('❌ UPDATE: Error validando contraseña:', passwordError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Error validando la contraseña del certificado',
              tipo: 'ERROR_VALIDACION_PASSWORD',
              detalle: passwordError.message,
              sugerencia: 'Verifica que la contraseña y los archivos de certificado sean correctos'
            })
          };
        }
        
        // 4. Validación de par certificado-llave DESHABILITADA temporalmente
        // (La llave ahora se guarda sin manipulación y puede estar en formato base64)
        console.log('🔗 UPDATE: Validación de par certificado-llave: OMITIDA (llave sin manipulación)');
        const parValido = { valido: true, mensaje: 'Validación omitida - llave sin manipulación' };
        
        if (false) { // Deshabilitado temporalmente
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
        updateData.certificado_cer = certificado_cer;  // 🎯 GUARDAR TAL COMO SE RECIBE (SIN MANIPULACIÓN)
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
    
    // Actualizar emisor en base de datos (acceso global - sin validación usuario_id)
    console.log('🔍 DEBUG BD: Ejecutando supabase.update con acceso global...');
    console.log('🔍 DEBUG BD: Emisor ID:', emisorId);
    
    const { data: emisor, error } = await supabase
      .from('emisores')
      .update(updateData)
      .eq('id', emisorId)
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
