/**
 * 🔬 PRUEBA TÉCNICA SELLADO - DATOS REALES CSD
 * 
 * Metodología profesional: Probar sellado con datos CSD reales
 * para obtener evidencia técnica específica del endpoint
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://iyhnasslqhqxqgdxvvqy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aG5hc3NscWhxeHFnZHh2dnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2OTc4MzksImV4cCI6MjA1MTI3MzgzOX0.YMqJOGHuZWFGCdCVJAhKQOJPKHgxJjHcJZGQCCHCQCM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración consulta.click
const CONFIG = {
    loginUrl: 'https://consulta.click/api/login',
    sellarUrl: 'https://consulta.click/api/v1/cfdi-sellar',
    email: 'admin@cfdi.test',
    password: '12345678'
};

/**
 * Obtener datos CSD reales de la base de datos
 */
async function obtenerDatosCSDReales() {
    console.log('🔍 OBTENIENDO DATOS CSD REALES DE BD...');
    
    try {
        // Obtener emisor con certificados CSD
        const { data: emisores, error } = await supabase
            .from('emisores')
            .select('*')
            .not('certificado_cer', 'is', null)
            .not('certificado_key', 'is', null)
            .not('password_key', 'is', null)
            .limit(1);
            
        if (error) {
            console.error('❌ Error BD:', error.message);
            return null;
        }
        
        if (!emisores || emisores.length === 0) {
            console.error('❌ No hay emisores con CSD en BD');
            return null;
        }
        
        const emisor = emisores[0];
        console.log('✅ EMISOR CSD ENCONTRADO:');
        console.log('  - RFC:', emisor.rfc);
        console.log('  - Razón Social:', emisor.razon_social);
        console.log('  - Certificado length:', emisor.certificado_cer?.length || 0);
        console.log('  - Llave length:', emisor.certificado_key?.length || 0);
        console.log('  - Password length:', emisor.password_key?.length || 0);
        
        return {
            rfc: emisor.rfc,
            certificado: emisor.certificado_cer,
            llave: emisor.certificado_key,
            password: emisor.password_key
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo CSD:', error.message);
        return null;
    }
}

/**
 * Obtener XML real para sellar
 */
async function obtenerXMLReal() {
    console.log('🔍 OBTENIENDO XML REAL DE BD...');
    
    try {
        // Obtener XML no sellado
        const { data: xmls, error } = await supabase
            .from('xmls_generados')
            .select('*')
            .eq('estado', 'generado')
            .not('xml_content', 'is', null)
            .limit(1);
            
        if (error) {
            console.error('❌ Error BD XML:', error.message);
            return null;
        }
        
        if (!xmls || xmls.length === 0) {
            console.error('❌ No hay XMLs no sellados en BD');
            return null;
        }
        
        const xml = xmls[0];
        console.log('✅ XML ENCONTRADO:');
        console.log('  - ID:', xml.id);
        console.log('  - Estado:', xml.estado);
        console.log('  - XML length:', xml.xml_content?.length || 0);
        console.log('  - XML preview:', xml.xml_content?.substring(0, 100) + '...');
        
        return xml.xml_content;
        
    } catch (error) {
        console.error('❌ Error obteniendo XML:', error.message);
        return null;
    }
}

/**
 * Login y obtener token
 */
async function obtenerToken() {
    console.log('🔐 OBTENIENDO TOKEN...');
    
    try {
        const response = await fetch(CONFIG.loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CFDI-Test-Sellado/1.0.0'
            },
            body: JSON.stringify({
                email: CONFIG.email,
                password: CONFIG.password
            })
        });
        
        if (!response.ok) {
            console.error('❌ Login falló:', response.status);
            return null;
        }
        
        const result = await response.json();
        const token = result.access_token || result.token;
        
        if (token) {
            console.log('✅ TOKEN OBTENIDO:', token.substring(0, 20) + '...');
            return token;
        } else {
            console.error('❌ No se pudo extraer token');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error login:', error.message);
        return null;
    }
}

/**
 * Prueba de sellado con datos reales
 */
async function probarSelladoReal(token, xmlContent, csdData) {
    console.log('🔬 PRUEBA SELLADO CON DATOS REALES');
    console.log('📍 URL:', CONFIG.sellarUrl);
    console.log('🔐 Token:', token.substring(0, 20) + '...');
    console.log('📋 Datos CSD RFC:', csdData.rfc);
    
    // Convertir XML a Base64
    const xmlBase64 = Buffer.from(xmlContent, 'utf8').toString('base64');
    
    // Payload con datos reales
    const payload = {
        xml: xmlBase64,
        certificado: csdData.certificado,
        key: csdData.llave,
        password: csdData.password
    };
    
    console.log('📦 PAYLOAD REAL:');
    console.log('  - xml (base64 length):', payload.xml.length);
    console.log('  - certificado (length):', payload.certificado.length);
    console.log('  - key (length):', payload.key.length);
    console.log('  - password (length):', payload.password.length);
    
    try {
        const response = await fetch(CONFIG.sellarUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CFDI-Test-Sellado/1.0.0'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📥 RESPUESTA SELLADO REAL:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('  - Response Length:', responseText.length);
        console.log('  - Response Preview (500 chars):', responseText.substring(0, 500));
        
        // Análisis de respuesta
        if (response.ok) {
            try {
                const jsonResult = JSON.parse(responseText);
                console.log('✅ SELLADO EXITOSO - JSON VÁLIDO:');
                console.log('  - Claves disponibles:', Object.keys(jsonResult));
                console.log('  - Resultado completo:', JSON.stringify(jsonResult, null, 2));
                return jsonResult;
            } catch (parseError) {
                console.log('❌ Respuesta OK pero no es JSON válido');
                console.log('🔍 EVIDENCIA: Respuesta texto plano o formato inesperado');
            }
        } else {
            console.error('❌ SELLADO FALLÓ - Status:', response.status);
            
            if (responseText.includes('<!DOCTYPE html>')) {
                console.log('🚨 EVIDENCIA: Respuesta HTML - Redirección detectada');
                
                // Buscar pistas específicas
                if (responseText.includes('login') || responseText.includes('Login')) {
                    console.log('🔍 EVIDENCIA: HTML redirige a login - Token inválido/expirado');
                }
                if (responseText.includes('error') || responseText.includes('Error')) {
                    console.log('🔍 EVIDENCIA: HTML contiene error');
                }
            } else {
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('🔍 EVIDENCIA: Error JSON estructurado:');
                    console.log('  - Estructura:', Object.keys(errorJson));
                    console.log('  - Contenido:', JSON.stringify(errorJson, null, 2));
                } catch {
                    console.log('🔍 EVIDENCIA: Error texto plano:', responseText);
                }
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ ERROR EN PRUEBA SELLADO:', error.message);
        return null;
    }
}

/**
 * Ejecutar prueba completa con datos reales
 */
async function ejecutarPruebaCompleta() {
    console.log('🚀 INICIANDO PRUEBA SELLADO CON DATOS REALES');
    console.log('=' .repeat(70));
    
    // Paso 1: Obtener datos CSD reales
    const csdData = await obtenerDatosCSDReales();
    if (!csdData) {
        console.error('❌ No se pudieron obtener datos CSD');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // Paso 2: Obtener XML real
    const xmlContent = await obtenerXMLReal();
    if (!xmlContent) {
        console.error('❌ No se pudo obtener XML');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // Paso 3: Obtener token
    const token = await obtenerToken();
    if (!token) {
        console.error('❌ No se pudo obtener token');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // Paso 4: Probar sellado con datos reales
    const resultado = await probarSelladoReal(token, xmlContent, csdData);
    
    console.log('\n' + '=' .repeat(70));
    console.log('🏁 PRUEBA SELLADO REAL COMPLETADA');
    
    if (resultado) {
        console.log('✅ SELLADO EXITOSO - Servicio funcional');
    } else {
        console.log('❌ SELLADO FALLÓ - Evidencia técnica obtenida para corrección');
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    ejecutarPruebaCompleta().catch(console.error);
}

module.exports = { ejecutarPruebaCompleta, probarSelladoReal, obtenerToken };
