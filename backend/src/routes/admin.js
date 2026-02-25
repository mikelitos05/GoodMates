const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// Todas las rutas de admin requieren autenticacion y rol de administrador
router.use(verificarToken, verificarRol('admin'));

// Obtener estadisticas generales del sistema
router.get('/estadisticas', async (req, res) => {
    try {
        // Contar usuarios por rol
        const [usuarios] = await pool.query(
            `SELECT rol, COUNT(*) as total FROM usuarios GROUP BY rol`
        );

        // Contar propiedades
        const [propiedades] = await pool.query(
            `SELECT COUNT(*) as total, SUM(disponible = TRUE) as disponibles FROM propiedades`
        );

        // Contar grupos activos
        const [grupos] = await pool.query(
            `SELECT COUNT(*) as total FROM grupos_roommates WHERE activo = TRUE`
        );

        // Contar matches por estado
        const [matches] = await pool.query(
            `SELECT estado, COUNT(*) as total FROM matches GROUP BY estado`
        );

        // Total de tareas y su estado
        const [tareas] = await pool.query(
            `SELECT estado, COUNT(*) as total FROM tareas GROUP BY estado`
        );

        res.json({
            success: true,
            estadisticas: {
                usuarios: {
                    total: usuarios.reduce((sum, u) => sum + u.total, 0),
                    porRol: usuarios,
                },
                propiedades: {
                    total: propiedades[0].total,
                    disponibles: propiedades[0].disponibles || 0,
                },
                grupos: {
                    activos: grupos[0].total,
                },
                matches: {
                    total: matches.reduce((sum, m) => sum + m.total, 0),
                    porEstado: matches,
                },
                tareas: {
                    total: tareas.reduce((sum, t) => sum + t.total, 0),
                    porEstado: tareas,
                },
            },
        });

    } catch (error) {
        console.error('Error obteniendo estadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Listar todos los usuarios con paginacion
router.get('/usuarios', async (req, res) => {
    try {
        const { pagina = 1, limite = 20, rol, estado, busqueda } = req.query;

        let query = 'SELECT id_usuario, nombre, apellido, email, rol, estado_cuenta, fecha_registro FROM usuarios WHERE 1=1';
        const params = [];

        // Filtrar por rol si se especifica
        if (rol) {
            query += ' AND rol = ?';
            params.push(rol);
        }

        // Filtrar por estado de cuenta
        if (estado) {
            query += ' AND estado_cuenta = ?';
            params.push(estado);
        }

        // Buscar por nombre o email
        if (busqueda) {
            query += ' AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)';
            params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
        }

        query += ' ORDER BY fecha_registro DESC';

        // Paginacion
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limite), offset);

        const [usuarios] = await pool.query(query, params);

        // Contar total para paginacion
        let countQuery = 'SELECT COUNT(*) as total FROM usuarios WHERE 1=1';
        const countParams = [];
        if (rol) { countQuery += ' AND rol = ?'; countParams.push(rol); }
        if (estado) { countQuery += ' AND estado_cuenta = ?'; countParams.push(estado); }
        if (busqueda) {
            countQuery += ' AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)';
            countParams.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
        }
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            usuarios: usuarios.map(u => ({
                ...u,
                avatar: (u.nombre[0] + u.apellido[0]).toUpperCase(),
            })),
            paginacion: {
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                total: countResult[0].total,
                totalPaginas: Math.ceil(countResult[0].total / parseInt(limite)),
            },
        });

    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Cambiar el estado de cuenta de un usuario (activo, suspendido, baja)
router.put('/usuarios/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        // Validar estado
        const estadosValidos = ['activo', 'suspendido', 'baja'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado invalido. Debe ser: activo, suspendido o baja',
            });
        }

        // No permitir cambiar el estado de otro admin
        const [usuario] = await pool.query(
            'SELECT rol FROM usuarios WHERE id_usuario = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        if (usuario[0].rol === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No se puede cambiar el estado de un administrador',
            });
        }

        await pool.query(
            'UPDATE usuarios SET estado_cuenta = ? WHERE id_usuario = ?',
            [estado, id]
        );

        res.json({
            success: true,
            message: `Estado del usuario actualizado a: ${estado}`,
        });

    } catch (error) {
        console.error('Error cambiando estado de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Listar todas las propiedades (para moderacion)
router.get('/propiedades', async (req, res) => {
    try {
        const { pagina = 1, limite = 20 } = req.query;

        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        const [propiedades] = await pool.query(
            `SELECT p.*, u.nombre as landlord_nombre, u.apellido as landlord_apellido
       FROM propiedades p
       JOIN usuarios u ON p.id_landlord = u.id_usuario
       ORDER BY p.fecha_publicacion DESC
       LIMIT ? OFFSET ?`,
            [parseInt(limite), offset]
        );

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM propiedades');

        res.json({
            success: true,
            propiedades,
            paginacion: {
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                total: countResult[0].total,
                totalPaginas: Math.ceil(countResult[0].total / parseInt(limite)),
            },
        });

    } catch (error) {
        console.error('Error listando propiedades:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Eliminar una propiedad (moderacion)
router.delete('/propiedades/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [propiedad] = await pool.query(
            'SELECT id_propiedad FROM propiedades WHERE id_propiedad = ?',
            [id]
        );

        if (propiedad.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propiedad no encontrada',
            });
        }

        await pool.query('DELETE FROM propiedades WHERE id_propiedad = ?', [id]);

        res.json({
            success: true,
            message: 'Propiedad eliminada por administrador',
        });

    } catch (error) {
        console.error('Error eliminando propiedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
