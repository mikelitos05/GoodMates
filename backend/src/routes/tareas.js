const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');
const { construirAvatar, normalizarFotoPerfil } = require('../utils/avatar');

// Utility: get the Sunday that starts the week containing the given date
function getSundayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
    d.setDate(d.getDate() - day);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dom = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dom}`; // YYYY-MM-DD local time
}

// Obtener todas las tareas de un grupo (filtradas por semana opcionalmente)
router.get('/grupo/:idGrupo', verificarToken, async (req, res) => {
    try {
        const { idGrupo } = req.params;
        const { semana } = req.query; // optional: YYYY-MM-DD (Sunday start)

        // Verificar que el usuario es miembro del grupo
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [idGrupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro de este grupo',
            });
        }

        // Carry-over: move uncompleted tasks from past weeks to the current week
        const currentWeekStart = getSundayOfWeek(new Date());
        await pool.query(
            `UPDATE tareas
             SET semana_inicio = ?
             WHERE id_grupo = ?
               AND estado != 'completada'
               AND semana_inicio IS NOT NULL
               AND semana_inicio < ?`,
            [currentWeekStart, idGrupo, currentWeekStart]
        );

        // Also assign semana_inicio to any tasks that don't have one yet
        await pool.query(
            `UPDATE tareas
             SET semana_inicio = ?
             WHERE id_grupo = ?
               AND semana_inicio IS NULL`,
            [currentWeekStart, idGrupo]
        );

        // Build query with optional week filter
        let query = `SELECT t.*, u.nombre as asignado_nombre, u.apellido as asignado_apellido, u.foto_perfil as asignado_foto_perfil, DATE_FORMAT(t.semana_inicio, '%Y-%m-%d') as semana_inicio_str
           FROM tareas t
           LEFT JOIN usuarios u ON t.id_asignado = u.id_usuario
           WHERE t.id_grupo = ?`;
        const params = [idGrupo];

        if (semana) {
            query += ' AND t.semana_inicio = ?';
            params.push(semana);
        }

        query += ' ORDER BY t.fecha_vencimiento ASC, t.fecha_creacion DESC';

        const [tareas] = await pool.query(query, params);

        // Formatear las tareas para el frontend
        const tareasFormateadas = tareas.map(t => ({
            id: t.id_tarea,
            groupId: t.id_grupo,
            title: t.titulo,
            description: t.descripcion,
            assigneeId: t.id_asignado,
            assigneeName: t.asignado_nombre
                ? `${t.asignado_nombre} ${t.asignado_apellido}`
                : 'Sin asignar',
            assigneeAvatar: t.asignado_nombre
                ? construirAvatar(t.asignado_nombre, t.asignado_apellido)
                : null,
            assigneePhoto: normalizarFotoPerfil(t.asignado_foto_perfil),
            status: t.estado,
            dueDate: t.fecha_vencimiento,
            weekStart: t.semana_inicio_str || null,
            createdAt: t.fecha_creacion,
        }));

        res.json({
            success: true,
            tareas: tareasFormateadas,
        });

    } catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Crear una nueva tarea en el grupo
router.post('/', verificarToken, async (req, res) => {
    try {
        const { id_grupo, titulo, descripcion, id_asignado, fecha_vencimiento } = req.body;

        // Validar campos obligatorios
        if (!id_grupo || !titulo) {
            return res.status(400).json({
                success: false,
                message: 'El grupo y el titulo de la tarea son obligatorios',
            });
        }

        // Verificar que el usuario es miembro del grupo
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro de este grupo',
            });
        }

        // Verificar que el asignado es miembro del grupo (si se proporciono)
        if (id_asignado) {
            const [asignadoEsMiembro] = await pool.query(
                'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
                [id_grupo, id_asignado]
            );

            if (asignadoEsMiembro.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario asignado no es miembro del grupo',
                });
            }
        }

        const id_tarea = uuidv4();
        const semana_inicio = getSundayOfWeek(new Date());

        await pool.query(
            `INSERT INTO tareas (id_tarea, id_grupo, titulo, descripcion, id_asignado, fecha_vencimiento, semana_inicio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_tarea, id_grupo, titulo, descripcion || null, id_asignado || null, fecha_vencimiento || null, semana_inicio]
        );

        res.status(201).json({
            success: true,
            message: 'Tarea creada exitosamente',
            tarea: {
                id: id_tarea,
                titulo,
                weekStart: semana_inicio,
            },
        });

    } catch (error) {
        console.error('Error creando tarea:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Actualizar una tarea
router.put('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, id_asignado, estado, fecha_vencimiento } = req.body;

        // Verificar que la tarea existe
        const [tarea] = await pool.query(
            'SELECT * FROM tareas WHERE id_tarea = ?',
            [id]
        );

        if (tarea.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarea no encontrada',
            });
        }

        // Verificar que el usuario es miembro del grupo de la tarea
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [tarea[0].id_grupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro del grupo de esta tarea',
            });
        }

        await pool.query(
            `UPDATE tareas SET
        titulo = ?, descripcion = ?, id_asignado = ?,
        estado = ?, fecha_vencimiento = ?
       WHERE id_tarea = ?`,
            [
                titulo || tarea[0].titulo,
                descripcion !== undefined ? descripcion : tarea[0].descripcion,
                id_asignado !== undefined ? id_asignado : tarea[0].id_asignado,
                estado || tarea[0].estado,
                fecha_vencimiento !== undefined ? fecha_vencimiento : tarea[0].fecha_vencimiento,
                id
            ]
        );

        res.json({
            success: true,
            message: 'Tarea actualizada exitosamente',
        });

    } catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Cambiar estado de una tarea (completada/pendiente) o completar por defecto
router.put('/:id/completar', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body || {};

        // Verificar que la tarea existe
        const [tarea] = await pool.query(
            'SELECT * FROM tareas WHERE id_tarea = ?',
            [id]
        );

        if (tarea.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarea no encontrada',
            });
        }

        // Verificar que el usuario es miembro del grupo
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [tarea[0].id_grupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro del grupo de esta tarea',
            });
        }

        const estadosPermitidos = new Set(['pendiente', 'completada']);
        const estadoActual = tarea[0].estado;
        const estadoNuevo = estadosPermitidos.has(estado)
            ? estado
            : (estadoActual === 'completada' ? 'pendiente' : 'completada');

        await pool.query(
            'UPDATE tareas SET estado = ? WHERE id_tarea = ?',
            [estadoNuevo, id]
        );

        res.json({
            success: true,
            message: `Estado de tarea actualizado a ${estadoNuevo}`,
            estado: estadoNuevo,
        });

    } catch (error) {
        console.error('Error completando tarea:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Eliminar una tarea
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la tarea existe
        const [tarea] = await pool.query(
            'SELECT * FROM tareas WHERE id_tarea = ?',
            [id]
        );

        if (tarea.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarea no encontrada',
            });
        }

        // Verificar que el usuario es miembro del grupo
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [tarea[0].id_grupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro del grupo de esta tarea',
            });
        }

        await pool.query('DELETE FROM tareas WHERE id_tarea = ?', [id]);

        res.json({
            success: true,
            message: 'Tarea eliminada exitosamente',
        });

    } catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
