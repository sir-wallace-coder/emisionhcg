# 📤 Instrucciones para Subir a GitHub

## 🔑 Opción 1: Upload Manual (Más Fácil)

1. **Comprimir el proyecto**:
   - Selecciona todos los archivos EXCEPTO `node_modules/` y `.git/`
   - Crear ZIP con: `index.html`, `login.html`, `dashboard.html`, `generator.html`, `functions/`, `database/`, `scripts/`, `package.json`, `netlify.toml`, `README.md`, `deploy.sh`

2. **Subir a GitHub**:
   - Ve a https://github.com/wallacegabrielh/emisionhcg
   - Click en "Upload files"
   - Arrastra el ZIP o selecciona archivos
   - Commit message: "🚀 CFDI Sistema Completo - Initial Release"

## 🔑 Opción 2: Git Command Line

Si tienes configurado tu token personal de GitHub:

```bash
# Configurar credenciales (una sola vez)
git config --global user.name "wallacegabrielh"
git config --global user.email "tu-email@gmail.com"

# Configurar token (reemplaza TU_TOKEN_AQUI con tu token personal)
git remote set-url origin https://TU_TOKEN_AQUI@github.com/wallacegabrielh/emisionhcg.git

# Push
git push -u origin main
```

## 🔑 Opción 3: GitHub CLI (si tienes gh instalado)

```bash
gh auth login
git push -u origin main
```

## 📁 Archivos Importantes a Subir

✅ **Frontend:**
- `index.html` - Página principal
- `login.html` - Sistema de login
- `dashboard.html` - Panel de control
- `generator.html` - Generador CFDI

✅ **Backend:**
- `functions/auth.js` - Autenticación
- `functions/xmls.js` - Gestión XMLs
- `functions/emisores.js` - Gestión emisores
- `functions/config/supabase.js` - Configuración BD

✅ **Configuración:**
- `package.json` - Dependencias
- `netlify.toml` - Config deployment
- `database/schema.sql` - Esquema BD
- `scripts/create-admin.js` - Usuario admin

✅ **Documentación:**
- `README.md` - Documentación completa
- `deploy.sh` - Script deployment
- `.gitignore` - Archivos a ignorar

## ⚠️ NO Subir:
- `node_modules/` (se instala automáticamente)
- `.git/` (se crea automáticamente)
- `*.log` (archivos de log)
- `.env*` (variables de entorno)

## 🎯 Después del Upload:

1. **Conectar a Netlify**:
   - Nuevo site desde GitHub
   - Seleccionar repo `emisionhcg`
   - Build: `npm install`
   - Publish: `.`
   - Functions: `functions`

2. **Configurar Variables de Entorno en Netlify**:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu_anon_key
   JWT_SECRET=tu_jwt_secret_seguro
   SUPABASE_SERVICE_ROLE_KEY=tu_service_key
   ```

3. **Crear Usuario Admin**:
   ```bash
   node scripts/create-admin.js
   ```

## 🚀 ¡Listo para Usar!

Una vez subido y deployado:
- **URL**: https://tu-site.netlify.app
- **Admin**: admin@cfdi-sistema.com / Admin123!
- **Funcionalidades**: Todas implementadas y listas
