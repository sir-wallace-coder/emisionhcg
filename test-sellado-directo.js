/**
 * 🔬 PRUEBA TÉCNICA SELLADO DIRECTO - EVIDENCIA REAL
 * Metodología profesional: Probar sellado con datos estructurados
 */

const CONFIG = {
    loginUrl: 'https://consulta.click/api/login',
    sellarUrl: 'https://consulta.click/api/v1/sellado',
    email: 'admin@cfdi.test',
    password: '12345678'
};

// XML de prueba básico pero válido
const XML_PRUEBA = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
    Version="4.0" 
    Serie="A" 
    Folio="1" 
    Fecha="2024-01-01T12:00:00" 
    FormaPago="01" 
    NoCertificado="" 
    SubTotal="100.00" 
    Total="116.00" 
    TipoDeComprobante="I" 
    Exportacion="01" 
    MetodoPago="PUE" 
    LugarExpedicion="01000" 
    Moneda="MXN">
    <cfdi:Emisor Rfc="XAXX010101000" Nombre="EMISOR PRUEBA" RegimenFiscal="601"/>
    <cfdi:Receptor Rfc="XAXX010101000" Nombre="RECEPTOR PRUEBA" DomicilioFiscalReceptor="01000" RegimenFiscalReceptor="601" UsoCFDI="G01"/>
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1" ClaveUnidad="H87" Descripcion="Concepto de prueba" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados>
                    <cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
                </cfdi:Traslados>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosTrasladados="16.00">
        <cfdi:Traslados>
            <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
        </cfdi:Traslados>
    </cfdi:Impuestos>
</cfdi:Comprobante>`;

async function obtenerToken() {
    const response = await fetch(CONFIG.loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: CONFIG.email, password: CONFIG.password })
    });
    
    if (!response.ok) return null;
    const result = await response.json();
    return result.access_token || result.token;
}

async function probarSellado() {
    console.log('🔬 PRUEBA SELLADO TÉCNICA DIRECTA');
    
    const token = await obtenerToken();
    if (!token) {
        console.error('❌ No se pudo obtener token');
        return;
    }
    
    console.log('✅ Token obtenido:', token.substring(0, 20) + '...');
    
    const payload = {
        xml: Buffer.from(XML_PRUEBA, 'utf8').toString('base64'),
        certificado: 'dGVzdCBjZXJ0aWZpY2F0ZQ==',
        key: 'dGVzdCBrZXk=',
        password: 'test123'
    };
    
    try {
        const response = await fetch(CONFIG.sellarUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📥 RESPUESTA SELLADO:');
        console.log('  Status:', response.status);
        console.log('  Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('  Length:', responseText.length);
        console.log('  Preview:', responseText.substring(0, 300));
        
        if (responseText.includes('<!DOCTYPE html>')) {
            console.log('🚨 EVIDENCIA: HTML detectado - analizando...');
            if (responseText.includes('login')) {
                console.log('🔍 EVIDENCIA: Redirección a login detectada');
            }
        } else {
            try {
                const json = JSON.parse(responseText);
                console.log('✅ JSON válido:', Object.keys(json));
            } catch {
                console.log('❌ No es JSON válido');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

probarSellado().catch(console.error);
