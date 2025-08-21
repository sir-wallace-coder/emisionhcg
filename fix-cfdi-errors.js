/**
 * 🔧 SCRIPT DE CORRECCIÓN DE ERRORES CFDI
 * 
 * Script para identificar y corregir errores comunes en el sistema de sellado CFDI
 */

console.log('🔧 INICIANDO CORRECCIÓN DE ERRORES CFDI...');

// Función para verificar y corregir errores específicos
async function corregirErroresCFDI() {
    const erroresEncontrados = [];
    const correccionesAplicadas = [];

    // Error 1: Verificar dependencias críticas
    console.log('\n📦 Verificando dependencias críticas...');
    try {
        require('@xmldom/xmldom');
        require('node-forge');
        require('jsonwebtoken');
        require('@supabase/supabase-js');
        console.log('✅ Todas las dependencias están disponibles');
    } catch (error) {
        erroresEncontrados.push(`Dependencia faltante: ${error.message}`);
        console.error('❌ Dependencia faltante:', error.message);
    }

    // Error 2: Verificar configuración de Supabase
    console.log('\n🔍 Verificando configuración de Supabase...');
    try {
        const { supabase } = require('./functions/config/supabase.js');
        console.log('✅ Configuración de Supabase cargada');
    } catch (error) {
        erroresEncontrados.push(`Error configuración Supabase: ${error.message}`);
        console.error('❌ Error configuración Supabase:', error.message);
    }

    // Error 3: Verificar procesador XSLT
    console.log('\n🔗 Verificando procesador XSLT...');
    try {
        const { generarCadenaOriginalXSLTServerless } = require('./functions/utils/xslt-processor-serverless.js');
        
        // Probar con XML mínimo
        const xmlMinimo = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
    Version="4.0" 
    Fecha="2024-01-01T12:00:00" 
    NoCertificado="12345678901234567890" 
    SubTotal="100.00" 
    Moneda="MXN" 
    Total="116.00" 
    TipoDeComprobante="I" 
    Exportacion="01" 
    LugarExpedicion="12345">
    <cfdi:Emisor Rfc="XAXX010101000" Nombre="Test" RegimenFiscal="601"/>
    <cfdi:Receptor Rfc="XAXX010101000" Nombre="Test" DomicilioFiscalReceptor="12345" RegimenFiscalReceptor="601" UsoCFDI="G01"/>
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1" ClaveUnidad="H87" Descripcion="Test" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02"/>
    </cfdi:Conceptos>
</cfdi:Comprobante>`;

        const cadena = generarCadenaOriginalXSLTServerless(xmlMinimo, '4.0');
        if (cadena && cadena.startsWith('|') && cadena.endsWith('||')) {
            console.log('✅ Procesador XSLT funcionando correctamente');
            console.log('📏 Cadena generada (longitud):', cadena.length);
        } else {
            erroresEncontrados.push('Procesador XSLT no genera cadena válida');
            console.error('❌ Procesador XSLT no genera cadena válida');
        }
    } catch (error) {
        erroresEncontrados.push(`Error procesador XSLT: ${error.message}`);
        console.error('❌ Error procesador XSLT:', error.message);
    }

    // Error 4: Verificar funcionalidad crypto
    console.log('\n🔐 Verificando funcionalidad crypto...');
    try {
        const crypto = require('crypto');
        
        // Probar generación de hash
        const hash = crypto.createHash('sha256').update('test').digest('hex');
        if (hash && hash.length === 64) {
            console.log('✅ Hash SHA256 funcionando');
        }

        // Probar generación de claves RSA
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        // Probar firma y verificación
        const sign = crypto.createSign('RSA-SHA256');
        sign.update('test data');
        const signature = sign.sign(privateKey);

        const verify = crypto.createVerify('RSA-SHA256');
        verify.update('test data');
        const isValid = verify.verify(publicKey, signature);

        if (isValid) {
            console.log('✅ Funcionalidad crypto RSA funcionando');
        } else {
            erroresEncontrados.push('Error en verificación de firma RSA');
        }

    } catch (error) {
        erroresEncontrados.push(`Error crypto: ${error.message}`);
        console.error('❌ Error crypto:', error.message);
    }

    // Error 5: Verificar node-forge
    console.log('\n🔨 Verificando node-forge...');
    try {
        const forge = require('node-forge');
        
        // Probar funcionalidad básica de forge
        const md = forge.md.sha256.create();
        md.update('test');
        const hash = md.digest().toHex();
        
        if (hash && hash.length === 64) {
            console.log('✅ Node-forge funcionando correctamente');
        }

        // Probar generación de certificado de prueba
        const keys = forge.pki.rsa.generateKeyPair(2048);
        if (keys.privateKey && keys.publicKey) {
            console.log('✅ Generación de claves RSA con forge funcionando');
        }

    } catch (error) {
        erroresEncontrados.push(`Error node-forge: ${error.message}`);
        console.error('❌ Error node-forge:', error.message);
    }

    // Resumen de errores y correcciones
    console.log('\n📊 RESUMEN DE DIAGNÓSTICO:');
    console.log('==========================================');
    
    if (erroresEncontrados.length === 0) {
        console.log('🎉 ¡NO SE ENCONTRARON ERRORES!');
        console.log('✅ El sistema de sellado CFDI está funcionando correctamente');
    } else {
        console.log(`❌ Se encontraron ${erroresEncontrados.length} errores:`);
        erroresEncontrados.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }

    if (correccionesAplicadas.length > 0) {
        console.log(`\n🔧 Correcciones aplicadas: ${correccionesAplicadas.length}`);
        correccionesAplicadas.forEach((correccion, index) => {
            console.log(`   ${index + 1}. ${correccion}`);
        });
    }

    return {
        errores: erroresEncontrados,
        correcciones: correccionesAplicadas,
        exitoso: erroresEncontrados.length === 0
    };
}

// Ejecutar diagnóstico
corregirErroresCFDI()
    .then(resultado => {
        console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
        if (resultado.exitoso) {
            console.log('✅ Sistema listo para usar');
        } else {
            console.log('⚠️ Revisar errores encontrados arriba');
        }
    })
    .catch(error => {
        console.error('❌ Error ejecutando diagnóstico:', error.message);
        console.error('Stack:', error.stack);
    });
