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
const fetch = require('node-fetch');
const FormData = require('form-data');

// SDK de redoc.mx se cargará dinámicamente en la función handler
// debido a que es un ES module y necesita import() dinámico

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

        console.log('🚀 GENERAR PDF: Usando SDK oficial de redoc.mx...');
        
        try {
            // Logs de diagnóstico para API Key
            console.log('🔑 GENERAR PDF: API Key presente:', !!redocApiKey);
            console.log('🔑 GENERAR PDF: API Key longitud:', redocApiKey ? redocApiKey.length : 0);
            console.log('🔑 GENERAR PDF: API Key prefijo:', redocApiKey ? redocApiKey.substring(0, 10) + '...' : 'N/A');
            
            // Inicializar cliente de redoc.mx con API key según documentación oficial
            const redoc = new Redoc(redocApiKey);
            console.log('✅ GENERAR PDF: Cliente @redocmx/client inicializado');
            
            // Cargar CFDI desde string XML usando método oficial del SDK
            const cfdi = redoc.cfdi.fromString(xmlData.xml_content);
            console.log('✅ GENERAR PDF: CFDI cargado desde XML string');
            
            console.log('🔄 GENERAR PDF: Convirtiendo CFDI a PDF usando SDK oficial...');
            console.log('📊 GENERAR PDF: Tamaño XML para conversión:', xmlData.xml_content.length, 'caracteres');
            
            // 🎨 GENERAR ADDENDA XML PARA PERSONALIZACIÓN CORPORATIVA
            let addendaXml = null;
            let hasCustomization = false;
            let logoStatus = 'no_logo';
            
            if (emisorData?.logo || emisorData?.color) {
                console.log('🎨 GENERAR PDF: Creando addenda XML para personalización corporativa');
                
                // Crear addenda XML dinámicamente
                let addendaContent = `<?xml version="1.0" encoding="UTF-8"?>
<rd:redoc xmlns:rd="https://redoc.mx/addenda" 
          xsi:schemaLocation="https://redoc.mx/addenda https://redoc.mx/addenda/v1.0.0/schema.xsd" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          version="1.0.0">
  <rd:style>
    <rd:pdf>
      <rd:settings>`;
      
                // 🚀 MANEJO INTELIGENTE DEL LOGO CORPORATIVO CON UPLOAD AUTOMÁTICO
                if (emisorData?.logo) {
                    console.log('🎨 GENERAR PDF: Logo corporativo detectado en base de datos');
                    console.log('📋 GENERAR PDF: Tamaño del logo:', emisorData.logo.length, 'caracteres base64');
                    
                    const logoPath = `assets/logos/${emisorData.rfc}-logo.png`;
                    
                    try {
                        // 🚀 INTENTAR SUBIR EL LOGO AUTOMÁTICAMENTE A REDOC
                        console.log('🚀 GENERAR PDF: Intentando subir logo automáticamente a RedDoc...');
                        const uploadSuccess = await subirLogoARedoc(emisorData.logo, logoPath);
                        
                        if (uploadSuccess) {
                            console.log('✅ GENERAR PDF: Logo subido exitosamente a RedDoc:', logoPath);
                            logoStatus = 'uploaded_success';
                        } else {
                            console.log('⚠️ GENERAR PDF: No se pudo subir el logo, usando sin logo');
                            logoStatus = 'upload_failed';
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
            const pdfBuffer = pdf.toBuffer();
            const pdfBase64 = pdfBuffer.toString('base64');
            
            console.log('✅ GENERAR PDF: PDF generado exitosamente con SDK oficial');
            console.log('📊 GENERAR PDF: Tamaño PDF buffer:', pdfBuffer.length, 'bytes');
            console.log('📊 GENERAR PDF: Tamaño PDF base64:', pdfBase64.length, 'caracteres');
            
            // Extraer metadatos del PDF usando métodos oficiales del SDK
            const metadata = {
                transactionId: pdf.getTransactionId(),
                totalPages: pdf.getTotalPages(),
                processTime: pdf.getTotalTimeMs(),
                xmlMeta: pdf.getMetadata()
            };
            
            console.log('📋 GENERAR PDF: Metadatos extraídos del SDK:', metadata);

            // Preparar respuesta exitosa
            const respuesta = {
                success: true,
                mensaje: 'PDF generado exitosamente con SDK oficial',
                pdf: {
                    content: pdfBase64, // PDF en base64
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

            console.log('🎉 GENERAR PDF: Proceso completado exitosamente con SDK');

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(respuesta)
            };
            
        } catch (sdkError) {
            console.error('❌ GENERAR PDF: Error del SDK redoc.mx:', sdkError.message);
            console.error('Stack SDK:', sdkError.stack);
            
            // Si el SDK falla, intentar con API HTTP directa como fallback
            console.log('🔄 GENERAR PDF: Intentando fallback con API HTTP directa...');
            
            try {
                const httpResult = await generarPdfViaHttp(xmlData.xml_content, redocApiKey, stylePdf);
                
                // Preparar respuesta exitosa del fallback HTTP
                const respuesta = {
                    success: true,
                    mensaje: 'PDF generado exitosamente con API HTTP (fallback)',
                    pdf: {
                        content: httpResult.content,
                        size: httpResult.content.length,
                        encoding: 'base64'
                    },
                    xml: {
                        id: xmlData.id,
                        estado: xmlData.estado,
                        emisor_rfc: xmlData.emisor_rfc,
                        receptor_rfc: xmlData.receptor_rfc,
                        total: xmlData.total
                    },
                    metadata: httpResult.metadata || {},
                    fallback: true,
                    timestamp: new Date().toISOString()
                };

                console.log('🎉 GENERAR PDF: Proceso completado exitosamente con fallback HTTP');

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(respuesta)
                };
                
            } catch (httpError) {
                console.error('❌ GENERAR PDF: Error en fallback HTTP:', httpError.message);
                
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        error: 'Error en SDK y fallback HTTP',
                        sdkError: sdkError.message,
                        httpError: httpError.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

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
