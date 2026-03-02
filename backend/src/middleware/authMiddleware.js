const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function obtenerUsuarioActivoPorId(idUsuario) {
    const [rows] = await pool.query(
        'SELECT id_usuario, nombre_usuario, nombre, apellido, email, rol, estado_cuenta, foto_perfil FROM usuarios WHERE id_usuario = ?',
        [idUsuario]
    );

    if (rows.length === 0) return null;

    const usuario = rows[0];
    if (usuario.estado_cuenta !== 'activo') return null;

    return {
        id: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        foto_perfil: usuario.foto_perfil || null,
    };
}

// Middleware para verificar el token JWT en las peticiones protegidas
const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Verificar que se envio el header de autorizacion
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado',
            });
        }

        // Extraer y verificar el token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = await obtenerUsuarioActivoPorId(decoded.id);
        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }
        req.usuario = usuario;

        next();
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
};

// Middleware para verificar que el usuario tenga uno de los roles permitidos
// Uso: verificarRol('admin', 'landlord') permite solo admin y landlord
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificar que el middleware de token se ejecuto primero
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        // Verificar que el rol del usuario esta en la lista de roles permitidos
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a este recurso',
            });
        }

        next();
    };
};

// Middleware opcional: si hay token valido, adjunta req.usuario; si no, continua sin bloquear.
const cargarUsuarioOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await obtenerUsuarioActivoPorId(decoded.id);

        if (usuario) {
            req.usuario = usuario;
        }
    } catch (error) {
        // Ignorar token invalido en endpoints publicos.
    }

    return next();
};

module.exports = { verificarToken, verificarRol, cargarUsuarioOpcional };
