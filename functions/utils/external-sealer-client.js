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
    
    // Timeout en milisegundos
    timeout: parseInt(process.env.EXTERNAL_SEALER_TIMEOUT) || 30000,
    
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
    // Si hay token válido en cache, usarlo
    if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
        console.log('🎫 TOKEN CACHE: Usando token del cache');
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
        const nuevoToken = await loginServicioExterno();
        return nuevoToken;
    } catch (error) {
        tokenCache.isRefreshing = false;
        throw error;
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
    console.log('🌐 SELLADO EXTERNO: Iniciando sellado con servicio externo');
    console.log('📊 SELLADO EXTERNO: RFC:', rfc);
    console.log('📊 SELLADO EXTERNO: Versión CFDI:', versionCfdi);
    console.log('📊 SELLADO EXTERNO: Tamaño XML:', xmlSinSellar.length, 'caracteres');
    console.log('📊 SELLADO EXTERNO: Certificado base64:', certificadoBase64.length, 'caracteres');
    console.log('📊 SELLADO EXTERNO: Llave privada base64:', llavePrivadaBase64.length, 'caracteres');
    
    // 🚨 DEBUG CRÍTICO: EXTRAER RFC DEL CERTIFICADO ANTES DEL ENVÍO
    console.log('🚨 DEBUG CRÍTICO: EXTRAYENDO RFC DEL CERTIFICADO...');
    let rfcCertificadoCritico = 'NO_EXTRAIDO';
    try {
        console.log('🚨 DEBUG CRÍTICO: Validando certificado base64...');
        if (!certificadoBase64 || typeof certificadoBase64 !== 'string') {
            throw new Error('Certificado base64 inválido o vacío');
        }
        
        const crypto = require('crypto');
        console.log('🚨 DEBUG CRÍTICO: Formateando certificado a PEM...');
        
        // Limpiar el certificado base64 de cualquier formato PEM existente
        const cleanBase64 = certificadoBase64.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
        console.log('🚨 DEBUG CRÍTICO: Base64 limpio, longitud:', cleanBase64.length);
        
        // Formatear a PEM con líneas de 64 caracteres
        const certificadoPemCritico = '-----BEGIN CERTIFICATE-----\n' + 
                                     cleanBase64.match(/.{1,64}/g).join('\n') + 
                                     '\n-----END CERTIFICATE-----';
        
        console.log('🚨 DEBUG CRÍTICO: PEM formateado, creando X509Certificate...');
        const certCritico = new crypto.X509Certificate(certificadoPemCritico);
        const subjectCritico = certCritico.subject;
        
        console.log('🚨 DEBUG CRÍTICO CERT: Subject completo:', subjectCritico);
        
        // Extraer RFC del subject usando regex más robusta
        const rfcMatchCritico = subjectCritico.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g);
        if (rfcMatchCritico && rfcMatchCritico.length > 0) {
            rfcCertificadoCritico = rfcMatchCritico[0];
            console.log('🚨 DEBUG CRÍTICO: RFC EXTRAIDO DEL CERTIFICADO:', rfcCertificadoCritico);
        } else {
            console.log('🚨 DEBUG CRÍTICO: No se encontró RFC en el subject del certificado');
        }
        
    } catch (certErrorCritico) {
        console.log('❌ DEBUG CRÍTICO CERT: Error extrayendo RFC:', certErrorCritico.message);
        console.log('❌ DEBUG CRÍTICO CERT: Stack:', certErrorCritico.stack);
    }
    
    // 🚨 COMPARACIÓN CRÍTICA FINAL
    console.log('🚨 COMPARACIÓN CRÍTICA FINAL ANTES DEL ENVÍO:');
    console.log('  📋 RFC Parámetro (del emisor):', rfc);
    console.log('  🔐 RFC del Certificado CSD:', rfcCertificadoCritico);
    console.log('  ⚖️ COINCIDEN:', rfc === rfcCertificadoCritico ? '✅ SÍ' : '❌ NO');
    
    if (rfc !== rfcCertificadoCritico && rfcCertificadoCritico !== 'NO_EXTRAIDO') {
        console.log('🚨 PROBLEMA CRÍTICO IDENTIFICADO:');
        console.log('  - RFC que envíamos (del emisor):', rfc);
        console.log('  - RFC en el certificado CSD:', rfcCertificadoCritico);
        console.log('  - EL SERVICIO EXTERNO RECHAZARÁ ESTO CON ERROR 500');
        console.log('  - SOLUCIÓN: Usar certificado CSD del RFC', rfc, 'o cambiar emisor al RFC', rfcCertificadoCritico);
    }
    
    // Validar parámetros requeridos
    if (!xmlSinSellar || !certificadoBase64 || !llavePrivadaBase64 || !passwordLlave) {
        throw new Error('Faltan parámetros requeridos para el sellado externo');
    }

    // Validar configuración del servicio
    if (!EXTERNAL_SEALER_CONFIG.sellarUrl) {
        throw new Error('URL del servicio externo no configurada (EXTERNAL_SEALER_URL)');
    }
    
    // Obtener token válido antes de hacer la petición
    console.log('🔐 SELLADO EXTERNO: Obteniendo token de autenticación...');
    const token = await obtenerTokenValido();

    // 🚨 DEBUG CRÍTICO DEL TOKEN
    console.log('🎫 TOKEN DIAGNÓSTICO CRÍTICO:');
    console.log('  - Token existe:', !!token);
    console.log('  - Token length:', token?.length || 0);
    console.log('  - Token tipo:', typeof token);
    console.log('  - Token primeros 20 chars:', token?.substring(0, 20) || 'NULL');
    console.log('  - Token últimos 10 chars:', token?.substring(token?.length - 10) || 'NULL');
    
    if (!token || token.trim() === '') {
        throw new Error('❌ CRÍTICO: Token de autenticación está vacío o es null');
    }

    console.log('📤 SELLADO EXTERNO: Preparando FormData para el servicio externo');
    console.log('🔗 SELLADO EXTERNO: URL:', EXTERNAL_SEALER_CONFIG.sellarUrl);
    console.log('🎫 SELLADO EXTERNO: Token obtenido exitosamente');

    let lastError = null;
    
    // Implementar reintentos
    for (let intento = 1; intento <= EXTERNAL_SEALER_CONFIG.retries; intento++) {
        try {
            console.log(`🔄 SELLADO EXTERNO: Intento ${intento}/${EXTERNAL_SEALER_CONFIG.retries}`);
            
            // Crear FormData con archivos (como espera consulta.click)
            // 🖼️ PROCESO LIMPIO - EXACTAMENTE COMO LA IMAGEN
            const FormData = require('form-data');
            const formData = new FormData();
            
            // XML
            formData.append('xml', Buffer.from(xmlSinSellar, 'utf8'), {
                filename: 'cfdi.xml',
                contentType: 'application/xml'
            });
            
            // 🔍 DIAGNÓSTICO CERTIFICADO ANTES DEL ENVÍO
            console.log('🔍 CERTIFICADO ALMACENADO:');
            console.log('  - Longitud:', certificadoBase64.length, 'chars');
            console.log('  - Es PEM:', certificadoBase64.includes('-----BEGIN'));
            console.log('  - Primeros 100 chars:', certificadoBase64.substring(0, 100));
            console.log('  - Últimos 100 chars:', certificadoBase64.substring(certificadoBase64.length - 100));
            
            // 🧪 PRUEBA: Certificado en formato binario DER (no PEM texto)
            // El servicio externo puede necesitar el certificado en formato binario para extraer el número de serie
            let certBuffer;
            
            if (certificadoBase64.includes('-----BEGIN')) {
                // Extraer solo el contenido base64 (sin headers PEM) y convertir a binario
                const base64Content = certificadoBase64
                    .replace(/-----BEGIN CERTIFICATE-----/g, '')
                    .replace(/-----END CERTIFICATE-----/g, '')
                    .replace(/\s/g, '');
                certBuffer = Buffer.from(base64Content, 'base64');
                console.log('🔄 CERTIFICADO: Convertido de PEM a binario DER');
            } else {
                // Ya está en base64, convertir directamente a binario
                certBuffer = Buffer.from(certificadoBase64, 'base64');
                console.log('🔄 CERTIFICADO: Convertido de base64 a binario DER');
            }
                
            console.log('📏 CERTIFICADO BUFFER (BINARIO):');
            console.log('  - Tamaño buffer:', certBuffer.length, 'bytes');
            console.log('  - Primeros 20 bytes (hex):', certBuffer.subarray(0, 20).toString('hex'));
            console.log('  - Últimos 20 bytes (hex):', certBuffer.subarray(certBuffer.length - 20).toString('hex'));
                
            formData.append('certificado', certBuffer, {
                filename: 'certificado.cer',
                contentType: 'application/octet-stream'
            });
            
            // 🔑 LLAVE: Convertir base64 puro a PEM completo para desencriptación
            // El servicio externo necesita headers PEM para desencriptar llaves privadas encriptadas
            let keyContent;
            let keyBuffer;
            
            if (llavePrivadaBase64.includes('-----BEGIN')) {
                // Ya está en formato PEM
                keyContent = llavePrivadaBase64;
                keyBuffer = Buffer.from(llavePrivadaBase64, 'utf8');
                console.log('🔑 LLAVE: Ya está en formato PEM');
            } else {
                // Base64 puro - convertir a PEM completo
                // Formatear base64 en líneas de 64 caracteres
                const base64Lines = llavePrivadaBase64.match(/.{1,64}/g).join('\n');
                keyContent = `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${base64Lines}\n-----END ENCRYPTED PRIVATE KEY-----`;
                keyBuffer = Buffer.from(keyContent, 'utf8');
                console.log('🔑 LLAVE: Convertida de base64 puro a PEM completo');
            }
                
            console.log('📏 LLAVE BUFFER:');
            console.log('  - Tamaño buffer:', keyBuffer.length, 'bytes');
            console.log('  - Es PEM:', keyContent.includes('-----BEGIN'));
            console.log('  - Primeros 50 chars:', keyContent.substring(0, 50));
                
            formData.append('key', keyBuffer, {
                filename: 'llave.key',
                contentType: 'application/octet-stream'
            });
            
            // Password - DIAGNÓSTICO CRÍTICO
            console.log('🔐 PASSWORD DIAGNÓSTICO CRÍTICO:');
            console.log('  - Password recibido:', passwordLlave ? 'SÍ' : 'NO');
            console.log('  - Password length:', passwordLlave?.length || 0);
            console.log('  - Password tipo:', typeof passwordLlave);
            console.log('  - Password primeros 3 chars:', passwordLlave?.substring(0, 3) || 'NULL');
            console.log('  - Password últimos 3 chars:', passwordLlave?.substring(passwordLlave?.length - 3) || 'NULL');
            
            if (!passwordLlave || passwordLlave.trim() === '') {
                throw new Error('❌ CRÍTICO: Password está vacío o es null');
            }
            
            formData.append('password', passwordLlave);
            
            // Enviar al servicio - PRUEBA HEADER POSTMAN
            console.log('🧪 PRUEBA CRÍTICA: Usando header application/x-www-form-urlencoded según Postman oficial');
            
            const fetchFn = await loadFetch();
            const response = await fetchFn(EXTERNAL_SEALER_CONFIG.sellarUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    // Comentamos formData.getHeaders() para probar
                    // ...formData.getHeaders()
                },
                body: formData,
                timeout: EXTERNAL_SEALER_CONFIG.timeout
            });
            
            // 🔍 DEBUG CRÍTICO: Analizar respuesta completa
            console.log('📊 RESPUESTA COMPLETA:');
            console.log('  - Status:', response.status);
            console.log('  - Status Text:', response.statusText);
            console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
            
            const responseText = await response.text();
            console.log('📄 RESPUESTA TEXTO COMPLETO:');
            console.log('  - Longitud:', responseText.length);
            console.log('  - Primeros 500 chars:', responseText.substring(0, 500));
            console.log('  - Últimos 200 chars:', responseText.substring(Math.max(0, responseText.length - 200)));
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${responseText}`);
            }
            
            // Intentar parsear JSON
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('✅ JSON parseado exitosamente');
            } catch (jsonError) {
                console.log('❌ ERROR PARSING JSON:', jsonError.message);
                console.log('🔍 RESPUESTA NO ES JSON VÁLIDO - PROBABLEMENTE HTML DE ERROR');
                throw new Error(`Respuesta no es JSON válido. Respuesta: ${responseText.substring(0, 1000)}`);
            }
            return {
                exito: true,
                xmlSellado: result.xmlSellado || result.xml_sellado,
                sello: result.sello,
                cadenaOriginal: result.cadenaOriginal || result.cadena_original,
                numeroCertificado: result.numeroCertificado || result.numero_certificado
            };
            
            // ✅ SISTEMA DE PRUEBAS AUTOMÁTICAS COMPLETADO EXITOSAMENTE

        } catch (error) {
            lastError = error;
            console.error(`❌ SELLADO EXTERNO: Error en intento ${intento}:`, error.message);
            
            // Si no es el último intento, esperar antes de reintentar
            if (intento < EXTERNAL_SEALER_CONFIG.retries) {
                const delayMs = 1000 * intento; // Delay incremental
                console.log(`⏳ SELLADO EXTERNO: Esperando ${delayMs}ms antes del siguiente intento`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('💥 SELLADO EXTERNO: Todos los intentos de sellado fallaron');
    throw new Error(`Sellado externo falló después de ${EXTERNAL_SEALER_CONFIG.retries} intentos: ${lastError?.message}`);
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
