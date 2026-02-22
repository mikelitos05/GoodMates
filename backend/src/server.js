const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;




app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));


app.use(express.json());




app.use('/api/auth', authRoutes);


app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor GoodMates funcionando correctamente',
        timestamp: new Date().toISOString(),
    });
});


const startServer = async () => {
    try {
        
        await testConnection();

        
        await initDatabase();

        
        app.listen(PORT, () => {
        });
    } catch (error) {
        process.exit(1);
    }
};

startServer();
