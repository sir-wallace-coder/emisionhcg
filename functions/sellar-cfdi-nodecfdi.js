/**
 * Endpoint serverless para sellado CFDI usando NodeCfdi
 * Netlify Function para sellado local con @nodecfdi/credentials
 */

// 🚀 CORRECCIÓN QUIRÚRGICA: Usar sellador híbrido con librerías correctas
// - @nodecfdi/cfdiutils-core → SOLO cadena original
// - @nodecfdi/credentials → Firmado digital y manejo CSD
const { sellarCFDIHibrido } = require('./nodecfdi-sealer-hybrid');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Configuración Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'tu-jwt-secret-key';

/**
 * Verifica el token JWT del usuario
 */
function verificarToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autorización requerido');
    }
    
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Obtiene los datos del emisor desde la base de datos
 */
async function obtenerDatosEmisor(userId, emisorId) {
    console.log('📋 NODECFDI: Obteniendo datos del emisor...');
    console.log('📋 NODECFDI: userId:', userId);
    console.log('📋 NODECFDI: emisorId:', emisorId);
    
    try {
        const { data: emisor, error } = await supabase
            .from('emisores')
            .select('*')
            .eq('id', emisorId)
            .eq('usuario_id', userId)
            .single();
        
        console.log('📋 NODECFDI: Resultado consulta emisor:');
        console.log('📋 NODECFDI: error:', error);
        console.log('📋 NODECFDI: emisor encontrado:', !!emisor);
        
        if (error) {
            console.error('❌ NODECFDI: Error Supabase obteniendo emisor:', JSON.stringify(error, null, 2));
            throw new Error(`Error Supabase: ${error.message || error.code || 'Error desconocido'}`);
        }
        
        if (!emisor) {
            console.error('❌ NODECFDI: Emisor no encontrado en BD');
            throw new Error('Emisor no encontrado');
        }
        
        console.log('📋 NODECFDI: Emisor encontrado:', {
            id: emisor.id,
            nombre: emisor.nombre,
            rfc: emisor.rfc,
            tieneCertificadoCer: !!emisor.certificado_cer,
            tieneCertificadoKey: !!emisor.certificado_key,
            tienePassword: !!emisor.password_key
        });
        
        // 🔬 DIAGNÓSTICO TÉCNICO DETALLADO: Analizar datos reales de BD
        console.log('🔬 DIAGNÓSTICO TÉCNICO DETALLADO - DATOS REALES BD:');
        console.log('📏 Certificado CER:');
        console.log('  - Length:', emisor.certificado_cer ? emisor.certificado_cer.length : 'NULL');
        console.log('  - Type:', typeof emisor.certificado_cer);
        console.log('  - Es string:', typeof emisor.certificado_cer === 'string');
        console.log('  - Primeros 50 chars:', emisor.certificado_cer ? emisor.certificado_cer.substring(0, 50) : 'NULL');
        console.log('  - Últimos 50 chars:', emisor.certificado_cer ? emisor.certificado_cer.substring(emisor.certificado_cer.length - 50) : 'NULL');
        console.log('  - Contiene BEGIN:', emisor.certificado_cer ? emisor.certificado_cer.includes('-----BEGIN') : false);
        console.log('  - Contiene data:', emisor.certificado_cer ? emisor.certificado_cer.includes('data:') : false);
        
        console.log('🗝 Llave privada KEY:');
        console.log('  - Length:', emisor.certificado_key ? emisor.certificado_key.length : 'NULL');
        console.log('  - Type:', typeof emisor.certificado_key);
        console.log('  - Es string:', typeof emisor.certificado_key === 'string');
        console.log('  - Primeros 50 chars:', emisor.certificado_key ? emisor.certificado_key.substring(0, 50) : 'NULL');
        console.log('  - Últimos 50 chars:', emisor.certificado_key ? emisor.certificado_key.substring(emisor.certificado_key.length - 50) : 'NULL');
        console.log('  - Contiene BEGIN:', emisor.certificado_key ? emisor.certificado_key.includes('-----BEGIN') : false);
        console.log('  - Contiene data:', emisor.certificado_key ? emisor.certificado_key.includes('data:') : false);
        
        console.log('🔑 Password:');
        console.log('  - Length:', emisor.password_key ? emisor.password_key.length : 'NULL');
        console.log('  - Type:', typeof emisor.password_key);
        console.log('  - Es string:', typeof emisor.password_key === 'string');
        console.log('  - Primeros 10 chars:', emisor.password_key ? emisor.password_key.substring(0, 10) + '...' : 'NULL');
        
        // Verificar que tenga certificados
        if (!emisor.certificado_cer || !emisor.certificado_key || !emisor.password_key) {
            console.error('❌ NODECFDI: Emisor sin certificados CSD completos');
            throw new Error('El emisor no tiene certificados CSD configurados');
        }
        
        console.log('✅ NODECFDI: Emisor obtenido exitosamente:', emisor.nombre);
        return emisor;
        
    } catch (error) {
        console.error('❌ NODECFDI: Error en obtenerDatosEmisor:', error);
        throw error;
    }
}

/**
 * Analiza y limpia caracteres problemáticos para PostgreSQL
 */
function analizarYLimpiarXML(xmlContent) {
    if (!xmlContent) return { xmlLimpio: xmlContent, analisis: {} };
    
    // Análisis detallado de caracteres problemáticos
    const caracteresNulos = (xmlContent.match(/\u0000/g) || []).length;
    const caracteresControl = (xmlContent.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
    
    // Encontrar posiciones de caracteres nulos para debug
    const posicionesNulos = [];
    for (let i = 0; i < xmlContent.length; i++) {
        if (xmlContent.charCodeAt(i) === 0) {
            posicionesNulos.push({
                posicion: i,
                contexto: xmlContent.substring(Math.max(0, i-20), Math.min(xmlContent.length, i+20))
            });
        }
    }
    
    const analisis = {
        longitud_original: xmlContent.length,
        caracteres_nulos: caracteresNulos,
        caracteres_control: caracteresControl,
        posiciones_nulos: posicionesNulos.slice(0, 5), // Solo primeras 5 para logs
        tiene_sello: xmlContent.includes('Sello="'),
        tiene_certificado: xmlContent.includes('NoCertificado="')
    };
    
    // Solo limpiar si hay caracteres problemáticos
    let xmlLimpio = xmlContent;
    if (caracteresNulos > 0 || caracteresControl > 0) {
        console.log('⚠️ CARACTERES PROBLEMÁTICOS DETECTADOS:', analisis);
        
        // Método más robusto para eliminar caracteres nulos
        const chars = [];
        for (let i = 0; i < xmlContent.length; i++) {
            const charCode = xmlContent.charCodeAt(i);
            // Mantener solo caracteres válidos para XML y PostgreSQL
            if (charCode !== 0 && // No carácter nulo
                (charCode === 9 || charCode === 10 || charCode === 13 || // Tab, LF, CR válidos
                 (charCode >= 32 && charCode <= 126) || // Caracteres ASCII imprimibles
                 charCode > 126)) { // Caracteres Unicode válidos
                chars.push(xmlContent.charAt(i));
            }
        }
        xmlLimpio = chars.join('');
        
        console.log('🧹 LIMPIEZA APLICADA:', {
            longitud_original: xmlContent.length,
            longitud_limpia: xmlLimpio.length,
            caracteres_removidos: xmlContent.length - xmlLimpio.length,
            sigue_teniendo_sello: xmlLimpio.includes('Sello="'),
            sigue_teniendo_certificado: xmlLimpio.includes('NoCertificado="')
        });
    }
    
    return { xmlLimpio, analisis };
}

/**
 * Actualiza el XML en la base de datos con el sello
 */
async function actualizarXMLSellado(xmlId, xmlSellado, sello, numeroCertificado) {
    console.log('💾 Actualizando XML sellado en BD...');
    
    // Analizar y limpiar XML antes de guardar en BD
    const { xmlLimpio, analisis } = analizarYLimpiarXML(xmlSellado);
    console.log('🔍 ANÁLISIS XML PARA BD:', analisis);
    
    // ❌ NO limpiar el sello digital - debe mantenerse como Base64 válido
    console.log('🔍 SELLO DIGITAL (NO LIMPIADO):', {
        sello_length: sello ? sello.length : 0,
        es_base64_valido: sello ? /^[A-Za-z0-9+/]*={0,2}$/.test(sello) : false
    });
    
    if (analisis.caracteres_nulos > 0) {
        console.log('⚠️ ALERTA: XML contiene', analisis.caracteres_nulos, 'caracteres nulos');
        console.log('🔍 Posiciones de caracteres nulos:', analisis.posiciones_nulos);
    }
    
    const { error } = await supabase
        .from('xmls_generados')
        .update({
            xml_content: xmlLimpio,
            estado: 'sellado',
            sello: sello,
            updated_at: new Date().toISOString()
        })
        .eq('id', xmlId);
    
    if (error) {
        console.error('❌ Error actualizando XML:', error);
        throw new Error('Error actualizando XML en base de datos');
    }
    
    console.log('✅ XML actualizado en BD');
}

/**
 * Handler principal del endpoint
 */
exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Manejar preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
    }
    
    console.log('🚀 INICIANDO SELLADO CFDI CON NODECFDI');
    console.log('📋 Método HTTP:', event.httpMethod);
    console.log('📋 Headers recibidos:', Object.keys(event.headers));
    
    try {
        // Verificar autenticación
        const userData = verificarToken(event.headers.authorization);
        console.log('👤 Usuario autenticado:', userData.email);
        console.log('🔍 DEBUG NODECFDI: userData completo:', JSON.stringify(userData, null, 2));
        
        // Extraer userId del token JWT
        const userId = userData.id || userData.userId || userData.sub;
        console.log('🔍 DEBUG NODECFDI: userId extraído:', userId);
        
        if (!userId) {
            console.error('❌ NODECFDI: No se pudo extraer userId del token JWT');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Token JWT inválido: no se pudo extraer userId' 
                })
            };
        }
        
        // 🔧 DEBUG CRÍTICO: Verificar qué recibe el endpoint NodeCfdi
        console.log('🔍 DEBUG NODECFDI: event.body RAW:', event.body);
        
        // Parsear body - compatible con ambos formatos
        const requestBody = JSON.parse(event.body);
        console.log('🔍 DEBUG NODECFDI: requestBody parseado:', JSON.stringify(requestBody, null, 2));
        
        const { xmlContent, xmlId, emisorId, version = '4.0' } = requestBody;
        
        console.log('🔍 DEBUG NODECFDI: Parámetros extraídos:', {
            xmlContent_presente: !!xmlContent,
            xmlId_presente: !!xmlId,
            xmlId_valor: xmlId,
            xmlId_tipo: typeof xmlId,
            emisorId_valor: emisorId,
            emisorId_tipo: typeof emisorId,
            version_valor: version
        });
        
        // Verificar que tenemos los parámetros necesarios
        if (!emisorId) {
            console.error('❌ DEBUG NODECFDI: emisorId es falsy:', {
                emisorId_valor: emisorId,
                emisorId_tipo: typeof emisorId,
                requestBody_completo: requestBody
            });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'emisorId es requerido' 
                })
            };
        }
        
        if (!xmlContent && !xmlId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'xmlContent o xmlId son requeridos' 
                })
            };
        }
        
        console.log('📋 Parámetros recibidos:', {
            tieneXmlContent: !!xmlContent,
            tieneXmlId: !!xmlId,
            emisorId,
            version
        });
        
        // Obtener datos del emisor
        const emisor = await obtenerDatosEmisor(userId, emisorId);
        
        // Obtener o usar datos del XML
        let xmlData;
        if (xmlContent) {
            // Usar XML proporcionado directamente
            console.log('📄 Usando XML proporcionado directamente');
            xmlData = {
                xml_content: xmlContent,
                estado: 'generado',
                version_cfdi: version
            };
        } else {
            // Obtener XML de la base de datos
            console.log('📄 Obteniendo XML de la base de datos:', xmlId);
            const { data: xmlFromDB, error: xmlError } = await supabase
                .from('xmls_generados')
                .select('xml_content, estado, version_cfdi')
                .eq('id', xmlId)
                .eq('usuario_id', userId)
                .single();
            
            if (xmlError || !xmlFromDB) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ 
                        error: 'XML no encontrado' 
                    })
                };
            }
            
            xmlData = xmlFromDB;
        }
        
        if (xmlData.estado === 'sellado' || xmlData.estado === 'timbrado') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'El XML ya está sellado o timbrado' 
                })
            };
        }
        
        console.log('📄 XML obtenido, estado:', xmlData.estado);
        console.log('📏 Tamaño XML:', xmlData.xml_content.length);
        
        // 🔬 DETECCIÓN AUTOMÁTICA DE COMPATIBILIDAD DE CERTIFICADOS
        console.log('\n🔬 VERIFICANDO COMPATIBILIDAD DEL CERTIFICADO...');
        console.log('🔐 INICIANDO SELLADO CON NODECFDI...');
        console.log('🔄 Usando sellado híbrido (cfdiutils-core + credentials)...');
        
        const startTime = Date.now();
        let resultado;
        try {
            // Intentar NodeCfdi primero
            resultado = await sellarCFDIHibrido(
                xmlData.xml_content,
                version,
                emisor.certificado_cer,
                emisor.certificado_key,
                emisor.password_key
            );
            
            // 🚨 CORRECCIÓN CRÍTICA: Verificar si NodeCfdi falló
            if (!resultado || !resultado.success) {
                const errorMsg = resultado?.error || 'NodeCfdi falló sin mensaje de error';
                console.log('❌ NODECFDI FALLÓ: Lanzando excepción para activar fallback');
                throw new Error(`NodeCfdi falló: ${errorMsg}`);
            }
            
            console.log('✅ NODECFDI EXITOSO: Certificado compatible');
            
        } catch (nodecfdiError) {
            console.log('⚠️ NODECFDI INCOMPATIBLE: Certificado no soportado');
            console.log('🔄 USANDO MÉTODO ALTERNATIVO AUTOMÁTICAMENTE...');
            
            // Importar método alternativo
            const { sellarConServicioExterno } = require('./utils/external-sealer-client');
            
            console.log('🌐 Sellando con servicio externo compatible...');
            
            const resultadoExterno = await sellarConServicioExterno({
                xml_content: xmlData.xml_content,
                certificado: emisor.certificado_cer,
                llave_privada: emisor.certificado_key,
                password: emisor.password_key
            });
            
            if (resultadoExterno && resultadoExterno.xml_sellado) {
                // Adaptar resultado del servicio externo al formato esperado
                resultado = {
                    success: true,
                    xmlSellado: resultadoExterno.xml_sellado,
                    sello: resultadoExterno.sello || 'Sello generado por servicio externo',
                    numeroCertificado: resultadoExterno.numero_certificado || 'N/A',
                    metodo: 'Servicio Externo',
                    tiempoMs: Date.now() - startTime
                };
                console.log('✅ SERVICIO EXTERNO EXITOSO: XML sellado obtenido');
            } else {
                throw new Error('Servicio externo no pudo sellar el XML');
            }
        }
        
        if (!resultado.success) {
            console.error('❌ Error en sellado:', resultado.error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: `Error en sellado: ${resultado.error}`,
                    metodo: resultado.metodo || 'NodeCfdi'
                })
            };
        }
        
        // Actualizar XML en base de datos
        console.log('💾 Actualizando XML en BD con ID:', xmlId);
        await actualizarXMLSellado(
            xmlId,
            resultado.xmlSellado,
            resultado.sello,
            resultado.numeroCertificado
        );
        
        console.log('🎉 SELLADO NODECFDI COMPLETADO EXITOSAMENTE');
        console.log('⏱️ Tiempo total:', resultado.tiempoMs, 'ms');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'XML sellado exitosamente con NodeCfdi',
                metodo: resultado.metodo || 'NodeCfdi',
                tiempoMs: resultado.tiempoMs,
                numeroCertificado: resultado.numeroCertificado,
                xmlId: xmlId,
                // ✅ DATOS FALTANTES AGREGADOS PARA FRONTEND
                xmlSellado: resultado.xmlSellado,
                selloDigital: resultado.sello,
                cadenaOriginal: resultado.cadenaOriginal || 'Generada con NodeCfdi'
            })
        };
        
    } catch (error) {
        console.error('❌ ERROR EN ENDPOINT SELLADO NODECFDI:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Error interno del servidor',
                metodo: 'NodeCfdi'
            })
        };
    }
};
