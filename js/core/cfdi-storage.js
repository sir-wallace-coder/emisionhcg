/**
 * ===== SISTEMA CFDI PROFESIONAL - STORAGE =====
 * Gestión de almacenamiento de datos (localStorage y BD)
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE ALMACENAMIENTO =====
class CFDIStorage {
    
    // ===== MÉTODOS PARA XMLs =====
    static async loadXMLs() {
        logSystem('Cargando XMLs desde almacenamiento', 'info');
        
        try {
            // Intentar cargar desde múltiples claves para compatibilidad
            const keys = [
                CFDI_CONFIG.storageKeys.xmls,
                'xmls',
                'cfdi_xmls'
            ];
            
            let loadedXMLs = [];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            loadedXMLs = parsed;
                            logSystem(`XMLs cargados desde clave: ${key}`, 'success', { count: parsed.length });
                            break;
                        }
                    } catch (e) {
                        logSystem(`Error parseando XMLs desde ${key}`, 'warning', e);
                    }
                }
            }
            
            // Actualizar variables globales
            xmls = loadedXMLs;
            todosLosXMLs = [...loadedXMLs];
            xmlsFiltrados = [...loadedXMLs];
            
            logSystem('XMLs cargados exitosamente', 'success', { total: xmls.length });
            return xmls;
            
        } catch (error) {
            logSystem('Error cargando XMLs', 'error', error);
            return [];
        }
    }
    
    static saveXMLs(xmlsData = xmls) {
        try {
            localStorage.setItem(CFDI_CONFIG.storageKeys.xmls, JSON.stringify(xmlsData));
            logSystem('XMLs guardados exitosamente', 'success', { count: xmlsData.length });
            return true;
        } catch (error) {
            logSystem('Error guardando XMLs', 'error', error);
            return false;
        }
    }
    
    static addXML(xmlData) {
        try {
            // Generar ID único si no existe
            if (!xmlData.id) {
                xmlData.id = Date.now() + Math.random().toString(36).substr(2, 9);
            }
            
            // Agregar timestamp si no existe
            if (!xmlData.fecha_creacion) {
                xmlData.fecha_creacion = new Date().toISOString();
            }
            
            xmls.unshift(xmlData);
            todosLosXMLs = [...xmls];
            xmlsFiltrados = [...xmls];
            
            this.saveXMLs();
            logSystem('XML agregado exitosamente', 'success', { id: xmlData.id, serie: xmlData.serie, folio: xmlData.folio });
            
            return xmlData;
        } catch (error) {
            logSystem('Error agregando XML', 'error', error);
            return null;
        }
    }
    
    static updateXML(xmlId, updatedData) {
        try {
            const index = xmls.findIndex(x => x.id === xmlId);
            if (index === -1) {
                logSystem('XML no encontrado para actualizar', 'warning', { id: xmlId });
                return false;
            }
            
            xmls[index] = { ...xmls[index], ...updatedData };
            todosLosXMLs = [...xmls];
            xmlsFiltrados = [...xmls];
            
            this.saveXMLs();
            logSystem('XML actualizado exitosamente', 'success', { id: xmlId });
            
            return true;
        } catch (error) {
            logSystem('Error actualizando XML', 'error', error);
            return false;
        }
    }
    
    static deleteXML(xmlId) {
        try {
            const index = xmls.findIndex(x => x.id === xmlId);
            if (index === -1) {
                logSystem('XML no encontrado para eliminar', 'warning', { id: xmlId });
                return false;
            }
            
            const deletedXML = xmls.splice(index, 1)[0];
            todosLosXMLs = [...xmls];
            xmlsFiltrados = [...xmls];
            
            this.saveXMLs();
            logSystem('XML eliminado exitosamente', 'success', { id: xmlId, serie: deletedXML.serie, folio: deletedXML.folio });
            
            return true;
        } catch (error) {
            logSystem('Error eliminando XML', 'error', error);
            return false;
        }
    }
    
    // ===== MÉTODOS PARA EMISORES =====
    static async loadEmisores() {
        logSystem('Cargando emisores desde almacenamiento', 'info');
        
        try {
            // Intentar cargar desde múltiples claves para compatibilidad
            const keys = [
                CFDI_CONFIG.storageKeys.emisores,
                'emisores',
                'cfdi_emisores'
            ];
            
            let loadedEmisores = [];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            loadedEmisores = parsed;
                            logSystem(`Emisores cargados desde clave: ${key}`, 'success', { count: parsed.length });
                            break;
                        }
                    } catch (e) {
                        logSystem(`Error parseando emisores desde ${key}`, 'warning', e);
                    }
                }
            }
            
            // Actualizar variable global
            emisores = loadedEmisores;
            
            logSystem('Emisores cargados exitosamente', 'success', { total: emisores.length });
            return emisores;
            
        } catch (error) {
            logSystem('Error cargando emisores', 'error', error);
            return [];
        }
    }
    
    static saveEmisores(emisoresData = emisores) {
        try {
            localStorage.setItem(CFDI_CONFIG.storageKeys.emisores, JSON.stringify(emisoresData));
            logSystem('Emisores guardados exitosamente', 'success', { count: emisoresData.length });
            return true;
        } catch (error) {
            logSystem('Error guardando emisores', 'error', error);
            return false;
        }
    }
    
    static addEmisor(emisorData) {
        try {
            // Generar ID único si no existe
            if (!emisorData.id) {
                emisorData.id = Date.now() + Math.random().toString(36).substr(2, 9);
            }
            
            // Agregar timestamp si no existe
            if (!emisorData.fecha_registro) {
                emisorData.fecha_registro = new Date().toISOString();
            }
            
            emisores.unshift(emisorData);
            this.saveEmisores();
            
            logSystem('Emisor agregado exitosamente', 'success', { id: emisorData.id, rfc: emisorData.rfc });
            return emisorData;
        } catch (error) {
            logSystem('Error agregando emisor', 'error', error);
            return null;
        }
    }
    
    static updateEmisor(emisorId, updatedData) {
        try {
            const index = emisores.findIndex(e => e.id === emisorId);
            if (index === -1) {
                logSystem('Emisor no encontrado para actualizar', 'warning', { id: emisorId });
                return false;
            }
            
            emisores[index] = { ...emisores[index], ...updatedData };
            this.saveEmisores();
            
            logSystem('Emisor actualizado exitosamente', 'success', { id: emisorId });
            return true;
        } catch (error) {
            logSystem('Error actualizando emisor', 'error', error);
            return false;
        }
    }
    
    static deleteEmisor(emisorId) {
        try {
            const index = emisores.findIndex(e => e.id === emisorId);
            if (index === -1) {
                logSystem('Emisor no encontrado para eliminar', 'warning', { id: emisorId });
                return false;
            }
            
            const deletedEmisor = emisores.splice(index, 1)[0];
            this.saveEmisores();
            
            logSystem('Emisor eliminado exitosamente', 'success', { id: emisorId, rfc: deletedEmisor.rfc });
            return true;
        } catch (error) {
            logSystem('Error eliminando emisor', 'error', error);
            return false;
        }
    }
    
    // ===== MÉTODOS PARA AUTENTICACIÓN =====
    static getAuthToken() {
        return localStorage.getItem(CFDI_CONFIG.storageKeys.token);
    }
    
    static setAuthToken(token) {
        localStorage.setItem(CFDI_CONFIG.storageKeys.token, token);
        logSystem('Token de autenticación guardado', 'info');
    }
    
    static removeAuthToken() {
        localStorage.removeItem(CFDI_CONFIG.storageKeys.token);
        logSystem('Token de autenticación eliminado', 'info');
    }
    
    static getCurrentUser() {
        const userData = localStorage.getItem(CFDI_CONFIG.storageKeys.user);
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                logSystem('Error parseando datos de usuario', 'error', e);
                return null;
            }
        }
        return null;
    }
    
    static setCurrentUser(userData) {
        localStorage.setItem(CFDI_CONFIG.storageKeys.user, JSON.stringify(userData));
        currentUser = userData;
        logSystem('Datos de usuario guardados', 'info', { email: userData?.email });
    }
    
    static clearUserData() {
        this.removeAuthToken();
        localStorage.removeItem(CFDI_CONFIG.storageKeys.user);
        currentUser = null;
        logSystem('Datos de usuario eliminados', 'info');
    }
    
    // ===== MÉTODOS GENERALES =====
    static clearAllData() {
        const keys = Object.values(CFDI_CONFIG.storageKeys);
        keys.forEach(key => localStorage.removeItem(key));
        
        // Resetear variables globales
        xmls = [];
        emisores = [];
        todosLosXMLs = [];
        xmlsFiltrados = [];
        systemLogs = [];
        currentUser = null;
        
        logSystem('Todos los datos eliminados', 'warning');
    }
    
    static exportData() {
        try {
            const exportData = {
                xmls: xmls,
                emisores: emisores,
                logs: systemLogs,
                exportDate: new Date().toISOString(),
                version: CFDI_CONFIG.version
            };
            
            logSystem('Datos exportados exitosamente', 'success');
            return exportData;
        } catch (error) {
            logSystem('Error exportando datos', 'error', error);
            return null;
        }
    }
    
    static async importData(importData) {
        try {
            if (importData.xmls && Array.isArray(importData.xmls)) {
                xmls = importData.xmls;
                this.saveXMLs();
            }
            
            if (importData.emisores && Array.isArray(importData.emisores)) {
                emisores = importData.emisores;
                this.saveEmisores();
            }
            
            logSystem('Datos importados exitosamente', 'success', { 
                xmls: importData.xmls?.length || 0,
                emisores: importData.emisores?.length || 0
            });
            
            return true;
        } catch (error) {
            logSystem('Error importando datos', 'error', error);
            return false;
        }
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    logSystem('Módulo CFDIStorage inicializado', 'success');
}
