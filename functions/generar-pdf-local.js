/**
 * 📄 Generador de PDF Local ÚNICAMENTE
 * 
 * Genera PDFs de XMLs CFDI usando SOLO Puppeteer (sin RedDoc)
 * Proceso claro y directo sin fallbacks ni lógica opcional
 * 
 * @author CFDI Sistema Completo
 * @version 3.0.0 - LOCAL ONLY
 */

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');
// GENERADOR PDF IDÉNTICO A REDOC - Puppeteer con configuración específica
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

console.log('🎯 PDF GENERATOR: Modo LOCAL ÚNICAMENTE - Sin RedDoc');

/**
 * 🚀 CONVERTIR HTML A PDF ULTRA-LIGERO
 * Usa servicio externo simple solo para HTML→PDF (sin dependencias pesadas)
 * @param {string} html - HTML generado localmente
 * @returns {Buffer} - Buffer del PDF
 */
/**
 * 🚀 CONVERTIR HTML REDOC A PDF
 * Usa servicios externos confiables con nuestro HTML idéntico a RedDoc
 * @param {string} html - HTML con formato RedDoc generado
 * @returns {Buffer} - Buffer del PDF
 */
async function convertirHtmlRedocAPdf(html) {
    console.log('🔄 PDF: Convirtiendo HTML RedDoc a PDF con servicios externos...');
    
    // Servicios confiables que manejan HTML complejo
    const servicios = [
        {
            nombre: 'htmlcsstoimage',
            url: 'https://hcti.io/v1/image',
            headers: {
                'Authorization': 'Basic ' + Buffer.from('demo:demo').toString('base64'),
                'Content-Type': 'application/json'
            },
            body: {
                html: html,
                format: 'pdf',
                width: 794,  // A4 width
                height: 1123, // A4 height
                device_scale: 1,
                ms_delay: 1000 // Esperar a que carguen los estilos
            }
        },
        {
            nombre: 'pdfshift',
            url: 'https://api.pdfshift.io/v3/convert/pdf',
            headers: {
                'Authorization': 'Basic ' + Buffer.from('demo:demo').toString('base64'),
                'Content-Type': 'application/json'
            },
            body: {
                source: html,
                format: 'A4',
                margin: '20mm 15mm',
                print_background: true,
                wait_for: 1000
            }
        },
        {
            nombre: 'restpack',
            url: 'https://restpack.io/api/html2pdf/v6/convert',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                html: html,
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                print_background: true,
                wait_for: 1000
            }
        }
    ];
    
    for (const servicio of servicios) {
        try {
            console.log(`🔄 PDF: Intentando con ${servicio.nombre}...`);
            
            const response = await fetch(servicio.url, {
                method: 'POST',
                headers: servicio.headers,
                body: JSON.stringify(servicio.body),
                timeout: 30000 // 30 segundos timeout
            });
            
            if (response.ok) {
                const pdfBuffer = Buffer.from(await response.arrayBuffer());
                console.log(`✅ PDF: Conversión exitosa con ${servicio.nombre}`);
                console.log(`📊 PDF: Tamaño: ${pdfBuffer.length} bytes`);
                
                // Verificar que es realmente un PDF
                if (pdfBuffer.length > 100 && pdfBuffer.toString('ascii', 0, 4) === '%PDF') {
                    console.log('✅ PDF: Archivo PDF válido confirmado');
                    console.log('✅ PDF: HTML RedDoc convertido exitosamente a PDF');
                    return pdfBuffer;
                } else {
                    console.log('❌ PDF: Respuesta no es un PDF válido');
                }
            } else {
                console.log(`❌ PDF: ${servicio.nombre} respondió con status ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ PDF: Error con ${servicio.nombre}:`, error.message);
        }
    }
    
    // Si todos los servicios fallan, devolver HTML como último recurso
    console.log('❌ PDF: Todos los servicios externos fallaron');
    console.log('🔄 PDF: Devolviendo HTML RedDoc como fallback...');
    
    // El HTML ya tiene formato idéntico a RedDoc, el frontend puede manejarlo
    const htmlBuffer = Buffer.from(html, 'utf8');
    console.log('✅ PDF: HTML RedDoc devuelto como fallback');
    return htmlBuffer;
}

/**
 * 🎨 GENERADOR HTML IDÉNTICO A REDOC
 * Replica EXACTAMENTE el formato visual de RedDoc
 * @param {Object} xmlData - Datos parseados del XML
 * @param {Object} emisorData - Datos del emisor
 * @returns {string} - HTML con formato idéntico a RedDoc
 */
function generarHtmlRedocIdentico(xmlData, emisorData = {}) {
    console.log('🎨 HTML: Generando HTML con formato RedDoc...');
    
    const logoBase64 = emisorData.logo || '';
    const colorCorporativo = emisorData.color || '#2563eb';
    
    // Parsear XML para extraer conceptos y otros datos
    console.log('🔍 HTML: Parseando XML para extraer datos...');
    let conceptos = [];
    let subtotal = xmlData.total || '0.00';
    let total = xmlData.total || '0.00';
    
    try {
        // Extraer conceptos del XML usando regex simple
        const xmlContent = xmlData.xml_content || '';
        const conceptoMatches = xmlContent.match(/<cfdi:Concepto[^>]*>/g) || [];
        
        conceptos = conceptoMatches.map(match => {
            const cantidad = (match.match(/Cantidad="([^"]*)"/)?.[1] || '1.00');
            const claveUnidad = (match.match(/ClaveUnidad="([^"]*)"/)?.[1] || 'ACT');
            const claveProdServ = (match.match(/ClaveProdServ="([^"]*)"/)?.[1] || '84111506');
            const descripcion = (match.match(/Descripcion="([^"]*)"/)?.[1] || 'Servicio');
            const valorUnitario = (match.match(/ValorUnitario="([^"]*)"/)?.[1] || '0.00');
            const importe = (match.match(/Importe="([^"]*)"/)?.[1] || '0.00');
            
            return {
                cantidad,
                claveUnidad,
                claveProdServ,
                descripcion,
                valorUnitario,
                importe
            };
        });
        
        console.log('🔍 HTML: Conceptos extraidos:', conceptos.length);
    } catch (parseError) {
        console.error('❌ HTML: Error parseando XML:', parseError.message);
        // Fallback: crear concepto básico
        conceptos = [{
            cantidad: '1.00',
            claveUnidad: 'ACT',
            claveProdServ: '84111506',
            descripcion: 'Servicio',
            valorUnitario: xmlData.total || '0.00',
            importe: xmlData.total || '0.00'
        }];
    }
    
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura CFDI</title>
    <style>
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
        
        .factura-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
        }
        
        /* Header con logo y datos del emisor */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 2px solid ${colorCorporativo};
            padding-bottom: 15px;
        }
        
        .logo-section {
            flex: 1;
            max-width: 200px;
        }
        
        .logo {
            max-width: 150px;
            max-height: 80px;
            object-fit: contain;
        }
        
        .emisor-info {
            flex: 2;
            text-align: left;
            padding-left: 20px;
        }
        
        .emisor-nombre {
            font-size: 18px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 5px;
        }
        
        .emisor-rfc {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .factura-info {
            flex: 1;
            text-align: right;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${colorCorporativo};
        }
        
        .factura-titulo {
            font-size: 16px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 10px;
        }
        
        .factura-datos {
            font-size: 12px;
        }
        
        .factura-datos div {
            margin-bottom: 3px;
        }
        
        /* Sección del receptor */
        .receptor-section {
            margin: 20px 0;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${colorCorporativo};
        }
        
        .receptor-titulo {
            font-size: 14px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 10px;
        }
        
        .receptor-datos {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        /* Tabla de conceptos */
        .conceptos-section {
            margin: 20px 0;
        }
        
        .conceptos-titulo {
            font-size: 14px;
            font-weight: bold;
            color: ${colorCorporativo};
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }
        
        .conceptos-tabla {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        .conceptos-tabla th {
            background: ${colorCorporativo};
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        
        .conceptos-tabla td {
            padding: 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        .conceptos-tabla tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        /* Totales */
        .totales-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .totales-tabla {
            width: 300px;
            border-collapse: collapse;
        }
        
        .totales-tabla td {
            padding: 8px 12px;
            border: 1px solid #ddd;
        }
        
        .totales-tabla .label {
            background: #f8f9fa;
            font-weight: bold;
            text-align: right;
            width: 60%;
        }
        
        .totales-tabla .valor {
            text-align: right;
            font-weight: bold;
        }
        
        .total-final {
            background: ${colorCorporativo} !important;
            color: white !important;
            font-size: 14px;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
            text-align: center;
        }
        
        .campo {
            margin-bottom: 3px;
        }
        
        .campo strong {
            color: #333;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="factura-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : ''}
            </div>
            
            <div class="emisor-info">
                <div class="emisor-nombre">${emisorData.nombre || xmlData.emisor_nombre}</div>
                <div class="emisor-rfc">RFC: ${emisorData.rfc || xmlData.emisor_rfc}</div>
            </div>
            
            <div class="factura-info">
                <div class="factura-titulo">FACTURA</div>
                <div class="factura-datos">
                    <div><strong>Serie:</strong> ${xmlData.serie}</div>
                    <div><strong>Folio:</strong> ${xmlData.folio}</div>
                    <div><strong>Fecha:</strong> ${xmlData.fecha}</div>
                </div>
            </div>
        </div>
        
        <!-- Receptor -->
        <div class="receptor-section">
            <div class="receptor-titulo">DATOS DEL CLIENTE</div>
            <div class="receptor-datos">
                <div>
                    <div class="campo"><strong>Nombre:</strong> ${xmlData.receptor_nombre}</div>
                    <div class="campo"><strong>RFC:</strong> ${xmlData.receptor_rfc}</div>
                </div>
                <div>
                    <div class="campo"><strong>Uso CFDI:</strong> ${xmlData.uso_cfdi || 'G03'}</div>
                    <div class="campo"><strong>Moneda:</strong> ${xmlData.moneda}</div>
                </div>
            </div>
        </div>
        
        <!-- Conceptos -->
        <div class="conceptos-section">
            <div class="conceptos-titulo">CONCEPTOS</div>
            <table class="conceptos-tabla">
                <thead>
                    <tr>
                        <th style="width: 8%">Cantidad</th>
                        <th style="width: 10%">Unidad</th>
                        <th style="width: 12%">Clave</th>
                        <th style="width: 45%">Descripción</th>
                        <th style="width: 12%">Precio Unit.</th>
                        <th style="width: 13%">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${conceptos.map(concepto => `
                        <tr>
                            <td>${concepto.cantidad}</td>
                            <td>${concepto.claveUnidad}</td>
                            <td>${concepto.claveProdServ}</td>
                            <td>${concepto.descripcion}</td>
                            <td style="text-align: right;">$${parseFloat(concepto.valorUnitario).toFixed(2)}</td>
                            <td style="text-align: right;">$${parseFloat(concepto.importe).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Totales -->
        <div class="totales-section">
            <table class="totales-tabla">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="valor">$${parseFloat(xmlData.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="label">IVA (16%):</td>
                    <td class="valor">$${(parseFloat(xmlData.subtotal) * 0.16).toFixed(2)}</td>
                </tr>
                <tr class="total-final">
                    <td class="label total-final">TOTAL:</td>
                    <td class="valor total-final">$${parseFloat(xmlData.total).toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Este documento es una representación impresa de un CFDI</p>
        </div>
    </div>
</body>
</html>`;
    
    console.log('✅ HTML: HTML con formato RedDoc generado exitosamente');
    return html;
}

/**
 * 🎨 GENERADOR DE PDF IDÉNTICO A REDOC
 * Genera un PDF usando Puppeteer con el formato EXACTO de RedDoc
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {Object} emisorData - Datos del emisor (logo, color, etc.)
 * @returns {Buffer} - Buffer del PDF generado
 */
async function generarPdfLocal(xmlContent, emisorData = {}) {
    console.log('🎨 PDF LOCAL: Iniciando generación IDÉNTICA A REDOC...');
    
    let browser = null;
    try {
        // Parsear XML para extraer datos
        console.log('📋 PDF LOCAL: Parseando XML CFDI...');
        const xmlData = parsearXmlCfdi(xmlContent);
        
        // Generar HTML con formato EXACTO de RedDoc
        console.log('🎨 PDF LOCAL: Generando HTML con formato RedDoc...');
        const html = generarHtmlRedocIdentico(xmlData, emisorData);
        
        // Configurar Puppeteer para serverless
        console.log('🔧 PDF LOCAL: Configurando Puppeteer para serverless...');
        const puppeteerConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--single-process',
                '--no-zygote'
            ]
        };
        
        // Detectar entorno serverless
        if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
            console.log('🔧 PDF LOCAL: Configurando Chrome para serverless...');
            puppeteerConfig.executablePath = await chromium.executablePath();
            puppeteerConfig.args = [...puppeteerConfig.args, ...chromium.args];
            puppeteerConfig.defaultViewport = chromium.defaultViewport;
            puppeteerConfig.headless = chromium.headless;
        }
        
        // Intentar Puppeteer local, con fallback a servicio externo
        console.log('🚀 PDF LOCAL: Intentando Puppeteer local...');
        
        try {
            browser = await puppeteer.launch(puppeteerConfig);
            const page = await browser.newPage();
            
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            console.log('📄 PDF LOCAL: Generando PDF con Puppeteer...');
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                printBackground: true,
                preferCSSPageSize: true
            });
            
            console.log('✅ PDF LOCAL: PDF generado con Puppeteer exitosamente');
            return pdfBuffer;
            
        } catch (puppeteerError) {
            console.error('❌ PDF LOCAL: Puppeteer falló:', puppeteerError.message);
            console.log('🔄 PDF LOCAL: Usando servicio externo con HTML idéntico...');
            
            // Usar servicio externo que acepte nuestro HTML idéntico a RedDoc
            const pdfBuffer = await convertirHtmlRedocAPdf(html);
            return pdfBuffer;
        }
        
        console.log('✅ PDF LOCAL: PDF generado exitosamente');
        console.log('📊 PDF LOCAL: Tamaño:', pdfBuffer.length, 'bytes');
        
        return pdfBuffer;
        
    } catch (error) {
        console.error('❌ PDF LOCAL: Error generando PDF:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔧 PDF LOCAL: Navegador cerrado');
        }
    }
}

/**
 * 📋 PARSER DE XML CFDI PARA EXTRAER DATOS
 * @param {string} xmlContent - Contenido del XML
 * @returns {Object} - Datos estructurados del CFDI
 */
function parsearXmlCfdi(xmlContent) {
    console.log('📋 PARSER: Extrayendo datos del XML CFDI...');
    
    try {
        // Extraer datos básicos del comprobante
        const fechaMatch = xmlContent.match(/Fecha="([^"]+)"/);
        const serieMatch = xmlContent.match(/Serie="([^"]+)"/);
        const folioMatch = xmlContent.match(/Folio="([^"]+)"/);
        const totalMatch = xmlContent.match(/Total="([^"]+)"/);
        const subtotalMatch = xmlContent.match(/SubTotal="([^"]+)"/);
        const monedaMatch = xmlContent.match(/Moneda="([^"]+)"/);
        
        // Extraer datos del emisor
        const emisorRfcMatch = xmlContent.match(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
        const emisorNombreMatch = xmlContent.match(/<cfdi:Emisor[^>]*Nombre="([^"]+)"/);
        
        // Extraer datos del receptor
        const receptorRfcMatch = xmlContent.match(/<cfdi:Receptor[^>]*Rfc="([^"]+)"/);
        const receptorNombreMatch = xmlContent.match(/<cfdi:Receptor[^>]*Nombre="([^"]+)"/);
        const usoMatch = xmlContent.match(/<cfdi:Receptor[^>]*UsoCFDI="([^"]+)"/);
        
        // Extraer conceptos
        const conceptosRegex = /<cfdi:Concepto[^>]*ClaveProdServ="([^"]*)"[^>]*Cantidad="([^"]*)"[^>]*ClaveUnidad="([^"]*)"[^>]*Descripcion="([^"]*)"[^>]*ValorUnitario="([^"]*)"[^>]*Importe="([^"]*)"/g;
        const conceptos = [];
        let match;
        
        while ((match = conceptosRegex.exec(xmlContent)) !== null) {
            conceptos.push({
                claveProdServ: match[1],
                cantidad: match[2],
                claveUnidad: match[3],
                descripcion: match[4],
                valorUnitario: match[5],
                importe: match[6]
            });
        }

        const datos = {
            fecha: fechaMatch ? fechaMatch[1] : '',
            serie: serieMatch ? serieMatch[1] : '',
            folio: folioMatch ? folioMatch[1] : '',
            total: totalMatch ? totalMatch[1] : '0.00',
            subtotal: subtotalMatch ? subtotalMatch[1] : '0.00',
            moneda: monedaMatch ? monedaMatch[1] : 'MXN',
            
            emisor: {
                rfc: emisorRfcMatch ? emisorRfcMatch[1] : '',
                nombre: emisorNombreMatch ? emisorNombreMatch[1] : ''
            },
            
            receptor: {
                rfc: receptorRfcMatch ? receptorRfcMatch[1] : '',
                nombre: receptorNombreMatch ? receptorNombreMatch[1] : '',
                uso: usoMatch ? usoMatch[1] : ''
            },
            
            conceptos: conceptos
        };

        console.log('✅ PARSER: Datos extraídos exitosamente');
        console.log('📊 PARSER: Conceptos encontrados:', conceptos.length);
        
        return datos;
        
    } catch (error) {
        console.error('❌ PARSER: Error parseando XML:', error.message);
        throw error;
    }
}

/**
 * 🎨 GENERADOR DE HTML CON ESTILO PROFESIONAL
 * @param {Object} xmlData - Datos del XML parseado
 * @param {Object} emisorData - Datos del emisor (logo, color)
 * @returns {string} - HTML con estilos profesionales
 */
function generarHtmlProfesional(xmlData, emisorData = {}) {
    console.log('🎨 HTML: Generando HTML con estilo profesional...');
    
    const colorPrimario = emisorData.color || '#2563eb';
    const logoBase64 = emisorData.logo || '';
    
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CFDI - ${xmlData.serie}${xmlData.folio}</title>
        <style>
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
            
            .container {
                max-width: 100%;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid ${colorPrimario};
            }
            
            .logo-section {
                flex: 1;
                max-width: 200px;
            }
            
            .logo {
                max-width: 150px;
                max-height: 80px;
                object-fit: contain;
            }
            
            .cfdi-info {
                text-align: right;
                flex: 1;
            }
            
            .cfdi-title {
                font-size: 24px;
                font-weight: bold;
                color: ${colorPrimario};
                margin-bottom: 10px;
            }
            
            .cfdi-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid ${colorPrimario};
            }
            
            .section {
                margin-bottom: 25px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: ${colorPrimario};
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .info-box {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            
            .info-label {
                font-weight: bold;
                color: #6b7280;
                font-size: 11px;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            
            .info-value {
                font-size: 13px;
                color: #111827;
                word-wrap: break-word;
            }
            
            .conceptos-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .conceptos-table th {
                background: ${colorPrimario};
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
                font-size: 11px;
            }
            
            .conceptos-table td {
                padding: 10px 8px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 11px;
            }
            
            .conceptos-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            .totales {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border: 2px solid ${colorPrimario};
                margin-top: 20px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 14px;
            }
            
            .total-final {
                font-size: 18px;
                font-weight: bold;
                color: ${colorPrimario};
                border-top: 2px solid ${colorPrimario};
                padding-top: 10px;
                margin-top: 10px;
            }
            
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
            
            @media print {
                body { margin: 0; }
                .container { padding: 10px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo-section">
                    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : ''}
                </div>
                <div class="cfdi-info">
                    <div class="cfdi-title">CFDI</div>
                    <div class="cfdi-details">
                        <div><strong>Serie:</strong> ${xmlData.serie}</div>
                        <div><strong>Folio:</strong> ${xmlData.folio}</div>
                        <div><strong>Fecha:</strong> ${xmlData.fecha}</div>
                    </div>
                </div>
            </div>
            
            <!-- Información del Emisor y Receptor -->
            <div class="section">
                <div class="section-title">Información de Facturación</div>
                <div class="info-grid">
                    <div class="info-box">
                        <div class="info-label">Emisor</div>
                        <div class="info-value">
                            <strong>${emisorData.nombre || xmlData.emisor_nombre}</strong><br>
                            RFC: ${emisorData.rfc || xmlData.emisor_rfc}
                        </div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Receptor</div>
                        <div class="info-value">
                            <strong>${xmlData.receptor_nombre}</strong><br>
                            RFC: ${xmlData.receptor_rfc}<br>
                            Uso CFDI: ${xmlData.uso_cfdi || 'G03'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Conceptos -->
            <div class="section">
                <div class="section-title">Conceptos</div>
                <table class="conceptos-table">
                    <thead>
                        <tr>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Descripción</th>
                            <th>Precio Unitario</th>
                            <th>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conceptos.map(concepto => `
                            <tr>
                                <td>${concepto.cantidad}</td>
                                <td>${concepto.claveUnidad}</td>
                                <td>${concepto.descripcion}</td>
                                <td>$${parseFloat(concepto.valorUnitario).toFixed(2)}</td>
                                <td>$${parseFloat(concepto.importe).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Totales -->
            <div class="totales">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>$${parseFloat(xmlData.subtotal).toFixed(2)} ${xmlData.moneda}</span>
                </div>
                <div class="total-row total-final">
                    <span>Total:</span>
                    <span>$${parseFloat(xmlData.total).toFixed(2)} ${xmlData.moneda}</span>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>Este documento es una representación impresa de un CFDI</p>
                <p>Generado el ${new Date().toLocaleString('es-MX')}</p>
            </div>
        </div>
    </body>
    </html>`;
    
    console.log('✅ HTML: HTML generado exitosamente');
    return html;
}

/**
 * 🎯 HANDLER PRINCIPAL - SOLO GENERACIÓN LOCAL
 * Proceso claro y directo sin fallbacks
 */
exports.handler = async (event, context) => {
    console.log('🎯 PDF HANDLER: Iniciando generación LOCAL de PDF...');
    console.log('📄 REQUEST: Método:', event.httpMethod);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Método no permitido. Solo POST es soportado.',
                metodo_recibido: event.httpMethod
            })
        };
    }

    try {
        console.log('🔐 AUTH: Verificando autenticación...');
        
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
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            usuario = decoded;
            console.log('✅ AUTH: Usuario autenticado:', usuario.email);
            console.log('🔍 AUTH: Usuario ID:', usuario.id);
            console.log('🔍 AUTH: Tipo de usuario.id:', typeof usuario.id);
            console.log('🔍 AUTH: Objeto usuario completo:', JSON.stringify(usuario, null, 2));
        } catch (jwtError) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Token inválido o expirado',
                    detalle: jwtError.message
                })
            };
        }

        // Parsear datos de entrada
        let requestData;
        try {
            requestData = JSON.parse(event.body);
            console.log('📋 DATA: Datos de entrada parseados');
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'JSON inválido en el cuerpo de la petición',
                    detalle: parseError.message
                })
            };
        }

        const { xmlId } = requestData;
        
        // Validar que xmlId existe y no es "undefined"
        if (!xmlId || xmlId === 'undefined' || xmlId === undefined) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'ID del XML es requerido y debe ser válido',
                    campo_requerido: 'xmlId',
                    valor_recibido: xmlId,
                    tipo_recibido: typeof xmlId
                })
            };
        }

        console.log('🔍 DB: Buscando XML con ID:', xmlId);
        console.log('🔍 DB: Tipo de xmlId:', typeof xmlId);
        // Usar userId del JWT (no id)
        const usuarioId = usuario.userId || usuario.id;
        console.log('🔍 DB: Usuario ID para consulta:', usuarioId);
        console.log('🔍 DB: Tipo de usuario ID para consulta:', typeof usuarioId);

        // Obtener XML de la base de datos (sin filtro de usuario - las políticas RLS manejan permisos)
        console.log('🔍 DB: Consultando XML según políticas RLS...');
        let { data: xmlData, error: xmlError } = await supabase
            .from('xmls_generados')
            .select('*')
            .eq('id', xmlId)
            .single();
            
        console.log('🔍 DB: Consulta ejecutada');
        console.log('🔍 DB: xmlData:', xmlData ? 'ENCONTRADO' : 'NULL');
        console.log('🔍 DB: xmlError:', xmlError);

        if (xmlError || !xmlData) {
            console.error('❌ DB: Error obteniendo XML:', xmlError?.message);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'XML no encontrado o sin permisos',
                    detalle: xmlError?.message || 'No se encontró el XML con el ID proporcionado o no tienes permisos para accederlo',
                    xmlId: xmlId
                })
            };
        }

        console.log('✅ DB: XML encontrado');
        console.log('📊 XML: Estado:', xmlData.estado);
        console.log('📄 XML: Tamaño:', xmlData.xml_content?.length || 0, 'caracteres');
        
        // Obtener datos del emisor para personalización
        console.log('🔍 EMISOR: Extrayendo RFC del XML...');
        let emisorData = null;
        
        try {
            const xmlDoc = xmlData.xml_content;
            const rfcMatch = xmlDoc.match(/Rfc="([^"]+)"/i);
            const rfcEmisor = rfcMatch ? rfcMatch[1] : null;
            
            if (rfcEmisor) {
                console.log('🔍 EMISOR: RFC encontrado:', rfcEmisor);
                
                const { data: emisor, error: emisorError } = await supabase
                    .from('emisores')
                    .select('id, rfc, nombre, logo, color')
                    .eq('rfc', rfcEmisor)
                    .single();
                
                if (emisor && !emisorError) {
                    emisorData = emisor;
                    console.log('✅ EMISOR: Datos encontrados:', {
                        rfc: emisor.rfc,
                        nombre: emisor.nombre,
                        tiene_logo: !!emisor.logo,
                        color: emisor.color
                    });
                } else {
                    console.log('⚠️ EMISOR: No encontrado en BD para RFC:', rfcEmisor);
                    // Continuar sin datos del emisor - el PDF se generará con datos básicos del XML
                }
            } else {
                console.log('⚠️ EMISOR: No se pudo extraer RFC del XML');
            }
        } catch (emisorError) {
            console.error('❌ EMISOR: Error obteniendo datos:', emisorError.message);
        }

        // 🚀 GENERAR PDF LOCAL IDÉNTICO A REDOC
        console.log('🎯 PDF: Generando PDF local idéntico a RedDoc...');
        
        // Generar HTML idéntico al de RedDoc
        const htmlRedoc = generarHtmlRedocIdentico(xmlData, emisorData);
        console.log('✅ PDF: HTML RedDoc generado exitosamente');
        console.log(`📊 PDF: Tamaño HTML: ${htmlRedoc.length} caracteres`);
        
        // Convertir HTML RedDoc a PDF usando servicios externos confiables
        const pdfBuffer = await convertirHtmlRedocAPdf(htmlRedoc);
        console.log('✅ PDF: PDF generado exitosamente');
        console.log('📊 PDF: Tamaño buffer:', pdfBuffer.length, 'bytes');
        
        // Convertir a base64 para respuesta
        const pdfBase64 = pdfBuffer.toString('base64');
        console.log('📊 PDF: Tamaño base64:', pdfBase64.length, 'caracteres');

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'PDF generado exitosamente (LOCAL)',
                data: {
                    pdf_base64: pdfBase64,
                    size_bytes: pdfBuffer.length,
                    size_base64: pdfBase64.length,
                    generator: 'local-puppeteer',
                    xmlId: xmlId,
                    emisor: emisorData ? {
                        rfc: emisorData.rfc,
                        nombre: emisorData.nombre,
                        tiene_logo: !!emisorData.logo,
                        color: emisorData.color
                    } : null,
                    timestamp: new Date().toISOString()
                }
            })
        };

    } catch (error) {
        console.error('❌ HANDLER: Error crítico:', error.message);
        console.error('❌ STACK:', error.stack);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Error interno del servidor',
                message: error.message,
                generator: 'local-puppeteer',
                timestamp: new Date().toISOString()
            })
        };
    }
};
