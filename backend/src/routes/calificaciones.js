const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const {
    parsearPuntuacionDecimal,
    obtenerPendientesCalificacionLandlord,
} = require('../services/ratingsService');

function construirAvatar(nombre, apellido) {
    const inicialNombre = (nombre || '?').charAt(0).toUpperCase();
    const inicialApellido = (apellido || '?').charAt(0).toUpperCase();
    return `${inicialNombre}${inicialApellido}`;
}

async function upsertCalificacion(connection, {
    idUsuarioCalificador,
    idUsuarioCalificado,
    idPropiedad,
    puntuacion,
    comentario,
}) {
    const [existente] = await connection.query(
        `SELECT id_calificacion
         FROM calificaciones
         WHERE id_usuario_calificador = ?
           AND id_usuario_calificado = ?
           AND (id_propiedad = ? OR (id_propiedad IS NULL AND ? IS NULL))
         LIMIT 1`,
        [idUsuarioCalificador, idUsuarioCalificado, idPropiedad || null, idPropiedad || null]
    );

    if (existente.length > 0) {
        await connection.query(
            `UPDATE calificaciones
             SET puntuacion = ?, comentario = ?, fecha_calificacion = CURRENT_TIMESTAMP
             WHERE id_calificacion = ?`,
            [puntuacion, comentario || null, existente[0].id_calificacion]
        );
        return { id_calificacion: existente[0].id_calificacion, updated: true };
    }

    const idCalificacion = uuidv4();
    await connection.query(
        `INSERT INTO calificaciones
         (id_calificacion, id_usuario_calificador, id_usuario_calificado, id_propiedad, puntuacion, comentario)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idCalificacion, idUsuarioCalificador, idUsuarioCalificado, idPropiedad || null, puntuacion, comentario || null]
    );

    return { id_calificacion: idCalificacion, updated: false };
}

async function obtenerConvivenciaCompartidaActiva(executor, idTenantA, idTenantB) {
    const [rows] = await executor.query(
        `SELECT g.id_grupo, g.id_propiedad
         FROM miembros_grupo mg1
         JOIN miembros_grupo mg2
           ON mg2.id_grupo = mg1.id_grupo
          AND mg2.id_usuario = ?
         JOIN grupos_roommates g ON g.id_grupo = mg1.id_grupo
         WHERE mg1.id_usuario = ?
           AND g.activo = TRUE
         LIMIT 1`,
        [idTenantB, idTenantA]
    );

    return rows[0] || null;
}

async function upsertCalificacionGrupo(connection, {
    idGrupo,
    idUsuarioCalificador,
    puntuacion,
    comentario,
}) {
    const [existente] = await connection.query(
        `SELECT id_calificacion_grupo
         FROM calificaciones_grupo
         WHERE id_grupo = ? AND id_usuario_calificador = ?
         LIMIT 1`,
        [idGrupo, idUsuarioCalificador]
    );

    if (existente.length > 0) {
        await connection.query(
            `UPDATE calificaciones_grupo
             SET puntuacion = ?, comentario = ?, fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id_calificacion_grupo = ?`,
            [puntuacion, comentario || null, existente[0].id_calificacion_grupo]
        );
        return { id_calificacion_grupo: existente[0].id_calificacion_grupo, updated: true };
    }

    const idCalificacionGrupo = uuidv4();
    await connection.query(
        `INSERT INTO calificaciones_grupo
         (id_calificacion_grupo, id_grupo, id_usuario_calificador, puntuacion, comentario)
         VALUES (?, ?, ?, ?, ?)`,
        [idCalificacionGrupo, idGrupo, idUsuarioCalificador, puntuacion, comentario || null]
    );

    return { id_calificacion_grupo: idCalificacionGrupo, updated: false };
}

// Crear o actualizar una calificacion.
// tenant -> tenant (misma convivencia activa)
// landlord -> tenant (solo mediante id_pendiente valido)
router.post('/', verificarToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id_usuario_calificado, id_pendiente, puntuacion, comentario } = req.body;
        const { value: puntuacionNormalizada, error: puntuacionError } = parsearPuntuacionDecimal(puntuacion);

        if (puntuacionError) {
            return res.status(400).json({
                success: false,
                message: puntuacionError,
            });
        }

        await connection.beginTransaction();

        if (req.usuario.rol === 'landlord') {
            if (!id_pendiente) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Para arrendadores, id_pendiente es obligatorio',
                });
            }

            const [pendienteRows] = await connection.query(
                `SELECT id_pendiente, id_landlord, id_tenant, id_propiedad, estado
                 FROM calificaciones_pendientes
                 WHERE id_pendiente = ? AND id_landlord = ?
                 LIMIT 1
                 FOR UPDATE`,
                [id_pendiente, req.usuario.id]
            );

            if (pendienteRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Pendiente de calificación no encontrado',
                });
            }

            const pendiente = pendienteRows[0];
            if (pendiente.estado !== 'pendiente') {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Este pendiente ya fue resuelto',
                });
            }

            if (pendiente.id_tenant === req.usuario.id) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No puedes calificarte a ti mismo',
                });
            }

            const resultado = await upsertCalificacion(connection, {
                idUsuarioCalificador: req.usuario.id,
                idUsuarioCalificado: pendiente.id_tenant,
                idPropiedad: pendiente.id_propiedad,
                puntuacion: puntuacionNormalizada,
                comentario,
            });

            await connection.query(
                `UPDATE calificaciones_pendientes
                 SET estado = 'completada',
                     motivo_omision = NULL,
                     fecha_resolucion = CURRENT_TIMESTAMP
                 WHERE id_pendiente = ?`,
                [pendiente.id_pendiente]
            );

            await connection.commit();
            return res.json({
                success: true,
                message: resultado.updated
                    ? 'Calificación actualizada exitosamente'
                    : 'Calificación registrada exitosamente',
                id_calificacion: resultado.id_calificacion,
                id_pendiente: pendiente.id_pendiente,
                puntuacion: puntuacionNormalizada,
            });
        }

        if (req.usuario.rol !== 'tenant') {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para calificar en este contexto',
            });
        }

        if (!id_usuario_calificado) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'id_usuario_calificado es obligatorio para tenants',
            });
        }

        if (req.usuario.id === id_usuario_calificado) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'No puedes calificarte a ti mismo',
            });
        }

        const [usuarioCalificado] = await connection.query(
            "SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND rol = 'tenant' AND estado_cuenta = 'activo' LIMIT 1",
            [id_usuario_calificado]
        );
        if (usuarioCalificado.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'El usuario a calificar no existe o no es un tenant activo',
            });
        }

        const convivencia = await obtenerConvivenciaCompartidaActiva(
            connection,
            req.usuario.id,
            id_usuario_calificado
        );

        if (!convivencia) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                code: 'RATING_NOT_ALLOWED',
                message: 'Solo puedes calificar tenants de tu convivencia activa',
            });
        }

        const resultado = await upsertCalificacion(connection, {
            idUsuarioCalificador: req.usuario.id,
            idUsuarioCalificado: id_usuario_calificado,
            idPropiedad: convivencia.id_propiedad || null,
            puntuacion: puntuacionNormalizada,
            comentario,
        });

        await connection.commit();
        return res.json({
            success: true,
            message: resultado.updated
                ? 'Calificación actualizada exitosamente'
                : 'Calificación registrada exitosamente',
            id_calificacion: resultado.id_calificacion,
            puntuacion: puntuacionNormalizada,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creando calificación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    } finally {
        connection.release();
    }
});

// Crear o actualizar calificación al grupo actual del tenant.
router.post('/grupo', verificarToken, verificarRol('tenant'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id_grupo, puntuacion, comentario } = req.body;
        if (!id_grupo) {
            return res.status(400).json({
                success: false,
                message: 'id_grupo es obligatorio',
            });
        }

        const { value: puntuacionNormalizada, error: puntuacionError } = parsearPuntuacionDecimal(puntuacion);
        if (puntuacionError) {
            return res.status(400).json({
                success: false,
                message: puntuacionError,
            });
        }

        await connection.beginTransaction();
        const [membership] = await connection.query(
            `SELECT mg.id_miembro
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON g.id_grupo = mg.id_grupo
             WHERE mg.id_grupo = ? AND mg.id_usuario = ? AND g.activo = TRUE
             LIMIT 1
             FOR UPDATE`,
            [id_grupo, req.usuario.id]
        );

        if (membership.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                code: 'RATING_GROUP_NOT_ALLOWED',
                message: 'Solo puedes calificar grupos activos a los que perteneces',
            });
        }

        const resultado = await upsertCalificacionGrupo(connection, {
            idGrupo: id_grupo,
            idUsuarioCalificador: req.usuario.id,
            puntuacion: puntuacionNormalizada,
            comentario,
        });

        await connection.commit();
        return res.json({
            success: true,
            message: resultado.updated
                ? 'Calificación del grupo actualizada exitosamente'
                : 'Calificación del grupo registrada exitosamente',
            id_calificacion_grupo: resultado.id_calificacion_grupo,
            puntuacion: puntuacionNormalizada,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error calificando grupo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    } finally {
        connection.release();
    }
});

// Obtener reputación de un grupo.
router.get('/grupo/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [statsRows] = await pool.query(
            `SELECT ROUND(AVG(puntuacion), 1) AS promedio, COUNT(*) AS total
             FROM calificaciones_grupo
             WHERE id_grupo = ?`,
            [id]
        );

        const [miCalificacionRows] = await pool.query(
            `SELECT puntuacion, comentario
             FROM calificaciones_grupo
             WHERE id_grupo = ? AND id_usuario_calificador = ?
             LIMIT 1`,
            [id, req.usuario.id]
        );

        return res.json({
            success: true,
            calificacion_grupo: {
                promedio: statsRows[0]?.promedio !== null && statsRows[0]?.promedio !== undefined
                    ? Number(statsRows[0].promedio)
                    : null,
                total: Number(statsRows[0]?.total || 0),
                mi_calificacion: miCalificacionRows[0]?.puntuacion !== null && miCalificacionRows[0]?.puntuacion !== undefined
                    ? Number(miCalificacionRows[0].puntuacion)
                    : null,
                mi_comentario: miCalificacionRows[0]?.comentario || null,
            },
        });
    } catch (error) {
        console.error('Error obteniendo calificación de grupo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener las calificaciones de un usuario (promedio + detalle)
router.get('/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [promedios] = await pool.query(
            `SELECT
                ROUND(AVG(puntuacion), 1) AS promedio_general,
                COUNT(*) AS total
             FROM calificaciones
             WHERE id_usuario_calificado = ?`,
            [id]
        );

        const [calificaciones] = await pool.query(
            `SELECT c.*,
                u.nombre AS calificador_nombre,
                u.apellido AS calificador_apellido,
                u.nombre_usuario AS calificador_username,
                p.titulo AS propiedad_titulo
             FROM calificaciones c
             JOIN usuarios u ON c.id_usuario_calificador = u.id_usuario
             LEFT JOIN propiedades p ON c.id_propiedad = p.id_propiedad
             WHERE c.id_usuario_calificado = ?
             ORDER BY c.fecha_calificacion DESC`,
            [id]
        );

        const total = Number(promedios[0]?.total || 0);
        const promedioGeneral = total > 0 ? Number(promedios[0].promedio_general) : null;

        return res.json({
            success: true,
            reputacion: {
                promedio_general: promedioGeneral,
                // Aliases de compatibilidad retro con frontend legacy
                promedio_limpieza: promedioGeneral,
                promedio_convivencia: promedioGeneral,
                promedio_respeto_reglas: promedioGeneral,
                total_calificaciones: total,
            },
            calificaciones: calificaciones.map((c) => {
                const puntuacionActual = Number(c.puntuacion);
                return {
                    id: c.id_calificacion,
                    calificador: {
                        nombre: `${c.calificador_nombre} ${c.calificador_apellido}`.trim(),
                        username: c.calificador_username,
                        avatar: construirAvatar(c.calificador_nombre, c.calificador_apellido),
                    },
                    propiedad: c.propiedad_titulo || null,
                    id_propiedad: c.id_propiedad || null,
                    puntuacion: puntuacionActual,
                    // Campos legacy para evitar romper vistas existentes
                    promedio: puntuacionActual,
                    limpieza: puntuacionActual,
                    convivencia: puntuacionActual,
                    respeto_reglas: puntuacionActual,
                    comentario: c.comentario,
                    fecha: c.fecha_calificacion,
                };
            }),
        });
    } catch (error) {
        console.error('Error obteniendo calificaciones:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener pendientes de calificacion del landlord autenticado
router.get('/pendientes', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const pendientes = await obtenerPendientesCalificacionLandlord(pool, req.usuario.id);
        return res.json({
            success: true,
            total: pendientes.length,
            pendientes,
        });
    } catch (error) {
        console.error('Error obteniendo pendientes de calificación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Omitir pendiente de calificacion (requiere justificacion)
router.put('/pendientes/:id/omitir', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;
        const motivoOmision = (req.body?.motivo_omision || '').trim();

        if (!motivoOmision) {
            return res.status(400).json({
                success: false,
                message: 'motivo_omision es obligatorio',
            });
        }

        const [rows] = await pool.query(
            `SELECT estado
             FROM calificaciones_pendientes
             WHERE id_pendiente = ? AND id_landlord = ?
             LIMIT 1`,
            [id, req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pendiente de calificación no encontrado',
            });
        }

        if (rows[0].estado !== 'pendiente') {
            return res.status(409).json({
                success: false,
                message: 'Este pendiente ya fue resuelto',
            });
        }

        await pool.query(
            `UPDATE calificaciones_pendientes
             SET estado = 'omitida',
                 motivo_omision = ?,
                 fecha_resolucion = CURRENT_TIMESTAMP
             WHERE id_pendiente = ? AND id_landlord = ?`,
            [motivoOmision, id, req.usuario.id]
        );

        return res.json({
            success: true,
            message: 'Pendiente marcado como omitido',
        });
    } catch (error) {
        console.error('Error omitiendo pendiente de calificación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
