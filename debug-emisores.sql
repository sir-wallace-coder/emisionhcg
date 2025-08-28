-- 🔍 CONSULTA DIRECTA PARA DEBUGGEAR EMISORES
-- Verificar estructura y datos de la tabla emisores

-- 1. Ver todos los emisores con sus IDs y datos básicos
SELECT 
    id,
    rfc,
    nombre,
    CASE 
        WHEN certificado_cer IS NULL THEN 'NULL'
        WHEN certificado_cer = '' THEN 'VACÍO'
        WHEN LENGTH(certificado_cer) > 0 THEN 'PRESENTE (' || LENGTH(certificado_cer) || ' chars)'
        ELSE 'DESCONOCIDO'
    END as estado_certificado_cer,
    CASE 
        WHEN certificado_key IS NULL THEN 'NULL'
        WHEN certificado_key = '' THEN 'VACÍO'
        WHEN LENGTH(certificado_key) > 0 THEN 'PRESENTE (' || LENGTH(certificado_key) || ' chars)'
        ELSE 'DESCONOCIDO'
    END as estado_certificado_key,
    CASE 
        WHEN password_key IS NULL THEN 'NULL'
        WHEN password_key = '' THEN 'VACÍO'
        WHEN LENGTH(password_key) > 0 THEN 'PRESENTE'
        ELSE 'DESCONOCIDO'
    END as estado_password_key,
    created_at,
    updated_at
FROM emisores 
ORDER BY created_at DESC;

-- 2. Verificar específicamente si hay IDs NULL o problemáticos
SELECT 
    COUNT(*) as total_emisores,
    COUNT(id) as emisores_con_id,
    COUNT(*) - COUNT(id) as emisores_sin_id
FROM emisores;

-- 3. Ver emisores con problemas específicos de ID
SELECT 
    id,
    rfc,
    nombre,
    CASE 
        WHEN id IS NULL THEN 'ID ES NULL'
        WHEN id::text = '' THEN 'ID ES STRING VACÍO'
        ELSE 'ID VÁLIDO: ' || id::text
    END as estado_id
FROM emisores 
WHERE id IS NULL OR id::text = '';

-- 4. Consulta específica para un RFC (cambiar 'RFC_AQUI' por el RFC real)
-- SELECT * FROM emisores WHERE rfc = 'RFC_AQUI';
