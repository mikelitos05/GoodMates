const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones a MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Verificar conexión al iniciar
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        connection.release();
    } catch (error) {
        process.exit(1);
    }
};

module.exports = { pool, testConnection };
