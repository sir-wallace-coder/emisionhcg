-- Migración: Expandir columna numero_certificado para soportar números de serie SAT reales
-- Problema: VARCHAR(20) es insuficiente para números de certificado SAT (40+ caracteres)
-- Solución: Expandir a VARCHAR(100) para soportar cualquier tamaño de serial SAT

-- Expandir columna numero_certificado de VARCHAR(20) a VARCHAR(100)
ALTER TABLE emisores 
ALTER COLUMN numero_certificado TYPE VARCHAR(100);

-- Verificar el cambio
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'emisores' 
AND column_name = 'numero_certificado';

-- Comentarios:
-- - Los números de serie de certificados SAT pueden ser de 40+ caracteres hexadecimales
-- - VARCHAR(100) proporciona espacio suficiente para cualquier formato SAT actual o futuro
-- - Esta migración es compatible con datos existentes (expansión, no reducción)
-- - Resuelve el error: "value too long for type character varying(20)"
