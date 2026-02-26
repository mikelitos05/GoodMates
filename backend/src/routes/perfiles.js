const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');

// Obtener el perfil extendido del tenant autenticado
router.get('/me', verificarToken, async (req, res) => {
    try {
        // Buscar el perfil del usuario en la tabla de perfiles
        const [rows] = await pool.query(
            `SELECT p.*, u.nombre, u.apellido, u.email, u.universidad, u.carrera, u.genero, u.biografia, u.perfil_completo
       FROM perfiles p
       RIGHT JOIN usuarios u ON u.id_usuario = p.id_usuario
       WHERE u.id_usuario = ?`,
            [req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const perfil = rows[0];

        // Parsear hobbies de JSON si existe
        if (perfil.hobbies && typeof perfil.hobbies === 'string') {
            perfil.hobbies = JSON.parse(perfil.hobbies);
        }

        res.json({
            success: true,
            perfil,
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Crear o actualizar el perfil extendido del tenant
router.put('/me', verificarToken, async (req, res) => {
    try {
        const {
            edad, presupuesto, ciudad, horario, semestre, ocupacion,
            mascotas, fumador, limpieza, ruido, visitantes, hobbies,
            universidad, carrera, genero, biografia,
            preferencia_visitantes, preferencia_social, preferencia_ruido, preferencia_mascotas,
        } = req.body;

        // Actualizar datos basicos en la tabla usuarios
        await pool.query(
            `UPDATE usuarios SET universidad = ?, carrera = ?, genero = ?, biografia = ?
       WHERE id_usuario = ?`,
            [universidad || null, carrera || null, genero || null, biografia || null, req.usuario.id]
        );

        // Verificar si ya existe un perfil para este usuario
        const [existing] = await pool.query(
            'SELECT id_perfil FROM perfiles WHERE id_usuario = ?',
            [req.usuario.id]
        );

        // Serializar hobbies a JSON para almacenar en la base de datos
        const hobbiesJson = hobbies ? JSON.stringify(hobbies) : null;

        const profileFields = [
            edad || null, presupuesto || null, ciudad || null, horario || null,
            semestre || null, ocupacion || null, mascotas || false, fumador || false,
            limpieza || 3, ruido || 3, visitantes || null, hobbiesJson,
            preferencia_visitantes || null, preferencia_social || 3,
            preferencia_ruido || 3, preferencia_mascotas || null,
        ];

        if (existing.length > 0) {
            // Actualizar perfil existente
            await pool.query(
                `UPDATE perfiles SET
          edad = ?, presupuesto = ?, ciudad = ?, horario = ?,
          semestre = ?, ocupacion = ?, mascotas = ?, fumador = ?,
          limpieza = ?, ruido = ?, visitantes = ?, hobbies = ?,
          preferencia_visitantes = ?, preferencia_social = ?,
          preferencia_ruido = ?, preferencia_mascotas = ?
         WHERE id_usuario = ?`,
                [...profileFields, req.usuario.id]
            );
        } else {
            // Crear perfil nuevo
            const id_perfil = uuidv4();
            await pool.query(
                `INSERT INTO perfiles
          (id_perfil, id_usuario, edad, presupuesto, ciudad, horario,
           semestre, ocupacion, mascotas, fumador, limpieza, ruido, visitantes, hobbies,
           preferencia_visitantes, preferencia_social, preferencia_ruido, preferencia_mascotas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id_perfil, req.usuario.id, ...profileFields]
            );
        }

        // Determinar si el perfil esta completo (campos minimos requeridos)
        const perfilCompleto = !!(edad && ciudad && horario && hobbies && hobbies.length > 0);
        await pool.query(
            'UPDATE usuarios SET perfil_completo = ? WHERE id_usuario = ?',
            [perfilCompleto, req.usuario.id]
        );

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            perfil_completo: perfilCompleto,
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener el perfil de otro tenant por su ID (para ver compatibilidad)
router.get('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar el usuario y su perfil
        const [rows] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.apellido, u.universidad, u.carrera, u.genero, u.biografia,
              p.edad, p.presupuesto, p.ciudad, p.horario, p.semestre, p.ocupacion,
              p.mascotas, p.fumador, p.limpieza, p.ruido, p.visitantes, p.hobbies,
              p.preferencia_visitantes, p.preferencia_social, p.preferencia_ruido, p.preferencia_mascotas
       FROM usuarios u
       LEFT JOIN perfiles p ON u.id_usuario = p.id_usuario
       WHERE u.id_usuario = ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo'`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Perfil no encontrado',
            });
        }

        const perfil = rows[0];

        // Parsear hobbies si es necesario
        if (perfil.hobbies && typeof perfil.hobbies === 'string') {
            perfil.hobbies = JSON.parse(perfil.hobbies);
        }

        res.json({
            success: true,
            perfil: {
                ...perfil,
                avatar: (perfil.nombre[0] + perfil.apellido[0]).toUpperCase(),
            },
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

module.exports = router;
