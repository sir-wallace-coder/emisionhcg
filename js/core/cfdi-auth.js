/**
 * ===== SISTEMA CFDI PROFESIONAL - AUTENTICACIÓN =====
 * Gestión de autenticación y sesiones de usuario
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE AUTENTICACIÓN =====
class CFDIAuth {
    
    // ===== VERIFICACIÓN DE AUTENTICACIÓN =====
    static isAuthenticated() {
        const token = CFDIStorage.getAuthToken();
        const user = CFDIStorage.getCurrentUser();
        
        if (!token || !user) {
            isAuthenticated = false;
            return false;
        }
        
        // Verificar si el token no ha expirado (opcional)
        try {
            const payload = this.parseJWT(token);
            if (payload && payload.exp) {
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp < now) {
                    logSystem('Token expirado', 'warning');
                    this.logout();
                    return false;
                }
            }
        } catch (e) {
            logSystem('Error verificando token', 'warning', e);
        }
        
        isAuthenticated = true;
        currentUser = user;
        return true;
    }
    
    // ===== LOGIN =====
    static async login(email, password) {
        logSystem('Iniciando proceso de login', 'info', { email });
        
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'login',
                    email,
                    password
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                CFDIStorage.setAuthToken(result.token);
                CFDIStorage.setCurrentUser(result.user);
                
                isAuthenticated = true;
                currentUser = result.user;
                
                logSystem('Login exitoso', 'success', { email: result.user.email });
                return { success: true, user: result.user };
            } else {
                logSystem('Error en login', 'error', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            logSystem('Error de conexión en login', 'error', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
    
    // ===== REGISTRO =====
    static async register(userData) {
        logSystem('Iniciando proceso de registro', 'info', { email: userData.email });
        
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'register',
                    ...userData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                logSystem('Registro exitoso', 'success', { email: userData.email });
                return { success: true, message: 'Usuario registrado exitosamente' };
            } else {
                logSystem('Error en registro', 'error', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            logSystem('Error de conexión en registro', 'error', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
    
    // ===== LOGOUT =====
    static logout() {
        logSystem('Cerrando sesión', 'info', { email: currentUser?.email });
        
        CFDIStorage.clearUserData();
        isAuthenticated = false;
        currentUser = null;
        
        // Redirigir a login
        if (typeof window !== 'undefined') {
            window.location.href = '/login.html';
        }
        
        logSystem('Sesión cerrada exitosamente', 'success');
    }
    
    // ===== VERIFICACIÓN DE TOKEN =====
    static async verifyToken() {
        const token = CFDIStorage.getAuthToken();
        
        if (!token) {
            return false;
        }
        
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'verify'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                CFDIStorage.setCurrentUser(result.user);
                isAuthenticated = true;
                currentUser = result.user;
                return true;
            } else {
                this.logout();
                return false;
            }
            
        } catch (error) {
            logSystem('Error verificando token', 'error', error);
            return false;
        }
    }
    
    // ===== UTILIDADES JWT =====
    static parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }
    
    // ===== PROTECCIÓN DE RUTAS =====
    static requireAuth() {
        if (!this.isAuthenticated()) {
            logSystem('Acceso denegado - autenticación requerida', 'warning');
            
            if (typeof window !== 'undefined') {
                window.location.href = '/login.html';
            }
            
            return false;
        }
        
        return true;
    }
    
    // ===== CAMBIO DE CONTRASEÑA =====
    static async changePassword(currentPassword, newPassword) {
        const token = CFDIStorage.getAuthToken();
        
        if (!token) {
            return { success: false, error: 'No autenticado' };
        }
        
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'change_password',
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                logSystem('Contraseña cambiada exitosamente', 'success');
                return { success: true };
            } else {
                logSystem('Error cambiando contraseña', 'error', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            logSystem('Error de conexión cambiando contraseña', 'error', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
    
    // ===== RECUPERACIÓN DE CONTRASEÑA =====
    static async forgotPassword(email) {
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'forgot_password',
                    email
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                logSystem('Email de recuperación enviado', 'success', { email });
                return { success: true };
            } else {
                logSystem('Error enviando email de recuperación', 'error', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            logSystem('Error de conexión en recuperación', 'error', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
    
    // ===== ACTUALIZAR PERFIL =====
    static async updateProfile(profileData) {
        const token = CFDIStorage.getAuthToken();
        
        if (!token) {
            return { success: false, error: 'No autenticado' };
        }
        
        try {
            const response = await fetch(`${CFDI_CONFIG.apiBaseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'update_profile',
                    ...profileData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                CFDIStorage.setCurrentUser(result.user);
                currentUser = result.user;
                
                logSystem('Perfil actualizado exitosamente', 'success');
                return { success: true, user: result.user };
            } else {
                logSystem('Error actualizando perfil', 'error', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            logSystem('Error de conexión actualizando perfil', 'error', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
    
    // ===== MODO DESARROLLO =====
    static enableDevelopmentMode() {
        // Para desarrollo local sin backend
        const devUser = {
            id: 'dev-user',
            email: 'desarrollo@cfdi.local',
            nombre: 'Usuario Desarrollo',
            rol: 'admin'
        };
        
        const devToken = 'dev-token-' + Date.now();
        
        CFDIStorage.setAuthToken(devToken);
        CFDIStorage.setCurrentUser(devUser);
        
        isAuthenticated = true;
        currentUser = devUser;
        
        logSystem('Modo desarrollo activado', 'warning', devUser);
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    // Verificar autenticación al cargar
    CFDIAuth.isAuthenticated();
    logSystem('Módulo CFDIAuth inicializado', 'success');
}
