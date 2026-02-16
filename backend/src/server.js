const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// Middlewares
// ==========================================

// CORS restringido - solo permite peticiones desde el frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Parseo de JSON
app.use(express.json());

// ==========================================
// Rutas
// ==========================================

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor GoodMates funcionando correctamente',
        timestamp: new Date().toISOString(),
    });
});

// ==========================================
// Iniciar servidor
// ==========================================
const startServer = async () => {
    try {
        // Verificar conexión a MySQL
        await testConnection();

        // Inicializar tablas
        await initDatabase();

        // Levantar servidor
        app.listen(PORT, () => {
        });
    } catch (error) {
        process.exit(1);
    }
};

startServer();
