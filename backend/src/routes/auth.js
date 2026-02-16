const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

// ==========================================
// POST /api/auth/register - Registro de usuario
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;

        // Validaciones
        if (!username || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios (username, password, full_name)',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres',
            });
        }

        // Validar rol
        const validRoles = ['tenant', 'landlord'];
        const userRole = validRoles.includes(role) ? role : 'tenant';

        // Verificar si el username ya existe (consulta parametrizada)
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El nombre de usuario ya está registrado',
            });
        }

        // Hash de la contraseña con bcrypt (10 salt rounds)
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insertar usuario (consulta parametrizada)
        const [result] = await pool.query(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, password_hash, full_name, userRole]
        );

        // Generar JWT (expira en 1 hora)
        const token = jwt.sign(
            {
                id: result.insertId,
                username: username,
                role: userRole,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: result.insertId,
                username,
                full_name,
                role: userRole,
                avatar: full_name.split(' ').map((n) => n[0]).join('').toUpperCase(),
            },
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ==========================================
// POST /api/auth/login - Inicio de sesión
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validaciones
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username y contraseña son obligatorios',
            });
        }

        // Buscar usuario por username (consulta parametrizada)
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }

        const user = rows[0];

        // Verificar contraseña con bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }

        // Generar JWT (expira en 1 hora)
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                avatar: user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase(),
            },
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ==========================================
// GET /api/auth/verify - Verificar token JWT
// ==========================================
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario en la BD para confirmar que existe
        const [rows] = await pool.query(
            'SELECT id, username, full_name, role FROM users WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                avatar: user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase(),
            },
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token inválido',
        });
    }
});

module.exports = router;
