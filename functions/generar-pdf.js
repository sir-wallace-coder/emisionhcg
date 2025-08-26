/**
 * 📄 Endpoint para Generar PDF desde XML CFDI
 * 
 * Usa el SDK oficial de redoc.mx para convertir XMLs CFDI a PDF
 * 
 * @author CFDI Sistema Completo
 * @version 2.0.0
 */

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');

// ✅ Usar fetch nativo de Node.js 18+ (disponible globalmente)
// No necesita import, está disponible como global en Node.js 18+

// SDK de redoc.mx se cargará dinámicamente en la función handler
// debido a que es un ES module y necesita import() dinámico

// 🔧 CONFIGURACIÓN DE GENERACIÓN DE PDF
const PDF_CONFIG = {
    // Modo de generación: 'local' para generación local, 'redoc' para usar RedDoc SDK
    mode: process.env.PDF_GENERATION_MODE || 'local', // Por defecto usar generación local
    
    // Configuraciones específicas
    local: {
        engine: 'puppeteer', // 'puppeteer' o 'jspdf'
        format: 'A4',
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
        printBackground: true,
        preferCSSPageSize: true
    },
    
    redoc: {
        fallback: true, // Si falla local, usar RedDoc
        uploadLogo: true // Intentar subir logo automáticamente
    }
};

console.log('🔧 PDF CONFIG: Modo de generación configurado:', PDF_CONFIG.mode);

/**
 * 🎨 GENERADOR DE PDF LOCAL QUE REPLICA EXACTAMENTE EL ESTILO DE REDOC
 * Genera un PDF idéntico al de RedDoc usando HTML/CSS y Puppeteer
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {Object} emisorData - Datos del emisor (logo, color, etc.)
 * @returns {Buffer} - Buffer del PDF generado
 */
async function generarPdfLocal(xmlContent, emisorData = {}) {
    try {
        console.log('🎨 PDF LOCAL: Iniciando generación local de PDF...');
        
        // Parsear XML para extraer datos
        const xmlData = parsearXmlCfdi(xmlContent);
        console.log('📋 PDF LOCAL: Datos extraídos del XML:', {
            version: xmlData.version,
            folio: xmlData.folio,
            fecha: xmlData.fecha,
            total: xmlData.total
        });
        
        // Generar HTML con estilo idéntico a RedDoc
        const htmlContent = generarHtmlRedocStyle(xmlData, emisorData);
        
        // Generar PDF usando Puppeteer
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: PDF_CONFIG.local.format,
            margin: PDF_CONFIG.local.margin,
            printBackground: PDF_CONFIG.local.printBackground,
            preferCSSPageSize: PDF_CONFIG.local.preferCSSPageSize
        });
        
        await browser.close();
        
        console.log('✅ PDF LOCAL: PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
        
    } catch (error) {
        console.error('❌ PDF LOCAL: Error generando PDF local:', error.message);
        throw error;
    }
}

/**
 * 📋 PARSER DE XML CFDI PARA EXTRAER DATOS
 * Extrae todos los datos necesarios del XML CFDI
 * @param {string} xmlContent - Contenido del XML
 * @returns {Object} - Datos estructurados del CFDI
 */
function parsearXmlCfdi(xmlContent) {
    const { DOMParser } = require('@xmldom/xmldom');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Obtener el nodo raíz del comprobante
    const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] || 
                       xmlDoc.getElementsByTagName('Comprobante')[0];
    
    if (!comprobante) {
        throw new Error('No se encontró el nodo Comprobante en el XML');
    }
    
    // Extraer datos del emisor
    const emisorNode = comprobante.getElementsByTagName('cfdi:Emisor')[0] || 
                      comprobante.getElementsByTagName('Emisor')[0];
    
    // Extraer datos del receptor
    const receptorNode = comprobante.getElementsByTagName('cfdi:Receptor')[0] || 
                        comprobante.getElementsByTagName('Receptor')[0];
    
    // Extraer conceptos
    const conceptosNode = comprobante.getElementsByTagName('cfdi:Conceptos')[0] || 
                         comprobante.getElementsByTagName('Conceptos')[0];
    const conceptos = [];
    
    if (conceptosNode) {
        const conceptoNodes = conceptosNode.getElementsByTagName('cfdi:Concepto') || 
                             conceptosNode.getElementsByTagName('Concepto');
        
        for (let i = 0; i < conceptoNodes.length; i++) {
            const concepto = conceptoNodes[i];
            conceptos.push({
                cantidad: concepto.getAttribute('Cantidad') || '',
                unidad: concepto.getAttribute('Unidad') || concepto.getAttribute('ClaveUnidad') || '',
                descripcion: concepto.getAttribute('Descripcion') || '',
                valorUnitario: concepto.getAttribute('ValorUnitario') || '',
                importe: concepto.getAttribute('Importe') || ''
            });
        }
    }
    
    return {
        version: comprobante.getAttribute('Version') || '',
        serie: comprobante.getAttribute('Serie') || '',
        folio: comprobante.getAttribute('Folio') || '',
        fecha: comprobante.getAttribute('Fecha') || '',
        sello: comprobante.getAttribute('Sello') || '',
        noCertificado: comprobante.getAttribute('NoCertificado') || '',
        certificado: comprobante.getAttribute('Certificado') || '',
        subTotal: comprobante.getAttribute('SubTotal') || '',
        total: comprobante.getAttribute('Total') || '',
        tipoDeComprobante: comprobante.getAttribute('TipoDeComprobante') || '',
        metodoPago: comprobante.getAttribute('MetodoPago') || '',
        formaPago: comprobante.getAttribute('FormaPago') || '',
        
        emisor: {
            rfc: emisorNode?.getAttribute('Rfc') || '',
            nombre: emisorNode?.getAttribute('Nombre') || '',
            regimenFiscal: emisorNode?.getAttribute('RegimenFiscal') || ''
        },
        
        receptor: {
            rfc: receptorNode?.getAttribute('Rfc') || '',
            nombre: receptorNode?.getAttribute('Nombre') || '',
            usoCFDI: receptorNode?.getAttribute('UsoCFDI') || ''
        },
        
        conceptos: conceptos
    };
}

/**
 * 🎨 GENERADOR DE HTML CON ESTILO IDÉNTICO A REDOC
 * Replica exactamente el diseño y estilos de RedDoc
 * @param {Object} xmlData - Datos del XML parseado
 * @param {Object} emisorData - Datos del emisor (logo, color)
 * @returns {string} - HTML con estilos de RedDoc
 */
function generarHtmlRedocStyle(xmlData, emisorData = {}) {
    const logoBase64 = emisorData.logo || '';
    const colorCorporativo = emisorData.color || '#2563eb'; // Azul por defecto
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFDI - ${xmlData.serie}${xmlData.folio}</title>
    <style>
        /* 🎨 ESTILOS IDÉNTICOS A REDOC */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .cfdi-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
            background: white;
        }
        
        /* Header con logo y datos del emisor */
        .cfdi-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid ${colorCorporativo};
        }
        
        .emisor-info {
            flex: 1;
        }
        
        .emisor-logo {
            width: 120px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 10px;
        }
        
        .emisor-nombre {
            font-size: 16px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 5px;
        }
        
        .emisor-rfc {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .cfdi-info {
            text-align: right;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${colorCorporativo};
        }
        
        .cfdi-titulo {
            font-size: 18px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 10px;
        }
        
        .cfdi-datos {
            font-size: 11px;
        }
        
        .cfdi-datos strong {
            color: #333;
        }
        
        /* Datos del receptor */
        .receptor-section {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #dee2e6;
        }
        
        /* Tabla de conceptos */
        .conceptos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
        }
        
        .conceptos-table th {
            background: ${colorCorporativo};
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
        }
        
        .conceptos-table td {
            padding: 8px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: top;
        }
        
        .conceptos-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        /* Totales */
        .totales-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totales-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${colorCorporativo};
            min-width: 250px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 12px;
        }
        
        .total-final {
            font-size: 16px;
            font-weight: bold;
            color: ${colorCorporativo};
            border-top: 2px solid ${colorCorporativo};
            padding-top: 8px;
            margin-top: 8px;
        }
        
        /* Sello digital */
        .sello-section {
            margin-top: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 10px;
        }
        
        .sello-text {
            word-break: break-all;
            line-height: 1.3;
            color: #666;
        }
        
        /* Pie de página */
        .cfdi-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #dee2e6;
            padding-top: 15px;
        }
        
        @media print {
            .cfdi-container {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="cfdi-container">
        <!-- Header -->
        <div class="cfdi-header">
            <div class="emisor-info">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="emisor-logo">` : ''}
                <div class="emisor-nombre">${xmlData.emisor.nombre}</div>
                <div class="emisor-rfc">RFC: ${xmlData.emisor.rfc}</div>
                <div>Régimen Fiscal: ${xmlData.emisor.regimenFiscal}</div>
            </div>
            <div class="cfdi-info">
                <div class="cfdi-titulo">CFDI ${xmlData.version}</div>
                <div class="cfdi-datos">
                    <div><strong>Serie:</strong> ${xmlData.serie}</div>
                    <div><strong>Folio:</strong> ${xmlData.folio}</div>
                    <div><strong>Fecha:</strong> ${new Date(xmlData.fecha).toLocaleString('es-MX')}</div>
                    <div><strong>Tipo:</strong> ${xmlData.tipoDeComprobante}</div>
                    <div><strong>Método de Pago:</strong> ${xmlData.metodoPago}</div>
                    <div><strong>Forma de Pago:</strong> ${xmlData.formaPago}</div>
                </div>
            </div>
        </div>
        
        <!-- Receptor -->
        <div class="receptor-section">
            <div class="section-title">RECEPTOR</div>
            <div><strong>Nombre:</strong> ${xmlData.receptor.nombre}</div>
            <div><strong>RFC:</strong> ${xmlData.receptor.rfc}</div>
            <div><strong>Uso CFDI:</strong> ${xmlData.receptor.usoCFDI}</div>
        </div>
        
        <!-- Conceptos -->
        <table class="conceptos-table">
            <thead>
                <tr>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Descripción</th>
                    <th class="text-right">Valor Unitario</th>
                    <th class="text-right">Importe</th>
                </tr>
            </thead>
            <tbody>
                ${xmlData.conceptos.map(concepto => `
                    <tr>
                        <td class="text-center">${concepto.cantidad}</td>
                        <td>${concepto.unidad}</td>
                        <td>${concepto.descripcion}</td>
                        <td class="text-right">$${parseFloat(concepto.valorUnitario || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td class="text-right">$${parseFloat(concepto.importe || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Totales -->
        <div class="totales-section">
            <div class="totales-box">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>$${parseFloat(xmlData.subTotal || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="total-row total-final">
                    <span>Total:</span>
                    <span>$${parseFloat(xmlData.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>
        
        ${xmlData.sello ? `
        <!-- Sello Digital -->
        <div class="sello-section">
            <div class="section-title">SELLO DIGITAL</div>
            <div class="sello-text">${xmlData.sello}</div>
            <br>
            <div><strong>No. Certificado:</strong> ${xmlData.noCertificado}</div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="cfdi-footer">
            <div>Este documento es una representación impresa de un CFDI</div>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * 🚀 FUNCIÓN PARA SUBIR LOGO AUTOMÁTICAMENTE A REDOC
 * Convierte logo base64 a buffer y lo sube a la plataforma RedDoc
 * @param {string} logoBase64 - Logo en formato base64
 * @param {string} logoPath - Ruta donde se guardará en RedDoc (ej: assets/logos/RFC-logo.png)
 * @returns {boolean} - true si se subió exitosamente, false si falló
 */
async function subirLogoARedoc(logoBase64, logoPath) {
    try {
        console.log('🚀 SUBIR LOGO: Iniciando upload a RedDoc...');
        console.log('📁 SUBIR LOGO: Ruta destino:', logoPath);
        
        // Validar que tenemos API key
        if (!process.env.REDOC_API_KEY) {
            console.error('❌ SUBIR LOGO: REDOC_API_KEY no configurada');
            return false;
        }
        
        // Convertir base64 a buffer
        const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoBuffer = Buffer.from(base64Data, 'base64');
        
        console.log('📊 SUBIR LOGO: Tamaño del buffer:', logoBuffer.length, 'bytes');
        
        // Crear FormData para el upload
        const formData = new FormData();
        formData.append('file', logoBuffer, {
            filename: logoPath.split('/').pop(), // Extraer solo el nombre del archivo
            contentType: 'image/png'
        });
        formData.append('path', logoPath); // Ruta completa en RedDoc
        
        // Realizar upload a RedDoc API
        const uploadResponse = await fetch('https://api.redoc.mx/v1/assets/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.REDOC_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        console.log('📡 SUBIR LOGO: Status de respuesta:', uploadResponse.status);
        
        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            console.log('✅ SUBIR LOGO: Upload exitoso:', result);
            return true;
        } else {
            const error = await uploadResponse.text();
            console.error('❌ SUBIR LOGO: Error en upload:', error);
            return false;
        }
        
    } catch (error) {
        console.error('💥 SUBIR LOGO: Excepción durante upload:', error.message);
        return false;
    }
}

/**
 * Función para generar PDF vía API HTTP directa (fallback)
 * Prueba diferentes endpoints y configuraciones
 */
async function generarPdfViaHttp(xmlContent, apiKey, stylePdf) {
    console.log('🔧 REDOC HTTP: Usando endpoint oficial encontrado');
    
    // Endpoint correcto según documentación oficial encontrada por el usuario
    const endpoint = 'https://api.redoc.mx/cfdis/convert';
    console.log(`🌐 REDOC HTTP: Endpoint oficial: ${endpoint}`);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-Redoc-Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                xml: xmlContent,
                encoding: 'utf8',
                style_pdf: stylePdf || undefined
            })
        });
        
        console.log(`📊 REDOC HTTP: Status: ${response.status}`);
        console.log(`📊 REDOC HTTP: Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ REDOC HTTP: PDF generado exitosamente con endpoint oficial');
            
            return {
                content: result.content,
                metadata: {
                    transactionId: response.headers.get('X-Redoc-Transaction-Id'),
                    totalPages: response.headers.get('X-Redoc-Pdf-Total-Pages'),
                    totalTime: response.headers.get('X-Redoc-Process-Total-Time'),
                    endpoint: endpoint
                }
            };
        } else {
            const errorText = await response.text();
            console.log(`❌ REDOC HTTP: Error ${response.status}: ${errorText}`);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.log(`❌ REDOC HTTP: Excepción:`, error.message);
        throw error;
    }
}

/**
 * Handler principal para generar PDF desde XML
 */
exports.handler = async (event, context) => {
    console.log('📄 GENERAR PDF: Request recibido:', event.httpMethod);
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight OK' })
        };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Método no permitido',
                metodos_soportados: ['POST', 'OPTIONS']
            })
        };
    }

    try {
        // Verificar autenticación
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Token de autorización requerido',
                    formato: 'Bearer <token>'
                })
            };
        }

        const token = authHeader.substring(7);
        let usuario;
        
        try {
            usuario = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Token inválido o expirado'
                })
            };
        }

        console.log('👤 GENERAR PDF: Usuario autenticado:', usuario.email);

        // Parsear body
        const body = JSON.parse(event.body || '{}');
        const { xmlId, stylePdf } = body;

        if (!xmlId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'ID del XML requerido',
                    parametros_requeridos: ['xmlId']
                })
            };
        }

        console.log('📋 GENERAR PDF: ID del XML:', xmlId);
        console.log('🎨 GENERAR PDF: Estilo PDF:', stylePdf || 'default');

        // Verificar configuración de API
        const redocApiKey = process.env.REDOC_API_KEY;

        if (!redocApiKey) {
            console.error('❌ GENERAR PDF: API Key de redoc.mx no configurada');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Servicio de PDF no configurado',
                    mensaje: 'API Key de redoc.mx no disponible'
                })
            };
        }

        // Cargar SDK de redoc.mx dinámicamente (ES module)
        let Redoc;
        try {
            console.log('🚀 GENERAR PDF: Cargando SDK @redocmx/client...');
            const redocModule = await import('@redocmx/client');
            Redoc = redocModule.default || redocModule;
            console.log('✅ GENERAR PDF: SDK @redocmx/client cargado exitosamente');
        } catch (importError) {
            console.error('❌ GENERAR PDF: Error cargando SDK @redocmx/client:', importError.message);
            console.error('Stack:', importError.stack);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'SDK de PDF no disponible',
                    mensaje: `Error cargando @redocmx/client: ${importError.message}`,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Obtener XML de la base de datos
        console.log('🔍 GENERAR PDF: Buscando XML en base de datos...');
        const { data: xmlData, error: xmlError } = await supabase
            .from('xmls_generados')
            .select('*')
            .eq('id', xmlId)
            .single();

        if (xmlError || !xmlData) {
            console.error('❌ GENERAR PDF: XML no encontrado:', xmlError?.message);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'XML no encontrado',
                    xmlId: xmlId
                })
            };
        }

        console.log('✅ GENERAR PDF: XML encontrado');
        console.log('📊 GENERAR PDF: Estado XML:', xmlData.estado);
        console.log('📄 GENERAR PDF: Tamaño XML:', xmlData.xml_content?.length || 0, 'caracteres');
        
        // 🎨 OBTENER DATOS DEL EMISOR PARA PERSONALIZACIÓN
        let emisorData = null;
        try {
            // Extraer RFC del emisor del XML para buscar sus datos
            const xmlDoc = xmlData.xml_content;
            const rfcMatch = xmlDoc.match(/Rfc="([^"]+)"/i);
            const rfcEmisor = rfcMatch ? rfcMatch[1] : null;
            
            if (rfcEmisor) {
                console.log('🔍 GENERAR PDF: RFC del emisor extraído:', rfcEmisor);
                
                // Buscar datos del emisor (logo y color)
                const { data: emisor, error: emisorError } = await supabase
                    .from('emisores')
                    .select('id, rfc, nombre, logo, color')
                    .eq('rfc', rfcEmisor)
                    .single();
                
                if (emisor && !emisorError) {
                    emisorData = emisor;
                    console.log('✅ GENERAR PDF: Datos del emisor encontrados:', {
                        rfc: emisor.rfc,
                        nombre: emisor.nombre,
                        tiene_logo: !!emisor.logo,
                        color: emisor.color
                    });
                } else {
                    console.log('⚠️ GENERAR PDF: Emisor no encontrado en BD, usando valores por defecto');
                }
            } else {
                console.log('⚠️ GENERAR PDF: No se pudo extraer RFC del XML');
            }
        } catch (emisorError) {
            console.error('❌ GENERAR PDF: Error obteniendo datos del emisor:', emisorError.message);
        }

        // 🔧 DECIDIR MÉTODO DE GENERACIÓN SEGÚN CONFIGURACIÓN
        console.log('🔧 GENERAR PDF: Modo configurado:', PDF_CONFIG.mode);
        
        let pdfBuffer;
        let metadata = {};
        
        if (PDF_CONFIG.mode === 'local') {
            console.log('🎨 GENERAR PDF: Usando generador local (replica RedDoc)...');
            
            try {
                // Generar PDF localmente con estilo idéntico a RedDoc
                pdfBuffer = await generarPdfLocal(xmlData.xml_content, emisorData);
                
                metadata = {
                    generator: 'local',
                    engine: PDF_CONFIG.local.engine,
                    hasLogo: !!emisorData?.logo,
                    hasColor: !!emisorData?.color,
                    processTime: Date.now() - Date.now() // Placeholder
                };
                
                console.log('✅ GENERAR PDF: PDF generado localmente exitosamente');
                console.log('📊 GENERAR PDF: Tamaño PDF buffer:', pdfBuffer.length, 'bytes');
                
            } catch (localError) {
                console.error('❌ GENERAR PDF: Error en generación local:', localError.message);
                
                if (PDF_CONFIG.redoc.fallback) {
                    console.log('🔄 GENERAR PDF: Usando RedDoc como fallback...');
                    // Continuar con RedDoc como fallback
                } else {
                    throw localError;
                }
            }
        }
        
        // 🎯 DECISIÓN DE GENERADOR SEGÚN CONFIGURACIÓN
        if (PDF_CONFIG.mode === 'local') {
            console.log('🎨 PDF CONFIG: Modo de generación configurado: local');
            console.log('🎨 PDF LOCAL: Iniciando generación local de PDF...');
            
            try {
                // Usar el generador local que replica RedDoc
                pdfBuffer = await generarPdfLocal(xmlContent, emisorData);
                
                metadata = {
                    generator: 'local',
                    hasLogo: !!emisorData?.logo,
                    hasColor: !!emisorData?.color,
                    mode: 'local-puppeteer'
                };
                
                console.log('✅ PDF LOCAL: PDF generado exitosamente');
                console.log('📊 PDF LOCAL: Tamaño PDF buffer:', pdfBuffer.length, 'bytes');
                
            } catch (localError) {
                console.error('❌ PDF LOCAL: Error en generación local:', localError.message);
                console.error('Stack Local:', localError.stack);
                
                if (PDF_CONFIG.redoc.fallback) {
                    console.log('🔄 PDF LOCAL: Intentando fallback a RedDoc...');
                    // Continuar con RedDoc como fallback
                } else {
                    throw localError;
                }
            }
        }
        
        // 🔄 GENERADOR REDOC (MODO REDOC O FALLBACK)
        if (!pdfBuffer) {
            console.log('🚀 GENERAR PDF: Usando SDK oficial de redoc.mx...');
            
            try {
                // Logs de diagnóstico para API Key
                console.log('🔑 GENERAR PDF: API Key presente:', !!redocApiKey);
                console.log('🔑 GENERAR PDF: API Key longitud:', redocApiKey ? redocApiKey.length : 0);
                console.log('🔑 GENERAR PDF: API Key prefijo:', redocApiKey ? redocApiKey.substring(0, 10) + '...' : 'N/A');
                
                // Inicializar cliente de redoc.mx con API key según documentación oficial
                const redoc = new Redoc(redocApiKey);
                console.log('✅ GENERAR PDF: Cliente @redocmx/client inicializado');
                
                console.log('🔄 GENERAR PDF: Convirtiendo CFDI a PDF usando SDK oficial...');
                console.log('📊 GENERAR PDF: Tamaño XML para conversión:', xmlContent.length, 'caracteres');
                
                // Cargar CFDI desde string XML usando método oficial del SDK
                const cfdi = redoc.cfdi.fromString(xmlContent);
                console.log('✅ GENERAR PDF: CFDI cargado desde XML string');
                
                // 🎨 PERSONALIZACIÓN CORPORATIVA CON ADDENDA XML
                let addendaXml = null;
                let logoStatus = 'no_logo';
                
                if (emisorData?.logo || emisorData?.color) {
                    console.log('🎨 GENERAR PDF: Creando addenda XML para personalización corporativa');
                    
                    let addendaContent = `<rd:redoc xmlns:rd="http://redoc.mx/addenda">
  <rd:style>
    <rd:pdf>
      <rd:settings>`;
                    let hasCustomization = false;
                    
                    // 🖼️ LOGO CORPORATIVO (REQUIERE UPLOAD PREVIO)
                    if (emisorData?.logo) {
                        console.log('🎨 GENERAR PDF: Logo corporativo detectado en base de datos');
                        console.log('📋 GENERAR PDF: Tamaño del logo:', emisorData.logo.length, 'caracteres base64');
                        
                        const logoPath = `assets/logos/${emisorData.rfc}-logo.png`;
                        
                        try {
                            if (PDF_CONFIG.redoc.uploadLogo) {
                                console.log('🚀 GENERAR PDF: Intentando subir logo automáticamente a RedDoc...');
                                const uploadSuccess = await subirLogoARedoc(emisorData.logo, logoPath);
                                
                                if (uploadSuccess) {
                                    console.log('✅ GENERAR PDF: Logo subido exitosamente a RedDoc:', logoPath);
                                    logoStatus = 'uploaded_success';
                                } else {
                                    console.log('⚠️ GENERAR PDF: No se pudo subir el logo, usando sin logo');
                                    logoStatus = 'upload_failed';
                                }
                            }
                        } catch (uploadError) {
                            console.error('❌ GENERAR PDF: Error subiendo logo:', uploadError.message);
                            logoStatus = 'upload_error';
                        }
                        
                        // Agregar logo a la addenda (funcionará si se subió exitosamente)
                        if (logoStatus === 'uploaded_success') {
                            addendaContent += `
        <rd:section id="header">
          <rd:option id="logo" value="${logoPath}" />
          <rd:option id="logo-horizontal-align" value="center" />
          <rd:option id="logo-vertical-align" value="middle" />
          <rd:option id="logo-width" value="120" />
          <rd:option id="logo-height" value="60" />
        </rd:section>`;
                            hasCustomization = true;
                        } else {
                            console.log('📋 GENERAR PDF: Omitiendo logo en addenda (no disponible en RedDoc)');
                        }
                    }
                    
                    // ✅ COLOR CORPORATIVO (FUNCIONA DIRECTAMENTE)
                    if (emisorData?.color) {
                        console.log('✅ GENERAR PDF: Aplicando color corporativo (funcional):', emisorData.color);
                        addendaContent += `
        <rd:section id="document">
          <rd:option id="primary-color" value="${emisorData.color}" />
          <rd:option id="accent-color" value="${emisorData.color}" />
          <rd:option id="header-background-color" value="${emisorData.color}" />
        </rd:section>`;
                        hasCustomization = true;
                    }
                    
                    addendaContent += `
      </rd:settings>
    </rd:pdf>
  </rd:style>
</rd:redoc>`;
                    
                    addendaXml = addendaContent;
                    console.log('🎨 GENERAR PDF: Addenda XML generada:', {
                        rfc: emisorData?.rfc,
                        tiene_logo_bd: !!emisorData?.logo,
                        logo_status: logoStatus,
                        color_corporativo: emisorData?.color,
                        personalizacion_activa: hasCustomization
                    });
                }
                
                // Aplicar addenda si existe personalización corporativa
                if (addendaXml) {
                    try {
                        console.log('🎨 GENERAR PDF: Aplicando addenda XML al CFDI...');
                        const addenda = redoc.addenda.fromString(addendaXml);
                        cfdi.setAddenda(addenda);
                        console.log('✅ GENERAR PDF: Addenda XML aplicada exitosamente');
                    } catch (addendaError) {
                        console.error('❌ GENERAR PDF: Error aplicando addenda XML:', addendaError.message);
                        console.log('📝 GENERAR PDF: Continuando sin personalización corporativa');
                    }
                } else {
                    console.log('📊 GENERAR PDF: Sin personalización corporativa, usando estilo estándar');
                }
                
                // Convertir CFDI a PDF usando el SDK oficial
                const pdf = await cfdi.toPdf();
                
                // Obtener buffer del PDF según documentación oficial
                pdfBuffer = pdf.toBuffer();
                
                console.log('✅ GENERAR PDF: PDF generado exitosamente con SDK oficial');
                console.log('📊 GENERAR PDF: Tamaño PDF buffer:', pdfBuffer.length, 'bytes');
                
                // Extraer metadatos del PDF usando métodos oficiales del SDK
                metadata = {
                    generator: 'redoc',
                    transactionId: pdf.getTransactionId(),
                    totalPages: pdf.getTotalPages(),
                    processTime: pdf.getTotalTimeMs(),
                    xmlMeta: pdf.getMetadata(),
                    hasLogo: !!emisorData?.logo,
                    hasColor: !!emisorData?.color
                };
                
                console.log('📋 GENERAR PDF: Metadatos extraídos del SDK:', metadata);
                
            } catch (sdkError) {
                console.error('❌ GENERAR PDF: Error del SDK redoc.mx:', sdkError.message);
                console.error('Stack SDK:', sdkError.stack);
                
                if (PDF_CONFIG.redoc.fallback) {
                    console.log('🔄 GENERAR PDF: Intentando fallback con API HTTP directa...');
                    
                    try {
                        const httpResult = await generarPdfViaHttp(xmlContent, redocApiKey, null);
                        pdfBuffer = Buffer.from(httpResult.content, 'base64');
                        metadata = {
                            generator: 'redoc-http-fallback',
                            ...httpResult.metadata,
                            hasLogo: !!emisorData?.logo,
                            hasColor: !!emisorData?.color
                        };
                        console.log('✅ GENERAR PDF: Fallback HTTP exitoso');
                    } catch (httpError) {
                        console.error('❌ GENERAR PDF: Error en fallback HTTP:', httpError.message);
                        throw new Error(`SDK y fallback HTTP fallaron: ${sdkError.message} / ${httpError.message}`);
                    }
                } else {
                    throw sdkError;
                }
            }
        }
        
        // ✅ RESPUESTA UNIFICADA PARA AMBOS MÉTODOS
        if (!pdfBuffer) {
            throw new Error('No se pudo generar el PDF con ningún método');
        }
        
        const pdfBase64 = pdfBuffer.toString('base64');
        
        console.log('✅ GENERAR PDF: PDF generado exitosamente');
        console.log('📊 GENERAR PDF: Tamaño PDF buffer:', pdfBuffer.length, 'bytes');
        console.log('📊 GENERAR PDF: Tamaño PDF base64:', pdfBase64.length, 'caracteres');
        console.log('🔧 GENERAR PDF: Generador usado:', metadata.generator);
        
        // Preparar respuesta exitosa unificada
        const respuesta = {
            success: true,
            mensaje: `PDF generado exitosamente con ${metadata.generator}`,
            pdf: {
                content: pdfBase64,
                size: pdfBase64.length,
                encoding: 'base64'
            },
            xml: {
                id: xmlData.id,
                estado: xmlData.estado,
                emisor_rfc: xmlData.emisor_rfc,
                receptor_rfc: xmlData.receptor_rfc,
                total: xmlData.total
            },
            metadata: metadata,
            timestamp: new Date().toISOString()
        };
        
        console.log('🎉 GENERAR PDF: Proceso completado exitosamente');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(respuesta)
        };

    } catch (error) {
        console.error('💥 GENERAR PDF: Error fatal:', error.message);
        console.error('Stack:', error.stack);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error interno del servidor',
                mensaje: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
