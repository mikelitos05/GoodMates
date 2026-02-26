const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const {
    construirErrorRegla,
    contarInquilinosActivosEnPropiedad,
    removerTenantDeConvivenciaActiva,
    enviarErrorRegla,
} = require('../services/convivenciaRules');

// Import compatibility function from matches route
let calcularCompatibilidad, parseHobbies;
try {
    const matchesRouter = require('./matches');
    calcularCompatibilidad = matchesRouter.calcularCompatibilidad;
    parseHobbies = matchesRouter.parseHobbies;
} catch (e) {
    console.error('Warning: could not load compatibility from matches:', e.message);
}

// Helper to optionally extract tenant user from token (without blocking)
function optionalTenantId(req) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goodmates_secret_key_2025');
        if (decoded.rol !== 'tenant') return null;
        return decoded.id;
    } catch { return null; }
}

// Configuracion de multer para subir imagenes de propiedades al disco local
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/propiedades');
        // Crear el directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generar nombre unico para evitar colisiones
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

// Filtrar solo archivos de imagen
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imagenes (JPEG, PNG, WebP, GIF)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB por imagen
});

function tieneValor(valor) {
    return valor !== undefined && valor !== null && valor !== '';
}

function parsearEntero(valor) {
    const numero = Number.parseInt(valor, 10);
    return Number.isNaN(numero) ? null : numero;
}

function parsearDecimal(valor) {
    const numero = Number.parseFloat(valor);
    return Number.isNaN(numero) ? null : numero;
}

// Listar propiedades con filtros opcionales y paginacion
router.get('/', async (req, res) => {
    try {
        const { ciudad, precioMin, precioMax, habitaciones, pagina = 1, limite = 10 } = req.query;

        let query = 'SELECT * FROM propiedades WHERE disponible = TRUE';
        const params = [];

        if (ciudad) {
            query += ' AND ciudad LIKE ?';
            params.push(`%${ciudad}%`);
        }
        if (precioMin) {
            query += ' AND precio >= ?';
            params.push(parseFloat(precioMin));
        }
        if (precioMax) {
            query += ' AND precio <= ?';
            params.push(parseFloat(precioMax));
        }
        if (habitaciones) {
            query += ' AND habitaciones_disponibles >= ?';
            params.push(parseInt(habitaciones));
        }

        query += ' ORDER BY destacada DESC, fecha_publicacion DESC';

        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limite), offset);

        const [propiedades] = await pool.query(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM propiedades WHERE disponible = TRUE';
        const countParams = [];
        if (ciudad) { countQuery += ' AND ciudad LIKE ?'; countParams.push(`%${ciudad}%`); }
        if (precioMin) { countQuery += ' AND precio >= ?'; countParams.push(parseFloat(precioMin)); }
        if (precioMax) { countQuery += ' AND precio <= ?'; countParams.push(parseFloat(precioMax)); }
        if (habitaciones) { countQuery += ' AND habitaciones_disponibles >= ?'; countParams.push(parseInt(habitaciones)); }
        const [countResult] = await pool.query(countQuery, countParams);

        let propiedadesParsed = propiedades.map(parsearPropiedad);

        // ── Compute compatibility if tenant is authenticated ──
        const tenantId = optionalTenantId(req);
        if (tenantId && calcularCompatibilidad) {
            try {
                const [miPerfil] = await pool.query(
                    `SELECT p.*, u.carrera FROM perfiles p
                     JOIN usuarios u ON u.id_usuario = p.id_usuario
                     WHERE p.id_usuario = ?`, [tenantId]
                );

                if (miPerfil.length > 0) {
                    // Get all group tenants for all properties in one query
                    const propIds = propiedadesParsed.map(p => p.id_propiedad);
                    if (propIds.length > 0) {
                        const [grupoTenants] = await pool.query(
                            `SELECT g.id_propiedad, mg.id_usuario, pr.*, u.carrera
                             FROM grupos_roommates g
                             JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
                             JOIN perfiles pr ON pr.id_usuario = mg.id_usuario
                             JOIN usuarios u ON u.id_usuario = mg.id_usuario
                             WHERE g.id_propiedad IN (?) AND g.activo = TRUE AND mg.id_usuario != ?`,
                            [propIds, tenantId]
                        );

                        // Build map: id_propiedad -> [profiles]
                        const propTenantMap = {};
                        for (const t of grupoTenants) {
                            if (!propTenantMap[t.id_propiedad]) propTenantMap[t.id_propiedad] = [];
                            propTenantMap[t.id_propiedad].push(t);
                        }

                        propiedadesParsed = propiedadesParsed.map(p => {
                            const tenants = propTenantMap[p.id_propiedad] || [];
                            if (tenants.length === 0) {
                                return { ...p, compatibilidad: null };
                            }
                            const sum = tenants.reduce((acc, t) =>
                                acc + calcularCompatibilidad(miPerfil[0], t), 0);
                            return { ...p, compatibilidad: Math.round(sum / tenants.length) };
                        });
                    }
                }
            } catch (e) {
                console.error('Error computing property compatibility:', e);
            }
        }

        res.json({
            success: true,
            propiedades: propiedadesParsed,
            paginacion: {
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                total: countResult[0].total,
                totalPaginas: Math.ceil(countResult[0].total / parseInt(limite)),
            },
        });

    } catch (error) {
        console.error('Error listando propiedades:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener las propiedades del landlord autenticado
router.get('/mis-propiedades', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const [propiedades] = await pool.query(
            'SELECT * FROM propiedades WHERE id_landlord = ? ORDER BY fecha_publicacion DESC',
            [req.usuario.id]
        );

        const propiedadesParsed = propiedades.map(parsearPropiedad);

        res.json({
            success: true,
            propiedades: propiedadesParsed,
        });

    } catch (error) {
        console.error('Error obteniendo mis propiedades:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Obtener los inquilinos activos de una propiedad del landlord autenticado
router.get('/:id/inquilinos', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;

        const [propRows] = await pool.query(
            'SELECT id_propiedad FROM propiedades WHERE id_propiedad = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (propRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propiedad no encontrada o no tienes permiso para consultarla',
            });
        }

        const [inquilinos] = await pool.query(
            `SELECT mg.id_usuario, u.nombre, u.apellido, u.email, mg.rol_en_grupo, mg.fecha_union,
                    s.id_solicitud AS id_solicitud_chat
             FROM grupos_roommates g
             JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
             JOIN usuarios u ON u.id_usuario = mg.id_usuario
             LEFT JOIN solicitudes_informes s
                ON s.id_tenant = mg.id_usuario
               AND s.id_propiedad = g.id_propiedad
               AND s.estado IN ('aceptada', 'confirmada')
             WHERE g.id_propiedad = ? AND g.activo = TRUE
             ORDER BY mg.fecha_union ASC`,
            [id]
        );

        return res.json({
            success: true,
            inquilinos,
        });
    } catch (error) {
        console.error('Error obteniendo inquilinos de la propiedad:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Remover un inquilino activo de una propiedad del landlord autenticado
router.delete('/:id/inquilinos/:idTenant', verificarToken, verificarRol('landlord'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id, idTenant } = req.params;
        await connection.beginTransaction();

        const [propRows] = await connection.query(
            `SELECT id_propiedad
             FROM propiedades
             WHERE id_propiedad = ? AND id_landlord = ?
             FOR UPDATE`,
            [id, req.usuario.id]
        );

        if (propRows.length === 0) {
            throw construirErrorRegla(
                'PROPERTY_NOT_FOUND',
                'Propiedad no encontrada o no tienes permiso para administrarla',
                404
            );
        }

        const [tenantRows] = await connection.query(
            `SELECT mg.id_grupo
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON g.id_grupo = mg.id_grupo
             WHERE mg.id_usuario = ?
               AND g.id_propiedad = ?
               AND g.activo = TRUE
             LIMIT 1
             FOR UPDATE`,
            [idTenant, id]
        );

        if (tenantRows.length === 0) {
            throw construirErrorRegla(
                'TENANT_NOT_IN_PROPERTY',
                'El inquilino no pertenece a un grupo activo de esta propiedad',
                404
            );
        }

        const resultado = await removerTenantDeConvivenciaActiva(connection, {
            idGrupo: tenantRows[0].id_grupo,
            idTenant,
            incrementarDisponibilidad: true,
        });

        await connection.commit();

        return res.json({
            success: true,
            message: 'Inquilino removido exitosamente de la propiedad',
            resultado,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error removiendo inquilino de propiedad:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    } finally {
        connection.release();
    }
});

// Obtener el detalle de una propiedad por su ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT p.*, u.nombre as landlord_nombre, u.apellido as landlord_apellido, u.email as landlord_email
       FROM propiedades p
       JOIN usuarios u ON p.id_landlord = u.id_usuario
       WHERE p.id_propiedad = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propiedad no encontrada',
            });
        }

        const propiedad = parsearPropiedad(rows[0]);

        // ── Get group tenants and compatibility for authenticated tenant ──
        let roommates = [];
        const tenantId = optionalTenantId(req);

        try {
            const [grupoTenants] = await pool.query(
                `SELECT mg.id_usuario, u.nombre, u.apellido, pr.*,
                        u.carrera, u.universidad
                 FROM grupos_roommates g
                 JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
                 JOIN usuarios u ON u.id_usuario = mg.id_usuario
                 LEFT JOIN perfiles pr ON pr.id_usuario = mg.id_usuario
                 WHERE g.id_propiedad = ? AND g.activo = TRUE`,
                [id]
            );

            if (grupoTenants.length > 0 && tenantId && calcularCompatibilidad) {
                const [miPerfil] = await pool.query(
                    `SELECT p.*, u.carrera FROM perfiles p
                     JOIN usuarios u ON u.id_usuario = p.id_usuario
                     WHERE p.id_usuario = ?`, [tenantId]
                );

                roommates = grupoTenants.map(t => {
                    let compat = null;
                    if (miPerfil.length > 0 && t.id_usuario !== tenantId) {
                        compat = calcularCompatibilidad(miPerfil[0], t);
                    }
                    return {
                        id_usuario: t.id_usuario,
                        nombre: t.nombre,
                        apellido: t.apellido,
                        avatar: (t.nombre[0] + t.apellido[0]).toUpperCase(),
                        compatibilidad: compat,
                    };
                }).filter(r => r.id_usuario !== tenantId);
            } else {
                roommates = grupoTenants.map(t => ({
                    id_usuario: t.id_usuario,
                    nombre: t.nombre,
                    apellido: t.apellido,
                    avatar: (t.nombre[0] + t.apellido[0]).toUpperCase(),
                    compatibilidad: null,
                }));
            }
        } catch (e) {
            console.error('Error getting property roommates:', e);
        }

        res.json({
            success: true,
            propiedad,
            roommates,
        });

    } catch (error) {
        console.error('Error obteniendo propiedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Crear una nueva propiedad (solo landlords)
router.post('/', verificarToken, verificarRol('landlord'), upload.array('imagenes', 10), async (req, res) => {
    try {
        const {
            titulo, descripcion, direccion, ciudad, estado,
            precio, habitaciones, banos, habitaciones_disponibles,
            min_meses_permanencia, area, amenidades, reglas, lugares_cercanos, latitud, longitud
        } = req.body;

        // Validar campos obligatorios
        if (!titulo || !precio || !habitaciones || !banos || !habitaciones_disponibles) {
            return res.status(400).json({
                success: false,
                message: 'Titulo, precio, habitaciones, banos y habitaciones disponibles son obligatorios',
            });
        }

        const precioNumero = parsearDecimal(precio);
        const habitacionesNumero = parsearEntero(habitaciones);
        const banosNumero = parsearEntero(banos);
        const habitacionesDisponiblesNumero = parsearEntero(habitaciones_disponibles);

        if (
            precioNumero === null || precioNumero <= 0 ||
            habitacionesNumero === null || habitacionesNumero <= 0 ||
            banosNumero === null || banosNumero <= 0 ||
            habitacionesDisponiblesNumero === null || habitacionesDisponiblesNumero < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Precio, habitaciones, banos y habitaciones disponibles deben ser valores validos',
            });
        }

        if (habitacionesDisponiblesNumero > habitacionesNumero) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_AVAILABLE_ROOMS',
                message: 'Las habitaciones disponibles no pueden ser mayores a las habitaciones totales',
            });
        }

        const id_propiedad = uuidv4();

        // Procesar las imagenes subidas
        const imagenes = req.files ? req.files.map(f => `/uploads/propiedades/${f.filename}`) : [];

        // Parsear amenidades y reglas si vienen como string separado por comas
        const amenidadesArr = amenidades
            ? (typeof amenidades === 'string' ? amenidades.split(',').map(a => a.trim()).filter(Boolean) : amenidades)
            : [];
        const reglasArr = reglas
            ? (typeof reglas === 'string' ? reglas.split(',').map(r => r.trim()).filter(Boolean) : reglas)
            : [];
        const lugaresArr = lugares_cercanos
            ? (typeof lugares_cercanos === 'string' ? lugares_cercanos.split(',').map(l => l.trim()).filter(Boolean) : lugares_cercanos)
            : [];

        await pool.query(
            `INSERT INTO propiedades
        (id_propiedad, id_landlord, titulo, descripcion, direccion, ciudad, estado,
         precio, habitaciones, banos, habitaciones_disponibles, min_meses_permanencia, area,
         amenidades, reglas, imagenes, lugares_cercanos, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_propiedad, req.usuario.id, titulo, descripcion || null,
                direccion || null, ciudad || null, estado || null,
                precioNumero, habitacionesNumero, banosNumero,
                habitacionesDisponiblesNumero,
                min_meses_permanencia ? parseInt(min_meses_permanencia) : null,
                area ? parseFloat(area) : null,
                JSON.stringify(amenidadesArr), JSON.stringify(reglasArr),
                JSON.stringify(imagenes), JSON.stringify(lugaresArr),
                latitud ? parseFloat(latitud) : null, longitud ? parseFloat(longitud) : null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Propiedad creada exitosamente',
            propiedad: {
                id: id_propiedad,
                titulo,
                imagenes,
            },
        });

    } catch (error) {
        console.error('Error creando propiedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Actualizar una propiedad existente (solo el landlord dueno)
router.put('/:id', verificarToken, verificarRol('landlord'), upload.array('imagenes', 10), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la propiedad pertenece al landlord autenticado
        const [existing] = await pool.query(
            'SELECT * FROM propiedades WHERE id_propiedad = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propiedad no encontrada o no tienes permiso para editarla',
            });
        }

        const {
            titulo, descripcion, direccion, ciudad, estado,
            precio, habitaciones, banos, habitaciones_disponibles,
            min_meses_permanencia, area, amenidades, reglas, lugares_cercanos, disponible, destacada,
            latitud, longitud
        } = req.body;

        // Procesar nuevas imagenes si se subieron
        let imagenes = existing[0].imagenes;
        if (req.files && req.files.length > 0) {
            const nuevasImagenes = req.files.map(f => `/uploads/propiedades/${f.filename}`);
            // Combinar imagenes existentes con las nuevas
            const existingImages = typeof imagenes === 'string' ? JSON.parse(imagenes) : (imagenes || []);
            imagenes = JSON.stringify([...existingImages, ...nuevasImagenes]);
        }

        // Parsear amenidades y reglas
        const amenidadesArr = amenidades
            ? (typeof amenidades === 'string' ? amenidades.split(',').map(a => a.trim()).filter(Boolean) : amenidades)
            : [];
        const reglasArr = reglas
            ? (typeof reglas === 'string' ? reglas.split(',').map(r => r.trim()).filter(Boolean) : reglas)
            : [];
        const lugaresArr = lugares_cercanos
            ? (typeof lugares_cercanos === 'string' ? lugares_cercanos.split(',').map(l => l.trim()).filter(Boolean) : lugares_cercanos)
            : [];

        const precioFinal = tieneValor(precio) ? parsearDecimal(precio) : parsearDecimal(existing[0].precio);
        const habitacionesFinal = tieneValor(habitaciones) ? parsearEntero(habitaciones) : parsearEntero(existing[0].habitaciones);
        const banosFinal = tieneValor(banos) ? parsearEntero(banos) : parsearEntero(existing[0].banos);
        const habitacionesDisponiblesFinal = tieneValor(habitaciones_disponibles)
            ? parsearEntero(habitaciones_disponibles)
            : parsearEntero(existing[0].habitaciones_disponibles);

        if (
            precioFinal === null || precioFinal <= 0 ||
            habitacionesFinal === null || habitacionesFinal <= 0 ||
            banosFinal === null || banosFinal <= 0 ||
            habitacionesDisponiblesFinal === null || habitacionesDisponiblesFinal < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Precio, habitaciones, banos y habitaciones disponibles deben ser valores validos',
            });
        }

        if (habitacionesDisponiblesFinal > habitacionesFinal) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_AVAILABLE_ROOMS',
                message: 'Las habitaciones disponibles no pueden ser mayores a las habitaciones totales',
            });
        }

        await pool.query(
            `UPDATE propiedades SET
        titulo = ?, descripcion = ?, direccion = ?, ciudad = ?, estado = ?,
        precio = ?, habitaciones = ?, banos = ?, habitaciones_disponibles = ?, min_meses_permanencia = ?,
        area = ?, amenidades = ?, reglas = ?, imagenes = ?, lugares_cercanos = ?,
        disponible = ?, destacada = ?, latitud = ?, longitud = ?
       WHERE id_propiedad = ?`,
            [
                titulo || existing[0].titulo,
                descripcion !== undefined ? descripcion : existing[0].descripcion,
                direccion || existing[0].direccion,
                ciudad || existing[0].ciudad,
                estado || existing[0].estado,
                precioFinal,
                habitacionesFinal,
                banosFinal,
                habitacionesDisponiblesFinal,
                min_meses_permanencia !== undefined
                    ? (min_meses_permanencia ? parseInt(min_meses_permanencia) : null)
                    : existing[0].min_meses_permanencia,
                area ? parseFloat(area) : existing[0].area,
                JSON.stringify(amenidadesArr),
                JSON.stringify(reglasArr),
                typeof imagenes === 'string' ? imagenes : JSON.stringify(imagenes || []),
                JSON.stringify(lugaresArr),
                disponible !== undefined ? disponible : existing[0].disponible,
                destacada !== undefined ? destacada : existing[0].destacada,
                latitud !== undefined ? (latitud ? parseFloat(latitud) : null) : existing[0].latitud,
                longitud !== undefined ? (longitud ? parseFloat(longitud) : null) : existing[0].longitud,
                id
            ]
        );

        res.json({
            success: true,
            message: 'Propiedad actualizada exitosamente',
        });

    } catch (error) {
        console.error('Error actualizando propiedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Eliminar una propiedad (solo el landlord dueno)
router.delete('/:id', verificarToken, verificarRol('landlord'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la propiedad pertenece al landlord autenticado
        const [existing] = await pool.query(
            'SELECT id_propiedad, imagenes FROM propiedades WHERE id_propiedad = ? AND id_landlord = ?',
            [id, req.usuario.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propiedad no encontrada o no tienes permiso para eliminarla',
            });
        }

        const inquilinosActivos = await contarInquilinosActivosEnPropiedad(pool, id);
        if (inquilinosActivos > 0) {
            return res.status(409).json({
                success: false,
                code: 'PROPERTY_HAS_ACTIVE_TENANTS',
                message: 'No puedes eliminar una propiedad con inquilinos activos',
            });
        }

        // Eliminar las imagenes del disco si existen
        try {
            const imagenes = typeof existing[0].imagenes === 'string'
                ? JSON.parse(existing[0].imagenes)
                : (existing[0].imagenes || []);
            imagenes.forEach(img => {
                const imgPath = path.join(__dirname, '../..', img);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            });
        } catch (e) {
            console.error('Error eliminando imagenes:', e);
        }

        // Eliminar la propiedad de la base de datos
        await pool.query('DELETE FROM propiedades WHERE id_propiedad = ?', [id]);

        res.json({
            success: true,
            message: 'Propiedad eliminada exitosamente',
        });

    } catch (error) {
        console.error('Error eliminando propiedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Funcion auxiliar para parsear los campos JSON de una propiedad
function parsearPropiedad(prop) {
    const parseJsonField = (field) => {
        if (!field) return [];
        if (typeof field === 'string') {
            try { return JSON.parse(field); } catch { return []; }
        }
        return field;
    };

    return {
        ...prop,
        amenidades: parseJsonField(prop.amenidades),
        reglas: parseJsonField(prop.reglas),
        imagenes: parseJsonField(prop.imagenes),
        lugares_cercanos: parseJsonField(prop.lugares_cercanos),
    };
}

module.exports = router;
