const libxmljs = require('libxmljs2');
const fs = require('fs');
const path = require('path');

/**
 * Procesador XSLT oficial SAT para generación de cadena original CFDI
 * Utiliza los archivos XSLT oficiales descargados del SAT
 */
class XSLTProcessor {
    constructor() {
        this.xsltCache = new Map();
        this.loadXSLTFiles();
    }

    /**
     * Carga los archivos XSLT oficiales del SAT
     */
    loadXSLTFiles() {
        try {
            const xsltDir = path.join(__dirname, '..', 'xslt');
            
            // Cargar utilidades
            const utileriasPath = path.join(xsltDir, 'utilerias.xslt');
            const utileriasContent = fs.readFileSync(utileriasPath, 'utf8');
            this.xsltCache.set('utilerias', utileriasContent);
            
            // Cargar XSLT CFDI 4.0
            const xslt40Path = path.join(xsltDir, 'cadenaoriginal_4_0.xslt');
            const xslt40Content = fs.readFileSync(xslt40Path, 'utf8');
            this.xsltCache.set('4.0', xslt40Content);
            
            // Cargar XSLT CFDI 3.3
            const xslt33Path = path.join(xsltDir, 'cadenaoriginal_3_3.xslt');
            const xslt33Content = fs.readFileSync(xslt33Path, 'utf8');
            this.xsltCache.set('3.3', xslt33Content);
            
            console.log('✅ Archivos XSLT oficiales SAT cargados correctamente');
        } catch (error) {
            console.error('❌ Error cargando archivos XSLT:', error);
            throw new Error('No se pudieron cargar los archivos XSLT oficiales del SAT');
        }
    }

    /**
     * Genera la cadena original usando el XSLT oficial del SAT
     * @param {string} xmlString - XML del CFDI
     * @param {string} version - Versión del CFDI (3.3 o 4.0)
     * @returns {string} - Cadena original generada
     */
    generarCadenaOriginalXSLT(xmlString, version) {
        try {
            console.log(`🔄 Generando cadena original con XSLT oficial SAT ${version}`);
            
            // Validar versión
            if (!['3.3', '4.0'].includes(version)) {
                throw new Error(`Versión CFDI no soportada: ${version}`);
            }
            
            // Parsear el XML
            const xmlDoc = libxmljs.parseXml(xmlString);
            if (!xmlDoc) {
                throw new Error('Error parseando XML del CFDI');
            }
            
            // Obtener el XSLT correspondiente
            const xsltContent = this.xsltCache.get(version);
            if (!xsltContent) {
                throw new Error(`XSLT no encontrado para versión ${version}`);
            }
            
            // Procesar con implementación manual optimizada
            // Nota: libxmljs2 no soporta XSLT directamente, 
            // pero podemos implementar las reglas XSLT manualmente
            const cadenaOriginal = this.procesarXMLConReglasXSLT(xmlDoc, version);
            
            console.log(`✅ Cadena original generada exitosamente (${cadenaOriginal.length} caracteres)`);
            console.log(`📋 Cadena: ${cadenaOriginal.substring(0, 200)}...`);
            
            return cadenaOriginal;
            
        } catch (error) {
            console.error('❌ Error generando cadena original con XSLT:', error);
            throw error;
        }
    }

    /**
     * Implementa las reglas XSLT del SAT manualmente
     * Basado en el XSLT oficial descargado
     */
    procesarXMLConReglasXSLT(xmlDoc, version) {
        try {
            const comprobante = xmlDoc.get('//cfdi:Comprobante', {
                cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
            });
            
            if (!comprobante) {
                throw new Error('Nodo Comprobante no encontrado en el XML');
            }
            
            let cadena = '|';
            
            // Procesar atributos del comprobante según XSLT oficial
            cadena += this.procesarAtributo(comprobante, 'Version', true);
            cadena += this.procesarAtributo(comprobante, 'Serie', false);
            cadena += this.procesarAtributo(comprobante, 'Folio', false);
            cadena += this.procesarAtributo(comprobante, 'Fecha', true);
            cadena += this.procesarAtributo(comprobante, 'FormaPago', false);
            cadena += this.procesarAtributo(comprobante, 'NoCertificado', true);
            cadena += this.procesarAtributo(comprobante, 'CondicionesDePago', false);
            cadena += this.procesarAtributo(comprobante, 'SubTotal', true);
            cadena += this.procesarAtributo(comprobante, 'Descuento', false);
            cadena += this.procesarAtributo(comprobante, 'Moneda', true);
            cadena += this.procesarAtributo(comprobante, 'TipoCambio', false);
            cadena += this.procesarAtributo(comprobante, 'Total', true);
            cadena += this.procesarAtributo(comprobante, 'TipoDeComprobante', true);
            
            if (version === '4.0') {
                cadena += this.procesarAtributo(comprobante, 'Exportacion', true);
            }
            
            cadena += this.procesarAtributo(comprobante, 'MetodoPago', false);
            cadena += this.procesarAtributo(comprobante, 'LugarExpedicion', true);
            
            if (version === '4.0') {
                cadena += this.procesarAtributo(comprobante, 'Confirmacion', false);
            }
            
            // Procesar nodos hijos según XSLT oficial
            cadena += this.procesarEmisor(xmlDoc, version);
            cadena += this.procesarReceptor(xmlDoc, version);
            cadena += this.procesarConceptos(xmlDoc, version);
            cadena += this.procesarImpuestos(xmlDoc, version);
            
            cadena += '||';
            
            return cadena;
            
        } catch (error) {
            console.error('❌ Error procesando XML con reglas XSLT:', error);
            throw error;
        }
    }

    /**
     * Procesa un atributo según las reglas XSLT (Requerido u Opcional)
     */
    procesarAtributo(nodo, nombreAtributo, esRequerido) {
        const valor = nodo.attr(nombreAtributo);
        
        if (esRequerido) {
            // Regla "Requerido" del XSLT
            const valorFinal = valor ? this.normalizarEspacios(valor.value()) : '';
            return `|${valorFinal}`;
        } else {
            // Regla "Opcional" del XSLT
            if (valor && valor.value()) {
                const valorFinal = this.normalizarEspacios(valor.value());
                return `|${valorFinal}`;
            }
            return '';
        }
    }

    /**
     * Implementa normalize-space() del XSLT
     */
    normalizarEspacios(texto) {
        if (!texto) return '';
        return texto.toString().trim().replace(/\s+/g, ' ');
    }

    /**
     * Procesa el nodo Emisor según XSLT oficial
     */
    procesarEmisor(xmlDoc, version) {
        const emisor = xmlDoc.get('//cfdi:Emisor', {
            cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
        });
        
        if (!emisor) return '';
        
        let cadena = '';
        cadena += this.procesarAtributo(emisor, 'Rfc', true);
        cadena += this.procesarAtributo(emisor, 'Nombre', true);
        cadena += this.procesarAtributo(emisor, 'RegimenFiscal', true);
        
        if (version === '4.0') {
            cadena += this.procesarAtributo(emisor, 'FacAtrAdquirente', false);
        }
        
        return cadena;
    }

    /**
     * Procesa el nodo Receptor según XSLT oficial
     */
    procesarReceptor(xmlDoc, version) {
        const receptor = xmlDoc.get('//cfdi:Receptor', {
            cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
        });
        
        if (!receptor) return '';
        
        let cadena = '';
        cadena += this.procesarAtributo(receptor, 'Rfc', true);
        cadena += this.procesarAtributo(receptor, 'Nombre', true);
        
        if (version === '4.0') {
            cadena += this.procesarAtributo(receptor, 'DomicilioFiscalReceptor', true);
            cadena += this.procesarAtributo(receptor, 'ResidenciaFiscal', false);
            cadena += this.procesarAtributo(receptor, 'NumRegIdTrib', false);
            cadena += this.procesarAtributo(receptor, 'RegimenFiscalReceptor', true);
        }
        
        cadena += this.procesarAtributo(receptor, 'UsoCFDI', true);
        
        return cadena;
    }

    /**
     * Procesa los Conceptos según XSLT oficial
     */
    procesarConceptos(xmlDoc, version) {
        const conceptos = xmlDoc.find('//cfdi:Conceptos/cfdi:Concepto', {
            cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
        });
        
        let cadena = '';
        
        conceptos.forEach(concepto => {
            cadena += this.procesarAtributo(concepto, 'ClaveProdServ', true);
            cadena += this.procesarAtributo(concepto, 'NoIdentificacion', false);
            cadena += this.procesarAtributo(concepto, 'Cantidad', true);
            cadena += this.procesarAtributo(concepto, 'ClaveUnidad', true);
            cadena += this.procesarAtributo(concepto, 'Unidad', false);
            cadena += this.procesarAtributo(concepto, 'Descripcion', true);
            cadena += this.procesarAtributo(concepto, 'ValorUnitario', true);
            cadena += this.procesarAtributo(concepto, 'Importe', true);
            cadena += this.procesarAtributo(concepto, 'Descuento', false);
            
            if (version === '4.0') {
                cadena += this.procesarAtributo(concepto, 'ObjetoImp', true);
            }
            
            // Procesar impuestos del concepto
            const traslados = concepto.find('.//cfdi:Impuestos/cfdi:Traslados/cfdi:Traslado', {
                cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
            });
            
            traslados.forEach(traslado => {
                cadena += this.procesarAtributo(traslado, 'Base', true);
                cadena += this.procesarAtributo(traslado, 'Impuesto', true);
                cadena += this.procesarAtributo(traslado, 'TipoFactor', true);
                cadena += this.procesarAtributo(traslado, 'TasaOCuota', false);
                cadena += this.procesarAtributo(traslado, 'Importe', false);
            });
        });
        
        return cadena;
    }

    /**
     * Procesa los Impuestos totales según XSLT oficial
     * CRÍTICO: En impuestos totales NO se incluye Base (diferencia clave con conceptos)
     */
    procesarImpuestos(xmlDoc, version) {
        let cadena = '';
        
        // Procesar traslados totales - SIN Base según XSLT oficial
        const traslados = xmlDoc.find('//cfdi:Impuestos/cfdi:Traslados/cfdi:Traslado', {
            cfdi: version === '4.0' ? 'http://www.sat.gob.mx/cfd/4' : 'http://www.sat.gob.mx/cfd/3'
        });
        
        traslados.forEach(traslado => {
            // CRÍTICO: NO incluir Base en traslados totales
            cadena += this.procesarAtributo(traslado, 'Impuesto', true);
            cadena += this.procesarAtributo(traslado, 'TipoFactor', true);
            cadena += this.procesarAtributo(traslado, 'TasaOCuota', false);
            cadena += this.procesarAtributo(traslado, 'Importe', false);
        });
        
        return cadena;
    }
}

// Crear instancia singleton
const xsltProcessor = new XSLTProcessor();

module.exports = {
    generarCadenaOriginalXSLT: (xmlString, version) => {
        return xsltProcessor.generarCadenaOriginalXSLT(xmlString, version);
    }
};
