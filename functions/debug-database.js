const { supabase } = require('./config/supabase');

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
    console.log('🔍 Iniciando diagnóstico de base de datos...');
    
    const diagnostico = {
      usuarios: { count: 0, data: [] },
      emisores: { count: 0, data: [] },
      xmls: { count: 0, data: [] },
      errores: []
    };

    // 1. Verificar usuarios
    try {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from('usuarios')
        .select('*');
      
      if (errorUsuarios) {
        diagnostico.errores.push(`Error usuarios: ${errorUsuarios.message}`);
      } else {
        diagnostico.usuarios.count = usuarios.length;
        diagnostico.usuarios.data = usuarios.map(u => ({
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          created_at: u.created_at
        }));
      }
    } catch (error) {
      diagnostico.errores.push(`Error consultando usuarios: ${error.message}`);
    }

    // 2. Verificar emisores
    try {
      const { data: emisores, error: errorEmisores } = await supabase
        .from('emisores')
        .select('*');
      
      if (errorEmisores) {
        diagnostico.errores.push(`Error emisores: ${errorEmisores.message}`);
      } else {
        diagnostico.emisores.count = emisores.length;
        diagnostico.emisores.data = emisores.map(e => ({
          id: e.id,
          user_id: e.user_id,
          rfc: e.rfc,
          razon_social: e.razon_social,
          created_at: e.created_at
        }));
      }
    } catch (error) {
      diagnostico.errores.push(`Error consultando emisores: ${error.message}`);
    }

    // 3. Verificar XMLs
    try {
      const { data: xmls, error: errorXMLs } = await supabase
        .from('xmls')
        .select('*');
      
      if (errorXMLs) {
        diagnostico.errores.push(`Error XMLs: ${errorXMLs.message}`);
      } else {
        diagnostico.xmls.count = xmls.length;
        diagnostico.xmls.data = xmls.map(x => ({
          id: x.id,
          user_id: x.user_id,
          serie: x.serie,
          folio: x.folio,
          emisor_rfc: x.emisor_rfc,
          created_at: x.created_at
        }));
      }
    } catch (error) {
      diagnostico.errores.push(`Error consultando XMLs: ${error.message}`);
    }

    // 4. Verificar configuración de Supabase
    const config = {
      supabase_url: process.env.SUPABASE_URL ? 'Configurada' : 'No configurada',
      supabase_key: process.env.SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada',
      jwt_secret: process.env.JWT_SECRET ? 'Configurada' : 'No configurada'
    };

    console.log('📊 Diagnóstico completado:', diagnostico);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        diagnostico,
        config,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
