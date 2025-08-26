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
const puppeteer = require('puppeteer');

console.log('🎯 PDF GENERATOR: Modo LOCAL ÚNICAMENTE - Sin RedDoc');

/**
 * 🎨 GENERADOR DE PDF LOCAL
 * Genera un PDF usando HTML/CSS y Puppeteer
 * @param {string} xmlContent - Contenido del XML CFDI
 * @param {Object} emisorData - Datos del emisor (logo, color, etc.)
 * @returns {Buffer} - Buffer del PDF generado
 */
async function generarPdfLocal(xmlContent, emisorData = {}) {
    console.log('🎨 PDF LOCAL: Iniciando generación de PDF...');
    
    let browser = null;
    try {
        // Configuración de Puppeteer para serverless
        const puppeteerConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        };

        // Detectar si estamos en entorno serverless
        if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
            console.log('🔧 PDF LOCAL: Configurando para entorno serverless');
            // En serverless, usar chromium empaquetado
            puppeteerConfig.executablePath = '/opt/chrome/chrome' || 
                                           process.env.PUPPETEER_EXECUTABLE_PATH ||
                                           puppeteer.executablePath();
        }

        console.log('🚀 PDF LOCAL: Lanzando navegador...');
        browser = await puppeteer.launch(puppeteerConfig);
        const page = await browser.newPage();

        // Parsear XML para extraer datos
        console.log('📋 PDF LOCAL: Parseando XML CFDI...');
        const xmlData = parsearXmlCfdi(xmlContent);
        
        // Generar HTML con estilo profesional
        console.log('🎨 PDF LOCAL: Generando HTML con estilos...');
        const html = generarHtmlProfesional(xmlData, emisorData);
        
        // Configurar página para PDF
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        console.log('📄 PDF LOCAL: Generando PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
            printBackground: true,
            preferCSSPageSize: true
        });

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
                            <strong>${xmlData.emisor.nombre}</strong><br>
                            RFC: ${xmlData.emisor.rfc}
                        </div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Receptor</div>
                        <div class="info-value">
                            <strong>${xmlData.receptor.nombre}</strong><br>
                            RFC: ${xmlData.receptor.rfc}<br>
                            Uso CFDI: ${xmlData.receptor.uso}
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
                        ${xmlData.conceptos.map(concepto => `
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
        if (!xmlId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'ID del XML es requerido',
                    campo_requerido: 'xmlId'
                })
            };
        }

        console.log('🔍 DB: Buscando XML con ID:', xmlId);

        // Obtener XML de la base de datos
        const { data: xmlData, error: xmlError } = await supabase
            .from('xmls')
            .select('*')
            .eq('id', xmlId)
            .eq('usuario_id', usuario.id)
            .single();

        if (xmlError || !xmlData) {
            console.error('❌ DB: Error obteniendo XML:', xmlError?.message);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'XML no encontrado o no tienes permisos para accederlo',
                    xmlId: xmlId,
                    usuario_id: usuario.id
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
                    console.log('⚠️ EMISOR: No encontrado en BD, usando valores por defecto');
                }
            } else {
                console.log('⚠️ EMISOR: No se pudo extraer RFC del XML');
            }
        } catch (emisorError) {
            console.error('❌ EMISOR: Error obteniendo datos:', emisorError.message);
        }

        // GENERAR PDF LOCAL
        console.log('🎨 PDF: Iniciando generación LOCAL...');
        
        const pdfBuffer = await generarPdfLocal(xmlData.xml_content, emisorData);
        
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
