/**
 * ===== FUNCIONES DE EMERGENCIA CFDI DASHBOARD =====
 * Solución inmediata para errores de funciones no definidas
 * Se carga ANTES que el script principal para asegurar disponibilidad
 */

console.log('🚑 CARGANDO FUNCIONES DE EMERGENCIA...');

// ===== FUNCIÓN EMERGENCIA: CAMBIO DE TABS =====
function showTab(tabName) {
    console.log(`🚑 EMERGENCIA: Cambiando a tab: ${tabName}`);
    try {
        // Ocultar todos los tab-panes
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // Mostrar el tab seleccionado
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('show', 'active');
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
        
        console.log(`✅ EMERGENCIA: Tab cambiado a: ${tabName}`);
        
    } catch (error) {
        console.error('❌ EMERGENCIA: Error cambiando tab:', error);
    }
}

// ===== FUNCIÓN EMERGENCIA: EDICIÓN DE EMISORES =====
function editEmisor(emisorId) {
    console.log('🚑 EMERGENCIA: Editando emisor:', emisorId);
    try {
        // Intentar usar la función principal si está disponible
        if (typeof editarEmisor === 'function') {
            console.log('🔄 EMERGENCIA: Usando función principal editarEmisor...');
            return editarEmisor(emisorId);
        }
        
        // Fallback: usar función de emergencia
        console.log('🚑 EMERGENCIA: Usando función fallback...');
        return editarEmisorEmergencia(emisorId);
        
    } catch (error) {
        console.error('❌ EMERGENCIA: Error editando emisor:', error);
        alert('Error abriendo editor de emisor: ' + error.message);
    }
}

// ===== FUNCIÓN FALLBACK PARA EDICIÓN DE EMISORES =====
function editarEmisorEmergencia(emisorId) {
    console.log('🚑 EMERGENCIA FALLBACK: Editando emisor desde localStorage:', emisorId);
    
    try {
        // Cargar emisores desde localStorage
        const emisoresData = localStorage.getItem('emisores');
        if (!emisoresData) {
            alert('No se encontraron emisores en localStorage');
            return;
        }
        
        const emisores = JSON.parse(emisoresData);
        const emisor = emisores.find(e => e.id === emisorId);
        
        if (!emisor) {
            alert('Emisor no encontrado en localStorage');
            return;
        }
        
        console.log('📝 EMERGENCIA: Datos del emisor desde localStorage:', {
            id: emisor.id,
            rfc: emisor.rfc,
            nombre: emisor.nombre,
            tiene_cer: !!emisor.certificado_cer,
            tiene_key: !!emisor.certificado_key,
            numero_certificado: emisor.numero_certificado || 'No disponible',
            estado_csd: emisor.estado_csd || 'pendiente'
        });
        
        // Cargar datos en el formulario de edición
        document.getElementById('editEmisorId').value = emisor.id;
        document.getElementById('editEmisorRFC').value = emisor.rfc || '';
        document.getElementById('editEmisorNombre').value = emisor.nombre || '';
        document.getElementById('editEmisorCP').value = emisor.codigo_postal || '';
        document.getElementById('editEmisorRegimen').value = emisor.regimen_fiscal || '';
        
        // Mostrar información de CSD actual si la función existe
        if (typeof mostrarInfoCSDActual === 'function') {
            mostrarInfoCSDActual(emisor);
        }
        
        // Configurar listeners si la función existe
        if (typeof setupEditCSDListeners === 'function') {
            setupEditCSDListeners();
        }
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditarEmisor'));
        modal.show();
        
        console.log('✅ EMERGENCIA: Modal de edición abierto exitosamente');
        
    } catch (error) {
        console.error('❌ EMERGENCIA FALLBACK: Error abriendo modal:', error);
        alert('Error crítico cargando datos del emisor: ' + error.message);
    }
}

// ===== FUNCIÓN EMERGENCIA: ABRIR MODAL EMISOR =====
function openEmisorModal() {
    console.log('🚑 EMERGENCIA: Abriendo modal de emisor...');
    try {
        // Limpiar formulario si existe
        const form = document.getElementById('formEmisor');
        if (form) {
            form.reset();
        }
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalEmisor'));
        modal.show();
        
        console.log('✅ EMERGENCIA: Modal de emisor abierto');
        
    } catch (error) {
        console.error('❌ EMERGENCIA: Error abriendo modal de emisor:', error);
        alert('Error abriendo modal de emisor: ' + error.message);
    }
}

console.log('✅ FUNCIONES DE EMERGENCIA CARGADAS EXITOSAMENTE');

// Hacer funciones disponibles globalmente
window.showTab = showTab;
window.editEmisor = editEmisor;
window.openEmisorModal = openEmisorModal;
window.editarEmisorEmergencia = editarEmisorEmergencia;
