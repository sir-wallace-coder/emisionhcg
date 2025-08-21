/**
 * 🔍 DIAGNÓSTICO DE CONEXIÓN
 * 
 * Script para diagnosticar problemas de conexión
 */

console.log('🔍 DIAGNÓSTICO DE CONEXIÓN INICIADO');
console.log('='.repeat(50));

// Test 1: Verificar puerto 8888
const net = require('net');

function testPort(port, host = 'localhost') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
            console.log(`✅ Puerto ${port} está ABIERTO`);
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log(`❌ Puerto ${port} - TIMEOUT`);
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (err) => {
            console.log(`❌ Puerto ${port} - ERROR: ${err.message}`);
            resolve(false);
        });
        
        socket.connect(port, host);
    });
}

// Test 2: Verificar dependencias
function testDependencies() {
    console.log('\n📦 Verificando dependencias...');
    
    const deps = ['http', 'url', 'path', 'fs'];
    
    deps.forEach(dep => {
        try {
            require(dep);
            console.log(`✅ ${dep}: OK`);
        } catch (error) {
            console.log(`❌ ${dep}: ERROR - ${error.message}`);
        }
    });
}

// Test 3: Crear servidor de prueba simple
function createTestServer() {
    return new Promise((resolve) => {
        console.log('\n🚀 Creando servidor de prueba...');
        
        const http = require('http');
        
        const testServer = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>✅ Servidor de Prueba Funcionando</h1>
                <p>Hora: ${new Date().toISOString()}</p>
                <p>URL: ${req.url}</p>
                <p>Método: ${req.method}</p>
                <hr>
                <h2>Enlaces de prueba:</h2>
                <ul>
                    <li><a href="/">Inicio</a></li>
                    <li><a href="/test">Test</a></li>
                    <li><a href="/api/status">API Status</a></li>
                </ul>
            `);
        });
        
        testServer.on('error', (error) => {
            console.log('❌ Error del servidor de prueba:', error.message);
            if (error.code === 'EADDRINUSE') {
                console.log('💡 Puerto 8888 ya está en uso');
                console.log('🔄 Intentando puerto 8889...');
                
                testServer.listen(8889, () => {
                    console.log('✅ Servidor de prueba en puerto 8889');
                    console.log('🌐 Accede a: http://localhost:8889');
                    resolve(8889);
                });
            } else {
                resolve(null);
            }
        });
        
        testServer.listen(8888, () => {
            console.log('✅ Servidor de prueba en puerto 8888');
            console.log('🌐 Accede a: http://localhost:8888');
            resolve(8888);
        });
    });
}

// Ejecutar diagnóstico
async function runDiagnostic() {
    try {
        // Test dependencias
        testDependencies();
        
        // Test puerto
        console.log('\n🔌 Verificando puerto 8888...');
        const portOpen = await testPort(8888);
        
        if (portOpen) {
            console.log('✅ El servidor ya está ejecutándose en puerto 8888');
            console.log('🌐 Intenta acceder a: http://localhost:8888');
        } else {
            console.log('⚠️ Puerto 8888 no responde');
            console.log('🔄 Creando servidor de prueba...');
            
            const port = await createTestServer();
            if (port) {
                console.log(`✅ Servidor de prueba creado en puerto ${port}`);
            } else {
                console.log('❌ No se pudo crear servidor de prueba');
            }
        }
        
        // Información adicional
        console.log('\n📋 INFORMACIÓN DEL SISTEMA:');
        console.log('  - Node.js:', process.version);
        console.log('  - Plataforma:', process.platform);
        console.log('  - Arquitectura:', process.arch);
        console.log('  - Directorio:', process.cwd());
        
        console.log('\n💡 SOLUCIONES POSIBLES:');
        console.log('1. Verificar que no hay firewall bloqueando el puerto');
        console.log('2. Ejecutar como administrador si es necesario');
        console.log('3. Usar un puerto diferente (8889, 3000, etc.)');
        console.log('4. Verificar que no hay otro proceso usando el puerto');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error.message);
    }
}

// Ejecutar
runDiagnostic();
