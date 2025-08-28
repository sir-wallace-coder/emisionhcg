-- Agregar campos "dirección" y "estado" a la tabla emisores
-- Ejecutar en Supabase SQL Editor

-- Agregar campo dirección (string para calle, número, colonia)
ALTER TABLE emisores 
ADD COLUMN IF NOT EXISTS direccion TEXT;

-- Agregar campo estado (catálogo de estados de la República Mexicana)
ALTER TABLE emisores 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50);

-- Comentarios para documentación
COMMENT ON COLUMN emisores.direccion IS 'Dirección completa del emisor: calle, número, colonia';
COMMENT ON COLUMN emisores.estado IS 'Estado de la República Mexicana donde se ubica el emisor';

-- Crear índice para mejorar consultas por estado
CREATE INDEX IF NOT EXISTS idx_emisores_estado ON emisores(estado);

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'emisores' 
AND column_name IN ('direccion', 'estado')
ORDER BY column_name;
