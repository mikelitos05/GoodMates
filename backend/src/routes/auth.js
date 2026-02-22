const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;


router.post('/register', async (req, res) => {
    try {
        const { nombre, apellido, email, password, role } = req.body;

        
        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios (nombre, apellido, email, password)',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres',
            });
        }

        
        const validRoles = ['tenant', 'landlord'];
        const userRole = validRoles.includes(role) ? role : 'tenant';

        
        const [existing] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El correo electrónico ya está registrado',
            });
        }

        
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        
        const id_usuario = uuidv4();

        
        const [result] = await pool.query(
            'INSERT INTO usuarios (id_usuario, nombre, apellido, email, contraseña_hash, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [id_usuario, nombre, apellido, email, password_hash, userRole]
        );

        
        const token = jwt.sign(
            {
                id: id_usuario,
                email: email,
                role: userRole,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: id_usuario,
                nombre,
                apellido,
                email,
                role: userRole,
                avatar: (nombre[0] + apellido[0]).toUpperCase(),
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son obligatorios',
            });
        }

        
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }

        const user = rows[0];

        
        const isPasswordValid = await bcrypt.compare(password, user.contraseña_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }

        
        const token = jwt.sign(
            {
                id: user.id_usuario,
                email: user.email,
                role: user.rol,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.rol,
                avatar: (user.nombre[0] + user.apellido[0]).toUpperCase(),
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});


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

        
        const [rows] = await pool.query(
            'SELECT id_usuario, nombre, apellido, email, rol FROM usuarios WHERE id_usuario = ?',
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
                id: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.rol,
                avatar: (user.nombre[0] + user.apellido[0]).toUpperCase(),
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
