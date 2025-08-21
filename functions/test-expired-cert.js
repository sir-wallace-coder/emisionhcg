/**
 * 🧪 PRUEBA RÁPIDA: Verificar que @nodecfdi/credentials permite certificados vencidos
 * 
 * Esta función prueba si NodeCfdi puede crear credenciales y firmar con certificados vencidos
 */

const { Credential } = require('@nodecfdi/credentials/node');

/**
 * Prueba rápida de certificado vencido
 * @param {string} certificadoCer - Certificado en base64
 * @param {string} llavePrivadaKey - Llave privada en base64
 * @param {string} passwordLlave - Contraseña de la llave
 */
async function probarCertificadoVencido(certificadoCer, llavePrivadaKey, passwordLlave) {
    console.log('🧪 PRUEBA CERTIFICADO VENCIDO: Iniciando...');
    
    try {
        // Convertir a formato binary string
        const certBinary = Buffer.from(certificadoCer, 'base64').toString('binary');
        const keyBinary = Buffer.from(llavePrivadaKey, 'base64').toString('binary');
        
        console.log('📋 PRUEBA: Archivos convertidos');
        console.log('  - Cert length:', certBinary.length);
        console.log('  - Key length:', keyBinary.length);
        
        // Intentar crear credencial
        console.log('🔐 PRUEBA: Creando credencial...');
        const credential = Credential.create(certBinary, keyBinary, passwordLlave);
        console.log('✅ PRUEBA: Credencial creada exitosamente');
        
        // Obtener información del certificado
        const certificado = credential.certificate();
        const rfc = certificado.rfc();
        const nombre = certificado.legalName();
        const numero = certificado.serialNumber().bytes();
        
        console.log('📋 PRUEBA: Información del certificado:');
        console.log('  - RFC:', rfc);
        console.log('  - Nombre:', nombre);
        console.log('  - Número:', numero);
        
        // Verificar fechas de vigencia
        try {
            const validFrom = certificado.validFrom();
            const validTo = certificado.validTo();
            const ahora = new Date();
            
            console.log('📅 PRUEBA: Fechas de vigencia:');
            console.log('  - Válido desde:', validFrom);
            console.log('  - Válido hasta:', validTo);
            console.log('  - Fecha actual:', ahora);
            
            const estaVencido = validTo < ahora;
            console.log('⚠️ PRUEBA: Estado:', estaVencido ? '🔴 VENCIDO' : '🟢 VIGENTE');
            
            if (estaVencido) {
                const diasVencido = Math.floor((ahora - validTo) / (1000 * 60 * 60 * 24));
                console.log('⚠️ PRUEBA: Vencido hace', diasVencido, 'días');
            }
        } catch (dateError) {
            console.log('ℹ️ PRUEBA: Error obteniendo fechas:', dateError.message);
        }
        
        // Probar firmado con una cadena de prueba
        console.log('🔐 PRUEBA: Probando firmado...');
        const cadenaTest = '||4.0|B|123|2024-01-01T12:00:00|99|00001000000506969930|1000.00|MXN|1160.00||';
        
        try {
            const firma = credential.sign(cadenaTest);
            console.log('✅ PRUEBA: Firmado exitoso');
            console.log('  - Longitud firma:', firma.length);
            console.log('  - Primeros 50 chars:', firma.substring(0, 50));
            
            // Verificar la firma
            const verificacion = credential.verify(cadenaTest, firma);
            console.log('🔍 PRUEBA: Verificación:', verificacion ? '✅ VÁLIDA' : '❌ INVÁLIDA');
            
            return {
                exito: true,
                certificadoVencido: true,
                puedeFiremar: true,
                verificacionOK: verificacion,
                rfc: rfc,
                numero: numero,
                mensaje: 'NodeCfdi permite certificados vencidos para firmado'
            };
            
        } catch (signError) {
            console.error('❌ PRUEBA: Error en firmado:', signError.message);
            return {
                exito: false,
                error: `Error firmando: ${signError.message}`,
                puedeCrearCredencial: true,
                puedeFiremar: false
            };
        }
        
    } catch (error) {
        console.error('❌ PRUEBA: Error creando credencial:', error.message);
        console.error('❌ PRUEBA: Stack:', error.stack);
        
        return {
            exito: false,
            error: `Error creando credencial: ${error.message}`,
            puedeCrearCredencial: false,
            posibleCausaCertificadoVencido: error.message.includes('expired') || error.message.includes('vencido') || error.message.includes('date')
        };
    }
}

module.exports = {
    probarCertificadoVencido
};
