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
                const func = require(functionPath);
                let body = '';
                
                if (req.method === 'POST') {
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            console.log(`📤 Ejecutando función ${functionName} con body:`, body);
                            const result = await func.handler({
                                httpMethod: req.method,
                                headers: req.headers,
                                body: body,
                                queryStringParameters: url.parse(req.url, true).query
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
                .api-info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Sistema CFDI - Servidor Local</h1>
                
                <div class="status">
                    ✅ <strong>Servidor funcionando correctamente</strong><br>
                    📅 Hora: ${new Date().toLocaleString()}<br>
                    🌐 URL: ${req.url}<br>
                    📡 Método: ${req.method}
                </div>
                
                <div class="links">
                    <a href="/login" class="link-card">
                        🔐 <strong>Login</strong><br>
                        Iniciar sesión
                    </a>
                    <a href="/dashboard" class="link-card">
                        📊 <strong>Dashboard</strong><br>
                        Panel principal
                    </a>
                    <a href="/generator" class="link-card">
                        📝 <strong>Generador</strong><br>
                        Crear CFDI
                    </a>
                    <a href="/api/sellar-cfdi-fixed" class="link-card">
                        🔧 <strong>API Sellado</strong><br>
                        Función de sellado
                    </a>
                </div>
                
                <div class="credentials">
                    <h3>🔑 Credenciales de Acceso:</h3>
                    <p><strong>Email:</strong> admin@cfdi.local</p>
                    <p><strong>Password:</strong> admin123</p>
                </div>
                
                <div class="api-info">
                    <h3>🔗 Configuración:</h3>
                    <p>✅ Supabase: Conectado</p>
                    <p>✅ Variables de entorno: Configuradas</p>
                    <p>✅ Funciones serverless: Disponibles</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

server.listen(8888, () => {
    console.log('Servidor en http://localhost:8888');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('Puerto 8888 ocupado, probando 8889...');
        server.listen(8889, () => {
            console.log('Servidor en http://localhost:8889');
        });
    }
});
