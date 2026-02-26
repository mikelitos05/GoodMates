const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// Tenant crea una solicitud de informes para una propiedad
router.post('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id_propiedad, mensaje } = req.body;

        if (!id_propiedad) {
            return res.status(400).json({ success: false, message: 'id_propiedad es obligatorio' });
        }

        // Verificar que la propiedad existe y obtener el landlord
        const [propRows] = await pool.query(
            'SELECT id_propiedad, id_landlord, titulo FROM propiedades WHERE id_propiedad = ?',
            [id_propiedad]
        );

        if (propRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Propiedad no encontrada' });
        }

        const propiedad = propRows[0];

        // Verificar que no exista ya una solicitud del mismo tenant para esta propiedad
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

        // Crear notificación para el landlord
        const id_notificacion = uuidv4();
        const tenantNombre = req.usuario.nombre || req.usuario.username || 'Un inquilino';
        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [
                id_notificacion,
                propiedad.id_landlord,
                'Nueva solicitud de informes',
                `${tenantNombre} está interesado en tu propiedad "${propiedad.titulo}"`,
            ]
        );

        // Emitir notificación en tiempo real via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${propiedad.id_landlord}`).emit('nueva-solicitud', {
                id_solicitud,
                id_propiedad,
                titulo_propiedad: propiedad.titulo,
                tenant_nombre: tenantNombre,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Solicitud enviada exitosamente',
            solicitud: { id_solicitud, estado: 'pendiente' },
        });

    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Tenant obtiene sus solicitudes enviadas
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

        // Parse imagenes JSON
        const parsed = solicitudes.map(s => ({
            ...s,
            imagenes: (() => { try { return typeof s.imagenes === 'string' ? JSON.parse(s.imagenes) : (s.imagenes || []); } catch { return []; } })(),
        }));

        res.json({ success: true, solicitudes: parsed });

    } catch (error) {
        console.error('Error obteniendo solicitudes del tenant:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord obtiene solicitudes recibidas
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
            imagenes: (() => { try { return typeof s.imagenes === 'string' ? JSON.parse(s.imagenes) : (s.imagenes || []); } catch { return []; } })(),
        }));

        res.json({ success: true, solicitudes: parsed });

    } catch (error) {
        console.error('Error obteniendo solicitudes recibidas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord acepta una solicitud
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

        // Notificar al tenant
        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';

        // Get property title
        const [propRows] = await pool.query('SELECT titulo FROM propiedades WHERE id_propiedad = ?', [rows[0].id_propiedad]);
        const tituloPropiedad = propRows[0]?.titulo || 'la propiedad';

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [id_notificacion, rows[0].id_tenant, 'Solicitud aceptada',
                `${landlordNombre} aceptó tu solicitud para "${tituloPropiedad}". ¡Ya pueden chatear!`]
        );

        // Emitir via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${rows[0].id_tenant}`).emit('solicitud-aceptada', {
                id_solicitud: id,
                titulo_propiedad: tituloPropiedad,
                landlord_nombre: landlordNombre,
            });
        }

        res.json({ success: true, message: 'Solicitud aceptada. Se ha habilitado el chat.' });

    } catch (error) {
        console.error('Error aceptando solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord rechaza una solicitud
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

        res.json({ success: true, message: 'Solicitud rechazada' });

    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord obtiene el conteo de tenants interesados (pendientes + aceptadas)
router.get('/contador', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM solicitudes_informes
             WHERE id_landlord = ? AND estado IN ('pendiente', 'aceptada')`,
            [req.usuario.id]
        );
        res.json({ success: true, total: rows[0].total });
    } catch (error) {
        console.error('Error obteniendo contador:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord confirma a un inquilino (decisión final positiva tras chatear)
router.put('/:id/confirmar', verificarToken, verificarRol('landlord'), async (req, res) => {
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
            return res.status(400).json({ success: false, message: 'Solo se pueden confirmar solicitudes aceptadas' });
        }

        await pool.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['confirmada', id]
        );

        // ── Auto-agregar al tenant al grupo de la propiedad ──
        const id_propiedad = rows[0].id_propiedad;
        const id_tenant = rows[0].id_tenant;

        // Buscar grupo existente para esta propiedad
        let [grupoRows] = await pool.query(
            'SELECT id_grupo FROM grupos_roommates WHERE id_propiedad = ? AND activo = TRUE',
            [id_propiedad]
        );

        let id_grupo;
        if (grupoRows.length > 0) {
            id_grupo = grupoRows[0].id_grupo;
        } else {
            // Crear un nuevo grupo para la propiedad
            const [propRows2] = await pool.query('SELECT titulo FROM propiedades WHERE id_propiedad = ?', [id_propiedad]);
            const tituloGrupo = `Roommates - ${propRows2[0]?.titulo || 'Propiedad'}`;
            id_grupo = uuidv4();
            await pool.query(
                'INSERT INTO grupos_roommates (id_grupo, nombre, id_propiedad) VALUES (?, ?, ?)',
                [id_grupo, tituloGrupo, id_propiedad]
            );
        }

        // Verificar que el tenant no sea ya miembro del grupo
        const [yaEsMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, id_tenant]
        );

        if (yaEsMiembro.length === 0) {
            const id_miembro = uuidv4();
            await pool.query(
                'INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?, ?)',
                [id_miembro, id_grupo, id_tenant, 'miembro']
            );
        }

        // Notificar al tenant
        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';
        const [propRows] = await pool.query('SELECT titulo FROM propiedades WHERE id_propiedad = ?', [id_propiedad]);
        const tituloPropiedad = propRows[0]?.titulo || 'la propiedad';

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [id_notificacion, id_tenant, 'Inquilino confirmado',
                `${landlordNombre} te ha confirmado como inquilino para "${tituloPropiedad}". ¡Ya puedes acceder a tu grupo de roommates!`]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`usuario-${id_tenant}`).emit('solicitud-confirmada', {
                id_solicitud: id,
                titulo_propiedad: tituloPropiedad,
                landlord_nombre: landlordNombre,
            });
        }

        res.json({ success: true, message: 'Inquilino confirmado y agregado al grupo exitosamente.' });

    } catch (error) {
        console.error('Error confirmando solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Landlord declina a un inquilino (decisión final negativa tras chatear)
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
            return res.status(400).json({ success: false, message: 'Solo se pueden declinar solicitudes aceptadas' });
        }

        await pool.query(
            'UPDATE solicitudes_informes SET estado = ? WHERE id_solicitud = ?',
            ['declinada', id]
        );

        // Notificar al tenant
        const id_notificacion = uuidv4();
        const landlordNombre = req.usuario.nombre || 'El arrendador';
        const [propRows] = await pool.query('SELECT titulo FROM propiedades WHERE id_propiedad = ?', [rows[0].id_propiedad]);
        const tituloPropiedad = propRows[0]?.titulo || 'la propiedad';

        await pool.query(
            `INSERT INTO notificaciones (id_notificacion, id_usuario, titulo, mensaje, tipo)
             VALUES (?, ?, ?, ?, 'solicitud')`,
            [id_notificacion, rows[0].id_tenant, 'Solicitud declinada',
                `${landlordNombre} ha declinado tu solicitud para "${tituloPropiedad}".`]
        );

        res.json({ success: true, message: 'Inquilino declinado.' });

    } catch (error) {
        console.error('Error declinando solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
