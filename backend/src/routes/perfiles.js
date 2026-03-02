const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../utils/profileImageUpload');
const { construirAvatar, normalizarFotoPerfil } = require('../utils/avatar');

function normalizarTexto(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizarHobbies(value) {
    let parsed = [];

    if (Array.isArray(value)) {
        parsed = value;
    } else if (typeof value === 'string') {
        try {
            const asJson = JSON.parse(value);
            if (Array.isArray(asJson)) {
                parsed = asJson;
            } else {
                parsed = value.split(',');
            }
        } catch {
            parsed = value.split(',');
        }
    }

    return [...new Set(parsed.map((h) => normalizarTexto(h)).filter(Boolean))];
}

function inferirPerfilCompleto({ edad, ciudad, horario, hobbies }) {
    const edadNormalizada = Number.parseInt(edad, 10);
    const ciudadNormalizada = normalizarTexto(ciudad);
    const horarioNormalizado = normalizarTexto(horario);
    const hobbiesNormalizados = normalizarHobbies(hobbies);

    return (
        Number.isFinite(edadNormalizada) &&
        edadNormalizada > 0 &&
        ciudadNormalizada.length > 0 &&
        horarioNormalizado.length > 0 &&
        hobbiesNormalizados.length > 0
    );
}

function parsearBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'si', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return fallback;
}

function parsearEntero(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizarUniversidad(value) {
    return normalizarTexto(value);
}

// Obtener el perfil extendido del tenant autenticado
router.get('/me', verificarToken, async (req, res) => {
    try {
        // Buscar el perfil del usuario en la tabla de perfiles
        const [rows] = await pool.query(
            `SELECT p.*, u.nombre, u.apellido, u.email, u.universidad, u.carrera, u.genero, u.biografia, u.perfil_completo, u.foto_perfil
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
        const perfilCompletoPersistido = !!perfil.perfil_completo;

        // Parsear hobbies de JSON si existe
        if (perfil.hobbies && typeof perfil.hobbies === 'string') {
            perfil.hobbies = JSON.parse(perfil.hobbies);
        }

        const perfilCompletoInferido = inferirPerfilCompleto(perfil);
        perfil.perfil_completo = !!perfil.perfil_completo || perfilCompletoInferido;

        if (perfilCompletoInferido && !perfilCompletoPersistido) {
            await pool.query(
                'UPDATE usuarios SET perfil_completo = TRUE WHERE id_usuario = ?',
                [req.usuario.id]
            );
        }

        res.json({
            success: true,
            perfil: {
                ...perfil,
                avatar: construirAvatar(perfil.nombre, perfil.apellido),
                foto_perfil: normalizarFotoPerfil(perfil.foto_perfil),
                profileImage: normalizarFotoPerfil(perfil.foto_perfil),
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

// Crear o actualizar el perfil extendido del tenant
router.put('/me', verificarToken, uploadProfileImage.single('foto_perfil'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const body = req.body || {};
        const {
            edad, presupuesto, ciudad, horario, semestre, ocupacion,
            mascotas, fumador, limpieza, ruido, visitantes, hobbies,
            universidad, carrera, genero, biografia,
            preferencia_visitantes, preferencia_social, preferencia_ruido, preferencia_mascotas,
        } = body;

        await connection.beginTransaction();

        const fotoPerfilPath = req.file ? `/uploads/perfiles/${req.file.filename}` : null;
        const universidadNormalizada = normalizarUniversidad(universidad);

        // Actualizar datos basicos en la tabla usuarios
        await connection.query(
            `UPDATE usuarios SET universidad = ?, carrera = ?, genero = ?, biografia = ?, foto_perfil = COALESCE(?, foto_perfil)
       WHERE id_usuario = ?`,
            [universidadNormalizada || null, carrera || null, genero || null, biografia || null, fotoPerfilPath, req.usuario.id]
        );

        // Verificar si ya existe un perfil para este usuario
        const [existing] = await connection.query(
            'SELECT id_perfil FROM perfiles WHERE id_usuario = ?',
            [req.usuario.id]
        );

        const ciudadNormalizada = normalizarTexto(ciudad);
        const horarioNormalizado = normalizarTexto(horario);
        // Serializar hobbies a JSON para almacenar en la base de datos
        const hobbiesNormalizados = normalizarHobbies(hobbies);
        const hobbiesJson = JSON.stringify(hobbiesNormalizados);
        const edadNormalizada = parsearEntero(edad, null);
        const presupuestoNormalizado = parsearEntero(presupuesto, null);
        const semestreNormalizado = parsearEntero(semestre, null);
        const limpiezaNormalizada = Math.min(5, Math.max(1, parsearEntero(limpieza, 3)));
        const ruidoNormalizado = Math.min(5, Math.max(1, parsearEntero(ruido, 3)));
        const preferenciaSocialNormalizada = Math.min(5, Math.max(1, parsearEntero(preferencia_social, 3)));
        const preferenciaRuidoNormalizada = Math.min(5, Math.max(1, parsearEntero(preferencia_ruido, 3)));
        const mascotasNormalizado = parsearBoolean(mascotas, false);
        const fumadorNormalizado = parsearBoolean(fumador, false);

        const profileFields = [
            edadNormalizada, presupuestoNormalizado, ciudadNormalizada || null, horarioNormalizado || null,
            semestreNormalizado, ocupacion || null, mascotasNormalizado, fumadorNormalizado,
            limpiezaNormalizada, ruidoNormalizado, visitantes || null, hobbiesJson,
            preferencia_visitantes || null, preferenciaSocialNormalizada,
            preferenciaRuidoNormalizada, preferencia_mascotas || null,
        ];

        if (existing.length > 0) {
            // Actualizar perfil existente
            await connection.query(
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
            await connection.query(
                `INSERT INTO perfiles
          (id_perfil, id_usuario, edad, presupuesto, ciudad, horario,
           semestre, ocupacion, mascotas, fumador, limpieza, ruido, visitantes, hobbies,
           preferencia_visitantes, preferencia_social, preferencia_ruido, preferencia_mascotas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id_perfil, req.usuario.id, ...profileFields]
            );
        }

        // Determinar si el perfil esta completo (campos minimos requeridos)
        const perfilCompleto = inferirPerfilCompleto({
            edad: edadNormalizada,
            ciudad: ciudadNormalizada,
            horario: horarioNormalizado,
            hobbies: hobbiesNormalizados,
        });
        await connection.query(
            'UPDATE usuarios SET perfil_completo = ? WHERE id_usuario = ?',
            [perfilCompleto, req.usuario.id]
        );

        const [usuarioRows] = await connection.query(
            'SELECT nombre, apellido, foto_perfil FROM usuarios WHERE id_usuario = ? LIMIT 1',
            [req.usuario.id]
        );
        const usuarioActualizado = usuarioRows[0] || {};

        await connection.commit();

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            perfil_completo: perfilCompleto,
            user: {
                avatar: construirAvatar(usuarioActualizado.nombre, usuarioActualizado.apellido),
                foto_perfil: normalizarFotoPerfil(usuarioActualizado.foto_perfil),
                profileImage: normalizarFotoPerfil(usuarioActualizado.foto_perfil),
            },
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    } finally {
        connection.release();
    }
});

router.get('/universidades', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT universidad
             FROM usuarios
             WHERE universidad IS NOT NULL AND TRIM(universidad) <> ''
             ORDER BY universidad ASC`
        );

        return res.json({
            success: true,
            universidades: rows.map((row) => row.universidad).filter(Boolean),
        });
    } catch (error) {
        console.error('Error obteniendo universidades:', error);
        return res.status(500).json({
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
            `SELECT u.id_usuario, u.nombre, u.apellido, u.universidad, u.carrera, u.genero, u.biografia, u.foto_perfil,
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
                avatar: construirAvatar(perfil.nombre, perfil.apellido),
                foto_perfil: normalizarFotoPerfil(perfil.foto_perfil),
                profileImage: normalizarFotoPerfil(perfil.foto_perfil),
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
