const { pool } = require("./db");


const initDatabase = async () => {
  try {
    
    await pool.query('DROP TABLE IF EXISTS users');

    const createTableSQL = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario CHAR(36) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                contraseña_hash VARCHAR(255) NOT NULL,
                fecha_nacimiento DATE,
                genero VARCHAR(20),
                universidad VARCHAR(100),
                carrera VARCHAR(100),
                biografia TEXT,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado_cuenta ENUM('activo', 'suspendido', 'baja') DEFAULT 'activo',
                rol ENUM('tenant', 'landlord', 'admin') NOT NULL DEFAULT 'tenant'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

    await pool.query(createTableSQL);
    console.log('Base de datos inicializada: Tabla usuarios creada');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
};

module.exports = { initDatabase };
