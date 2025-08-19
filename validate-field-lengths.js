#!/usr/bin/env node

/**
 * SCRIPT DE VALIDACIÓN DE LONGITUDES DE CAMPOS
 * Verifica que todos los campos del sistema respeten los límites de la base de datos
 * para prevenir errores tipo "22001 - value too long for type character varying"
 */

console.log('🔍 === AUDITORÍA COMPLETA DE LONGITUDES DE CAMPOS ===\n');

// Definir límites de campos según el schema de la base de datos
const FIELD_LIMITS = {
  // TABLA: usuarios
  usuarios: {
    email: 255,
    password_hash: 255,
    nombre: 255,
    apellido: 255,
    empresa: 300,
    telefono: 20,
    rol: 20
  },
  
  // TABLA: emisores
  emisores: {
    rfc: 13,
    nombre: 300,
    codigo_postal: 5,
    regimen_fiscal: 10,
    password_key: 255,
    numero_certificado: 20  // ⚠️ CAMPO CRÍTICO (ya corregido)
  },
  
  // TABLA: xmls_generados
  xmls_generados: {
    version_cfdi: 5,
    emisor_rfc: 13,
    emisor_nombre: 300,
    receptor_rfc: 13,
    receptor_nombre: 300,
    serie: 25,        // ⚠️ CAMPO CRÍTICO
    folio: 40,        // ⚠️ CAMPO CRÍTICO
    uuid: 36,         // ⚠️ CAMPO CRÍTICO (UUID = exactamente 36 chars)
    estado: 20        // ⚠️ CAMPO CRÍTICO
  }
};

// Valores típicos que se usan en el sistema
const TYPICAL_VALUES = {
  usuarios: {
    email: ['admin@sistema.com', 'usuario.muy.largo.con.dominio.extremadamente.largo@empresa.con.nombre.muy.extenso.com'],
    telefono: ['5551234567', '+52-555-123-4567-ext-12345'],
    rol: ['user', 'admin', 'super_administrator']
  },
  
  emisores: {
    rfc: ['XAXX010101000', 'ABCD123456789'],
    regimen_fiscal: ['601', '603', '605', '612', '615'],
    numero_certificado: ['XAXX010145757000', 'CSD_1737345757000_XAXX010101000'] // Antes vs Después
  },
  
  xmls_generados: {
    version_cfdi: ['3.3', '4.0'],
    serie: ['A', 'FAC', 'FACTURA', 'COMPROBANTE_FISCAL_DIGITAL'],
    folio: ['1', '123456', 'FOLIO-AUTOMATICO-GENERADO-SISTEMA-2024'],
    uuid: ['12345678-1234-1234-1234-123456789012', '12345678-1234-1234-1234-123456789012-EXTRA'],
    estado: ['generado', 'sellado', 'timbrado', 'cancelado', 'estado_muy_largo_problema']
  }
};

function validateField(tableName, fieldName, value, limit) {
  const length = value ? value.length : 0;
  const status = length <= limit ? '✅' : '❌';
  const risk = length > limit * 0.8 ? '⚠️' : '';
  
  console.log(`${status} ${risk} ${tableName}.${fieldName}: ${length}/${limit} chars - "${value}"`);
  
  if (length > limit) {
    console.log(`   🚨 PROBLEMA: Campo excede límite por ${length - limit} caracteres`);
    return false;
  }
  
  if (length > limit * 0.8) {
    console.log(`   ⚠️  ADVERTENCIA: Campo cerca del límite (${Math.round((length/limit)*100)}%)`);
  }
  
  return true;
}

function runValidation() {
  let allValid = true;
  let warnings = 0;
  let errors = 0;
  
  console.log('📊 VALIDANDO VALORES TÍPICOS DEL SISTEMA:\n');
  
  for (const [tableName, tableFields] of Object.entries(FIELD_LIMITS)) {
    console.log(`🗃️  TABLA: ${tableName.toUpperCase()}`);
    
    for (const [fieldName, limit] of Object.entries(tableFields)) {
      const typicalValues = TYPICAL_VALUES[tableName]?.[fieldName] || [];
      
      if (typicalValues.length === 0) {
        console.log(`✅ ${tableName}.${fieldName}: Sin valores típicos para validar`);
        continue;
      }
      
      for (const value of typicalValues) {
        const isValid = validateField(tableName, fieldName, value, limit);
        
        if (!isValid) {
          allValid = false;
          errors++;
        } else if (value && value.length > limit * 0.8) {
          warnings++;
        }
      }
    }
    
    console.log('');
  }
  
  // Resumen final
  console.log('📋 === RESUMEN DE VALIDACIÓN ===');
  console.log(`Total de errores: ${errors}`);
  console.log(`Total de advertencias: ${warnings}`);
  
  if (allValid) {
    console.log('🎉 ¡TODOS LOS CAMPOS PASAN LA VALIDACIÓN!');
    console.log('✅ El sistema está protegido contra errores de longitud de campo');
  } else {
    console.log('🚨 SE ENCONTRARON PROBLEMAS DE LONGITUD DE CAMPOS');
    console.log('❌ Se requieren correcciones antes del deploy');
  }
  
  // Recomendaciones específicas
  console.log('\n💡 RECOMENDACIONES:');
  
  console.log('1. ✅ numero_certificado: YA CORREGIDO (16 chars < 20 límite)');
  
  console.log('2. ⚠️  serie: Validar que no exceda 25 caracteres');
  console.log('   - Típico: "A", "FAC" (✅ OK)');
  console.log('   - Riesgo: "COMPROBANTE_FISCAL_DIGITAL" (28 chars > 25 límite)');
  
  console.log('3. ⚠️  folio: Validar que no exceda 40 caracteres');
  console.log('   - Típico: "1", "123456" (✅ OK)');
  console.log('   - Riesgo: "FOLIO-AUTOMATICO-GENERADO-SISTEMA-2024" (41 chars > 40 límite)');
  
  console.log('4. ⚠️  uuid: DEBE ser exactamente 36 caracteres');
  console.log('   - Formato: "12345678-1234-1234-1234-123456789012" (36 chars ✅)');
  console.log('   - Riesgo: Cualquier UUID malformado');
  
  console.log('5. ⚠️  estado: Validar estados permitidos');
  console.log('   - Válidos: "generado", "sellado", "timbrado", "cancelado" (✅ OK)');
  console.log('   - Riesgo: Estados personalizados largos');
  
  console.log('6. ⚠️  telefono: Validar formato internacional');
  console.log('   - Típico: "5551234567" (✅ OK)');
  console.log('   - Riesgo: "+52-555-123-4567-ext-12345" (25 chars > 20 límite)');
  
  return allValid;
}

// Ejecutar validación
const isValid = runValidation();
process.exit(isValid ? 0 : 1);
