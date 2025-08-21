const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase con fallbacks para desarrollo
const supabaseUrl = process.env.SUPABASE_URL || 'https://savvwukedowcejieqgcr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'fallback-key';

// Solo validar en producción
if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon'))) {
  throw new Error('Missing or invalid Supabase environment variables in production');
}

// Crear cliente con configuración robusta
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false // Para serverless functions
    }
  });
  console.log('✅ SUPABASE: Cliente configurado correctamente');
} catch (error) {
  console.error('❌ SUPABASE: Error configurando cliente:', error.message);
  // Crear cliente mock para desarrollo local
  supabase = {
    from: () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  };
}

module.exports = { supabase };
