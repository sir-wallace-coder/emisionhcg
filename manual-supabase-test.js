/**
 * 🧪 PRUEBA MANUAL DE SUPABASE - SIN DEPENDENCIAS EXTERNAS
 * 
 * Verificación básica de configuración de Supabase
 */

console.log('='.repeat(50));
console.log('🔗 VERIFICACIÓN MANUAL DE SUPABASE');
console.log('='.repeat(50));

// Configuración
const config = {
    url: 'https://savvwukedowcejieqgcr.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTk1MjksImV4cCI6MjA3MDg5NTUyOX0.ssTVHrySTZJz0qwfPyWfCJ7evQyQNB6zD2BO2_qvARk',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMxOTUyOSwiZXhwIjoyMDcwODk1NTI5fQ.5WfUNc6tllkY9xuu1-5Qc0Xv5GNtHWTmSDyHmQaC7tU',
    jwtSecret: 'yO5FmJ9BDy2SV8cSx92BCkkIK4NwEBP7TmJgym9MMBxsWQwI7JPhu2GweP9TcRUWX0lYoMVvTRCIVY+/yLpP+w=='
};

console.log('📋 CONFIGURACIÓN:');
console.log('  URL:', config.url);
console.log('  ANON Key:', config.anonKey ? 'Configurado ✅' : 'No configurado ❌');
console.log('  Service Key:', config.serviceKey ? 'Configurado ✅' : 'No configurado ❌');
console.log('  JWT Secret:', config.jwtSecret ? 'Configurado ✅' : 'No configurado ❌');

console.log('\n🔍 VERIFICACIÓN DE TOKENS:');

// Verificar formato de tokens JWT
function verificarJWT(token, nombre) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.log(`❌ ${nombre}: Formato JWT inválido`);
            return false;
        }
        
        // Decodificar header
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
        console.log(`✅ ${nombre}: Header válido -`, header);
        
        // Decodificar payload
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log(`✅ ${nombre}: Payload válido -`, {
            iss: payload.iss,
            ref: payload.ref,
            role: payload.role,
            exp: new Date(payload.exp * 1000).toISOString()
        });
        
        return true;
    } catch (error) {
        console.log(`❌ ${nombre}: Error decodificando -`, error.message);
        return false;
    }
}

verificarJWT(config.anonKey, 'ANON Key');
verificarJWT(config.serviceKey, 'Service Key');

console.log('\n🔧 PRUEBA DE DEPENDENCIAS:');

// Verificar dependencias básicas
const dependencias = [
    '@supabase/supabase-js',
    'jsonwebtoken',
    '@xmldom/xmldom',
    'node-forge'
];

dependencias.forEach(dep => {
    try {
        require(dep);
        console.log(`✅ ${dep}: Disponible`);
    } catch (error) {
        console.log(`❌ ${dep}: No disponible - ${error.message}`);
    }
});

console.log('\n🎯 RESULTADO:');
console.log('La configuración de Supabase está lista.');
console.log('Si las dependencias están disponibles, la conexión debería funcionar.');

// Crear archivo .env si no existe
const fs = require('fs');
const envContent = `# Variables de entorno para desarrollo local
JWT_SECRET=${config.jwtSecret}
SUPABASE_URL=${config.url}
SUPABASE_ANON_KEY=${config.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${config.serviceKey}
NETLIFY_DEV=true
NODE_ENV=development
`;

try {
    if (!fs.existsSync('.env')) {
        fs.writeFileSync('.env', envContent);
        console.log('✅ Archivo .env creado automáticamente');
    } else {
        console.log('ℹ️ Archivo .env ya existe');
    }
} catch (error) {
    console.log('⚠️ No se pudo crear .env:', error.message);
}

console.log('='.repeat(50));
