-- Agregar columna estado_csd faltante a la tabla emisores
-- Esta columna es requerida por el backend para el flujo de CSD

-- Agregar la columna estado_csd
ALTER TABLE emisores 
ADD COLUMN IF NOT EXISTS estado_csd VARCHAR(20) DEFAULT 'pendiente';

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_emisores_estado_csd ON emisores(estado_csd);

-- Actualizar emisores existentes que tienen certificados
-- Si tienen certificado_cer Y certificado_key Y numero_certificado, marcar como 'activo'
UPDATE emisores 
SET estado_csd = 'activo' 
WHERE certificado_cer IS NOT NULL 
  AND certificado_key IS NOT NULL 
  AND numero_certificado IS NOT NULL
  AND numero_certificado != ''
  AND estado_csd = 'pendiente';

-- Comentario para verificación
-- Los posibles valores de estado_csd son:
-- 'pendiente' - Sin certificados o certificados incompletos
-- 'activo' - Certificados completos y válidos
-- 'vencido' - Certificados expirados (opcional)
-- 'error' - Error en certificados (opcional)
