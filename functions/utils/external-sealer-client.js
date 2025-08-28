/**
 * 🔐 Cliente para Servicio Externo de Sellado CFDI
 * 
 * Este módulo maneja la comunicación con el servicio externo de sellado.
 * Envía certificados en base64 y contraseña, recibe XML sellado.
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

// form-data import estático para compatibilidad serverless
const FormData = require('form-data');

// Usar fetch nativo de Node.js 18+ (disponible en Netlify)
// No necesitamos importar node-fetch, usamos el fetch global

/**
 * Configuración del servicio externo de sellado
 */
const EXTERNAL_SEALER_CONFIG = {
    // URLs del servicio externo - consulta.click (endpoints reales)
    loginUrl: process.env.EXTERNAL_SEALER_LOGIN_URL || 'https://consulta.click/api/login',
    sellarUrl: process.env.EXTERNAL_SEALER_URL || 'https://consulta.click/api/v1/cfdi-sellar',
    
    // Credenciales para login - consulta.click usa email
    email: process.env.EXTERNAL_SEALER_EMAIL || 'admin@cfdi.test',
    password: process.env.EXTERNAL_SEALER_PASSWORD || 'password123',
    
    // Timeout en milisegundos (aumentado para sellado complejo)
    timeout: parseInt(process.env.EXTERNAL_SEALER_TIMEOUT) || 90000,  // 90 segundos
    
    // Reintentos en caso de error
    retries: parseInt(process.env.EXTERNAL_SEALER_RETRIES) || 3
};

/**
 * Cache del token de autenticación
 */
let tokenCache = {
    token: null,
    expiresAt: null,
    isRefreshing: false
};

/**
 * Realiza login en el servicio externo y obtiene token de autenticación
 * 
 * @returns {Promise<string>} Token de autenticación
 */
async function loginServicioExterno() {
    console.log('🔐 EXTERNAL LOGIN: Iniciando login en servicio externo');
    console.log('🔍 LOGIN DEBUG: Configuración completa:');
    console.log('  - loginUrl:', EXTERNAL_SEALER_CONFIG.loginUrl);
    console.log('  - email:', EXTERNAL_SEALER_CONFIG.email);
    console.log('  - password length:', EXTERNAL_SEALER_CONFIG.password ? EXTERNAL_SEALER_CONFIG.password.length : 'N/A');
    console.log('  - timeout:', EXTERNAL_SEALER_CONFIG.timeout);

    // Validar credenciales
    if (!EXTERNAL_SEALER_CONFIG.email || !EXTERNAL_SEALER_CONFIG.password) {
        console.error('❌ CREDENCIALES: Email configurado:', !!EXTERNAL_SEALER_CONFIG.email);
        console.error('❌ CREDENCIALES: Password configurado:', !!EXTERNAL_SEALER_CONFIG.password);
        console.error('❌ CREDENCIALES: process.env.EXTERNAL_SEALER_EMAIL:', !!process.env.EXTERNAL_SEALER_EMAIL);
        console.error('❌ CREDENCIALES: process.env.EXTERNAL_SEALER_PASSWORD:', !!process.env.EXTERNAL_SEALER_PASSWORD);
        throw new Error('Credenciales de login no configuradas (EXTERNAL_SEALER_EMAIL/PASSWORD)');
    }
    
    if (!EXTERNAL_SEALER_CONFIG.loginUrl) {
        throw new Error('URL de login no configurada (EXTERNAL_SEALER_LOGIN_URL)');
    }
    
    const loginPayload = {
        email: EXTERNAL_SEALER_CONFIG.email,
        password: EXTERNAL_SEALER_CONFIG.password
    };
    
    console.log('📤 EXTERNAL LOGIN: Enviando credenciales a:', EXTERNAL_SEALER_CONFIG.loginUrl);
    console.log('👤 EXTERNAL LOGIN: Email:', EXTERNAL_SEALER_CONFIG.email);
    
    try {
        const response = await fetch(EXTERNAL_SEALER_CONFIG.loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CFDI-Sistema-Completo/1.0.0'
            },
            body: JSON.stringify(loginPayload),
            timeout: EXTERNAL_SEALER_CONFIG.timeout
        });
        
        console.log('📥 EXTERNAL LOGIN: Response status:', response.status);
        console.log('📥 EXTERNAL LOGIN: Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Capturar respuesta como texto primero para diagnóstico
        const responseText = await response.text();
        console.log('📥 EXTERNAL LOGIN: Response text length:', responseText.length);
        console.log('📥 EXTERNAL LOGIN: Response text preview:', responseText.substring(0, 500));
        
        if (!response.ok) {
            console.error('❌ EXTERNAL LOGIN: Login falló con status:', response.status);
            console.error('❌ EXTERNAL LOGIN: Error response completa:', responseText);
            throw new Error(`Login falló con status ${response.status}: ${responseText}`);
        }
        
        // Intentar parsear JSON
        let loginResult;
        try {
            loginResult = JSON.parse(responseText);
            console.log('✅ EXTERNAL LOGIN: JSON parseado exitosamente');
        } catch (parseError) {
            console.error('❌ EXTERNAL LOGIN: Error parseando JSON:', parseError.message);
            console.error('❌ EXTERNAL LOGIN: Response que causó error:', responseText);
            throw new Error(`Error parseando respuesta JSON: ${parseError.message}`);
        }
        
        console.log('✅ EXTERNAL LOGIN: Autenticación exitosa');
        
        // 🔍 DEBUG CRÍTICO: Ver respuesta completa del login
        console.log('🔍 LOGIN DEBUG: Respuesta completa del servicio:', JSON.stringify(loginResult, null, 2));
        console.log('🔍 LOGIN DEBUG: Claves disponibles:', Object.keys(loginResult));
        console.log('🔍 LOGIN DEBUG: Tipo de loginResult:', typeof loginResult);
        
        // Extraer token y tiempo de expiración (formato consulta.click)
        const token = loginResult.access_token || loginResult.token;
        const tokenType = loginResult.token_type || 'Bearer';
        const expiresIn = loginResult.expires_in || 3600; // Default 1 hora
        
        if (!token) {
            throw new Error('Token no recibido en respuesta de login');
        }
        
        // Guardar en cache
        tokenCache.token = token;
        tokenCache.expiresAt = Date.now() + (expiresIn * 1000) - 60000; // -1 minuto de margen
        tokenCache.isRefreshing = false;
        
        return token;
        
    } catch (error) {
        console.error('❌ EXTERNAL LOGIN: Error en login:', error.message);
        tokenCache.isRefreshing = false;
        throw new Error(`Error de login: ${error.message}`);
    }
}

/**
 * Obtiene token válido (del cache o haciendo login)
 * 
 * @returns {Promise<string>} Token válido
 */
async function obtenerTokenValido() {
    // 🚨 DEBUG CRÍTICO: Estado inicial del cache
    console.log('🔍 TOKEN DEBUG: Estado inicial del cache:');
    console.log('  - tokenCache.token existe:', !!tokenCache.token);
    console.log('  - tokenCache.token length:', tokenCache.token ? tokenCache.token.length : 'N/A');
    console.log('  - tokenCache.expiresAt:', tokenCache.expiresAt);
    console.log('  - Date.now():', Date.now());
    console.log('  - Token válido:', tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt);
    console.log('  - tokenCache.isRefreshing:', tokenCache.isRefreshing);
    
    // Si hay token válido en cache, usarlo
    if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
        console.log('🎫 TOKEN CACHE: Usando token del cache');
        console.log('  - Token length:', tokenCache.token.length);
        console.log('  - Token primeros 20:', tokenCache.token.substring(0, 20));
        return tokenCache.token;
    }
    
    // Si ya se está refrescando, esperar
    if (tokenCache.isRefreshing) {
        console.log('⏳ TOKEN CACHE: Esperando refresh en progreso...');
        // Esperar hasta 10 segundos
        for (let i = 0; i < 100; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!tokenCache.isRefreshing && tokenCache.token) {
                return tokenCache.token;
            }
        }
        throw new Error('Timeout esperando refresh de token');
    }
    
    // Hacer login para obtener nuevo token
    console.log('🔄 TOKEN CACHE: Token expirado o no existe, haciendo login...');
    tokenCache.isRefreshing = true;
    
    try {
        const loginResult = await loginServicioExterno();
        
        // 🎯 CORRECCIÓN CRÍTICA: loginServicioExterno() retorna string directo, no objeto
        if (loginResult && typeof loginResult === 'string' && loginResult.trim() !== '') {
            // Actualizar cache con nuevo token
            tokenCache.token = loginResult;
            tokenCache.expiresAt = Date.now() + (55 * 60 * 1000); // 55 minutos
            tokenCache.isRefreshing = false;
            
            console.log('✅ TOKEN CACHE: Nuevo token obtenido y guardado');
            console.log('  - Token length:', tokenCache.token.length);
            console.log('  - Token primeros 20:', tokenCache.token.substring(0, 20));
            
            return tokenCache.token;
        } else {
            tokenCache.isRefreshing = false;
            console.error('❌ TOKEN CACHE: loginResult no es string válido:', typeof loginResult, loginResult);
            throw new Error('Login exitoso pero token vacío en respuesta');
        }
    } catch (error) {
        tokenCache.isRefreshing = false;
        console.error('❌ TOKEN CACHE: Error en login:', error.message);
        throw new Error('Error obteniendo token: ' + error.message);
    }
}

/**
 * Envía datos al servicio externo de sellado y recibe XML sellado
 * 
 * @param {Object} params - Parámetros de sellado
 * @param {string} params.xmlSinSellar - XML sin sellar (string completo)
 * @param {string} params.certificadoBase64 - Certificado (.cer) en base64
 * @param {string} params.llavePrivadaBase64 - Llave privada (.key) en base64
 * @param {string} params.passwordLlave - Contraseña de la llave privada
 * @param {string} params.rfc - RFC del emisor
 * @param {string} params.versionCfdi - Versión CFDI (3.3 o 4.0)
 * @returns {Promise<Object>} Resultado del sellado externo
 */
async function sellarConServicioExterno({
    xmlSinSellar,
    certificadoBase64,
    llavePrivadaBase64,
    passwordLlave,
    rfc,
    versionCfdi = '4.0'
}) {
    console.log('🚀🚀🚀 EXTERNAL SEALER NUEVO: FUNCIÓN INICIADA - ' + new Date().toISOString() + ' 🚀🚀🚀');
    console.log('🆕🆕🆕 CÓDIGO NUEVO EJECUTÁNDOSE - COMMIT 6ac272c - DEBUG DETALLADO ACTIVO 🆕🆕🆕');
    console.log('📋 EXTERNAL SEALER: Parámetros recibidos:', {
        xmlLength: xmlSinSellar?.length || 0,
        certificadoLength: certificadoBase64?.length || 0,
        llaveLength: llavePrivadaBase64?.length || 0,
        passwordLength: passwordLlave?.length || 0,
        rfc,
        versionCfdi
    });
    
    // Validar parámetros requeridos
    if (!xmlSinSellar || !certificadoBase64 || !llavePrivadaBase64 || !passwordLlave) {
        console.error('❌ EXTERNAL SEALER: Faltan parámetros requeridos');
        throw new Error('Faltan parámetros requeridos para el sellado externo');
    }
    
    console.log('✅ EXTERNAL SEALER: Parámetros validados, obteniendo token...');
    
    // Obtener token válido
    let token;
    try {
        token = await obtenerTokenValido();
        console.log('✅ EXTERNAL SEALER: Token obtenido exitosamente');
    } catch (tokenError) {
        console.error('❌ EXTERNAL SEALER: Error obteniendo token:', tokenError.message);
        throw new Error('Error obteniendo token: ' + tokenError.message);
    }
    if (!token) {
        throw new Error('No se pudo obtener token de autenticación');
    }

    // Convertir XML a Base64 según especificaciones del usuario
    const xmlBase64 = Buffer.from(xmlSinSellar, 'utf8').toString('base64');
    
    // Crear payload JSON según especificaciones del usuario
    const payload = {
        xml: xmlBase64,              // base64 file xml
        certificado: certificadoBase64,  // base64 certificado
        key: llavePrivadaBase64,     // base64 key private
        password: passwordLlave      // string password
    };

    // 🔍 DEBUG: Verificar datos exactos enviados según especificaciones del usuario
    console.log('📊 EXTERNAL SEALER: Payload JSON creado según especificaciones:');
    console.log('  - XML original length:', xmlSinSellar.length);
    console.log('  - XML base64 length:', xmlBase64.length);
    console.log('  - XML preview:', xmlSinSellar.substring(0, 100) + '...');
    console.log('  - Certificado base64 length:', certificadoBase64.length);
    console.log('  - Certificado preview:', certificadoBase64.substring(0, 50) + '...');
    console.log('  - Key base64 length:', llavePrivadaBase64.length);
    console.log('  - Key preview:', llavePrivadaBase64.substring(0, 50) + '...');
    console.log('  - Password length:', passwordLlave.length);
    console.log('  - RFC:', rfc);

    // 🔍 DEBUG: Verificar token y headers antes del envío
    console.log('🔐 EXTERNAL SEALER: Token para Authorization:', token ? `${token.substring(0, 20)}...` : 'TOKEN VACIO');
    console.log('🔐 EXTERNAL SEALER: URL de sellado:', EXTERNAL_SEALER_CONFIG.sellarUrl);
    console.log('🔄 EXTERNAL SEALER: Usando JSON según especificaciones del usuario');
    
    // 🔍 DEBUG: Verificar payload JSON serializado
    const payloadString = JSON.stringify(payload);
    console.log('📋 EXTERNAL SEALER: Payload JSON length:', payloadString.length);
    console.log('📋 EXTERNAL SEALER: Payload preview (primeros 200 chars):', payloadString.substring(0, 200));
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    console.log('🔐 EXTERNAL SEALER: Headers completos:', {
        Authorization: headers.Authorization ? `Bearer ${token.substring(0, 20)}...` : 'MISSING',
        'Content-Type': headers['Content-Type'],
        'Content-Length': 'AUTO'
    });
    
    // Envío HTTP con JSON según especificaciones del usuario
    console.log('🚀 EXTERNAL SEALER: Enviando request de sellado con JSON...');
    const response = await fetch(EXTERNAL_SEALER_CONFIG.sellarUrl, {
        method: 'POST',
        headers,
        body: payloadString,
        timeout: EXTERNAL_SEALER_CONFIG.timeout
    });
    
    const responseText = await response.text();
    
    // 🔍 DEBUG: Capturar respuesta antes de JSON.parse
    console.log('📥 EXTERNAL SEALER: Response status:', response.status);
    console.log('📥 EXTERNAL SEALER: Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📥 EXTERNAL SEALER: Response text length:', responseText.length);
    console.log('📥 EXTERNAL SEALER: Response text preview (primeros 200 chars):', responseText.substring(0, 200));
    
    if (!response.ok) {
        console.error('❌ EXTERNAL SEALER: Response no exitosa:', response.status);
        console.error('❌ EXTERNAL SEALER: Response completa:', responseText);
        throw new Error(`Error ${response.status}: ${responseText}`);
    }
    
    // Detectar si la respuesta es HTML (redirección a login)
    if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.includes('<title>Acceso -')) {
        console.error('🚨 EXTERNAL SEALER: Servicio redirigió a página de login - Token inválido/expirado');
        console.error('🚨 EXTERNAL SEALER: Headers enviados:', {
            'Authorization': headers['Authorization'] ? 'Bearer [PRESENTE]' : '[AUSENTE]',
            'Content-Type': headers['Content-Type']
        });
        throw new Error('ERROR DE AUTENTICACIÓN: El servicio externo redirigió a la página de login. El token de autorización es inválido, ha expirado, o no se envió correctamente. Verifica las credenciales del servicio externo.');
    }
    
    // Intentar parsear JSON con manejo de errores
    let result;
    try {
        result = JSON.parse(responseText);
        console.log('✅ EXTERNAL SEALER: JSON parseado exitosamente');
    } catch (parseError) {
        console.error('❌ EXTERNAL SEALER: Error parseando JSON:', parseError.message);
        console.error('❌ EXTERNAL SEALER: Response que causó error:', responseText.substring(0, 200));
        throw new Error(`Error parseando respuesta JSON: ${parseError.message}. Respuesta: ${responseText.substring(0, 200)}`);
    }
    return {
        exito: true,
        xmlSellado: result.xmlSellado || result.xml_sellado,
        sello: result.sello,
        cadenaOriginal: result.cadenaOriginal || result.cadena_original,
        numeroCertificado: result.numeroCertificado || result.numero_certificado
    };
}

/**
 * Valida la configuración del servicio externo
 * @returns {Object} Estado de la configuración
 */
function validarConfiguracionServicioExterno() {
    const config = {
        login_url_configurada: !!EXTERNAL_SEALER_CONFIG.loginUrl,
        sellar_url_configurada: !!EXTERNAL_SEALER_CONFIG.sellarUrl,
        email_configurado: !!EXTERNAL_SEALER_CONFIG.email,
        password_configurado: !!EXTERNAL_SEALER_CONFIG.password,
        timeout: EXTERNAL_SEALER_CONFIG.timeout,
        retries: EXTERNAL_SEALER_CONFIG.retries,
        token_en_cache: !!tokenCache.token,
        token_valido: tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt
    };

    console.log('🔧 SELLADO EXTERNO: Configuración actual:', config);
    return config;
}

/**
 * Prueba la conectividad con el servicio externo (incluyendo login)
 * @returns {Promise<Object>} Resultado de la prueba
 */
async function probarConectividadServicioExterno() {
    try {
        console.log('🔍 SELLADO EXTERNO: Probando conectividad con servicio externo');
        
        const resultado = {
            login_test: null,
            sellar_url_test: null,
            token_test: null,
            success: false,
            error: null
        };
        
        // 1. Probar URL de login
        if (!EXTERNAL_SEALER_CONFIG.loginUrl) {
            resultado.error = 'URL de login no configurada';
            return resultado;
        }
        
        console.log('🔍 Probando URL de login:', EXTERNAL_SEALER_CONFIG.loginUrl);
        try {
            const loginResponse = await fetch(EXTERNAL_SEALER_CONFIG.loginUrl, {
                method: 'HEAD',
                timeout: 5000
            });
            resultado.login_test = {
                success: true,
                status: loginResponse.status,
                url: EXTERNAL_SEALER_CONFIG.loginUrl
            };
        } catch (error) {
            resultado.login_test = {
                success: false,
                error: error.message,
                url: EXTERNAL_SEALER_CONFIG.loginUrl
            };
        }
        
        // 2. Probar URL de sellado
        if (!EXTERNAL_SEALER_CONFIG.sellarUrl) {
            resultado.error = 'URL de sellado no configurada';
            return resultado;
        }
        
        console.log('🔍 Probando URL de sellado:', EXTERNAL_SEALER_CONFIG.sellarUrl);
        try {
            const sellarResponse = await fetch(EXTERNAL_SEALER_CONFIG.sellarUrl, {
                method: 'HEAD',
                timeout: 5000
            });
            resultado.sellar_url_test = {
                success: true,
                status: sellarResponse.status,
                url: EXTERNAL_SEALER_CONFIG.sellarUrl
            };
        } catch (error) {
            resultado.sellar_url_test = {
                success: false,
                error: error.message,
                url: EXTERNAL_SEALER_CONFIG.sellarUrl
            };
        }
        
        // 3. Probar login completo (si hay credenciales)
        if (EXTERNAL_SEALER_CONFIG.email && EXTERNAL_SEALER_CONFIG.password) {
            console.log('🔍 Probando login completo...');
            try {
                const token = await loginServicioExterno();
                resultado.token_test = {
                    success: true,
                    token_obtenido: !!token,
                    token_length: token ? token.length : 0
                };
            } catch (error) {
                resultado.token_test = {
                    success: false,
                    error: error.message
                };
            }
        } else {
            resultado.token_test = {
                success: false,
                error: 'Credenciales no configuradas'
            };
        }
        
        // Determinar éxito general
        resultado.success = resultado.login_test?.success && 
                           resultado.sellar_url_test?.success && 
                           resultado.token_test?.success;
        
        console.log('✅ SELLADO EXTERNO: Prueba de conectividad completada');
        return resultado;

    } catch (error) {
        console.error('❌ SELLADO EXTERNO: Error en prueba de conectividad:', error.message);
        return {
            success: false,
            error: error.message,
            login_test: null,
            sellar_url_test: null,
            token_test: null
        };
    }
}

module.exports = {
    sellarConServicioExterno,
    loginServicioExterno,
    obtenerTokenValido,
    validarConfiguracionServicioExterno,
    probarConectividadServicioExterno,
    EXTERNAL_SEALER_CONFIG
};
