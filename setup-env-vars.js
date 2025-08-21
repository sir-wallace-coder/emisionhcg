/**
 * 🔧 Script para configurar variables de entorno en Netlify
 * 
 * Este script ayuda a configurar las variables de entorno necesarias
 * para la funcionalidad de PDF usando la API de redoc.mx
 */

console.log('🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO PARA NETLIFY');
console.log('====================================================');
console.log('');
console.log('Para que la funcionalidad de PDF funcione correctamente,');
console.log('necesitas configurar estas variables de entorno en Netlify:');
console.log('');
console.log('📋 VARIABLES REQUERIDAS:');
console.log('------------------------');
console.log('REDOC_API_KEY = key_UZik7W0iDohUz6pW90Wf5sntirM9sfmxTp37t1n0vdtX8p6dtPioBpGmZocN');
console.log('REDOC_API_URL = https://api.redoc.mx/pdf');
console.log('');
console.log('🚀 PASOS PARA CONFIGURAR:');
console.log('-------------------------');
console.log('1. Ve a https://app.netlify.com');
console.log('2. Selecciona tu sitio del proyecto CFDI');
console.log('3. Ve a Site settings → Environment variables');
console.log('4. Haz clic en "Add a variable"');
console.log('5. Agrega cada variable con su valor correspondiente');
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('- La API key es sensible, no la compartas');
console.log('- Después de configurar, el sitio se redeployará automáticamente');
console.log('- Puedes verificar en los logs de las funciones serverless');
console.log('');
console.log('✅ Una vez configurado, la funcionalidad de PDF estará disponible!');
