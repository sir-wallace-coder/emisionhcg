#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA LOCAL - INSERCIÓN DE EMISORES
 * Prueba la inserción de emisores con y sin CSD en la base de datos
 * antes de hacer deploy a producción
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de prueba
const testUserId = '00000000-0000-0000-0000-000000000001'; // Usuario de prueba

const testEmisorSinCSD = {
  usuario_id: testUserId,
  rfc: 'XAXX010101000',
  nombre: 'Empresa Test Sin CSD S.A. de C.V.',
  codigo_postal: '01000',
  regimen_fiscal: '601',
  activo: true
};

const testEmisorConCSD = {
  usuario_id: testUserId,
  rfc: 'XEXX010101000',
  nombre: 'Empresa Test Con CSD S.A. de C.V.',
  codigo_postal: '01000',
  regimen_fiscal: '601',
  activo: true,
  certificado_cer: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNuakNDQVlZQ0NRRGQwN2VhUXdOVEFqQU5CZ2txaGtpRzl3MEJBUXNGQURBUk1ROHdEUVlEVlFRRERBWnUKYjNSbGMzUXdIaGNOTWpRd01USXhNRGt6TnpNNFdoY05NalV3TVRJd01Ea3pOek00V2pBUk1ROHdEUVlEVlFRRApEQVp1YjNSbGMzUXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFEQzFOVGhOVEZuCmJHVnNiSFJsYzNRZ1kyVnlkR2xtYVdOaGRHVWdabTl5SUhSbGMzUnBibWNnY0hWeWNHOXpaWE09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0=', // Certificado de prueba en base64
  certificado_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRREMxTlRoTlRGbmJHVnMKYkhSbGMzUWdZMlZ5ZEdsbWFXTmhkR1VnWm05eUlIUmxjM1JwYm1jZ2NIVnljRzl6WlhNPQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0t', // Llave privada de prueba en base64
  password_key: 'test123456',
  numero_certificado: 'CSD_TEST_123456789',
  vigencia_desde: '2024-01-01',
  vigencia_hasta: '2028-01-01'
};

async function testDatabaseConnection() {
  console.log('🔌 Probando conexión a Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    return true;
  } catch (err) {
    console.error('❌ Excepción en conexión:', err);
    return false;
  }
}

async function ensureTestUser() {
  console.log('👤 Verificando usuario de prueba...');
  
  try {
    // Verificar si existe el usuario de prueba
    const { data: existingUser, error: selectError } = await supabase
      .from('usuarios')
      .select('id, email')
      .eq('id', testUserId)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Error verificando usuario:', selectError);
      return false;
    }
    
    if (existingUser) {
      console.log('✅ Usuario de prueba existe:', existingUser.email);
      return true;
    }
    
    // Crear usuario de prueba
    console.log('📝 Creando usuario de prueba...');
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert([{
        id: testUserId,
        email: 'test@local.com',
        password_hash: '$2b$10$test.hash.for.local.testing.only',
        nombre: 'Usuario Test',
        apellido: 'Local',
        activo: true,
        email_verificado: true
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error creando usuario de prueba:', insertError);
      return false;
    }
    
    console.log('✅ Usuario de prueba creado exitosamente');
    return true;
    
  } catch (err) {
    console.error('❌ Excepción manejando usuario de prueba:', err);
    return false;
  }
}

async function testInsertEmisorSinCSD() {
  console.log('\n📝 === PRUEBA 1: EMISOR SIN CSD ===');
  
  try {
    console.log('Datos a insertar:', JSON.stringify(testEmisorSinCSD, null, 2));
    
    const { data: emisor, error } = await supabase
      .from('emisores')
      .insert([testEmisorSinCSD])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error insertando emisor sin CSD:', error);
      console.error('Código de error:', error.code);
      console.error('Detalles:', error.details);
      console.error('Hint:', error.hint);
      return false;
    }
    
    console.log('✅ Emisor sin CSD insertado exitosamente');
    console.log('ID:', emisor.id);
    console.log('RFC:', emisor.rfc);
    console.log('Nombre:', emisor.nombre);
    
    return emisor.id;
    
  } catch (err) {
    console.error('❌ Excepción insertando emisor sin CSD:', err);
    return false;
  }
}

async function testInsertEmisorConCSD() {
  console.log('\n🔐 === PRUEBA 2: EMISOR CON CSD ===');
  
  try {
    console.log('Datos a insertar (sin mostrar certificados completos):');
    const logData = { ...testEmisorConCSD };
    logData.certificado_cer = `${logData.certificado_cer.substring(0, 50)}...`;
    logData.certificado_key = `${logData.certificado_key.substring(0, 50)}...`;
    console.log(JSON.stringify(logData, null, 2));
    
    const { data: emisor, error } = await supabase
      .from('emisores')
      .insert([testEmisorConCSD])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error insertando emisor con CSD:', error);
      console.error('Código de error:', error.code);
      console.error('Detalles:', error.details);
      console.error('Hint:', error.hint);
      return false;
    }
    
    console.log('✅ Emisor con CSD insertado exitosamente');
    console.log('ID:', emisor.id);
    console.log('RFC:', emisor.rfc);
    console.log('Nombre:', emisor.nombre);
    console.log('Número certificado:', emisor.numero_certificado);
    console.log('Vigencia desde:', emisor.vigencia_desde);
    console.log('Vigencia hasta:', emisor.vigencia_hasta);
    
    return emisor.id;
    
  } catch (err) {
    console.error('❌ Excepción insertando emisor con CSD:', err);
    return false;
  }
}

async function cleanupTestData(emisorIds) {
  console.log('\n🧹 === LIMPIEZA DE DATOS DE PRUEBA ===');
  
  try {
    if (emisorIds.length > 0) {
      const { error } = await supabase
        .from('emisores')
        .delete()
        .in('id', emisorIds);
      
      if (error) {
        console.error('❌ Error limpiando emisores:', error);
      } else {
        console.log('✅ Emisores de prueba eliminados');
      }
    }
    
    // Limpiar usuario de prueba
    const { error: userError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', testUserId);
    
    if (userError) {
      console.error('❌ Error limpiando usuario de prueba:', userError);
    } else {
      console.log('✅ Usuario de prueba eliminado');
    }
    
  } catch (err) {
    console.error('❌ Excepción en limpieza:', err);
  }
}

async function runTests() {
  console.log('🧪 === INICIANDO PRUEBAS LOCALES DE INSERCIÓN DE EMISORES ===\n');
  
  const emisorIds = [];
  
  try {
    // 1. Probar conexión
    if (!(await testDatabaseConnection())) {
      console.error('❌ No se puede conectar a la base de datos');
      process.exit(1);
    }
    
    // 2. Asegurar usuario de prueba
    if (!(await ensureTestUser())) {
      console.error('❌ No se puede crear/verificar usuario de prueba');
      process.exit(1);
    }
    
    // 3. Probar emisor sin CSD
    const emisorSinCSDId = await testInsertEmisorSinCSD();
    if (emisorSinCSDId) {
      emisorIds.push(emisorSinCSDId);
    }
    
    // 4. Probar emisor con CSD
    const emisorConCSDId = await testInsertEmisorConCSD();
    if (emisorConCSDId) {
      emisorIds.push(emisorConCSDId);
    }
    
    // 5. Resumen de resultados
    console.log('\n📊 === RESUMEN DE RESULTADOS ===');
    console.log(`Emisor sin CSD: ${emisorSinCSDId ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`Emisor con CSD: ${emisorConCSDId ? '✅ ÉXITO' : '❌ FALLO'}`);
    
    if (emisorSinCSDId && emisorConCSDId) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! El sistema está listo para deploy.');
    } else {
      console.log('\n⚠️ ALGUNAS PRUEBAS FALLARON. Revisar errores antes del deploy.');
    }
    
  } catch (err) {
    console.error('❌ Error general en las pruebas:', err);
  } finally {
    // Limpiar datos de prueba
    await cleanupTestData(emisorIds);
  }
}

// Ejecutar pruebas
runTests().then(() => {
  console.log('\n✅ Pruebas completadas');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal en las pruebas:', err);
  process.exit(1);
});
