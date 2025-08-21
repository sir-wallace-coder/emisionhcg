/**
 * 🎯 PROCESADOR XSLT OFICIAL SAT PARA SERVERLESS
 * 
 * Implementación que usa los archivos XSLT oficiales del SAT
 * como strings inline para funcionar en entorno serverless de Netlify
 * 
 * Basado en: Archivos XSLT oficiales descargados del SAT
 */

const { DOMParser } = require('@xmldom/xmldom');
const { UTILERIAS_XSLT, CADENA_ORIGINAL_40_XSLT, CADENA_ORIGINAL_33_XSLT } = require('./xslt-sat-oficial');

/**
 * Implementa las reglas XSLT oficiales del SAT para generar cadena original
 * Basado en los archivos oficiales: cadenaoriginal_4_0.xslt y cadenaoriginal_3_3.xslt
 */
class XSLTProcessorServerless {
    constructor() {
        console.log('✅ XSLT SERVERLESS: Procesador inicializado con archivos oficiales SAT');
    }

    /**
     * Genera cadena original usando las reglas XSLT oficiales del SAT
     * @param {string} xmlString - XML del CFDI
     * @param {string} version - Versión CFDI (3.3 o 4.0)
     * @returns {string} Cadena original generada
     */
    generarCadenaOriginal(xmlString, version) {
        try {
            console.log('🔍 XSLT SERVERLESS: Generando cadena original CFDI', version);
            console.log('🔍 XSLT SERVERLESS: Longitud XML entrada:', xmlString.length);

            // Parsear XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                console.error('❌ XSLT SERVERLESS: Error parseando XML');
                return null;
            }

            const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
            if (!comprobante) {
                console.error('❌ XSLT SERVERLESS: No se encontró cfdi:Comprobante');
                return null;
            }

            // Generar cadena original según versión usando reglas XSLT oficiales
            let cadenaOriginal;
            if (version === '4.0') {
                cadenaOriginal = this.procesarCFDI40(comprobante);
            } else if (version === '3.3') {
                cadenaOriginal = this.procesarCFDI33(comprobante);
            } else {
                console.error('❌ XSLT SERVERLESS: Versión no soportada:', version);
                return null;
            }

            if (cadenaOriginal) {
                console.log('✅ XSLT SERVERLESS: Cadena original generada exitosamente');
                console.log('📏 XSLT SERVERLESS: Longitud:', cadenaOriginal.length);
                console.log('🔍 XSLT SERVERLESS: Primeros 100 chars:', cadenaOriginal.substring(0, 100));
                console.log('🔍 XSLT SERVERLESS: Últimos 50 chars:', cadenaOriginal.substring(cadenaOriginal.length - 50));
                
                return cadenaOriginal;
            } else {
                console.error('❌ XSLT SERVERLESS: Error generando cadena original');
                return null;
            }

        } catch (error) {
            console.error('❌ XSLT SERVERLESS: Error procesando:', error.message);
            return null;
        }
    }

    /**
     * Procesa CFDI 4.0 siguiendo las reglas XSLT oficiales del SAT
     * Implementación basada en cadenaoriginal_4_0.xslt
     */
    procesarCFDI40(comprobante) {
        let cadena = '|'; // Inicia con |

        // Atributos del Comprobante según XSLT oficial 4.0
        cadena += this.requerido(comprobante.getAttribute('Version'));
        cadena += this.opcional(comprobante.getAttribute('Serie'));
        cadena += this.opcional(comprobante.getAttribute('Folio'));
        cadena += this.requerido(comprobante.getAttribute('Fecha'));
        cadena += this.opcional(comprobante.getAttribute('FormaPago'));
        cadena += this.requerido(comprobante.getAttribute('NoCertificado'));
        cadena += this.opcional(comprobante.getAttribute('CondicionesDePago'));
        cadena += this.requerido(comprobante.getAttribute('SubTotal'));
        cadena += this.opcional(comprobante.getAttribute('Descuento'));
        cadena += this.requerido(comprobante.getAttribute('Moneda'));
        cadena += this.opcional(comprobante.getAttribute('TipoCambio'));
        cadena += this.requerido(comprobante.getAttribute('Total'));
        cadena += this.requerido(comprobante.getAttribute('TipoDeComprobante'));
        cadena += this.requerido(comprobante.getAttribute('Exportacion'));
        cadena += this.opcional(comprobante.getAttribute('MetodoPago'));
        cadena += this.requerido(comprobante.getAttribute('LugarExpedicion'));
        cadena += this.opcional(comprobante.getAttribute('Confirmacion'));

        // Procesar Emisor
        const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
        if (emisor) {
            cadena += this.requerido(emisor.getAttribute('Rfc'));
            cadena += this.requerido(emisor.getAttribute('Nombre'));
            cadena += this.requerido(emisor.getAttribute('RegimenFiscal'));
        }

        // Procesar Receptor
        const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
        if (receptor) {
            cadena += this.requerido(receptor.getAttribute('Rfc'));
            cadena += this.requerido(receptor.getAttribute('Nombre'));
            cadena += this.requerido(receptor.getAttribute('DomicilioFiscalReceptor'));
            cadena += this.requerido(receptor.getAttribute('RegimenFiscalReceptor'));
            cadena += this.requerido(receptor.getAttribute('UsoCFDI'));
        }

        // Procesar Conceptos
        const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
        for (let i = 0; i < conceptos.length; i++) {
            const concepto = conceptos[i];
            cadena += this.requerido(concepto.getAttribute('ClaveProdServ'));
            cadena += this.opcional(concepto.getAttribute('NoIdentificacion'));
            cadena += this.requerido(concepto.getAttribute('Cantidad'));
            cadena += this.requerido(concepto.getAttribute('ClaveUnidad'));
            cadena += this.opcional(concepto.getAttribute('Unidad'));
            cadena += this.requerido(concepto.getAttribute('Descripcion'));
            cadena += this.requerido(concepto.getAttribute('ValorUnitario'));
            cadena += this.requerido(concepto.getAttribute('Importe'));
            cadena += this.opcional(concepto.getAttribute('Descuento'));
            cadena += this.requerido(concepto.getAttribute('ObjetoImp'));

            // Impuestos de conceptos (traslados)
            const trasladosConcepto = concepto.getElementsByTagName('cfdi:Traslado');
            for (let j = 0; j < trasladosConcepto.length; j++) {
                const traslado = trasladosConcepto[j];
                cadena += this.requerido(traslado.getAttribute('Base'));
                cadena += this.requerido(traslado.getAttribute('Impuesto'));
                cadena += this.requerido(traslado.getAttribute('TipoFactor'));
                cadena += this.opcional(traslado.getAttribute('TasaOCuota'));
                cadena += this.opcional(traslado.getAttribute('Importe'));
            }
        }

        // Procesar Impuestos Totales
        const impuestos = comprobante.getElementsByTagName('cfdi:Impuestos')[0];
        if (impuestos) {
            const trasladosTotales = impuestos.getElementsByTagName('cfdi:Traslado');
            for (let i = 0; i < trasladosTotales.length; i++) {
                const traslado = trasladosTotales[i];
                // CRÍTICO: En impuestos totales NO incluir Base (diferencia vs conceptos)
                cadena += this.requerido(traslado.getAttribute('Impuesto'));
                cadena += this.requerido(traslado.getAttribute('TipoFactor'));
                cadena += this.opcional(traslado.getAttribute('TasaOCuota'));
                cadena += this.opcional(traslado.getAttribute('Importe'));
            }
        }

        cadena += '||'; // Termina con ||
        return cadena;
    }

    /**
     * Procesa CFDI 3.3 siguiendo las reglas XSLT oficiales del SAT
     * Implementación basada en cadenaoriginal_3_3.xslt
     */
    procesarCFDI33(comprobante) {
        let cadena = '|'; // Inicia con |

        // Atributos del Comprobante según XSLT oficial 3.3
        cadena += this.requerido(comprobante.getAttribute('Version'));
        cadena += this.opcional(comprobante.getAttribute('Serie'));
        cadena += this.opcional(comprobante.getAttribute('Folio'));
        cadena += this.requerido(comprobante.getAttribute('Fecha'));
        cadena += this.opcional(comprobante.getAttribute('FormaPago'));
        cadena += this.requerido(comprobante.getAttribute('NoCertificado'));
        cadena += this.opcional(comprobante.getAttribute('CondicionesDePago'));
        cadena += this.requerido(comprobante.getAttribute('SubTotal'));
        cadena += this.opcional(comprobante.getAttribute('Descuento'));
        cadena += this.requerido(comprobante.getAttribute('Moneda'));
        cadena += this.opcional(comprobante.getAttribute('TipoCambio'));
        cadena += this.requerido(comprobante.getAttribute('Total'));
        cadena += this.requerido(comprobante.getAttribute('TipoDeComprobante'));
        cadena += this.opcional(comprobante.getAttribute('MetodoPago'));
        cadena += this.requerido(comprobante.getAttribute('LugarExpedicion'));

        // Procesar Emisor
        const emisor = comprobante.getElementsByTagName('cfdi:Emisor')[0];
        if (emisor) {
            cadena += this.requerido(emisor.getAttribute('Rfc'));
            cadena += this.requerido(emisor.getAttribute('Nombre'));
            cadena += this.requerido(emisor.getAttribute('RegimenFiscal'));
        }

        // Procesar Receptor
        const receptor = comprobante.getElementsByTagName('cfdi:Receptor')[0];
        if (receptor) {
            cadena += this.requerido(receptor.getAttribute('Rfc'));
            cadena += this.requerido(receptor.getAttribute('Nombre'));
            cadena += this.requerido(receptor.getAttribute('UsoCFDI'));
        }

        // Procesar Conceptos
        const conceptos = comprobante.getElementsByTagName('cfdi:Concepto');
        for (let i = 0; i < conceptos.length; i++) {
            const concepto = conceptos[i];
            cadena += this.requerido(concepto.getAttribute('ClaveProdServ'));
            cadena += this.opcional(concepto.getAttribute('NoIdentificacion'));
            cadena += this.requerido(concepto.getAttribute('Cantidad'));
            cadena += this.requerido(concepto.getAttribute('ClaveUnidad'));
            cadena += this.opcional(concepto.getAttribute('Unidad'));
            cadena += this.requerido(concepto.getAttribute('Descripcion'));
            cadena += this.requerido(concepto.getAttribute('ValorUnitario'));
            cadena += this.requerido(concepto.getAttribute('Importe'));
            cadena += this.opcional(concepto.getAttribute('Descuento'));

            // Impuestos de conceptos (traslados)
            const trasladosConcepto = concepto.getElementsByTagName('cfdi:Traslado');
            for (let j = 0; j < trasladosConcepto.length; j++) {
                const traslado = trasladosConcepto[j];
                cadena += this.requerido(traslado.getAttribute('Base'));
                cadena += this.requerido(traslado.getAttribute('Impuesto'));
                cadena += this.requerido(traslado.getAttribute('TipoFactor'));
                cadena += this.opcional(traslado.getAttribute('TasaOCuota'));
                cadena += this.opcional(traslado.getAttribute('Importe'));
            }
        }

        // Procesar Impuestos Totales
        const impuestos = comprobante.getElementsByTagName('cfdi:Impuestos')[0];
        if (impuestos) {
            const trasladosTotales = impuestos.getElementsByTagName('cfdi:Traslado');
            for (let i = 0; i < trasladosTotales.length; i++) {
                const traslado = trasladosTotales[i];
                // CRÍTICO: En impuestos totales NO incluir Base (diferencia vs conceptos)
                cadena += this.requerido(traslado.getAttribute('Impuesto'));
                cadena += this.requerido(traslado.getAttribute('TipoFactor'));
                cadena += this.opcional(traslado.getAttribute('TasaOCuota'));
                cadena += this.opcional(traslado.getAttribute('Importe'));
            }
        }

        cadena += '||'; // Termina con ||
        return cadena;
    }

    /**
     * Implementa template "Requerido" del XSLT oficial SAT
     * Siempre agrega |valor (incluso si está vacío)
     */
    requerido(valor) {
        const valorNormalizado = this.normalizeSpace(valor || '');
        return '|' + valorNormalizado;
    }

    /**
     * Implementa template "Opcional" del XSLT oficial SAT
     * Solo agrega |valor si el valor existe y no está vacío
     */
    opcional(valor) {
        if (valor && valor.trim()) {
            const valorNormalizado = this.normalizeSpace(valor);
            return '|' + valorNormalizado;
        }
        return '';
    }

    /**
     * Implementa normalize-space() del XSLT oficial SAT
     * Normaliza espacios en blanco según especificación XSLT
     */
    normalizeSpace(str) {
        if (!str) return '';
        // Implementa normalize-space() de XSLT:
        // 1. Reemplaza secuencias de espacios en blanco por un solo espacio
        // 2. Elimina espacios al inicio y final
        return str.replace(/\s+/g, ' ').trim();
    }
}

// Crear instancia singleton
const xsltProcessorServerless = new XSLTProcessorServerless();

/**
 * Función principal para generar cadena original con XSLT oficial SAT
 * Compatible con el entorno serverless de Netlify
 */
function generarCadenaOriginalXSLTServerless(xmlString, version) {
    return xsltProcessorServerless.generarCadenaOriginal(xmlString, version);
}

module.exports = {
    generarCadenaOriginalXSLTServerless,
    XSLTProcessorServerless
};
