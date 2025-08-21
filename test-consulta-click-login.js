/**
 * 🧪 Test de Login a consulta.click API
 * 
 * Script para probar el login a la API de consulta.click
 * y obtener el token de autenticación
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuración de la API de consulta.click
const CONSULTA_CLICK_CONFIG = {
    loginUrl: 'https://consulta.click/api/login',
    email: 'admin@cfdi.test',
    password: '12345678',
    timeout: 30000
};

/**
 * Prueba el login a consulta.click
 */
async function probarLoginConsultaClick() {
    console.log('🔐 CONSULTA.CLICK TEST: Iniciando prueba de login');
    console.log('🌐 URL:', CONSULTA_CLICK_CONFIG.loginUrl);
    console.log('📧 Email:', CONSULTA_CLICK_CONFIG.email);
    console.log('🔑 Password:', '*'.repeat(CONSULTA_CLICK_CONFIG.password.length));
    
    try {
        // Preparar payload según especificación
        const loginPayload = {
            email: CONSULTA_CLICK_CONFIG.email,
            password: CONSULTA_CLICK_CONFIG.password
        };
        
        console.log('\n📤 Enviando request de login...');
        console.log('📋 Payload:', JSON.stringify(loginPayload, null, 2));
        
        // Realizar request de login
        const startTime = Date.now();
        const response = await fetch(CONSULTA_CLICK_CONFIG.loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CFDI-Sistema-Completo/1.0.0',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginPayload),
            timeout: CONSULTA_CLICK_CONFIG.timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        console.log('\n📥 Respuesta recibida:');
        console.log('⏱️  Tiempo de respuesta:', responseTime, 'ms');
        console.log('📊 Status:', response.status, response.statusText);
        console.log('📋 Headers:', Object.fromEntries(response.headers));
        
        // Leer respuesta
        const responseText = await response.text();
        console.log('\n📄 Response body (raw):');
        console.log(responseText);
        
        if (!response.ok) {
            console.error('\n❌ LOGIN FALLIDO');
            console.error('Status:', response.status);
            console.error('Response:', responseText);
            return {
                success: false,
                error: `HTTP ${response.status}: ${responseText}`,
                status: response.status,
                responseTime: responseTime
            };
        }
        
        // Parsear JSON
        let loginResult;
        try {
            loginResult = JSON.parse(responseText);
        } catch (parseError) {
            console.error('\n❌ ERROR PARSEANDO JSON:', parseError.message);
            return {
                success: false,
                error: `Error parseando JSON: ${parseError.message}`,
                rawResponse: responseText
            };
        }
        
        console.log('\n📋 Response JSON parseado:');
        console.log(JSON.stringify(loginResult, null, 2));
        
        // Extraer token
        const token = loginResult.token || 
                     loginResult.access_token || 
                     loginResult.data?.token ||
                     loginResult.data?.access_token;
        
        const expiresIn = loginResult.expires_in || 
                         loginResult.data?.expires_in ||
                         3600; // Default 1 hora
        
        if (!token) {
            console.error('\n❌ TOKEN NO ENCONTRADO en la respuesta');
            console.error('Campos disponibles:', Object.keys(loginResult));
            return {
                success: false,
                error: 'Token no encontrado en la respuesta',
                response: loginResult
            };
        }
        
        console.log('\n✅ LOGIN EXITOSO!');
        console.log('🎫 Token obtenido:', token.substring(0, 50) + '...');
        console.log('📏 Longitud del token:', token.length);
        console.log('⏰ Expira en:', expiresIn, 'segundos');
        console.log('🕐 Expira a las:', new Date(Date.now() + expiresIn * 1000).toLocaleString());
        
        // Validar formato del token
        if (token.includes('.')) {
            console.log('🔍 Parece ser un JWT token');
            try {
                const parts = token.split('.');
                console.log('📋 JWT Parts:', parts.length);
                if (parts.length === 3) {
                    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    console.log('🔐 JWT Header:', header);
                    console.log('📄 JWT Payload:', payload);
                }
            } catch (jwtError) {
                console.log('⚠️  Error parseando JWT:', jwtError.message);
            }
        }
        
        return {
            success: true,
            token: token,
            expiresIn: expiresIn,
            expiresAt: Date.now() + (expiresIn * 1000),
            responseTime: responseTime,
            fullResponse: loginResult
        };
        
    } catch (error) {
        console.error('\n💥 ERROR EN LOGIN:', error.message);
        console.error('Stack:', error.stack);
        
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

/**
 * Ejecutar prueba si se llama directamente
 */
if (require.main === module) {
    console.log('🧪 INICIANDO TEST DE LOGIN A CONSULTA.CLICK\n');
    
    probarLoginConsultaClick()
        .then(resultado => {
            console.log('\n' + '='.repeat(60));
            console.log('📊 RESULTADO FINAL:');
            console.log('='.repeat(60));
            
            if (resultado.success) {
                console.log('✅ Estado: EXITOSO');
                console.log('🎫 Token:', resultado.token ? 'OBTENIDO' : 'NO OBTENIDO');
                console.log('⏱️  Tiempo:', resultado.responseTime, 'ms');
                console.log('⏰ Expira en:', resultado.expiresIn, 'segundos');
            } else {
                console.log('❌ Estado: FALLIDO');
                console.log('💬 Error:', resultado.error);
            }
            
            console.log('\n🎯 PRÓXIMOS PASOS:');
            if (resultado.success) {
                console.log('1. ✅ Login funciona correctamente');
                console.log('2. 🔧 Configurar variables de entorno');
                console.log('3. 🚀 Probar sellado con token obtenido');
            } else {
                console.log('1. 🔍 Revisar credenciales');
                console.log('2. 🌐 Verificar conectividad');
                console.log('3. 📋 Revisar formato de request');
            }
        })
        .catch(error => {
            console.error('\n💥 ERROR FATAL:', error.message);
            process.exit(1);
        });
}

module.exports = {
    probarLoginConsultaClick,
    CONSULTA_CLICK_CONFIG
};
