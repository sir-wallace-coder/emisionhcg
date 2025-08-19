/**
 * ===== SCRIPT DE DIAGNÓSTICO DASHBOARD CFDI =====
 * Ejecutar en la consola del navegador para diagnosticar problemas de carga de datos
 */

async function diagnosticoDashboard() {
    console.log('🔍 === DIAGNÓSTICO DASHBOARD CFDI ===');
    
    const resultados = {
        autenticacion: false,
        token: null,
        usuario: null,
        conexionXMLs: false,
        conexionEmisores: false,
        datosLocales: {
            xmls: 0,
            emisores: 0
        },
        datosReales: {
            xmls: 0,
            emisores: 0
        },
        errores: []
    };
    
    try {
        // 1. VERIFICAR AUTENTICACIÓN
        console.log('🔐 1. Verificando autenticación...');
        
        const token = localStorage.getItem('cfdi_token');
        const usuario = localStorage.getItem('cfdi_user');
        
        resultados.token = token ? 'Presente' : 'Ausente';
        resultados.usuario = usuario ? JSON.parse(usuario) : null;
        resultados.autenticacion = !!(token && usuario);
        
        console.log('Token:', resultados.token);
        console.log('Usuario:', resultados.usuario);
        console.log('Autenticado:', resultados.autenticacion);
        
        if (!token) {
            resultados.errores.push('❌ No hay token de autenticación. Necesitas hacer login.');
            console.error('❌ No hay token de autenticación');
            return resultados;
        }
        
        // 2. VERIFICAR DATOS LOCALES
        console.log('💾 2. Verificando datos locales...');
        
        const xmlsLocales = localStorage.getItem('xmls_generados') || localStorage.getItem('xmls');
        const emisoresLocales = localStorage.getItem('emisores');
        
        if (xmlsLocales) {
            try {
                const xmlsParsed = JSON.parse(xmlsLocales);
                resultados.datosLocales.xmls = Array.isArray(xmlsParsed) ? xmlsParsed.length : 0;
                console.log('XMLs locales:', resultados.datosLocales.xmls);
            } catch (e) {
                console.error('Error parseando XMLs locales:', e);
            }
        }
        
        if (emisoresLocales) {
            try {
                const emisoresParsed = JSON.parse(emisoresLocales);
                resultados.datosLocales.emisores = Array.isArray(emisoresParsed) ? emisoresParsed.length : 0;
                console.log('Emisores locales:', resultados.datosLocales.emisores);
            } catch (e) {
                console.error('Error parseando emisores locales:', e);
            }
        }
        
        // 3. PROBAR CONEXIÓN A BACKEND - XMLs
        console.log('🌐 3. Probando conexión a backend - XMLs...');
        
        try {
            const responseXMLs = await fetch('/.netlify/functions/xmls', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Status XMLs:', responseXMLs.status);
            
            if (responseXMLs.ok) {
                const dataXMLs = await responseXMLs.json();
                console.log('Respuesta XMLs:', dataXMLs);
                
                if (dataXMLs.success && Array.isArray(dataXMLs.xmls)) {
                    resultados.conexionXMLs = true;
                    resultados.datosReales.xmls = dataXMLs.xmls.length;
                    console.log('✅ XMLs desde BD:', resultados.datosReales.xmls);
                } else {
                    resultados.errores.push('❌ Respuesta de XMLs inválida: ' + JSON.stringify(dataXMLs));
                }
            } else {
                const errorText = await responseXMLs.text();
                resultados.errores.push(`❌ Error HTTP XMLs (${responseXMLs.status}): ${errorText}`);
                console.error('Error XMLs:', responseXMLs.status, errorText);
            }
        } catch (error) {
            resultados.errores.push('❌ Error de red XMLs: ' + error.message);
            console.error('Error de red XMLs:', error);
        }
        
        // 4. PROBAR CONEXIÓN A BACKEND - Emisores
        console.log('🏢 4. Probando conexión a backend - Emisores...');
        
        try {
            const responseEmisores = await fetch('/.netlify/functions/emisores', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Status Emisores:', responseEmisores.status);
            
            if (responseEmisores.ok) {
                const dataEmisores = await responseEmisores.json();
                console.log('Respuesta Emisores:', dataEmisores);
                
                if (dataEmisores.success && Array.isArray(dataEmisores.emisores)) {
                    resultados.conexionEmisores = true;
                    resultados.datosReales.emisores = dataEmisores.emisores.length;
                    console.log('✅ Emisores desde BD:', resultados.datosReales.emisores);
                } else {
                    resultados.errores.push('❌ Respuesta de emisores inválida: ' + JSON.stringify(dataEmisores));
                }
            } else {
                const errorText = await responseEmisores.text();
                resultados.errores.push(`❌ Error HTTP Emisores (${responseEmisores.status}): ${errorText}`);
                console.error('Error Emisores:', responseEmisores.status, errorText);
            }
        } catch (error) {
            resultados.errores.push('❌ Error de red Emisores: ' + error.message);
            console.error('Error de red Emisores:', error);
        }
        
        // 5. VERIFICAR ESTADO DEL DASHBOARD
        console.log('📊 5. Verificando estado del dashboard...');
        
        if (typeof window.dashboardMain !== 'undefined') {
            console.log('✅ Dashboard principal disponible');
            
            // Verificar variables globales
            if (typeof xmls !== 'undefined') {
                console.log('XMLs en variable global:', xmls.length);
            }
            
            if (typeof emisores !== 'undefined') {
                console.log('Emisores en variable global:', emisores.length);
            }
        } else {
            console.log('❌ Dashboard principal no disponible');
            resultados.errores.push('❌ Dashboard principal no inicializado');
        }
        
    } catch (error) {
        resultados.errores.push('❌ Error general: ' + error.message);
        console.error('Error general en diagnóstico:', error);
    }
    
    // RESUMEN FINAL
    console.log('📋 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log('Autenticación:', resultados.autenticacion ? '✅' : '❌');
    console.log('Conexión XMLs:', resultados.conexionXMLs ? '✅' : '❌');
    console.log('Conexión Emisores:', resultados.conexionEmisores ? '✅' : '❌');
    console.log('XMLs locales:', resultados.datosLocales.xmls);
    console.log('XMLs reales:', resultados.datosReales.xmls);
    console.log('Emisores locales:', resultados.datosLocales.emisores);
    console.log('Emisores reales:', resultados.datosReales.emisores);
    
    if (resultados.errores.length > 0) {
        console.log('🚨 ERRORES ENCONTRADOS:');
        resultados.errores.forEach(error => console.log(error));
    }
    
    return resultados;
}

// Función para forzar recarga de datos reales
async function forzarRecargaDatos() {
    console.log('🔄 Forzando recarga de datos reales...');
    
    try {
        if (typeof CFDIStorage !== 'undefined') {
            console.log('📊 Recargando XMLs...');
            const xmlsReales = await CFDIStorage.loadXMLs();
            
            console.log('🏢 Recargando emisores...');
            const emisoresReales = await CFDIStorage.loadEmisores();
            
            if (window.dashboardMain) {
                console.log('🔄 Actualizando dashboard...');
                await window.dashboardMain.renderAllData();
                await window.dashboardMain.updateStats();
            }
            
            console.log('✅ Recarga completada');
            console.log('XMLs:', xmlsReales.length);
            console.log('Emisores:', emisoresReales.length);
        } else {
            console.error('❌ CFDIStorage no disponible');
        }
    } catch (error) {
        console.error('❌ Error en recarga:', error);
    }
}

// Ejecutar diagnóstico automáticamente
console.log('🚀 Ejecutando diagnóstico automático...');
diagnosticoDashboard().then(resultados => {
    console.log('🎯 Diagnóstico completado. Usa forzarRecargaDatos() si es necesario.');
});
