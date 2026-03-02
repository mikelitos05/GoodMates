const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { verificarToken, verificarRol, cargarUsuarioOpcional } = require('../middleware/authMiddleware');
const { calcularCompatibilidadSiPosible } = require('../services/compatibilityService');
const { construirAvatar, normalizarFotoPerfil } = require('../utils/avatar');
const {
    construirErrorRegla,
    contarInquilinosActivosEnPropiedad,
    removerTenantDeConvivenciaActiva,
    enviarErrorRegla,
} = require('../services/convivenciaRules');
const {
    crearPendienteCalificacionLandlordPorEgreso,
    crearPendienteCalificacionTenantAlLandlordPorEgreso,
    obtenerResumenPendientesCalificacionLandlord,
} = require('../services/ratingsService');

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

async function obtenerPerfilTenant(idUsuario) {
    if (!idUsuario) return null;

    const [rows] = await pool.query(
        'SELECT * FROM perfiles WHERE id_usuario = ? LIMIT 1',
        [idUsuario]
    );

    return rows[0] || null;
}

async function obtenerTenantsActivosPorPropiedades(idsPropiedades = []) {
    if (!Array.isArray(idsPropiedades) || idsPropiedades.length === 0) {
        return new Map();
    }

    const [rows] = await pool.query(
        `SELECT g.id_propiedad, u.id_usuario, u.nombre, u.apellido, u.foto_perfil, p.*,
                cr.calificacion_promedio, cr.total_calificaciones
         FROM grupos_roommates g
         JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
         JOIN usuarios u ON u.id_usuario = mg.id_usuario
         LEFT JOIN perfiles p ON p.id_usuario = u.id_usuario
         LEFT JOIN (
            SELECT id_usuario_calificado,
                   ROUND(AVG(puntuacion), 1) AS calificacion_promedio,
                   COUNT(*) AS total_calificaciones
            FROM calificaciones
            GROUP BY id_usuario_calificado
         ) cr ON cr.id_usuario_calificado = u.id_usuario
         WHERE g.activo = TRUE
           AND g.id_propiedad IN (?)
           AND u.rol = 'tenant'
           AND u.estado_cuenta = 'activo'`,
        [idsPropiedades]
    );

    const porPropiedad = new Map();
    for (const row of rows) {
        if (!porPropiedad.has(row.id_propiedad)) {
            porPropiedad.set(row.id_propiedad, []);
        }
        porPropiedad.get(row.id_propiedad).push(row);
    }

    return porPropiedad;
}

function enriquecerPropiedadConCompatibilidad({ propiedad, tenantsActivos = [], tenantActualId = null, perfilActual = null }) {
    const inquilinosActivos = tenantsActivos.length;
    const inquilinosConCalificacion = tenantsActivos.filter((tenant) =>
        tenant.calificacion_promedio !== null && tenant.calificacion_promedio !== undefined
    );
    const promedioCalificaciones = inquilinosConCalificacion.length > 0
        ? Number(
            (
                inquilinosConCalificacion.reduce(
                    (acc, tenant) => acc + Number(tenant.calificacion_promedio || 0),
                    0
                ) / inquilinosConCalificacion.length
            ).toFixed(1)
        )
        : null;

    const base = {
        ...propiedad,
        inquilinos_activos: inquilinosActivos,
        compatibilidad: null,
        inquilinos_compatibles: [],
        calificacion_promedio_inquilinos: promedioCalificaciones,
        inquilinos_calificados: inquilinosConCalificacion.length,
    };

    if (!perfilActual) {
        return base;
    }

    const inquilinosCompatibles = tenantsActivos
        .filter((t) => t.id_usuario !== tenantActualId)
        .map((tenant) => {
            const compatibilidad = calcularCompatibilidadSiPosible(perfilActual, tenant);
            if (compatibilidad === null || compatibilidad === undefined) {
                return null;
            }

            return {
                id_usuario: tenant.id_usuario,
                nombre: tenant.nombre,
                apellido: tenant.apellido,
                avatar: construirAvatar(tenant.nombre, tenant.apellido),
                foto_perfil: normalizarFotoPerfil(tenant.foto_perfil),
                profileImage: normalizarFotoPerfil(tenant.foto_perfil),
                compatibilidad,
                calificacion_promedio: tenant.calificacion_promedio !== null && tenant.calificacion_promedio !== undefined
                    ? Number(tenant.calificacion_promedio)
                    : null,
                total_calificaciones: Number(tenant.total_calificaciones || 0),
            };
        })
        .filter(Boolean);

    const promedio = inquilinosCompatibles.length > 0
        ? Math.round(
            inquilinosCompatibles.reduce((acc, item) => acc + item.compatibilidad, 0) / inquilinosCompatibles.length
        )
        : null;

    return {
        ...base,
        compatibilidad: promedio,
        inquilinos_compatibles: inquilinosCompatibles,
    };
}

// Listar propiedades con filtros opcionales y paginacion
router.get('/', cargarUsuarioOpcional, async (req, res) => {
    try {
        const { ciudad, precioMin, precioMax, habitaciones, pagina = 1, limite = 10 } = req.query;

        let query = 'SELECT * FROM propiedades WHERE disponible = TRUE AND habitaciones_disponibles > 0';
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

        let countQuery = 'SELECT COUNT(*) as total FROM propiedades WHERE disponible = TRUE AND habitaciones_disponibles > 0';
        const countParams = [];
        if (ciudad) { countQuery += ' AND ciudad LIKE ?'; countParams.push(`%${ciudad}%`); }
        if (precioMin) { countQuery += ' AND precio >= ?'; countParams.push(parseFloat(precioMin)); }
        if (precioMax) { countQuery += ' AND precio <= ?'; countParams.push(parseFloat(precioMax)); }
        if (habitaciones) { countQuery += ' AND habitaciones_disponibles >= ?'; countParams.push(parseInt(habitaciones)); }
        const [countResult] = await pool.query(countQuery, countParams);

        // Parsear campos JSON de cada propiedad
        const propiedadesParsed = propiedades.map(parsearPropiedad);
        const idsPropiedades = propiedadesParsed.map((p) => p.id_propiedad).filter(Boolean);
        const tenantsPorPropiedad = await obtenerTenantsActivosPorPropiedades(idsPropiedades);

        const esTenantAutenticado = req.usuario?.rol === 'tenant';
        const perfilActual = esTenantAutenticado ? await obtenerPerfilTenant(req.usuario.id) : null;

        const propiedadesEnriquecidas = propiedadesParsed.map((propiedad) =>
            enriquecerPropiedadConCompatibilidad({
                propiedad,
                tenantsActivos: tenantsPorPropiedad.get(propiedad.id_propiedad) || [],
                tenantActualId: req.usuario?.id || null,
                perfilActual,
            })
        );

        res.json({
            success: true,
            propiedades: propiedadesEnriquecidas,
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
            `SELECT mg.id_usuario, u.nombre, u.apellido, u.email, u.foto_perfil, mg.rol_en_grupo, mg.fecha_union,
                    s.id_solicitud AS id_solicitud_chat,
                    cr.calificacion_promedio, cr.total_calificaciones
             FROM grupos_roommates g
             JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
             JOIN usuarios u ON u.id_usuario = mg.id_usuario
             LEFT JOIN (
                SELECT id_usuario_calificado,
                       ROUND(AVG(puntuacion), 1) AS calificacion_promedio,
                       COUNT(*) AS total_calificaciones
                FROM calificaciones
                GROUP BY id_usuario_calificado
             ) cr ON cr.id_usuario_calificado = mg.id_usuario
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
            inquilinos: inquilinos.map((inquilino) => ({
                ...inquilino,
                avatar: construirAvatar(inquilino.nombre, inquilino.apellido),
                foto_perfil: normalizarFotoPerfil(inquilino.foto_perfil),
                profileImage: normalizarFotoPerfil(inquilino.foto_perfil),
            })),
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

        const pendientes = await obtenerResumenPendientesCalificacionLandlord(connection, req.usuario.id);
        if (pendientes.total > 0) {
            const errorPendientes = construirErrorRegla(
                'LANDLORD_PENDING_RATINGS',
                'Tienes calificaciones pendientes por resolver antes de continuar',
                409
            );
            errorPendientes.pendingRatings = pendientes;
            throw errorPendientes;
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
        const pendienteCalificacion = await crearPendienteCalificacionLandlordPorEgreso(connection, {
            idTenant,
            idPropiedad: id,
            motivo: 'remocion_landlord',
        });
        const pendienteCalificacionTenant = await crearPendienteCalificacionTenantAlLandlordPorEgreso(connection, {
            idTenant,
            idPropiedad: id,
            motivo: 'remocion_landlord',
        });
        await connection.query(
            `UPDATE solicitudes_informes
             SET estado = 'egresada'
             WHERE id_tenant = ?
               AND id_propiedad = ?
               AND estado = 'confirmada'`,
            [idTenant, id]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: 'Inquilino removido exitosamente de la propiedad',
            resultado,
            pendiente_calificacion: pendienteCalificacion,
            pendiente_calificacion_tenant: pendienteCalificacionTenant,
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
router.get('/:id', cargarUsuarioOpcional, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT p.*, u.id_usuario as landlord_id, u.nombre as landlord_nombre, u.apellido as landlord_apellido,
                    u.email as landlord_email, u.foto_perfil as landlord_foto_perfil
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

        const propiedadBase = parsearPropiedad(rows[0]);
        const tenantsPorPropiedad = await obtenerTenantsActivosPorPropiedades([id]);

        const esTenantAutenticado = req.usuario?.rol === 'tenant';
        const perfilActual = esTenantAutenticado ? await obtenerPerfilTenant(req.usuario.id) : null;

        const propiedad = enriquecerPropiedadConCompatibilidad({
            propiedad: propiedadBase,
            tenantsActivos: tenantsPorPropiedad.get(id) || [],
            tenantActualId: req.usuario?.id || null,
            perfilActual,
        });

        res.json({
            success: true,
            propiedad,
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
        landlord_avatar: prop.landlord_nombre
            ? construirAvatar(prop.landlord_nombre, prop.landlord_apellido)
            : null,
        landlord_foto_perfil: normalizarFotoPerfil(prop.landlord_foto_perfil),
    };
}

module.exports = router;
