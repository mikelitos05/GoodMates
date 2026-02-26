const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { initDatabase } = require('./config/initDb');

// Importar todas las rutas de la API
const authRoutes = require('./routes/auth');
const perfilesRoutes = require('./routes/perfiles');
const propiedadesRoutes = require('./routes/propiedades');
const matchesRoutes = require('./routes/matches');
const gruposRoutes = require('./routes/grupos');
const tareasRoutes = require('./routes/tareas');
const boardRoutes = require('./routes/board');
const adminRoutes = require('./routes/admin');
const calificacionesRoutes = require('./routes/calificaciones');
const solicitudesRoutes = require('./routes/solicitudes');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Crear servidor HTTP para usar con Socket.io
const server = http.createServer(app);

// Configurar Socket.io para comunicacion en tiempo real en el Board
const io = new Server(server, {
    cors: {
        origin: '*',  // Permitir conexiones desde cualquier origen (dev)
        methods: ['GET', 'POST'],
    },
});

// Configurar CORS para permitir peticiones desde cualquier dispositivo en la red local
app.use(cors({
    origin: true,  // Reflejar el origin de la petición (permite cualquier origen)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Parsear cuerpos JSON en las peticiones
app.use(express.json());

// Servir archivos estaticos de la carpeta uploads
// Esto permite acceder a las imagenes subidas de propiedades por URL
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Registrar las rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/perfiles', perfilesRoutes);
app.use('/api/propiedades', propiedadesRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/chat', chatRoutes);

// Endpoint de health check para verificar que el servidor esta funcionando
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor GoodMates funcionando correctamente',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/auth - Autenticacion (registro, login, verificar token)',
            '/api/perfiles - Perfiles de tenants',
            '/api/propiedades - Gestion de propiedades',
            '/api/matches - Sistema de compatibilidad',
            '/api/grupos - Grupos de roommates',
            '/api/tareas - Task Manager',
            '/api/board - Mates Board',
            '/api/admin - Panel de administracion',
            '/api/calificaciones - Calificaciones entre roommates',
        ],
    });
});

// Configurar Socket.io para eventos en tiempo real
io.on('connection', (socket) => {
    console.log('Usuario conectado al socket:', socket.id);

    // El usuario se une a su sala personal para recibir notificaciones
    socket.on('unirse-usuario', (idUsuario) => {
        socket.join(`usuario-${idUsuario}`);
        console.log(`Socket ${socket.id} se unio a la sala del usuario ${idUsuario}`);
    });

    // El usuario se une a la sala de su grupo para recibir actualizaciones
    socket.on('unirse-grupo', (idGrupo) => {
        socket.join(`grupo-${idGrupo}`);
        console.log(`Socket ${socket.id} se unio al grupo ${idGrupo}`);
    });

    // El usuario se une a una sala de chat
    socket.on('unirse-chat', (idSolicitud) => {
        socket.join(`chat-${idSolicitud}`);
        console.log(`Socket ${socket.id} se unio al chat ${idSolicitud}`);
    });

    // Emitir nueva publicacion a todos los miembros del grupo
    socket.on('nueva-publicacion', (data) => {
        io.to(`grupo-${data.idGrupo}`).emit('publicacion-creada', data);
    });

    // Emitir nueva respuesta a todos los miembros del grupo
    socket.on('nueva-respuesta', (data) => {
        io.to(`grupo-${data.idGrupo}`).emit('respuesta-creada', data);
    });

    // Emitir actualizacion de tarea a todos los miembros del grupo
    socket.on('tarea-actualizada', (data) => {
        io.to(`grupo-${data.idGrupo}`).emit('tarea-cambio', data);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado del socket:', socket.id);
    });
});

// Hacer la instancia de io accesible desde las rutas
app.set('io', io);

// Middleware para manejo centralizado de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);

    // Errores de multer (subida de archivos)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. Limite: 5MB',
        });
    }

    if (err.message && err.message.includes('Solo se permiten imagenes')) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
    });
});

// Iniciar el servidor
const startServer = async () => {
    try {
        await testConnection();
        await initDatabase();

        server.listen(PORT, '0.0.0.0', () => {
            // Detectar IP local para acceso desde celular
            const os = require('os');
            const nets = os.networkInterfaces();
            let lanIP = 'desconocida';
            for (const iface of Object.values(nets)) {
                for (const net of iface) {
                    if (net.family === 'IPv4' && !net.internal) {
                        lanIP = net.address;
                        break;
                    }
                }
            }
            console.log('\n Servidor corriendo exitosamente');
            console.log(` Local:    http://localhost:${PORT}`);
            console.log(` Red LAN:  http://${lanIP}:${PORT}`);
            console.log(` Health:   http://localhost:${PORT}/api/health`);
            console.log(` Socket.io habilitado para tiempo real`);
            console.log(` \n Para acceder desde tu celular, abre: http://${lanIP}:3000\n`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`\n ERROR: El puerto ${PORT} ya esta en uso.`);
                console.error(` Sugerencia: Cierra otras terminales que tengan el servidor corriendo o cambia el puerto en tu archivo .env\n`);
            } else {
                console.error(' Error al iniciar el servidor:', error);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error(' El servidor no pudo iniciarse debido a un error critico.');
        process.exit(1);
    }
};

startServer();
