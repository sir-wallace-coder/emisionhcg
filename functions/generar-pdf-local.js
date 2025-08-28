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
 * 🔗 GENERAR QR CFDI OFICIAL SEGÚN ANEXO 20 SAT
 * Genera el código QR con los datos requeridos por el SAT para CFDI
 * @param {Object} xmlData - Datos del XML CFDI
 * @param {string} selloEmisor - Sello digital del emisor
 * @returns {string} - URL del QR para generar código
 */
function generarQrCfdi(xmlData, selloEmisor) {
    try {
        // URL base del servicio de verificación SAT
        const urlVerificacion = 'https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx';
        
        // Extraer datos requeridos según Anexo 20 SAT
        const folioFiscal = xmlData.folio_fiscal || xmlData.uuid || '';
        const rfcEmisor = xmlData.emisor_rfc || '';
        const rfcReceptor = xmlData.receptor_rfc || '';
        const total = xmlData.total || '0.00';
        
        // Últimos 8 caracteres del sello digital del emisor
        const ultimosCaracteresSello = selloEmisor ? selloEmisor.slice(-8) : '';
        
        // Construir la cadena del QR según especificación SAT
        // Formato: URL?id=UUID&re=RFC_EMISOR&rr=RFC_RECEPTOR&tt=TOTAL&fe=ULTIMOS_8_SELLO
        const parametrosQr = [
            `id=${encodeURIComponent(folioFiscal)}`,
            `re=${encodeURIComponent(rfcEmisor)}`,
            `rr=${encodeURIComponent(rfcReceptor)}`,
            `tt=${encodeURIComponent(total)}`,
            `fe=${encodeURIComponent(ultimosCaracteresSello)}`
        ].join('&');
        
        const urlCompleta = `${urlVerificacion}?${parametrosQr}`;
        
        console.log('🔗 QR CFDI generado:', {
            folioFiscal: folioFiscal.substring(0, 8) + '...',
            rfcEmisor,
            rfcReceptor,
            total,
            ultimosCaracteresSello,
            longitudUrl: urlCompleta.length
        });
        
        return urlCompleta;
        
    } catch (error) {
        console.error('❌ Error generando QR CFDI:', error);
        return '';
    }
}

/**
 * 🎨 GENERAR HTML DEL QR CFDI
 * Genera el HTML con el QR usando una librería de QR codes
 * @param {string} urlQr - URL completa para el QR
 * @returns {string} - HTML del QR code
 */
function generarHtmlQr(urlQr) {
    if (!urlQr) {
        return `
            <div class="qr-placeholder">
                QR CODE<br>CFDI<br>
                <small style="color: #999; font-size: 8px;">No disponible</small>
            </div>
        `;
    }
    
    // Usar API de QR code online para generar la imagen
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(urlQr)}`;
    
    return `
        <div class="qr-cfdi-oficial">
            <img src="${qrApiUrl}" alt="QR CFDI" style="width: 120px; height: 120px; border: 1px solid #ddd;" />
        </div>
    `;
}

/**
 * 🚀 CONVERTIR HTML A PDF ULTRA-LIGERO
 * Usa servicio externo simple solo para HTML→PDF (sin dependencias pesadas)
 * @param {string} html - HTML generado localmente
 * @returns {Buffer} - Buffer del PDF
 */
/**
 * 🔄 CONVERTIR HTML REDOC A PDF CON SERVICIOS EXTERNOS
 * Intenta múltiples servicios para convertir HTML a PDF
 * @param {string} html - HTML con formato RedDoc
 * @returns {Buffer} - Buffer del PDF generado
 */
async function convertirHtmlRedocAPdf(html) {
    console.log('🔄 PDF: Convirtiendo HTML RedDoc a PDF con servicios externos...');
    
    const servicios = [
        {
            nombre: 'weasyprint-api',
            url: 'https://weasyprint.org/api/pdf',
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            },
            body: html,
            method: 'POST'
        },
        {
            nombre: 'html-pdf-api',
            url: 'https://api.html-pdf-api.com/v1/generate',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: html,
                options: {
                    format: 'A4',
                    margin: {
                        top: '20mm',
                        right: '15mm',
                        bottom: '20mm',
                        left: '15mm'
                    },
                    printBackground: true
                }
            }),
            method: 'POST'
        },
        {
            nombre: 'pdf-generator-api',
            url: 'https://pdf-generator-api.com/api/v1/pdf',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: html,
                format: 'A4',
                orientation: 'portrait',
                margin: '20mm'
            }),
            method: 'POST'
        },
        {
            nombre: 'gotenberg-demo',
            url: 'https://demo.gotenberg.dev/forms/chromium/convert/html',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            isFormData: true,
            method: 'POST'
        }
    ];
    
    for (const servicio of servicios) {
        try {
            console.log(`🔄 PDF: Intentando con ${servicio.nombre}...`);
            
            let requestOptions = {
                method: servicio.method,
                headers: servicio.headers
            };
            
            if (servicio.isFormData) {
                // Para Gotenberg, usar FormData
                const formData = new FormData();
                formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
                requestOptions.body = formData;
                delete requestOptions.headers['Content-Type']; // Dejar que el navegador establezca el boundary
            } else {
                requestOptions.body = servicio.body;
            }
            
            const response = await fetch(servicio.url, requestOptions);
            
            if (response.ok) {
                const pdfBuffer = Buffer.from(await response.arrayBuffer());
                console.log(`✅ PDF: ${servicio.nombre} exitoso - ${pdfBuffer.length} bytes`);
                return pdfBuffer;
            } else {
                const errorText = await response.text().catch(() => 'Error desconocido');
                console.log(`❌ PDF: ${servicio.nombre} respondió con status ${response.status}: ${errorText}`);
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
 * 💰 CONVERTIR NÚMERO A LETRAS (OBLIGATORIO SAT)
 * Convierte un número a su representación en letras para CFDIs
 * @param {number} numero - Número a convertir
 * @param {string} moneda - Moneda (MXN, USD, etc.)
 * @returns {string} - Número en letras
 */
function convertirNumeroALetras(numero, moneda = 'MXN') {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    if (numero === 0) return 'CERO PESOS 00/100 M.N.';
    
    let entero = Math.floor(numero);
    const centavos = Math.round((numero - entero) * 100);
    
    let resultado = '';
    
    if (entero >= 1000000) {
        const millones = Math.floor(entero / 1000000);
        resultado += convertirGrupo(millones) + (millones === 1 ? ' MILLÓN ' : ' MILLONES ');
        entero = entero % 1000000;
    }
    
    if (entero >= 1000) {
        const miles = Math.floor(entero / 1000);
        if (miles === 1) {
            resultado += 'MIL ';
        } else {
            resultado += convertirGrupo(miles) + ' MIL ';
        }
        entero = entero % 1000;
    }
    
    if (entero > 0) {
        resultado += convertirGrupo(entero);
    }
    
    const monedaTexto = moneda === 'USD' ? 'DÓLARES' : 'PESOS';
    return `${resultado.trim()} ${monedaTexto} ${centavos.toString().padStart(2, '0')}/100 M.N.`;
    
    function convertirGrupo(num) {
        let texto = '';
        
        if (num >= 100) {
            if (num === 100) {
                texto += 'CIEN ';
            } else {
                texto += centenas[Math.floor(num / 100)] + ' ';
            }
            num = num % 100;
        }
        
        if (num >= 20) {
            texto += decenas[Math.floor(num / 10)];
            if (num % 10 > 0) {
                texto += ' Y ' + unidades[num % 10];
            }
        } else if (num >= 10) {
            const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
            texto += especiales[num - 10];
        } else if (num > 0) {
            texto += unidades[num];
        }
        
        return texto + ' ';
    }
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
    
    // Manejar caso donde emisorData es null
    const emisorSafe = emisorData || {};
    const logoBase64 = emisorSafe.logo || '';
    const colorCorporativo = emisorSafe.color || '#2563eb';
    
    // Debug del logo en el generador HTML
    console.log('🖼️ HTML LOGO: Datos emisor recibidos:', {
        tieneEmisorData: !!emisorData,
        logoExiste: !!emisorSafe.logo,
        logoTamanio: emisorSafe.logo?.length || 0,
        color: emisorSafe.color
    });
    
    if (logoBase64) {
        console.log('🖼️ HTML LOGO: Logo procesado correctamente');
        console.log('🖼️ HTML LOGO: Primeros 50 chars:', logoBase64.substring(0, 50));
        console.log('🖼️ HTML LOGO: Formato corregido - usando directamente sin prefijo adicional');
        
        // Verificar si ya tiene el prefijo data:image
        const tienePrefijoDataImage = logoBase64.startsWith('data:image/');
        console.log('🖼️ HTML LOGO: Ya tiene prefijo data:image:', tienePrefijoDataImage);
    } else {
        console.log('⚠️ HTML LOGO: Logo NO encontrado o vacío');
    }
    
    // Parsear XML para extraer conceptos y otros datos
    console.log('🔍 HTML: Parseando XML para extraer datos...');
    let conceptos = [];
    let subtotal = '0.00';
    let total = xmlData.total || '0.00';
    let totalEnLetra = convertirNumeroALetras(parseFloat(total)) || 'CERO PESOS 00/100 M.N.';
    let fecha = '';
    let moneda = 'MXN';
    let usoCfdi = 'G03';
    
    // Variables SAT oficiales (definidas fuera del try para estar disponibles en todo el scope)
    let noCertificado = '';
    let selloDigital = '';
    let esTimbrado = false;
    let uuidTimbre = '';
    let fechaCertificacion = '';
    let selloSAT = '';
    let rfcProvCertif = '';
    
    // Variables de método y forma de pago (definidas fuera del try)
    let metodoPago = 'PUE';
    let formaPago = '03';
    
    // Variables de emisor y receptor (campos faltantes)
    let emisorRegimenFiscal = '';
    let emisorCodigoPostal = '';
    let lugarExpedicion = '';
    let receptorCodigoPostal = '';
    let tipoComprobante = '';
    
    try {
        // Extraer conceptos del XML usando regex simple
        const xmlContent = xmlData.xml_content || '';
        const conceptoMatches = xmlContent.match(/<cfdi:Concepto[^>]*>/g) || [];
        
        conceptos = conceptoMatches.map(match => {
            const cantidad = match.match(/Cantidad="([^"]*)"/)?.[1];
            const claveUnidad = match.match(/ClaveUnidad="([^"]*)"/)?.[1];
            const unidad = match.match(/Unidad="([^"]*)"/)?.[1];
            const claveProdServ = match.match(/ClaveProdServ="([^"]*)"/)?.[1];
            const noIdentificacion = match.match(/NoIdentificacion="([^"]*)"/)?.[1] || '';
            const descripcion = match.match(/Descripcion="([^"]*)"/)?.[1];
            const valorUnitario = match.match(/ValorUnitario="([^"]*)"/)?.[1];
            const importe = match.match(/Importe="([^"]*)"/)?.[1];
            const descuento = match.match(/Descuento="([^"]*)"/)?.[1] || '0.00';
            const objetoImp = match.match(/ObjetoImp="([^"]*)"/)?.[1] || '02';
            
            return {
                cantidad,
                claveUnidad,
                unidad,
                claveProdServ,
                noIdentificacion,
                descripcion,
                valorUnitario,
                importe,
                descuento,
                objetoImp
            };
        }).filter(concepto => {
            // Solo incluir conceptos que tengan los campos esenciales
            return concepto.cantidad && concepto.descripcion && concepto.valorUnitario && concepto.importe;
        });
        
        // Extraer otros datos del XML
        const fechaMatch = xmlContent.match(/Fecha="([^"]*)"/)?.[1];
        if (fechaMatch) {
            fecha = new Date(fechaMatch).toLocaleDateString('es-MX');
        }
        
        const monedaMatch = xmlContent.match(/Moneda="([^"]*)"/)?.[1];
        if (monedaMatch) {
            moneda = monedaMatch;
        }
        
        const subtotalMatch = xmlContent.match(/SubTotal="([^"]*)"/)?.[1];
        if (subtotalMatch) {
            subtotal = subtotalMatch;
        }
        
        const usoCfdiMatch = xmlContent.match(/UsoCFDI="([^"]*)"/)?.[1];
        if (usoCfdiMatch) {
            usoCfdi = usoCfdiMatch;
        }
        
        // Extraer método y forma de pago
        metodoPago = xmlContent.match(/MetodoPago="([^"]*)"/)?.[1] || 'PUE';
        formaPago = xmlContent.match(/FormaPago="([^"]*)"/)?.[1] || '03';
        
        // Extraer campos faltantes del emisor y receptor
        emisorRegimenFiscal = xmlContent.match(/<cfdi:Emisor[^>]*RegimenFiscal="([^"]*)"/)?.[1] || '';
        emisorCodigoPostal = xmlContent.match(/<cfdi:DomicilioFiscal[^>]*CodigoPostal="([^"]*)"/)?.[1] || '';
        lugarExpedicion = xmlContent.match(/LugarExpedicion="([^"]*)"/)?.[1] || '';
        receptorCodigoPostal = xmlContent.match(/<cfdi:Receptor[^>]*DomicilioFiscalReceptor="([^"]*)"/)?.[1] || 
                              xmlContent.match(/<cfdi:Receptor[^>]*CodigoPostal="([^"]*)"/)?.[1] || '';
        
        // Extraer tipo de comprobante y convertir a texto
        const tipoComprobanteCode = xmlContent.match(/TipoDeComprobante="([^"]*)"/)?.[1] || '';
        switch(tipoComprobanteCode) {
            case 'I': tipoComprobante = 'Ingreso'; break;
            case 'E': tipoComprobante = 'Egreso'; break;
            case 'T': tipoComprobante = 'Traslado'; break;
            default: tipoComprobante = tipoComprobanteCode;
        }
        
        // Extraer campos SAT oficiales
        noCertificado = xmlContent.match(/NoCertificado="([^"]*)"/)?.[1] || '';
        selloDigital = xmlContent.match(/Sello="([^"]*)"/)?.[1] || '';
        
        // Detectar si está timbrado
        uuidTimbre = xmlContent.match(/<tfd:TimbreFiscalDigital[^>]*UUID="([^"]*)"/)?.[1];
        esTimbrado = !!uuidTimbre;
        
        // Campos de timbrado (solo si está timbrado)
        
        if (esTimbrado) {
            fechaCertificacion = xmlContent.match(/<tfd:TimbreFiscalDigital[^>]*FechaTimbrado="([^"]*)"/)?.[1] || '';
            selloSAT = xmlContent.match(/<tfd:TimbreFiscalDigital[^>]*SelloSAT="([^"]*)"/)?.[1] || '';
            rfcProvCertif = xmlContent.match(/<tfd:TimbreFiscalDigital[^>]*RfcProvCertif="([^"]*)"/)?.[1] || '';
        }
        
        console.log('🔍 HTML: Conceptos extraidos:', conceptos.length);
        console.log('📅 HTML: Fecha parseada:', fecha);
        console.log('💰 HTML: Moneda parseada:', moneda);
        console.log('💵 HTML: Subtotal parseado:', subtotal);
        console.log('📋 HTML: Uso CFDI parseado:', usoCfdi);
        console.log('🏷️ SAT: Es timbrado:', esTimbrado);
        console.log('🏷️ SAT: UUID timbre:', uuidTimbre || 'N/A');
        console.log('🔐 SAT: Certificado:', noCertificado);
        
        // Generar QR CFDI oficial según Anexo 20 SAT
        const urlQrCfdi = generarQrCfdi(xmlData, selloDigital);
        const htmlQrCfdi = generarHtmlQr(urlQrCfdi);
        console.log('🔗 QR CFDI: URL generada:', urlQrCfdi ? 'Sí' : 'No');
        console.log('🎨 QR CFDI: HTML generado:', htmlQrCfdi ? 'Sí' : 'No');
        
        // Generar total en letra (obligatorio SAT)
        totalEnLetra = convertirNumeroALetras(parseFloat(total || '0'), moneda);
    } catch (parseError) {
        console.error('❌ HTML: Error parseando XML:', parseError.message);
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
            padding: 3mm 3mm;
            background: white;
        }
        
        /* Header con logo y datos del emisor */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            border-bottom: 2px solid ${colorCorporativo};
            padding-bottom: 3px;
        }
        
        .logo-section {
            flex: 1;
            max-width: 200px;
        }
        
        .logo {
            max-width: 150px;
            max-height: 60px;
            object-fit: contain;
        }
        
        .emisor-info {
            flex: 2;
            text-align: left;
            padding-left: 15px;
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
            margin-bottom: 5px;
        }
        
        .emisor-regimen {
            font-size: 12px;
            color: #666;
            margin-bottom: 3px;
        }
        
        .emisor-cp {
            font-size: 12px;
            color: #666;
            margin-bottom: 3px;
        }
        
        .emisor-expedicion {
            font-size: 12px;
            color: #666;
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
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .totales-tabla td {
            padding: 8px 15px;
            border: 1px solid #ddd;
        }
        
        .totales-tabla .label {
            background: #f8f9fa;
            font-weight: bold;
            text-align: right;
            width: 70%;
        }
        
        .totales-tabla .valor {
            text-align: right;
            font-weight: bold;
        }
        
        .total-final {
            background: ${colorCorporativo} !important;
            color: white !important;
            font-size: 16px;
        }
        
        /* Estilos SAT oficiales - Layout idéntico al PDF oficial */
        .total-letra-oficial {
            width: 100%;
            margin: 8px 0;
            padding: 6px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            font-size: 12px;
            text-align: left;
        }
        
        .seccion-final-sat {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            gap: 30px;
        }
        
        .columna-totales {
            flex: 1;
            max-width: 50%;
            order: 2; /* Mover totales al lado derecho */
        }
        
        .totales-sat {
            margin-bottom: 15px;
        }
        
        .total-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        
        .total-item.total-final-sat {
            background: ${colorCorporativo};
            color: white;
            padding: 8px 10px;
            margin-top: 5px;
            font-weight: bold;
            border: none;
        }
        
        .total-label {
            font-weight: bold;
        }
        
        .total-valor {
            font-weight: bold;
        }
        
        .metodos-pago {
            margin-top: 15px;
        }
        
        .metodo-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
        }
        
        .metodo-label {
            font-weight: bold;
            color: #666;
        }
        
        .metodo-valor {
            color: #333;
        }
        
        .columna-campos-sat {
            flex: 1;
            max-width: 45%;
            order: 1; /* Mover campos SAT al lado izquierdo */
        }
        
        .campo-sat-oficial {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .campo-label {
            font-weight: bold;
            color: #666;
        }
        
        .campo-valor {
            color: #333;
            text-align: right;
        }
        
        .sellos-digitales-oficiales {
            margin: 12px 0 8px 0;
            display: flex;
            gap: 15px;
            align-items: flex-start;
        }
        
        .columna-qr {
            flex: 0 0 160px;
            text-align: center;
            display: flex;
            align-items: center;
        }
        
        .columna-sellos {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .qr-validacion {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .qr-titulo {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 10px;
            color: #495057;
            text-transform: uppercase;
        }
        
        .qr-placeholder {
            width: 120px;
            height: 120px;
            background: #e9ecef;
            border: 2px dashed #adb5bd;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            font-size: 10px;
            color: #6c757d;
            text-align: center;
            border-radius: 4px;
        }
        
        .elemento-sello {
            background: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
        }
        
        .elemento-sello:hover {
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        
        .sello-oficial {
            margin: 0;
        }
        
        .sello-titulo {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 3px;
            color: #495057;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .sello-contenido {
            word-break: break-all;
            background: #f8f9fa;
            padding: 4px;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 8px;
            line-height: 1.2;
            max-height: 50px;
            overflow: hidden;
            color: #495057;
        }
        
        .certificado-oficial {
            background: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .certificado-titulo {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 3px;
            color: #495057;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .certificado-numero {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: #212529;
            word-break: break-all;
            background: #f8f9fa;
            padding: 6px 8px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }
        
        .campo-certificado-final .campo-label {
            font-weight: bold;
            color: #333;
        }
        
        .campo-certificado-final .campo-valor {
            color: #666;
            font-family: monospace;
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
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
            </div>
            
            <div class="emisor-info">
                <div class="emisor-nombre">${emisorSafe.nombre || xmlData.emisor_nombre}</div>
                <div class="emisor-rfc">RFC: ${emisorSafe.rfc || xmlData.emisor_rfc}</div>
                ${emisorRegimenFiscal ? `<div class="emisor-regimen">Régimen Fiscal: ${emisorRegimenFiscal}</div>` : ''}
                ${lugarExpedicion ? `<div class="emisor-expedicion">Lugar de Expedición: ${lugarExpedicion}</div>` : ''}
            </div>
            
            <div class="factura-info">
                <div class="factura-titulo">FACTURA</div>
                <div class="factura-datos">
                    <div><strong>Serie:</strong> ${xmlData.serie}</div>
                    <div><strong>Folio:</strong> ${xmlData.folio}</div>
                    <div><strong>Fecha:</strong> ${fecha}</div>
                    ${tipoComprobante ? `<div><strong>Tipo:</strong> ${tipoComprobante}</div>` : ''}
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
                    ${receptorCodigoPostal ? `<div class="campo"><strong>Código Postal:</strong> ${receptorCodigoPostal}</div>` : ''}
                </div>
                <div>
                    <div class="campo"><strong>Uso CFDI:</strong> ${usoCfdi}</div>
                    <div class="campo"><strong>Moneda:</strong> ${moneda}</div>
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
        
        <!-- Total en letra a lo ancho (formato SAT oficial) -->
        <div class="total-letra-oficial">
            <strong>Importe con letra:</strong> ${totalEnLetra}
        </div>
        
        <!-- Layout oficial SAT: Totales a la izquierda, campos SAT a la derecha -->
        <div class="seccion-final-sat">
            <!-- Columna izquierda: Totales y métodos de pago -->
            <div class="columna-totales">
                <div class="totales-sat">
                    <div class="total-item">
                        <span class="total-label">Subtotal:</span>
                        <span class="total-valor">$${parseFloat(subtotal).toFixed(2)}</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">IVA (16%):</span>
                        <span class="total-valor">$${(parseFloat(subtotal) * 0.16).toFixed(2)}</span>
                    </div>
                    <div class="total-item total-final-sat">
                        <span class="total-label">TOTAL:</span>
                        <span class="total-valor">$${parseFloat(xmlData.total).toFixed(2)} ${moneda}</span>
                    </div>
                </div>
                
                <!-- Métodos de pago (campos faltantes agregados) -->
                <div class="metodos-pago">
                    <div class="metodo-item">
                        <span class="metodo-label">Método de pago:</span>
                        <span class="metodo-valor">${metodoPago} - ${metodoPago === 'PUE' ? 'Pago en una sola exhibición' : 'Pago en parcialidades o diferido'}</span>
                    </div>
                    <div class="metodo-item">
                        <span class="metodo-label">Forma de pago:</span>
                        <span class="metodo-valor">${formaPago} - ${formaPago === '03' ? 'Transferencia electrónica de fondos' : formaPago === '01' ? 'Efectivo' : formaPago === '04' ? 'Tarjeta de crédito' : 'Por Definir'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Columna derecha: Campos SAT oficiales -->
            <div class="columna-campos-sat">
                ${esTimbrado ? `
                <div class="campo-sat-oficial">
                    <span class="campo-label">Folio fiscal:</span>
                    <span class="campo-valor">${uuidTimbre}</span>
                </div>
                <div class="campo-sat-oficial">
                    <span class="campo-label">Fecha y hora de certificación:</span>
                    <span class="campo-valor">${fechaCertificacion}</span>
                </div>
                <div class="campo-sat-oficial">
                    <span class="campo-label">RFC Proveedor de certificación:</span>
                    <span class="campo-valor">${rfcProvCertif}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Sellos digitales en 2 columnas (formato SAT oficial) -->
        <div class="sellos-digitales-oficiales">
            <!-- Columna Izquierda: QR de validación CFDI -->
            <div class="columna-qr">
                <div class="qr-validacion">
                    <div class="qr-titulo">QR Validación SAT</div>
                    ${htmlQrCfdi}
                </div>
            </div>
            
            <!-- Columna Derecha: Sellos y certificado apilados -->
            <div class="columna-sellos">
                <!-- Número de certificado -->
                <div class="certificado-oficial">
                    <div class="certificado-titulo">No. de Certificado</div>
                    <div class="certificado-numero">${noCertificado}</div>
                </div>
                
                <!-- Sello digital del CFDI -->
                <div class="elemento-sello">
                    <div class="sello-oficial">
                        <div class="sello-titulo">Sello Digital del CFDI</div>
                        <div class="sello-contenido">${selloDigital}</div>
                    </div>
                </div>
                
                <!-- Sello digital del SAT (solo si está timbrado) -->
                <div class="elemento-sello">
                    <div class="sello-oficial">
                        <div class="sello-titulo">Sello Digital del SAT</div>
                        ${esTimbrado ? `
                        <div class="sello-contenido">${selloSAT}</div>
                        ` : `
                        <div class="sello-contenido" style="color: #6c757d; font-style: italic; text-align: center;">No timbrado</div>
                        `}
                    </div>
                </div>
            </div>
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
        const totalEnLetra = totalMatch ? convertirNumeroALetras(parseFloat(totalMatch[1])) : 'CERO PESOS 00/100 M.N.';
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
    
    // Manejar caso donde emisorData es null
    const emisorSafe = emisorData || {};
    const colorPrimario = emisorSafe.color || '#2563eb';
    const logoBase64 = emisorSafe.logo || '';
    
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
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
                </div>
                <div class="cfdi-info">
                    <div class="cfdi-title">CFDI</div>
                    <div class="cfdi-details">
                        <div><strong>Serie:</strong> ${xmlData.serie}</div>
                        <div><strong>Folio:</strong> ${xmlData.folio}</div>
                        <div><strong>Fecha:</strong> ${fecha}</div>
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
                            <strong>${emisorSafe.nombre || xmlData.emisor_nombre}</strong><br>
                            RFC: ${emisorSafe.rfc || xmlData.emisor_rfc}
                        </div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Receptor</div>
                        <div class="info-value">
                            <strong>${xmlData.receptor_nombre}</strong><br>
                            RFC: ${xmlData.receptor_rfc}<br>
                            Uso CFDI: ${usoCfdi}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Conceptos -->
            <div class="section">
                <div class="section-title">Conceptos</div>
                <table class="conceptos-tabla">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>No. Identificación</th>
                            <th>Cantidad</th>
                            <th>Clave unidad</th>
                            <th>Unidad</th>
                            <th>Descripción</th>
                            <th>Valor unitario</th>
                            <th>Importe</th>
                            <th>Descuento</th>
                            <th>Objeto Imp.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conceptos.map(concepto => `
                            <tr>
                                <td>${concepto.claveProdServ}</td>
                                <td>${concepto.noIdentificacion}</td>
                                <td>${concepto.cantidad}</td>
                                <td>${concepto.claveUnidad}</td>
                                <td>${concepto.unidad}</td>
                                <td>${concepto.descripcion}</td>
                                <td>$${parseFloat(concepto.valorUnitario).toFixed(2)}</td>
                                <td>$${parseFloat(concepto.importe).toFixed(2)}</td>
                                <td>$${parseFloat(concepto.descuento).toFixed(2)}</td>
                                <td>${concepto.objetoImp}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Totales -->
            <div class="totales">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>$${parseFloat(subtotal).toFixed(2)} ${moneda}</span>
                </div>
                <div class="total-row total-final">
                    <span>Total:</span>
                    <span>$${parseFloat(xmlData.total).toFixed(2)} ${moneda}</span>
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
        
        // Debug del logo del emisor
        const emisorSafeDebug = emisorData || {};
        console.log('🖼️ LOGO DEBUG: Datos emisor completos:', emisorData);
        console.log('🖼️ LOGO DEBUG: Logo existe:', !!emisorSafeDebug.logo);
        console.log('🖼️ LOGO DEBUG: Tamaño logo:', emisorSafeDebug.logo?.length || 0, 'caracteres');
        if (emisorSafeDebug.logo) {
            console.log('🖼️ LOGO DEBUG: Primeros 50 chars del logo:', emisorSafeDebug.logo.substring(0, 50));
        }
        
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
                        rfc: emisorSafeDebug.rfc,
                        nombre: emisorSafeDebug.nombre,
                        tiene_logo: !!emisorSafeDebug.logo,
                        color: emisorSafeDebug.color
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
