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

// SDK de redoc.mx se cargará dinámicamente en la función handler
// debido a que es un ES module y necesita import() dinámico

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
            
            // 🎨 PREPARAR OPCIONES DE PERSONALIZACIÓN CORPORATIVA
            const pdfOptions = {};
            
            // ✅ PRIORIDAD 1: PERSONALIZACIÓN CORPORATIVA (LOGO Y COLOR)
            let hasCustomization = false;
            
            // Agregar logo corporativo si existe
            if (emisorData?.logo) {
                console.log('🎨 GENERAR PDF: Agregando logo corporativo del emisor');
                pdfOptions.logo = emisorData.logo; // Base64 del logo
                hasCustomization = true;
            }
            
            // Agregar color corporativo si existe
            if (emisorData?.color) {
                console.log('🎨 GENERAR PDF: Aplicando color corporativo:', emisorData.color);
                pdfOptions.primaryColor = emisorData.color; // Color hex (#RRGGBB)
                pdfOptions.accentColor = emisorData.color;
                hasCustomization = true;
            }
            
            // ⚠️ IMPORTANTE: Solo usar estilo predefinido si NO hay personalización corporativa
            // El estilo predefinido puede interferir con logo y color corporativo
            if (stylePdf && !hasCustomization) {
                console.log('🎨 GENERAR PDF: Usando estilo predefinido (sin personalización corporativa):', stylePdf);
                pdfOptions.style = stylePdf;
            } else if (stylePdf && hasCustomization) {
                console.log('⚠️ GENERAR PDF: Ignorando estilo predefinido para preservar personalización corporativa');
            }
            
            console.log('🎨 GENERAR PDF: Opciones de personalización:', {
                tiene_logo: !!pdfOptions.logo,
                color: pdfOptions.primaryColor,
                estilo: pdfOptions.style
            });
            
            // Convertir CFDI a PDF usando el SDK oficial con personalización
            const pdf = await cfdi.toPdf(pdfOptions);
            
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
