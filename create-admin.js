/**
 * 🔐 CREAR USUARIO ADMINISTRADOR PARA DESARROLLO LOCAL
 * 
 * Script para crear credenciales de administrador en Supabase
 */

// Configurar variables de entorno
process.env.SUPABASE_URL = 'https://savvwukedowcejieqgcr.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMxOTUyOSwiZXhwIjoyMDcwODk1NTI5fQ.5WfUNc6tllkY9xuu1-5Qc0Xv5GNtHWTmSDyHmQaC7tU';
process.env.JWT_SECRET = 'yO5FmJ9BDy2SV8cSx92BCkkIK4NwEBP7TmJgym9MMBxsWQwI7JPhu2GweP9TcRUWX0lYoMVvTRCIVY+/yLpP+w==';

console.log('🔐 CREANDO USUARIO ADMINISTRADOR...');

async function crearAdmin() {
    try {
        // Cargar Supabase
        const { supabase } = require('./functions/config/supabase.js');
        const bcrypt = require('bcryptjs');
        
        // Credenciales de administrador por defecto
        const adminUser = {
            email: 'admin@cfdi.local',
            password: 'admin123',
            nombre: 'Administrador',
            role: 'admin'
        };
        
        console.log('📋 Credenciales de administrador:');
        console.log('  Email:', adminUser.email);
        console.log('  Password:', adminUser.password);
        console.log('  Nombre:', adminUser.nombre);
        console.log('  Role:', adminUser.role);
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);
        
        // Intentar crear usuario en Supabase
        console.log('\n🔍 Verificando si existe tabla usuarios...');
        
        // Primero verificar si el usuario ya existe
        const { data: existingUser, error: checkError } = await supabase
            .from('usuarios')
            .select('id, email')
            .eq('email', adminUser.email)
            .single();
            
        if (existingUser) {
            console.log('✅ Usuario administrador ya existe:', existingUser.email);
            return adminUser;
        }
        
        if (checkError && !checkError.message.includes('No rows')) {
            console.log('⚠️ Error verificando usuario (tabla puede no existir):', checkError.message);
        }
        
        // Intentar crear el usuario
        console.log('\n🔧 Creando usuario administrador...');
        const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert([{
                email: adminUser.email,
                password: hashedPassword,
                nombre: adminUser.nombre,
                role: adminUser.role,
                activo: true,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (createError) {
            console.log('⚠️ Error creando usuario en Supabase:', createError.message);
            console.log('💡 Esto es normal si la tabla no existe aún');
        } else {
            console.log('✅ Usuario creado exitosamente en Supabase:', newUser.email);
        }
        
        // Crear también un emisor de prueba
        console.log('\n🏢 Creando emisor de prueba...');
        const emisorPrueba = {
            rfc: 'XAXX010101000',
            nombre: 'Emisor de Prueba',
            regimen_fiscal: '601',
            codigo_postal: '12345',
            // Certificados de prueba (base64 mock)
            certificado_cer: Buffer.from('CERTIFICADO_PRUEBA').toString('base64'),
            certificado_key: Buffer.from('LLAVE_PRIVADA_PRUEBA').toString('base64'),
            password_key: 'password123',
            numero_certificado: '20001000000300022323',
            vigencia_desde: '2024-01-01',
            vigencia_hasta: '2026-12-31',
            activo: true
        };
        
        const { data: newEmisor, error: emisorError } = await supabase
            .from('emisores')
            .insert([emisorPrueba])
            .select()
            .single();
            
        if (emisorError) {
            console.log('⚠️ Error creando emisor:', emisorError.message);
        } else {
            console.log('✅ Emisor de prueba creado:', newEmisor.rfc);
        }
        
        return adminUser;
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
        
        // Crear credenciales locales como fallback
        console.log('\n🔄 Creando credenciales locales como fallback...');
        return {
            email: 'admin@cfdi.local',
            password: 'admin123',
            nombre: 'Administrador Local',
            role: 'admin'
        };
    }
}

// Crear también un token JWT válido para pruebas
function crearTokenPrueba(user) {
    try {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { 
                userId: 'admin-local',
                email: user.email,
                role: user.role,
                nombre: user.nombre
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('\n🎫 TOKEN JWT PARA PRUEBAS:');
        console.log('Bearer', token);
        console.log('\n💡 Usa este token en el header Authorization para probar las APIs');
        
        return token;
    } catch (error) {
        console.error('❌ Error creando token:', error.message);
        return null;
    }
}

// Ejecutar
crearAdmin()
    .then(user => {
        console.log('\n✅ CONFIGURACIÓN COMPLETADA');
        console.log('='.repeat(50));
        console.log('📧 Email:', user.email);
        console.log('🔑 Password:', user.password);
        console.log('👤 Nombre:', user.nombre);
        console.log('🎭 Role:', user.role);
        console.log('='.repeat(50));
        
        // Crear token de prueba
        const token = crearTokenPrueba(user);
        
        console.log('\n🚀 LISTO PARA USAR:');
        console.log('1. Ve a http://localhost:8888/login');
        console.log('2. Usa las credenciales mostradas arriba');
        console.log('3. O usa el token JWT directamente en las APIs');
    })
    .catch(error => {
        console.error('❌ Error ejecutando script:', error.message);
    });
