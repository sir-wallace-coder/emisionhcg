# 🔐 Guía de Pruebas - Sellado Digital CFDI

## Sistema Completo CFDI con Sellado Digital Automático

### 🌐 URL del Sistema
**Producción:** https://hcgcfdi.netlify.app

### 👤 Credenciales de Prueba
- **Usuario:** admin@sistema.com
- **Contraseña:** password

---

## 🚀 Funcionalidades Implementadas

### ✅ 1. Registro de Emisores con Validación CSD
- **Validación de RFC:** Formato correcto y unicidad por usuario
- **Validación de Código Postal:** Formato mexicano válido (5 dígitos)
- **Procesamiento de Certificados CSD:**
  - Parsing automático de archivos `.cer` (certificado)
  - Parsing automático de archivos `.key` (llave privada)
  - Validación de vigencia del certificado
  - Verificación de coincidencia certificado-llave privada
  - Extracción automática del número de certificado
  - Almacenamiento seguro en formato PEM

### ✅ 2. Sellado Digital Automático
- **Generación de Cadena Original:** Compatible con CFDI 3.3 y 4.0
- **Firmado Digital:** Usando la llave privada del CSD con algoritmo SHA-256
- **Validación del Sello:** Verificación automática de la firma
- **Integración Transparente:** Sellado automático al seleccionar emisor con CSD

### ✅ 3. Interfaz de Usuario Mejorada
- **Feedback Visual:** Información detallada del proceso de sellado
- **Manejo de Errores:** Mensajes claros para diferentes escenarios
- **Estados del Proceso:** Indicadores de progreso durante el sellado

---

## 🧪 Pasos para Probar el Sistema

### Paso 1: Acceso al Sistema
1. Ir a https://hcgcfdi.netlify.app
2. Hacer login con las credenciales de prueba
3. Acceder al Dashboard

### Paso 2: Registro de Emisor con CSD
1. En el Dashboard, hacer clic en "🏢 Nuevo Emisor"
2. Llenar los datos del emisor:
   - **RFC:** XAXX010101000 (formato de prueba)
   - **Nombre:** Emisor de Prueba S.A. de C.V.
   - **Código Postal:** 01000 (formato válido mexicano)
3. **Subir Certificados CSD:**
   - Archivo `.cer`: Certificado digital del SAT
   - Archivo `.key`: Llave privada del certificado
   - **Contraseña:** Contraseña de la llave privada
4. Hacer clic en "Guardar Emisor"

### Paso 3: Verificación del Procesamiento CSD
El sistema automáticamente:
- ✅ Valida el formato del RFC
- ✅ Verifica el código postal mexicano
- ✅ Procesa el certificado `.cer` y extrae información
- ✅ Valida la llave privada `.key` con la contraseña
- ✅ Verifica que el certificado y la llave coincidan
- ✅ Extrae el número de certificado
- ✅ Verifica la vigencia del certificado
- ✅ Almacena todo de forma segura en la base de datos

### Paso 4: Generación de CFDI con Sellado Automático
1. Ir al "🚀 Generador CFDI"
2. **Seleccionar Emisor:** En el dropdown "Seleccionar Emisor Registrado", elegir el emisor con CSD
3. Llenar los datos del CFDI:
   - Datos del receptor
   - Conceptos
   - Impuestos
4. Hacer clic en "Generar XML"

### Paso 5: Verificación del Sellado Digital
El sistema automáticamente:
- 🔐 Detecta que hay un emisor con CSD seleccionado
- 🔐 Genera el XML base del CFDI
- 🔐 Crea la cadena original según la versión CFDI
- 🔐 Firma digitalmente con la llave privada del CSD
- 🔐 Valida que el sello sea correcto
- 🔐 Inserta el sello digital en el XML
- 🔐 Muestra información del sellado en la interfaz

---

## 📋 Resultados Esperados

### ✅ Emisor Registrado Exitosamente
```
✅ Emisor guardado exitosamente
🔐 Certificado procesado y validado
📅 Vigencia: [Fecha de vigencia del certificado]
🔢 Número de certificado: [Número extraído automáticamente]
```

### ✅ XML Sellado Digitalmente
```
✅ XML generado y sellado digitalmente

🔐 Información del Sellado Digital
├── Emisor: XAXX010101000 - Emisor de Prueba S.A. de C.V.
├── Certificado: [Número de certificado]
├── Sello: [Primeros 20 caracteres del sello]...
└── Estado: ✅ Sellado Válido
```

### ✅ XML con Atributos de Sellado
El XML generado incluirá automáticamente:
```xml
<cfdi:Comprobante 
    ...
    NoCertificado="[Número del certificado]"
    Sello="[Sello digital completo]"
    ...>
```

---

## 🔧 Funcionalidades Técnicas Implementadas

### Backend (Netlify Functions)
- **`sellar-cfdi.js`:** Función principal de sellado digital
- **`csd-processor.js`:** Utilidades de procesamiento de certificados
- **`cfdi-sealer.js`:** Utilidades de sellado y validación
- **`emisores.js`:** Gestión mejorada de emisores con CSD

### Frontend (Integración)
- **Selector de Emisor:** Dropdown con emisores registrados
- **Sellado Automático:** Detección y procesamiento transparente
- **Feedback Visual:** Información detallada del proceso
- **Manejo de Errores:** Mensajes claros y específicos

### Base de Datos (Supabase)
- **Tabla `emisores`:** Campos adicionales para CSD
  - `certificado_cer`: Certificado en formato PEM
  - `certificado_key`: Llave privada en formato PEM
  - `numero_certificado`: Número extraído automáticamente
  - `vigencia_desde`: Fecha de inicio de vigencia
  - `vigencia_hasta`: Fecha de fin de vigencia

---

## 🚨 Casos de Error Manejados

### ❌ Certificado Expirado
```
❌ El certificado del emisor ha expirado. 
Vigencia hasta: [Fecha de expiración]
```

### ❌ Certificado y Llave No Coinciden
```
❌ Error en validación: El certificado y la llave privada no coinciden
```

### ❌ Contraseña Incorrecta
```
❌ Error en validación: Contraseña de llave privada incorrecta
```

### ❌ RFC Inválido
```
❌ Error en validación: Formato de RFC inválido
```

### ❌ Código Postal Inválido
```
❌ Error en validación: Código postal debe tener 5 dígitos
```

---

## 🎯 Próximos Pasos

### 🔄 Funcionalidades Futuras
1. **Timbrado SAT:** Integración con PACs autorizados
2. **Validación Avanzada:** Verificación contra listas del SAT
3. **Certificados Múltiples:** Soporte para múltiples CSD por emisor
4. **Renovación Automática:** Alertas de vencimiento de certificados

### 📊 Métricas de Éxito
- ✅ Registro de emisores con validación completa
- ✅ Sellado digital automático y transparente
- ✅ Validación de sellos digitales
- ✅ Manejo robusto de errores
- ✅ Interfaz intuitiva y feedback claro

---

## 📞 Soporte

Para cualquier problema o duda sobre el sistema:
1. Verificar los logs en la consola del navegador
2. Revisar los mensajes de error en la interfaz
3. Consultar esta guía para casos comunes
4. Contactar al equipo de desarrollo

**¡El sistema está listo para producción con sellado digital completo!** 🚀
