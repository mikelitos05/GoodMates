const { pool } = require('./db');

// Inicializar la base de datos creando todas las tablas necesarias
const initDatabase = async () => {
  try {
    // Eliminar tablas en orden inverso de dependencia para evitar errores de FK
    // Esto asegura que el esquema siempre este actualizado
    // await pool.query('DROP TABLE IF EXISTS notificaciones');
    // await pool.query('DROP TABLE IF EXISTS calificaciones');
    // await pool.query('DROP TABLE IF EXISTS respuestas_board');
    // await pool.query('DROP TABLE IF EXISTS publicaciones_board');
    // await pool.query('DROP TABLE IF EXISTS tareas');
    // await pool.query('DROP TABLE IF EXISTS miembros_grupo');
    // await pool.query('DROP TABLE IF EXISTS grupos_roommates');
    // await pool.query('DROP TABLE IF EXISTS matches');
    // await pool.query('DROP TABLE IF EXISTS propiedades');
    // await pool.query('DROP TABLE IF EXISTS perfiles');
    // await pool.query('DROP TABLE IF EXISTS usuarios');
    // console.log('Tablas anteriores eliminadas');

    // Tabla de usuarios (autenticacion y datos basicos)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario CHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        contrasena_hash VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE,
        genero VARCHAR(20),
        universidad VARCHAR(100),
        carrera VARCHAR(100),
        biografia TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado_cuenta ENUM('activo', 'suspendido', 'baja') DEFAULT 'activo',
        rol ENUM('tenant', 'landlord', 'admin') NOT NULL DEFAULT 'tenant',
        INDEX idx_email (email),
        INDEX idx_rol (rol),
        INDEX idx_estado (estado_cuenta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla usuarios verificada');

    // Tabla de perfiles extendidos (informacion detallada del tenant para compatibilidad)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perfiles (
        id_perfil CHAR(36) PRIMARY KEY,
        id_usuario CHAR(36) NOT NULL UNIQUE,
        edad INT,
        presupuesto DECIMAL(10,2),
        ciudad VARCHAR(100),
        horario ENUM('Matutino', 'Vespertino', 'Nocturno', 'Mixto'),
        semestre INT,
        ocupacion VARCHAR(100),
        mascotas BOOLEAN DEFAULT FALSE,
        fumador BOOLEAN DEFAULT FALSE,
        limpieza INT DEFAULT 3 CHECK (limpieza BETWEEN 1 AND 5),
        ruido INT DEFAULT 3 CHECK (ruido BETWEEN 1 AND 5),
        visitantes ENUM('Raramente', 'Ocasionalmente', 'Frecuentemente'),
        hobbies JSON,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_ciudad (ciudad),
        INDEX idx_presupuesto (presupuesto)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla perfiles verificada');

    // Tabla de propiedades (inmuebles publicados por landlords)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS propiedades (
        id_propiedad CHAR(36) PRIMARY KEY,
        id_landlord CHAR(36) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT,
        direccion VARCHAR(255),
        ciudad VARCHAR(100),
        estado VARCHAR(100),
        precio DECIMAL(10,2) NOT NULL,
        habitaciones INT NOT NULL,
        banos INT NOT NULL,
        habitaciones_disponibles INT NOT NULL,
        area DECIMAL(10,2),
        amenidades JSON,
        reglas JSON,
        imagenes JSON,
        lugares_cercanos JSON,
        disponible BOOLEAN DEFAULT TRUE,
        destacada BOOLEAN DEFAULT FALSE,
        fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_landlord) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_landlord (id_landlord),
        INDEX idx_ciudad (ciudad),
        INDEX idx_precio (precio),
        INDEX idx_disponible (disponible)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla propiedades verificada');

    // Tabla de matches (compatibilidad entre tenants)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id_match CHAR(36) PRIMARY KEY,
        id_usuario_1 CHAR(36) NOT NULL,
        id_usuario_2 CHAR(36) NOT NULL,
        porcentaje_compatibilidad INT NOT NULL,
        estado ENUM('pendiente', 'aceptado', 'rechazado') DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario_1) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario_2) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY uk_match_par (id_usuario_1, id_usuario_2),
        INDEX idx_usuario_1 (id_usuario_1),
        INDEX idx_usuario_2 (id_usuario_2),
        INDEX idx_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla matches verificada');

    // Tabla de grupos de roommates (grupos de convivencia)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupos_roommates (
        id_grupo CHAR(36) PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        id_propiedad CHAR(36),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (id_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE SET NULL,
        INDEX idx_propiedad (id_propiedad)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla grupos_roommates verificada');

    // Tabla de miembros del grupo (relacion N:M entre usuarios y grupos)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS miembros_grupo (
        id_miembro CHAR(36) PRIMARY KEY,
        id_grupo CHAR(36) NOT NULL,
        id_usuario CHAR(36) NOT NULL,
        rol_en_grupo ENUM('creador', 'miembro') DEFAULT 'miembro',
        fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_grupo) REFERENCES grupos_roommates(id_grupo) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY uk_grupo_usuario (id_grupo, id_usuario),
        INDEX idx_grupo (id_grupo),
        INDEX idx_usuario (id_usuario)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla miembros_grupo verificada');

    // Tabla de tareas (Task Manager)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tareas (
        id_tarea CHAR(36) PRIMARY KEY,
        id_grupo CHAR(36) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT,
        id_asignado CHAR(36),
        estado ENUM('pendiente', 'en_progreso', 'completada') DEFAULT 'pendiente',
        fecha_vencimiento DATE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_grupo) REFERENCES grupos_roommates(id_grupo) ON DELETE CASCADE,
        FOREIGN KEY (id_asignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        INDEX idx_grupo (id_grupo),
        INDEX idx_asignado (id_asignado),
        INDEX idx_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla tareas verificada');

    // Tabla de publicaciones del Board (Mates Board)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS publicaciones_board (
        id_publicacion CHAR(36) PRIMARY KEY,
        id_grupo CHAR(36) NOT NULL,
        id_autor CHAR(36) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        contenido TEXT NOT NULL,
        tipo ENUM('announcement', 'discussion', 'event') DEFAULT 'discussion',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_grupo) REFERENCES grupos_roommates(id_grupo) ON DELETE CASCADE,
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_grupo (id_grupo),
        INDEX idx_autor (id_autor)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla publicaciones_board verificada');

    // Tabla de respuestas del Board (respuestas a publicaciones)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS respuestas_board (
        id_respuesta CHAR(36) PRIMARY KEY,
        id_publicacion CHAR(36) NOT NULL,
        id_autor CHAR(36) NOT NULL,
        contenido TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_publicacion) REFERENCES publicaciones_board(id_publicacion) ON DELETE CASCADE,
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_publicacion (id_publicacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla respuestas_board verificada');

    // Tabla de calificaciones (evaluaciones entre roommates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calificaciones (
        id_calificacion CHAR(36) PRIMARY KEY,
        id_calificador CHAR(36) NOT NULL,
        id_calificado CHAR(36) NOT NULL,
        id_grupo CHAR(36) NOT NULL,
        puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
        comentario TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_calificador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_calificado) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_grupo) REFERENCES grupos_roommates(id_grupo) ON DELETE CASCADE,
        UNIQUE KEY uk_calificacion (id_calificador, id_calificado, id_grupo),
        INDEX idx_calificado (id_calificado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla calificaciones verificada');

    // Tabla de notificaciones (notificaciones dentro de la app)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id_notificacion CHAR(36) PRIMARY KEY,
        id_usuario CHAR(36) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensaje TEXT,
        tipo ENUM('match', 'tarea', 'board', 'grupo', 'sistema') DEFAULT 'sistema',
        leida BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_usuario (id_usuario),
        INDEX idx_leida (leida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla notificaciones verificada');

    console.log('Base de datos inicializada correctamente: Todas las tablas verificadas');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
};

module.exports = { initDatabase };
