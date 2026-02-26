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
        nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
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
        perfil_completo BOOLEAN NOT NULL DEFAULT FALSE,
        modo_busqueda_activo BOOLEAN NOT NULL DEFAULT FALSE,
        fecha_activacion_busqueda TIMESTAMP NULL,
        id_solicitud_traslado_pendiente CHAR(36) NULL,
        INDEX idx_nombre_usuario (nombre_usuario),
        INDEX idx_email (email),
        INDEX idx_rol (rol),
        INDEX idx_estado (estado_cuenta),
        INDEX idx_traslado_pendiente (id_solicitud_traslado_pendiente)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla usuarios verificada');

    // Agregar columnas de convivencia en usuarios para bases existentes.
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN modo_busqueda_activo BOOLEAN NOT NULL DEFAULT FALSE');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando modo_busqueda_activo en usuarios:', e.message);
      }
    }
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN fecha_activacion_busqueda TIMESTAMP NULL');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando fecha_activacion_busqueda en usuarios:', e.message);
      }
    }
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN id_solicitud_traslado_pendiente CHAR(36) NULL');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando id_solicitud_traslado_pendiente en usuarios:', e.message);
      }
    }
    try {
      await pool.query('ALTER TABLE usuarios ADD INDEX idx_traslado_pendiente (id_solicitud_traslado_pendiente)');
    } catch (e) {
      if (!e.message.includes('Duplicate key name')) {
        console.error('Error agregando indice idx_traslado_pendiente en usuarios:', e.message);
      }
    }
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN perfil_completo BOOLEAN NOT NULL DEFAULT FALSE');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando perfil_completo en usuarios:', e.message);
      }
    }

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
        preferencia_visitantes VARCHAR(30),
        preferencia_social INT DEFAULT 3 CHECK (preferencia_social BETWEEN 1 AND 5),
        preferencia_ruido INT DEFAULT 3 CHECK (preferencia_ruido BETWEEN 1 AND 5),
        preferencia_mascotas VARCHAR(30),
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_ciudad (ciudad),
        INDEX idx_presupuesto (presupuesto)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla perfiles verificada');

    // Agregar columnas de preferencias a perfiles para bases existentes
    const newPerfilCols = [
      { col: 'preferencia_visitantes', def: "VARCHAR(30)" },
      { col: 'preferencia_social', def: "INT DEFAULT 3" },
      { col: 'preferencia_ruido', def: "INT DEFAULT 3" },
      { col: 'preferencia_mascotas', def: "VARCHAR(30)" },
    ];
    for (const { col, def } of newPerfilCols) {
      try {
        await pool.query(`ALTER TABLE perfiles ADD COLUMN ${col} ${def}`);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) {
          console.error(`Error agregando ${col} en perfiles:`, e.message);
        }
      }
    }

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
        min_meses_permanencia INT NULL,
        area DECIMAL(10,2),
        amenidades JSON,
        reglas JSON,
        imagenes JSON,
        lugares_cercanos JSON,
        latitud DECIMAL(10,7),
        longitud DECIMAL(10,7),
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

    // Agregar columnas de coordenadas si no existen (para bases existentes)
    try {
      await pool.query('ALTER TABLE propiedades ADD COLUMN latitud DECIMAL(10,7)');
      await pool.query('ALTER TABLE propiedades ADD COLUMN longitud DECIMAL(10,7)');
      console.log('Columnas latitud/longitud agregadas a propiedades');
    } catch (e) {
      // Las columnas ya existen, ignorar el error
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando columnas de coordenadas:', e.message);
      }
    }

    // Agregar configuracion de permanencia por propiedad para bases existentes.
    try {
      await pool.query('ALTER TABLE propiedades ADD COLUMN min_meses_permanencia INT NULL');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando min_meses_permanencia en propiedades:', e.message);
      }
    }

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

    // Tabla de calificaciones (evaluaciones entre roommates/landlord)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calificaciones (
        id_calificacion CHAR(36) PRIMARY KEY,
        id_usuario_calificador CHAR(36) NOT NULL,
        id_usuario_calificado CHAR(36) NOT NULL,
        id_propiedad CHAR(36),
        puntuacion DECIMAL(2,1) NOT NULL CHECK (puntuacion BETWEEN 1.0 AND 5.0),
        comentario TEXT,
        fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario_calificador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario_calificado) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE SET NULL,
        UNIQUE KEY uk_calificacion (id_usuario_calificador, id_usuario_calificado, id_propiedad),
        INDEX idx_calificado (id_usuario_calificado),
        INDEX idx_propiedad (id_propiedad)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla calificaciones verificada');

    // Migracion de compatibilidad para instancias existentes con esquema anterior.
    try {
      await pool.query('ALTER TABLE calificaciones ADD COLUMN puntuacion DECIMAL(2,1) NULL');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.error('Error agregando puntuacion en calificaciones:', e.message);
      }
    }
    try {
      await pool.query(`
        UPDATE calificaciones
        SET puntuacion = ROUND((COALESCE(limpieza, 0) + COALESCE(convivencia, 0) + COALESCE(respeto_reglas, 0)) / 3, 1)
        WHERE puntuacion IS NULL
          AND limpieza IS NOT NULL
          AND convivencia IS NOT NULL
          AND respeto_reglas IS NOT NULL
      `);
    } catch (e) {
      // En instalaciones nuevas no existen las columnas legacy, ignorar.
    }
    try {
      await pool.query('UPDATE calificaciones SET puntuacion = 3.0 WHERE puntuacion IS NULL');
    } catch (e) {
      console.error('Error normalizando puntuacion en calificaciones:', e.message);
    }
    for (const columnaLegacy of ['limpieza', 'convivencia', 'respeto_reglas']) {
      try {
        await pool.query(`ALTER TABLE calificaciones DROP COLUMN ${columnaLegacy}`);
      } catch (e) {
        if (!e.message.includes("Can't DROP")) {
          console.error(`Error eliminando columna legacy ${columnaLegacy} en calificaciones:`, e.message);
        }
        try {
          await pool.query(`ALTER TABLE calificaciones MODIFY COLUMN ${columnaLegacy} INT NULL`);
        } catch (nestedError) {
          if (!nestedError.message.includes('Unknown column')) {
            console.error(`Error ajustando columna legacy ${columnaLegacy} en calificaciones:`, nestedError.message);
          }
        }
      }
    }
    try {
      await pool.query('ALTER TABLE calificaciones MODIFY COLUMN puntuacion DECIMAL(2,1) NOT NULL');
    } catch (e) {
      if (!e.message.includes('Data truncated')) {
        console.error('Error ajustando columna puntuacion en calificaciones:', e.message);
      }
    }

    // Tabla de pendientes de calificacion para landlords.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calificaciones_pendientes (
        id_pendiente CHAR(36) PRIMARY KEY,
        id_landlord CHAR(36) NOT NULL,
        id_tenant CHAR(36) NOT NULL,
        id_propiedad CHAR(36) NOT NULL,
        motivo ENUM('salida_tenant', 'remocion_landlord') NOT NULL DEFAULT 'salida_tenant',
        estado ENUM('pendiente', 'completada', 'omitida') NOT NULL DEFAULT 'pendiente',
        motivo_omision TEXT,
        fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_resolucion TIMESTAMP NULL,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_landlord) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_tenant) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
        INDEX idx_landlord_estado (id_landlord, estado),
        INDEX idx_tenant (id_tenant),
        INDEX idx_propiedad (id_propiedad)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla calificaciones_pendientes verificada');

    // Tabla de calificaciones al grupo de convivencia.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calificaciones_grupo (
        id_calificacion_grupo CHAR(36) PRIMARY KEY,
        id_grupo CHAR(36) NOT NULL,
        id_usuario_calificador CHAR(36) NOT NULL,
        puntuacion DECIMAL(2,1) NOT NULL CHECK (puntuacion BETWEEN 1.0 AND 5.0),
        comentario TEXT,
        fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_grupo) REFERENCES grupos_roommates(id_grupo) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario_calificador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY uk_calificacion_grupo_usuario (id_grupo, id_usuario_calificador),
        INDEX idx_grupo (id_grupo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla calificaciones_grupo verificada');

    // Tabla de notificaciones (notificaciones dentro de la app)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id_notificacion CHAR(36) PRIMARY KEY,
        id_usuario CHAR(36) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensaje TEXT,
        tipo ENUM('match', 'tarea', 'board', 'grupo', 'sistema', 'solicitud') DEFAULT 'sistema',
        leida BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_usuario (id_usuario),
        INDEX idx_leida (leida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla notificaciones verificada');

    // Actualizar enum de tipo si la tabla ya existía sin 'solicitud'
    try {
      await pool.query(`ALTER TABLE notificaciones MODIFY COLUMN tipo ENUM('match', 'tarea', 'board', 'grupo', 'sistema', 'solicitud') DEFAULT 'sistema'`);
    } catch (e) {
      // Ignorar si ya tiene el enum correcto
    }

    // Tabla de solicitudes de informes (inquiries de tenants a landlords)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_informes (
        id_solicitud CHAR(36) PRIMARY KEY,
        id_tenant CHAR(36) NOT NULL,
        id_propiedad CHAR(36) NOT NULL,
        id_landlord CHAR(36) NOT NULL,
        estado ENUM('pendiente', 'aceptada', 'rechazada', 'confirmada', 'declinada', 'traslado_pendiente') DEFAULT 'pendiente',
        mensaje_tenant TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_tenant) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
        FOREIGN KEY (id_landlord) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY uk_tenant_propiedad (id_tenant, id_propiedad),
        INDEX idx_tenant (id_tenant),
        INDEX idx_landlord (id_landlord),
        INDEX idx_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla solicitudes_informes verificada');

    // Actualizar enum de estado en solicitudes_informes para incluir traslado_pendiente.
    try {
      await pool.query(`ALTER TABLE solicitudes_informes MODIFY COLUMN estado ENUM('pendiente', 'aceptada', 'rechazada', 'confirmada', 'declinada', 'traslado_pendiente') DEFAULT 'pendiente'`);
    } catch (e) {
      // Ignorar si ya tiene el enum correcto
    }

    // Tabla de mensajes del chat (chat entre tenant y landlord tras aceptar solicitud)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensajes_chat (
        id_mensaje CHAR(36) PRIMARY KEY,
        id_solicitud CHAR(36) NOT NULL,
        id_emisor CHAR(36) NOT NULL,
        contenido TEXT NOT NULL,
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_solicitud) REFERENCES solicitudes_informes(id_solicitud) ON DELETE CASCADE,
        FOREIGN KEY (id_emisor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_solicitud (id_solicitud),
        INDEX idx_emisor (id_emisor)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla mensajes_chat verificada');

    console.log('Base de datos inicializada correctamente: Todas las tablas verificadas');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
};

module.exports = { initDatabase };
