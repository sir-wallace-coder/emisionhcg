#!/bin/bash

echo "🚀 Iniciando deployment de CFDI Sistema Completo..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde el directorio del proyecto."
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar archivos críticos
echo "🔍 Verificando archivos críticos..."

critical_files=(
    "index.html"
    "login.html" 
    "dashboard.html"
    "generator.html"
    "netlify.toml"
    "functions/auth.js"
    "functions/xmls.js"
    "functions/emisores.js"
    "functions/config/supabase.js"
    "database/schema.sql"
)

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Archivo crítico faltante: $file"
        exit 1
    else
        echo "✅ $file"
    fi
done

echo ""
echo "🎯 Archivos verificados correctamente!"
echo ""
echo "📋 PASOS PARA COMPLETAR EL DEPLOYMENT:"
echo ""
echo "1. 🗄️  CONFIGURAR SUPABASE:"
echo "   - Crear proyecto en https://supabase.com"
echo "   - Ejecutar el SQL en database/schema.sql"
echo "   - Obtener SUPABASE_URL y SUPABASE_ANON_KEY"
echo ""
echo "2. 🌐 DEPLOYMENT EN NETLIFY:"
echo "   - Opción A: Conectar repositorio Git"
echo "   - Opción B: Arrastrar carpeta completa a Netlify"
echo ""
echo "3. ⚙️  CONFIGURAR VARIABLES DE ENTORNO en Netlify:"
echo "   SUPABASE_URL=https://tu-proyecto.supabase.co"
echo "   SUPABASE_ANON_KEY=tu_anon_key"
echo "   JWT_SECRET=tu_jwt_secret_muy_seguro_de_al_menos_32_caracteres"
echo "   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key"
echo ""
echo "4. 👤 CREAR USUARIO ADMIN:"
echo "   node scripts/create-admin.js"
echo ""
echo "🎉 ¡Tu aplicación estará lista para usar!"
echo ""
echo "📧 Credenciales de admin por defecto:"
echo "   Email: admin@cfdi-sistema.com"
echo "   Password: Admin123!"
echo ""
echo "⚠️  IMPORTANTE: Cambiar la contraseña después del primer login"
