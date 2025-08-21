const crypto = require('crypto');
const forge = require('node-forge');
const { DOMParser, XMLSerializer } = require('xmldom');

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
 * Sella XML CFDI siguiendo el flujo unificado del código Python exitoso
 * CRÍTICO: UNA SOLA serialización para evitar alteración de integridad
 * @param {string} xmlContent - XML original sin sellar
 * @param {string} noCertificado - Número de certificado
 * @param {string} certificadoBase64 - Certificado en base64
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @param {string} version - Versión CFDI (3.3 o 4.0)
 * @returns {object} Resultado del sellado unificado
 */
function sellarXMLUnificado(xmlContent, noCertificado, certificadoBase64, llavePrivadaPem, version) {
    try {
        console.log('🔧 SELLADO UNIFICADO: Iniciando proceso siguiendo patrón Python exitoso...');
        
        // 1. Parsear XML original
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Verificar que se parsó correctamente
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            return { exito: false, error: 'XML mal formado' };
        }
        
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            return { exito: false, error: 'No se encontró el elemento cfdi:Comprobante' };
        }
        
        console.log('🔧 SELLADO UNIFICADO: XML parseado correctamente');
        
        // 2. PASO 1 PYTHON: Limpiar atributos de sellado previos
        const atributosLimpieza = ['NoCertificado', 'Certificado', 'Sello'];
        atributosLimpieza.forEach(attr => {
            if (comprobante.hasAttribute(attr)) {
                comprobante.removeAttribute(attr);
                console.log(`🧹 LIMPIEZA: Eliminado atributo previo ${attr}`);
            }
        });
        
        // 3. PASO 2 PYTHON: Agregar SOLO NoCertificado
        comprobante.setAttribute('NoCertificado', noCertificado);
        console.log('🔧 SELLADO UNIFICADO: NoCertificado agregado:', noCertificado);
        
        // 4. PASO 3 PYTHON: Generar cadena original del XML que YA tiene NoCertificado
        // Serializar el XML actualizado para pasarlo a generarCadenaOriginal
        const xmlSerializer = new XMLSerializer();
        const xmlActualizado = xmlSerializer.serializeToString(xmlDoc);
        
        const cadenaOriginalRaw = generarCadenaOriginal(xmlActualizado, version);
        if (!cadenaOriginalRaw) {
            return { exito: false, error: 'Error generando cadena original' };
        }
        
        console.log('🔧 SELLADO UNIFICADO: Cadena original generada');
        console.log('🔍 FORENSE: Cadena original COMPLETA:', cadenaOriginalRaw);
        
        // 5. PASO 4 PYTHON: Limpiar caracteres invisibles antes del firmado
        const cadenaOriginal = limpiarCadenaOriginal(cadenaOriginalRaw);
        console.log('🔧 SELLADO UNIFICADO: Cadena original limpia para firmado');
        
        // Verificar si la limpieza cambió algo
        if (cadenaOriginalRaw !== cadenaOriginal) {
            console.log('🔍 FORENSE: ¡ATENCIÓN! La limpieza modificó la cadena original');
            console.log('🔍 FORENSE: Caracteres eliminados:', cadenaOriginalRaw.length - cadenaOriginal.length);
        } else {
            console.log('🔍 FORENSE: La limpieza NO modificó la cadena original');
        }
        
        // 6. PASO 5 PYTHON: Firmar la cadena original
        const selloDigital = generarSelloDigital(cadenaOriginal, llavePrivadaPem);
        if (!selloDigital) {
            return { exito: false, error: 'Error generando sello digital' };
        }
        
        console.log('🔧 SELLADO UNIFICADO: Sello digital generado');
        console.log('🔍 FORENSE: Sello digital:', selloDigital);
        
        // 7. PASO 6 PYTHON: Agregar Sello y Certificado AL FINAL
        comprobante.setAttribute('Sello', selloDigital);
        comprobante.setAttribute('Certificado', certificadoBase64);
        
        console.log('🔧 SELLADO UNIFICADO: Sello y Certificado agregados al XML');
        
        // 8. PASO 7 PYTHON: UNA SOLA serialización final
        const finalSerializer = new XMLSerializer();
        const xmlSellado = finalSerializer.serializeToString(xmlDoc);
        
        console.log('🔧 SELLADO UNIFICADO: XML serializado una sola vez');
        
        // 9. VERIFICACIÓN DE INTEGRIDAD CRÍTICA
        console.log('🔍 FORENSE: Verificando integridad del sellado...');
        const cadenaOriginalFinal = generarCadenaOriginal(xmlSellado, version);
        
        if (cadenaOriginal !== cadenaOriginalFinal) {
            console.error('🚨 FORENSE: ¡INTEGRIDAD ROTA! La cadena original cambió después del sellado');
            console.error('🚨 FORENSE: Cadena firmada:', cadenaOriginal);
            console.error('🚨 FORENSE: Cadena del XML final:', cadenaOriginalFinal);
            return { exito: false, error: 'Integridad del sello comprometida - cadenas no coinciden' };
        } else {
            console.log('✅ FORENSE: Integridad mantenida - cadenas originales coinciden');
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
 * Limpia caracteres invisibles de la cadena original antes del firmado
 * CRÍTICO CFDI40102: Elimina BOM, saltos de línea, espacios invisibles, etc.
 * @param {string} cadena - Cadena original a limpiar
 * @returns {string} Cadena limpia para firmado
 */
function limpiarCadenaOriginal(cadena) {
    if (!cadena) return '';
    
    console.log(' LIMPIEZA: Iniciando limpieza de caracteres invisibles...');
    console.log(' LIMPIEZA: Longitud original:', cadena.length);
    
    // 1. Eliminar BOM UTF-8 (bytes EF BB BF)
    let cadenaLimpia = cadena.replace(/^\uFEFF/, '');
    
    // 2. Eliminar saltos de línea \r\n (Windows) y \r
    cadenaLimpia = cadenaLimpia.replace(/\r\n/g, '').replace(/\r/g, '').replace(/\n/g, '');
    
    // 3. Reemplazar espacios invisibles por espacios normales
    cadenaLimpia = cadenaLimpia.replace(/\u00A0/g, ' '); // No-breaking space
    cadenaLimpia = cadenaLimpia.replace(/\u200B/g, '');  // Zero-width space (eliminar)
    cadenaLimpia = cadenaLimpia.replace(/\u2060/g, '');  // Word joiner (eliminar)
    cadenaLimpia = cadenaLimpia.replace(/\u200C/g, '');  // Zero-width non-joiner (eliminar)
    cadenaLimpia = cadenaLimpia.replace(/\u200D/g, '');  // Zero-width joiner (eliminar)
    
    // 4. Reemplazar tabs por espacios normales
    cadenaLimpia = cadenaLimpia.replace(/\t/g, ' ');
    
    // 5. Normalizar espacios múltiples (pero cuidado con no afectar números)
    // Solo aplicar si no estamos en medio de un número decimal
    cadenaLimpia = cadenaLimpia.replace(/([^\d])\s+([^\d])/g, '$1 $2');
    
    // 6. Verificar que empiece y termine con || sin espacios pegados
    if (!cadenaLimpia.startsWith('||')) {
        console.warn(' LIMPIEZA: Cadena no empieza con ||');
    }
    if (!cadenaLimpia.endsWith('||')) {
        console.warn(' LIMPIEZA: Cadena no termina con ||');
    }
    
    // 7. Eliminar espacios antes y después de los || iniciales/finales
    cadenaLimpia = cadenaLimpia.replace(/^\s*\|\|/, '||');
    cadenaLimpia = cadenaLimpia.replace(/\|\|\s*$/, '||');
    
    console.log(' LIMPIEZA: Longitud después de limpieza:', cadenaLimpia.length);
    console.log(' LIMPIEZA: Caracteres eliminados:', cadena.length - cadenaLimpia.length);
    
    // 8. Diagnóstico de caracteres especiales restantes
    const caracteresEspeciales = cadenaLimpia.match(/[^\x20-\x7E\u00C0-\u017F]/g);
    if (caracteresEspeciales) {
        console.log(' LIMPIEZA: Caracteres especiales encontrados:', caracteresEspeciales.slice(0, 10));
    }
    
    return cadenaLimpia;
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
 * Genera la cadena original de un XML CFDI (FUNCIÓN LEGACY)
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {string} version - Versión del CFDI (3.3 o 4.0)
 * @returns {string} Cadena original
 */
function generarCadenaOriginal(xmlContent, version = '4.0') {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Obtener el nodo raíz del comprobante
        const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
        if (!comprobante) {
            throw new Error('No se encontró el elemento cfdi:Comprobante en el XML');
        }
        
        // Construir cadena original según la versión
        let cadenaOriginal = '';
        
        if (version === '4.0') {
            cadenaOriginal = construirCadenaOriginal40(comprobante);
        } else if (version === '3.3') {
            cadenaOriginal = construirCadenaOriginal33(comprobante);
        } else {
            throw new Error('Versión de CFDI no soportada: ' + version);
        }
        
        return cadenaOriginal;
        
    } catch (error) {
        console.error('Error generando cadena original:', error);
        throw new Error('Error al generar cadena original: ' + error.message);
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
 * Genera el sello digital de un CFDI
 * @param {string} cadenaOriginal - Cadena original del CFDI
 * @param {string} llavePrivadaPem - Llave privada en formato PEM
 * @returns {string} Sello digital en base64
 */
function generarSelloDigital(cadenaOriginal, llavePrivadaPem) {
    try {
        // Parsear la llave privada
        const privateKey = forge.pki.privateKeyFromPem(llavePrivadaPem);
        
        // Crear hash SHA-256 de la cadena original
        const md = forge.md.sha256.create();
        md.update(cadenaOriginal, 'utf8');
        
        // Firmar con la llave privada
        const signature = privateKey.sign(md);
        
        // Convertir a base64
        const selloBase64 = forge.util.encode64(signature);
        
        return selloBase64;
        
    } catch (error) {
        console.error('Error generando sello digital:', error);
        throw new Error('Error al generar sello digital: ' + error.message);
    }
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
        console.log('🔐 SELLADO: Iniciando proceso de sellado CFDI...');
        
        // 1. Convertir certificado a base64 (sin headers PEM)
        const certificadoBase64 = certificadoPem
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\n/g, '');
        
        console.log('🔐 SELLADO: Certificado convertido a base64');
        
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
        
        console.log('🔐 SELLADO: Proceso unificado completado exitosamente');
        console.log('🔍 FORENSE: XML sellado (primeros 400 chars):', xmlSellado.substring(0, 400));
        console.log('🔍 FORENSE: Longitud XML sellado:', xmlSellado.length);
        
        // 6. Validar el sello generado
        const selloValido = validarSelloDigital(cadenaOriginal, selloDigital, certificadoPem);
        console.log('🔐 SELLADO: Validación del sello:', selloValido ? 'VÁLIDO' : 'INVÁLIDO');
        
        return {
            exito: true,
            xmlSellado: xmlSellado,
            cadenaOriginal: cadenaOriginal,
            selloDigital: selloDigital,
            selloValido: selloValido,
            noCertificado: noCertificado
        };
        
    } catch (error) {
        console.error('🔐 SELLADO: Error en proceso de sellado:', error);
        return {
            exito: false,
            error: error.message
        };
    }
}

module.exports = {
    normalizeSpace,
    limpiarCadenaOriginal,
    sellarXMLUnificado,
    generarCadenaOriginal,
    generarCadenaOriginalConCertificados,
    generarSelloDigital,
    validarSelloDigital,
    agregarCertificadosAlXML,
    agregarSoloSelloAlXML,
    agregarSelloAlXML,
    sellarCFDI
};
