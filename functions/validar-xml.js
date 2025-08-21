/**
 * ===== ENDPOINT VALIDAR XML CFDI =====
 * Validación independiente de XMLs CFDI usando NodeCFDI oficial
 * Versión limpia y robusta
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('🔍 VALIDAR-XML: Iniciando validación...');
    
    // Verificar autenticación
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ VALIDAR-XML: Token no proporcionado');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token no proporcionado' })
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ VALIDAR-XML: Token válido para usuario:', decoded.userId);

    const body = JSON.parse(event.body || '{}');
    const { xmlContent, fileName } = body;

    if (!xmlContent) {
      console.log('❌ VALIDAR-XML: Contenido XML faltante');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Contenido XML requerido' })
      };
    }

    console.log(`🔍 VALIDAR-XML: Validando archivo: ${fileName || 'sin_nombre.xml'}`);

    // Validar XML con NodeCFDI usando el validador robusto
    const { validateXMLWithNodeCFDI } = require('./utils/nodecfdi-validator');
    const validationResult = await validateXMLWithNodeCFDI(xmlContent);
    
    // Agregar información adicional
    validationResult.fileName = fileName || 'sin_nombre.xml';
    validationResult.validatedAt = new Date().toISOString();
    validationResult.validatedBy = 'NodeCFDI oficial';
    
    console.log(`✅ VALIDAR-XML: Validación completada. Válido: ${validationResult.isValid}, Errores: ${validationResult.errors?.length || 0}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validationResult)
    };

  } catch (error) {
    console.error('❌ VALIDAR-XML: Error en validación:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor durante validación',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
