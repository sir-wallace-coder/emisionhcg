/**
 * 🔬 PRUEBA TÉCNICA DIRECTA - CONSULTA.CLICK
 * 
 * Script para probar directamente los endpoints y obtener evidencia real
 * de qué responde el servicio consulta.click
 */

// Configuración exacta según el código actual
const CONFIG = {
    loginUrl: 'https://consulta.click/api/login',
    sellarUrl: 'https://consulta.click/api/v1/cfdi-sellar',
    email: 'admin@cfdi.test',
    password: '12345678'
};

/**
 * Prueba 1: LOGIN - Obtener evidencia de autenticación
 */
async function probarLogin() {
    console.log('🔬 PRUEBA 1: LOGIN - Obteniendo evidencia real');
    console.log('📍 URL:', CONFIG.loginUrl);
    console.log('📋 Payload:', { email: CONFIG.email, password: '[HIDDEN]' });
    
    try {
        const response = await fetch(CONFIG.loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CFDI-Test/1.0.0'
            },
            body: JSON.stringify({
                email: CONFIG.email,
                password: CONFIG.password
            })
        });
        
        console.log('📥 RESPUESTA LOGIN:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('  - Response Length:', responseText.length);
        console.log('  - Response Preview (500 chars):', responseText.substring(0, 500));
        
        if (response.ok) {
            try {
                const jsonData = JSON.parse(responseText);
                console.log('✅ JSON VÁLIDO - Estructura:');
                console.log('  - Claves disponibles:', Object.keys(jsonData));
                console.log('  - Datos completos:', JSON.stringify(jsonData, null, 2));
                return jsonData;
            } catch (parseError) {
                console.error('❌ ERROR PARSEANDO JSON:', parseError.message);
                return null;
            }
        } else {
            console.error('❌ LOGIN FALLÓ - Status:', response.status);
            console.error('❌ Respuesta completa:', responseText);
            return null;
        }
        
    } catch (error) {
        console.error('❌ ERROR EN PRUEBA LOGIN:', error.message);
        return null;
    }
}

/**
 * Prueba 2: SELLADO - Con token obtenido (si existe)
 */
async function probarSellado(token) {
    if (!token) {
        console.log('⚠️ PRUEBA 2: SELLADO - Sin token, no se puede probar');
        return;
    }
    
    console.log('🔬 PRUEBA 2: SELLADO - Probando con token obtenido');
    console.log('📍 URL:', CONFIG.sellarUrl);
    console.log('🔐 Token (primeros 20):', token.substring(0, 20) + '...');
    
    // Payload de prueba básico
    const testPayload = {
        xml: Buffer.from('<test>XML de prueba</test>', 'utf8').toString('base64'),
        certificado: 'dGVzdCBjZXJ0aWZpY2F0ZQ==', // "test certificate" en base64
        key: 'dGVzdCBrZXk=', // "test key" en base64
        password: 'test123'
    };
    
    console.log('📋 Payload de prueba:', {
        xml: testPayload.xml.substring(0, 50) + '...',
        certificado: testPayload.certificado,
        key: testPayload.key,
        password: testPayload.password
    });
    
    try {
        const response = await fetch(CONFIG.sellarUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CFDI-Test/1.0.0'
            },
            body: JSON.stringify(testPayload)
        });
        
        console.log('📥 RESPUESTA SELLADO:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('  - Response Length:', responseText.length);
        console.log('  - Response Preview (500 chars):', responseText.substring(0, 500));
        
        if (responseText.trim().startsWith('<!DOCTYPE html>')) {
            console.log('🚨 EVIDENCIA: Respuesta es HTML - Posible redirección');
            console.log('🔍 Analizando HTML para encontrar pistas...');
            
            // Buscar pistas en el HTML
            if (responseText.includes('login') || responseText.includes('Login')) {
                console.log('🔍 EVIDENCIA: HTML contiene referencias a login');
            }
            if (responseText.includes('401') || responseText.includes('Unauthorized')) {
                console.log('🔍 EVIDENCIA: HTML indica error 401/Unauthorized');
            }
            if (responseText.includes('token') || responseText.includes('Token')) {
                console.log('🔍 EVIDENCIA: HTML menciona token');
            }
        } else {
            try {
                const jsonData = JSON.parse(responseText);
                console.log('✅ JSON VÁLIDO - Estructura:');
                console.log('  - Claves disponibles:', Object.keys(jsonData));
                console.log('  - Datos completos:', JSON.stringify(jsonData, null, 2));
            } catch (parseError) {
                console.log('❌ NO ES JSON VÁLIDO');
                console.log('🔍 EVIDENCIA: Respuesta no es HTML ni JSON válido');
            }
        }
        
    } catch (error) {
        console.error('❌ ERROR EN PRUEBA SELLADO:', error.message);
    }
}

/**
 * Ejecutar pruebas completas
 */
async function ejecutarPruebas() {
    console.log('🚀 INICIANDO PRUEBAS TÉCNICAS DIRECTAS');
    console.log('=' .repeat(60));
    
    // Prueba 1: Login
    const loginResult = await probarLogin();
    
    console.log('\n' + '=' .repeat(60));
    
    // Extraer token si existe
    let token = null;
    if (loginResult) {
        token = loginResult.access_token || 
               loginResult.token || 
               loginResult.authToken || 
               loginResult.jwt || 
               loginResult.bearer_token ||
               loginResult.data?.token ||
               loginResult.data?.access_token;
        
        if (token) {
            console.log('✅ TOKEN EXTRAÍDO:', token.substring(0, 20) + '...');
        } else {
            console.log('❌ NO SE PUDO EXTRAER TOKEN');
            console.log('🔍 EVIDENCIA: Campos disponibles:', Object.keys(loginResult));
        }
    }
    
    // Prueba 2: Sellado
    await probarSellado(token);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 PRUEBAS COMPLETADAS - EVIDENCIA OBTENIDA');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    ejecutarPruebas().catch(console.error);
}

module.exports = { ejecutarPruebas, probarLogin, probarSellado };
