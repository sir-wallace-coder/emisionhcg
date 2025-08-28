/**
 * Endpoint serverless para sellado CFDI usando NodeCfdi
 * Netlify Function para sellado local con @nodecfdi/cfdiutils-core y @nodecfdi/credentials
 */

const { sellarCFDINodeCfdi } = require('./nodecfdi-sealer');
const { sellarCFDINodeCfdiFallback } = require('./nodecfdi-sealer-fallback');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Configuración Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'tu-jwt-secret-key';

/**
 * Verifica el token JWT del usuario
 */
function verificarToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autorización requerido');
    }
    
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Obtiene los datos del emisor desde la base de datos
 */
async function obtenerDatosEmisor(userId, emisorId) {
    console.log('📋 Obteniendo datos del emisor:', emisorId);
    
    const { data: emisor, error } = await supabase
        .from('emisores')
        .select('*')
        .eq('id', emisorId)
        .eq('usuario_id', userId)
        .single();
    
    if (error) {
        console.error('❌ Error obteniendo emisor:', error);
        throw new Error('Error obteniendo datos del emisor');
    }
    
    if (!emisor) {
        throw new Error('Emisor no encontrado');
    }
    
    // Verificar que tenga certificados
    if (!emisor.certificado || !emisor.llave_privada) {
        throw new Error('El emisor no tiene certificados CSD configurados');
    }
    
    console.log('✅ Emisor obtenido:', emisor.nombre);
    return emisor;
}

/**
 * Actualiza el XML en la base de datos con el sello
 */
async function actualizarXMLSellado(xmlId, xmlSellado, sello, numeroCertificado) {
    console.log('💾 Actualizando XML sellado en BD...');
    
    const { error } = await supabase
        .from('xmls_generados')
        .update({
            xml_content: xmlSellado,
            estado: 'sellado',
            sello_digital: sello,
            numero_certificado: numeroCertificado,
            fecha_sellado: new Date().toISOString()
        })
        .eq('id', xmlId);
    
    if (error) {
        console.error('❌ Error actualizando XML:', error);
        throw new Error('Error actualizando XML en base de datos');
    }
    
    console.log('✅ XML actualizado en BD');
}

/**
 * Handler principal del endpoint
 */
exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Manejar preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
    }
    
    console.log('🚀 INICIANDO SELLADO CFDI CON NODECFDI');
    console.log('📋 Método HTTP:', event.httpMethod);
    console.log('📋 Headers recibidos:', Object.keys(event.headers));
    
    try {
        // Verificar autenticación
        const userData = verificarToken(event.headers.authorization);
        console.log('👤 Usuario autenticado:', userData.email);
        
        // Parsear body
        const { xmlId, emisorId, version = '4.0' } = JSON.parse(event.body);
        
        if (!xmlId || !emisorId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'xmlId y emisorId son requeridos' 
                })
            };
        }
        
        console.log('📋 XML ID:', xmlId);
        console.log('📋 Emisor ID:', emisorId);
        console.log('📋 Versión CFDI:', version);
        
        // Obtener datos del emisor
        const emisor = await obtenerDatosEmisor(userData.id, emisorId);
        
        // Obtener XML de la base de datos
        console.log('📄 Obteniendo XML de la BD...');
        const { data: xmlData, error: xmlError } = await supabase
            .from('xmls_generados')
            .select('xml_content, estado')
            .eq('id', xmlId)
            .eq('usuario_id', userData.id)
            .single();
        
        if (xmlError || !xmlData) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'XML no encontrado' 
                })
            };
        }
        
        if (xmlData.estado === 'sellado' || xmlData.estado === 'timbrado') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'El XML ya está sellado o timbrado' 
                })
            };
        }
        
        console.log('📄 XML obtenido, estado:', xmlData.estado);
        console.log('📏 Tamaño XML:', xmlData.xml_content.length);
        
        // Realizar sellado con NodeCfdi (intentar versión principal, fallback si falla)
        console.log('\n🔐 INICIANDO SELLADO CON NODECFDI...');
        let resultado;
        
        try {
            // Intentar con la versión principal (Saxon-B)
            console.log('🔄 Intentando sellado con Saxon-B...');
            resultado = await sellarCFDINodeCfdi(
                xmlData.xml_content,
                emisor.certificado,
                emisor.llave_privada,
                emisor.password_key,
                version
            );
        } catch (saxonError) {
            console.warn('⚠️ Saxon-B falló, usando fallback:', saxonError.message);
            
            // Usar versión fallback sin Saxon-B
            console.log('🔄 Intentando sellado con fallback (sin Saxon-B)...');
            resultado = await sellarCFDINodeCfdiFallback(
                xmlData.xml_content,
                emisor.certificado,
                emisor.llave_privada,
                emisor.password_key,
                version
            );
        }
        
        if (!resultado.success) {
            console.error('❌ Error en sellado NodeCfdi:', resultado.error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: `Error en sellado: ${resultado.error}`,
                    metodo: 'NodeCfdi'
                })
            };
        }
        
        // Actualizar XML en base de datos
        await actualizarXMLSellado(
            xmlId,
            resultado.xmlSellado,
            resultado.sello,
            resultado.numeroCertificado
        );
        
        console.log('🎉 SELLADO NODECFDI COMPLETADO EXITOSAMENTE');
        console.log('⏱️ Tiempo total:', resultado.tiempoMs, 'ms');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'XML sellado exitosamente con NodeCfdi',
                metodo: resultado.metodo || 'NodeCfdi',
                tiempoMs: resultado.tiempoMs,
                numeroCertificado: resultado.numeroCertificado,
                xmlId: xmlId
            })
        };
        
    } catch (error) {
        console.error('❌ ERROR EN ENDPOINT SELLADO NODECFDI:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Error interno del servidor',
                metodo: 'NodeCfdi'
            })
        };
    }
};
