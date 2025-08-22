/**
 * 🔐 Cliente para Servicio Externo de Sellado CFDI
 * 
 * Este módulo maneja la comunicación con el servicio externo de sellado.
 * Envía certificados en base64 y contraseña, recibe XML sellado.
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

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

/**
 * Configuración del servicio externo de sellado
 */
const EXTERNAL_SEALER_CONFIG = {
    // URLs del servicio externo - consulta.click
    loginUrl: process.env.EXTERNAL_SEALER_LOGIN_URL || 'https://consulta.click/api/login',
    sellarUrl: process.env.EXTERNAL_SEALER_URL || 'https://consulta.click/api/v1/sellado',
    
    // Credenciales para login - consulta.click usa email
    email: process.env.EXTERNAL_SEALER_EMAIL || '',
    password: process.env.EXTERNAL_SEALER_PASSWORD || '',
    
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
        const fetchFn = await loadFetch();
        const response = await fetchFn(EXTERNAL_SEALER_CONFIG.loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CFDI-Sistema-Completo/1.0.0'
            },
            body: JSON.stringify(loginPayload),
            timeout: EXTERNAL_SEALER_CONFIG.timeout
        });
        
        console.log('📥 EXTERNAL LOGIN: Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Login falló con status ${response.status}: ${errorText}`);
        }
        
        const loginResult = await response.json();
        console.log('✅ EXTERNAL LOGIN: Autenticación exitosa');
        
        // 🔍 DEBUG CRÍTICO: Ver respuesta completa del login
        console.log('🔍 LOGIN DEBUG: Respuesta completa del servicio:', JSON.stringify(loginResult, null, 2));
        console.log('🔍 LOGIN DEBUG: Claves disponibles:', Object.keys(loginResult));
        
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
    // Validar parámetros requeridos
    if (!xmlSinSellar || !certificadoBase64 || !llavePrivadaBase64 || !passwordLlave) {
        throw new Error('Faltan parámetros requeridos para el sellado externo');
    }

    // Obtener token válido
    const token = await obtenerTokenValido();
    if (!token) {
        throw new Error('No se pudo obtener token de autenticación');
    }

    // Preparar FormData
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Envío directo en bruto como Postman
    formData.append('xml', Buffer.from(xmlSinSellar, 'utf8'), {
        filename: `${rfc}.xml`,
        contentType: 'application/xml'
    });
    
    formData.append('certificado', Buffer.from(certificadoBase64, 'base64'), {
        filename: `${rfc}.cer`,
        contentType: 'application/octet-stream'
    });
    
    formData.append('key', Buffer.from(llavePrivadaBase64, 'base64'), {
        filename: `${rfc}.key`,
        contentType: 'application/octet-stream'
    });
    
    formData.append('password', passwordLlave);

    // Envío HTTP
    const fetchFn = await loadFetch();
    const response = await fetchFn(EXTERNAL_SEALER_CONFIG.sellarUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
        },
        body: formData,
        timeout: EXTERNAL_SEALER_CONFIG.timeout
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${responseText}`);
    }
    
    const result = JSON.parse(responseText);
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
            const fetchFn = await loadFetch();
            const loginResponse = await fetchFn(EXTERNAL_SEALER_CONFIG.loginUrl, {
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
            const fetchFn2 = await loadFetch();
            const sellarResponse = await fetchFn2(EXTERNAL_SEALER_CONFIG.sellarUrl, {
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
