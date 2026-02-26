const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// ─── Career category map for compatibility scoring ───
const careerCategoryMap = {};
const careerCategories = [
    ['Ciencias Sociales, Derecho y Humanidades', ['Administración y gestión de empresas', 'Contabilidad', 'Finanzas', 'Mercadotecnia', 'Economía', 'Psicología', 'Sociología', 'Ciencias políticas', 'Antropología', 'Trabajo social', 'Derecho', 'Comunicación', 'Periodismo', 'Historia', 'Filosofía', 'Lingüística', 'Letras', 'Educación', 'Pedagogía', 'Relaciones Internacionales', 'Recursos Humanos', 'Administración Pública']],
    ['Ciencias Naturales y Exactas', ['Biología', 'Bioquímica', 'Química', 'Física', 'Matemáticas', 'Ciencia de Datos', 'Ciencias ambientales', 'Nutrición', 'Biotecnología', 'Ciencia de materiales', 'Forense', 'Agroforestales', 'Agrogenómica', 'Ciencia de la tierra']],
    ['Ingenierías y Tecnología', ['Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería Mecánica', 'Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ingeniería Química', 'Ingeniería Ambiental', 'Ingeniería de Software / Informática', 'Ingeniería Biomédica', 'Ingeniería en Sistemas Computacionales', 'Ingeniería Mecatrónica', 'Ingeniería de Alimentos', 'Sistemas de Información', 'Tecnología de la Información', 'Robótica']],
    ['Arquitectura, Construcción y Diseño', ['Arquitectura', 'Arquitectura de interiores', 'Diseño Industrial', 'Diseño gráfico', 'Diseño de moda', 'Urbanismo', 'Planeación territorial']],
    ['Ciencias de la Salud', ['Medicina', 'Enfermería', 'Fisioterapia', 'Odontología', 'Farmacia', 'Psicología clínica', 'Biomedicina', 'Salud pública', 'Nutrición humana', 'Veterinaria']],
    ['Artes y Creatividad', ['Artes visuales', 'Música', 'Teatro', 'Danza', 'Cine y medios audiovisuales', 'Producción musical', 'Artes plásticas']],
    ['Administración, Negocio y Economía', ['Administración de negocios', 'Comercio internacional', 'Finanzas y banca', 'Contabilidad pública', 'Emprendimiento empresarial', 'Marketing digital', 'Gestión empresarial', 'Administración turística']],
    ['Tecnologías Aplicadas', ['Desarrollo de software', 'Analista programador', 'Inteligencia artificial', 'Ciberseguridad', 'Big Data', 'Multimedia digital', 'Animación digital']],
    ['Agronomía y Ciencias del Medio Ambiente', ['Agronomía', 'Ingeniería forestal', 'Agricultura sustentable', 'Gestión ambiental', 'Recursos naturales']],
    ['Especialidades Técnicas y Profesionales', ['Arquitectura técnica', 'Electromecánica', 'Telecomunicaciones', 'Logística', 'Calidad e innovación', 'Gestión de proyectos']],
    ['Áreas Misceláneas o Transversales', ['Ciencias religiosas', 'Ciencias teológicas', 'Turismo', 'Hotelería', 'Deportes y educación física', 'Gastronomía', 'Idiomas y traducción']],
];
for (const [cat, careers] of careerCategories) {
    for (const c of careers) {
        careerCategoryMap[c] = cat;
    }
}

// ─── Obtener todos los tenants con compatibilidad calculada en tiempo real ───
router.get('/all-tenants', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        // Obtener perfil del usuario actual
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`,
            [req.usuario.id]
        );

        if (miPerfil.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes completar tu perfil antes de ver matches',
            });
        }

        const perfil = miPerfil[0];

        // Obtener todos los otros tenants activos con perfil completo
        const [otrosTenants] = await pool.query(
            `SELECT p.*, u.id_usuario, u.nombre, u.apellido, u.carrera, u.universidad, u.biografia
             FROM perfiles p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             WHERE u.id_usuario != ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo' AND u.perfil_completo = TRUE`,
            [req.usuario.id]
        );

        // Obtener info de grupos: quienes están en un grupo activo y en qué propiedad
        const [miembrosGrupos] = await pool.query(
            `SELECT mg.id_usuario, g.id_grupo, g.nombre as nombre_grupo, g.id_propiedad,
                    pr.titulo as titulo_propiedad
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON mg.id_grupo = g.id_grupo
             LEFT JOIN propiedades pr ON g.id_propiedad = pr.id_propiedad
             WHERE g.activo = TRUE`
        );

        const grupoMap = {};
        for (const m of miembrosGrupos) {
            grupoMap[m.id_usuario] = {
                id_grupo: m.id_grupo,
                nombre_grupo: m.nombre_grupo,
                id_propiedad: m.id_propiedad,
                titulo_propiedad: m.titulo_propiedad,
            };
        }

        // Verificar si el usuario actual está en un grupo
        const miGrupo = grupoMap[req.usuario.id] || null;

        // Verificar match requests existentes del usuario actual
        const [matchesExistentes] = await pool.query(
            `SELECT id_match, id_usuario_1, id_usuario_2, estado, porcentaje_compatibilidad
             FROM matches
             WHERE id_usuario_1 = ? OR id_usuario_2 = ?`,
            [req.usuario.id, req.usuario.id]
        );

        const matchMap = {};
        for (const m of matchesExistentes) {
            const otroId = m.id_usuario_1 === req.usuario.id ? m.id_usuario_2 : m.id_usuario_1;
            matchMap[otroId] = {
                id_match: m.id_match,
                estado: m.estado,
                soyIniciador: m.id_usuario_1 === req.usuario.id,
            };
        }

        // Calcular compatibilidad con cada tenant
        const tenants = otrosTenants.map(otro => {
            const compatibilidad = calcularCompatibilidad(perfil, otro);
            const grupo = grupoMap[otro.id_usuario] || null;
            const matchInfo = matchMap[otro.id_usuario] || null;

            // Parsear hobbies
            let hobbies = [];
            try {
                hobbies = parseHobbies(otro.hobbies);
            } catch (e) { /* ignore */ }

            return {
                id_usuario: otro.id_usuario,
                nombre: otro.nombre,
                apellido: otro.apellido,
                avatar: (otro.nombre[0] + otro.apellido[0]).toUpperCase(),
                universidad: otro.universidad,
                carrera: otro.carrera,
                ciudad: otro.ciudad,
                edad: otro.edad,
                horario: otro.horario,
                biografia: otro.biografia,
                hobbies: hobbies.slice(0, 5),
                compatibilidad,
                en_grupo: !!grupo,
                grupo: grupo ? {
                    nombre: grupo.nombre_grupo,
                    id_propiedad: grupo.id_propiedad,
                    titulo_propiedad: grupo.titulo_propiedad,
                } : null,
                match: matchInfo,
            };
        });

        // Ordenar por compatibilidad descendente
        tenants.sort((a, b) => b.compatibilidad - a.compatibilidad);

        res.json({
            success: true,
            tenants,
            mi_grupo: miGrupo,
        });

    } catch (error) {
        console.error('Error obteniendo tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ─── Obtener los matches del tenant autenticado (legacy) ───
router.get('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const [matches] = await pool.query(
            `SELECT m.*,
              u1.nombre as nombre_1, u1.apellido as apellido_1,
              u2.nombre as nombre_2, u2.apellido as apellido_2,
              p1.ciudad as ciudad_1, p1.hobbies as hobbies_1, p1.edad as edad_1,
              p2.ciudad as ciudad_2, p2.hobbies as hobbies_2, p2.edad as edad_2
       FROM matches m
       JOIN usuarios u1 ON m.id_usuario_1 = u1.id_usuario
       JOIN usuarios u2 ON m.id_usuario_2 = u2.id_usuario
       LEFT JOIN perfiles p1 ON u1.id_usuario = p1.id_usuario
       LEFT JOIN perfiles p2 ON u2.id_usuario = p2.id_usuario
       WHERE m.id_usuario_1 = ? OR m.id_usuario_2 = ?
       ORDER BY m.porcentaje_compatibilidad DESC`,
            [req.usuario.id, req.usuario.id]
        );

        const matchesFormateados = matches.map(m => {
            const esUsuario1 = m.id_usuario_1 === req.usuario.id;
            return {
                id: m.id_match,
                matchedUserId: esUsuario1 ? m.id_usuario_2 : m.id_usuario_1,
                matchedUserName: esUsuario1
                    ? `${m.nombre_2} ${m.apellido_2}`
                    : `${m.nombre_1} ${m.apellido_1}`,
                matchedUserAvatar: esUsuario1
                    ? (m.nombre_2[0] + m.apellido_2[0]).toUpperCase()
                    : (m.nombre_1[0] + m.apellido_1[0]).toUpperCase(),
                matchedUserCity: esUsuario1 ? m.ciudad_2 : m.ciudad_1,
                matchedUserAge: esUsuario1 ? m.edad_2 : m.edad_1,
                compatibility: m.porcentaje_compatibilidad,
                status: m.estado,
                createdAt: m.fecha_creacion,
            };
        });

        res.json({
            success: true,
            matches: matchesFormateados,
        });

    } catch (error) {
        console.error('Error obteniendo matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ─── Solicitar match con otro tenant ───
router.post('/:id/solicitar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const targetUserId = req.params.id;

        // Verificar que el target existe y es tenant activo
        const [targetUser] = await pool.query(
            "SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND rol = 'tenant' AND estado_cuenta = 'activo'",
            [targetUserId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Verificar que no exista ya un match entre ellos
        const [existente] = await pool.query(
            `SELECT id_match, estado FROM matches
             WHERE (id_usuario_1 = ? AND id_usuario_2 = ?)
                OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
            [req.usuario.id, targetUserId, targetUserId, req.usuario.id]
        );

        if (existente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un match con este usuario',
            });
        }

        // Calcular compatibilidad
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`, [req.usuario.id]
        );
        const [otroPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`, [targetUserId]
        );

        let compatibilidad = 50;
        if (miPerfil.length > 0 && otroPerfil.length > 0) {
            compatibilidad = calcularCompatibilidad(miPerfil[0], otroPerfil[0]);
        }

        const id_match = uuidv4();
        await pool.query(
            `INSERT INTO matches (id_match, id_usuario_1, id_usuario_2, porcentaje_compatibilidad, estado)
             VALUES (?, ?, ?, ?, 'pendiente')`,
            [id_match, req.usuario.id, targetUserId, compatibilidad]
        );

        res.status(201).json({
            success: true,
            message: 'Solicitud de match enviada',
            match: { id_match, compatibilidad },
        });

    } catch (error) {
        console.error('Error solicitando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Aceptar un match ───
router.put('/:id/aceptar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({ success: false, message: 'Match no encontrado' });
        }

        const matchData = match[0];

        // Solo el usuario que recibe la solicitud puede aceptar (id_usuario_2)
        if (matchData.id_usuario_2 !== req.usuario.id) {
            return res.status(403).json({ success: false, message: 'Solo el destinatario puede aceptar el match' });
        }

        await pool.query(
            'UPDATE matches SET estado = ? WHERE id_match = ?',
            ['aceptado', id]
        );

        // Crear una solicitud de chat entre los dos usuarios
        // Buscar una propiedad del grupo del usuario que acepta para crear el chat
        const [grupo] = await pool.query(
            `SELECT g.id_propiedad, pr.id_landlord
             FROM miembros_grupo mg
             JOIN grupos_roommates g ON mg.id_grupo = g.id_grupo
             LEFT JOIN propiedades pr ON g.id_propiedad = pr.id_propiedad
             WHERE mg.id_usuario = ? AND g.activo = TRUE`,
            [req.usuario.id]
        );

        if (grupo.length > 0 && grupo[0].id_propiedad) {
            // Crear solicitud aceptada para habilitar chat
            const id_solicitud = uuidv4();
            try {
                await pool.query(
                    `INSERT INTO solicitudes_informes (id_solicitud, id_tenant, id_propiedad, id_landlord, estado, mensaje_tenant)
                     VALUES (?, ?, ?, ?, 'aceptada', ?)`,
                    [id_solicitud, matchData.id_usuario_1, grupo[0].id_propiedad, grupo[0].id_landlord || matchData.id_usuario_2, 'Match aceptado - chat habilitado']
                );
            } catch (e) {
                // Si ya existe una solicitud para este tenant+propiedad, ignorar
                if (!e.message.includes('Duplicate entry')) {
                    console.error('Error creando solicitud de chat:', e);
                }
            }
        }

        res.json({
            success: true,
            message: 'Match aceptado exitosamente',
        });

    } catch (error) {
        console.error('Error aceptando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Rechazar un match ───
router.put('/:id/rechazar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({ success: false, message: 'Match no encontrado' });
        }

        await pool.query(
            'UPDATE matches SET estado = ? WHERE id_match = ?',
            ['rechazado', id]
        );

        res.json({
            success: true,
            message: 'Match rechazado',
        });

    } catch (error) {
        console.error('Error rechazando match:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── Calcular compatibilidad con todos los tenants (recalcular) ───
router.post('/calcular', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const [miPerfil] = await pool.query(
            `SELECT p.*, u.carrera FROM perfiles p
             JOIN usuarios u ON u.id_usuario = p.id_usuario
             WHERE p.id_usuario = ?`,
            [req.usuario.id]
        );

        if (miPerfil.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes completar tu perfil antes de buscar matches',
            });
        }

        const perfil = miPerfil[0];

        const [otrosPerfiles] = await pool.query(
            `SELECT p.*, u.nombre, u.apellido, u.id_usuario, u.carrera
       FROM perfiles p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE u.id_usuario != ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo'`,
            [req.usuario.id]
        );

        const matchesGenerados = [];

        for (const otro of otrosPerfiles) {
            const compatibilidad = calcularCompatibilidad(perfil, otro);

            if (compatibilidad >= 30) {
                const [existente] = await pool.query(
                    `SELECT id_match FROM matches
           WHERE (id_usuario_1 = ? AND id_usuario_2 = ?)
              OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
                    [req.usuario.id, otro.id_usuario, otro.id_usuario, req.usuario.id]
                );

                if (existente.length === 0) {
                    const id_match = uuidv4();
                    await pool.query(
                        `INSERT INTO matches (id_match, id_usuario_1, id_usuario_2, porcentaje_compatibilidad)
             VALUES (?, ?, ?, ?)`,
                        [id_match, req.usuario.id, otro.id_usuario, compatibilidad]
                    );

                    matchesGenerados.push({
                        id: id_match,
                        matchedUserId: otro.id_usuario,
                        matchedUserName: `${otro.nombre} ${otro.apellido}`,
                        matchedUserAvatar: (otro.nombre[0] + otro.apellido[0]).toUpperCase(),
                        compatibility: compatibilidad,
                        status: 'pendiente',
                    });
                } else {
                    await pool.query(
                        `UPDATE matches SET porcentaje_compatibilidad = ?
             WHERE id_match = ?`,
                        [compatibilidad, existente[0].id_match]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: `Se encontraron ${matchesGenerados.length} nuevos matches`,
            matchesNuevos: matchesGenerados,
        });

    } catch (error) {
        console.error('Error calculando matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ALGORITMO DE COMPATIBILIDAD
// Compara los perfiles de dos tenants y devuelve un porcentaje 0-100
// ═══════════════════════════════════════════════════════════════════
function calcularCompatibilidad(perfil1, perfil2) {
    let puntos = 0;
    let maxPuntos = 0;

    // 1. Ciudad (peso: 15 puntos)
    maxPuntos += 15;
    if (perfil1.ciudad && perfil2.ciudad) {
        if (perfil1.ciudad.toLowerCase() === perfil2.ciudad.toLowerCase()) {
            puntos += 15;
        }
    }

    // 2. Presupuesto (peso: 10 puntos)
    maxPuntos += 10;
    if (perfil1.presupuesto && perfil2.presupuesto) {
        const diff = Math.abs(perfil1.presupuesto - perfil2.presupuesto);
        const promedio = (Number(perfil1.presupuesto) + Number(perfil2.presupuesto)) / 2;
        if (promedio > 0) {
            const porcentajeDiff = diff / promedio;
            if (porcentajeDiff <= 0.1) puntos += 10;
            else if (porcentajeDiff <= 0.25) puntos += 7;
            else if (porcentajeDiff <= 0.5) puntos += 4;
        }
    }

    // 3. Horario (peso: 10 puntos)
    maxPuntos += 10;
    if (perfil1.horario && perfil2.horario) {
        if (perfil1.horario === perfil2.horario) {
            puntos += 10;
        } else if (perfil1.horario === 'Mixto' || perfil2.horario === 'Mixto') {
            puntos += 7;
        }
    }

    // 4. Limpieza (peso: 10 puntos)
    maxPuntos += 10;
    if (perfil1.limpieza && perfil2.limpieza) {
        const diff = Math.abs(perfil1.limpieza - perfil2.limpieza);
        if (diff === 0) puntos += 10;
        else if (diff === 1) puntos += 7;
        else if (diff === 2) puntos += 4;
    }

    // 5. Fumador (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.fumador === perfil2.fumador) {
        puntos += 8;
    }

    // 6. Preferencia de visitantes (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.preferencia_visitantes && perfil2.preferencia_visitantes) {
        if (perfil1.preferencia_visitantes === perfil2.preferencia_visitantes) {
            puntos += 8;
        } else {
            // Partial match
            puntos += 3;
        }
    }

    // 7. Preferencia social (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.preferencia_social && perfil2.preferencia_social) {
        const diff = Math.abs(perfil1.preferencia_social - perfil2.preferencia_social);
        if (diff === 0) puntos += 8;
        else if (diff === 1) puntos += 6;
        else if (diff === 2) puntos += 3;
    }

    // 8. Preferencia de ruido (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.preferencia_ruido && perfil2.preferencia_ruido) {
        const diff = Math.abs(perfil1.preferencia_ruido - perfil2.preferencia_ruido);
        if (diff === 0) puntos += 8;
        else if (diff === 1) puntos += 6;
        else if (diff === 2) puntos += 3;
    }

    // 9. Preferencia de mascotas (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.preferencia_mascotas && perfil2.preferencia_mascotas) {
        if (perfil1.preferencia_mascotas === perfil2.preferencia_mascotas) {
            puntos += 8;
        } else {
            // Alérgico vs tiene mascotas = 0 puntos
            const alergico = [perfil1.preferencia_mascotas, perfil2.preferencia_mascotas];
            if (alergico.includes('Soy alérgico') && alergico.includes('Me gustan')) {
                puntos += 0;
            } else if (alergico.includes('No me importan')) {
                puntos += 5;
            } else {
                puntos += 2;
            }
        }
    }

    // 10. Carrera - misma categoría (peso: 8 puntos)
    maxPuntos += 8;
    if (perfil1.carrera && perfil2.carrera) {
        const cat1 = careerCategoryMap[perfil1.carrera];
        const cat2 = careerCategoryMap[perfil2.carrera];
        if (perfil1.carrera === perfil2.carrera) {
            puntos += 8; // Misma carrera
        } else if (cat1 && cat2 && cat1 === cat2) {
            puntos += 5; // Misma categoría
        }
    }

    // 11. Hobbies en común (peso: 15 puntos)
    const hobbies1 = parseHobbies(perfil1.hobbies);
    const hobbies2 = parseHobbies(perfil2.hobbies);
    if (hobbies1.length > 0 && hobbies2.length > 0) {
        maxPuntos += 15;
        const comunes = hobbies1.filter(h => hobbies2.includes(h)).length;
        const totalUnicos = new Set([...hobbies1, ...hobbies2]).size;
        const ratio = totalUnicos > 0 ? comunes / totalUnicos : 0;
        puntos += Math.round(ratio * 15);
    }

    // Calcular porcentaje final
    if (maxPuntos === 0) return 50;
    return Math.round((puntos / maxPuntos) * 100);
}

// Funcion auxiliar para parsear hobbies de diferentes formatos
function parseHobbies(hobbies) {
    if (!hobbies) return [];
    if (Array.isArray(hobbies)) return hobbies;
    if (typeof hobbies === 'string') {
        try { return JSON.parse(hobbies); } catch { return []; }
    }
    return [];
}

// Exportar calcularCompatibilidad para uso en propiedades.js
router.calcularCompatibilidad = calcularCompatibilidad;
router.parseHobbies = parseHobbies;

module.exports = router;
