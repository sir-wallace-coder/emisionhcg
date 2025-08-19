/**
 * ===== SISTEMA CFDI PROFESIONAL - DASHBOARD CONTROLLER =====
 * Controlador principal del dashboard CFDI
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== CONTROLADOR PRINCIPAL DEL DASHBOARD =====
class CFDIDashboardMain {
    
    constructor() {
        this.currentTab = 'xmls';
        this.initialized = false;
    }
    
    // ===== INICIALIZACIÓN =====
    async initialize() {
        logSystem('Inicializando Dashboard Principal', 'info');
        
        try {
            // Verificar autenticación
            if (!CFDIAuth.isAuthenticated()) {
                window.location.href = 'login.html';
                return false;
            }
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Renderizar interfaz inicial
            this.renderInitialUI();
            
            // Actualizar estadísticas
            this.updateStats();
            
            this.initialized = true;
            logSystem('Dashboard Principal inicializado exitosamente', 'success');
            
            return true;
            
        } catch (error) {
            logSystem('Error inicializando Dashboard Principal', 'error', error);
            CFDIAlerts.error('Error inicializando el dashboard');
            return false;
        }
    }
    
    // ===== CARGAR DATOS INICIALES =====
    async loadInitialData() {
        logSystem('Cargando datos iniciales del dashboard', 'info');
        
        try {
            // Solo usar datos de base de datos (sin localStorage)
            xmls = [];
            logSystem('Dashboard clean configurado para usar solo datos de BD (sin localStorage)', 'info');
            logSystem('No hay XMLs guardados, inicializando array vacío', 'info');
            
            // Solo usar datos de base de datos (sin localStorage)
            emisores = [];
            logSystem('Emisores configurados para usar solo datos de BD (sin localStorage)', 'info');
            logSystem('No hay emisores guardados, inicializando array vacío', 'info');
            
            // Cargar logs del sistema
            const savedLogs = localStorage.getItem(CFDI_CONFIG.storageKeys.logs);
            if (savedLogs) {
                try {
                    systemLogs = JSON.parse(savedLogs);
                    logSystem('Logs del sistema cargados', 'success', { count: systemLogs.length });
                } catch (e) {
                    systemLogs = [];
                    logSystem('Error cargando logs guardados', 'warning', e);
                }
            } else {
                systemLogs = [];
            }
            
        } catch (error) {
            logSystem('Error cargando datos iniciales', 'error', error);
            throw error;
        }
    }
    
    // ===== CONFIGURAR EVENT LISTENERS =====
    setupEventListeners() {
        logSystem('Configurando event listeners', 'info');
        
        // Filtros de XMLs
        const filtroFecha = document.getElementById('filtroFecha');
        if (filtroFecha) {
            filtroFecha.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const filtroEmisor = document.getElementById('filtroEmisor');
        if (filtroEmisor) {
            filtroEmisor.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const filtroEstado = document.getElementById('filtroEstado');
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const filtroVersion = document.getElementById('filtroVersion');
        if (filtroVersion) {
            filtroVersion.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const busquedaGeneral = document.getElementById('busquedaGeneral');
        if (busquedaGeneral) {
            busquedaGeneral.addEventListener('input', () => this.buscarEnTiempoReal());
        }
        
        const totalMin = document.getElementById('totalMin');
        if (totalMin) {
            totalMin.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const totalMax = document.getElementById('totalMax');
        if (totalMax) {
            totalMax.addEventListener('change', () => this.aplicarFiltros());
        }
        
        // Fechas personalizadas
        const fechaDesde = document.getElementById('fechaDesde');
        if (fechaDesde) {
            fechaDesde.addEventListener('change', () => this.aplicarFiltros());
        }
        
        const fechaHasta = document.getElementById('fechaHasta');
        if (fechaHasta) {
            fechaHasta.addEventListener('change', () => this.aplicarFiltros());
        }
        
        // Mostrar/ocultar campos de fecha personalizada
        if (filtroFecha) {
            filtroFecha.addEventListener('change', (e) => {
                const fechaPersonalizadaGroup = document.getElementById('fechaPersonalizadaGroup');
                const fechaPersonalizadaGroup2 = document.getElementById('fechaPersonalizadaGroup2');
                
                if (e.target.value === 'personalizado') {
                    if (fechaPersonalizadaGroup) fechaPersonalizadaGroup.style.display = 'block';
                    if (fechaPersonalizadaGroup2) fechaPersonalizadaGroup2.style.display = 'block';
                } else {
                    if (fechaPersonalizadaGroup) fechaPersonalizadaGroup.style.display = 'none';
                    if (fechaPersonalizadaGroup2) fechaPersonalizadaGroup2.style.display = 'none';
                }
            });
        }
        
        logSystem('Event listeners configurados', 'success');
    }
    
    // ===== RENDERIZAR INTERFAZ INICIAL =====
    renderInitialUI() {
        logSystem('Renderizando interfaz inicial', 'info');
        
        // Actualizar información de usuario
        this.updateUserInfo();
        
        // Renderizar datos iniciales
        this.renderAllData();
        
        // Mostrar tab inicial
        this.showTab(this.currentTab);
    }
    
    // ===== RENDERIZAR TODOS LOS DATOS =====
    renderAllData() {
        logSystem('Renderizando todos los datos', 'info');
        
        // Renderizar XMLs
        this.renderXMLsTable();
        
        // Renderizar emisores
        this.renderEmisoresTable();
        
        // Renderizar logs
        if (typeof CFDIDashboardLogs !== 'undefined') {
            CFDIDashboardLogs.renderLogsTable();
        }
        
        // Cargar emisores en filtro
        this.loadEmisoresInFilter();
        
        // Configurar filtro por defecto
        const filtroFecha = document.getElementById('filtroFecha');
        if (filtroFecha && filtroFecha.value !== 'todos') {
            filtroFecha.value = 'todos';
        }
    }
    
    // ===== RENDERIZAR TABLA DE XMLS =====
    renderXMLsTable() {
        logSystem('Renderizando tabla de XMLs', 'info');
        
        const xmlsContent = document.getElementById('xmlsContent');
        if (!xmlsContent) {
            logSystem('Elemento xmlsContent no encontrado', 'warning');
            return;
        }
        
        if (!xmls || xmls.length === 0) {
            xmlsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice fa-4x"></i>
                    <h4>No hay XMLs generados</h4>
                    <p>Comienza generando tu primer comprobante CFDI</p>
                    <a href="generator.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Generar Nuevo XML
                    </a>
                </div>
            `;
            return;
        }
        
        // Crear tabla
        let tableHTML = `
            <div class="table-container">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Serie-Folio</th>
                            <th>Emisor</th>
                            <th>Receptor</th>
                            <th>Total</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Versión</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        xmls.forEach(xml => {
            const fecha = this.formatearFecha(xml.fecha || xml.timestamp);
            const estado = xml.estado || 'generado';
            const version = xml.version || '4.0';
            const total = parseFloat(xml.total || 0).toFixed(2);
            
            tableHTML += `
                <tr>
                    <td>
                        <span class="folio-editable" onclick="editarFolio('${xml.id}')">
                            ${xml.serie || 'A'}-${xml.folio || '1'}
                        </span>
                    </td>
                    <td>
                        <strong>${xml.emisor_nombre || 'N/A'}</strong><br>
                        <small class="text-muted">${xml.emisor_rfc || 'N/A'}</small>
                    </td>
                    <td>
                        <strong>${xml.receptor_nombre || 'N/A'}</strong><br>
                        <small class="text-muted">${xml.receptor_rfc || 'N/A'}</small>
                    </td>
                    <td>$${total}</td>
                    <td>${fecha}</td>
                    <td>
                        <span class="badge ${this.getEstadoBadgeClass(estado)}">${estado}</span>
                    </td>
                    <td>CFDI ${version}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewXML('${xml.id}')" title="Ver XML">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="editXML('${xml.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="downloadXML('${xml.id}')" title="Descargar">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteXML('${xml.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        xmlsContent.innerHTML = tableHTML;
        
        logSystem('Tabla de XMLs renderizada', 'success', { count: xmls.length });
    }
    
    // ===== RENDERIZAR TABLA DE EMISORES =====
    renderEmisoresTable() {
        logSystem('Renderizando tabla de emisores', 'info');
        
        const emisoresContent = document.getElementById('emisoresContent');
        if (!emisoresContent) {
            logSystem('Elemento emisoresContent no encontrado', 'warning');
            return;
        }
        
        if (!emisores || emisores.length === 0) {
            emisoresContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building fa-4x"></i>
                    <h4>No hay emisores registrados</h4>
                    <p>Registra tu primera empresa emisora</p>
                    <button class="btn btn-primary" onclick="openEmisorModal()">
                        <i class="fas fa-plus"></i> Nuevo Emisor
                    </button>
                </div>
            `;
            return;
        }
        
        // Crear tabla
        let tableHTML = `
            <div class="table-container">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Razón Social</th>
                            <th>RFC</th>
                            <th>Código Postal</th>
                            <th>Régimen Fiscal</th>
                            <th>CSD</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        emisores.forEach(emisor => {
            const tieneCSD = emisor.certificado_cer && emisor.certificado_key;
            
            tableHTML += `
                <tr>
                    <td><strong>${emisor.razon_social}</strong></td>
                    <td>${emisor.rfc}</td>
                    <td>${emisor.codigo_postal}</td>
                    <td>${emisor.regimen_fiscal}</td>
                    <td>
                        <span class="badge ${tieneCSD ? 'bg-success' : 'bg-warning'}">
                            ${tieneCSD ? 'Configurado' : 'Pendiente'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editEmisor('${emisor.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteEmisor('${emisor.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        emisoresContent.innerHTML = tableHTML;
        
        logSystem('Tabla de emisores renderizada', 'success', { count: emisores.length });
    }
    
    // ===== CARGAR EMISORES EN FILTRO =====
    loadEmisoresInFilter() {
        const filtroEmisor = document.getElementById('filtroEmisor');
        if (!filtroEmisor) return;
        
        // Limpiar opciones existentes excepto "Todos"
        filtroEmisor.innerHTML = '<option value="todos">Todos los emisores</option>';
        
        // Agregar emisores
        emisores.forEach(emisor => {
            const option = document.createElement('option');
            option.value = emisor.id;
            option.textContent = `${emisor.razon_social} (${emisor.rfc})`;
            filtroEmisor.appendChild(option);
        });
    }
    
    // ===== ACTUALIZAR INFORMACIÓN DE USUARIO =====
    updateUserInfo() {
        const userWelcome = document.getElementById('userWelcome');
        if (userWelcome) {
            const user = CFDIAuth.getCurrentUser();
            if (user) {
                userWelcome.textContent = `Bienvenido, ${user.nombre || user.email}`;
            } else {
                userWelcome.textContent = 'Usuario';
            }
        }
    }
    
    // ===== ACTUALIZAR ESTADÍSTICAS =====
    updateStats() {
        logSystem('Actualizando estadísticas', 'info');
        
        // Total XMLs
        const totalXMLsEl = document.getElementById('totalXMLs');
        if (totalXMLsEl) {
            totalXMLsEl.textContent = xmls.length;
        }
        
        // XMLs este mes
        const xmlsEsteMesEl = document.getElementById('xmlsEsteMes');
        if (xmlsEsteMesEl) {
            const esteMes = this.contarXMLsEsteMes();
            xmlsEsteMesEl.textContent = esteMes;
        }
        
        // Emisores activos
        const emisoresActivosEl = document.getElementById('emisoresActivos');
        if (emisoresActivosEl) {
            emisoresActivosEl.textContent = emisores.length;
        }
        
        // XMLs sellados
        const xmlsSelladosEl = document.getElementById('xmlsSellados');
        if (xmlsSelladosEl) {
            const sellados = xmls.filter(xml => xml.estado === 'sellado').length;
            xmlsSelladosEl.textContent = sellados;
        }
        
        logSystem('Estadísticas actualizadas', 'success');
    }
    
    // ===== CONTAR XMLS ESTE MES =====
    contarXMLsEsteMes() {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        
        return xmls.filter(xml => {
            const fechaXML = new Date(xml.fecha || xml.timestamp);
            return fechaXML >= inicioMes;
        }).length;
    }
    
    // ===== MOSTRAR TAB =====
    showTab(tabName) {
        logSystem(`Mostrando tab: ${tabName}`, 'info');
        
        // Actualizar tab actual
        this.currentTab = tabName;
        
        // Ocultar todos los tabs
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // Mostrar tab seleccionado
        const selectedTab = document.getElementById(`${tabName}Tab`);
        if (selectedTab) {
            selectedTab.classList.add('show', 'active');
        }
        
        // Actualizar navegación
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        const activeNavLink = document.querySelector(`[href="#${tabName}Tab"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }
        
        // Renderizar contenido específico del tab
        if (tabName === 'logs' && typeof CFDIDashboardLogs !== 'undefined') {
            CFDIDashboardLogs.renderLogsTable();
        }
    }
    
    // ===== APLICAR FILTROS =====
    aplicarFiltros() {
        logSystem('Aplicando filtros', 'info');
        
        let xmlsFiltrados = [...xmls];
        
        // Filtro por fecha
        const filtroFecha = document.getElementById('filtroFecha');
        if (filtroFecha && filtroFecha.value !== 'todos') {
            xmlsFiltrados = this.filtrarPorFecha(xmlsFiltrados, filtroFecha.value);
        }
        
        // Filtro por emisor
        const filtroEmisor = document.getElementById('filtroEmisor');
        if (filtroEmisor && filtroEmisor.value !== 'todos') {
            xmlsFiltrados = xmlsFiltrados.filter(xml => xml.emisor_id === filtroEmisor.value);
        }
        
        // Filtro por estado
        const filtroEstado = document.getElementById('filtroEstado');
        if (filtroEstado && filtroEstado.value !== 'todos') {
            xmlsFiltrados = xmlsFiltrados.filter(xml => (xml.estado || 'generado') === filtroEstado.value);
        }
        
        // Filtro por versión
        const filtroVersion = document.getElementById('filtroVersion');
        if (filtroVersion && filtroVersion.value !== 'todas') {
            xmlsFiltrados = xmlsFiltrados.filter(xml => (xml.version || '4.0') === filtroVersion.value);
        }
        
        // Filtro por rango de total
        const totalMin = document.getElementById('totalMin');
        const totalMax = document.getElementById('totalMax');
        if (totalMin && totalMin.value) {
            const min = parseFloat(totalMin.value);
            xmlsFiltrados = xmlsFiltrados.filter(xml => parseFloat(xml.total || 0) >= min);
        }
        if (totalMax && totalMax.value) {
            const max = parseFloat(totalMax.value);
            xmlsFiltrados = xmlsFiltrados.filter(xml => parseFloat(xml.total || 0) <= max);
        }
        
        // Mostrar resultados
        this.mostrarXMLsFiltrados(xmlsFiltrados);
        
        // Actualizar contador de resultados
        this.actualizarContadorResultados(xmlsFiltrados.length);
    }
    
    // ===== BÚSQUEDA EN TIEMPO REAL =====
    buscarEnTiempoReal() {
        const busquedaGeneral = document.getElementById('busquedaGeneral');
        if (!busquedaGeneral) return;
        
        const termino = busquedaGeneral.value.toLowerCase().trim();
        
        if (!termino) {
            this.aplicarFiltros();
            return;
        }
        
        let xmlsFiltrados = xmls.filter(xml => {
            return (xml.serie || '').toLowerCase().includes(termino) ||
                   (xml.folio || '').toString().includes(termino) ||
                   (xml.emisor_rfc || '').toLowerCase().includes(termino) ||
                   (xml.emisor_nombre || '').toLowerCase().includes(termino) ||
                   (xml.receptor_rfc || '').toLowerCase().includes(termino) ||
                   (xml.receptor_nombre || '').toLowerCase().includes(termino);
        });
        
        this.mostrarXMLsFiltrados(xmlsFiltrados);
        this.actualizarContadorResultados(xmlsFiltrados.length);
        
        logSystem(`Búsqueda realizada: "${termino}"`, 'info', { resultados: xmlsFiltrados.length });
    }
    
    // ===== MOSTRAR XMLS FILTRADOS =====
    mostrarXMLsFiltrados(xmlsFiltrados) {
        // Guardar XMLs originales temporalmente
        const xmlsOriginales = [...xmls];
        
        // Reemplazar temporalmente para renderizar
        xmls = xmlsFiltrados;
        this.renderXMLsTable();
        
        // Restaurar XMLs originales
        xmls = xmlsOriginales;
    }
    
    // ===== FILTRAR POR FECHA =====
    filtrarPorFecha(xmlsList, filtro) {
        const ahora = new Date();
        
        switch (filtro) {
            case 'hoy':
                const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
                return xmlsList.filter(xml => {
                    const fechaXML = new Date(xml.fecha || xml.timestamp);
                    return fechaXML >= hoy;
                });
                
            case 'semana':
                const inicioSemana = new Date(ahora);
                inicioSemana.setDate(ahora.getDate() - ahora.getDay());
                return xmlsList.filter(xml => {
                    const fechaXML = new Date(xml.fecha || xml.timestamp);
                    return fechaXML >= inicioSemana;
                });
                
            case 'mes':
                const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
                return xmlsList.filter(xml => {
                    const fechaXML = new Date(xml.fecha || xml.timestamp);
                    return fechaXML >= inicioMes;
                });
                
            case 'personalizado':
                const fechaDesde = document.getElementById('fechaDesde');
                const fechaHasta = document.getElementById('fechaHasta');
                
                if (fechaDesde && fechaDesde.value) {
                    const desde = new Date(fechaDesde.value);
                    xmlsList = xmlsList.filter(xml => {
                        const fechaXML = new Date(xml.fecha || xml.timestamp);
                        return fechaXML >= desde;
                    });
                }
                
                if (fechaHasta && fechaHasta.value) {
                    const hasta = new Date(fechaHasta.value);
                    hasta.setHours(23, 59, 59, 999);
                    xmlsList = xmlsList.filter(xml => {
                        const fechaXML = new Date(xml.fecha || xml.timestamp);
                        return fechaXML <= hasta;
                    });
                }
                
                return xmlsList;
                
            default:
                return xmlsList;
        }
    }
    
    // ===== ACTUALIZAR CONTADOR DE RESULTADOS =====
    actualizarContadorResultados(count) {
        const searchResults = document.getElementById('searchResults');
        const resultadosTexto = document.getElementById('resultadosTexto');
        
        if (count < xmls.length) {
            if (searchResults) searchResults.style.display = 'block';
            if (resultadosTexto) resultadosTexto.textContent = `Mostrando ${count} de ${xmls.length} XMLs`;
        } else {
            if (searchResults) searchResults.style.display = 'none';
        }
    }
    
    // ===== UTILIDADES =====
    formatearFecha(fecha) {
        if (!fecha) return 'N/A';
        
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return fecha;
        }
    }
    
    getEstadoBadgeClass(estado) {
        switch (estado) {
            case 'sellado': return 'bg-success';
            case 'timbrado': return 'bg-primary';
            case 'cancelado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }
}

// ===== INSTANCIA GLOBAL =====
window.dashboardMain = null;

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        window.dashboardMain = new CFDIDashboardMain();
        await window.dashboardMain.initialize();
        
        logSystem('Dashboard Main Controller inicializado globalmente', 'success');
    });
}

logSystem('Módulo CFDIDashboardMain cargado', 'success');
