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
    console.log('🚀 HTTP FALLBACK: Iniciando pruebas de API directa...');
    
    // Lista de endpoints a probar
    const endpoints = [
        'https://api.redoc.mx/cfdi/pdf',
        'https://api.redoc.mx/v1/pdf', 
        'https://api.redoc.mx/pdf',
        'https://redoc.mx/api/pdf',
        'https://redoc.mx/api/v1/pdf'
    ];
    
    // Preparar payload base
    const xmlBase64 = Buffer.from(xmlContent, 'utf8').toString('base64');
    const basePayload = {
        xml: xmlBase64,
        encoding: 'base64'
    };
    
    // Agregar estilo si se especifica
    if (stylePdf && stylePdf !== 'default') {
        basePayload.style_pdf = stylePdf;
    }
    
    // Probar cada endpoint
    for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`🔍 HTTP FALLBACK: Probando endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'X-Redoc-Api-Key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'CFDI-Sistema-Completo/1.0'
                },
                body: JSON.stringify(basePayload)
            });
            
            console.log(`📡 HTTP FALLBACK: Respuesta ${endpoint}:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            // Leer headers de respuesta
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            console.log(`📋 HTTP FALLBACK: Headers ${endpoint}:`, responseHeaders);
            
            if (response.ok) {
                // Éxito! Procesar respuesta
                const result = await response.json();
                console.log(`✅ HTTP FALLBACK: Éxito con endpoint: ${endpoint}`);
                
                return {
                    content: result.content || result.pdf || result.data,
                    metadata: {
                        endpoint: endpoint,
                        transactionId: responseHeaders['x-redoc-transaction-id'],
                        totalPages: responseHeaders['x-redoc-pdf-total-pages'],
                        processTime: responseHeaders['x-redoc-process-total-time']
                    }
                };
            } else {
                // Error, leer detalles
                const errorText = await response.text();
                console.log(`❌ HTTP FALLBACK: Error ${response.status} en ${endpoint}:`, errorText.substring(0, 200));
            }
            
        } catch (fetchError) {
            console.log(`❌ HTTP FALLBACK: Error de conexión en ${endpoint}:`, fetchError.message);
        }
    }
    
    // Si llegamos aquí, todos los endpoints fallaron
    throw new Error('Todos los endpoints de redoc.mx fallaron. Verificar cuenta y API key.');
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
            
            // Convertir CFDI a PDF usando el SDK oficial
            // Nota: stylePdf se maneja internamente por el SDK
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
