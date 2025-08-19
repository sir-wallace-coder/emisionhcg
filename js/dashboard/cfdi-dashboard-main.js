/**
 * ===== SISTEMA CFDI PROFESIONAL - DASHBOARD CONTROLLER =====
 * Controlador principal del dashboard CFDI
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== CONTROLADOR PRINCIPAL DEL DASHBOARD =====
class CFDIDashboardController {
    
    constructor() {
        this.currentTab = CFDI_STATES.TABS.XMLS;
        this.initialized = false;
    }
    
    // ===== INICIALIZACIÓN =====
    async init() {
        logSystem('Inicializando Dashboard Controller', 'info');
        
        try {
            // Verificar autenticación
            if (!CFDIAuth.requireAuth()) {
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
            logSystem('Dashboard Controller inicializado exitosamente', 'success');
            
            return true;
            
        } catch (error) {
            logSystem('Error inicializando Dashboard Controller', 'error', error);
            CFDIAlerts.error('Error inicializando el dashboard');
            return false;
        }
    }
    
    // ===== CARGAR DATOS INICIALES =====
    async loadInitialData() {
        logSystem('Cargando datos iniciales del dashboard', 'info');
        
        CFDILoading.show('Cargando datos del sistema...');
        
        try {
            // Cargar XMLs
            await CFDIXMLService.loadAll();
            logSystem('XMLs cargados', 'success', { count: xmls.length });
            
            // Cargar emisores
            await CFDIEmisorService.loadAll();
            logSystem('Emisores cargados', 'success', { count: emisores.length });
            
            // Cargar logs del sistema
            const savedLogs = localStorage.getItem(CFDI_CONFIG.storageKeys.logs);
            if (savedLogs) {
                try {
                    systemLogs = JSON.parse(savedLogs);
                } catch (e) {
                    logSystem('Error cargando logs guardados', 'warning', e);
                }
            }
            
            CFDILoading.hide();
            
        } catch (error) {
            CFDILoading.hide();
            logSystem('Error cargando datos iniciales', 'error', error);
            throw error;
        }
    }
    
    // ===== CONFIGURAR EVENT LISTENERS =====
    setupEventListeners() {
        logSystem('Configurando event listeners', 'info');
        
        // Navegación de tabs
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab]')) {
                this.showTab(e.target.dataset.tab);
            }
        });
        
        // Botones de acción
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleAction(action, e.target.dataset);
            }
        });
        
        // Formularios
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'emisorForm') {
                e.preventDefault();
                this.handleEmisorForm(e.target);
            }
        });
        
        // Búsqueda en tiempo real
        const searchInput = document.getElementById('xmlSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Filtros
        const filterSelect = document.getElementById('xmlFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.handleFilter(e.target.value);
            });
        }
        
        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
        
        // Teclas de escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        logSystem('Event listeners configurados', 'success');
    }
    
    // ===== RENDERIZAR UI INICIAL =====
    renderInitialUI() {
        logSystem('Renderizando UI inicial', 'info');
        
        // Mostrar tab inicial
        this.showTab(this.currentTab);
        
        // Renderizar datos
        this.renderXMLTable();
        this.renderEmisorTable();
        this.renderLogsTable();
        
        // Configurar filtros por defecto
        const xmlFilter = document.getElementById('xmlFilter');
        if (xmlFilter) {
            xmlFilter.value = 'todos';
        }
        
        logSystem('UI inicial renderizada', 'success');
    }
    
    // ===== GESTIÓN DE TABS =====
    showTab(tabName) {
        logSystem(`Mostrando tab: ${tabName}`, 'info');
        
        // Actualizar tab activo
        this.currentTab = tabName;
        
        // Ocultar todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Remover clase activa de todos los tabs
        document.querySelectorAll('.tab-link').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Mostrar contenido del tab seleccionado
        const targetContent = document.getElementById(`${tabName}Tab`);
        if (targetContent) {
            targetContent.style.display = 'block';
        }
        
        // Activar tab seleccionado
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Acciones específicas por tab
        switch (tabName) {
            case CFDI_STATES.TABS.XMLS:
                this.renderXMLTable();
                this.updateStats();
                break;
            case CFDI_STATES.TABS.EMISORES:
                this.renderEmisorTable();
                break;
            case CFDI_STATES.TABS.LOGS:
                this.renderLogsTable();
                break;
        }
    }
    
    // ===== GESTIÓN DE ACCIONES =====
    async handleAction(action, data) {
        logSystem(`Ejecutando acción: ${action}`, 'info', data);
        
        try {
            switch (action) {
                case 'newXML':
                    this.redirectToGenerator();
                    break;
                    
                case 'importXML':
                    this.showImportXMLModal();
                    break;
                    
                case 'viewXML':
                    this.viewXML(data.id);
                    break;
                    
                case 'editXML':
                    this.editXML(data.id);
                    break;
                    
                case 'deleteXML':
                    await this.deleteXML(data.id);
                    break;
                    
                case 'exportXML':
                    this.exportXML(data.id);
                    break;
                    
                case 'newEmisor':
                    this.showEmisorModal();
                    break;
                    
                case 'editEmisor':
                    this.showEmisorModal(data.id);
                    break;
                    
                case 'deleteEmisor':
                    await this.deleteEmisor(data.id);
                    break;
                    
                case 'toggleEmisorStatus':
                    await this.toggleEmisorStatus(data.id);
                    break;
                    
                case 'exportEmisores':
                    this.exportEmisores();
                    break;
                    
                case 'clearLogs':
                    this.clearLogs();
                    break;
                    
                case 'exportLogs':
                    this.exportLogs();
                    break;
                    
                case 'logout':
                    this.logout();
                    break;
                    
                default:
                    logSystem(`Acción no reconocida: ${action}`, 'warning');
            }
            
        } catch (error) {
            logSystem(`Error ejecutando acción ${action}`, 'error', error);
            CFDIAlerts.error(`Error ejecutando acción: ${error.message}`);
        }
    }
    
    // ===== ACCIONES DE XML =====
    redirectToGenerator() {
        window.location.href = '/generator.html';
    }
    
    viewXML(xmlId) {
        const xml = CFDIXMLService.getById(xmlId);
        if (!xml) {
            CFDIAlerts.error('XML no encontrado');
            return;
        }
        
        xmlActualViewing = xml;
        
        // Crear contenido del modal
        const xmlInfo = `
            <div class="xml-metadata">
                <div class="row">
                    <div class="col"><strong>Serie-Folio:</strong> ${xml.serie}-${xml.folio}</div>
                    <div class="col"><strong>Estado:</strong> <span class="badge badge-${this.getEstadoBadgeClass(xml.estado)}">${xml.estado}</span></div>
                </div>
                <div class="row">
                    <div class="col"><strong>Emisor:</strong> ${xml.emisor_rfc}</div>
                    <div class="col"><strong>Receptor:</strong> ${xml.receptor_rfc}</div>
                </div>
                <div class="row">
                    <div class="col"><strong>Total:</strong> $${parseFloat(xml.total || 0).toFixed(2)}</div>
                    <div class="col"><strong>Fecha:</strong> ${new Date(xml.fecha).toLocaleDateString()}</div>
                </div>
            </div>
        `;
        
        const xmlContent = xml.xml_content || 'No hay contenido XML disponible';
        
        const modalContent = `
            ${xmlInfo}
            <div class="xml-content-container" style="margin-top: 20px;">
                <h5>Contenido XML:</h5>
                <pre class="xml-content">${this.escapeHtml(xmlContent)}</pre>
            </div>
            <div class="modal-actions" style="margin-top: 20px; text-align: right;">
                <button onclick="CFDIClipboard.copy(xmlActualViewing.xml_content)" class="btn btn-info">📋 Copiar</button>
                <button onclick="dashboardController.exportXML('${xmlId}')" class="btn btn-primary">📥 Descargar</button>
                <button onclick="CFDIModals.close('xmlViewModal')" class="btn btn-secondary">Cerrar</button>
            </div>
        `;
        
        CFDIModals.create('xmlViewModal', '📄 Ver XML CFDI', modalContent, { width: '90%', maxWidth: '800px' });
        CFDIModals.show('xmlViewModal');
    }
    
    editXML(xmlId) {
        const xml = CFDIXMLService.getById(xmlId);
        if (!xml) {
            CFDIAlerts.error('XML no encontrado');
            return;
        }
        
        if (xml.estado === CFDI_STATES.XML_STATES.SELLADO || xml.estado === CFDI_STATES.XML_STATES.TIMBRADO) {
            CFDIAlerts.warning('No se puede editar un XML sellado o timbrado');
            return;
        }
        
        // Guardar datos para edición
        localStorage.setItem(CFDI_CONFIG.storageKeys.editData, JSON.stringify(xml));
        
        // Redirigir al generador con parámetro de edición
        window.location.href = `/generator.html?edit=${xmlId}`;
    }
    
    async deleteXML(xmlId) {
        const xml = CFDIXMLService.getById(xmlId);
        if (!xml) {
            CFDIAlerts.error('XML no encontrado');
            return;
        }
        
        const confirmed = await CFDIConfirm.show(
            `¿Está seguro de eliminar el XML ${xml.serie}-${xml.folio}?`,
            'Confirmar eliminación'
        );
        
        if (confirmed) {
            const result = CFDIXMLService.delete(xmlId);
            if (result.success) {
                CFDIAlerts.success('XML eliminado exitosamente');
                this.renderXMLTable();
                this.updateStats();
            } else {
                CFDIAlerts.error(result.error);
            }
        }
    }
    
    exportXML(xmlId) {
        const result = CFDIXMLService.export(xmlId);
        if (result.success) {
            CFDIAlerts.success(`XML exportado: ${result.filename}`);
        } else {
            CFDIAlerts.error(result.error);
        }
    }
    
    // ===== ACCIONES DE EMISOR =====
    showEmisorModal(emisorId = null) {
        editingEmisorId = emisorId;
        
        const emisor = emisorId ? CFDIEmisorService.getById(emisorId) : null;
        const isEdit = !!emisor;
        
        // Rellenar formulario si es edición
        if (isEdit) {
            setTimeout(() => {
                document.getElementById('emisorRFC').value = emisor.rfc || '';
                document.getElementById('emisorRazonSocial').value = emisor.razon_social || '';
                document.getElementById('emisorCodigoPostal').value = emisor.codigo_postal || '';
                document.getElementById('emisorRegimenFiscal').value = emisor.regimen_fiscal || '';
                document.getElementById('emisorEmail').value = emisor.email || '';
                document.getElementById('emisorTelefono').value = emisor.telefono || '';
            }, 100);
        }
        
        // Actualizar título del modal
        const modalTitle = document.getElementById('emisorModalTitle');
        if (modalTitle) {
            modalTitle.textContent = isEdit ? 'Editar Emisor' : 'Agregar Emisor';
        }
        
        // Mostrar modal
        const modal = document.getElementById('emisorModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeEmisorModal() {
        const modal = document.getElementById('emisorModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Limpiar formulario
        const form = document.getElementById('emisorForm');
        if (form) {
            form.reset();
        }
        
        editingEmisorId = null;
    }
    
    async handleEmisorForm(form) {
        const formData = new FormData(form);
        const emisorData = Object.fromEntries(formData.entries());
        
        // Agregar archivos si están presentes
        const certificadoFile = document.getElementById('emisorCertificado').files[0];
        const llaveFile = document.getElementById('emisorLlavePrivada').files[0];
        
        if (certificadoFile) emisorData.certificado_file = certificadoFile;
        if (llaveFile) emisorData.llave_privada_file = llaveFile;
        
        CFDILoading.show('Procesando emisor...');
        
        try {
            let result;
            
            if (editingEmisorId) {
                result = await CFDIEmisorService.update(editingEmisorId, emisorData);
            } else {
                result = await CFDIEmisorService.create(emisorData);
            }
            
            CFDILoading.hide();
            
            if (result.success) {
                CFDIAlerts.success(editingEmisorId ? 'Emisor actualizado exitosamente' : 'Emisor creado exitosamente');
                this.closeEmisorModal();
                this.renderEmisorTable();
            } else {
                if (result.errors) {
                    CFDIAlerts.error('Errores de validación:\n' + result.errors.join('\n'));
                } else {
                    CFDIAlerts.error(result.error);
                }
            }
            
        } catch (error) {
            CFDILoading.hide();
            CFDIAlerts.error('Error procesando emisor: ' + error.message);
        }
    }
    
    async deleteEmisor(emisorId) {
        const emisor = CFDIEmisorService.getById(emisorId);
        if (!emisor) {
            CFDIAlerts.error('Emisor no encontrado');
            return;
        }
        
        const confirmed = await CFDIConfirm.show(
            `¿Está seguro de eliminar el emisor ${emisor.rfc}?`,
            'Confirmar eliminación'
        );
        
        if (confirmed) {
            const result = CFDIEmisorService.delete(emisorId);
            if (result.success) {
                CFDIAlerts.success('Emisor eliminado exitosamente');
                this.renderEmisorTable();
            } else {
                CFDIAlerts.error(result.error);
            }
        }
    }
    
    async toggleEmisorStatus(emisorId) {
        const result = CFDIEmisorService.toggleStatus(emisorId);
        if (result.success) {
            CFDIAlerts.success(`Emisor ${result.estado === 'activo' ? 'activado' : 'desactivado'}`);
            this.renderEmisorTable();
        } else {
            CFDIAlerts.error(result.error);
        }
    }
    
    exportEmisores() {
        const result = CFDIEmisorService.exportToCSV();
        if (result.success) {
            CFDIAlerts.success('Emisores exportados exitosamente');
        } else {
            CFDIAlerts.error(result.error);
        }
    }
    
    // ===== UTILIDADES =====
    getEstadoBadgeClass(estado) {
        const classes = {
            [CFDI_STATES.XML_STATES.BORRADOR]: 'secondary',
            [CFDI_STATES.XML_STATES.SELLADO]: 'primary',
            [CFDI_STATES.XML_STATES.TIMBRADO]: 'success',
            [CFDI_STATES.XML_STATES.CANCELADO]: 'danger'
        };
        
        return classes[estado] || 'secondary';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        this.closeEmisorModal();
    }
    
    logout() {
        CFDIAuth.logout();
    }
    
    // ===== MÉTODOS ABSTRACTOS (implementados en otros módulos) =====
    renderXMLTable() {
        // Implementado en cfdi-dashboard-tables.js
        if (typeof CFDIDashboardTables !== 'undefined') {
            CFDIDashboardTables.renderXMLTable();
        }
    }
    
    renderEmisorTable() {
        // Implementado en cfdi-dashboard-tables.js
        if (typeof CFDIDashboardTables !== 'undefined') {
            CFDIDashboardTables.renderEmisorTable();
        }
    }
    
    renderLogsTable() {
        // Implementado en cfdi-dashboard-logs.js
        if (typeof CFDIDashboardLogs !== 'undefined') {
            CFDIDashboardLogs.renderLogsTable();
        }
    }
    
    updateStats() {
        // Implementado en cfdi-dashboard-stats.js
        if (typeof CFDIDashboardStats !== 'undefined') {
            CFDIDashboardStats.updateStats();
        }
    }
    
    handleSearch(query) {
        // Implementado en cfdi-dashboard-tables.js
        if (typeof CFDIDashboardTables !== 'undefined') {
            CFDIDashboardTables.handleSearch(query);
        }
    }
    
    handleFilter(filter) {
        // Implementado en cfdi-dashboard-tables.js
        if (typeof CFDIDashboardTables !== 'undefined') {
            CFDIDashboardTables.handleFilter(filter);
        }
    }
    
    showImportXMLModal() {
        // Implementado en cfdi-dashboard-tables.js
        if (typeof CFDIDashboardTables !== 'undefined') {
            CFDIDashboardTables.showImportXMLModal();
        }
    }
    
    clearLogs() {
        // Implementado en cfdi-dashboard-logs.js
        if (typeof CFDIDashboardLogs !== 'undefined') {
            CFDIDashboardLogs.clearLogs();
        }
    }
    
    exportLogs() {
        // Implementado en cfdi-dashboard-logs.js
        if (typeof CFDIDashboardLogs !== 'undefined') {
            CFDIDashboardLogs.exportLogs();
        }
    }
}

// ===== INSTANCIA GLOBAL =====
let dashboardController = null;

// ===== FUNCIONES GLOBALES PARA COMPATIBILIDAD =====
function showTab(tabName) {
    if (dashboardController) {
        dashboardController.showTab(tabName);
    }
}

function openEmisorModal(emisorId = null) {
    if (dashboardController) {
        dashboardController.showEmisorModal(emisorId);
    }
}

function closeEmisorModal() {
    if (dashboardController) {
        dashboardController.closeEmisorModal();
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        dashboardController = new CFDIDashboardController();
        const success = await dashboardController.init();
        
        if (success) {
            logSystem('Dashboard inicializado exitosamente', 'success');
        } else {
            logSystem('Error inicializando dashboard', 'error');
        }
    });
    
    logSystem('Módulo CFDIDashboardController inicializado', 'success');
}
