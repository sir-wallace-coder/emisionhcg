/**
 * 📄 Endpoint para Generar PDF desde XML CFDI
 * 
 * Consume la API externa de redoc.mx para convertir XMLs CFDI a PDF
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

const { supabase } = require('./config/supabase');
const jwt = require('jsonwebtoken');

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
        // URL base correcta de la API de redoc.mx según documentación oficial
        const redocApiUrl = process.env.REDOC_API_URL || 'https://api.redoc.mx/v1/pdf';

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

        // Preparar payload para redoc.mx API
        const xmlBase64 = Buffer.from(xmlData.xml_content, 'utf8').toString('base64');
        
        const payload = {
            xml: xmlBase64,
            encoding: 'base64'
        };

        // Agregar estilo si se especifica
        if (stylePdf) {
            payload.style_pdf = stylePdf;
        }

        console.log('📤 GENERAR PDF: Enviando request a redoc.mx...');
        console.log('🔑 GENERAR PDF: API URL:', redocApiUrl);
        console.log('📊 GENERAR PDF: Payload size:', JSON.stringify(payload).length, 'bytes');

        // Hacer request a redoc.mx API
        const redocResponse = await fetch(redocApiUrl, {
            method: 'POST',
            headers: {
                'X-Redoc-Api-Key': redocApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 GENERAR PDF: Respuesta de redoc.mx:', {
            status: redocResponse.status,
            statusText: redocResponse.statusText,
            ok: redocResponse.ok
        });

        // Leer headers de respuesta
        const responseHeaders = {};
        redocResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        console.log('📋 GENERAR PDF: Headers de respuesta:', responseHeaders);

        if (!redocResponse.ok) {
            const errorText = await redocResponse.text();
            console.error('❌ GENERAR PDF: Error de redoc.mx:', errorText);
            
            return {
                statusCode: redocResponse.status,
                headers,
                body: JSON.stringify({
                    error: 'Error generando PDF',
                    mensaje: `API redoc.mx respondió con error ${redocResponse.status}`,
                    detalles: errorText
                })
            };
        }

        // Procesar respuesta exitosa
        const redocResult = await redocResponse.json();
        
        if (!redocResult.content) {
            console.error('❌ GENERAR PDF: Respuesta sin contenido PDF');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error procesando PDF',
                    mensaje: 'La API no devolvió contenido PDF válido'
                })
            };
        }

        console.log('✅ GENERAR PDF: PDF generado exitosamente');
        console.log('📊 GENERAR PDF: Tamaño PDF base64:', redocResult.content.length, 'caracteres');

        // Extraer metadatos de headers
        const metadata = {
            transactionId: responseHeaders['x-redoc-transaction-id'],
            totalPages: responseHeaders['x-redoc-pdf-total-pages'],
            processTime: responseHeaders['x-redoc-process-total-time'],
            xmlMeta: responseHeaders['x-redoc-xml-meta']
        };

        console.log('📋 GENERAR PDF: Metadatos extraídos:', metadata);

        // Preparar respuesta exitosa
        const respuesta = {
            success: true,
            mensaje: 'PDF generado exitosamente',
            pdf: {
                content: redocResult.content, // PDF en base64
                size: redocResult.content.length,
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
