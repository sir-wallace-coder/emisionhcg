/**
 * ===== SISTEMA CFDI PROFESIONAL - EMISOR SERVICES =====
 * Servicios de gestión de emisores CFDI (CRUD, CSD, validación)
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== SERVICIOS DE EMISORES CFDI =====
class CFDIEmisorService {
    
    // ===== CARGAR EMISORES =====
    static async loadAll() {
        logSystem('Cargando todos los emisores', 'info');
        
        try {
            await CFDIStorage.loadEmisores();
            logSystem('Emisores cargados exitosamente', 'success', { count: emisores.length });
            return emisores;
        } catch (error) {
            logSystem('Error cargando emisores', 'error', error);
            return [];
        }
    }
    
    // ===== OBTENER EMISOR POR ID =====
    static getById(emisorId) {
        const emisor = emisores.find(e => e.id === emisorId);
        if (!emisor) {
            logSystem('Emisor no encontrado', 'warning', { id: emisorId });
        }
        return emisor;
    }
    
    // ===== OBTENER EMISOR POR RFC =====
    static getByRFC(rfc) {
        const emisor = emisores.find(e => e.rfc === rfc);
        if (!emisor) {
            logSystem('Emisor no encontrado por RFC', 'warning', { rfc });
        }
        return emisor;
    }
    
    // ===== CREAR NUEVO EMISOR =====
    static async create(emisorData) {
        logSystem('Creando nuevo emisor', 'info', { rfc: emisorData.rfc });
        
        try {
            // Validar datos del emisor
            const validation = this.validateEmisorData(emisorData);
            if (!validation.valid) {
                logSystem('Error de validación en emisor', 'error', validation.errors);
                return { success: false, errors: validation.errors };
            }
            
            // Verificar RFC único
            const existingEmisor = this.getByRFC(emisorData.rfc);
            if (existingEmisor) {
                logSystem('RFC ya existe', 'warning', { rfc: emisorData.rfc });
                return { success: false, error: 'Ya existe un emisor con este RFC' };
            }
            
            // Procesar certificados CSD si se proporcionan
            if (emisorData.certificado_file || emisorData.llave_privada_file) {
                const csdResult = await this.processCSDFiles(emisorData);
                if (!csdResult.success) {
                    return csdResult;
                }
                
                // Agregar datos del certificado procesado
                Object.assign(emisorData, csdResult.data);
            }
            
            // Preparar datos del emisor
            const newEmisor = {
                ...emisorData,
                estado: 'activo',
                fecha_registro: new Date().toISOString()
            };
            
            // Guardar en storage
            const savedEmisor = CFDIStorage.addEmisor(newEmisor);
            if (savedEmisor) {
                logSystem('Emisor creado exitosamente', 'success', { id: savedEmisor.id, rfc: savedEmisor.rfc });
                return { success: true, emisor: savedEmisor };
            } else {
                return { success: false, error: 'Error guardando emisor' };
            }
            
        } catch (error) {
            logSystem('Error creando emisor', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== ACTUALIZAR EMISOR =====
    static async update(emisorId, updatedData) {
        logSystem('Actualizando emisor', 'info', { id: emisorId });
        
        try {
            const emisor = this.getById(emisorId);
            if (!emisor) {
                return { success: false, error: 'Emisor no encontrado' };
            }
            
            // Validar nuevos datos
            const mergedData = { ...emisor, ...updatedData };
            const validation = this.validateEmisorData(mergedData);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }
            
            // Verificar RFC único (si se está cambiando)
            if (updatedData.rfc && updatedData.rfc !== emisor.rfc) {
                const existingEmisor = this.getByRFC(updatedData.rfc);
                if (existingEmisor) {
                    return { success: false, error: 'Ya existe un emisor con este RFC' };
                }
            }
            
            // Procesar nuevos certificados CSD si se proporcionan
            if (updatedData.certificado_file || updatedData.llave_privada_file) {
                const csdResult = await this.processCSDFiles(updatedData);
                if (!csdResult.success) {
                    return csdResult;
                }
                
                // Agregar datos del certificado procesado
                Object.assign(updatedData, csdResult.data);
            }
            
            // Actualizar timestamp
            updatedData.fecha_modificacion = new Date().toISOString();
            
            // Guardar cambios
            const success = CFDIStorage.updateEmisor(emisorId, updatedData);
            if (success) {
                logSystem('Emisor actualizado exitosamente', 'success', { id: emisorId });
                return { success: true };
            } else {
                return { success: false, error: 'Error guardando cambios' };
            }
            
        } catch (error) {
            logSystem('Error actualizando emisor', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== ELIMINAR EMISOR =====
    static delete(emisorId) {
        logSystem('Eliminando emisor', 'info', { id: emisorId });
        
        try {
            const emisor = this.getById(emisorId);
            if (!emisor) {
                return { success: false, error: 'Emisor no encontrado' };
            }
            
            // Verificar si tiene XMLs asociados
            const xmlsAsociados = xmls.filter(xml => xml.emisor_id === emisorId || xml.emisor_rfc === emisor.rfc);
            if (xmlsAsociados.length > 0) {
                logSystem('Emisor tiene XMLs asociados', 'warning', { id: emisorId, xmls: xmlsAsociados.length });
                return { 
                    success: false, 
                    error: `No se puede eliminar el emisor porque tiene ${xmlsAsociados.length} XML(s) asociado(s)` 
                };
            }
            
            const success = CFDIStorage.deleteEmisor(emisorId);
            if (success) {
                logSystem('Emisor eliminado exitosamente', 'success', { id: emisorId });
                return { success: true };
            } else {
                return { success: false, error: 'Error eliminando emisor' };
            }
            
        } catch (error) {
            logSystem('Error eliminando emisor', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== ACTIVAR/DESACTIVAR EMISOR =====
    static toggleStatus(emisorId) {
        try {
            const emisor = this.getById(emisorId);
            if (!emisor) {
                return { success: false, error: 'Emisor no encontrado' };
            }
            
            const newStatus = emisor.estado === 'activo' ? 'inactivo' : 'activo';
            const success = CFDIStorage.updateEmisor(emisorId, { estado: newStatus });
            
            if (success) {
                logSystem('Estado de emisor cambiado', 'success', { id: emisorId, estado: newStatus });
                return { success: true, estado: newStatus };
            } else {
                return { success: false, error: 'Error cambiando estado' };
            }
            
        } catch (error) {
            logSystem('Error cambiando estado de emisor', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== VALIDACIÓN DE DATOS EMISOR =====
    static validateEmisorData(emisorData) {
        const errors = [];
        
        // Validaciones básicas
        if (!emisorData.rfc) {
            errors.push('RFC es requerido');
        } else if (!this.validateRFC(emisorData.rfc)) {
            errors.push('RFC no tiene formato válido');
        }
        
        if (!emisorData.razon_social) {
            errors.push('Razón social es requerida');
        }
        
        if (!emisorData.codigo_postal) {
            errors.push('Código postal es requerido');
        } else if (!this.validateCodigoPostal(emisorData.codigo_postal)) {
            errors.push('Código postal no es válido (debe ser de 5 dígitos)');
        }
        
        if (!emisorData.regimen_fiscal) {
            errors.push('Régimen fiscal es requerido');
        }
        
        // Validaciones opcionales
        if (emisorData.email && !this.validateEmail(emisorData.email)) {
            errors.push('Email no tiene formato válido');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    // ===== PROCESAR ARCHIVOS CSD =====
    static async processCSDFiles(emisorData) {
        logSystem('Procesando archivos CSD', 'info');
        
        try {
            const result = {
                success: true,
                data: {}
            };
            
            // Procesar certificado (.cer)
            if (emisorData.certificado_file) {
                const certResult = await this.processCertificateFile(emisorData.certificado_file);
                if (!certResult.success) {
                    return { success: false, error: 'Error procesando certificado: ' + certResult.error };
                }
                
                result.data.certificado_pem = certResult.pem;
                result.data.no_certificado = certResult.serialNumber;
                result.data.vigencia_desde = certResult.validFrom;
                result.data.vigencia_hasta = certResult.validTo;
            }
            
            // Procesar llave privada (.key)
            if (emisorData.llave_privada_file && emisorData.password_llave) {
                const keyResult = await this.processPrivateKeyFile(
                    emisorData.llave_privada_file, 
                    emisorData.password_llave
                );
                
                if (!keyResult.success) {
                    return { success: false, error: 'Error procesando llave privada: ' + keyResult.error };
                }
                
                result.data.llave_privada_pem = keyResult.pem;
            }
            
            // Validar coincidencia certificado-llave si ambos están presentes
            if (result.data.certificado_pem && result.data.llave_privada_pem) {
                const matchResult = await this.validateCertificateKeyMatch(
                    result.data.certificado_pem,
                    result.data.llave_privada_pem
                );
                
                if (!matchResult.success) {
                    return { success: false, error: 'El certificado y la llave privada no coinciden' };
                }
            }
            
            logSystem('Archivos CSD procesados exitosamente', 'success');
            return result;
            
        } catch (error) {
            logSystem('Error procesando archivos CSD', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== PROCESAR ARCHIVO CERTIFICADO =====
    static async processCertificateFile(file) {
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Aquí iría la lógica real de procesamiento del certificado
            // Por ahora simulamos la respuesta
            return {
                success: true,
                pem: 'CERTIFICADO_PEM_PROCESADO',
                serialNumber: '20001000000300022815',
                validFrom: new Date().toISOString(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ===== PROCESAR ARCHIVO LLAVE PRIVADA =====
    static async processPrivateKeyFile(file, password) {
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Aquí iría la lógica real de procesamiento de la llave privada
            // Por ahora simulamos la respuesta
            return {
                success: true,
                pem: 'LLAVE_PRIVADA_PEM_PROCESADA'
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ===== VALIDAR COINCIDENCIA CERTIFICADO-LLAVE =====
    static async validateCertificateKeyMatch(certificatePem, privateKeyPem) {
        try {
            // Aquí iría la lógica real de validación
            // Por ahora simulamos que coinciden
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ===== UTILIDADES DE VALIDACIÓN =====
    static validateRFC(rfc) {
        // RFC para personas físicas: 4 letras + 6 dígitos + 3 caracteres
        // RFC para personas morales: 3 letras + 6 dígitos + 3 caracteres
        const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
        return rfcPattern.test(rfc.toUpperCase());
    }
    
    static validateCodigoPostal(cp) {
        // Código postal mexicano: 5 dígitos
        const cpPattern = /^[0-9]{5}$/;
        return cpPattern.test(cp);
    }
    
    static validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }
    
    // ===== UTILIDADES DE ARCHIVOS =====
    static readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    }
    
    // ===== EXPORTAR EMISORES =====
    static exportToCSV() {
        try {
            const headers = ['RFC', 'Razón Social', 'Código Postal', 'Régimen Fiscal', 'Estado', 'Fecha Registro'];
            const csvContent = [
                headers.join(','),
                ...emisores.map(emisor => [
                    emisor.rfc,
                    `"${emisor.razon_social}"`,
                    emisor.codigo_postal,
                    emisor.regimen_fiscal,
                    emisor.estado,
                    emisor.fecha_registro
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `emisores_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            logSystem('Emisores exportados a CSV', 'success');
            return { success: true };
            
        } catch (error) {
            logSystem('Error exportando emisores', 'error', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== ESTADÍSTICAS DE EMISORES =====
    static getStats() {
        const stats = {
            total: emisores.length,
            activos: emisores.filter(e => e.estado === 'activo').length,
            inactivos: emisores.filter(e => e.estado === 'inactivo').length,
            con_csd: emisores.filter(e => e.certificado_pem && e.llave_privada_pem).length,
            sin_csd: emisores.filter(e => !e.certificado_pem || !e.llave_privada_pem).length
        };
        
        return stats;
    }
}

// ===== INICIALIZACIÓN =====
if (typeof window !== 'undefined') {
    logSystem('Módulo CFDIEmisorService inicializado', 'success');
}
