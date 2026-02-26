const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const {
    construirErrorRegla,
    getTenantConvivenciaContext,
    removerTenantDeConvivenciaActiva,
    validarUnionAConvivenciaActiva,
    enviarErrorRegla,
} = require('../services/convivenciaRules');

// Obtener el grupo de roommates del usuario autenticado
router.get('/mi-grupo', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        // Buscar el grupo al que pertenece el usuario
        const [grupos] = await pool.query(
            `SELECT g.*, mg.rol_en_grupo
       FROM grupos_roommates g
       JOIN miembros_grupo mg ON g.id_grupo = mg.id_grupo
       WHERE mg.id_usuario = ? AND g.activo = TRUE`,
            [req.usuario.id]
        );

        if (grupos.length === 0) {
            return res.json({
                success: true,
                grupo: null,
                message: 'No perteneces a ningun grupo de roommates',
            });
        }

        const grupo = grupos[0];

        // Obtener los miembros del grupo con sus datos basicos
        const [miembros] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.apellido, u.email, mg.rol_en_grupo, mg.fecha_union
       FROM miembros_grupo mg
       JOIN usuarios u ON mg.id_usuario = u.id_usuario
       WHERE mg.id_grupo = ?`,
            [grupo.id_grupo]
        );

        // Obtener datos de la propiedad asociada si existe
        let propiedad = null;
        if (grupo.id_propiedad) {
            const [props] = await pool.query(
                'SELECT titulo, direccion, ciudad FROM propiedades WHERE id_propiedad = ?',
                [grupo.id_propiedad]
            );
            if (props.length > 0) propiedad = props[0];
        }

        res.json({
            success: true,
            grupo: {
                id: grupo.id_grupo,
                nombre: grupo.nombre,
                miRol: grupo.rol_en_grupo,
                propiedad,
                fechaCreacion: grupo.fecha_creacion,
                miembros: miembros.map(m => ({
                    id: m.id_usuario,
                    nombre: `${m.nombre} ${m.apellido}`,
                    avatar: (m.nombre[0] + m.apellido[0]).toUpperCase(),
                    rol: m.rol_en_grupo,
                    fechaUnion: m.fecha_union,
                })),
            },
        });

    } catch (error) {
        console.error('Error obteniendo grupo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Crear un nuevo grupo de roommates
router.post('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { nombre, id_propiedad } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del grupo es obligatorio',
            });
        }

        // Verificar que el usuario no pertenezca ya a un grupo activo
        const [grupoExistente] = await pool.query(
            `SELECT g.id_grupo FROM grupos_roommates g
       JOIN miembros_grupo mg ON g.id_grupo = mg.id_grupo
       WHERE mg.id_usuario = ? AND g.activo = TRUE`,
            [req.usuario.id]
        );

        if (grupoExistente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya perteneces a un grupo de roommates activo',
            });
        }

        // Verificar que la propiedad existe si se proporciono
        if (id_propiedad) {
            const [prop] = await pool.query(
                'SELECT id_propiedad FROM propiedades WHERE id_propiedad = ? AND disponible = TRUE',
                [id_propiedad]
            );
            if (prop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Propiedad no encontrada o no disponible',
                });
            }
        }

        const id_grupo = uuidv4();
        const id_miembro = uuidv4();

        // Crear el grupo
        await pool.query(
            'INSERT INTO grupos_roommates (id_grupo, nombre, id_propiedad) VALUES (?, ?, ?)',
            [id_grupo, nombre, id_propiedad || null]
        );

        // Agregar al creador como miembro con rol de creador
        await pool.query(
            'INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?, ?)',
            [id_miembro, id_grupo, req.usuario.id, 'creador']
        );

        res.status(201).json({
            success: true,
            message: 'Grupo de roommates creado exitosamente',
            grupo: {
                id: id_grupo,
                nombre,
            },
        });

    } catch (error) {
        console.error('Error creando grupo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Agregar un miembro al grupo (solo el creador puede agregar)
router.post('/:id/miembros', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario } = req.body;

        if (!id_usuario) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del usuario a agregar',
            });
        }

        // Verificar que el solicitante es el creador del grupo
        const [miMembresía] = await pool.query(
            'SELECT rol_en_grupo FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id, req.usuario.id]
        );

        if (miMembresía.length === 0 || miMembresía[0].rol_en_grupo !== 'creador') {
            return res.status(403).json({
                success: false,
                message: 'Solo el creador del grupo puede agregar miembros',
            });
        }

        // Verificar que el usuario a agregar existe y es tenant
        const [usuario] = await pool.query(
            "SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND rol = 'tenant' AND estado_cuenta = 'activo'",
            [id_usuario]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado o no es un tenant activo',
            });
        }

        // Verificar que el usuario no sea ya miembro del grupo
        const [yaEsMiembro] = await pool.query(
            'SELECT id_miembro FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
            [id, id_usuario]
        );

        if (yaEsMiembro.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya es miembro del grupo',
            });
        }

        const contextoObjetivo = await getTenantConvivenciaContext(pool, id_usuario);
        validarUnionAConvivenciaActiva(contextoObjetivo);

        // Agregar al usuario como miembro
        const id_miembro = uuidv4();
        await pool.query(
            'INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?, ?)',
            [id_miembro, id, id_usuario, 'miembro']
        );

        res.status(201).json({
            success: true,
            message: 'Miembro agregado al grupo exitosamente',
        });

    } catch (error) {
        console.error('Error agregando miembro:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    }
});

// Remover un miembro del grupo (solo el creador puede remover, o un usuario puede salirse)
router.delete('/:id/miembros/:idUsuario', verificarToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id, idUsuario } = req.params;
        await connection.beginTransaction();

        // Verificar si es el creador o si el usuario se esta saliendo el mismo
        const [miMembresia] = await connection.query(
            `SELECT mg.rol_en_grupo
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON g.id_grupo = mg.id_grupo
             WHERE mg.id_grupo = ? AND mg.id_usuario = ? AND g.activo = TRUE
             FOR UPDATE`,
            [id, req.usuario.id]
        );

        if (miMembresia.length === 0) {
            throw construirErrorRegla('FORBIDDEN', 'No eres miembro de este grupo', 403);
        }

        // Solo el creador puede remover a otros, o un usuario puede salirse
        const esCreador = miMembresia[0].rol_en_grupo === 'creador';
        const esMismoUsuario = req.usuario.id === idUsuario;

        if (!esCreador && !esMismoUsuario) {
            throw construirErrorRegla(
                'FORBIDDEN',
                'Solo el creador del grupo puede remover miembros',
                403
            );
        }

        const resultado = await removerTenantDeConvivenciaActiva(connection, {
            idGrupo: id,
            idTenant: idUsuario,
            incrementarDisponibilidad: true,
        });
        await connection.commit();

        res.json({
            success: true,
            message: esMismoUsuario
                ? 'Saliste del grupo exitosamente'
                : 'Miembro removido del grupo',
            resultado,
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error removiendo miembro:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    } finally {
        connection.release();
    }
});

module.exports = router;
