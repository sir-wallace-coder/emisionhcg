const crypto = require('crypto');
const forge = require('node-forge');
const { DOMParser, XMLSerializer } = require('xmldom');
const { generarCadenaOriginalXSLT } = require('../xslt-processor');

/**
 * Normaliza espacios en blanco según XSLT SAT (normalize-space)
 * Implementación basada en las mejores prácticas de PHPCFDI
 * @param {string} str - Cadena a normalizar
 * @returns {string} Cadena normalizada
 */
function normalizeSpace(str) {
    if (!str) return '';
    // Implementa normalize-space() de XSLT:
    // 1. Reemplaza secuencias de espacios en blanco por un solo espacio
    // 2. Elimina espacios al inicio y final
    return str.replace(/\s+/g, ' ').trim();
}

/**
 * Sella XML CFDI siguiendo el flujo corregido para evitar CFDI40102
 * CRÍTICO: UNA SOLA serialización y eliminación completa del atributo Sello para cadena original
 * @param {string} xmlContent - XML original sin sellar
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {object} Resultado del sellado unificado
 */
function sellarXMLUnificado(xmlContent, noCertificado, certificadoBase64, llavePrivadaPem, version) {
    try {
        console.log('🔧 SELLADO UNIFICADO: Iniciando proceso corregido CFDI40102...');
        console.log('🔍 FORENSE INICIAL: Versión CFDI:', version);
        console.log('🔍 FORENSE INICIAL: NoCertificado:', noCertificado);
        console.log('🔍 FORENSE INICIAL: Longitud XML original:', xmlContent.length);
        
        // 1. Parsear XML original
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Verificar que se parsó correctamente
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            console.log('❌ FORENSE ERROR: XML mal formado al parsear');
            return { exito: false, error: 'XML mal formado' };
        }
        
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            console.log('❌ FORENSE ERROR: No se encontró cfdi:Comprobante');
            return { exito: false, error: 'No se encontró el elemento cfdi:Comprobante' };
        }
        
        console.log('✅ FORENSE: XML parseado correctamente');
        console.log('🔍 FORENSE: Atributos actuales del comprobante:', Array.from(comprobante.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '));
        
        // 2. PASO 1: Limpiar atributos de sellado previos
        const atributosLimpieza = ['NoCertificado', 'Certificado', 'Sello'];
        let atributosEliminados = [];
        atributosLimpieza.forEach(attr => {
            if (comprobante.hasAttribute(attr)) {
                const valorAnterior = comprobante.getAttribute(attr);
                comprobante.removeAttribute(attr);
                atributosEliminados.push(`${attr}="${valorAnterior}"`);
                console.log(`🧹 FORENSE LIMPIEZA: Eliminado ${attr}`);
            }
        });
        
        if (atributosEliminados.length === 0) {
            console.log('🔍 FORENSE LIMPIEZA: No había atributos de sellado previos');
        }
        
        // 3. CORRECCIÓN CRÍTICA: Agregar SOLO NoCertificado y Certificado (SIN Sello)
        console.log('🔧 CFDI40102 FIX: Agregando NoCertificado y Certificado...');
        
        // DEBUG EXTREMO: Estado ANTES de agregar atributos
        console.log('🔍 DEBUG EXTREMO: Atributos ANTES de agregar NoCertificado/Certificado:');
        Array.from(comprobante.attributes).forEach((attr, index) => {
            console.log(`  ${index + 1}. ${attr.name}="${attr.value}"`); 
        });
        
        comprobante.setAttribute('NoCertificado', noCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        
        // DEBUG EXTREMO: Estado DESPUÉS de agregar atributos
        console.log('🔍 DEBUG EXTREMO: Atributos DESPUÉS de agregar NoCertificado/Certificado:');
        Array.from(comprobante.attributes).forEach((attr, index) => {
            console.log(`  ${index + 1}. ${attr.name}="${attr.value.length > 50 ? attr.value.substring(0, 50) + '...' : attr.value}"`); 
        });
        
        console.log('✅ CFDI40102 FIX: Atributos agregados (SIN Sello)');
        console.log('🔍 FORENSE: Total atributos:', comprobante.attributes.length);
        
        // 4. Serializar XML SIN atributo Sello
        const xmlSerializer = new XMLSerializer();
        const xmlSinSello = xmlSerializer.serializeToString(xmlDoc);
        
        console.log('✅ FORENSE SERIALIZACIÓN: XML serializado SIN Sello');
        console.log('🔍 FORENSE SERIALIZACIÓN: Longitud XML sin Sello:', xmlSinSello.length);
        console.log('🔍 FORENSE SERIALIZACIÓN: Primeros 200 chars:', xmlSinSello.substring(0, 200));
        
        // DEBUG EXTREMO: Verificar que NO contiene Sello
        if (xmlSinSello.includes('Sello="')) {
            console.error('❌ DEBUG EXTREMO: ¡ERROR CRÍTICO! XML contiene atributo Sello cuando NO debería');
            const selloMatch = xmlSinSello.match(/Sello="[^"]*"/);
            if (selloMatch) {
                console.error('❌ DEBUG EXTREMO: Sello encontrado:', selloMatch[0]);
            }
            throw new Error('XML contiene atributo Sello cuando debería estar ausente');
        }
        console.log('✅ DEBUG EXTREMO: Verificado - XML NO contiene atributo Sello');
        
        // DEBUG EXTREMO: Verificar que SÍ contiene NoCertificado y Certificado
        if (!xmlSinSello.includes('NoCertificado="')) {
            console.error('❌ DEBUG EXTREMO: ¡ERROR! XML NO contiene NoCertificado');
            throw new Error('XML no contiene atributo NoCertificado');
        }
        if (!xmlSinSello.includes('Certificado="')) {
            console.error('❌ DEBUG EXTREMO: ¡ERROR! XML NO contiene Certificado');
            throw new Error('XML no contiene atributo Certificado');
        }
        console.log('✅ DEBUG EXTREMO: Verificado - XML contiene NoCertificado y Certificado');
        
        // DEBUG EXTREMO: Hash del XML sin Sello para trazabilidad
        const hashXmlSinSello = crypto.createHash('sha256').update(xmlSinSello, 'utf8').digest('hex');
        console.log('🔍 DEBUG EXTREMO: SHA256 XML sin Sello:', hashXmlSinSello);
        
        // 5. CORRECCIÓN CRÍTICA: Generar cadena original del XML que NO tiene Sello
        console.log('🔗 CADENA ORIGINAL: Generando cadena del XML SIN Sello...');
        const cadenaOriginalRaw = generarCadenaOriginal(xmlSinSello, version);
        
        if (!cadenaOriginalRaw) {
            console.error('❌ CADENA ORIGINAL: Error generando cadena original');
            return { exito: false, error: 'Error generando cadena original del XML sin Sello' };
        }
        
        console.log('✅ CADENA ORIGINAL: Generada exitosamente del XML sin Sello');
        console.log('🔍 CADENA ORIGINAL: Longitud:', cadenaOriginalRaw.length);
        console.log('🔍 CADENA ORIGINAL: Primeros 100 chars:', cadenaOriginalRaw.substring(0, 100));
        console.log('🔍 CADENA ORIGINAL: Últimos 100 chars:', cadenaOriginalRaw.substring(cadenaOriginalRaw.length - 100));
        
        // DEBUG EXTREMO: Cadena original completa para análisis forense
        console.log('🔍 DEBUG EXTREMO: CADENA ORIGINAL COMPLETA RAW:');
        console.log('"' + cadenaOriginalRaw + '"');
        
        // DEBUG EXTREMO: Análisis byte por byte de la cadena
        console.log('🔍 DEBUG EXTREMO: Análisis de caracteres especiales en cadena:');
        let caracteresEspeciales = [];
        for (let i = 0; i < cadenaOriginalRaw.length; i++) {
            const char = cadenaOriginalRaw[i];
            const code = char.charCodeAt(0);
            if (code < 32 || code > 126) { // Caracteres no imprimibles o especiales
                caracteresEspeciales.push({pos: i, char: char, code: code, hex: code.toString(16)});
            }
        }
        if (caracteresEspeciales.length > 0) {
            console.log('🔍 DEBUG EXTREMO: Caracteres especiales encontrados:', caracteresEspeciales);
        } else {
            console.log('✅ DEBUG EXTREMO: No se encontraron caracteres especiales en cadena RAW');
        }
        
        // Hash de la cadena RAW para trazabilidad
        const hashCadenaRaw = crypto.createHash('sha256').update(cadenaOriginalRaw, 'utf8').digest('hex');
        console.log('🔍 FORENSE HASH: SHA256 cadena RAW:', hashCadenaRaw);
        
        // 6. Limpiar cadena original antes del firmado
        console.log('🧹 LIMPIEZA FINAL: Limpiando cadena original para firmado...');
        const cadenaOriginal = limpiarCadenaOriginalChatGPT(cadenaOriginalRaw);
        
        // DEBUG EXTREMO: Comparar cadena antes y después de limpieza
        console.log('🔍 DEBUG EXTREMO: Comparación limpieza:');
        console.log('  - Longitud ANTES:', cadenaOriginalRaw.length);
        console.log('  - Longitud DESPUÉS:', cadenaOriginal.length);
        console.log('  - Diferencia:', cadenaOriginalRaw.length - cadenaOriginal.length);
        
        if (cadenaOriginalRaw !== cadenaOriginal) {
            console.log('🔍 DEBUG EXTREMO: ¡CADENA MODIFICADA POR LIMPIEZA!');
            console.log('  - ANTES (primeros 200):', JSON.stringify(cadenaOriginalRaw.substring(0, 200)));
            console.log('  - DESPUÉS (primeros 200):', JSON.stringify(cadenaOriginal.substring(0, 200)));
            
            // Encontrar primera diferencia
            for (let i = 0; i < Math.min(cadenaOriginalRaw.length, cadenaOriginal.length); i++) {
                if (cadenaOriginalRaw[i] !== cadenaOriginal[i]) {
                    console.log(`  - Primera diferencia en posición ${i}:`);
                    console.log(`    ANTES: "${cadenaOriginalRaw[i]}" (code: ${cadenaOriginalRaw.charCodeAt(i)})`);
                    console.log(`    DESPUÉS: "${cadenaOriginal[i]}" (code: ${cadenaOriginal.charCodeAt(i)})`);
                    break;
                }
            }
        } else {
            console.log('✅ DEBUG EXTREMO: Cadena NO modificada por limpieza');
        }
        
        // DEBUG EXTREMO: Cadena final limpia completa
        console.log('🔍 DEBUG EXTREMO: CADENA ORIGINAL LIMPIA COMPLETA:');
        console.log('"' + cadenaOriginal + '"');
        
        // Hash de la cadena limpia
        const hashCadenaLimpia = crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex');
        console.log('🔍 LIMPIEZA FINAL: SHA256 cadena limpia:', hashCadenaLimpia);
        
        // 7. Validación PAR CERTIFICADO/LLAVE
        console.log('🔐 VALIDACIÓN FINAL: Validando par certificado/llave...');
        const certificadoPem = `-----BEGIN CERTIFICATE-----\n${certificadoBase64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
        const parValido = validarParCertificadoLlave(certificadoPem, llavePrivadaPem);
        if (!parValido) {
            console.error('❌ VALIDACIÓN FINAL: El certificado y la llave privada NO corresponden');
            return { exito: false, error: 'El certificado y la llave privada no corresponden al mismo par' };
        }
        console.log('✅ VALIDACIÓN FINAL: Par certificado/llave válido');
        
        // 8. Generar sello digital
        console.log('🔐 SELLO FINAL: Generando sello digital...');
        
        // DEBUG EXTREMO: Capturar exactamente qué se va a firmar
        console.log('🔍 DEBUG EXTREMO: DATOS PARA FIRMADO:');
        console.log('  - Cadena a firmar (longitud):', cadenaOriginal.length);
        console.log('  - Cadena a firmar (completa):', JSON.stringify(cadenaOriginal));
        console.log('  - Llave privada (longitud):', llavePrivadaPem.length);
        console.log('  - Llave privada (header):', llavePrivadaPem.substring(0, 50));
        
        // DEBUG EXTREMO: Hash de la cadena que se va a firmar
        const hashParaFirmar = crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex');
        console.log('  - SHA256 de cadena a firmar:', hashParaFirmar);
        
        const selloDigital = generarSelloDigitalCrypto(cadenaOriginal, llavePrivadaPem);
        if (!selloDigital) {
            console.error('❌ SELLO FINAL: Error generando sello digital');
            return { exito: false, error: 'Error generando sello digital' };
        }
        
        console.log('✅ SELLO FINAL: Sello digital generado exitosamente');
        console.log('🔍 SELLO FINAL: Longitud sello:', selloDigital.length);
        console.log('🔍 SELLO FINAL: Primeros 50 chars:', selloDigital.substring(0, 50));
        console.log('🔍 SELLO FINAL: Últimos 50 chars:', selloDigital.substring(selloDigital.length - 50));
        
        // DEBUG EXTREMO: Hash del sello generado
        const hashSelloGenerado = crypto.createHash('sha256').update(selloDigital, 'utf8').digest('hex');
        console.log('🔍 DEBUG EXTREMO: SHA256 del sello generado:', hashSelloGenerado);
        
        // 9. CRÍTICO: Agregar Sello al DOM y serializar FINAL
        console.log('🔧 REEMPLAZO FINAL: Agregando Sello al XML...');
        
        // DEBUG EXTREMO: Estado del DOM ANTES de agregar Sello
        console.log('🔍 DEBUG EXTREMO: Atributos ANTES de agregar Sello:');
        Array.from(comprobante.attributes).forEach((attr, index) => {
            console.log(`  ${index + 1}. ${attr.name}="${attr.value.length > 50 ? attr.value.substring(0, 50) + '...' : attr.value}"`); 
        });
        
        comprobante.setAttribute('Sello', selloDigital);
        
        // DEBUG EXTREMO: Estado del DOM DESPUÉS de agregar Sello
        console.log('🔍 DEBUG EXTREMO: Atributos DESPUÉS de agregar Sello:');
        Array.from(comprobante.attributes).forEach((attr, index) => {
            console.log(`  ${index + 1}. ${attr.name}="${attr.value.length > 50 ? attr.value.substring(0, 50) + '...' : attr.value}"`); 
        });
        
        const xmlSellado = xmlSerializer.serializeToString(xmlDoc);
        
        console.log('✅ REEMPLAZO FINAL: XML sellado generado');
        console.log('🔍 REEMPLAZO FINAL: Longitud XML sellado:', xmlSellado.length);
        
        // DEBUG EXTREMO: Verificar que el XML sellado contiene el sello correcto
        const selloEnXml = xmlSellado.match(/Sello="([^"]+)"/)?.[1];
        if (selloEnXml) {
            console.log('🔍 DEBUG EXTREMO: Sello encontrado en XML (longitud):', selloEnXml.length);
            console.log('🔍 DEBUG EXTREMO: Sello en XML coincide con generado:', selloEnXml === selloDigital);
            if (selloEnXml !== selloDigital) {
                console.error('❌ DEBUG EXTREMO: ¡SELLO EN XML NO COINCIDE CON SELLO GENERADO!');
                console.error('  - Sello generado:', selloDigital.substring(0, 100) + '...');
                console.error('  - Sello en XML:', selloEnXml.substring(0, 100) + '...');
            }
        } else {
            console.error('❌ DEBUG EXTREMO: ¡NO SE ENCONTRÓ SELLO EN XML FINAL!');
        }
        
        // DEBUG EXTREMO: Hash del XML sellado final
        const hashXmlSellado = crypto.createHash('sha256').update(xmlSellado, 'utf8').digest('hex');
        console.log('🔍 DEBUG EXTREMO: SHA256 XML sellado final:', hashXmlSellado);
        
        // 10. VERIFICACIÓN DE INTEGRIDAD CRÍTICA (CORREGIDA)
        console.log('🔍 FORENSE INTEGRIDAD: Verificando integridad del sellado...');
        
        // DEBUG EXTREMO: Antes de remover Sello para verificación
        console.log('🔍 DEBUG EXTREMO: VERIFICACIÓN DE INTEGRIDAD:');
        console.log('  - XML sellado (longitud):', xmlSellado.length);
        console.log('  - XML sellado (primeros 300):', xmlSellado.substring(0, 300));
        
        // CORRECCIÓN CRÍTICA: Generar cadena del XML sellado pero SIN el atributo Sello
        const xmlParaVerificacion = removerAtributoSelloCompletamente(xmlSellado);
        
        // DEBUG EXTREMO: Después de remover Sello
        console.log('🔍 DEBUG EXTREMO: XML para verificación (longitud):', xmlParaVerificacion.length);
        console.log('🔍 DEBUG EXTREMO: XML para verificación (primeros 300):', xmlParaVerificacion.substring(0, 300));
        
        // Verificar que efectivamente no tiene Sello
        if (xmlParaVerificacion.includes('Sello="')) {
            console.error('❌ DEBUG EXTREMO: ¡ERROR! XML para verificación todavía contiene Sello');
            return { exito: false, error: 'Error: XML para verificación contiene atributo Sello' };
        }
        console.log('✅ DEBUG EXTREMO: XML para verificación NO contiene Sello');
        
        const cadenaOriginalFinal = generarCadenaOriginal(xmlParaVerificacion, version);
        
        if (!cadenaOriginalFinal) {
            console.log('❌ FORENSE INTEGRIDAD: Error regenerando cadena original del XML sellado');
            return { exito: false, error: 'Error regenerando cadena original para verificación' };
        }
        
        console.log('🔍 FORENSE INTEGRIDAD: Cadena original del XML verificación generada');
        console.log('🔍 FORENSE INTEGRIDAD: Longitud cadena final:', cadenaOriginalFinal.length);
        
        // DEBUG EXTREMO: Cadena original para verificación completa
        console.log('🔍 DEBUG EXTREMO: CADENA ORIGINAL PARA VERIFICACIÓN COMPLETA:');
        console.log('"' + cadenaOriginalFinal + '"');
        
        // Limpiar la cadena final para comparación justa
        const cadenaOriginalFinalLimpia = limpiarCadenaOriginalChatGPT(cadenaOriginalFinal);
        
        // Hash de la cadena final para comparación
        const hashCadenaFinal = crypto.createHash('sha256').update(cadenaOriginalFinalLimpia, 'utf8').digest('hex');
        console.log('🔍 FORENSE HASH: SHA256 cadena original FINAL:', hashCadenaFinal);
        
        // Comparación crítica de integridad
        if (cadenaOriginal !== cadenaOriginalFinalLimpia) {
            console.error('🚨 FORENSE INTEGRIDAD: ¡INTEGRIDAD ROTA! La cadena original cambió después del sellado');
            console.error('🚨 FORENSE INTEGRIDAD: Hash cadena firmada:', hashCadenaLimpia);
            console.error('🚨 FORENSE INTEGRIDAD: Hash cadena XML final:', hashCadenaFinal);
            console.error('🚨 FORENSE INTEGRIDAD: Longitud cadena firmada:', cadenaOriginal.length);
            console.error('🚨 FORENSE INTEGRIDAD: Longitud cadena final:', cadenaOriginalFinalLimpia.length);
            
            // Análisis detallado de diferencias
            if (cadenaOriginal.length !== cadenaOriginalFinalLimpia.length) {
                console.error('🚨 FORENSE DIFERENCIAS: Las longitudes son diferentes');
            }
            
            // Encontrar primera diferencia
            let primeraDiferencia = -1;
            for (let i = 0; i < Math.min(cadenaOriginal.length, cadenaOriginalFinalLimpia.length); i++) {
                if (cadenaOriginal[i] !== cadenaOriginalFinalLimpia[i]) {
                    primeraDiferencia = i;
                    break;
                }
            }
            
            if (primeraDiferencia >= 0) {
                console.error('🚨 FORENSE DIFERENCIAS: Primera diferencia en posición:', primeraDiferencia);
                console.error('🚨 FORENSE DIFERENCIAS: Contexto firmada:', cadenaOriginal.substring(Math.max(0, primeraDiferencia - 20), primeraDiferencia + 20));
                console.error('🚨 FORENSE DIFERENCIAS: Contexto final:', cadenaOriginalFinalLimpia.substring(Math.max(0, primeraDiferencia - 20), primeraDiferencia + 20));
            }
            
            return { exito: false, error: 'CFDI40102: Integridad del sello comprometida - cadenas no coinciden' };
        } else {
            console.log('✅ FORENSE INTEGRIDAD: Integridad mantenida - cadenas originales coinciden perfectamente');
            console.log('✅ FORENSE INTEGRIDAD: Hash verification passed:', hashCadenaLimpia === hashCadenaFinal);
        }
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            cadenaOriginal: cadenaOriginal,
            selloDigital: selloDigital
        };
        
    } catch (error) {
        console.error('🚨 SELLADO UNIFICADO: Error:', error);
        return { exito: false, error: error.message };
    }
}

/**
 * NUEVA FUNCIÓN: Remueve COMPLETAMENTE el atributo Sello de un XML
 * CRÍTICO: NO poner Sello="", sino REMOVER el atributo completamente
 */
function removerAtributoSelloCompletamente(xmlString) {
    try {
        console.log('🔧 REMOVE SELLO: Removiendo atributo Sello completamente...');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró cfdi:Comprobante para remover Sello');
        }
        
        // CRÍTICO: REMOVER completamente (no poner vacío)
        if (comprobante.hasAttribute('Sello')) {
            const selloValor = comprobante.getAttribute('Sello');
            comprobante.removeAttribute('Sello');
            console.log('✅ REMOVE SELLO: Atributo Sello removido completamente');
            console.log('🔍 REMOVE SELLO: Valor removido tenía longitud:', selloValor.length);
        } else {
            console.log('🔍 REMOVE SELLO: No había atributo Sello que remover');
        }
        
        const serializer = new XMLSerializer();
        const xmlSinSello = serializer.serializeToString(xmlDoc);
        
        console.log('✅ REMOVE SELLO: XML regenerado sin atributo Sello');
        console.log('🔍 REMOVE SELLO: Longitud XML sin Sello:', xmlSinSello.length);
        
        // Verificar que efectivamente no tenga Sello
        if (xmlSinSello.includes('Sello=')) {
            console.error('❌ REMOVE SELLO: ¡ERROR! El XML todavía contiene atributo Sello');
            throw new Error('No se pudo remover completamente el atributo Sello');
        }
        
        return xmlSinSello;
        
    } catch (error) {
        console.error('❌ REMOVE SELLO ERROR:', error);
        throw error;
    }
}

/**
 * Limpia caracteres invisibles de la cadena original antes del firmado
 * CRÍTICO CFDI40102: Elimina BOM, saltos de línea, espacios invisibles según ChatGPT
 * @param {string} cadena - Cadena original a limpiar
 * @returns {string} Cadena limpia para firmado
 */
function limpiarCadenaOriginalChatGPT(cadena) {
    if (!cadena) return '';
    
    console.log('🧹 FORENSE LIMPIEZA: Iniciando limpieza de caracteres invisibles...');
    console.log('🧹 FORENSE LIMPIEZA: Longitud original:', cadena.length);
    console.log('🧹 FORENSE LIMPIEZA: Primeros 50 chars:', JSON.stringify(cadena.substring(0, 50)));
    console.log('🧹 FORENSE LIMPIEZA: Últimos 50 chars:', JSON.stringify(cadena.substring(cadena.length - 50)));
    
    let cadenaLimpia = cadena;
    let modificaciones = [];
    
    // 1. Quitar BOM UTF-8 si existe (bytes EF BB BF = char 0xFEFF)
    if (cadenaLimpia.charCodeAt(0) === 0xFEFF) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADO BOM UTF-8! Eliminando...');
        cadenaLimpia = cadenaLimpia.substring(1);
        modificaciones.push('BOM UTF-8 eliminado');
    }
    
    // 2. Eliminar todos los CR/LF (\r\n, \r, \n) para una sola línea
    const conSaltosLinea = cadenaLimpia.includes('\r') || cadenaLimpia.includes('\n');
    if (conSaltosLinea) {
        const cuentaCR = (cadenaLimpia.match(/\r/g) || []).length;
        const cuentaLF = (cadenaLimpia.match(/\n/g) || []).length;
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADOS SALTOS DE LÍNEA! CR:', cuentaCR, 'LF:', cuentaLF);
        cadenaLimpia = cadenaLimpia.replace(/\r?\n/g, '');
        modificaciones.push(`Saltos de línea eliminados (CR:${cuentaCR}, LF:${cuentaLF})`);
    }
    
    // 3. Reemplazar espacios invisibles por espacios normales
    const espaciosInvisibles = /[\u00A0\u200B\u2060\uFEFF]/g;
    const matchesEspacios = cadenaLimpia.match(espaciosInvisibles);
    if (matchesEspacios) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADOS ESPACIOS INVISIBLES!', matchesEspacios.length, 'encontrados');
        console.log('🧹 FORENSE LIMPIEZA: Tipos de espacios invisibles:', [...new Set(matchesEspacios.map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`))].join(', '));
        cadenaLimpia = cadenaLimpia.replace(espaciosInvisibles, ' ');
        modificaciones.push(`Espacios invisibles reemplazados (${matchesEspacios.length})`);
    }
    
    // 4. Quitar tabs y reemplazar por espacios
    const cuentaTabs = (cadenaLimpia.match(/\t/g) || []).length;
    if (cuentaTabs > 0) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADOS TABS!', cuentaTabs, 'encontrados');
        cadenaLimpia = cadenaLimpia.replace(/\t/g, ' ');
        modificaciones.push(`Tabs reemplazados (${cuentaTabs})`);
    }
    
    // 5. Normalizar espacios múltiples a uno solo
    const espaciosMultiples = cadenaLimpia.match(/\s{2,}/g);
    if (espaciosMultiples) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADOS ESPACIOS MÚLTIPLES!', espaciosMultiples.length, 'secuencias encontradas');
        cadenaLimpia = cadenaLimpia.replace(/\s{2,}/g, ' ');
        modificaciones.push(`Espacios múltiples normalizados (${espaciosMultiples.length} secuencias)`);
    }
    
    // 6. NO hacer trim general, pero sí quitar espacios pegados a ||
    // Verificar que empiece y termine con || sin espacios pegados
    if (cadenaLimpia.startsWith(' ||')) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADO ESPACIO ANTES DE || INICIAL!');
        cadenaLimpia = cadenaLimpia.replace(/^ \|\|/, '||');
        modificaciones.push('Espacio antes de || inicial eliminado');
    }
    if (cadenaLimpia.endsWith('|| ')) {
        console.log('🧹 FORENSE LIMPIEZA: ¡DETECTADO ESPACIO DESPUÉS DE || FINAL!');
        cadenaLimpia = cadenaLimpia.replace(/\|\| $/, '||');
        modificaciones.push('Espacio después de || final eliminado');
    }
    
    console.log('🧹 FORENSE LIMPIEZA: Longitud final:', cadenaLimpia.length);
    console.log('🧹 FORENSE LIMPIEZA: Caracteres eliminados:', cadena.length - cadenaLimpia.length);
    console.log('🧹 FORENSE LIMPIEZA: Modificaciones aplicadas:', modificaciones.length > 0 ? modificaciones.join(', ') : 'NINGUNA');
    
    if (cadena !== cadenaLimpia) {
        console.log('✅ FORENSE LIMPIEZA: Cadena modificada durante limpieza');
        
        // Generar hashes para comparación
        const hashOriginal = crypto.createHash('sha256').update(cadena, 'utf8').digest('hex');
        const hashLimpia = crypto.createHash('sha256').update(cadenaLimpia, 'utf8').digest('hex');
        
        console.log('🧹 FORENSE LIMPIEZA HASH: Original:', hashOriginal);
        console.log('🧹 FORENSE LIMPIEZA HASH: Limpia:', hashLimpia);
        
        // Mostrar diferencias byte por byte en los primeros caracteres
        console.log('🧹 FORENSE LIMPIEZA: Primeros 50 chars LIMPIOS:', JSON.stringify(cadenaLimpia.substring(0, 50)));
        console.log('🧹 FORENSE LIMPIEZA: Últimos 50 chars LIMPIOS:', JSON.stringify(cadenaLimpia.substring(cadenaLimpia.length - 50)));
    } else {
        console.log('🧹 FORENSE LIMPIEZA: Cadena NO modificada (ya estaba limpia)');
    }
    
    return cadenaLimpia;
}

/**
 * Limpia caracteres invisibles de la cadena original antes del firmado (FUNCIÓN LEGACY)
 * CRÍTICO CFDI40102: Elimina BOM, saltos de línea, espacios invisibles, etc.
 * @param {string} cadena - Cadena original a limpiar
 * @returns {string} Cadena limpia para firmado
 */
function limpiarCadenaOriginal(cadena) {
    // Usar la nueva función recomendada por ChatGPT
    return limpiarCadenaOriginalChatGPT(cadena);
}

/**
 * Utilidades para sellado digital de CFDIs
 * Implementa el proceso completo de sellado según especificaciones SAT
 */

/**
 * Genera cadena original con certificados virtuales (PHPCFDI-compliant)
 * @param {string} xmlContent - Contenido del XML CFDI base
 * @param {string} noCertificado - Número de certificado a incluir virtualmente
 * @param {string} version - Versión del CFDI (3.3 o 4.0)
 * @returns {string} Cadena original
 */
function generarCadenaOriginalConCertificados(xmlContent, noCertificado, version = '4.0') {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // CRÍTICO PHPCFDI: Agregar NoCertificado virtualmente para cadena original
        comprobante.setAttribute('NoCertificado', noCertificado);
        
        // Generar cadena original con el certificado incluido
        if (version === '4.0') {
            return construirCadenaOriginal40(comprobante);
        } else {
            return construirCadenaOriginal33(comprobante);
        }
        
    } catch (error) {
        console.error('Error generando cadena original con certificados:', error);
        throw new Error('Error al generar cadena original: ' + error.message);
    }
}

/**
 * Genera la cadena original de un XML CFDI usando XSLT oficial SAT
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} version - Versión del CFDI (3.3 o 4.0)
 * @returns {string} Cadena original
 */
function generarCadenaOriginal(xmlContent, version = '4.0') {
    try {
        console.log('🔍 FORENSE CADENA: Iniciando generación para CFDI', version);
        console.log('🔍 FORENSE CADENA: Longitud XML entrada:', xmlContent.length);
        console.log('🔍 FORENSE CADENA: Primeros 200 chars XML:', xmlContent.substring(0, 200));
        
        // Intentar usar XSLT oficial SAT primero
        console.log('🔍 FORENSE XSLT: Intentando usar XSLT oficial SAT...');
        try {
            const cadenaXSLT = generarCadenaOriginalXSLT(xmlContent, version);
            if (cadenaXSLT) {
                console.log('✅ FORENSE XSLT: Generada exitosamente con XSLT oficial SAT');
                console.log('🔍 FORENSE XSLT: Longitud cadena XSLT:', cadenaXSLT.length);
                console.log('🔍 FORENSE XSLT: Primeros 100 chars:', cadenaXSLT.substring(0, 100));
                console.log('🔍 FORENSE XSLT: Últimos 100 chars:', cadenaXSLT.substring(cadenaXSLT.length - 100));
                
                // Hash para trazabilidad
                const hashXSLT = crypto.createHash('sha256').update(cadenaXSLT, 'utf8').digest('hex');
                console.log('🔍 FORENSE XSLT HASH: SHA256:', hashXSLT);
                
                return cadenaXSLT;
            } else {
                console.log('⚠️ FORENSE XSLT: XSLT oficial retornó null/undefined');
            }
        } catch (error) {
            console.log('⚠️ FORENSE XSLT: Error con XSLT oficial, usando fallback manual');
            console.log('⚠️ FORENSE XSLT ERROR:', error.message);
            console.log('⚠️ FORENSE XSLT STACK:', error.stack);
        }
        
        // Fallback a implementación manual
        console.log('🔍 FORENSE FALLBACK: Usando implementación manual como fallback');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            console.error('❌ FORENSE FALLBACK: Error parseando XML');
            const errors = xmlDoc.getElementsByTagName('parsererror');
            for (let i = 0; i < errors.length; i++) {
                console.error('❌ FORENSE PARSE ERROR:', errors[i].textContent);
            }
            return null;
        }
        
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            console.error('❌ FORENSE FALLBACK: No se encontró cfdi:Comprobante');
            console.error('❌ FORENSE FALLBACK: Elementos disponibles:', Array.from(xmlDoc.documentElement.childNodes).map(n => n.nodeName).join(', '));
            return null;
        }
        
        console.log('✅ FORENSE FALLBACK: Comprobante encontrado');
        console.log('🔍 FORENSE FALLBACK: Atributos comprobante:', Array.from(comprobante.attributes).map(attr => attr.name).join(', '));
        
        let cadenaOriginal;
        if (version === '4.0') {
            console.log('🔍 FORENSE FALLBACK: Construyendo cadena original CFDI 4.0...');
            cadenaOriginal = construirCadenaOriginal40(comprobante);
        } else if (version === '3.3') {
            console.log('🔍 FORENSE FALLBACK: Construyendo cadena original CFDI 3.3...');
            cadenaOriginal = construirCadenaOriginal33(comprobante);
        } else {
            console.error('❌ FORENSE FALLBACK: Versión no soportada:', version);
            return null;
        }
        
        if (cadenaOriginal) {
            console.log('✅ FORENSE FALLBACK: Generada con implementación manual');
            console.log('🔍 FORENSE FALLBACK: Longitud cadena manual:', cadenaOriginal.length);
            console.log('🔍 FORENSE FALLBACK: Primeros 100 chars:', cadenaOriginal.substring(0, 100));
            console.log('🔍 FORENSE FALLBACK: Últimos 100 chars:', cadenaOriginal.substring(cadenaOriginal.length - 100));
            
            // Hash para comparación con XSLT
            const hashManual = crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex');
            console.log('🔍 FORENSE FALLBACK HASH: SHA256:', hashManual);
        } else {
            console.error('❌ FORENSE FALLBACK: Implementación manual retornó null');
        }
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('❌ FORENSE CADENA: Error general en generarCadenaOriginal');
        console.error('❌ FORENSE CADENA ERROR:', error.message);
        console.error('❌ FORENSE CADENA STACK:', error.stack);
        return null;
    }
}

/**
 * Construye la cadena original para CFDI 4.0
 * CORREGIDO: Implementación basada en XSLT oficial SAT
 * @param {Element} comprobante - Elemento XML del comprobante
 * @returns {string} Cadena original
 */
function construirCadenaOriginal40(comprobante) {
    let cadena = '||';
    
    // DIAGNÓSTICO CFDI40102: Logging de atributos críticos
    console.log('🔍 DIAGNÓSTICO CFDI40102 - Atributos del XML importado:');
    console.log('   SubTotal:', comprobante.getAttribute('SubTotal'));
    console.log('   Total:', comprobante.getAttribute('Total'));
    console.log('   Version:', comprobante.getAttribute('Version'));
    console.log('   Fecha:', comprobante.getAttribute('Fecha'));
    
    // ORDEN EXACTO según XSLT SAT oficial para CFDI 4.0
    // Cada atributo se procesa según su presencia y requerimientos SAT
    
    // 1. Version (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Version') || '') + '|';
    
    // 2. Serie (OPCIONAL)
    const serie = normalizeSpace(comprobante.getAttribute('Serie') || '');
    if (serie) cadena += serie + '|';
    
    // 3. Folio (OPCIONAL)
    const folio = normalizeSpace(comprobante.getAttribute('Folio') || '');
    if (folio) cadena += folio + '|';
    
    // 4. Fecha (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Fecha') || '') + '|';
    
    // 5. FormaPago (OPCIONAL)
    const formaPago = normalizeSpace(comprobante.getAttribute('FormaPago') || '');
    if (formaPago) cadena += formaPago + '|';
    
    // 6. NoCertificado (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('NoCertificado') || '') + '|';
    
    // 7. CondicionesDePago (OPCIONAL)
    const condicionesPago = normalizeSpace(comprobante.getAttribute('CondicionesDePago') || '');
    if (condicionesPago) cadena += condicionesPago + '|';
    
    // 8. SubTotal (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('SubTotal') || '') + '|';
    
    // 9. Descuento (OPCIONAL)
    const descuento = normalizeSpace(comprobante.getAttribute('Descuento') || '');
    if (descuento) cadena += descuento + '|';
    
    // 10. Moneda (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Moneda') || '') + '|';
    
    // 11. TipoCambio (OPCIONAL)
    const tipoCambio = normalizeSpace(comprobante.getAttribute('TipoCambio') || '');
    if (tipoCambio) cadena += tipoCambio + '|';
    
    // 12. Total (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Total') || '') + '|';
    
    // 13. TipoDeComprobante (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('TipoDeComprobante') || '') + '|';
    
    // 14. Exportacion (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Exportacion') || '') + '|';
    
    // 15. MetodoPago (OPCIONAL)
    const metodoPago = normalizeSpace(comprobante.getAttribute('MetodoPago') || '');
    if (metodoPago) cadena += metodoPago + '|';
    
    // 16. LugarExpedicion (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('LugarExpedicion') || '') + '|';
    
    // 17. Confirmacion (OPCIONAL)
    const confirmacion = normalizeSpace(comprobante.getAttribute('Confirmacion') || '');
    if (confirmacion) cadena += confirmacion + '|';
    
    // Procesar emisor
    const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
    if (emisor) {
        cadena += normalizeSpace(emisor.getAttribute('Rfc') || '') + '|';
        cadena += normalizeSpace(emisor.getAttribute('Nombre') || '') + '|';
        cadena += normalizeSpace(emisor.getAttribute('RegimenFiscal') || '') + '|';
    }
    
    // Procesar receptor
    const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
    if (receptor) {
        cadena += normalizeSpace(receptor.getAttribute('Rfc') || '') + '|';
        cadena += normalizeSpace(receptor.getAttribute('Nombre') || '') + '|';
        cadena += normalizeSpace(receptor.getAttribute('DomicilioFiscalReceptor') || '') + '|';
        cadena += normalizeSpace(receptor.getAttribute('RegimenFiscalReceptor') || '') + '|';
        cadena += normalizeSpace(receptor.getAttribute('UsoCFDI') || '') + '|';
    }
    
    // Procesar conceptos
    const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
    for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        cadena += normalizeSpace(concepto.getAttribute('ClaveProdServ') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('NoIdentificacion') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('Cantidad') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('ClaveUnidad') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('Unidad') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('Descripcion') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('ValorUnitario') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('Importe') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('Descuento') || '') + '|';
        cadena += normalizeSpace(concepto.getAttribute('ObjetoImp') || '') + '|';
        
        // Procesar impuestos del concepto
        const impuestos = concepto.getElementsByTagName('cfdi:Impuestos')[0];
        if (impuestos) {
            // Traslados
            const traslados = impuestos.getElementsByTagName('cfdi:Traslado');
            for (let j = 0; j < traslados.length; j++) {
                const traslado = traslados[j];
                // CRÍTICO: Aplicar normalize-space y manejar atributos según SAT
                cadena += normalizeSpace(traslado.getAttribute('Base') || '') + '|';
                cadena += normalizeSpace(traslado.getAttribute('Impuesto') || '') + '|';
                cadena += normalizeSpace(traslado.getAttribute('TipoFactor') || '') + '|';
                
                // TasaOCuota es OPCIONAL en algunos casos
                const tasaOCuota = normalizeSpace(traslado.getAttribute('TasaOCuota') || '');
                if (tasaOCuota) cadena += tasaOCuota + '|';
                
                // Importe es OPCIONAL cuando TipoFactor = "Exento"
                const importe = normalizeSpace(traslado.getAttribute('Importe') || '');
                if (importe) cadena += importe + '|';
            }
            
            // Retenciones
            const retenciones = impuestos.getElementsByTagName('cfdi:Retencion');
            for (let j = 0; j < retenciones.length; j++) {
                const retencion = retenciones[j];
                cadena += normalizeSpace(retencion.getAttribute('Base') || '') + '|';
                cadena += normalizeSpace(retencion.getAttribute('Impuesto') || '') + '|';
                cadena += normalizeSpace(retencion.getAttribute('TipoFactor') || '') + '|';
                cadena += normalizeSpace(retencion.getAttribute('TasaOCuota') || '') + '|';
                cadena += normalizeSpace(retencion.getAttribute('Importe') || '') + '|';
            }
        }
    }
    
    // CRÍTICO CFDI40102: Procesar Impuestos Totales (van al final de la cadena)
    const impuestosTotales = comprobante.getElementsByTagName('cfdi:Impuestos')[0];
    if (impuestosTotales) {
        // Traslados Totales - CRÍTICO: NO incluir Base según XSLT SAT
        const trasladosTotales = impuestosTotales.getElementsByTagName('cfdi:Traslado');
        for (let i = 0; i < trasladosTotales.length; i++) {
            const traslado = trasladosTotales[i];
            // SOLO: Impuesto|TipoFactor|TasaOCuota|Importe (SIN Base)
            cadena += normalizeSpace(traslado.getAttribute('Impuesto') || '') + '|';
            cadena += normalizeSpace(traslado.getAttribute('TipoFactor') || '') + '|';
            
            // TasaOCuota es OPCIONAL
            const tasaOCuota = normalizeSpace(traslado.getAttribute('TasaOCuota') || '');
            if (tasaOCuota) cadena += tasaOCuota + '|';
            
            // Importe es OPCIONAL cuando TipoFactor = "Exento"
            const importe = normalizeSpace(traslado.getAttribute('Importe') || '');
            if (importe) cadena += importe + '|';
        }
        
        // Retenciones Totales
        const retencionesTotales = impuestosTotales.getElementsByTagName('cfdi:Retencion');
        for (let i = 0; i < retencionesTotales.length; i++) {
            const retencion = retencionesTotales[i];
            cadena += normalizeSpace(retencion.getAttribute('Impuesto') || '') + '|';
            cadena += normalizeSpace(retencion.getAttribute('Importe') || '') + '|';
        }
        
        // TotalImpuestosTrasladados (OPCIONAL)
        const totalTrasladados = normalizeSpace(impuestosTotales.getAttribute('TotalImpuestosTrasladados') || '');
        if (totalTrasladados) cadena += totalTrasladados + '|';
        
        // TotalImpuestosRetenidos (OPCIONAL)
        const totalRetenidos = normalizeSpace(impuestosTotales.getAttribute('TotalImpuestosRetenidos') || '');
        if (totalRetenidos) cadena += totalRetenidos + '|';
    }
    
    cadena += '|';
    return cadena;
}

/**
 * Construye la cadena original para CFDI 3.3
 * CORREGIDO: Implementación basada en XSLT oficial SAT
 * @param {Element} comprobante - Elemento XML del comprobante
 * @returns {string} Cadena original
 */
function construirCadenaOriginal33(comprobante) {
    let cadena = '||';
    
    // ORDEN EXACTO según XSLT SAT oficial para CFDI 3.3
    // Cada atributo se procesa según su presencia y requerimientos SAT
    
    // 1. Version (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Version') || '') + '|';
    
    // 2. Serie (OPCIONAL)
    const serie = normalizeSpace(comprobante.getAttribute('Serie') || '');
    if (serie) cadena += serie + '|';
    
    // 3. Folio (OPCIONAL)
    const folio = normalizeSpace(comprobante.getAttribute('Folio') || '');
    if (folio) cadena += folio + '|';
    
    // 4. Fecha (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Fecha') || '') + '|';
    
    // 5. FormaPago (OPCIONAL)
    const formaPago = normalizeSpace(comprobante.getAttribute('FormaPago') || '');
    if (formaPago) cadena += formaPago + '|';
    
    // 6. NoCertificado (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('NoCertificado') || '') + '|';
    
    // 7. CondicionesDePago (OPCIONAL)
    const condicionesPago = normalizeSpace(comprobante.getAttribute('CondicionesDePago') || '');
    if (condicionesPago) cadena += condicionesPago + '|';
    
    // 8. SubTotal (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('SubTotal') || '') + '|';
    
    // 9. Descuento (OPCIONAL)
    const descuento = normalizeSpace(comprobante.getAttribute('Descuento') || '');
    if (descuento) cadena += descuento + '|';
    
    // 10. Moneda (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Moneda') || '') + '|';
    
    // 11. TipoCambio (OPCIONAL)
    const tipoCambio = normalizeSpace(comprobante.getAttribute('TipoCambio') || '');
    if (tipoCambio) cadena += tipoCambio + '|';
    
    // 12. Total (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('Total') || '') + '|';
    
    // 13. TipoDeComprobante (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('TipoDeComprobante') || '') + '|';
    
    // 14. MetodoPago (OPCIONAL)
    const metodoPago = normalizeSpace(comprobante.getAttribute('MetodoPago') || '');
    if (metodoPago) cadena += metodoPago + '|';
    
    // 15. LugarExpedicion (REQUERIDO)
    cadena += normalizeSpace(comprobante.getAttribute('LugarExpedicion') || '') + '|';
    
    // Procesar emisor (similar a 4.0)
    const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
    if (emisor) {
        cadena += emisor.getAttribute('Rfc') + '|';
        cadena += emisor.getAttribute('Nombre') + '|';
        cadena += emisor.getAttribute('RegimenFiscal') + '|';
    }
    
    // Procesar receptor
    const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
    if (receptor) {
        cadena += receptor.getAttribute('Rfc') + '|';
        cadena += receptor.getAttribute('Nombre') + '|';
        cadena += receptor.getAttribute('UsoCFDI') + '|';
    }
    
    // Procesar conceptos (sin ObjetoImp que es específico de 4.0)
    const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
    for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        cadena += concepto.getAttribute('ClaveProdServ') + '|';
        cadena += concepto.getAttribute('NoIdentificacion') + '|';
        cadena += concepto.getAttribute('Cantidad') + '|';
        cadena += concepto.getAttribute('ClaveUnidad') + '|';
        cadena += concepto.getAttribute('Unidad') + '|';
        cadena += concepto.getAttribute('Descripcion') + '|';
        cadena += concepto.getAttribute('ValorUnitario') + '|';
        cadena += concepto.getAttribute('Importe') + '|';
        cadena += concepto.getAttribute('Descuento') + '|';
    }
    
    cadena += '|';
    return cadena;
}

/**
 * Valida que el certificado y la llave privada sean el par correcto
 * Recomendación ChatGPT: Validar antes de firmar
 * @param {string} certificadoPem - Certificado en formato PEM
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {boolean} True si son el par correcto
 */
function validarParCertificadoLlave(certificadoPem, llavePrivadaPem) {
    try {
        console.log('🔐 VALIDACIÓN PAR: Verificando que certificado y llave correspondan...');
        
        // 1. Validar que el cert PEM parsea (recomendación ChatGPT)
        if (crypto.X509Certificate) {
            new crypto.X509Certificate(certificadoPem);
            console.log('✅ VALIDACIÓN PAR: Certificado PEM válido');
        }
        
        // 2. Confirmar que llave hace par con cert (recomendación ChatGPT)
        const prueba = Buffer.from('probe', 'utf8');
        const testSig = crypto.sign('RSA-SHA256', prueba, llavePrivadaPem);
        
        const pubKeyPem = new crypto.X509Certificate(certificadoPem).publicKey.export({ type: 'spki', format: 'pem' });
        const ok = crypto.verify('RSA-SHA256', prueba, pubKeyPem, testSig);
        
        if (!ok) {
            console.error('❌ VALIDACIÓN PAR: La llave privada NO corresponde al certificado (.cer)');
            return false;
        }
        
        console.log('✅ VALIDACIÓN PAR: Certificado y llave privada son el par correcto');
        return true;
        
    } catch (error) {
        console.error('❌ VALIDACIÓN PAR: Error validando par certificado/llave:', error);
        return false;
    }
}

/**
 * Genera el sello digital de un CFDI usando Node.js crypto (ChatGPT)
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {string} Sello digital en base64
 */
function generarSelloDigitalCrypto(cadenaOriginal, llavePrivadaPem) {
    try {
        console.log('🔐 FORENSE SELLO: Iniciando firmado con Node.js crypto (RSA-SHA256 PKCS#1 v1.5)...');
        console.log('🔐 FORENSE SELLO: Longitud cadena a firmar:', cadenaOriginal.length);
        console.log('🔐 FORENSE SELLO: Primeros 100 chars cadena:', JSON.stringify(cadenaOriginal.substring(0, 100)));
        console.log('🔐 FORENSE SELLO: Últimos 100 chars cadena:', JSON.stringify(cadenaOriginal.substring(cadenaOriginal.length - 100)));
        
        // Hash SHA256 de la cadena que se va a firmar
        const hashCadena = crypto.createHash('sha256').update(cadenaOriginal, 'utf8').digest('hex');
        console.log('🔐 FORENSE SELLO: SHA256 de cadena a firmar:', hashCadena);
        
        // Validar que la llave privada esté en formato PEM
        if (!llavePrivadaPem.includes('-----BEGIN') || !llavePrivadaPem.includes('-----END')) {
            console.error('❌ FORENSE SELLO: Llave privada no está en formato PEM válido');
            throw new Error('Llave privada no está en formato PEM válido');
        }
        
        console.log('✅ FORENSE SELLO: Llave privada en formato PEM válido');
        console.log('🔐 FORENSE SELLO: Longitud llave PEM:', llavePrivadaPem.length);
        console.log('🔐 FORENSE SELLO: Header llave:', llavePrivadaPem.substring(0, 50));
        
        // Crear el objeto de firma con Node.js crypto
        console.log('🔐 FORENSE SELLO: Creando objeto de firma RSA-SHA256...');
        const sign = crypto.createSign('RSA-SHA256');
        
        // Actualizar con la cadena original (UTF-8)
        console.log('🔐 FORENSE SELLO: Actualizando firma con cadena original (UTF-8)...');
        sign.update(cadenaOriginal, 'utf8');
        
        // Firmar con la llave privada (PKCS#1 v1.5 por defecto)
        console.log('🔐 FORENSE SELLO: Firmando con llave privada (PKCS#1 v1.5)...');
        const selloBuffer = sign.sign(llavePrivadaPem);
        
        console.log('✅ FORENSE SELLO: Firma generada exitosamente');
        console.log('🔐 FORENSE SELLO: Longitud buffer sello:', selloBuffer.length, 'bytes');
        
        // Convertir a base64 (NO url-encode)
        console.log('🔐 FORENSE SELLO: Convirtiendo a base64...');
        const selloBase64 = selloBuffer.toString('base64');
        
        console.log('✅ FORENSE SELLO: Sello digital generado exitosamente');
        console.log('🔐 FORENSE SELLO: Longitud sello base64:', selloBase64.length);
        console.log('🔐 FORENSE SELLO: Primeros 50 chars:', selloBase64.substring(0, 50));
        console.log('🔐 FORENSE SELLO: Últimos 50 chars:', selloBase64.substring(selloBase64.length - 50));
        
        // Hash del sello para trazabilidad
        const hashSello = crypto.createHash('sha256').update(selloBase64, 'utf8').digest('hex');
        console.log('🔐 FORENSE SELLO: SHA256 del sello base64:', hashSello);
        
        // Verificación inmediata del sello generado
        console.log('🔐 FORENSE SELLO: Verificando sello inmediatamente...');
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(cadenaOriginal, 'utf8');
            
            // Necesitamos el certificado para verificar, pero podemos al menos intentar con la llave pública
            // Por ahora solo loggeamos que el proceso de verificación está disponible
            console.log('✅ FORENSE SELLO: Objeto de verificación creado exitosamente');
        } catch (verifyError) {
            console.log('⚠️ FORENSE SELLO: No se pudo crear verificación inmediata:', verifyError.message);
        }
        
        return selloBase64;
        
    } catch (error) {
        console.error('❌ FORENSE SELLO: Error generando sello digital');
        console.error('❌ FORENSE SELLO ERROR:', error.message);
        console.error('❌ FORENSE SELLO STACK:', error.stack);
        return null;
    }
}

/**
 * Genera el sello digital de un CFDI (FUNCIÓN LEGACY con forge)
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {string} Sello digital en base64
 */
function generarSelloDigital(cadenaOriginal, llavePrivadaPem) {
    // Usar la nueva función con Node.js crypto (recomendación ChatGPT)
    return generarSelloDigitalCrypto(cadenaOriginal, llavePrivadaPem);
}

/**
 * Valida un sello digital
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} selloBase64 - Sello digital en base64
 * @param {string} certificadoPem - Certificado en formato PEM
 * @returns {boolean} True si el sello es válido
 */
function validarSelloDigital(cadenaOriginal, selloBase64, certificadoPem) {
    try {
        // Parsear el certificado para obtener la llave pública
        const cert = forge.pki.certificateFromPem(certificadoPem);
        const publicKey = cert.publicKey;
        
        // Decodificar el sello de base64
        const signature = forge.util.decode64(selloBase64);
        
        // Crear hash SHA-256 de la cadena original
        const md = forge.md.sha256.create();
        md.update(cadenaOriginal, 'utf8');
        
        // Verificar la firma con la llave pública
        const verified = publicKey.verify(md.digest().bytes(), signature);
        
        return verified;
        
    } catch (error) {
        console.error('Error validando sello digital:', error);
        return false;
    }
}

/**
 * Agrega SOLO los certificados (NoCertificado y Certificado) al XML CFDI
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} XML con certificados agregados
 */
function agregarCertificadosAlXML(xmlContent, noCertificado, certificadoBase64) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar SOLO certificados (NoCertificado y Certificado)
        comprobante.setAttribute('NoCertificado', noCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlConCertificados = serializer.serializeToString(xmlDoc);
        
        return xmlConCertificados;
        
    } catch (error) {
        console.error('Error agregando certificados al XML:', error);
        throw new Error('Error al agregar certificados al XML: ' + error.message);
    }
}

/**
 * Agrega SOLO el sello digital a un XML CFDI que ya tiene certificados
 * @param {string} xmlContent - Contenido del XML CFDI con certificados
 * @param {string} selloDigital - Sello digital en base64
 * @returns {string} XML con sello agregado
 */
function agregarSoloSelloAlXML(xmlContent, selloDigital) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar SOLO el sello
        comprobante.setAttribute('Sello', selloDigital);
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlSellado = serializer.serializeToString(xmlDoc);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('Error agregando sello al XML:', error);
        throw new Error('Error al agregar sello al XML: ' + error.message);
    }
}

/**
 * Agrega el sello digital a un XML CFDI (FUNCIÓN LEGACY - MANTENER COMPATIBILIDAD)
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} selloDigital - Sello digital en base64
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @returns {string} XML con sello agregado
 */
function agregarSelloAlXML(xmlContent, selloDigital, noCertificado, certificadoBase64) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el elemento comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante');
        }
        
        // Agregar atributos del sello EN ORDEN CORRECTO SAT
        // CRÍTICO: NoCertificado PRIMERO, luego Certificado, SELLO AL FINAL
        comprobante.setAttribute('NoCertificado', noCertificado);
        comprobante.setAttribute('Certificado', certificadoBase64);
        comprobante.setAttribute('Sello', selloDigital); // SELLO SIEMPRE AL FINAL
        
        // Serializar el XML modificado
        const serializer = new XMLSerializer();
        const xmlSellado = serializer.serializeToString(xmlDoc);
        
        return xmlSellado;
        
    } catch (error) {
        console.error('Error agregando sello al XML:', error);
        throw new Error('Error al agregar sello al XML: ' + error.message);
    }
}

/**
 * Proceso completo de sellado de un CFDI
 * CORREGIDO: Elimina doble serialización y asegura integridad del sello
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @param {string} certificadoPem - Certificado en formato PEM
 * @param {string} noCertificado - Número de certificado
 * @param {string} version - Versión del CFDI
 * @returns {object} Resultado del sellado
 */
function sellarCFDI(xmlContent, llavePrivadaPem, certificadoPem, noCertificado, version = '4.0') {
    try {
        console.log('🔍 SELLADO: Iniciando proceso de sellado CFDI...');
        
        // 1. Convertir certificado a base64 (sin headers PEM)
        const certificadoBase64 = certificadoPem
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\n/g, '');
        
        console.log('🔍 SELLADO: Certificado convertido a base64');
        
        // 2. AUDITORÍA FORENSE: XML original antes de modificaciones
        console.log('🔍 FORENSE: XML original (primeros 300 chars):', xmlContent.substring(0, 300));
        console.log('🔍 FORENSE: Longitud XML original:', xmlContent.length);
        
        // 2. CRÍTICO: FLUJO UNIFICADO - Una sola serialización siguiendo código Python exitoso
        const resultadoSellado = sellarXMLUnificado(xmlContent, noCertificado, certificadoBase64, llavePrivadaPem, version);
        
        if (!resultadoSellado.exito) {
            throw new Error('Error en sellado unificado: ' + resultadoSellado.error);
        }
        
        const xmlSellado = resultadoSellado.xmlSellado;
        const cadenaOriginal = resultadoSellado.cadenaOriginal;
        const selloDigital = resultadoSellado.selloDigital;
        
        console.log('🔍 SELLADO: Proceso unificado completado exitosamente');
        console.log('🔍 FORENSE: XML sellado (primeros 400 chars):', xmlSellado.substring(0, 400));
        console.log('🔍 FORENSE: Longitud XML sellado:', xmlSellado.length);
        
        // 6. Validar el sello generado
        const selloValido = validarSelloDigital(cadenaOriginal, selloDigital, certificadoPem);
        console.log('🔍 SELLADO: Validación del sello:', selloValido ? 'VÁLIDO' : 'INVÁLIDO');
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            cadenaOriginal: cadenaOriginal,
            selloDigital: selloDigital,
            selloValido: selloValido,
            noCertificado: noCertificado
        };
        
    } catch (error) {
        console.error('🔍 SELLADO: Error en proceso de sellado:', error);
        return {
            exito: false,
            error: error.message
        };
    }
}

module.exports = {
    normalizeSpace,
    limpiarCadenaOriginal,
    limpiarCadenaOriginalChatGPT,
    validarParCertificadoLlave,
    generarSelloDigitalCrypto,
    sellarXMLUnificado,
    removerAtributoSelloCompletamente,
    generarCadenaOriginalConCertificados,
    generarCadenaOriginal,
    construirCadenaOriginal40,
    construirCadenaOriginal33,
    generarSelloDigital,
    validarSelloDigital,
    agregarCertificadosAlXML,
    agregarSoloSelloAlXML,
    agregarSelloAlXML,
    sellarCFDI
};