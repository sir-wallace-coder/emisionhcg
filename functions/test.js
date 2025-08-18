const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    try {
        console.log('🔧 Testing Supabase connection...');
        console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
        console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
        console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
        
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Missing environment variables',
                    supabase_url: !!process.env.SUPABASE_URL,
                    supabase_key: !!process.env.SUPABASE_ANON_KEY,
                    jwt_secret: !!process.env.JWT_SECRET
                })
            };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Test connection
        const { data, error } = await supabase
            .from('usuarios')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Supabase error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Supabase connection failed',
                    details: error.message
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'All systems working!',
                supabase_connected: true,
                env_vars_present: true
            })
        };

    } catch (error) {
        console.error('Test function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};
