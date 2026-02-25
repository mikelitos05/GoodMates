const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');

// Crear una calificacion para un roommate (al finalizar convivencia)
router.post('/', verificarToken, async (req, res) => {
    try {
        const { id_calificado, id_grupo, puntuacion, comentario } = req.body;

        // Validar campos obligatorios
        if (!id_calificado || !id_grupo || !puntuacion) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el usuario a calificar, el grupo y la puntuacion',
            });
        }

        // Validar rango de puntuacion
        if (puntuacion < 1 || puntuacion > 5) {
            return res.status(400).json({
                success: false,
                message: 'La puntuacion debe estar entre 1 y 5',
            });
        }

        // No permitir calificarse a si mismo
        if (req.usuario.id === id_calificado) {
            return res.status(400).json({
                success: false,
                message: 'No puedes calificarte a ti mismo',
            });
        }

        // Verificar que ambos usuarios son miembros del mismo grupo
        const [miembro1] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, req.usuario.id]
        );
        const [miembro2] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, id_calificado]
        );

        if (miembro1.length === 0 || miembro2.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Ambos usuarios deben ser miembros del mismo grupo',
            });
        }

        // Verificar si ya existe una calificacion entre estos usuarios en este grupo
        const [existente] = await pool.query(
            'SELECT id_calificacion FROM calificaciones WHERE id_calificador = ? AND id_calificado = ? AND id_grupo = ?',
            [req.usuario.id, id_calificado, id_grupo]
        );

        if (existente.length > 0) {
            // Actualizar calificacion existente
            await pool.query(
                'UPDATE calificaciones SET puntuacion = ?, comentario = ? WHERE id_calificacion = ?',
                [puntuacion, comentario || null, existente[0].id_calificacion]
            );

            return res.json({
                success: true,
                message: 'Calificacion actualizada exitosamente',
            });
        }

        // Crear nueva calificacion
        const id_calificacion = uuidv4();

        await pool.query(
            `INSERT INTO calificaciones (id_calificacion, id_calificador, id_calificado, id_grupo, puntuacion, comentario)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id_calificacion, req.usuario.id, id_calificado, id_grupo, puntuacion, comentario || null]
        );

        res.status(201).json({
            success: true,
            message: 'Calificacion registrada exitosamente',
        });

    } catch (error) {
        console.error('Error creando calificacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener las calificaciones de un usuario (promedio y detalle)
router.get('/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener promedio de calificaciones
        const [promedio] = await pool.query(
            `SELECT AVG(puntuacion) as promedio, COUNT(*) as total
       FROM calificaciones WHERE id_calificado = ?`,
            [id]
        );

        // Obtener calificaciones individuales
        const [calificaciones] = await pool.query(
            `SELECT c.*, u.nombre as calificador_nombre, u.apellido as calificador_apellido
       FROM calificaciones c
       JOIN usuarios u ON c.id_calificador = u.id_usuario
       WHERE c.id_calificado = ?
       ORDER BY c.fecha_creacion DESC`,
            [id]
        );

        res.json({
            success: true,
            reputacion: {
                promedio: promedio[0].promedio ? parseFloat(promedio[0].promedio).toFixed(1) : null,
                totalCalificaciones: promedio[0].total,
            },
            calificaciones: calificaciones.map(c => ({
                id: c.id_calificacion,
                calificadorNombre: `${c.calificador_nombre} ${c.calificador_apellido}`,
                calificadorAvatar: (c.calificador_nombre[0] + c.calificador_apellido[0]).toUpperCase(),
                puntuacion: c.puntuacion,
                comentario: c.comentario,
                fecha: c.fecha_creacion,
            })),
        });

    } catch (error) {
        console.error('Error obteniendo calificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
