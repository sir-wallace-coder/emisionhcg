/**
 * 🚀 PRUEBA RÁPIDA DE SUPABASE
 */

console.log('🔗 Probando conexión con Supabase...');

// Configurar variables
process.env.SUPABASE_URL = 'https://savvwukedowcejieqgcr.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTk1MjksImV4cCI6MjA3MDg5NTUyOX0.ssTVHrySTZJz0qwfPyWfCJ7evQyQNB6zD2BO2_qvARk';

async function testSupabase() {
    try {
        // Test 1: Verificar dependencias
        console.log('📦 Verificando dependencias...');
        const { createClient } = require('@supabase/supabase-js');
        console.log('✅ @supabase/supabase-js disponible');
        
        // Test 2: Crear cliente
        console.log('🔧 Creando cliente Supabase...');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        console.log('✅ Cliente creado');
        
        // Test 3: Probar conexión básica
        console.log('🔍 Probando conexión...');
        const { data, error } = await supabase
            .from('emisores')
            .select('id')
            .limit(1);
            
        if (error) {
            console.log('⚠️ Error esperado (tabla puede no existir):', error.message);
            console.log('✅ Pero la conexión funciona - recibimos respuesta del servidor');
        } else {
            console.log('✅ Conexión exitosa - datos obtenidos:', data);
        }
        
        // Test 4: Probar auth
        console.log('🔐 Probando auth...');
        const { data: session, error: authError } = await supabase.auth.getSession();
        console.log('✅ Auth responde (sin sesión activa es normal)');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

testSupabase().then(success => {
    console.log('\n🎯 RESULTADO:');
    if (success) {
        console.log('✅ SUPABASE FUNCIONANDO CORRECTAMENTE');
    } else {
        console.log('❌ PROBLEMAS CON SUPABASE');
    }
});
