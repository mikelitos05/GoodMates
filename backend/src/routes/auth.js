const express = require('express');
const router = express.Router();
const https = require('https');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

function parsearHobbies(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function inferirPerfilCompletoDesdePerfil(perfilRow) {
    if (!perfilRow) return false;

    const edad = Number.parseInt(perfilRow.edad, 10);
    const ciudad = typeof perfilRow.ciudad === 'string' ? perfilRow.ciudad.trim() : '';
    const horario = typeof perfilRow.horario === 'string' ? perfilRow.horario.trim() : '';
    const hobbies = parsearHobbies(perfilRow.hobbies).map((h) => String(h).trim()).filter(Boolean);

    return Number.isFinite(edad) && edad > 0 && ciudad.length > 0 && horario.length > 0 && hobbies.length > 0;
}

function obtenerInicial(texto) {
    const safe = typeof texto === 'string' ? texto.trim() : '';
    return safe.length > 0 ? safe[0].toUpperCase() : '?';
}

function construirAvatar(nombre, apellido) {
    return `${obtenerInicial(nombre)}${obtenerInicial(apellido)}`;
}

function construirPayloadUsuario(user, perfilCompleto) {
    return {
        id: user.id_usuario,
        username: user.nombre_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        role: user.rol,
        avatar: construirAvatar(user.nombre, user.apellido),
        perfil_completo: perfilCompleto,
    };
}

function generarTokenUsuario(user) {
    return jwt.sign(
        {
            id: user.id_usuario,
            nombre_usuario: user.nombre_usuario,
            email: user.email,
            role: user.rol,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

async function resolverPerfilCompletoUsuario(user) {
    let perfilCompleto = !!user.perfil_completo;

    if (user.rol === 'tenant' && !perfilCompleto) {
        const [perfilRows] = await pool.query(
            'SELECT edad, ciudad, horario, hobbies FROM perfiles WHERE id_usuario = ? LIMIT 1',
            [user.id_usuario]
        );

        const perfilCalculado = inferirPerfilCompletoDesdePerfil(perfilRows[0] || null);
        if (perfilCalculado) {
            perfilCompleto = true;
            await pool.query(
                'UPDATE usuarios SET perfil_completo = TRUE WHERE id_usuario = ?',
                [user.id_usuario]
            );
        }
    }

    return perfilCompleto;
}

function normalizarNombreUsuarioBase(value) {
    const texto = typeof value === 'string' ? value : '';
    const normalized = texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    return normalized.slice(0, 30);
}

async function generarNombreUsuarioUnico(base) {
    let cleanedBase = normalizarNombreUsuarioBase(base);
    if (cleanedBase.length < 3) {
        cleanedBase = `user_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    }

    let intento = 0;
    while (intento < 500) {
        const suffix = intento === 0 ? '' : `_${intento}`;
        const maxBaseLength = 30 - suffix.length;
        const candidate = `${cleanedBase.slice(0, maxBaseLength)}${suffix}`;

        const [existing] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE nombre_usuario = ? LIMIT 1',
            [candidate]
        );
        if (existing.length === 0) return candidate;

        intento += 1;
    }

    return `user_${uuidv4().replace(/-/g, '').slice(0, 25)}`;
}

async function verificarIdTokenGoogle(idToken) {
    const url = `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`;

    return await new Promise((resolve) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                resolve(null);
                return;
            }

            let raw = '';
            response.on('data', (chunk) => {
                raw += chunk;
            });
            response.on('end', () => {
                try {
                    const payload = JSON.parse(raw);
                    if (payload.error || payload.error_description) {
                        resolve(null);
                        return;
                    }
                    resolve(payload);
                } catch (error) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

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
                avatar: construirAvatar(nombre, apellido),
                perfil_completo: false,
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

        const perfilCompleto = await resolverPerfilCompletoUsuario(user);

        // Generar token JWT con los datos del usuario
        const token = generarTokenUsuario(user);

        // Responder con el token y datos del usuario
        res.json({
            success: true,
            message: 'Inicio de sesion exitoso',
            token,
            user: construirPayloadUsuario(user, perfilCompleto),
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Iniciar sesion o registrar usuario usando Google Identity Services
router.post('/google', async (req, res) => {
    try {
        const { idToken, role } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'El idToken de Google es obligatorio',
            });
        }

        const payload = await verificarIdTokenGoogle(idToken);
        if (!payload) {
            return res.status(401).json({
                success: false,
                message: 'El token de Google no es valido o expiro',
            });
        }

        const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
        const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

        if (!email || !emailVerified) {
            return res.status(401).json({
                success: false,
                message: 'Google no devolvio un correo verificado',
            });
        }

        const configuredClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
        if (configuredClientId && payload.aud !== configuredClientId) {
            return res.status(401).json({
                success: false,
                message: 'El token de Google no pertenece a esta aplicacion',
            });
        }

        const [existingRows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
            [email]
        );

        let user = existingRows[0] || null;
        let created = false;

        if (!user) {
            const validRoles = ['tenant', 'landlord'];
            const userRole = validRoles.includes(role) ? role : 'tenant';

            const nombre = (payload.given_name || payload.name || 'Usuario').trim().slice(0, 100);
            const apellido = (payload.family_name || 'Google').trim().slice(0, 100);
            const baseUsername = normalizarNombreUsuarioBase(
                payload.preferred_username || email.split('@')[0] || `${nombre}_${apellido}`
            );
            const nombreUsuario = await generarNombreUsuarioUnico(baseUsername);
            const passwordHash = await bcrypt.hash(uuidv4(), SALT_ROUNDS);
            const idUsuario = uuidv4();

            await pool.query(
                'INSERT INTO usuarios (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idUsuario, nombreUsuario, nombre || 'Usuario', apellido || 'Google', email, passwordHash, userRole]
            );

            const [createdRows] = await pool.query(
                'SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1',
                [idUsuario]
            );
            user = createdRows[0] || null;
            created = true;
        }

        if (!user) {
            return res.status(500).json({
                success: false,
                message: 'No fue posible completar el login con Google',
            });
        }

        if (user.estado_cuenta !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido suspendida o dada de baja',
            });
        }

        const perfilCompleto = await resolverPerfilCompletoUsuario(user);
        const token = generarTokenUsuario(user);

        res.json({
            success: true,
            message: created
                ? 'Cuenta creada e inicio de sesion con Google exitoso'
                : 'Inicio de sesion con Google exitoso',
            token,
            user: construirPayloadUsuario(user, perfilCompleto),
        });
    } catch (error) {
        console.error('Error en login con Google:', error);
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
            `SELECT u.id_usuario, u.nombre_usuario, u.nombre, u.apellido, u.email, u.rol, u.perfil_completo,
                    p.edad, p.ciudad, p.horario, p.hobbies
             FROM usuarios u
             LEFT JOIN perfiles p ON p.id_usuario = u.id_usuario
             WHERE u.id_usuario = ?
             LIMIT 1`,
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const user = rows[0];
        const perfilCompletoCalculado = inferirPerfilCompletoDesdePerfil(user);
        const perfilCompleto = !!user.perfil_completo || perfilCompletoCalculado;

        if (perfilCompleto && !user.perfil_completo) {
            await pool.query(
                'UPDATE usuarios SET perfil_completo = TRUE WHERE id_usuario = ?',
                [user.id_usuario]
            );
        }

        // Devolver los datos del usuario
        res.json({
            success: true,
            user: construirPayloadUsuario(user, perfilCompleto),
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
