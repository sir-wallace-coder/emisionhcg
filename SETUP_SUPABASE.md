# 🚀 Configuración de Supabase para CFDI Sistema

## 📋 Pasos para Configurar Supabase

### 1. Crear Proyecto Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configura:
   - **Name**: `CFDI Sistema Completo`
   - **Database Password**: (genera una segura)
   - **Region**: `Central US` (más cercana a México)
4. Click **"Create new project"**
5. Espera 2-3 minutos a que se configure

### 2. Configurar Base de Datos
1. Ve a **SQL Editor** en el dashboard
2. Copia y pega el contenido de `database/schema.sql`
3. Click **"Run"** para ejecutar el script
4. Verifica que se crearon las tablas: `usuarios`, `emisores`, `xmls_generados`

### 3. Obtener Keys de API
1. Ve a **Settings** → **API**
2. Copia estos 3 valores:

```env
# Project URL
SUPABASE_URL=https://tu-proyecto-id.supabase.co

# anon public (para frontend)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# service_role (para backend - NUNCA exponer)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Configurar Políticas RLS (Row Level Security)
1. Ve a **Authentication** → **Policies**
2. Ejecuta el script `supabase-global-access-policies.sql`
3. Esto permite acceso global a XMLs y emisores

### 5. Actualizar archivo .env
Reemplaza los valores placeholder en `.env`:

```env
SUPABASE_URL=https://tu-proyecto-real.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_real_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_real_aqui
JWT_SECRET=genera_un_jwt_secret_seguro_32_caracteres
```

### 6. Probar Conexión
```bash
# Ejecutar test de conexión
node functions/test-connection.js
```

## 🔒 Seguridad Importante

- ✅ **SUPABASE_ANON_KEY**: Segura para frontend
- ❌ **SUPABASE_SERVICE_ROLE_KEY**: SOLO backend/serverless
- 🔐 **JWT_SECRET**: Solo backend, rotar periódicamente
- 📍 **SUPABASE_URL**: Pública pero específica por proyecto

## 🌍 Configuración por Entorno

### Desarrollo Local
- Usar archivo `.env` en la raíz del proyecto
- Keys de proyecto de desarrollo/testing

### Producción (Netlify)
- Configurar en **Site Settings** → **Environment Variables**
- Keys de proyecto de producción
- Nunca hardcodear en código

## ✅ Verificación Final

1. **Base de datos configurada** ✅
2. **Variables de entorno configuradas** ✅  
3. **Políticas RLS aplicadas** ✅
4. **Test de conexión exitoso** ✅
5. **Usuario admin creado** ✅

¡Tu proyecto CFDI ya está listo para usar con Supabase! 🎉
