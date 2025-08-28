-- 🔍 DIAGNÓSTICO COMPLETO: XMLs y Sellado NodeCfdi
-- Análisis profesional para identificar problemas con xmlId undefined

-- 1. ESTRUCTURA DE LA TABLA xmls_generados
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'xmls_generados' 
ORDER BY ordinal_position;

-- 2. ÚLTIMOS XMLs GENERADOS (últimos 10)
SELECT 
    id,
    usuario_id,
    emisor_rfc,
    receptor_rfc,
    total,
    estado,
    version_cfdi,
    created_at,
    updated_at,
    sello,
    uuid,
    CASE 
        WHEN xml_content IS NOT NULL THEN 'SÍ'
        ELSE 'NO'
    END as tiene_xml_content,
    LENGTH(xml_content) as xml_content_length
FROM xmls_generados 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. ANÁLISIS DE ESTADOS DE XMLs
SELECT 
    estado,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN sello IS NOT NULL THEN 1 END) as con_sello,
    COUNT(CASE WHEN uuid IS NOT NULL THEN 1 END) as con_uuid,
    COUNT(CASE WHEN fecha_timbrado IS NOT NULL THEN 1 END) as con_fecha_timbrado
FROM xmls_generados 
GROUP BY estado
ORDER BY cantidad DESC;

-- 4. XMLs SELLADOS RECIENTEMENTE (últimas 24 horas)
SELECT 
    id,
    emisor_rfc,
    estado,
    updated_at,
    CASE 
        WHEN sello IS NOT NULL THEN SUBSTRING(sello, 1, 50) || '...'
        ELSE 'NULL'
    END as sello_preview,
    uuid
FROM xmls_generados 
WHERE updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- 5. VERIFICAR INTEGRIDAD DE IDs (UUIDs)
SELECT 
    id,
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID VÁLIDO'
        ELSE 'UUID INVÁLIDO'
    END as validez_uuid,
    LENGTH(id::text) as longitud_id
FROM xmls_generados 
WHERE id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 20;

-- 6. ANÁLISIS DE ERRORES POTENCIALES
SELECT 
    'XMLs sin ID' as problema,
    COUNT(*) as cantidad
FROM xmls_generados 
WHERE id IS NULL

UNION ALL

SELECT 
    'XMLs con estado NULL' as problema,
    COUNT(*) as cantidad
FROM xmls_generados 
WHERE estado IS NULL

UNION ALL

SELECT 
    'XMLs sellados sin sello' as problema,
    COUNT(*) as cantidad
FROM xmls_generados 
WHERE estado = 'sellado' AND sello IS NULL

UNION ALL

SELECT 
    'XMLs con fecha_timbrado pero sin uuid' as problema,
    COUNT(*) as cantidad
FROM xmls_generados 
WHERE fecha_timbrado IS NOT NULL AND uuid IS NULL;

-- 7. ÚLTIMOS INTENTOS DE SELLADO (para debug)
SELECT 
    id,
    emisor_rfc,
    estado,
    created_at,
    updated_at,
    CASE 
        WHEN xml_content LIKE '%Sello=%' THEN 'XML CON SELLO'
        ELSE 'XML SIN SELLO'
    END as contenido_sellado,
    LENGTH(sello) as longitud_sello
FROM xmls_generados 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
