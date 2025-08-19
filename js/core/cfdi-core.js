/**
 * ===== SISTEMA CFDI PROFESIONAL - CORE =====
 * Configuración global y variables del sistema
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== CONFIGURACIÓN GLOBAL =====
const CFDI_CONFIG = {
    version: '1.0.0',
    apiBaseUrl: '/.netlify/functions',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    supportedVersions: ['3.3', '4.0'],
    storageKeys: {
        xmls: 'xmls_generados',
        emisores: 'emisores',
        logs: 'cfdi_logs',
        token: 'cfdi_token',
        user: 'cfdi_user',
        editData: 'cfdi_edit_data'
    },
    ui: {
        alertDuration: 5000,
        tablePageSize: 10,
        logMaxEntries: 100
    }
};

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let xmls = [];
let emisores = [];
let editingEmisorId = null;
let isAuthenticated = false;

// Variables para filtros y búsqueda
let todosLosXMLs = [];
let xmlsFiltrados = [];
let timeoutBusqueda = null;

// Variables para logs
let systemLogs = [];

// Variables para modales
let xmlActualViewing = null;

// ===== ESTADOS DEL SISTEMA =====
const CFDI_STATES = {
    XML_STATES: {
        BORRADOR: 'borrador',
        SELLADO: 'sellado',
        TIMBRADO: 'timbrado',
        CANCELADO: 'cancelado'
    },
    ALERT_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    TABS: {
        XMLS: 'xmls',
        EMISORES: 'emisores',
        LOGS: 'logs'
    }
};

// ===== CATÁLOGOS SAT =====
const CFDI_CATALOGS = {
    FORMA_PAGO: {
        '001': 'Efectivo',
        '002': 'Cheque Nominativo',
        '003': 'Transferencia Electrónica de Fondos SPEI',
        '004': 'Tarjeta de Crédito',
        '005': 'Monedero Electrónico',
        '006': 'Dinero Electrónico',
        '008': 'Vales de Despensa',
        '012': 'Dación en Pago',
        '013': 'Pago por Subrogación',
        '014': 'Pago por Consignación',
        '015': 'Condonación',
        '017': 'Compensación',
        '023': 'Novación',
        '024': 'Confusión',
        '025': 'Remisión de Deuda',
        '026': 'Prescripción o Caducidad',
        '027': 'A Satisfacción del Acreedor',
        '028': 'Tarjeta de Débito',
        '029': 'Tarjeta de Servicios',
        '030': 'Aplicación de Anticipos',
        '031': 'Intermediario Pagos',
        '099': 'Por Definir'
    },
    OBJETO_IMPUESTO: {
        '01': 'No objeto de impuesto',
        '02': 'Sí objeto de impuesto',
        '03': 'Sí objeto de impuesto y no obligado al desglose'
    }
};

// ===== UTILIDADES GLOBALES =====
function logSystem(message, type = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        id: Date.now() + Math.random(),
        timestamp,
        type,
        message,
        data
    };
    
    systemLogs.unshift(logEntry);
    
    // Mantener solo los últimos 100 logs
    if (systemLogs.length > CFDI_CONFIG.ui.logMaxEntries) {
        systemLogs = systemLogs.slice(0, CFDI_CONFIG.ui.logMaxEntries);
    }
    
    // Guardar en localStorage
    localStorage.setItem(CFDI_CONFIG.storageKeys.logs, JSON.stringify(systemLogs));
    
    // Log en consola
    console.log(`🔔 CFDI SYSTEM [${type.toUpperCase()}]: ${message}`, data || '');
}

// ===== INICIALIZACIÓN =====
function initializeCFDISystem() {
    logSystem('Inicializando Sistema CFDI Profesional', 'info', { version: CFDI_CONFIG.version });
    
    // Cargar logs existentes
    const savedLogs = localStorage.getItem(CFDI_CONFIG.storageKeys.logs);
    if (savedLogs) {
        try {
            systemLogs = JSON.parse(savedLogs);
        } catch (e) {
            logSystem('Error cargando logs del sistema', 'error', e);
        }
    }
    
    logSystem('Sistema CFDI Core inicializado exitosamente', 'success');
}

// Auto-inicialización
if (typeof window !== 'undefined') {
    initializeCFDISystem();
}
