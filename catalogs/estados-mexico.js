// Catálogo oficial de Estados de la República Mexicana
// Según el catálogo del SAT y INEGI

const ESTADOS_MEXICO = [
    { codigo: 'AGU', nombre: 'Aguascalientes' },
    { codigo: 'BCN', nombre: 'Baja California' },
    { codigo: 'BCS', nombre: 'Baja California Sur' },
    { codigo: 'CAM', nombre: 'Campeche' },
    { codigo: 'CHP', nombre: 'Chiapas' },
    { codigo: 'CHH', nombre: 'Chihuahua' },
    { codigo: 'CMX', nombre: 'Ciudad de México' },
    { codigo: 'COA', nombre: 'Coahuila' },
    { codigo: 'COL', nombre: 'Colima' },
    { codigo: 'DUR', nombre: 'Durango' },
    { codigo: 'GUA', nombre: 'Guanajuato' },
    { codigo: 'GRO', nombre: 'Guerrero' },
    { codigo: 'HID', nombre: 'Hidalgo' },
    { codigo: 'JAL', nombre: 'Jalisco' },
    { codigo: 'MEX', nombre: 'México' },
    { codigo: 'MIC', nombre: 'Michoacán' },
    { codigo: 'MOR', nombre: 'Morelos' },
    { codigo: 'NAY', nombre: 'Nayarit' },
    { codigo: 'NLE', nombre: 'Nuevo León' },
    { codigo: 'OAX', nombre: 'Oaxaca' },
    { codigo: 'PUE', nombre: 'Puebla' },
    { codigo: 'QUE', nombre: 'Querétaro' },
    { codigo: 'ROO', nombre: 'Quintana Roo' },
    { codigo: 'SLP', nombre: 'San Luis Potosí' },
    { codigo: 'SIN', nombre: 'Sinaloa' },
    { codigo: 'SON', nombre: 'Sonora' },
    { codigo: 'TAB', nombre: 'Tabasco' },
    { codigo: 'TAM', nombre: 'Tamaulipas' },
    { codigo: 'TLA', nombre: 'Tlaxcala' },
    { codigo: 'VER', nombre: 'Veracruz' },
    { codigo: 'YUC', nombre: 'Yucatán' },
    { codigo: 'ZAC', nombre: 'Zacatecas' }
];

// Función para obtener el catálogo completo
function getEstadosMexico() {
    return ESTADOS_MEXICO;
}

// Función para obtener un estado por código
function getEstadoByCodigo(codigo) {
    return ESTADOS_MEXICO.find(estado => estado.codigo === codigo);
}

// Función para obtener un estado por nombre
function getEstadoByNombre(nombre) {
    return ESTADOS_MEXICO.find(estado => 
        estado.nombre.toLowerCase() === nombre.toLowerCase()
    );
}

// Función para validar si un código de estado es válido
function isValidEstadoCodigo(codigo) {
    return ESTADOS_MEXICO.some(estado => estado.codigo === codigo);
}

// Función para generar opciones HTML para select
function generateEstadosSelectOptions(selectedCodigo = '') {
    let options = '<option value="">Selecciona un estado</option>';
    
    ESTADOS_MEXICO.forEach(estado => {
        const selected = estado.codigo === selectedCodigo ? 'selected' : '';
        options += `<option value="${estado.codigo}" ${selected}>${estado.nombre}</option>`;
    });
    
    return options;
}

// Exportar para uso en Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ESTADOS_MEXICO,
        getEstadosMexico,
        getEstadoByCodigo,
        getEstadoByNombre,
        isValidEstadoCodigo,
        generateEstadosSelectOptions
    };
}

// Exportar para uso en navegador (frontend)
if (typeof window !== 'undefined') {
    window.EstadosMexico = {
        ESTADOS_MEXICO,
        getEstadosMexico,
        getEstadoByCodigo,
        getEstadoByNombre,
        isValidEstadoCodigo,
        generateEstadosSelectOptions
    };
}
