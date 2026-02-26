const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const {
    construirErrorRegla,
    getTenantConvivenciaContext,
    validarConsistenciaConvivenciaActiva,
    enviarErrorRegla,
} = require('../services/convivenciaRules');
const {
    obtenerResumenPendientesCalificacionLandlord,
} = require('../services/ratingsService');

async function obtenerTituloPropiedad(executor, idPropiedad) {
    const [rows] = await executor.query(
        'SELECT titulo FROM propiedades WHERE id_propiedad = ?',
        [idPropiedad]
    );
    return rows[0]?.titulo || 'la propiedad';
}

async function obtenerOCrearGrupoActivoPorPropiedad(connection, idPropiedad) {
    const [grupoRows] = await connection.query(
        `SELECT id_grupo
         FROM grupos_roommates
         WHERE id_propiedad = ? AND activo = TRUE
         LIMIT 1 FOR UPDATE`,
        [idPropiedad]
    );

    if (grupoRows.length > 0) {
        return grupoRows[0].id_grupo;
    }

    const [propRows] = await connection.query(
        'SELECT titulo FROM propiedades WHERE id_propiedad = ? FOR UPDATE',
        [idPropiedad]
    );

    if (propRows.length === 0) {
        throw construirErrorRegla('PROPERTY_NOT_FOUND', 'La propiedad no existe', 404);
    }

    const idGrupo = uuidv4();
    const tituloGrupo = `Roommates - ${propRows[0].titulo || 'Propiedad'}`;

    await connection.query(
        'INSERT INTO grupos_roommates (id_grupo, nombre, id_propiedad) VALUES (?, ?, ?)',
        [idGrupo, tituloGrupo, idPropiedad]
    );

    return idGrupo;
}

async function agregarTenantAGrupo(connection, idGrupo, idTenant) {
    const [otrosActivos] = await connection.query(
        `SELECT g.id_grupo
         FROM miembros_grupo mg
         JOIN grupos_roommates g ON g.id_grupo = mg.id_grupo
         WHERE mg.id_usuario = ? AND g.activo = TRUE AND g.id_grupo <> ?
         FOR UPDATE`,
        [idTenant, idGrupo]
    );

    if (otrosActivos.length > 0) {
        throw construirErrorRegla(
            'ACTIVE_CONVIVENCIA_EXISTS',
            'El tenant ya pertenece a otra convivencia activa',
            409
        );
    }

    const [yaEsMiembro] = await connection.query(
        'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ? FOR UPDATE',
        [idGrupo, idTenant]
    );

    if (yaEsMiembro.length === 0) {
        const idMiembro = uuidv4();
        await connection.query(
            'INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?, ?)',
            [idMiembro, idGrupo, idTenant, 'miembro']
        );
        return true;
    }

    return false;
}

async function bloquearPropiedadYValidarCapacidad(connection, idPropiedad) {
    const [propRows] = await connection.query(
        `SELECT id_propiedad, titulo, habitaciones, habitaciones_disponibles, disponible
         FROM propiedades
         WHERE id_propiedad = ?
         FOR UPDATE`,
        [idPropiedad]
    );

    if (propRows.length === 0) {
        throw construirErrorRegla('PROPERTY_NOT_FOUND', 'La propiedad no existe', 404);
    }

    const propiedad = propRows[0];
    const habitaciones = Number(propiedad.habitaciones);
    const disponibles = Number(propiedad.habitaciones_disponibles);

    if (!Number.isFinite(habitaciones) || habitaciones <= 0) {
        throw construirErrorRegla(
            'INVALID_PROPERTY_CAPACITY',
            'La propiedad tiene una capacidad total invalida',
            409
        );
    }

    if (!Number.isFinite(disponibles) || disponibles < 0 || disponibles > habitaciones) {
        throw construirErrorRegla(
            'INVALID_PROPERTY_CAPACITY',
            'La propiedad tiene un estado de habitaciones disponibles inconsistente',
            409
        );
    }

    return {
        ...propiedad,
        habitaciones,
        habitaciones_disponibles: disponibles,
    };
}

async function decrementarHabitacionDisponible(connection, idPropiedad) {
    const propiedad = await bloquearPropiedadYValidarCapacidad(connection, idPropiedad);

    if (!propiedad.disponible || propiedad.habitaciones_disponibles <= 0) {
        throw construirErrorRegla(
            'PROPERTY_NO_AVAILABILITY',
            'La propiedad ya no tiene habitaciones disponibles',
            409
        );
    }

    const [result] = await connection.query(
        `UPDATE propiedades
         SET habitaciones_disponibles = habitaciones_disponibles - 1
         WHERE id_propiedad = ? AND habitaciones_disponibles > 0`,
        [idPropiedad]
    );

    if (result.affectedRows === 0) {
        throw construirErrorRegla(
            'PROPERTY_NO_AVAILABILITY',
            'La propiedad ya no tiene habitaciones disponibles',
            409
        );
    }
}

// Tenant crea una solicitud de informes para una propiedad.
router.post('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id_propiedad, mensaje } = req.body;

        if (!id_propiedad) {
            return res.status(400).json({ success: false, message: 'id_propiedad es obligatorio' });
        }

        const [propRows] = await pool.query(
            `SELECT id_propiedad, id_landlord, titulo, disponible, habitaciones_disponibles
             FROM propiedades
             WHERE id_propiedad = ?`,
            [id_propiedad]
        );

        if (propRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Propiedad no encontrada' });
        }

        const propiedad = propRows[0];
        if (!propiedad.disponible || Number(propiedad.habitaciones_disponibles) <= 0) {
            throw construirErrorRegla(
                'PROPERTY_NO_AVAILABILITY',
                'La propiedad ya no tiene habitaciones disponibles',
                409
            );
        }

        const contextoTenant = await getTenantConvivenciaContext(pool, req.usuario.id);
        validarConsistenciaConvivenciaActiva(contextoTenant);

        if (contextoTenant.convivenciaActiva) {
            throw construirErrorRegla(
                'ACTIVE_CONVIVENCIA_EXISTS',
                'No puedes enviar solicitudes mientras pertenezcas a un grupo activo',
                409
            );
        }

        const [existing] = await pool.query(
            'SELECT id_solicitud FROM solicitudes_informes WHERE id_tenant = ? AND id_propiedad = ?',
            [req.usuario.id, id_propiedad]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Ya enviaste una solicitud para esta propiedad' });
        }

        const id_solicitud = uuidv4();

        await pool.query(
            `INSERT INTO solicitudes_informes (id_solicitud, id_tenant, id_propiedad, id_landlord, mensaje_tenant)
             VALUES (?, ?, ?, ?, ?)`,
            [id_solicitud, req.usuario.id, id_propiedad, propiedad.id_landlord, mensaje || null]
        );

        const id_notificacion = uuidv4();
        const tenantNombre = req.usuario.nombre || req.usuario.username || 'Un inquilino';
        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [
                id_notificacion,
                propiedad.id_landlord,
                'Nueva solicitud de informes',
                `${tenantNombre} esta interesado en tu propiedad "${propiedad.titulo}"`,
            ]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${propiedad.id_landlord}`).emit('nueva-solicitud', {
                id_solicitud,
                id_propiedad,
                titulo_propiedad: propiedad.titulo,
                tenant_nombre: tenantNombre,
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Solicitud enviada exitosamente',
            solicitud: { id_solicitud, estado: 'pendiente' },
        });
    } catch (error) {
        console.error('Error creando solicitud:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    }
});

// Tenant obtiene sus solicitudes enviadas.
router.get('/mis-solicitudes', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const [solicitudes] = await pool.query(
            `SELECT s.*, p.titulo AS titulo_propiedad, p.ciudad, p.imagenes,
                    u.nombre AS landlord_nombre, u.apellido AS landlord_apellido
             FROM solicitudes_informes s
             JOIN propiedades p ON s.id_propiedad = p.id_propiedad
             JOIN usuarios u ON s.id_landlord = u.id_usuario
             WHERE s.id_tenant = ?
             ORDER BY s.fecha_creacion DESC`,
            [req.usuario.id]
        );

        const parsed = solicitudes.map(s => ({
            ...s,
            imagenes: (() => {
                try {
                    return typeof s.imagenes === 'string' ? JSON.parse(s.imagenes) : (s.imagenes || []);
                } catch {
                    return [];
                }
            })(),
        }));

        return res.json({ success: true, solicitudes: parsed });
    } catch (error) {
        console.error('Error obteniendo solicitudes del tenant:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord obtiene solicitudes recibidas.
router.get('/recibidas', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const [solicitudes] = await pool.query(
            `SELECT s.*, p.titulo AS titulo_propiedad, p.ciudad, p.imagenes,
                    u.nombre AS tenant_nombre, u.apellido AS tenant_apellido, u.email AS tenant_email
             FROM solicitudes_informes s
             JOIN propiedades p ON s.id_propiedad = p.id_propiedad
             JOIN usuarios u ON s.id_tenant = u.id_usuario
             WHERE s.id_landlord = ?
             ORDER BY s.fecha_creacion DESC`,
            [req.usuario.id]
        );

        const parsed = solicitudes.map(s => ({
            ...s,
            imagenes: (() => {
                try {
                    return typeof s.imagenes === 'string' ? JSON.parse(s.imagenes) : (s.imagenes || []);
                } catch {
                    return [];
                }
            })(),
        }));

        return res.json({ success: true, solicitudes: parsed });
    } catch (error) {
        console.error('Error obteniendo solicitudes recibidas:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord acepta una solicitud.
router.put('/:id/aceptar', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM solicitudes_informes WHERE id_solicitud = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        if (rows[0].estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
        }

        await pool.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['aceptada', id]
        );

        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';
        const tituloPropiedad = await obtenerTituloPropiedad(pool, rows[0].id_propiedad);

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [
                id_notificacion,
                rows[0].id_tenant,
                'Solicitud aceptada',
                `${landlordNombre} acepto tu solicitud para "${tituloPropiedad}". Ya pueden chatear.`,
            ]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${rows[0].id_tenant}`).emit('solicitud-aceptada', {
                id_solicitud: id,
                titulo_propiedad: tituloPropiedad,
                landlord_nombre: landlordNombre,
            });
        }

        return res.json({ success: true, message: 'Solicitud aceptada. Se habilito el chat.' });
    } catch (error) {
        console.error('Error aceptando solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord rechaza una solicitud.
router.put('/:id/rechazar', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM solicitudes_informes WHERE id_solicitud = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        if (rows[0].estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
        }

        await pool.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['rechazada', id]
        );

        return res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord obtiene el conteo de tenants interesados.
router.get('/contador', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM solicitudes_informes
             WHERE id_landlord = ? AND estado IN ('pendiente', 'aceptada')`,
            [req.usuario.id]
        );
        return res.json({ success: true, total: rows[0].total });
    } catch (error) {
        console.error('Error obteniendo contador:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord confirma a un inquilino.
router.put('/:id/confirmar', verificarToken, verificarRol('landlord'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        await connection.beginTransaction();

        const pendientes = await obtenerResumenPendientesCalificacionLandlord(connection, req.usuario.id);
        if (pendientes.total > 0) {
            const errorPendientes = construirErrorRegla(
                'LANDLORD_PENDING_RATINGS',
                'Tienes calificaciones pendientes por resolver antes de confirmar nuevos inquilinos',
                409
            );
            errorPendientes.pendingRatings = pendientes;
            throw errorPendientes;
        }

        const [rows] = await connection.query(
            `SELECT *
             FROM solicitudes_informes
             WHERE id_solicitud = ? AND id_landlord = ?
             FOR UPDATE`,
            [id, req.usuario.id]
        );

        if (rows.length === 0) {
            throw construirErrorRegla('REQUEST_NOT_FOUND', 'Solicitud no encontrada', 404);
        }

        if (rows[0].estado !== 'aceptada') {
            throw construirErrorRegla('INVALID_REQUEST_STATE', 'Solo se pueden confirmar solicitudes aceptadas', 400);
        }

        const solicitud = rows[0];
        const contexto = await getTenantConvivenciaContext(connection, solicitud.id_tenant, {
            forUpdateUser: true,
            forUpdateMembership: true,
        });
        validarConsistenciaConvivenciaActiva(contexto);

        if (contexto.convivenciaActiva) {
            throw construirErrorRegla(
                'ACTIVE_CONVIVENCIA_EXISTS',
                'El tenant ya tiene una convivencia activa. Debe salir de su grupo actual antes de ser confirmado.',
                409
            );
        }

        await bloquearPropiedadYValidarCapacidad(connection, solicitud.id_propiedad);
        const idGrupo = await obtenerOCrearGrupoActivoPorPropiedad(connection, solicitud.id_propiedad);
        const agregado = await agregarTenantAGrupo(connection, idGrupo, solicitud.id_tenant);

        if (agregado) {
            await decrementarHabitacionDisponible(connection, solicitud.id_propiedad);
        }

        await connection.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['confirmada', id]
        );

        await connection.commit();

        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';
        const tituloPropiedad = await obtenerTituloPropiedad(pool, solicitud.id_propiedad);

        const mensajeNotificacion = `${landlordNombre} te confirmo como inquilino para "${tituloPropiedad}".`;

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [
                id_notificacion,
                solicitud.id_tenant,
                'Inquilino confirmado',
                mensajeNotificacion,
            ]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${solicitud.id_tenant}`).emit('solicitud-confirmada', {
                id_solicitud: id,
                titulo_propiedad: tituloPropiedad,
                landlord_nombre: landlordNombre,
                estado: 'confirmada',
            });
        }

        return res.json({
            success: true,
            estado: 'confirmada',
            message: 'Inquilino confirmado y agregado al grupo exitosamente.',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error confirmando solicitud:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    } finally {
        connection.release();
    }
});

// Landlord declina a un inquilino tras chat.
router.put('/:id/declinar', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM solicitudes_informes WHERE id_solicitud = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        if (rows[0].estado !== 'aceptada') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden declinar solicitudes aceptadas',
            });
        }

        await pool.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['declinada', id]
        );

        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';
        const tituloPropiedad = await obtenerTituloPropiedad(pool, rows[0].id_propiedad);

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [
                id_notificacion,
                rows[0].id_tenant,
                'Solicitud declinada',
                `${landlordNombre} ha declinado tu solicitud para "${tituloPropiedad}".`,
            ]
        );

        return res.json({ success: true, message: 'Inquilino declinado.' });
    } catch (error) {
        console.error('Error declinando solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
