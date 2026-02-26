const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

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

// Listar propiedades con filtros opcionales y paginacion
router.get('/', async (req, res) => {
    try {
        const { ciudad, precioMin, precioMax, habitaciones, pagina = 1, limite = 10 } = req.query;

        let query = 'SELECT * FROM propiedades WHERE disponible = TRUE';
        const params = [];

        // Aplicar filtros opcionales
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

        // Ordenar por destacadas primero, luego por fecha de publicacion
        query += ' ORDER BY destacada DESC, fecha_publicacion DESC';

        // Calcular paginacion
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limite), offset);

        const [propiedades] = await pool.query(query, params);

        // Obtener el total de resultados para paginacion
        let countQuery = 'SELECT COUNT(*) as total FROM propiedades WHERE disponible = TRUE';
        const countParams = [];
        if (ciudad) {
            countQuery += ' AND ciudad LIKE ?';
            countParams.push(`%${ciudad}%`);
        }
        if (precioMin) {
            countQuery += ' AND precio >= ?';
            countParams.push(parseFloat(precioMin));
        }
        if (precioMax) {
            countQuery += ' AND precio <= ?';
            countParams.push(parseFloat(precioMax));
        }
        if (habitaciones) {
            countQuery += ' AND habitaciones_disponibles >= ?';
            countParams.push(parseInt(habitaciones));
        }
        const [countResult] = await pool.query(countQuery, countParams);

        // Parsear campos JSON de cada propiedad
        const propiedadesParsed = propiedades.map(parsearPropiedad);

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

// Obtener el detalle de una propiedad por su ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT p.*, u.nombre as landlord_nombre, u.apellido as landlord_apellido
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
            area, amenidades, reglas, lugares_cercanos, latitud, longitud
        } = req.body;

        // Validar campos obligatorios
        if (!titulo || !precio || !habitaciones || !banos || !habitaciones_disponibles) {
            return res.status(400).json({
                success: false,
                message: 'Titulo, precio, habitaciones, banos y habitaciones disponibles son obligatorios',
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
         precio, habitaciones, banos, habitaciones_disponibles, area,
         amenidades, reglas, imagenes, lugares_cercanos, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_propiedad, req.usuario.id, titulo, descripcion || null,
                direccion || null, ciudad || null, estado || null,
                parseFloat(precio), parseInt(habitaciones), parseInt(banos),
                parseInt(habitaciones_disponibles), area ? parseFloat(area) : null,
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
            area, amenidades, reglas, lugares_cercanos, disponible, destacada,
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

        await pool.query(
            `UPDATE propiedades SET
        titulo = ?, descripcion = ?, direccion = ?, ciudad = ?, estado = ?,
        precio = ?, habitaciones = ?, banos = ?, habitaciones_disponibles = ?,
        area = ?, amenidades = ?, reglas = ?, imagenes = ?, lugares_cercanos = ?,
        disponible = ?, destacada = ?, latitud = ?, longitud = ?
       WHERE id_propiedad = ?`,
            [
                titulo || existing[0].titulo,
                descripcion !== undefined ? descripcion : existing[0].descripcion,
                direccion || existing[0].direccion,
                ciudad || existing[0].ciudad,
                estado || existing[0].estado,
                precio ? parseFloat(precio) : existing[0].precio,
                habitaciones ? parseInt(habitaciones) : existing[0].habitaciones,
                banos ? parseInt(banos) : existing[0].banos,
                habitaciones_disponibles ? parseInt(habitaciones_disponibles) : existing[0].habitaciones_disponibles,
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
