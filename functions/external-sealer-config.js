/**
 * 🔧 Endpoint de Configuración del Servicio Externo de Sellado
 * 
 * Permite configurar y probar el servicio externo de sellado CFDI
 * 
 * @author CFDI Sistema Completo
 * @version 1.0.0
 */

const { 
    validarConfiguracionServicioExterno, 
    probarConectividadServicioExterno,
    EXTERNAL_SEALER_CONFIG 
} = require('./utils/external-sealer-client');
const { configurarMetodoSellado } = require('./utils/nodecfdi-sealer');

/**
 * Handler principal para configuración del servicio externo
 */
exports.handler = async (event, context) => {
    console.log('🔧 EXTERNAL CONFIG: Request recibido:', event.httpMethod);
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

    try {
        switch (event.httpMethod) {
            case 'GET':
                return await obtenerConfiguracion(headers);
            
            case 'POST':
                return await configurarServicio(event, headers);
            
            case 'PUT':
                return await probarServicio(headers);
            
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Método no permitido',
                        metodos_soportados: ['GET', 'POST', 'PUT', 'OPTIONS']
                    })
                };
        }
    } catch (error) {
        console.error('❌ EXTERNAL CONFIG: Error en handler:', error.message);
        
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

/**
 * GET - Obtener configuración actual del servicio externo
 */
async function obtenerConfiguracion(headers) {
    console.log('📋 EXTERNAL CONFIG: Obteniendo configuración actual');
    
    try {
        const configuracion = validarConfiguracionServicioExterno();
        const metodoActual = process.env.USE_EXTERNAL_SEALER === 'true' ? 'externo' : 'local';
        
        const respuesta = {
            success: true,
            metodo_sellado_actual: metodoActual,
            configuracion_servicio_externo: {
                ...configuracion,
                url: EXTERNAL_SEALER_CONFIG.url || 'No configurada',
                timeout: EXTERNAL_SEALER_CONFIG.timeout,
                retries: EXTERNAL_SEALER_CONFIG.retries
            },
            variables_entorno: {
                EXTERNAL_SEALER_URL: !!process.env.EXTERNAL_SEALER_URL,
                EXTERNAL_SEALER_API_KEY: !!process.env.EXTERNAL_SEALER_API_KEY,
                EXTERNAL_SEALER_TIMEOUT: !!process.env.EXTERNAL_SEALER_TIMEOUT,
                EXTERNAL_SEALER_RETRIES: !!process.env.EXTERNAL_SEALER_RETRIES,
                USE_EXTERNAL_SEALER: process.env.USE_EXTERNAL_SEALER || 'false'
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ EXTERNAL CONFIG: Configuración obtenida exitosamente');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(respuesta)
        };
        
    } catch (error) {
        console.error('❌ EXTERNAL CONFIG: Error obteniendo configuración:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error obteniendo configuración',
                mensaje: error.message
            })
        };
    }
}

/**
 * POST - Configurar método de sellado (local/externo)
 */
async function configurarServicio(event, headers) {
    console.log('⚙️ EXTERNAL CONFIG: Configurando servicio de sellado');
    
    try {
        const body = JSON.parse(event.body || '{}');
        const { metodo, configuracion } = body;
        
        console.log('📋 EXTERNAL CONFIG: Método solicitado:', metodo);
        
        if (!metodo || !['local', 'externo'].includes(metodo)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Método inválido',
                    mensaje: 'El método debe ser "local" o "externo"',
                    metodos_validos: ['local', 'externo']
                })
            };
        }
        
        // Configurar método de sellado
        const metodoConfigurado = configurarMetodoSellado(metodo === 'externo');
        
        // Si se proporcionó configuración adicional, validarla
        let validacionConfiguracion = null;
        if (configuracion && metodo === 'externo') {
            console.log('🔍 EXTERNAL CONFIG: Validando configuración del servicio externo');
            validacionConfiguracion = validarConfiguracionServicioExterno();
        }
        
        const respuesta = {
            success: true,
            metodo_anterior: metodo === 'externo' ? 'local' : 'externo',
            metodo_actual: metodoConfigurado,
            mensaje: `Sellado configurado para usar método: ${metodoConfigurado}`,
            configuracion_validada: validacionConfiguracion,
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ EXTERNAL CONFIG: Método de sellado configurado exitosamente');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(respuesta)
        };
        
    } catch (error) {
        console.error('❌ EXTERNAL CONFIG: Error configurando servicio:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error configurando servicio',
                mensaje: error.message
            })
        };
    }
}

/**
 * PUT - Probar conectividad con el servicio externo
 */
async function probarServicio(headers) {
    console.log('🔍 EXTERNAL CONFIG: Probando conectividad con servicio externo');
    
    try {
        const resultadoPrueba = await probarConectividadServicioExterno();
        
        const respuesta = {
            success: resultadoPrueba.success,
            conectividad: resultadoPrueba,
            configuracion_actual: validarConfiguracionServicioExterno(),
            recomendaciones: [],
            timestamp: new Date().toISOString()
        };
        
        // Agregar recomendaciones basadas en el resultado
        if (!resultadoPrueba.success) {
            respuesta.recomendaciones.push('Verificar que la URL del servicio externo esté configurada correctamente');
            respuesta.recomendaciones.push('Comprobar que el servicio externo esté disponible y funcionando');
            respuesta.recomendaciones.push('Revisar las variables de entorno EXTERNAL_SEALER_*');
        } else {
            respuesta.recomendaciones.push('El servicio externo está disponible y listo para usar');
            respuesta.recomendaciones.push('Puedes cambiar al método externo con seguridad');
        }
        
        console.log('✅ EXTERNAL CONFIG: Prueba de conectividad completada');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(respuesta)
        };
        
    } catch (error) {
        console.error('❌ EXTERNAL CONFIG: Error probando servicio:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error probando servicio externo',
                mensaje: error.message,
                recomendaciones: [
                    'Verificar configuración de variables de entorno',
                    'Comprobar conectividad de red',
                    'Revisar logs del servicio externo'
                ]
            })
        };
    }
}
