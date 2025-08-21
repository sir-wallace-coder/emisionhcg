-- 🔄 Agregar columnas para funcionalidad de cancelación de XMLs
-- Permite almacenar información sobre XMLs cancelados y restaurados

-- Agregar columnas para cancelación
ALTER TABLE xmls_generados 
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
ADD COLUMN IF NOT EXISTS usuario_cancelacion VARCHAR(255),
ADD COLUMN IF NOT EXISTS sello_removido TEXT,
ADD COLUMN IF NOT EXISTS certificado_removido TEXT,
ADD COLUMN IF NOT EXISTS no_certificado_removido VARCHAR(20);

-- Agregar comentarios para documentar las nuevas columnas
COMMENT ON COLUMN xmls_generados.fecha_cancelacion IS 'Fecha y hora cuando se canceló el XML (se quitó el sello)';
COMMENT ON COLUMN xmls_generados.motivo_cancelacion IS 'Motivo por el cual se canceló el XML';
COMMENT ON COLUMN xmls_generados.usuario_cancelacion IS 'Email del usuario que canceló el XML';
COMMENT ON COLUMN xmls_generados.sello_removido IS 'Sello digital que fue removido del XML';
COMMENT ON COLUMN xmls_generados.certificado_removido IS 'Certificado que fue removido del XML';
COMMENT ON COLUMN xmls_generados.no_certificado_removido IS 'Número de certificado que fue removido del XML';

-- Crear índice para consultas por estado cancelado
CREATE INDEX IF NOT EXISTS idx_xmls_fecha_cancelacion ON xmls_generados(fecha_cancelacion) WHERE fecha_cancelacion IS NOT NULL;

-- Actualizar comentario de la columna estado para incluir 'cancelado'
COMMENT ON COLUMN xmls_generados.estado IS 'Estado del XML: generado, sellado, timbrado, cancelado';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'xmls_generados' 
AND column_name IN ('fecha_cancelacion', 'motivo_cancelacion', 'usuario_cancelacion', 'sello_removido', 'certificado_removido', 'no_certificado_removido')
ORDER BY column_name;
