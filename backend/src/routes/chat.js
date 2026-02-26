const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');

// Obtener todos los chats activos del usuario (solicitudes aceptadas o confirmadas)
router.get('/mis-chats', verificarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;

        const [chats] = await pool.query(
            `SELECT s.id_solicitud, s.id_tenant, s.id_landlord, s.estado,
                    p.titulo AS titulo_propiedad, p.imagenes,
                    t.nombre AS tenant_nombre, t.apellido AS tenant_apellido,
                    l.nombre AS landlord_nombre, l.apellido AS landlord_apellido,
                    (SELECT contenido FROM mensajes_chat WHERE id_solicitud = s.id_solicitud ORDER BY fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
                    (SELECT fecha_envio FROM mensajes_chat WHERE id_solicitud = s.id_solicitud ORDER BY fecha_envio DESC LIMIT 1) AS fecha_ultimo_mensaje
             FROM solicitudes_informes s
             JOIN propiedades p ON s.id_propiedad = p.id_propiedad
             JOIN usuarios t ON s.id_tenant = t.id_usuario
             JOIN usuarios l ON s.id_landlord = l.id_usuario
             WHERE s.estado IN ('aceptada', 'confirmada') AND (s.id_tenant = ? OR s.id_landlord = ?)
             ORDER BY fecha_ultimo_mensaje DESC, s.fecha_actualizacion DESC`,
            [userId, userId]
        );

        const parsed = chats.map(c => ({
            ...c,
            imagenes: (() => { try { return typeof c.imagenes === 'string' ? JSON.parse(c.imagenes) : (c.imagenes || []); } catch { return []; } })(),
        }));

        res.json({ success: true, chats: parsed });

    } catch (error) {
        console.error('Error obteniendo chats:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Obtener mensajes de un chat específico
router.get('/solicitud/:idSolicitud', verificarToken, async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const userId = req.usuario.id;

        // Verificar que el usuario es participante y la solicitud esta habilitada para chat
        const [solRows] = await pool.query(
            `SELECT s.*, p.titulo AS titulo_propiedad,
                    t.nombre AS tenant_nombre, t.apellido AS tenant_apellido,
                    l.nombre AS landlord_nombre, l.apellido AS landlord_apellido
             FROM solicitudes_informes s
             JOIN propiedades p ON s.id_propiedad = p.id_propiedad
             JOIN usuarios t ON s.id_tenant = t.id_usuario
             JOIN usuarios l ON s.id_landlord = l.id_usuario
             WHERE s.id_solicitud = ? AND (s.id_tenant = ? OR s.id_landlord = ?)`,
            [idSolicitud, userId, userId]
        );

        if (solRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chat no encontrado' });
        }

        if (!['aceptada', 'confirmada'].includes(solRows[0].estado)) {
            return res.status(403).json({ success: false, message: 'Este chat aún no ha sido habilitado' });
        }

        // Obtener mensajes
        const [mensajes] = await pool.query(
            `SELECT m.*, u.nombre AS emisor_nombre, u.apellido AS emisor_apellido
             FROM mensajes_chat m
             JOIN usuarios u ON m.id_emisor = u.id_usuario
             WHERE m.id_solicitud = ?
             ORDER BY m.fecha_envio ASC`,
            [idSolicitud]
        );

        res.json({
            success: true,
            solicitud: solRows[0],
            mensajes,
        });

    } catch (error) {
        console.error('Error obteniendo mensajes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Enviar un mensaje en un chat
router.post('/solicitud/:idSolicitud', verificarToken, async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { contenido } = req.body;
        const userId = req.usuario.id;

        if (!contenido || !contenido.trim()) {
            return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
        }

        // Verificar participante y solicitud habilitada para chat
        const [solRows] = await pool.query(
            `SELECT *
             FROM solicitudes_informes
             WHERE id_solicitud = ?
               AND estado IN ('aceptada', 'confirmada')
               AND (id_tenant = ? OR id_landlord = ?)`,
            [idSolicitud, userId, userId]
        );

        if (solRows.length === 0) {
            return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
        }

        const id_mensaje = uuidv4();

        await pool.query(
            'INSERT INTO mensajes_chat (id_mensaje, id_solicitud, id_emisor, contenido) VALUES (?, ?, ?, ?)',
            [id_mensaje, idSolicitud, userId, contenido.trim()]
        );

        const mensaje = {
            id_mensaje,
            id_solicitud: idSolicitud,
            id_emisor: userId,
            emisor_nombre: req.usuario.nombre || '',
            emisor_apellido: req.usuario.apellido || '',
            contenido: contenido.trim(),
            fecha_envio: new Date().toISOString(),
        };

        // Emitir mensaje en tiempo real via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`chat-${idSolicitud}`).emit('nuevo-mensaje', mensaje);

            // Notificar al otro participante
            const otroUsuario = userId === solRows[0].id_tenant
                ? solRows[0].id_landlord
                : solRows[0].id_tenant;
            io.to(`usuario-${otroUsuario}`).emit('mensaje-recibido', {
                id_solicitud: idSolicitud,
                mensaje,
            });
        }

        res.status(201).json({ success: true, mensaje });

    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
