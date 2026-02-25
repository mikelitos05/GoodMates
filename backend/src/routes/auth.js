const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

// Registrar un nuevo usuario (tenant o landlord)
router.post('/register', async (req, res) => {
    try {
        const { nombre_usuario, nombre, apellido, email, password, role } = req.body;

        // Validar campos obligatorios
        if (!nombre_usuario || !nombre || !apellido || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios (nombre_usuario, nombre, apellido, email, password)',
            });
        }

        // Validar formato de nombre de usuario (3-30 chars, alfanumerico y guiones bajos)
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!usernameRegex.test(nombre_usuario)) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, numeros y guiones bajos',
            });
        }

        // Validar longitud minima de contrasena
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contrasena debe tener al menos 6 caracteres',
            });
        }

        // Validar formato de email basico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'El formato del email no es valido',
            });
        }

        // Validar y asignar rol (solo tenant o landlord permitidos en registro)
        const validRoles = ['tenant', 'landlord'];
        const userRole = validRoles.includes(role) ? role : 'tenant';

        // Verificar que el nombre de usuario no este ya registrado
        const [existingUsername] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?',
            [nombre_usuario]
        );

        if (existingUsername.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El nombre de usuario ya esta en uso',
            });
        }

        // Verificar que el email no este ya registrado
        const [existingEmail] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El correo electronico ya esta registrado',
            });
        }

        // Hashear la contrasena para almacenarla de forma segura
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generar un identificador unico para el usuario
        const id_usuario = uuidv4();

        // Insertar el nuevo usuario en la base de datos
        await pool.query(
            'INSERT INTO usuarios (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id_usuario, nombre_usuario, nombre, apellido, email, password_hash, userRole]
        );

        // Generar token JWT para iniciar sesion automaticamente despues del registro
        const token = jwt.sign(
            {
                id: id_usuario,
                nombre_usuario: nombre_usuario,
                email: email,
                role: userRole,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Responder con los datos del usuario y el token
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: id_usuario,
                username: nombre_usuario,
                nombre,
                apellido,
                email,
                role: userRole,
                avatar: (nombre[0] + apellido[0]).toUpperCase(),
            },
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Iniciar sesion con nombre de usuario o email y contrasena
router.post('/login', async (req, res) => {
    try {
        const { nombre_usuario, password } = req.body;

        // Validar que se enviaron las credenciales
        if (!nombre_usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre de usuario o correo y contrasena son obligatorios',
            });
        }

        // Detectar si el usuario ingreso un email o un nombre de usuario
        const isEmail = nombre_usuario.includes('@');
        const [rows] = await pool.query(
            isEmail
                ? 'SELECT * FROM usuarios WHERE email = ?'
                : 'SELECT * FROM usuarios WHERE nombre_usuario = ?',
            [nombre_usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales invalidas',
            });
        }

        const user = rows[0];

        // Verificar que la cuenta este activa
        if (user.estado_cuenta !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido suspendida o dada de baja',
            });
        }

        // Comparar la contrasena proporcionada con el hash almacenado
        const isPasswordValid = await bcrypt.compare(password, user.contrasena_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales invalidas',
            });
        }

        // Generar token JWT con los datos del usuario
        const token = jwt.sign(
            {
                id: user.id_usuario,
                nombre_usuario: user.nombre_usuario,
                email: user.email,
                role: user.rol,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Responder con el token y datos del usuario
        res.json({
            success: true,
            message: 'Inicio de sesion exitoso',
            token,
            user: {
                id: user.id_usuario,
                username: user.nombre_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.rol,
                avatar: (user.nombre[0] + user.apellido[0]).toUpperCase(),
            },
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Verificar un token JWT y devolver los datos del usuario
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        // Validar que se envio el header de autorizacion
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado',
            });
        }

        // Decodificar el token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar el usuario en la base de datos
        const [rows] = await pool.query(
            'SELECT id_usuario, nombre_usuario, nombre, apellido, email, rol FROM usuarios WHERE id_usuario = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const user = rows[0];

        // Devolver los datos del usuario
        res.json({
            success: true,
            user: {
                id: user.id_usuario,
                username: user.nombre_usuario,
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
            message: 'Token invalido',
        });
    }
});

module.exports = router;
