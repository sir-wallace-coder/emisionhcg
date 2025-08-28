-- Script para agregar columna fecha_sellado a la tabla xmls_generados
-- Esta columna es necesaria para el endpoint de sellado NodeCfdi

-- Agregar columna fecha_sellado si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'xmls_generados' 
        AND column_name = 'fecha_sellado'
    ) THEN
        ALTER TABLE xmls_generados 
        ADD COLUMN fecha_sellado TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Columna fecha_sellado agregada exitosamente a xmls_generados';
    ELSE
        RAISE NOTICE 'Columna fecha_sellado ya existe en xmls_generados';
    END IF;
END $$;

-- Verificar que la columna existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'xmls_generados' 
AND column_name = 'fecha_sellado';
