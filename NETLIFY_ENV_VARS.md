# 🔧 Variables de Entorno para Netlify

## Variables Requeridas para Funcionalidad PDF

Para que la funcionalidad de generación de PDF funcione correctamente en producción, necesitas configurar estas variables de entorno en Netlify:

### 📄 API de Generación de PDF (redoc.mx)

```bash
REDOC_API_KEY=key_UZik7W0iDohUz6pW90Wf5sntirM9sfmxTp37t1n0vdtX8p6dtPioBpGmZocN
REDOC_API_URL=https://api.redoc.mx/pdf
```

### 🔐 Otras Variables Críticas (si no están configuradas)

```bash
JWT_SECRET=tu_jwt_secret_aqui
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## 🚀 Cómo Configurar en Netlify

### Opción 1: Desde el Dashboard de Netlify
1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com)
2. Ve a **Site settings** → **Environment variables**
3. Haz clic en **Add a variable**
4. Agrega cada variable con su valor correspondiente

### Opción 2: Usando Netlify CLI
```bash
# Instalar Netlify CLI si no lo tienes
npm install -g netlify-cli

# Autenticarte
netlify login

# Configurar variables (ejecutar desde el directorio del proyecto)
netlify env:set REDOC_API_KEY "key_UZik7W0iDohUz6pW90Wf5sntirM9sfmxTp37t1n0vdtX8p6dtPioBpGmZocN"
netlify env:set REDOC_API_URL "https://api.redoc.mx/pdf"
```

### Opción 3: Archivo netlify.toml (No recomendado para secrets)
```toml
[build.environment]
  REDOC_API_URL = "https://api.redoc.mx/pdf"
  # NO pongas la API key aquí por seguridad
```

## ⚠️ Importante

- **NUNCA** commits la API key en el código fuente
- Las variables de entorno en Netlify son privadas y seguras
- Después de configurar las variables, necesitas hacer un nuevo deploy

## 🔍 Verificar Configuración

Después de configurar las variables, puedes verificar que estén disponibles revisando los logs de las funciones serverless en Netlify.

## 📋 Estado Actual

❌ **REDOC_API_KEY** - No configurada en Netlify (causa del error)
❌ **REDOC_API_URL** - No configurada en Netlify
✅ **Variables locales** - Configuradas en .env local

## 🎯 Próximos Pasos

1. Configurar las variables de entorno en Netlify
2. Hacer un nuevo deploy (opcional, se actualiza automáticamente)
3. Probar la funcionalidad de PDF
4. Verificar logs en caso de errores
