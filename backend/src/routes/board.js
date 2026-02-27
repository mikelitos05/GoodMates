const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');

// Obtener publicaciones del board de un grupo
router.get('/grupo/:idGrupo', verificarToken, async (req, res) => {
    try {
        const { idGrupo } = req.params;

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

        // Obtener publicaciones con datos del autor
        const [publicaciones] = await pool.query(
            `SELECT pb.*, u.nombre as autor_nombre, u.apellido as autor_apellido
       FROM publicaciones_board pb
       JOIN usuarios u ON pb.id_autor = u.id_usuario
       WHERE pb.id_grupo = ?
       ORDER BY pb.fecha_creacion DESC`,
            [idGrupo]
        );

        // Para cada publicacion, obtener sus respuestas
        const publicacionesConRespuestas = await Promise.all(
            publicaciones.map(async (pub) => {
                const [respuestas] = await pool.query(
                    `SELECT rb.*, u.nombre as autor_nombre, u.apellido as autor_apellido
           FROM respuestas_board rb
           JOIN usuarios u ON rb.id_autor = u.id_usuario
           WHERE rb.id_publicacion = ?
           ORDER BY rb.fecha_creacion ASC`,
                    [pub.id_publicacion]
                );

                return {
                    id: pub.id_publicacion,
                    groupId: pub.id_grupo,
                    authorId: pub.id_autor,
                    authorName: `${pub.autor_nombre} ${pub.autor_apellido}`,
                    authorAvatar: (pub.autor_nombre[0] + pub.autor_apellido[0]).toUpperCase(),
                    title: pub.titulo,
                    content: pub.contenido,
                    type: pub.tipo,
                    createdAt: pub.fecha_creacion,
                    replies: respuestas.map(r => ({
                        id: r.id_respuesta,
                        authorId: r.id_autor,
                        authorName: `${r.autor_nombre} ${r.autor_apellido}`,
                        authorAvatar: (r.autor_nombre[0] + r.autor_apellido[0]).toUpperCase(),
                        content: r.contenido,
                        createdAt: r.fecha_creacion,
                    })),
                };
            })
        );

        res.json({
            success: true,
            publicaciones: publicacionesConRespuestas,
        });

    } catch (error) {
        console.error('Error obteniendo publicaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Crear una nueva publicacion en el board
router.post('/', verificarToken, async (req, res) => {
    try {
        const { id_grupo, titulo, contenido, tipo } = req.body;

        // Validar campos obligatorios
        if (!id_grupo || !titulo || !contenido) {
            return res.status(400).json({
                success: false,
                message: 'El grupo, titulo y contenido son obligatorios',
            });
        }

        // Validar tipo de publicacion
        const tiposValidos = ['announcement', 'discussion', 'event'];
        const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'discussion';

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

        const id_publicacion = uuidv4();

        await pool.query(
            `INSERT INTO publicaciones_board (id_publicacion, id_grupo, id_autor, titulo, contenido, tipo)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id_publicacion, id_grupo, req.usuario.id, titulo, contenido, tipoFinal]
        );

        res.status(201).json({
            success: true,
            message: 'Publicacion creada exitosamente',
            publicacion: {
                id: id_publicacion,
                titulo,
                tipo: tipoFinal,
            },
        });

    } catch (error) {
        console.error('Error creando publicacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Responder a una publicacion del board
router.post('/:id/respuestas', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { contenido } = req.body;

        if (!contenido) {
            return res.status(400).json({
                success: false,
                message: 'El contenido de la respuesta es obligatorio',
            });
        }

        // Verificar que la publicacion existe
        const [publicacion] = await pool.query(
            'SELECT * FROM publicaciones_board WHERE id_publicacion = ?',
            [id]
        );

        if (publicacion.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Publicacion no encontrada',
            });
        }

        // Verificar que el usuario es miembro del grupo de la publicacion
        const [esMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [publicacion[0].id_grupo, req.usuario.id]
        );

        if (esMiembro.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No eres miembro del grupo de esta publicacion',
            });
        }

        const id_respuesta = uuidv4();

        await pool.query(
            `INSERT INTO respuestas_board (id_respuesta, id_publicacion, id_autor, contenido)
       VALUES (?, ?, ?, ?)`,
            [id_respuesta, id, req.usuario.id, contenido]
        );

        res.status(201).json({
            success: true,
            message: 'Respuesta publicada exitosamente',
            respuesta: {
                id: id_respuesta,
            },
        });

    } catch (error) {
        console.error('Error respondiendo publicacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Eliminar una publicacion (solo el autor puede eliminar)
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la publicacion existe y pertenece al usuario
        const [publicacion] = await pool.query(
            'SELECT * FROM publicaciones_board WHERE id_publicacion = ? AND id_autor = ?',
            [id, req.usuario.id]
        );

        if (publicacion.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Publicacion no encontrada o no tienes permiso para eliminarla',
            });
        }

        // Eliminar la publicacion (las respuestas se eliminan en cascada)
        await pool.query('DELETE FROM publicaciones_board WHERE id_publicacion = ?', [id]);

        res.json({
            success: true,
            message: 'Publicacion eliminada exitosamente',
        });

    } catch (error) {
        console.error('Error eliminando publicacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
