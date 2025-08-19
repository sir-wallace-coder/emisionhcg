/**
 * ===== SISTEMA CFDI PROFESIONAL - DASHBOARD STATS =====
 * Módulo de estadísticas y métricas del dashboard
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE ESTADÍSTICAS DEL DASHBOARD =====
class CFDIDashboardStats {
    
    // ===== ACTUALIZAR TODAS LAS ESTADÍSTICAS =====
    static updateStats() {
        logSystem('Actualizando estadísticas del dashboard', 'info');
        
        try {
            // Calcular estadísticas
            const stats = this.calculateStats();
            
            // Actualizar elementos del DOM
            this.updateStatsDisplay(stats);
            
            logSystem('Estadísticas actualizadas exitosamente', 'success', stats);
            
        } catch (error) {
            logSystem('Error actualizando estadísticas', 'error', error);
        }
    }
    
    // ===== CALCULAR ESTADÍSTICAS =====
    static calculateStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Estadísticas de XMLs
        const totalXMLs = xmls.length;
        const xmlsThisMonth = xmls.filter(xml => {
            const xmlDate = new Date(xml.fecha_creacion || xml.fecha);
            return xmlDate >= startOfMonth;
        }).length;
        
        const xmlsByState = this.getXMLsByState();
        const xmlsThisWeek = this.getXMLsThisWeek();
        const xmlsToday = this.getXMLsToday();
        
        // Estadísticas de emisores
        const totalEmisores = emisores.length;
        const activeEmisores = emisores.filter(e => e.estado === 'activo').length;
        const emisoresWithCSD = emisores.filter(e => e.certificado_pem && e.llave_privada_pem).length;
        
        // Estadísticas de logs
        const totalLogs = systemLogs.length;
        const logsToday = this.getLogsToday();
        const logsByType = this.getLogsByType();
        
        // Estadísticas financieras
        const financialStats = this.calculateFinancialStats();
        
        return {
            // XMLs
            totalXMLs,
            xmlsThisMonth,
            xmlsThisWeek,
            xmlsToday,
            xmlsByState,
            
            // Emisores
            totalEmisores,
            activeEmisores,
            inactiveEmisores: totalEmisores - activeEmisores,
            emisoresWithCSD,
            emisoresWithoutCSD: totalEmisores - emisoresWithCSD,
            
            // Logs
            totalLogs,
            logsToday,
            logsByType,
            
            // Financiero
            ...financialStats
        };
    }
    
    // ===== ACTUALIZAR DISPLAY DE ESTADÍSTICAS =====
    static updateStatsDisplay(stats) {
        // Estadísticas principales
        this.updateElement('totalXMLs', stats.totalXMLs);
        this.updateElement('xmlsThisMonth', stats.xmlsThisMonth);
        this.updateElement('activeEmisores', stats.activeEmisores);
        this.updateElement('systemLogs', stats.totalLogs);
        
        // Estadísticas adicionales si existen los elementos
        this.updateElement('xmlsThisWeek', stats.xmlsThisWeek);
        this.updateElement('xmlsToday', stats.xmlsToday);
        this.updateElement('totalEmisores', stats.totalEmisores);
        this.updateElement('emisoresWithCSD', stats.emisoresWithCSD);
        this.updateElement('logsToday', stats.logsToday);
        
        // Actualizar gráficos si existen
        this.updateCharts(stats);
        
        // Actualizar badges de estado
        this.updateStateBadges(stats.xmlsByState);
    }
    
    // ===== UTILIDAD PARA ACTUALIZAR ELEMENTOS =====
    static updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Formatear número con animación
            this.animateNumber(element, parseInt(element.textContent) || 0, value);
        }
    }
    
    // ===== ANIMACIÓN DE NÚMEROS =====
    static animateNumber(element, from, to, duration = 1000) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + (to - from) * easeOut);
            
            element.textContent = this.formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // ===== FORMATEAR NÚMEROS =====
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    // ===== OBTENER XMLs POR ESTADO =====
    static getXMLsByState() {
        const states = {};
        
        Object.values(CFDI_STATES.XML_STATES).forEach(state => {
            states[state] = xmls.filter(xml => xml.estado === state).length;
        });
        
        return states;
    }
    
    // ===== OBTENER XMLs DE ESTA SEMANA =====
    static getXMLsThisWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        return xmls.filter(xml => {
            const xmlDate = new Date(xml.fecha_creacion || xml.fecha);
            return xmlDate >= startOfWeek;
        }).length;
    }
    
    // ===== OBTENER XMLs DE HOY =====
    static getXMLsToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        return xmls.filter(xml => {
            const xmlDate = new Date(xml.fecha_creacion || xml.fecha);
            return xmlDate >= today && xmlDate < tomorrow;
        }).length;
    }
    
    // ===== OBTENER LOGS DE HOY =====
    static getLogsToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return systemLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= today;
        }).length;
    }
    
    // ===== OBTENER LOGS POR TIPO =====
    static getLogsByType() {
        const types = {};
        
        Object.values(CFDI_STATES.ALERT_TYPES).forEach(type => {
            types[type] = systemLogs.filter(log => log.type === type).length;
        });
        
        return types;
    }
    
    // ===== CALCULAR ESTADÍSTICAS FINANCIERAS =====
    static calculateFinancialStats() {
        let totalAmount = 0;
        let totalThisMonth = 0;
        let averageAmount = 0;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        xmls.forEach(xml => {
            const amount = parseFloat(xml.total) || 0;
            totalAmount += amount;
            
            const xmlDate = new Date(xml.fecha_creacion || xml.fecha);
            if (xmlDate >= startOfMonth) {
                totalThisMonth += amount;
            }
        });
        
        if (xmls.length > 0) {
            averageAmount = totalAmount / xmls.length;
        }
        
        return {
            totalAmount: totalAmount,
            totalThisMonth: totalThisMonth,
            averageAmount: averageAmount,
            formattedTotalAmount: this.formatCurrency(totalAmount),
            formattedTotalThisMonth: this.formatCurrency(totalThisMonth),
            formattedAverageAmount: this.formatCurrency(averageAmount)
        };
    }
    
    // ===== FORMATEAR MONEDA =====
    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }
    
    // ===== ACTUALIZAR GRÁFICOS =====
    static updateCharts(stats) {
        // Actualizar gráfico de XMLs por estado si existe
        this.updateStateChart(stats.xmlsByState);
        
        // Actualizar gráfico de tendencias si existe
        this.updateTrendChart();
        
        // Actualizar gráfico de emisores si existe
        this.updateEmisorChart(stats);
    }
    
    // ===== ACTUALIZAR GRÁFICO DE ESTADOS =====
    static updateStateChart(xmlsByState) {
        const chartContainer = document.getElementById('stateChart');
        if (!chartContainer) return;
        
        // Crear gráfico simple con CSS
        const total = Object.values(xmlsByState).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
            chartContainer.innerHTML = '<div class="text-muted">No hay datos</div>';
            return;
        }
        
        let chartHTML = '<div class="state-chart">';
        
        Object.entries(xmlsByState).forEach(([state, count]) => {
            const percentage = (count / total * 100).toFixed(1);
            const badgeClass = this.getStateBadgeClass(state);
            
            chartHTML += `
                <div class="state-item">
                    <span class="badge badge-${badgeClass}">${state}</span>
                    <span class="count">${count}</span>
                    <span class="percentage">(${percentage}%)</span>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }
    
    // ===== ACTUALIZAR GRÁFICO DE TENDENCIAS =====
    static updateTrendChart() {
        const chartContainer = document.getElementById('trendChart');
        if (!chartContainer) return;
        
        // Obtener datos de los últimos 7 días
        const last7Days = this.getLast7DaysData();
        
        let chartHTML = '<div class="trend-chart">';
        
        last7Days.forEach((dayData, index) => {
            const height = dayData.count > 0 ? Math.max(20, (dayData.count / Math.max(...last7Days.map(d => d.count)) * 100)) : 5;
            
            chartHTML += `
                <div class="trend-bar" style="height: ${height}%" title="${dayData.date}: ${dayData.count} XMLs">
                    <div class="bar-fill"></div>
                    <div class="bar-label">${dayData.label}</div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }
    
    // ===== OBTENER DATOS DE ÚLTIMOS 7 DÍAS =====
    static getLast7DaysData() {
        const data = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            
            const count = xmls.filter(xml => {
                const xmlDate = new Date(xml.fecha_creacion || xml.fecha);
                return xmlDate >= date && xmlDate < nextDay;
            }).length;
            
            data.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('es-MX', { weekday: 'short' }),
                count: count
            });
        }
        
        return data;
    }
    
    // ===== ACTUALIZAR GRÁFICO DE EMISORES =====
    static updateEmisorChart(stats) {
        const chartContainer = document.getElementById('emisorChart');
        if (!chartContainer) return;
        
        const data = [
            { label: 'Con CSD', count: stats.emisoresWithCSD, color: 'success' },
            { label: 'Sin CSD', count: stats.emisoresWithoutCSD, color: 'warning' },
            { label: 'Activos', count: stats.activeEmisores, color: 'primary' },
            { label: 'Inactivos', count: stats.inactiveEmisores, color: 'secondary' }
        ];
        
        let chartHTML = '<div class="emisor-chart">';
        
        data.forEach(item => {
            chartHTML += `
                <div class="emisor-item">
                    <span class="badge badge-${item.color}">${item.label}</span>
                    <span class="count">${item.count}</span>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }
    
    // ===== ACTUALIZAR BADGES DE ESTADO =====
    static updateStateBadges(xmlsByState) {
        Object.entries(xmlsByState).forEach(([state, count]) => {
            const badgeElement = document.getElementById(`badge-${state}`);
            if (badgeElement) {
                badgeElement.textContent = count;
            }
        });
    }
    
    // ===== OBTENER CLASE DE BADGE POR ESTADO =====
    static getStateBadgeClass(estado) {
        const classes = {
            [CFDI_STATES.XML_STATES.BORRADOR]: 'secondary',
            [CFDI_STATES.XML_STATES.SELLADO]: 'primary',
            [CFDI_STATES.XML_STATES.TIMBRADO]: 'success',
            [CFDI_STATES.XML_STATES.CANCELADO]: 'danger'
        };
        
        return classes[estado] || 'secondary';
    }
    
    // ===== GENERAR REPORTE DE ESTADÍSTICAS =====
    static generateStatsReport() {
        const stats = this.calculateStats();
        
        const report = {
            timestamp: new Date().toISOString(),
            period: 'current',
            xmls: {
                total: stats.totalXMLs,
                thisMonth: stats.xmlsThisMonth,
                thisWeek: stats.xmlsThisWeek,
                today: stats.xmlsToday,
                byState: stats.xmlsByState
            },
            emisores: {
                total: stats.totalEmisores,
                active: stats.activeEmisores,
                withCSD: stats.emisoresWithCSD
            },
            financial: {
                totalAmount: stats.totalAmount,
                totalThisMonth: stats.totalThisMonth,
                averageAmount: stats.averageAmount
            },
            logs: {
                total: stats.totalLogs,
                today: stats.logsToday,
                byType: stats.logsByType
            }
        };
        
        logSystem('Reporte de estadísticas generado', 'info', report);
        return report;
    }
    
    // ===== EXPORTAR ESTADÍSTICAS =====
    static exportStats() {
        try {
            const report = this.generateStatsReport();
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `cfdi-stats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            CFDIAlerts.success('Estadísticas exportadas exitosamente');
            logSystem('Estadísticas exportadas', 'success');
            
        } catch (error) {
            CFDIAlerts.error('Error exportando estadísticas');
            logSystem('Error exportando estadísticas', 'error', error);
        }
    }
    
    // ===== PROGRAMAR ACTUALIZACIÓN AUTOMÁTICA =====
    static scheduleAutoUpdate(intervalMinutes = 5) {
        setInterval(() => {
            this.updateStats();
        }, intervalMinutes * 60 * 1000);
        
        logSystem(`Actualización automática programada cada ${intervalMinutes} minutos`, 'info');
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    // Programar actualización automática
    document.addEventListener('DOMContentLoaded', () => {
        CFDIDashboardStats.scheduleAutoUpdate(5);
    });
    
    logSystem('Módulo CFDIDashboardStats inicializado', 'success');
}
