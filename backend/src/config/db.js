const mysql = require('mysql2/promise');
require('dotenv').config();


const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'goodmates',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        connection.release();
    } catch (error) {
        console.error('Error de conexión a la base de datos:', error.message);
        throw error;
    }
};

module.exports = { pool, testConnection };
