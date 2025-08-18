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
        console.log('🔧 DEBUG: Starting auth debug...');
        console.log('Request body:', event.body);
        
        const testData = {
            email: 'debug@test.com',
            password: 'Test123!',
            nombre: 'Debug User'
        };

        console.log('🔧 DEBUG: Test data:', testData);

        // 1. Test if user already exists
        console.log('🔧 DEBUG: Checking if user exists...');
        const { data: existingUser, error: checkError } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', testData.email)
            .single();

        console.log('🔧 DEBUG: Existing user check result:', { existingUser, checkError });

        // If user exists, delete it first for testing
        if (existingUser) {
            console.log('🔧 DEBUG: Deleting existing test user...');
            const { error: deleteError } = await supabase
                .from('usuarios')
                .delete()
                .eq('email', testData.email);
            console.log('🔧 DEBUG: Delete result:', deleteError);
        }

        // 2. Hash password
        console.log('🔧 DEBUG: Hashing password...');
        const hashedPassword = await bcrypt.hash(testData.password, 10);
        console.log('🔧 DEBUG: Password hashed successfully');

        // 3. Try to insert user
        console.log('🔧 DEBUG: Attempting to insert user...');
        const insertData = {
            email: testData.email,
            password_hash: hashedPassword,
            nombre: testData.nombre,
            activo: true,
            created_at: new Date().toISOString()
        };
        
        console.log('🔧 DEBUG: Insert data:', insertData);

        const { data: user, error: insertError } = await supabase
            .from('usuarios')
            .insert([insertData])
            .select()
            .single();

        console.log('🔧 DEBUG: Insert result:', { user, insertError });

        if (insertError) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Insert failed',
                    details: insertError,
                    insertData: insertData
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Debug successful!',
                user: user
            })
        };

    } catch (error) {
        console.error('🔧 DEBUG: Catch error:', error);
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
