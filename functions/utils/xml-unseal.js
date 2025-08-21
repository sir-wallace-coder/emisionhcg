/**
 * 🔄 Utilidad para Quitar Sello de XMLs CFDI
 * 
 * Funciones para restaurar XMLs sellados a su estado original
 * quitando los atributos de sellado (Sello, NoCertificado, Certificado)
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

/**
 * Quita el sello de un XML CFDI y lo restaura a su estado original
 * 
 * @param {string} xmlSellado - XML CFDI sellado
 * @returns {Object} Resultado de la operación
 */
function quitarSelloXML(xmlSellado) {
    console.log('🔄 XML UNSEAL: Iniciando proceso de quitar sello');
    console.log('📄 XML UNSEAL: Tamaño XML sellado:', xmlSellado.length, 'caracteres');
    
    try {
        // 1. Parsear XML sellado
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlSellado, 'text/xml');
        
        if (!xmlDoc || xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML inválido o mal formado');
        }
        
        const comprobante = xmlDoc.documentElement;
        console.log('✅ XML UNSEAL: XML parseado correctamente');
        
        // 2. Verificar que el XML esté sellado
        const selloActual = comprobante.getAttribute('Sello');
        const noCertificadoActual = comprobante.getAttribute('NoCertificado');
        const certificadoActual = comprobante.getAttribute('Certificado');
        
        if (!selloActual && !noCertificadoActual && !certificadoActual) {
            console.log('⚠️ XML UNSEAL: El XML ya no tiene sello');
            return {
                exito: true,
                yaEstabaSinSello: true,
                xmlOriginal: xmlSellado,
                mensaje: 'El XML ya estaba sin sello',
                atributosQuitados: []
            };
        }
        
        console.log('🔍 XML UNSEAL: Atributos de sellado encontrados:');
        console.log('  - Sello:', selloActual ? `${selloActual.substring(0, 50)}...` : 'No presente');
        console.log('  - NoCertificado:', noCertificadoActual || 'No presente');
        console.log('  - Certificado:', certificadoActual ? `${certificadoActual.substring(0, 50)}...` : 'No presente');
        
        // 3. Guardar información de los atributos que se van a quitar
        const atributosQuitados = [];
        
        if (selloActual) {
            atributosQuitados.push({
                nombre: 'Sello',
                valor: selloActual,
                longitud: selloActual.length
            });
        }
        
        if (noCertificadoActual) {
            atributosQuitados.push({
                nombre: 'NoCertificado',
                valor: noCertificadoActual,
                longitud: noCertificadoActual.length
            });
        }
        
        if (certificadoActual) {
            atributosQuitados.push({
                nombre: 'Certificado',
                valor: certificadoActual,
                longitud: certificadoActual.length
            });
        }
        
        // 4. Quitar atributos de sellado
        console.log('🧹 XML UNSEAL: Quitando atributos de sellado...');
        
        if (selloActual) {
            comprobante.removeAttribute('Sello');
            console.log('  ✅ Sello removido');
        }
        
        if (noCertificadoActual) {
            comprobante.removeAttribute('NoCertificado');
            console.log('  ✅ NoCertificado removido');
        }
        
        if (certificadoActual) {
            comprobante.removeAttribute('Certificado');
            console.log('  ✅ Certificado removido');
        }
        
        // 5. Serializar XML restaurado
        const xmlSerializer = new XMLSerializer();
        const xmlOriginal = xmlSerializer.serializeToString(xmlDoc);
        
        console.log('📄 XML UNSEAL: XML original restaurado');
        console.log('📊 XML UNSEAL: Tamaño XML original:', xmlOriginal.length, 'caracteres');
        console.log('📉 XML UNSEAL: Reducción de tamaño:', xmlSellado.length - xmlOriginal.length, 'caracteres');
        
        // 6. Validar que el XML restaurado sea válido
        const xmlValidacion = parser.parseFromString(xmlOriginal, 'text/xml');
        if (xmlValidacion.getElementsByTagName('parsererror').length > 0) {
            throw new Error('El XML restaurado no es válido');
        }
        
        console.log('✅ XML UNSEAL: Proceso completado exitosamente');
        
        return {
            exito: true,
            yaEstabaSinSello: false,
            xmlOriginal: xmlOriginal,
            xmlSellado: xmlSellado,
            atributosQuitados: atributosQuitados,
            estadisticas: {
                tamañoOriginal: xmlOriginal.length,
                tamañoSellado: xmlSellado.length,
                reduccionTamaño: xmlSellado.length - xmlOriginal.length,
                atributosRemovidos: atributosQuitados.length
            },
            mensaje: `Sello removido exitosamente. ${atributosQuitados.length} atributos eliminados.`
        };
        
    } catch (error) {
        console.error('❌ XML UNSEAL: Error quitando sello:', error.message);
        
        return {
            exito: false,
            error: error.message,
            xmlOriginal: null,
            atributosQuitados: [],
            mensaje: `Error quitando sello: ${error.message}`
        };
    }
}

/**
 * Valida si un XML tiene sello
 * 
 * @param {string} xmlContent - Contenido XML
 * @returns {Object} Información sobre el estado del sello
 */
function validarEstadoSello(xmlContent) {
    console.log('🔍 XML UNSEAL: Validando estado del sello');
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        if (!xmlDoc || xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML inválido');
        }
        
        const comprobante = xmlDoc.documentElement;
        
        const sello = comprobante.getAttribute('Sello');
        const noCertificado = comprobante.getAttribute('NoCertificado');
        const certificado = comprobante.getAttribute('Certificado');
        
        const tieneSello = !!(sello || noCertificado || certificado);
        
        const estado = {
            tieneSello: tieneSello,
            atributos: {
                sello: !!sello,
                noCertificado: !!noCertificado,
                certificado: !!certificado
            },
            valores: {
                sello: sello || null,
                noCertificado: noCertificado || null,
                certificado: certificado || null
            },
            estadoTexto: tieneSello ? 'Sellado' : 'Sin sellar'
        };
        
        console.log('📋 XML UNSEAL: Estado del sello:', estado.estadoTexto);
        
        return {
            exito: true,
            estado: estado
        };
        
    } catch (error) {
        console.error('❌ XML UNSEAL: Error validando estado:', error.message);
        
        return {
            exito: false,
            error: error.message,
            estado: null
        };
    }
}

/**
 * Compara dos XMLs para verificar si uno es la versión sellada del otro
 * 
 * @param {string} xmlOriginal - XML sin sello
 * @param {string} xmlSellado - XML con sello
 * @returns {Object} Resultado de la comparación
 */
function compararXMLs(xmlOriginal, xmlSellado) {
    console.log('🔍 XML UNSEAL: Comparando XMLs original vs sellado');
    
    try {
        const parser = new DOMParser();
        
        // Parsear ambos XMLs
        const docOriginal = parser.parseFromString(xmlOriginal, 'text/xml');
        const docSellado = parser.parseFromString(xmlSellado, 'text/xml');
        
        if (docOriginal.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML original inválido');
        }
        
        if (docSellado.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML sellado inválido');
        }
        
        // Quitar sello del XML sellado para comparar
        const resultadoQuitar = quitarSelloXML(xmlSellado);
        
        if (!resultadoQuitar.exito) {
            throw new Error('Error quitando sello para comparación');
        }
        
        // Comparar contenido (sin espacios en blanco)
        const originalLimpio = xmlOriginal.replace(/\s+/g, ' ').trim();
        const restauradoLimpio = resultadoQuitar.xmlOriginal.replace(/\s+/g, ' ').trim();
        
        const sonIguales = originalLimpio === restauradoLimpio;
        
        console.log('📊 XML UNSEAL: Resultado comparación:', sonIguales ? 'IGUALES' : 'DIFERENTES');
        
        return {
            exito: true,
            sonIguales: sonIguales,
            diferencias: {
                tamañoOriginal: xmlOriginal.length,
                tamañoSellado: xmlSellado.length,
                tamañoRestaurado: resultadoQuitar.xmlOriginal.length
            },
            mensaje: sonIguales ? 
                'Los XMLs coinciden (el sellado es versión sellada del original)' :
                'Los XMLs no coinciden (diferentes estructuras base)'
        };
        
    } catch (error) {
        console.error('❌ XML UNSEAL: Error comparando XMLs:', error.message);
        
        return {
            exito: false,
            error: error.message,
            sonIguales: false,
            mensaje: `Error en comparación: ${error.message}`
        };
    }
}

module.exports = {
    quitarSelloXML,
    validarEstadoSello,
    compararXMLs
};
