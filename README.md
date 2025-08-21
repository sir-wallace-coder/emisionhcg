# 🧾 CFDI Sistema Completo

Sistema completo para la generación, gestión y almacenamiento de CFDIs con backend integrado.

## 🚀 Características

- ✅ **Generación de CFDI 3.3 y 4.0** con catálogos SAT actualizados
- ✅ **Sistema de autenticación** con JWT y bcrypt
- ✅ **Gestión de emisores** con almacenamiento seguro de CSDs
- ✅ **Sellado dual: Local + Servicio Externo** para máxima confiabilidad
- ✅ **Almacenamiento de XMLs** con filtros avanzados y búsqueda
- ✅ **Dashboard completo** con estadísticas y gestión
- ✅ **Exportación a CSV** de XMLs filtrados
- ✅ **Interfaz moderna** y responsive
- ✅ **Configuración dinámica** del método de sellado

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Netlify Functions (Node.js)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: JWT + bcrypt
- **Deployment**: Netlify

## 📋 Requisitos Previos

1. **Cuenta de Supabase** (https://supabase.com)
2. **Cuenta de Netlify** (https://netlify.com)
3. **Node.js** v16 o superior

## 🔧 Configuración

### 1. Configurar Supabase

1. Crear nuevo proyecto en Supabase
2. Ejecutar el script SQL en `database/schema.sql`
3. Obtener:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (para crear usuario admin)

### 2. Variables de Entorno

Crear las siguientes variables en Netlify:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
JWT_SECRET=tu_jwt_secret_muy_seguro_de_al_menos_32_caracteres
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Configuración Servicio Externo de Sellado (Opcional)
EXTERNAL_SEALER_LOGIN_URL=https://tu-servicio-sellado.com/api/v1/login
EXTERNAL_SEALER_URL=https://tu-servicio-sellado.com/api/v1/sellar
EXTERNAL_SEALER_USERNAME=tu_usuario_api
EXTERNAL_SEALER_PASSWORD=tu_password_api
USE_EXTERNAL_SEALER=false
```

### 3. Deployment en Netlify

#### Opción A: Desde Git
1. Conectar repositorio a Netlify
2. Configurar build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.`
   - **Functions directory**: `functions`

#### Opción B: Deploy Manual
1. Comprimir toda la carpeta del proyecto
2. Arrastrar a Netlify Deploy
3. Configurar variables de entorno

### 4. Crear Usuario Administrador

Después del deployment, ejecutar:

```bash
# Instalar dependencias
npm install

# Crear usuario admin (requiere variables de entorno configuradas)
node scripts/create-admin.js
```

## 👤 Usuario Administrador por Defecto

- **Email**: `admin@cfdi-sistema.com`
- **Password**: `Admin123!`
- **Rol**: `admin`

⚠️ **IMPORTANTE**: Cambiar la contraseña después del primer login.

## 📁 Estructura del Proyecto

```
cfdi-sistema-completo/
├── index.html              # Página de inicio
├── login.html              # Sistema de login/registro
├── dashboard.html          # Panel de control
├── generator.html          # Generador de CFDI
├── functions/              # Backend serverless
│   ├── config/supabase.js  # Configuración BD
│   ├── auth.js            # Autenticación
│   ├── xmls.js            # Gestión XMLs
│   └── emisores.js        # Gestión emisores
├── database/
│   └── schema.sql         # Esquema de BD
├── scripts/
│   └── create-admin.js    # Script usuario admin
├── package.json
├── netlify.toml
└── README.md
```

## 🔐 Seguridad

- **Contraseñas hasheadas** con bcrypt
- **JWT tokens** con expiración de 24h
- **Row Level Security** en Supabase
- **Validación de entrada** en todos los endpoints
- **Almacenamiento seguro** de certificados CSD

## 📊 Funcionalidades del Dashboard

### Gestión de XMLs
- **Filtros por fecha**: Hoy, semana, mes, personalizado
- **Búsqueda**: Por folio, serie, UUID, RFC, nombres
- **Filtros adicionales**: Estado, versión, emisor, rango de total
- **Exportación**: CSV con datos filtrados
- **Estadísticas**: Contadores en tiempo real

### Gestión de Emisores
- **CRUD completo** de emisores
- **Subida de CSDs** (.cer y .key)
- **Validación** de certificados
- **Almacenamiento seguro** con encriptación

## 🚀 Uso

1. **Acceder** a la URL de tu deployment
2. **Registrarse** o usar credenciales de admin
3. **Configurar emisores** con sus CSDs
4. **Generar CFDIs** desde el generador integrado
5. **Gestionar XMLs** desde el dashboard

## 🔮 Próximas Funcionalidades

- [ ] **Sellado digital** de XMLs con CSDs
- [ ] **Validación** de certificados y vigencia
- [ ] **Integración PAC** para timbrado SAT
- [ ] **Cancelación** de CFDIs
- [ ] **Reportes avanzados**

## 📞 Soporte

Para soporte técnico o consultas, contactar al administrador del sistema.

---

**Desarrollado con ❤️ para la gestión profesional de CFDIs**
