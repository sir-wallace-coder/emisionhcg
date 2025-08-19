/**
 * ===== SISTEMA CFDI PROFESIONAL - DASHBOARD TABLES =====
 * Módulo de gestión de tablas, filtros y búsqueda del dashboard
 * Versión: 1.0.0
 * Autor: Sistema CFDI Avanzado
 */

// ===== GESTIÓN DE TABLAS DEL DASHBOARD =====
class CFDIDashboardTables {
    
    // ===== RENDERIZAR TABLA DE XMLs =====
    static renderXMLTable() {
        logSystem('Renderizando tabla de XMLs', 'info');
        
        const tableBody = document.getElementById('xmlTableBody');
        if (!tableBody) {
            logSystem('Elemento xmlTableBody no encontrado', 'warning');
            return;
        }
        
        try {
            // Usar XMLs filtrados si existen, sino todos los XMLs
            const xmlsToShow = xmlsFiltrados.length > 0 || xmls.length === 0 ? xmlsFiltrados : xmls;
            
            if (xmlsToShow.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x mb-2"></i><br>
                            No hay XMLs para mostrar
                        </td>
                    </tr>
                `;
                return;
            }
            
            let tableHTML = '';
            
            xmlsToShow.forEach(xml => {
                const fecha = this.formatDate(xml.fecha || xml.fecha_creacion);
                const total = this.formatCurrency(xml.total);
                const estadoBadge = this.getEstadoBadge(xml.estado);
                
                tableHTML += `
                    <tr>
                        <td>
                            <strong>${xml.serie}-${xml.folio}</strong>
                            ${xml.uuid ? `<br><small class="text-muted">${xml.uuid}</small>` : ''}
                        </td>
                        <td>
                            <div>${xml.emisor_rfc || 'N/A'}</div>
                            ${xml.emisor_nombre ? `<small class="text-muted">${xml.emisor_nombre}</small>` : ''}
                        </td>
                        <td>
                            <div>${xml.receptor_rfc || 'N/A'}</div>
                            ${xml.receptor_nombre ? `<small class="text-muted">${xml.receptor_nombre}</small>` : ''}
                        </td>
                        <td class="text-end">
                            <strong>${total}</strong>
                        </td>
                        <td>
                            <div>${fecha}</div>
                            ${xml.fecha_sellado ? `<small class="text-muted">Sellado: ${this.formatDate(xml.fecha_sellado)}</small>` : ''}
                        </td>
                        <td>
                            ${estadoBadge}
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-outline-primary" data-action="viewXML" data-id="${xml.id}" title="Ver XML">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${xml.estado === 'borrador' ? `
                                    <button class="btn btn-sm btn-outline-warning" data-action="editXML" data-id="${xml.id}" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline-success" data-action="exportXML" data-id="${xml.id}" title="Descargar">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" data-action="deleteXML" data-id="${xml.id}" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tableBody.innerHTML = tableHTML;
            logSystem('Tabla de XMLs renderizada exitosamente', 'success', { count: xmlsToShow.length });
            
        } catch (error) {
            logSystem('Error renderizando tabla de XMLs', 'error', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                        Error cargando XMLs
                    </td>
                </tr>
            `;
        }
    }
    
    // ===== RENDERIZAR TABLA DE EMISORES =====
    static renderEmisorTable() {
        logSystem('Renderizando tabla de emisores', 'info');
        
        const tableBody = document.getElementById('emisorTableBody');
        if (!tableBody) {
            logSystem('Elemento emisorTableBody no encontrado', 'warning');
            return;
        }
        
        try {
            if (emisores.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="fas fa-building fa-2x mb-2"></i><br>
                            No hay emisores registrados
                        </td>
                    </tr>
                `;
                return;
            }
            
            let tableHTML = '';
            
            emisores.forEach(emisor => {
                const estadoBadge = emisor.estado === 'activo' ? 
                    '<span class="badge bg-success">Activo</span>' : 
                    '<span class="badge bg-secondary">Inactivo</span>';
                
                const csdStatus = (emisor.certificado_pem && emisor.llave_privada_pem) ?
                    '<span class="badge bg-success"><i class="fas fa-check"></i> Configurado</span>' :
                    '<span class="badge bg-warning"><i class="fas fa-times"></i> Pendiente</span>';
                
                tableHTML += `
                    <tr>
                        <td>
                            <strong>${emisor.rfc}</strong>
                            ${emisor.no_certificado ? `<br><small class="text-muted">Cert: ${emisor.no_certificado}</small>` : ''}
                        </td>
                        <td>
                            <div>${emisor.razon_social}</div>
                            ${emisor.email ? `<small class="text-muted">${emisor.email}</small>` : ''}
                        </td>
                        <td>${emisor.codigo_postal}</td>
                        <td>
                            <small>${emisor.regimen_fiscal}</small>
                        </td>
                        <td>${csdStatus}</td>
                        <td>${estadoBadge}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-outline-primary" data-action="editEmisor" data-id="${emisor.id}" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-${emisor.estado === 'activo' ? 'warning' : 'success'}" 
                                        data-action="toggleEmisorStatus" data-id="${emisor.id}" 
                                        title="${emisor.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                                    <i class="fas fa-${emisor.estado === 'activo' ? 'pause' : 'play'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" data-action="deleteEmisor" data-id="${emisor.id}" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tableBody.innerHTML = tableHTML;
            logSystem('Tabla de emisores renderizada exitosamente', 'success', { count: emisores.length });
            
        } catch (error) {
            logSystem('Error renderizando tabla de emisores', 'error', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                        Error cargando emisores
                    </td>
                </tr>
            `;
        }
    }
    
    // ===== MANEJAR BÚSQUEDA =====
    static handleSearch(query) {
        logSystem('Ejecutando búsqueda', 'info', { query });
        
        if (timeoutBusqueda) {
            clearTimeout(timeoutBusqueda);
        }
        
        timeoutBusqueda = setTimeout(() => {
            this.filterXMLs(query);
        }, 300); // Debounce de 300ms
    }
    
    // ===== FILTRAR XMLs =====
    static filterXMLs(searchQuery = '', stateFilter = 'todos') {
        try {
            let filtered = [...todosLosXMLs];
            
            // Aplicar filtro de búsqueda
            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                filtered = filtered.filter(xml => {
                    return (
                        (xml.serie && xml.serie.toLowerCase().includes(query)) ||
                        (xml.folio && xml.folio.toString().includes(query)) ||
                        (xml.emisor_rfc && xml.emisor_rfc.toLowerCase().includes(query)) ||
                        (xml.receptor_rfc && xml.receptor_rfc.toLowerCase().includes(query)) ||
                        (xml.emisor_nombre && xml.emisor_nombre.toLowerCase().includes(query)) ||
                        (xml.receptor_nombre && xml.receptor_nombre.toLowerCase().includes(query)) ||
                        (xml.uuid && xml.uuid.toLowerCase().includes(query))
                    );
                });
            }
            
            // Aplicar filtro de estado
            if (stateFilter && stateFilter !== 'todos') {
                filtered = filtered.filter(xml => xml.estado === stateFilter);
            }
            
            xmlsFiltrados = filtered;
            this.renderXMLTable();
            
            logSystem('Filtros aplicados', 'success', { 
                searchQuery, 
                stateFilter, 
                total: todosLosXMLs.length, 
                filtered: filtered.length 
            });
            
        } catch (error) {
            logSystem('Error aplicando filtros', 'error', error);
        }
    }
    
    // ===== MANEJAR FILTRO DE ESTADO =====
    static handleFilter(filter) {
        logSystem('Aplicando filtro de estado', 'info', { filter });
        
        const searchInput = document.getElementById('xmlSearch');
        const searchQuery = searchInput ? searchInput.value : '';
        
        this.filterXMLs(searchQuery, filter);
    }
    
    // ===== MOSTRAR MODAL DE IMPORTAR XML =====
    static showImportXMLModal() {
        const modalContent = `
            <div class="mb-3">
                <label for="importXMLFile" class="form-label">Seleccionar archivo XML:</label>
                <input type="file" id="importXMLFile" class="form-control" accept=".xml">
                <div class="form-text">Solo archivos XML de CFDI 3.3 o 4.0 (máximo 5MB)</div>
            </div>
            
            <div id="importXMLResult" class="mt-3"></div>
            
            <div class="d-flex justify-content-end mt-4">
                <button type="button" class="btn btn-secondary me-2" onclick="CFDIModals.close('importXMLModal')">
                    Cancelar
                </button>
                <button type="button" class="btn btn-success" onclick="CFDIDashboardTables.processImportXML()">
                    <i class="fas fa-upload me-1"></i>Importar y Validar
                </button>
            </div>
        `;
        
        CFDIModals.create('importXMLModal', '📁 Importar XML CFDI', modalContent, { width: '500px' });
        CFDIModals.show('importXMLModal');
    }
    
    // ===== PROCESAR IMPORTACIÓN DE XML =====
    static async processImportXML() {
        const fileInput = document.getElementById('importXMLFile');
        const resultDiv = document.getElementById('importXMLResult');
        
        if (!fileInput.files[0]) {
            resultDiv.innerHTML = '<div class="alert alert-warning">Por favor selecciona un archivo XML</div>';
            return;
        }
        
        const file = fileInput.files[0];
        
        CFDILoading.show('Importando y validando XML...');
        
        try {
            const result = await CFDIXMLService.import(file);
            
            CFDILoading.hide();
            
            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-2"></i>
                        XML importado exitosamente
                    </div>
                `;
                
                // Actualizar tabla y cerrar modal después de un momento
                setTimeout(() => {
                    this.renderXMLTable();
                    CFDIDashboardStats.updateStats();
                    CFDIModals.close('importXMLModal');
                    CFDIAlerts.success('XML importado y agregado al sistema');
                }, 1500);
                
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error: ${result.error}
                    </div>
                `;
            }
            
        } catch (error) {
            CFDILoading.hide();
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error procesando archivo: ${error.message}
                </div>
            `;
            logSystem('Error importando XML', 'error', error);
        }
    }
    
    // ===== EXPORTAR TABLA A CSV =====
    static exportXMLsToCSV() {
        try {
            const headers = ['Serie', 'Folio', 'Emisor RFC', 'Receptor RFC', 'Total', 'Fecha', 'Estado'];
            const csvContent = [
                headers.join(','),
                ...xmlsFiltrados.map(xml => [
                    xml.serie,
                    xml.folio,
                    xml.emisor_rfc,
                    xml.receptor_rfc,
                    xml.total,
                    xml.fecha,
                    xml.estado
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `xmls_cfdi_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            CFDIAlerts.success('XMLs exportados a CSV exitosamente');
            logSystem('XMLs exportados a CSV', 'success');
            
        } catch (error) {
            CFDIAlerts.error('Error exportando XMLs');
            logSystem('Error exportando XMLs a CSV', 'error', error);
        }
    }
    
    // ===== UTILIDADES DE FORMATEO =====
    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }
    
    static formatCurrency(amount) {
        if (!amount && amount !== 0) return '$0.00';
        
        try {
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
            }).format(parseFloat(amount));
        } catch (error) {
            return '$0.00';
        }
    }
    
    static getEstadoBadge(estado) {
        const badges = {
            'borrador': '<span class="badge bg-secondary">Borrador</span>',
            'sellado': '<span class="badge bg-primary">Sellado</span>',
            'timbrado': '<span class="badge bg-success">Timbrado</span>',
            'cancelado': '<span class="badge bg-danger">Cancelado</span>'
        };
        
        return badges[estado] || '<span class="badge bg-light text-dark">Desconocido</span>';
    }
    
    // ===== PAGINACIÓN =====
    static setupPagination(totalItems, itemsPerPage = 10) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginationContainer = document.getElementById('xmlPagination');
        
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${i === 1 ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Event listeners para paginación
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page, itemsPerPage);
            });
        });
    }
    
    static goToPage(page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Actualizar XMLs filtrados para la página
        const pageXMLs = todosLosXMLs.slice(startIndex, endIndex);
        xmlsFiltrados = pageXMLs;
        
        this.renderXMLTable();
        
        // Actualizar paginación activa
        document.querySelectorAll('.page-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activePage = document.querySelector(`[data-page="${page}"]`);
        if (activePage) {
            activePage.parentElement.classList.add('active');
        }
        
        logSystem(`Navegando a página ${page}`, 'info');
    }
    
    // ===== ORDENAMIENTO DE TABLA =====
    static setupTableSorting() {
        const headers = document.querySelectorAll('th[data-sort]');
        
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.innerHTML += ' <i class="fas fa-sort text-muted"></i>';
            
            header.addEventListener('click', () => {
                const sortBy = header.dataset.sort;
                const currentOrder = header.dataset.order || 'asc';
                const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                
                this.sortTable(sortBy, newOrder);
                
                // Actualizar indicadores visuales
                headers.forEach(h => {
                    h.dataset.order = '';
                    h.querySelector('i').className = 'fas fa-sort text-muted';
                });
                
                header.dataset.order = newOrder;
                header.querySelector('i').className = `fas fa-sort-${newOrder === 'asc' ? 'up' : 'down'} text-primary`;
            });
        });
    }
    
    static sortTable(sortBy, order) {
        xmlsFiltrados.sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];
            
            // Manejar diferentes tipos de datos
            if (sortBy === 'total') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            } else if (sortBy === 'fecha') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }
            
            if (order === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
        
        this.renderXMLTable();
        logSystem(`Tabla ordenada por ${sortBy} (${order})`, 'info');
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Configurar ordenamiento de tabla
        CFDIDashboardTables.setupTableSorting();
    });
    
    logSystem('Módulo CFDIDashboardTables inicializado', 'success');
}
