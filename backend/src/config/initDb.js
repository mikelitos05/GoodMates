const { pool } = require("./db");

// Crear la tabla users si no existe
const initDatabase = async () => {
  try {
    const createTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(200) NOT NULL,
                role ENUM('tenant', 'landlord', 'admin') NOT NULL DEFAULT 'tenant',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

    await pool.query(createTableSQL);
  } catch (error) {
    throw error;
  }
};

module.exports = { initDatabase };
