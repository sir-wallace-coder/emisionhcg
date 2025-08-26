-- Agregar campo color a la tabla emisores
-- Este campo almacenará el color corporativo del emisor en formato hexadecimal
-- Se extraerá automáticamente del logo o se podrá editar manualmente

ALTER TABLE emisores 
ADD COLUMN color VARCHAR(7) DEFAULT '#2563eb' CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- Comentario en la columna para documentar su propósito
COMMENT ON COLUMN emisores.color IS 'Color corporativo del emisor en formato hexadecimal (#RRGGBB). Se extrae automáticamente del logo o se puede editar manualmente. Se usa para personalizar PDFs.';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'emisores' AND column_name = 'color';
