const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');

// Crear o actualizar una calificacion para un roommate
router.post('/', verificarToken, async (req, res) => {
    try {
        const { id_usuario_calificado, id_propiedad, limpieza, convivencia, respeto_reglas, comentario } = req.body;

        // Validar campos obligatorios
        if (!id_usuario_calificado || !limpieza || !convivencia || !respeto_reglas) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el usuario a calificar y las tres puntuaciones (limpieza, convivencia, respeto_reglas)',
            });
        }

        // Validar rangos de puntuacion (1-5)
        const puntuaciones = { limpieza, convivencia, respeto_reglas };
        for (const [campo, valor] of Object.entries(puntuaciones)) {
            if (valor < 1 || valor > 5 || !Number.isInteger(valor)) {
                return res.status(400).json({
                    success: false,
                    message: `${campo} debe ser un entero entre 1 y 5`,
                });
            }
        }

        // No permitir calificarse a si mismo
        if (req.usuario.id === id_usuario_calificado) {
            return res.status(400).json({
                success: false,
                message: 'No puedes calificarte a ti mismo',
            });
        }

        // Verificar que el usuario calificado existe
        const [usuarioCalificado] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
            [id_usuario_calificado]
        );
        if (usuarioCalificado.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'El usuario a calificar no existe',
            });
        }

        // Si se proporciona id_propiedad, verificar que existe
        if (id_propiedad) {
            const [propiedad] = await pool.query(
                'SELECT id_propiedad FROM propiedades WHERE id_propiedad = ?',
                [id_propiedad]
            );
            if (propiedad.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'La propiedad especificada no existe',
                });
            }
        }

        // Verificar si ya existe una calificacion entre estos usuarios para esta propiedad
        const [existente] = await pool.query(
            `SELECT id_calificacion FROM calificaciones 
             WHERE id_usuario_calificador = ? AND id_usuario_calificado = ? 
             AND (id_propiedad = ? OR (id_propiedad IS NULL AND ? IS NULL))`,
            [req.usuario.id, id_usuario_calificado, id_propiedad || null, id_propiedad || null]
        );

        if (existente.length > 0) {
            // Actualizar calificacion existente
            await pool.query(
                `UPDATE calificaciones 
                 SET limpieza = ?, convivencia = ?, respeto_reglas = ?, comentario = ?, fecha_calificacion = CURRENT_TIMESTAMP
                 WHERE id_calificacion = ?`,
                [limpieza, convivencia, respeto_reglas, comentario || null, existente[0].id_calificacion]
            );

            return res.json({
                success: true,
                message: 'Calificacion actualizada exitosamente',
            });
        }

        // Crear nueva calificacion
        const id_calificacion = uuidv4();

        await pool.query(
            `INSERT INTO calificaciones (id_calificacion, id_usuario_calificador, id_usuario_calificado, id_propiedad, limpieza, convivencia, respeto_reglas, comentario)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_calificacion, req.usuario.id, id_usuario_calificado, id_propiedad || null, limpieza, convivencia, respeto_reglas, comentario || null]
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

// Obtener las calificaciones de un usuario (promedios por categoria y detalle)
router.get('/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener promedios por categoria
        const [promedios] = await pool.query(
            `SELECT 
                AVG(limpieza) as promedio_limpieza,
                AVG(convivencia) as promedio_convivencia,
                AVG(respeto_reglas) as promedio_respeto_reglas,
                AVG((limpieza + convivencia + respeto_reglas) / 3.0) as promedio_general,
                COUNT(*) as total
             FROM calificaciones WHERE id_usuario_calificado = ?`,
            [id]
        );

        // Obtener calificaciones individuales con datos del calificador
        const [calificaciones] = await pool.query(
            `SELECT c.*, 
                u.nombre as calificador_nombre, 
                u.apellido as calificador_apellido,
                u.nombre_usuario as calificador_username,
                p.titulo as propiedad_titulo
             FROM calificaciones c
             JOIN usuarios u ON c.id_usuario_calificador = u.id_usuario
             LEFT JOIN propiedades p ON c.id_propiedad = p.id_propiedad
             WHERE c.id_usuario_calificado = ?
             ORDER BY c.fecha_calificacion DESC`,
            [id]
        );

        const stats = promedios[0];

        res.json({
            success: true,
            reputacion: {
                promedio_general: stats.total > 0 ? parseFloat(parseFloat(stats.promedio_general).toFixed(1)) : null,
                promedio_limpieza: stats.total > 0 ? parseFloat(parseFloat(stats.promedio_limpieza).toFixed(1)) : null,
                promedio_convivencia: stats.total > 0 ? parseFloat(parseFloat(stats.promedio_convivencia).toFixed(1)) : null,
                promedio_respeto_reglas: stats.total > 0 ? parseFloat(parseFloat(stats.promedio_respeto_reglas).toFixed(1)) : null,
                total_calificaciones: stats.total,
            },
            calificaciones: calificaciones.map(c => ({
                id: c.id_calificacion,
                calificador: {
                    nombre: `${c.calificador_nombre} ${c.calificador_apellido}`,
                    username: c.calificador_username,
                    avatar: (c.calificador_nombre[0] + c.calificador_apellido[0]).toUpperCase(),
                },
                propiedad: c.propiedad_titulo || null,
                limpieza: c.limpieza,
                convivencia: c.convivencia,
                respeto_reglas: c.respeto_reglas,
                promedio: parseFloat(((c.limpieza + c.convivencia + c.respeto_reglas) / 3).toFixed(1)),
                comentario: c.comentario,
                fecha: c.fecha_calificacion,
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
