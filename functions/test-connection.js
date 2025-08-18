const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    try {
        console.log('🔧 Testing connection...');
        console.log('Environment variables check:');
        console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
        console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
        console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
        
        if (!process.env.SUPABASE_URL) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'SUPABASE_URL not found' })
            };
        }
        
        if (!process.env.SUPABASE_ANON_KEY) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'SUPABASE_ANON_KEY not found' })
            };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Test simple query
        const { data, error } = await supabase
            .from('usuarios')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Supabase query error:', error);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    error: 'Supabase connection failed', 
                    details: error.message 
                })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'Connection successful!',
                supabase_url: process.env.SUPABASE_URL,
                has_anon_key: !!process.env.SUPABASE_ANON_KEY,
                has_jwt_secret: !!process.env.JWT_SECRET
            })
        };

    } catch (error) {
        console.error('Test function error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack
            })
        };
    }
};
