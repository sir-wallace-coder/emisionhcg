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
        console.log('🔧 DEBUG LOGIN: Starting login debug...');
        
        const testCredentials = {
            email: 'admin@cfdi-sistema.com',
            password: 'AdminCFDI2024!@#$'
        };

        console.log('🔧 DEBUG LOGIN: Test credentials:', { 
            email: testCredentials.email, 
            password: '***hidden***' 
        });

        // 1. Buscar usuario en la base de datos
        console.log('🔧 DEBUG LOGIN: Searching for user...');
        const { data: user, error: searchError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', testCredentials.email)
            .single();

        console.log('🔧 DEBUG LOGIN: User search result:', { 
            found: !!user, 
            error: searchError,
            userId: user?.id,
            hasPasswordHash: !!user?.password_hash
        });

        if (searchError || !user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'User not found',
                    searchError: searchError,
                    email: testCredentials.email
                })
            };
        }

        // 2. Verificar contraseña
        console.log('🔧 DEBUG LOGIN: Comparing passwords...');
        console.log('🔧 DEBUG LOGIN: Stored hash:', user.password_hash?.substring(0, 10) + '...');
        
        const validPassword = await bcrypt.compare(testCredentials.password, user.password_hash);
        console.log('🔧 DEBUG LOGIN: Password comparison result:', validPassword);

        // 3. Test manual hash comparison
        const testHash = await bcrypt.hash(testCredentials.password, 10);
        console.log('🔧 DEBUG LOGIN: New hash for same password:', testHash.substring(0, 10) + '...');
        
        const testComparison = await bcrypt.compare(testCredentials.password, testHash);
        console.log('🔧 DEBUG LOGIN: Test hash comparison (should be true):', testComparison);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Debug completed',
                userFound: !!user,
                passwordValid: validPassword,
                userInfo: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    rol: user.rol,
                    activo: user.activo
                },
                hashInfo: {
                    storedHashStart: user.password_hash?.substring(0, 10),
                    testHashStart: testHash.substring(0, 10),
                    testComparison: testComparison
                }
            })
        };

    } catch (error) {
        console.error('🔧 DEBUG LOGIN: Catch error:', error);
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
