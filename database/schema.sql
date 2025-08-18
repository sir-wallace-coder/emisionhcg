-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255),
    empresa VARCHAR(300),
    telefono VARCHAR(20),
    rol VARCHAR(20) DEFAULT 'user',
    activo BOOLEAN DEFAULT true,
    email_verificado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de emisores
CREATE TABLE IF NOT EXISTS emisores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    rfc VARCHAR(13) NOT NULL,
    nombre VARCHAR(300) NOT NULL,
    codigo_postal VARCHAR(5) NOT NULL,
    regimen_fiscal VARCHAR(10) NOT NULL,
    certificado_cer TEXT, -- Contenido del archivo .cer en base64
    certificado_key TEXT, -- Contenido del archivo .key en base64
    password_key VARCHAR(255), -- Contraseña del certificado (encriptada)
    numero_certificado VARCHAR(20), -- Número de certificado extraído del .cer
    vigencia_desde DATE, -- Fecha de inicio de vigencia del certificado
    vigencia_hasta DATE, -- Fecha de fin de vigencia del certificado
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, rfc)
);

-- Crear tabla de XMLs generados
CREATE TABLE IF NOT EXISTS xmls_generados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    emisor_id UUID REFERENCES emisores(id) ON DELETE SET NULL,
    xml_content TEXT NOT NULL,
    version_cfdi VARCHAR(5) NOT NULL,
    emisor_rfc VARCHAR(13) NOT NULL,
    emisor_nombre VARCHAR(300) NOT NULL,
    receptor_rfc VARCHAR(13) NOT NULL,
    receptor_nombre VARCHAR(300) NOT NULL,
    serie VARCHAR(25),
    folio VARCHAR(40) NOT NULL,
    total DECIMAL(18,6) NOT NULL,
    uuid VARCHAR(36), -- UUID del timbre fiscal (cuando se timbre)
    sello TEXT, -- Sello digital del emisor
    estado VARCHAR(20) DEFAULT 'generado', -- generado, sellado, timbrado, cancelado
    fecha_timbrado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_emisores_usuario_id ON emisores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_emisores_rfc ON emisores(rfc);
CREATE INDEX IF NOT EXISTS idx_xmls_usuario_id ON xmls_generados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_xmls_emisor_id ON xmls_generados(emisor_id);
CREATE INDEX IF NOT EXISTS idx_xmls_estado ON xmls_generados(estado);
CREATE INDEX IF NOT EXISTS idx_xmls_created_at ON xmls_generados(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE emisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE xmls_generados ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para usuarios (solo pueden ver/editar sus propios datos)
CREATE POLICY "Usuarios pueden ver sus propios datos" ON usuarios
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Usuarios pueden actualizar sus propios datos" ON usuarios
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Política para permitir registro de nuevos usuarios (INSERT público)
CREATE POLICY "Permitir registro de nuevos usuarios" ON usuarios
    FOR INSERT WITH CHECK (true);

-- Políticas de seguridad para emisores
CREATE POLICY "Usuarios pueden ver sus propios emisores" ON emisores
    FOR SELECT USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden crear emisores" ON emisores
    FOR INSERT WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden actualizar sus propios emisores" ON emisores
    FOR UPDATE USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden eliminar sus propios emisores" ON emisores
    FOR DELETE USING (auth.uid()::text = usuario_id::text);

-- Políticas de seguridad para XMLs generados
CREATE POLICY "Usuarios pueden ver sus propios XMLs" ON xmls_generados
    FOR SELECT USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden crear XMLs" ON xmls_generados
    FOR INSERT WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden actualizar sus propios XMLs" ON xmls_generados
    FOR UPDATE USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuarios pueden eliminar sus propios XMLs" ON xmls_generados
    FOR DELETE USING (auth.uid()::text = usuario_id::text);
