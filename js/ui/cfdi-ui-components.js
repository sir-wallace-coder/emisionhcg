/**
 * ===== SISTEMA CFDI PROFESIONAL - UI COMPONENTS =====
 * Componentes de interfaz de usuario (modales, alertas, etc.)
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE ALERTAS =====
class CFDIAlerts {
    
    static show(message, type = 'info', duration = CFDI_CONFIG.ui.alertDuration) {
        logSystem(`Mostrando alerta: ${message}`, 'info', { type });
        
        // Crear elemento de alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `cfdi-alert cfdi-alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px 20px;
            border-radius: 8px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: cfdiSlideIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        // Estilos según tipo
        const styles = {
            'success': 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            'error': 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            'warning': 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            'info': 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };
        
        alertDiv.style.cssText += styles[type] || styles['info'];
        
        // Iconos según tipo
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <span style="margin-right: 8px; font-size: 16px;">${icons[type] || icons['info']}</span>
                    <span>${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px; opacity: 0.7;"
                        onmouseover="this.style.opacity='1'" 
                        onmouseout="this.style.opacity='0.7'">&times;</button>
            </div>
        `;
        
        // Agregar estilos de animación si no existen
        this.addAnimationStyles();
        
        // Agregar al DOM
        document.body.appendChild(alertDiv);
        
        // Auto-remover después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.style.animation = 'cfdiSlideOut 0.3s ease-in';
                    setTimeout(() => alertDiv.remove(), 300);
                }
            }, duration);
        }
        
        return alertDiv;
    }
    
    static success(message, duration) {
        return this.show(message, 'success', duration);
    }
    
    static error(message, duration) {
        return this.show(message, 'error', duration);
    }
    
    static warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
    
    static info(message, duration) {
        return this.show(message, 'info', duration);
    }
    
    static addAnimationStyles() {
        if (document.getElementById('cfdi-alert-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cfdi-alert-styles';
        style.textContent = `
            @keyframes cfdiSlideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes cfdiSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// ===== GESTIÓN DE MODALES =====
class CFDIModals {
    
    static create(id, title, content, options = {}) {
        // Remover modal existente si existe
        const existingModal = document.getElementById(id);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'cfdi-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            animation: cfdiModalFadeIn 0.3s ease-out;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'cfdi-modal-content';
        modalContent.style.cssText = `
            background-color: #fefefe;
            margin: 5% auto;
            padding: 0;
            border-radius: 8px;
            width: ${options.width || '80%'};
            max-width: ${options.maxWidth || '600px'};
            max-height: ${options.maxHeight || '80vh'};
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: cfdiModalSlideIn 0.3s ease-out;
        `;
        
        const header = document.createElement('div');
        header.className = 'cfdi-modal-header';
        header.style.cssText = `
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const titleElement = document.createElement('h2');
        titleElement.style.cssText = 'margin: 0; color: #333; font-size: 18px;';
        titleElement.innerHTML = title;
        
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            line-height: 1;
        `;
        closeButton.onclick = () => this.close(id);
        
        header.appendChild(titleElement);
        header.appendChild(closeButton);
        
        const body = document.createElement('div');
        body.className = 'cfdi-modal-body';
        body.style.cssText = 'padding: 20px;';
        body.innerHTML = content;
        
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(modalContent);
        
        // Cerrar al hacer clic fuera del modal
        modal.onclick = (event) => {
            if (event.target === modal) {
                this.close(id);
            }
        };
        
        // Agregar estilos de animación
        this.addModalStyles();
        
        document.body.appendChild(modal);
        
        logSystem(`Modal creado: ${id}`, 'info');
        return modal;
    }
    
    static show(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            logSystem(`Modal mostrado: ${id}`, 'info');
        }
    }
    
    static close(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.animation = 'cfdiModalFadeOut 0.3s ease-in';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
            logSystem(`Modal cerrado: ${id}`, 'info');
        }
    }
    
    static remove(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
            logSystem(`Modal eliminado: ${id}`, 'info');
        }
    }
    
    static addModalStyles() {
        if (document.getElementById('cfdi-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cfdi-modal-styles';
        style.textContent = `
            @keyframes cfdiModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes cfdiModalFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes cfdiModalSlideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// ===== GESTIÓN DE LOADING =====
class CFDILoading {
    
    static show(message = 'Cargando...', container = document.body) {
        this.hide(); // Remover loading existente
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'cfdi-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            animation: cfdiLoadingFadeIn 0.3s ease-out;
        `;
        
        loadingDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: cfdiSpin 1s linear infinite; margin: 0 auto 15px;"></div>
                <div style="color: #666; font-size: 14px;">${message}</div>
            </div>
        `;
        
        this.addLoadingStyles();
        container.appendChild(loadingDiv);
        
        logSystem(`Loading mostrado: ${message}`, 'info');
    }
    
    static hide() {
        const loading = document.getElementById('cfdi-loading');
        if (loading) {
            loading.style.animation = 'cfdiLoadingFadeOut 0.3s ease-in';
            setTimeout(() => loading.remove(), 300);
            logSystem('Loading ocultado', 'info');
        }
    }
    
    static addLoadingStyles() {
        if (document.getElementById('cfdi-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cfdi-loading-styles';
        style.textContent = `
            @keyframes cfdiSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes cfdiLoadingFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes cfdiLoadingFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// ===== GESTIÓN DE CONFIRMACIONES =====
class CFDIConfirm {
    
    static show(message, title = 'Confirmar', options = {}) {
        return new Promise((resolve) => {
            const modalId = 'cfdi-confirm-modal';
            
            const content = `
                <div style="margin-bottom: 20px; color: #666; line-height: 1.5;">
                    ${message}
                </div>
                <div style="text-align: right;">
                    <button id="cfdi-confirm-cancel" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
                        ${options.cancelText || 'Cancelar'}
                    </button>
                    <button id="cfdi-confirm-ok" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                        ${options.confirmText || 'Confirmar'}
                    </button>
                </div>
            `;
            
            CFDIModals.create(modalId, title, content, { width: '400px', maxWidth: '90%' });
            CFDIModals.show(modalId);
            
            // Event listeners
            document.getElementById('cfdi-confirm-ok').onclick = () => {
                CFDIModals.close(modalId);
                setTimeout(() => CFDIModals.remove(modalId), 300);
                resolve(true);
            };
            
            document.getElementById('cfdi-confirm-cancel').onclick = () => {
                CFDIModals.close(modalId);
                setTimeout(() => CFDIModals.remove(modalId), 300);
                resolve(false);
            };
        });
    }
}

// ===== UTILIDADES DE CLIPBOARD =====
class CFDIClipboard {
    
    static async copy(text, showAlert = true) {
        try {
            await navigator.clipboard.writeText(text);
            
            if (showAlert) {
                CFDIAlerts.success('✅ Copiado al portapapeles');
            }
            
            logSystem('Texto copiado al portapapeles', 'success');
            return true;
        } catch (error) {
            if (showAlert) {
                CFDIAlerts.error('❌ Error copiando al portapapeles');
            }
            
            logSystem('Error copiando al portapapeles', 'error', error);
            return false;
        }
    }
}

// ===== FUNCIONES GLOBALES PARA COMPATIBILIDAD =====
function showAlert(message, type = 'info') {
    CFDIAlerts.show(message, type);
}

function copyToClipboard(text) {
    CFDIClipboard.copy(text);
}

// ===== INICIALIZACIÓN =====
if (typeof window !== 'undefined') {
    logSystem('Módulo CFDIUIComponents inicializado', 'success');
}
