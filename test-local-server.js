/**
 * 🚀 SERVIDOR LOCAL SIMPLE PARA PRUEBAS
 * 
 * Servidor básico para probar las funciones CFDI sin Netlify CLI
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Configurar variables de entorno
process.env.SUPABASE_URL = 'https://savvwukedowcejieqgcr.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTk1MjksImV4cCI6MjA3MDg5NTUyOX0.ssTVHrySTZJz0qwfPyWfCJ7evQyQNB6zD2BO2_qvARk';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMxOTUyOSwiZXhwIjoyMDcwODk1NTI5fQ.5WfUNc6tllkY9xuu1-5Qc0Xv5GNtHWTmSDyHmQaC7tU';
process.env.JWT_SECRET = 'yO5FmJ9BDy2SV8cSx92BCkkIK4NwEBP7TmJgym9MMBxsWQwI7JPhu2GweP9TcRUWX0lYoMVvTRCIVY+/yLpP+w==';
process.env.NODE_ENV = 'development';

const PORT = 8888;

// Función para servir archivos estáticos
function serveStaticFile(filePath, res) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(filePath);
            
            let contentType = 'text/html';
            if (ext === '.js') contentType = 'application/javascript';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.json') contentType = 'application/json';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return true;
        }
    } catch (error) {
        console.error('Error sirviendo archivo:', error.message);
    }
    return false;
}

// Crear servidor
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log(`${req.method} ${pathname}`);
    
    // Manejar OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    try {
        // Rutas de API (funciones Netlify)
        if (pathname.startsWith('/.netlify/functions/') || pathname.startsWith('/api/')) {
            const functionName = pathname.replace('/.netlify/functions/', '').replace('/api/', '');
            const functionPath = path.join(__dirname, 'functions', functionName + '.js');
            
            if (fs.existsSync(functionPath)) {
                console.log(`📡 Ejecutando función: ${functionName}`);
                
                // Crear evento mock para la función
                let body = '';
                if (req.method === 'POST') {
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const functionModule = require(functionPath);
                            const event = {
                                httpMethod: req.method,
                                headers: req.headers,
                                body: body,
                                queryStringParameters: parsedUrl.query
                            };
                            
                            const result = await functionModule.handler(event, {});
                            
                            res.writeHead(result.statusCode || 200, {
                                'Content-Type': 'application/json',
                                ...result.headers
                            });
                            res.end(result.body);
                        } catch (error) {
                            console.error('Error ejecutando función:', error.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error interno: ' + error.message }));
                        }
                    });
                } else {
                    try {
                        const functionModule = require(functionPath);
                        const event = {
                            httpMethod: req.method,
                            headers: req.headers,
                            body: null,
                            queryStringParameters: parsedUrl.query
                        };
                        
                        const result = await functionModule.handler(event, {});
                        
                        res.writeHead(result.statusCode || 200, {
                            'Content-Type': 'application/json',
                            ...result.headers
                        });
                        res.end(result.body);
                    } catch (error) {
                        console.error('Error ejecutando función:', error.message);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Error interno: ' + error.message }));
                    }
                }
                return;
            }
        }
        
        // Servir archivos estáticos
        let filePath;
        if (pathname === '/') {
            filePath = path.join(__dirname, 'index.html');
        } else if (pathname === '/dashboard') {
            filePath = path.join(__dirname, 'dashboard.html');
        } else if (pathname === '/login') {
            filePath = path.join(__dirname, 'login.html');
        } else if (pathname === '/generator') {
            filePath = path.join(__dirname, 'generator.html');
        } else {
            filePath = path.join(__dirname, pathname);
        }
        
        if (serveStaticFile(filePath, res)) {
            return;
        }
        
        // 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>404 - No encontrado</h1>
            <p>Ruta: ${pathname}</p>
            <h2>Rutas disponibles:</h2>
            <ul>
                <li><a href="/">Inicio (index.html)</a></li>
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/login">Login</a></li>
                <li><a href="/generator">Generador</a></li>
                <li>/api/sellar-cfdi-fixed - Función de sellado</li>
                <li>/api/auth - Función de autenticación</li>
            </ul>
        `);
        
    } catch (error) {
        console.error('Error del servidor:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error interno del servidor' }));
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log('🚀 SERVIDOR LOCAL INICIADO');
    console.log('='.repeat(50));
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('📋 Rutas disponibles:');
    console.log('  - http://localhost:' + PORT + '/');
    console.log('  - http://localhost:' + PORT + '/dashboard');
    console.log('  - http://localhost:' + PORT + '/login');
    console.log('  - http://localhost:' + PORT + '/generator');
    console.log('  - http://localhost:' + PORT + '/api/sellar-cfdi-fixed');
    console.log('='.repeat(50));
    console.log('✅ Supabase configurado');
    console.log('✅ Variables de entorno cargadas');
    console.log('🔄 Presiona Ctrl+C para detener');
});

// Manejo de errores
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${PORT} ya está en uso`);
        console.log('💡 Intenta con otro puerto o cierra la aplicación que lo está usando');
    } else {
        console.error('❌ Error del servidor:', error.message);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.close(() => {
        console.log('✅ Servidor detenido');
        process.exit(0);
    });
});
