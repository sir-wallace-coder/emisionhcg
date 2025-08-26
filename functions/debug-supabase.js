/**
 * 🔍 Función de Diagnóstico de Supabase
 * Verifica la conexión y las tablas disponibles
 */

const { supabase } = require('./config/supabase');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('🔍 SUPABASE DEBUG: Iniciando diagnóstico...');
        
        // Verificar conexión básica
        console.log('🔧 SUPABASE DEBUG: Verificando conexión...');
        
        // Intentar listar todas las tablas disponibles
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        console.log('📋 SUPABASE DEBUG: Tablas encontradas:', tables);
        console.log('❌ SUPABASE DEBUG: Error de tablas:', tablesError);

        // Intentar consulta simple a xmls
        const { data: xmlsData, error: xmlsError } = await supabase
            .from('xmls')
            .select('id')
            .limit(1);

        console.log('📄 SUPABASE DEBUG: Datos xmls:', xmlsData);
        console.log('❌ SUPABASE DEBUG: Error xmls:', xmlsError);

        // Intentar consulta a emisores
        const { data: emisoresData, error: emisoresError } = await supabase
            .from('emisores')
            .select('id')
            .limit(1);

        console.log('🏢 SUPABASE DEBUG: Datos emisores:', emisoresData);
        console.log('❌ SUPABASE DEBUG: Error emisores:', emisoresError);

        // Verificar variables de entorno
        const envInfo = {
            supabase_url: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
            supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
            supabase_anon: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
            node_env: process.env.NODE_ENV || 'not set'
        };

        console.log('🔧 SUPABASE DEBUG: Variables de entorno:', envInfo);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Diagnóstico de Supabase completado',
                data: {
                    tables: tables,
                    tables_error: tablesError,
                    xmls_data: xmlsData,
                    xmls_error: xmlsError,
                    emisores_data: emisoresData,
                    emisores_error: emisoresError,
                    environment: envInfo,
                    timestamp: new Date().toISOString()
                }
            })
        };

    } catch (error) {
        console.error('❌ SUPABASE DEBUG: Error crítico:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Error en diagnóstico de Supabase',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
};
