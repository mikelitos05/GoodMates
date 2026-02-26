const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const { calcularCompatibilidad, parseHobbies } = require('../services/compatibilityService');

// ─── Obtener todos los tenants con compatibilidad calculada en tiempo real ───
router.get('/all-tenants', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        // Obtener perfil del usuario actual
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`,
            [req.usuario.id]
        );

        if (miPerfil.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes completar tu perfil antes de ver matches',
            });
        }

        const perfil = miPerfil[0];

        // Obtener todos los otros tenants activos con perfil completo
        const [otrosTenants] = await pool.query(
            `SELECT p.*, u.id_usuario, u.nombre, u.apellido, u.carrera, u.universidad, u.biografia
                    , cr.calificacion_promedio, cr.total_calificaciones
             FROM perfiles p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             LEFT JOIN (
                SELECT id_usuario_calificado,
                       ROUND(AVG(puntuacion), 1) AS calificacion_promedio,
                       COUNT(*) AS total_calificaciones
                FROM calificaciones
                GROUP BY id_usuario_calificado
             ) cr ON cr.id_usuario_calificado = u.id_usuario
             WHERE u.id_usuario != ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo' AND u.perfil_completo = TRUE`,
            [req.usuario.id]
        );

        // Obtener info de grupos: quienes están en un grupo activo y en qué propiedad
        const [miembrosGrupos] = await pool.query(
            `SELECT mg.id_usuario, g.id_grupo, g.nombre as nombre_grupo, g.id_propiedad,
                    pr.titulo as titulo_propiedad
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON mg.id_grupo = g.id_grupo
             LEFT JOIN propiedades pr ON g.id_propiedad = pr.id_propiedad
             WHERE g.activo = TRUE`
        );

        const grupoMap = {};
        for (const m of miembrosGrupos) {
            grupoMap[m.id_usuario] = {
                id_grupo: m.id_grupo,
                nombre_grupo: m.nombre_grupo,
                id_propiedad: m.id_propiedad,
                titulo_propiedad: m.titulo_propiedad,
            };
        }

        // Verificar si el usuario actual está en un grupo
        const miGrupo = grupoMap[req.usuario.id] || null;

        // Verificar match requests existentes del usuario actual
        const [matchesExistentes] = await pool.query(
            `SELECT m.id_match, m.id_usuario_1, m.id_usuario_2, m.estado, m.porcentaje_compatibilidad,
                    cm.id_match AS id_chat_match
             FROM matches m
             LEFT JOIN conversaciones_match cm
               ON cm.id_match = m.id_match
              AND cm.activa = TRUE
             WHERE m.id_usuario_1 = ? OR m.id_usuario_2 = ?`,
            [req.usuario.id, req.usuario.id]
        );

        const matchMap = {};
        for (const m of matchesExistentes) {
            const otroId = m.id_usuario_1 === req.usuario.id ? m.id_usuario_2 : m.id_usuario_1;
            matchMap[otroId] = {
                id_match: m.id_match,
                estado: m.estado,
                soyIniciador: m.id_usuario_1 === req.usuario.id,
                id_chat_match: m.id_chat_match || null,
            };
        }

        // Calcular compatibilidad con cada tenant
        const tenants = otrosTenants.map(otro => {
            const compatibilidad = calcularCompatibilidad(perfil, otro);
            const grupo = grupoMap[otro.id_usuario] || null;
            const matchInfo = matchMap[otro.id_usuario] || null;

            // Parsear hobbies
            let hobbies = [];
            try {
                hobbies = parseHobbies(otro.hobbies);
            } catch (e) { /* ignore */ }

            return {
                id_usuario: otro.id_usuario,
                nombre: otro.nombre,
                apellido: otro.apellido,
                avatar: (otro.nombre[0] + otro.apellido[0]).toUpperCase(),
                universidad: otro.universidad,
                carrera: otro.carrera,
                ciudad: otro.ciudad,
                edad: otro.edad,
                horario: otro.horario,
                biografia: otro.biografia,
                hobbies: hobbies.slice(0, 5),
                compatibilidad,
                calificacion_promedio: otro.calificacion_promedio !== null && otro.calificacion_promedio !== undefined
                    ? Number(otro.calificacion_promedio)
                    : null,
                total_calificaciones: Number(otro.total_calificaciones || 0),
                en_grupo: !!grupo,
                grupo: grupo ? {
                    nombre: grupo.nombre_grupo,
                    id_propiedad: grupo.id_propiedad,
                    titulo_propiedad: grupo.titulo_propiedad,
                } : null,
                match: matchInfo,
            };
        });

        // Ordenar por compatibilidad descendente
        tenants.sort((a, b) => b.compatibilidad - a.compatibilidad);

        res.json({
            success: true,
            tenants,
            mi_grupo: miGrupo,
        });

    } catch (error) {
        console.error('Error obteniendo tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ─── Obtener los matches del tenant autenticado (legacy) ───
router.get('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const [matches] = await pool.query(
            `SELECT m.*,
              u1.nombre as nombre_1, u1.apellido as apellido_1,
              u2.nombre as nombre_2, u2.apellido as apellido_2,
              p1.ciudad as ciudad_1, p1.hobbies as hobbies_1, p1.edad as edad_1,
              p2.ciudad as ciudad_2, p2.hobbies as hobbies_2, p2.edad as edad_2,
              r1.calificacion_promedio AS calificacion_promedio_1,
              r1.total_calificaciones AS total_calificaciones_1,
              r2.calificacion_promedio AS calificacion_promedio_2,
              r2.total_calificaciones AS total_calificaciones_2,
              cm.id_match AS id_chat_match
       FROM matches m
       JOIN usuarios u1 ON m.id_usuario_1 = u1.id_usuario
       JOIN usuarios u2 ON m.id_usuario_2 = u2.id_usuario
       LEFT JOIN perfiles p1 ON u1.id_usuario = p1.id_usuario
       LEFT JOIN perfiles p2 ON u2.id_usuario = p2.id_usuario
       LEFT JOIN (
          SELECT id_usuario_calificado,
                 ROUND(AVG(puntuacion), 1) AS calificacion_promedio,
                 COUNT(*) AS total_calificaciones
          FROM calificaciones
          GROUP BY id_usuario_calificado
       ) r1 ON r1.id_usuario_calificado = m.id_usuario_1
       LEFT JOIN (
          SELECT id_usuario_calificado,
                 ROUND(AVG(puntuacion), 1) AS calificacion_promedio,
                 COUNT(*) AS total_calificaciones
          FROM calificaciones
          GROUP BY id_usuario_calificado
       ) r2 ON r2.id_usuario_calificado = m.id_usuario_2
       LEFT JOIN conversaciones_match cm
         ON cm.id_match = m.id_match
        AND cm.activa = TRUE
       WHERE m.id_usuario_1 = ? OR m.id_usuario_2 = ?
       ORDER BY m.porcentaje_compatibilidad DESC`,
            [req.usuario.id, req.usuario.id]
        );

        const matchesFormateados = matches.map(m => {
            const esUsuario1 = m.id_usuario_1 === req.usuario.id;
            const nombre = esUsuario1
                ? `${m.nombre_2} ${m.apellido_2}`
                : `${m.nombre_1} ${m.apellido_1}`;
            const ciudad = esUsuario1 ? m.ciudad_2 : m.ciudad_1;
            const edad = esUsuario1 ? m.edad_2 : m.edad_1;
            const porcentaje = m.porcentaje_compatibilidad;
            const estado = m.estado;
            const rating = esUsuario1 ? m.calificacion_promedio_2 : m.calificacion_promedio_1;
            const totalCalificaciones = esUsuario1 ? m.total_calificaciones_2 : m.total_calificaciones_1;

            return {
                id: m.id_match,
                id_match: m.id_match,
                matchedUserId: esUsuario1 ? m.id_usuario_2 : m.id_usuario_1,
                matchedUserName: nombre,
                matchedUserAvatar: esUsuario1
                    ? (m.nombre_2[0] + m.apellido_2[0]).toUpperCase()
                    : (m.nombre_1[0] + m.apellido_1[0]).toUpperCase(),
                matchedUserCity: ciudad,
                matchedUserAge: edad,
                compatibility: porcentaje,
                porcentaje_compatibilidad: porcentaje,
                status: estado,
                estado,
                id_chat_match: m.id_chat_match || null,
                usuario_nombre: nombre,
                ciudad,
                edad,
                calificacion_promedio: rating !== null && rating !== undefined ? Number(rating) : null,
                total_calificaciones: Number(totalCalificaciones || 0),
                createdAt: m.fecha_creacion,
            };
        });

        res.json({
            success: true,
            matches: matchesFormateados,
        });

    } catch (error) {
        console.error('Error obteniendo matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ─── Solicitar match con otro tenant ───
router.post('/:id/solicitar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const targetUserId = req.params.id;

        // Verificar que el target existe y es tenant activo
        const [targetUser] = await pool.query(
            "SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND rol = 'tenant' AND estado_cuenta = 'activo'",
            [targetUserId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Verificar que no exista ya un match entre ellos
        const [existente] = await pool.query(
            `SELECT id_match, estado FROM matches
             WHERE (id_usuario_1 = ? AND id_usuario_2 = ?)
                OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
            [req.usuario.id, targetUserId, targetUserId, req.usuario.id]
        );

        if (existente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un match con este usuario',
            });
        }

        // Calcular compatibilidad
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`, [req.usuario.id]
        );
        const [otroPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`, [targetUserId]
        );

        let compatibilidad = 50;
        if (miPerfil.length > 0 && otroPerfil.length > 0) {
            compatibilidad = calcularCompatibilidad(miPerfil[0], otroPerfil[0]);
        }

        const id_match = uuidv4();
        await pool.query(
            `INSERT INTO matches (id_match, id_usuario_1, id_usuario_2, porcentaje_compatibilidad, estado)
             VALUES (?, ?, ?, ?, 'pendiente')`,
            [id_match, req.usuario.id, targetUserId, compatibilidad]
        );

        res.status(201).json({
            success: true,
            message: 'Solicitud de match enviada',
            match: { id_match, compatibilidad },
        });

    } catch (error) {
        console.error('Error solicitando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Aceptar un match ───
router.put('/:id/aceptar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({ success: false, message: 'Match no encontrado' });
        }

        const matchData = match[0];

        // Solo el usuario que recibe la solicitud puede aceptar (id_usuario_2)
        if (matchData.id_usuario_2 !== req.usuario.id) {
            return res.status(403).json({ success: false, message: 'Solo el destinatario puede aceptar el match' });
        }

        await pool.query(
            'UPDATE matches SET estado = ? WHERE id_match = ?',
            ['aceptado', id]
        );
        await pool.query(
            `INSERT INTO conversaciones_match (id_match, id_usuario_1, id_usuario_2, activa)
             VALUES (?, ?, ?, TRUE)
             ON DUPLICATE KEY UPDATE
                activa = TRUE,
                id_usuario_1 = VALUES(id_usuario_1),
                id_usuario_2 = VALUES(id_usuario_2)`,
            [id, matchData.id_usuario_1, matchData.id_usuario_2]
        );

        res.json({
            success: true,
            message: 'Match aceptado exitosamente',
            id_chat_match: id,
        });

    } catch (error) {
        console.error('Error aceptando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Rechazar un match ───
router.put('/:id/rechazar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({ success: false, message: 'Match no encontrado' });
        }

        await pool.query(
            'UPDATE matches SET estado = ? WHERE id_match = ?',
            ['rechazado', id]
        );

        res.json({
            success: true,
            message: 'Match rechazado',
        });

    } catch (error) {
        console.error('Error rechazando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Desvincular/eliminar un match existente ───
router.delete('/:id/desvincular', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        const [match] = await pool.query(
            'SELECT id_match, id_usuario_1, id_usuario_2 FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({ success: false, message: 'Match no encontrado' });
        }

        await pool.query('DELETE FROM matches WHERE id_match = ?', [id]);

        return res.json({
            success: true,
            message: 'Match desvinculado exitosamente',
        });
    } catch (error) {
        console.error('Error desvinculando match:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ─── Calcular compatibilidad con todos los tenants (recalcular) ───
router.post('/calcular', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`,
            [req.usuario.id]
        );

        if (miPerfil.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes completar tu perfil antes de buscar matches',
            });
        }

        const perfil = miPerfil[0];

        const [otrosPerfiles] = await pool.query(
            `SELECT p.*, u.nombre, u.apellido, u.id_usuario, u.carrera
       FROM perfiles p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE u.id_usuario != ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo'`,
            [req.usuario.id]
        );

        const matchesGenerados = [];

        for (const otro of otrosPerfiles) {
            const compatibilidad = calcularCompatibilidad(perfil, otro);

            if (compatibilidad >= 30) {
                const [existente] = await pool.query(
                    `SELECT id_match FROM matches
           WHERE (id_usuario_1 = ? AND id_usuario_2 = ?)
              OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
                    [req.usuario.id, otro.id_usuario, otro.id_usuario, req.usuario.id]
                );

                if (existente.length === 0) {
                    const id_match = uuidv4();
                    await pool.query(
                        `INSERT INTO matches (id_match, id_usuario_1, id_usuario_2, porcentaje_compatibilidad)
             VALUES (?, ?, ?, ?)`,
                        [id_match, req.usuario.id, otro.id_usuario, compatibilidad]
                    );

                    matchesGenerados.push({
                        id: id_match,
                        id_match,
                        matchedUserId: otro.id_usuario,
                        matchedUserName: `${otro.nombre} ${otro.apellido}`,
                        matchedUserAvatar: (otro.nombre[0] + otro.apellido[0]).toUpperCase(),
                        compatibility: compatibilidad,
                        porcentaje_compatibilidad: compatibilidad,
                        status: 'pendiente',
                        estado: 'pendiente',
                        usuario_nombre: `${otro.nombre} ${otro.apellido}`,
                    });
                } else {
                    await pool.query(
                        `UPDATE matches SET porcentaje_compatibilidad = ?
             WHERE id_match = ?`,
                        [compatibilidad, existente[0].id_match]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: `Se encontraron ${matchesGenerados.length} nuevos matches`,
            matchesNuevos: matchesGenerados,
        });

    } catch (error) {
        console.error('Error calculando matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
