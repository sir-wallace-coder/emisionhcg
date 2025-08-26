-- ✨ AGREGAR COLUMNA LOGO A TABLA EMISORES
-- =============================================
-- Ejecutar este comando en Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Pegar y ejecutar
-- =============================================

-- Agregar columna logo si no existe
ALTER TABLE emisores 
ADD COLUMN IF NOT EXISTS logo TEXT;

-- Agregar comentario para documentación
COMMENT ON COLUMN emisores.logo IS 'Logo del emisor almacenado en formato base64';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'emisores' 
AND column_name = 'logo';

-- ✅ RESULTADO ESPERADO:
-- column_name | data_type | is_nullable
-- logo        | text      | YES
