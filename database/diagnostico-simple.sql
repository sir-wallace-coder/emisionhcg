-- 🔍 DIAGNÓSTICO SIMPLE: Estructura y datos XMLs

-- 1. ESTRUCTURA DE LA TABLA xmls_generados
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'xmls_generados' 
ORDER BY ordinal_position;

-- 2. ÚLTIMOS 5 XMLs GENERADOS
SELECT 
    id,
    emisor_rfc,
    estado,
    created_at,
    updated_at,
    CASE 
        WHEN sello IS NOT NULL THEN 'SÍ'
        ELSE 'NO'
    END as tiene_sello,
    LENGTH(xml_content) as xml_length
FROM xmls_generados 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. ANÁLISIS DE ESTADOS
SELECT 
    estado,
    COUNT(*) as cantidad
FROM xmls_generados 
GROUP BY estado
ORDER BY cantidad DESC;
