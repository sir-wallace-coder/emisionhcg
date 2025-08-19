-- ===================================================================
-- CORRECCIÓN URGENTE: RLS POLICIES PARA TABLA EMISORES
-- Problema: auth.uid() devuelve NULL porque usamos JWT personalizado
-- Solución: Deshabilitar RLS temporalmente o crear políticas permisivas
-- ===================================================================

-- OPCIÓN 1: DESHABILITAR RLS TEMPORALMENTE (RECOMENDADO PARA DESARROLLO)
ALTER TABLE emisores DISABLE ROW LEVEL SECURITY;
ALTER TABLE xmls_generados DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- NOTA: Esto permite acceso completo a las tablas desde el backend
-- La seguridad se maneja a nivel de aplicación (JWT + validaciones)

-- ===================================================================
-- OPCIÓN 2: POLÍTICAS PERMISIVAS (ALTERNATIVA)
-- Si prefieres mantener RLS habilitado, usa estas políticas:
-- ===================================================================

/*
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden crear emisores" ON emisores;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios emisores" ON emisores;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios emisores" ON emisores;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios emisores" ON emisores;

-- Crear políticas permisivas para emisores
CREATE POLICY "Permitir todas las operaciones en emisores" ON emisores
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas permisivas para XMLs
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Usuarios pueden crear XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios XMLs" ON xmls_generados;

CREATE POLICY "Permitir todas las operaciones en XMLs" ON xmls_generados
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas permisivas para usuarios
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios datos" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios datos" ON usuarios;
DROP POLICY IF EXISTS "Permitir registro de nuevos usuarios" ON usuarios;

CREATE POLICY "Permitir todas las operaciones en usuarios" ON usuarios
    FOR ALL USING (true) WITH CHECK (true);
*/

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================

-- Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('usuarios', 'emisores', 'xmls_generados');

-- Resultado esperado: rowsecurity = false para todas las tablas

COMMENT ON TABLE emisores IS 'RLS deshabilitado - Seguridad manejada por JWT en backend';
COMMENT ON TABLE xmls_generados IS 'RLS deshabilitado - Seguridad manejada por JWT en backend';
COMMENT ON TABLE usuarios IS 'RLS deshabilitado - Seguridad manejada por JWT en backend';
