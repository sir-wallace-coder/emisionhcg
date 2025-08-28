-- 🔍 DIAGNÓSTICO TÉCNICO PROFESIONAL: Investigar datos corruptos en BD
-- Análisis de certificados del emisor BASA GREEN (BGR190902815)

-- 1. Verificar datos del emisor específico
SELECT 
    id,
    nombre,
    rfc,
    LENGTH(certificado_cer) as cer_length,
    LENGTH(certificado_key) as key_length,
    LENGTH(password_key) as password_length,
    LEFT(certificado_cer, 100) as cer_preview,
    LEFT(certificado_key, 100) as key_preview,
    LEFT(password_key, 20) as password_preview,
    numero_certificado,
    estado_csd,
    created_at,
    updated_at
FROM emisores 
WHERE rfc = 'BGR190902815'
ORDER BY created_at DESC;

-- 2. Verificar si hay múltiples registros del mismo emisor
SELECT 
    COUNT(*) as total_registros,
    rfc,
    nombre
FROM emisores 
WHERE rfc = 'BGR190902815'
GROUP BY rfc, nombre;

-- 3. Análisis detallado de todos los certificados en la BD
SELECT 
    id,
    rfc,
    nombre,
    LENGTH(certificado_cer) as cer_length,
    LENGTH(certificado_key) as key_length,
    CASE 
        WHEN LENGTH(certificado_cer) < 100 THEN 'CORRUPTO'
        WHEN LENGTH(certificado_key) < 100 THEN 'CORRUPTO'
        ELSE 'OK'
    END as estado_certificados,
    LEFT(certificado_cer, 50) as cer_inicio,
    LEFT(certificado_key, 50) as key_inicio
FROM emisores 
WHERE certificado_cer IS NOT NULL 
   OR certificado_key IS NOT NULL
ORDER BY 
    CASE 
        WHEN LENGTH(certificado_cer) < 100 THEN 1
        WHEN LENGTH(certificado_key) < 100 THEN 1
        ELSE 2
    END,
    created_at DESC;

-- 4. Verificar encoding y caracteres especiales
SELECT 
    id,
    rfc,
    certificado_cer LIKE 'data:%' as cer_es_data_uri,
    certificado_key LIKE 'data:%' as key_es_data_uri,
    certificado_cer LIKE '%-----BEGIN%' as cer_es_pem,
    certificado_key LIKE '%-----BEGIN%' as key_es_pem,
    LENGTH(certificado_cer) as cer_length,
    LENGTH(certificado_key) as key_length
FROM emisores 
WHERE rfc = 'BGR190902815';
