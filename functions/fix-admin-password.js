const { supabase } = require('./config/supabase');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('🔧 FIX ADMIN: Starting password fix...');
        
        const adminCredentials = {
            email: 'admin@cfdi-sistema.com',
            password: 'AdminCFDI2024!@#$'
        };

        // 1. Generar nuevo hash de contraseña
        console.log('🔧 FIX ADMIN: Generating new password hash...');
        const newHashedPassword = await bcrypt.hash(adminCredentials.password, 10);
        console.log('🔧 FIX ADMIN: New hash generated:', newHashedPassword.substring(0, 10) + '...');

        // 2. Actualizar en la base de datos
        console.log('🔧 FIX ADMIN: Updating password in database...');
        const { data, error } = await supabase
            .from('usuarios')
            .update({ 
                password_hash: newHashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('email', adminCredentials.email)
            .select();

        if (error) {
            console.error('🔧 FIX ADMIN: Update error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Failed to update password',
                    details: error
                })
            };
        }

        console.log('🔧 FIX ADMIN: Password updated successfully');

        // 3. Verificar que el nuevo hash funciona
        console.log('🔧 FIX ADMIN: Testing new password...');
        const testComparison = await bcrypt.compare(adminCredentials.password, newHashedPassword);
        console.log('🔧 FIX ADMIN: New password test result:', testComparison);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Admin password fixed successfully!',
                email: adminCredentials.email,
                passwordUpdated: true,
                testResult: testComparison,
                newHashStart: newHashedPassword.substring(0, 10) + '...'
            })
        };

    } catch (error) {
        console.error('🔧 FIX ADMIN: Catch error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack
            })
        };
    }
};
