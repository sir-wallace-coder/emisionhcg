const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitamos la service key para crear usuarios
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
    try {
        console.log('🔧 Creando usuario administrador...');
        
        // Datos del usuario admin
        const adminData = {
            email: 'admin@cfdi-sistema.com',
            password: 'AdminCFDI2024!@#$',
            nombre: 'Administrador',
            apellido: 'Sistema',
            empresa: 'CFDI Sistema Completo',
            telefono: '5555555555',
            rol: 'admin'
        };

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Intentar crear usuario en Supabase Auth o obtener existente
        let authUser;
        const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
            email: adminData.email,
            password: adminData.password,
            email_confirm: true
        });

        if (authError && authError.code === 'email_exists') {
            console.log('⚠️ Usuario ya existe en Auth, obteniendo información...');
            // Obtener usuario existente
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === adminData.email);
            if (existingUser) {
                authUser = { user: existingUser };
                console.log('✅ Usuario encontrado en Auth:', existingUser.id);
            } else {
                console.error('❌ No se pudo encontrar el usuario existente');
                return;
            }
        } else if (authError) {
            console.error('❌ Error creando usuario en Auth:', authError);
            return;
        } else {
            authUser = newAuthUser;
            console.log('✅ Usuario creado en Auth:', authUser.user.id);
        }

        // Verificar si el usuario ya existe en la tabla
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id')
            .eq('id', authUser.user.id)
            .single();

        if (existingUser) {
            console.log('✅ Usuario ya existe en la base de datos');
        } else {
            // Crear registro en la tabla usuarios
            const { data: dbUser, error: dbError } = await supabase
                .from('usuarios')
                .insert([
                    {
                        id: authUser.user.id,
                        email: adminData.email,
                        password_hash: hashedPassword,
                        nombre: adminData.nombre,
                        apellido: adminData.apellido,
                        empresa: adminData.empresa,
                        telefono: adminData.telefono,
                        rol: adminData.rol,
                        activo: true,
                        email_verificado: true
                    }
                ])
                .select();

            if (dbError) {
                console.error('❌ Error creando usuario en BD:', dbError);
                return;
            }

            console.log('✅ Usuario creado en la base de datos');
        }

        console.log('✅ Usuario administrador creado exitosamente:');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('👤 Nombre:', `${adminData.nombre} ${adminData.apellido}`);
        console.log('🏢 Empresa:', adminData.empresa);
        console.log('🎭 Rol:', adminData.rol);
        console.log('');
        console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
        console.log('🔗 URL de login: https://tu-dominio.netlify.app/login');

    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Verificar variables de entorno
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
}

// Ejecutar
createAdminUser();
