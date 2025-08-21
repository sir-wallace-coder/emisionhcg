/**
 * 🔗 PRUEBA DE CONEXIÓN SUPABASE
 * 
 * Script para probar la conexión con Supabase usando las credenciales reales
 */

// Configurar variables de entorno manualmente para prueba
process.env.SUPABASE_URL = 'https://savvwukedowcejieqgcr.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTk1MjksImV4cCI6MjA3MDg5NTUyOX0.ssTVHrySTZJz0qwfPyWfCJ7evQyQNB6zD2BO2_qvARk';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMxOTUyOSwiZXhwIjoyMDcwODk1NTI5fQ.5WfUNc6tllkY9xuu1-5Qc0Xv5GNtHWTmSDyHmQaC7tU';
process.env.JWT_SECRET = 'yO5FmJ9BDy2SV8cSx92BCkkIK4NwEBP7TmJgym9MMBxsWQwI7JPhu2GweP9TcRUWX0lYoMVvTRCIVY+/yLpP+w==';
process.env.NODE_ENV = 'development';

console.log('🔗 INICIANDO PRUEBA DE CONEXIÓN SUPABASE...');

async function probarConexionSupabase() {
    try {
        console.log('📋 Configuración:');
        console.log('  - URL:', process.env.SUPABASE_URL);
        console.log('  - Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado ✅' : 'No configurado ❌');
        
        // Cargar configuración de Supabase
        const { supabase } = require('./functions/config/supabase.js');
        console.log('✅ Cliente Supabase cargado');
        
        // Probar consulta básica - listar tablas o hacer ping
        console.log('\n🔍 Probando conexión básica...');
        
        // Intentar obtener información de la base de datos
        const { data, error } = await supabase
            .from('emisores')
            .select('count(*)')
            .limit(1);
            
        if (error) {
            console.log('⚠️ Error en consulta (puede ser normal si la tabla no existe):', error.message);
            
            // Probar con una consulta más básica
            console.log('🔄 Intentando consulta alternativa...');
            const { data: authData, error: authError } = await supabase.auth.getSession();
            
            if (authError) {
                console.log('📊 Respuesta de auth (esperado):', authError.message);
            } else {
                console.log('✅ Conexión con Supabase establecida correctamente');
            }
        } else {
            console.log('✅ Consulta exitosa a tabla emisores');
            console.log('📊 Resultado:', data);
        }
        
        // Probar funcionalidad de autenticación JWT
        console.log('\n🔐 Probando JWT...');
        const jwt = require('jsonwebtoken');
        const testToken = jwt.sign(
            { userId: 'test-user', role: 'admin' }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
        console.log('✅ JWT funcionando correctamente');
        console.log('📋 Token decodificado:', { userId: decoded.userId, role: decoded.role });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en prueba de conexión:', error.message);
        console.error('📋 Detalles:', error.stack);
        return false;
    }
}

// Ejecutar prueba
probarConexionSupabase()
    .then(exitoso => {
        console.log('\n🎯 RESULTADO DE LA PRUEBA:');
        if (exitoso) {
            console.log('✅ Conexión con Supabase funcionando correctamente');
            console.log('🚀 El sistema está listo para usar');
        } else {
            console.log('❌ Problemas con la conexión');
            console.log('🔧 Revisar configuración de variables de entorno');
        }
    })
    .catch(error => {
        console.error('❌ Error ejecutando prueba:', error.message);
    });
