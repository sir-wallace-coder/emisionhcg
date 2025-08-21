-- 🌐 POLÍTICAS DE ACCESO GLOBAL PARA CFDI SISTEMA
-- Permitir que todos los usuarios autenticados vean todos los XMLs y emisores

-- ============================================
-- POLÍTICAS PARA TABLA xmls_generados
-- ============================================

-- Eliminar políticas existentes restrictivas
DROP POLICY IF EXISTS "Users can only see their own XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Users can only insert their own XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Users can only update their own XMLs" ON xmls_generados;
DROP POLICY IF EXISTS "Users can only delete their own XMLs" ON xmls_generados;

-- Crear nuevas políticas de acceso global
CREATE POLICY "Global access - All users can view all XMLs" ON xmls_generados
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can insert XMLs" ON xmls_generados
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can update XMLs" ON xmls_generados
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can delete XMLs" ON xmls_generados
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- POLÍTICAS PARA TABLA emisores
-- ============================================

-- Eliminar políticas existentes restrictivas
DROP POLICY IF EXISTS "Users can only see their own emisores" ON emisores;
DROP POLICY IF EXISTS "Users can only insert their own emisores" ON emisores;
DROP POLICY IF EXISTS "Users can only update their own emisores" ON emisores;
DROP POLICY IF EXISTS "Users can only delete their own emisores" ON emisores;

-- Crear nuevas políticas de acceso global
CREATE POLICY "Global access - All users can view all emisores" ON emisores
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can insert emisores" ON emisores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can update emisores" ON emisores
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Global access - All users can delete emisores" ON emisores
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- VERIFICACIÓN DE POLÍTICAS
-- ============================================

-- Mostrar políticas activas para xmls_generados
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'xmls_generados';

-- Mostrar políticas activas para emisores
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'emisores';

-- ============================================
-- COMENTARIOS Y NOTAS
-- ============================================

/*
CAMBIOS IMPLEMENTADOS:

1. XMLs GENERADOS:
   - ❌ ANTES: Solo el usuario propietario podía ver/editar sus XMLs
   - ✅ AHORA: Todos los usuarios autenticados pueden ver/editar todos los XMLs

2. EMISORES:
   - ❌ ANTES: Solo el usuario propietario podía ver/editar sus emisores
   - ✅ AHORA: Todos los usuarios autenticados pueden ver/editar todos los emisores

3. SEGURIDAD:
   - Se mantiene la autenticación requerida (auth.role() = 'authenticated')
   - Solo usuarios logueados pueden acceder a los datos
   - Acceso anónimo sigue bloqueado

4. IMPACTO EN FRONTEND:
   - El dashboard mostrará todos los XMLs y emisores
   - Cualquier usuario puede sellar XMLs con cualquier emisor
   - Cualquier usuario puede eliminar XMLs y emisores

NOTA: Estas políticas permiten acceso global pero mantienen la seguridad básica
de autenticación. Para revertir a acceso por usuario, ejecutar las políticas
originales que filtran por usuario_id.
*/
