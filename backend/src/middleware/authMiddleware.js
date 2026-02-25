const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

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

        // Buscar el usuario en la base de datos para confirmar que existe y esta activo
        const [rows] = await pool.query(
            'SELECT id_usuario, nombre, apellido, email, rol, estado_cuenta FROM usuarios WHERE id_usuario = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const usuario = rows[0];

        // Verificar que la cuenta no este suspendida o dada de baja
        if (usuario.estado_cuenta !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Cuenta suspendida o dada de baja',
            });
        }

        // Adjuntar los datos del usuario a la peticion para uso posterior
        req.usuario = {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol,
        };

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

module.exports = { verificarToken, verificarRol };
