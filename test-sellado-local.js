/**
 * 🧪 SCRIPT DE PRUEBA LOCAL - SELLADO CFDI
 * 
 * Script para probar el sistema de sellado CFDI en entorno local
 * y detectar errores específicos
 */

console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE SELLADO CFDI...');

// Test 1: Verificar imports y dependencias
console.log('\n📦 TEST 1: Verificando imports y dependencias...');
try {
    const { sellarCFDIBasadoEnPython } = require('./functions/utils/python-based-sealer.js');
    const { generarCadenaOriginalXSLTServerless } = require('./functions/utils/xslt-processor-serverless.js');
    const { supabase } = require('./functions/config/supabase.js');
    
    console.log('✅ Todos los imports exitosos');
    console.log('  - python-based-sealer: OK');
    console.log('  - xslt-processor-serverless: OK');
    console.log('  - supabase config: OK');
    
} catch (error) {
    console.error('❌ Error en imports:', error.message);
    console.error('Stack:', error.stack);
}

// Test 2: Verificar dependencias Node.js
console.log('\n🔍 TEST 2: Verificando dependencias Node.js...');
try {
    const crypto = require('crypto');
    const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
    const jwt = require('jsonwebtoken');
    const forge = require('node-forge');
    
    console.log('✅ Dependencias Node.js disponibles');
    console.log('  - crypto: OK');
    console.log('  - @xmldom/xmldom: OK');
    console.log('  - jsonwebtoken: OK');
    console.log('  - node-forge: OK');
    
} catch (error) {
    console.error('❌ Error en dependencias:', error.message);
}

// Test 3: Probar generación de cadena original con XML de ejemplo
console.log('\n🔗 TEST 3: Probando generación de cadena original...');
try {
    const { generarCadenaOriginalXSLTServerless } = require('./functions/utils/xslt-processor-serverless.js');
    
    // XML CFDI 4.0 de ejemplo simplificado
    const xmlEjemplo = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
    Version="4.0" 
    Serie="A" 
    Folio="123" 
    Fecha="2024-01-01T12:00:00" 
    NoCertificado="20001000000300022323" 
    SubTotal="1000.00" 
    Moneda="MXN" 
    Total="1160.00" 
    TipoDeComprobante="I" 
    Exportacion="01" 
    LugarExpedicion="12345">
    
    <cfdi:Emisor Rfc="XAXX010101000" Nombre="Emisor Ejemplo" RegimenFiscal="601"/>
    
    <cfdi:Receptor Rfc="XAXX010101000" Nombre="Receptor Ejemplo" 
        DomicilioFiscalReceptor="12345" 
        RegimenFiscalReceptor="601" 
        UsoCFDI="G01"/>
    
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="01010101" 
            Cantidad="1" 
            ClaveUnidad="H87" 
            Descripcion="Producto ejemplo" 
            ValorUnitario="1000.00" 
            Importe="1000.00" 
            ObjetoImp="02">
            
            <cfdi:Impuestos>
                <cfdi:Traslados>
                    <cfdi:Traslado Base="1000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="160.00"/>
                </cfdi:Traslados>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    
    <cfdi:Impuestos>
        <cfdi:Traslados>
            <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="160.00"/>
        </cfdi:Traslados>
    </cfdi:Impuestos>
</cfdi:Comprobante>`;

    const cadenaOriginal = generarCadenaOriginalXSLTServerless(xmlEjemplo, '4.0');
    
    if (cadenaOriginal) {
        console.log('✅ Cadena original generada exitosamente');
        console.log('📏 Longitud:', cadenaOriginal.length);
        console.log('🔍 Primeros 100 chars:', cadenaOriginal.substring(0, 100));
    } else {
        console.error('❌ No se pudo generar la cadena original');
    }
    
} catch (error) {
    console.error('❌ Error generando cadena original:', error.message);
    console.error('Stack:', error.stack);
}

// Test 4: Verificar funcionalidad crypto básica
console.log('\n🔐 TEST 4: Verificando funcionalidad crypto básica...');
try {
    const crypto = require('crypto');
    
    // Probar hash
    const hash = crypto.createHash('sha256').update('test').digest('hex');
    console.log('✅ Hash SHA256: OK');
    
    // Probar sign/verify básico
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update('test data');
    const signature = sign.sign(privateKey);
    
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update('test data');
    const isValid = verify.verify(publicKey, signature);
    
    console.log('✅ Crypto sign/verify:', isValid ? 'OK' : 'FAILED');
    
} catch (error) {
    console.error('❌ Error en crypto:', error.message);
}

console.log('\n🎯 PRUEBAS COMPLETADAS');
console.log('📊 Revisa los resultados arriba para identificar errores específicos');
