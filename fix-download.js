// 🔧 FIX CRÍTICO: Corrección para función de descarga
// Priorizar XML sellado sobre XML original

// Función corregida para seleccionar XML sellado
function seleccionarXMLPrioritario(xmls, xmlId) {
    console.log('🔍 DEBUG DESCARGA: Buscando XML con prioridad para sellado...');
    
    // Buscar TODOS los XMLs con el mismo ID
    const xmlsConMismoId = xmls.filter(x => x.id === xmlId);
    console.log('🔍 DEBUG DESCARGA: XMLs encontrados con mismo ID:', xmlsConMismoId.length);
    
    if (xmlsConMismoId.length === 0) {
        return null;
    }
    
    // Priorizar XML sellado sobre importado/generado
    const xmlSellado = xmlsConMismoId.find(x => x.estado === 'sellado');
    const xmlImportado = xmlsConMismoId.find(x => x.estado === 'importado');
    const xmlGenerado = xmlsConMismoId.find(x => x.estado === 'generado');
    
    // Usar XML sellado si existe, sino el más reciente
    const xmlSeleccionado = xmlSellado || xmlImportado || xmlGenerado || xmlsConMismoId[0];
    
    console.log('🔍 DEBUG DESCARGA: XML seleccionado:', {
        estado: xmlSeleccionado.estado,
        tiene_sello: xmlSeleccionado.sello ? 'Sí' : 'No',
        xml_length: xmlSeleccionado.xml_content ? xmlSeleccionado.xml_content.length : 0,
        prioridad: xmlSellado ? 'Sellado (prioridad)' : 'Original/Importado'
    });
    
    return xmlSeleccionado;
}

// Reemplazar la línea problemática en la función de descarga
// ANTES: xml = xmls.find(x => x.id === xmlId);
// DESPUÉS: xml = seleccionarXMLPrioritario(xmls, xmlId);

console.log('✅ Fix de descarga cargado - usar seleccionarXMLPrioritario() en lugar de find()');
