/**
 * ===== SISTEMA CFDI PROFESIONAL - DASHBOARD LOGS =====
 * Módulo de gestión de logs del sistema en el dashboard
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE LOGS DEL DASHBOARD =====
class CFDIDashboardLogs {
    
    static currentFilter = 'all';
    static autoScroll = true;
    
    // ===== RENDERIZAR TABLA DE LOGS =====
    static renderLogsTable() {
        logSystem('Renderizando tabla de logs', 'info');
        
        const logsContainer = document.getElementById('logsContainer');
        if (!logsContainer) {
            logSystem('Elemento logsContainer no encontrado', 'warning');
            return;
        }
        
        try {
            // Filtrar logs según el filtro actual
            const filteredLogs = this.getFilteredLogs();
            
            if (filteredLogs.length === 0) {
                logsContainer.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-list-alt fa-2x mb-2"></i><br>
                        No hay logs para mostrar
                    </div>
                `;
                return;
            }
            
            // Crear controles de logs si no existen
            this.createLogControls();
            
            let logsHTML = '';
            
            filteredLogs.forEach(log => {
                const timestamp = this.formatTimestamp(log.timestamp);
                const typeIcon = this.getTypeIcon(log.type);
                const typeClass = this.getTypeClass(log.type);
                
                logsHTML += `
                    <div class="log-entry ${typeClass}" data-type="${log.type}">
                        <div class="log-header">
                            <span class="log-icon">${typeIcon}</span>
                            <span class="log-timestamp">${timestamp}</span>
                            <span class="log-type badge badge-${typeClass}">${log.type.toUpperCase()}</span>
                        </div>
                        <div class="log-message">${this.escapeHtml(log.message)}</div>
                        ${log.data ? `<div class="log-data"><pre>${this.formatLogData(log.data)}</pre></div>` : ''}
                    </div>
                `;
            });
            
            const logsContentContainer = document.getElementById('logsContent') || this.createLogsContentContainer();
            logsContentContainer.innerHTML = logsHTML;
            
            // Auto-scroll si está habilitado
            if (this.autoScroll) {
                logsContentContainer.scrollTop = logsContentContainer.scrollHeight;
            }
            
            // Actualizar contador
            this.updateLogCounter(filteredLogs.length);
            
            logSystem('Tabla de logs renderizada exitosamente', 'success', { count: filteredLogs.length });
            
        } catch (error) {
            logSystem('Error renderizando tabla de logs', 'error', error);
            logsContainer.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                    Error cargando logs del sistema
                </div>
            `;
        }
    }
    
    // ===== CREAR CONTROLES DE LOGS =====
    static createLogControls() {
        const logsContainer = document.getElementById('logsContainer');
        if (!logsContainer || document.getElementById('logControls')) return;
        
        const controlsHTML = `
            <div id="logControls" class="log-controls mb-3">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <label class="form-label">Filtrar por tipo:</label>
                        <select id="logTypeFilter" class="form-select form-select-sm">
                            <option value="all">Todos los logs</option>
                            <option value="info">Información</option>
                            <option value="success">Éxito</option>
                            <option value="warning">Advertencias</option>
                            <option value="error">Errores</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Buscar en logs:</label>
                        <input type="text" id="logSearch" class="form-control form-control-sm" placeholder="Buscar mensaje...">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Opciones:</label>
                        <div class="d-flex gap-2">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="autoScrollLogs" checked>
                                <label class="form-check-label" for="autoScrollLogs">
                                    Auto-scroll
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-12">
                        <div class="log-stats">
                            <span id="logCounter" class="badge bg-primary">0 logs</span>
                            <span id="logStats" class="text-muted ms-2"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        logsContainer.insertAdjacentHTML('afterbegin', controlsHTML);
        
        // Event listeners para controles
        this.setupLogControlEvents();
    }
    
    // ===== CREAR CONTENEDOR DE LOGS =====
    static createLogsContentContainer() {
        const logsContainer = document.getElementById('logsContainer');
        
        const contentHTML = `
            <div id="logsContent" class="logs-content" style="max-height: 400px; overflow-y: auto; background: #f8f9fa; border-radius: 6px; padding: 15px;">
                <!-- Contenido de logs -->
            </div>
        `;
        
        logsContainer.insertAdjacentHTML('beforeend', contentHTML);
        return document.getElementById('logsContent');
    }
    
    // ===== CONFIGURAR EVENT LISTENERS =====
    static setupLogControlEvents() {
        // Filtro por tipo
        const typeFilter = document.getElementById('logTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderLogsTable();
            });
        }
        
        // Búsqueda
        const searchInput = document.getElementById('logSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchLogs(e.target.value);
                }, 300);
            });
        }
        
        // Auto-scroll
        const autoScrollCheck = document.getElementById('autoScrollLogs');
        if (autoScrollCheck) {
            autoScrollCheck.addEventListener('change', (e) => {
                this.autoScroll = e.target.checked;
            });
        }
    }
    
    // ===== OBTENER LOGS FILTRADOS =====
    static getFilteredLogs() {
        let filtered = [...systemLogs];
        
        // Filtrar por tipo
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(log => log.type === this.currentFilter);
        }
        
        // Filtrar por búsqueda si hay término de búsqueda activo
        const searchInput = document.getElementById('logSearch');
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(log => 
                log.message.toLowerCase().includes(searchTerm) ||
                (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
            );
        }
        
        // Ordenar por timestamp (más recientes primero)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return filtered;
    }
    
    // ===== BUSCAR EN LOGS =====
    static searchLogs(searchTerm) {
        logSystem(`Buscando en logs: "${searchTerm}"`, 'info');
        this.renderLogsTable();
    }
    
    // ===== LIMPIAR LOGS =====
    static async clearLogs() {
        const confirmed = await CFDIConfirm.show(
            '¿Está seguro de eliminar todos los logs del sistema?',
            'Confirmar limpieza de logs',
            { confirmText: 'Sí, limpiar', cancelText: 'Cancelar' }
        );
        
        if (confirmed) {
            systemLogs.length = 0;
            localStorage.removeItem(CFDI_CONFIG.storageKeys.logs);
            
            this.renderLogsTable();
            CFDIAlerts.success('Logs del sistema eliminados');
            
            // Agregar log de limpieza
            logSystem('Logs del sistema eliminados por el usuario', 'warning');
        }
    }
    
    // ===== EXPORTAR LOGS =====
    static exportLogs() {
        try {
            const filteredLogs = this.getFilteredLogs();
            
            if (filteredLogs.length === 0) {
                CFDIAlerts.warning('No hay logs para exportar');
                return;
            }
            
            // Crear contenido del archivo
            const exportData = {
                exportDate: new Date().toISOString(),
                totalLogs: filteredLogs.length,
                filter: this.currentFilter,
                logs: filteredLogs.map(log => ({
                    timestamp: log.timestamp,
                    type: log.type,
                    message: log.message,
                    data: log.data
                }))
            };
            
            // Crear archivo JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `cfdi-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            CFDIAlerts.success(`${filteredLogs.length} logs exportados exitosamente`);
            logSystem('Logs exportados', 'success', { count: filteredLogs.length });
            
        } catch (error) {
            CFDIAlerts.error('Error exportando logs');
            logSystem('Error exportando logs', 'error', error);
        }
    }
    
    // ===== EXPORTAR LOGS COMO CSV =====
    static exportLogsAsCSV() {
        try {
            const filteredLogs = this.getFilteredLogs();
            
            if (filteredLogs.length === 0) {
                CFDIAlerts.warning('No hay logs para exportar');
                return;
            }
            
            const headers = ['Timestamp', 'Tipo', 'Mensaje', 'Datos'];
            const csvContent = [
                headers.join(','),
                ...filteredLogs.map(log => [
                    `"${log.timestamp}"`,
                    log.type,
                    `"${log.message.replace(/"/g, '""')}"`,
                    `"${log.data ? JSON.stringify(log.data).replace(/"/g, '""') : ''}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `cfdi-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            CFDIAlerts.success(`${filteredLogs.length} logs exportados a CSV`);
            logSystem('Logs exportados a CSV', 'success', { count: filteredLogs.length });
            
        } catch (error) {
            CFDIAlerts.error('Error exportando logs a CSV');
            logSystem('Error exportando logs a CSV', 'error', error);
        }
    }
    
    // ===== ACTUALIZAR CONTADOR DE LOGS =====
    static updateLogCounter(count) {
        const counter = document.getElementById('logCounter');
        if (counter) {
            counter.textContent = `${count} logs`;
        }
        
        // Actualizar estadísticas
        const stats = document.getElementById('logStats');
        if (stats) {
            const typeStats = this.getLogTypeStats();
            stats.textContent = `Info: ${typeStats.info}, Éxito: ${typeStats.success}, Advertencias: ${typeStats.warning}, Errores: ${typeStats.error}`;
        }
    }
    
    // ===== OBTENER ESTADÍSTICAS POR TIPO =====
    static getLogTypeStats() {
        const stats = {
            info: 0,
            success: 0,
            warning: 0,
            error: 0
        };
        
        const filteredLogs = this.getFilteredLogs();
        filteredLogs.forEach(log => {
            if (stats.hasOwnProperty(log.type)) {
                stats[log.type]++;
            }
        });
        
        return stats;
    }
    
    // ===== UTILIDADES DE FORMATEO =====
    static formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return timestamp;
        }
    }
    
    static getTypeIcon(type) {
        const icons = {
            info: '<i class="fas fa-info-circle text-info"></i>',
            success: '<i class="fas fa-check-circle text-success"></i>',
            warning: '<i class="fas fa-exclamation-triangle text-warning"></i>',
            error: '<i class="fas fa-times-circle text-danger"></i>'
        };
        
        return icons[type] || '<i class="fas fa-circle text-muted"></i>';
    }
    
    static getTypeClass(type) {
        const classes = {
            info: 'info',
            success: 'success',
            warning: 'warning',
            error: 'error'
        };
        
        return classes[type] || 'secondary';
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    static formatLogData(data) {
        if (!data) return '';
        
        try {
            if (typeof data === 'object') {
                return JSON.stringify(data, null, 2);
            }
            return String(data);
        } catch (error) {
            return String(data);
        }
    }
    
    // ===== CONFIGURAR ACTUALIZACIÓN EN TIEMPO REAL =====
    static setupRealTimeUpdates() {
        // Observar cambios en systemLogs
        let lastLogCount = systemLogs.length;
        
        setInterval(() => {
            if (systemLogs.length !== lastLogCount) {
                this.renderLogsTable();
                lastLogCount = systemLogs.length;
            }
        }, 2000); // Verificar cada 2 segundos
    }
    
    // ===== FILTROS RÁPIDOS =====
    static showOnlyErrors() {
        this.currentFilter = 'error';
        const filterSelect = document.getElementById('logTypeFilter');
        if (filterSelect) {
            filterSelect.value = 'error';
        }
        this.renderLogsTable();
    }
    
    static showOnlyWarnings() {
        this.currentFilter = 'warning';
        const filterSelect = document.getElementById('logTypeFilter');
        if (filterSelect) {
            filterSelect.value = 'warning';
        }
        this.renderLogsTable();
    }
    
    static showAllLogs() {
        this.currentFilter = 'all';
        const filterSelect = document.getElementById('logTypeFilter');
        if (filterSelect) {
            filterSelect.value = 'all';
        }
        const searchInput = document.getElementById('logSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        this.renderLogsTable();
    }
    
    // ===== LIMPIAR LOGS POR TIPO =====
    static async clearLogsByType(type) {
        const confirmed = await CFDIConfirm.show(
            `¿Está seguro de eliminar todos los logs de tipo "${type}"?`,
            'Confirmar limpieza selectiva',
            { confirmText: 'Sí, eliminar', cancelText: 'Cancelar' }
        );
        
        if (confirmed) {
            const originalCount = systemLogs.length;
            systemLogs = systemLogs.filter(log => log.type !== type);
            const removedCount = originalCount - systemLogs.length;
            
            localStorage.setItem(CFDI_CONFIG.storageKeys.logs, JSON.stringify(systemLogs));
            
            this.renderLogsTable();
            CFDIAlerts.success(`${removedCount} logs de tipo "${type}" eliminados`);
            
            logSystem(`Logs de tipo "${type}" eliminados por el usuario`, 'warning', { removedCount });
        }
    }
    
    // ===== OBTENER RESUMEN DE LOGS =====
    static getLogsSummary() {
        const summary = {
            total: systemLogs.length,
            byType: this.getLogTypeStats(),
            lastHour: this.getLogsInLastHour(),
            lastDay: this.getLogsInLastDay(),
            oldestLog: systemLogs.length > 0 ? systemLogs[systemLogs.length - 1].timestamp : null,
            newestLog: systemLogs.length > 0 ? systemLogs[0].timestamp : null
        };
        
        return summary;
    }
    
    static getLogsInLastHour() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return systemLogs.filter(log => new Date(log.timestamp) > oneHourAgo).length;
    }
    
    static getLogsInLastDay() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return systemLogs.filter(log => new Date(log.timestamp) > oneDayAgo).length;
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Configurar actualizaciones en tiempo real
        CFDIDashboardLogs.setupRealTimeUpdates();
    });
    
    logSystem('Módulo CFDIDashboardLogs inicializado', 'success');
}
