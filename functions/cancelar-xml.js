/**
 * 🔄 Endpoint para Cancelar/Restaurar XMLs CFDI
 * 
 * Permite quitar el sello de XMLs sellados y restaurarlos a su estado original
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

const { supabase } = require('./config/supabase');
const { quitarSelloXML, validarEstadoSello } = require('./utils/xml-unseal');
const jwt = require('jsonwebtoken');

/**
 * Handler principal para cancelar/restaurar XMLs
 */
exports.handler = async (event, context) => {
    console.log('🔄 CANCELAR XML: Request recibido:', event.httpMethod);
    
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

        console.log('👤 CANCELAR XML: Usuario autenticado:', usuario.email);

        // Parsear body
        const body = JSON.parse(event.body || '{}');
        const { xmlId, motivo } = body;

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

        console.log('📋 CANCELAR XML: ID del XML:', xmlId);
        console.log('📝 CANCELAR XML: Motivo:', motivo || 'No especificado');

        // Obtener XML de la base de datos
        console.log('🔍 CANCELAR XML: Buscando XML en base de datos...');
        const { data: xmlData, error: xmlError } = await supabase
            .from('xmls_generados')
            .select('*')
            .eq('id', xmlId)
            .single();

        if (xmlError || !xmlData) {
            console.error('❌ CANCELAR XML: XML no encontrado:', xmlError?.message);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'XML no encontrado',
                    xmlId: xmlId
                })
            };
        }

        console.log('✅ CANCELAR XML: XML encontrado');
        console.log('📊 CANCELAR XML: Estado actual:', xmlData.estado);
        console.log('📄 CANCELAR XML: Tamaño XML:', xmlData.xml_content?.length || 0, 'caracteres');

        // Verificar que el XML esté sellado
        if (xmlData.estado !== 'sellado') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'El XML no está sellado',
                    estadoActual: xmlData.estado,
                    mensaje: 'Solo se pueden cancelar XMLs que estén sellados'
                })
            };
        }

        // Validar estado del sello
        const validacionSello = validarEstadoSello(xmlData.xml_content);
        if (!validacionSello.exito) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error validando estado del sello',
                    mensaje: validacionSello.error
                })
            };
        }

        if (!validacionSello.estado.tieneSello) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'El XML no tiene sello para cancelar',
                    estadoSello: validacionSello.estado
                })
            };
        }

        console.log('🔍 CANCELAR XML: Sello validado, procediendo a quitar...');

        // Quitar sello del XML
        const resultadoQuitar = quitarSelloXML(xmlData.xml_content);

        if (!resultadoQuitar.exito) {
            console.error('❌ CANCELAR XML: Error quitando sello:', resultadoQuitar.error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error quitando sello del XML',
                    mensaje: resultadoQuitar.error
                })
            };
        }

        console.log('✅ CANCELAR XML: Sello quitado exitosamente');
        console.log('📊 CANCELAR XML: Atributos removidos:', resultadoQuitar.atributosQuitados.length);

        // Preparar datos para actualización
        const fechaCancelacion = new Date().toISOString();
        const datosActualizacion = {
            xml_content: resultadoQuitar.xmlOriginal,
            estado: 'cancelado',
            fecha_cancelacion: fechaCancelacion,
            motivo_cancelacion: motivo || 'Cancelación solicitada por usuario',
            usuario_cancelacion: usuario.email,
            sello_removido: resultadoQuitar.atributosQuitados.find(attr => attr.nombre === 'Sello')?.valor || null,
            certificado_removido: resultadoQuitar.atributosQuitados.find(attr => attr.nombre === 'Certificado')?.valor || null,
            no_certificado_removido: resultadoQuitar.atributosQuitados.find(attr => attr.nombre === 'NoCertificado')?.valor || null
        };

        // Actualizar en base de datos
        console.log('💾 CANCELAR XML: Actualizando en base de datos...');
        const { data: xmlActualizado, error: updateError } = await supabase
            .from('xmls_generados')
            .update(datosActualizacion)
            .eq('id', xmlId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ CANCELAR XML: Error actualizando base de datos:', updateError.message);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error actualizando XML en base de datos',
                    mensaje: updateError.message
                })
            };
        }

        console.log('✅ CANCELAR XML: XML actualizado en base de datos');

        // Preparar respuesta exitosa
        const respuesta = {
            success: true,
            mensaje: 'XML cancelado y restaurado exitosamente',
            xml: {
                id: xmlActualizado.id,
                estado_anterior: 'sellado',
                estado_actual: xmlActualizado.estado,
                fecha_cancelacion: xmlActualizado.fecha_cancelacion,
                motivo: xmlActualizado.motivo_cancelacion,
                usuario_cancelacion: xmlActualizado.usuario_cancelacion
            },
            restauracion: {
                atributos_removidos: resultadoQuitar.atributosQuitados.length,
                detalles_atributos: resultadoQuitar.atributosQuitados.map(attr => ({
                    nombre: attr.nombre,
                    longitud: attr.longitud
                })),
                estadisticas: resultadoQuitar.estadisticas
            },
            timestamp: fechaCancelacion
        };

        console.log('🎉 CANCELAR XML: Proceso completado exitosamente');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(respuesta)
        };

    } catch (error) {
        console.error('💥 CANCELAR XML: Error fatal:', error.message);
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
