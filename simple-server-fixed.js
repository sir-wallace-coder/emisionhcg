const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Configurar variables de entorno
process.env.SUPABASE_URL = 'https://savvwukedowcejieqgcr.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTk1MjksImV4cCI6MjA3MDg5NTUyOX0.ssTVHrySTZJz0qwfPyWfCJ7evQyQNB6zD2BO2_qvARk';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnZ3dWtlZG93Y2VqaWVwZ2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMxOTUyOSwiZXhwIjoyMDcwODk1NTI5fQ.5WfUNc6tllkY9xuu1-5Qc0Xv5GNtHWTmSDyHmQaC7tU';
process.env.JWT_SECRET = 'yO5FmJ9BDy2SV8cSx92BCkkIK4NwEBP7TmJgym9MMBxsWQwI7JPhu2GweP9TcRUWX0lYoMVvTRCIVY+/yLpP+w==';

const server = http.createServer(async (req, res) => {
    try {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        console.log(`📥 ${req.method} ${req.url}`);
        
        // Headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // API Routes - Netlify Functions
        if (req.url.startsWith('/api/') || req.url.startsWith('/.netlify/functions/')) {
            let functionName;
            if (req.url.startsWith('/api/')) {
                functionName = req.url.replace('/api/', '').split('?')[0];
            } else {
                functionName = req.url.replace('/.netlify/functions/', '').split('?')[0];
            }
            
            console.log(`🔍 Buscando función: ${functionName}`);
            const functionPath = path.join(__dirname, 'functions', `${functionName}.js`);
            console.log(`📁 Ruta función: ${functionPath}`);
            console.log(`✅ Existe archivo: ${fs.existsSync(functionPath)}`);
            
            if (fs.existsSync(functionPath)) {
                try {
                    // Limpiar cache del require para recargar la función
                    delete require.cache[require.resolve(functionPath)];
                    const func = require(functionPath);
                    
                    if (req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => body += chunk);
                        req.on('end', async () => {
                            try {
                                console.log(`📤 Ejecutando función ${functionName} con body:`, body);
                                const result = await func.handler({
                                    httpMethod: req.method,
                                    headers: req.headers,
                                    body: body,
                                    queryStringParameters: parsedUrl.query
                                }, {});
                                
                                console.log(`📥 Resultado función:`, result);
                                res.writeHead(result.statusCode || 200, result.headers || {});
                                res.end(result.body);
                            } catch (error) {
                                console.error(`❌ Error en función ${functionName}:`, error);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: error.message }));
                            }
                        });
                    } else {
                        const event = {
                            httpMethod: req.method,
                            headers: req.headers,
                            body: null,
                            queryStringParameters: parsedUrl.query
                        };
                        
                        const result = await func.handler(event, {});
                        
                        res.writeHead(result.statusCode || 200, {
                            'Content-Type': 'application/json',
                            ...result.headers
                        });
                        res.end(result.body);
                    }
                    return;
                } catch (error) {
                    console.error(`❌ Error cargando función ${functionName}:`, error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
            } else {
                console.log(`❌ Función no encontrada: ${functionPath}`);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Función ${functionName} no encontrada` }));
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
        
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            let contentType = 'text/html';
            
            switch (ext) {
                case '.js':
                    contentType = 'text/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.json':
                    contentType = 'application/json';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.jpg':
                    contentType = 'image/jpg';
                    break;
                case '.ico':
                    contentType = 'image/x-icon';
                    break;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>404 - No encontrado</title></head>
                    <body>
                        <h1>404 - Archivo no encontrado</h1>
                        <p>El archivo <code>${pathname}</code> no existe.</p>
                        <a href="/">← Volver al inicio</a>
                    </body>
                </html>
            `);
        }
    } catch (error) {
        console.error('❌ Error en servidor:', error);
        try {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error interno del servidor' }));
            }
        } catch (e) {
            console.error('❌ Error enviando respuesta de error:', e);
        }
    }
});

// Función para encontrar puerto disponible
function findAvailablePort(startPort) {
    return new Promise((resolve) => {
        const testServer = http.createServer();
        testServer.listen(startPort, () => {
            const port = testServer.address().port;
            testServer.close(() => resolve(port));
        });
        testServer.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// Iniciar servidor
async function startServer() {
    try {
        const port = await findAvailablePort(8888);
        server.listen(port, () => {
            console.log(`🚀 Servidor CFDI ejecutándose en:`);
            console.log(`   📍 http://localhost:${port}`);
            console.log(`   🔐 Login: http://localhost:${port}/login`);
            console.log(`   📊 Dashboard: http://localhost:${port}/dashboard`);
            console.log(`   ⚡ API: http://localhost:${port}/api/`);
            console.log(`   🛠️  Netlify Functions: http://localhost:${port}/.netlify/functions/`);
            console.log(`\n✅ Credenciales de prueba:`);
            console.log(`   📧 Email: admin@cfdi.local`);
            console.log(`   🔑 Password: admin123`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
    }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

startServer();
