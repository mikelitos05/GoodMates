const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// Obtener los matches del tenant autenticado
router.get('/', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        // Buscar matches donde el usuario sea participante
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

        // Formatear los resultados para mostrar solo los datos del otro usuario
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

// Calcular compatibilidad con todos los tenants y generar matches
router.post('/calcular', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        // Obtener el perfil del usuario actual
        const [miPerfil] = await pool.query(
            'SELECT * FROM perfiles WHERE id_usuario = ?',
            [req.usuario.id]
        );

        if (miPerfil.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes completar tu perfil antes de buscar matches',
            });
        }

        const perfil = miPerfil[0];

        // Obtener todos los perfiles de otros tenants activos
        const [otrosPerfiles] = await pool.query(
            `SELECT p.*, u.nombre, u.apellido, u.id_usuario
       FROM perfiles p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE u.id_usuario != ? AND u.rol = 'tenant' AND u.estado_cuenta = 'activo'`,
            [req.usuario.id]
        );

        const matchesGenerados = [];

        for (const otro of otrosPerfiles) {
            // Calcular el indice de compatibilidad
            const compatibilidad = calcularCompatibilidad(perfil, otro);

            // Solo generar match si la compatibilidad es mayor al 30%
            if (compatibilidad >= 30) {
                // Verificar si ya existe un match entre estos dos usuarios
                const [existente] = await pool.query(
                    `SELECT id_match FROM matches
           WHERE (id_usuario_1 = ? AND id_usuario_2 = ?)
              OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
                    [req.usuario.id, otro.id_usuario, otro.id_usuario, req.usuario.id]
                );

                if (existente.length === 0) {
                    // Crear nuevo match
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
                    // Actualizar compatibilidad si ya existe
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

// Aceptar un match
router.put('/:id/aceptar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el match existe y pertenece al usuario
        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match no encontrado',
            });
        }

        // Actualizar el estado del match
        await pool.query(
            'UPDATE matches SET estado = ? WHERE id_match = ?',
            ['aceptado', id]
        );

        res.json({
            success: true,
            message: 'Match aceptado exitosamente',
        });

    } catch (error) {
        console.error('Error aceptando match:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Rechazar un match
router.put('/:id/rechazar', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el match existe y pertenece al usuario
        const [match] = await pool.query(
            'SELECT * FROM matches WHERE id_match = ? AND (id_usuario_1 = ? OR id_usuario_2 = ?)',
            [id, req.usuario.id, req.usuario.id]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match no encontrado',
            });
        }

        // Actualizar el estado del match
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
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});

// Algoritmo de compatibilidad basado en puntos con pesos configurables
// Compara los perfiles de dos tenants y devuelve un porcentaje de 0 a 100
function calcularCompatibilidad(perfil1, perfil2) {
    let puntos = 0;
    let maxPuntos = 0;

    // 1. Ciudad (peso: 20 puntos) - Misma ciudad es importante para compartir vivienda
    maxPuntos += 20;
    if (perfil1.ciudad && perfil2.ciudad) {
        if (perfil1.ciudad.toLowerCase() === perfil2.ciudad.toLowerCase()) {
            puntos += 20;
        }
    }

    // 2. Presupuesto (peso: 15 puntos) - Rango similar de presupuesto
    maxPuntos += 15;
    if (perfil1.presupuesto && perfil2.presupuesto) {
        const diff = Math.abs(perfil1.presupuesto - perfil2.presupuesto);
        const promedio = (perfil1.presupuesto + perfil2.presupuesto) / 2;
        if (promedio > 0) {
            const porcentajeDiff = diff / promedio;
            if (porcentajeDiff <= 0.1) puntos += 15;      // Dentro del 10%
            else if (porcentajeDiff <= 0.25) puntos += 10; // Dentro del 25%
            else if (porcentajeDiff <= 0.5) puntos += 5;   // Dentro del 50%
        }
    }

    // 3. Horario (peso: 15 puntos) - Horarios compatibles
    maxPuntos += 15;
    if (perfil1.horario && perfil2.horario) {
        if (perfil1.horario === perfil2.horario) {
            puntos += 15;
        } else if (perfil1.horario === 'Mixto' || perfil2.horario === 'Mixto') {
            puntos += 10;
        }
    }

    // 4. Limpieza (peso: 15 puntos) - Nivel de limpieza similar
    maxPuntos += 15;
    if (perfil1.limpieza && perfil2.limpieza) {
        const diff = Math.abs(perfil1.limpieza - perfil2.limpieza);
        if (diff === 0) puntos += 15;
        else if (diff === 1) puntos += 10;
        else if (diff === 2) puntos += 5;
    }

    // 5. Ruido (peso: 10 puntos) - Tolerancia al ruido similar
    maxPuntos += 10;
    if (perfil1.ruido && perfil2.ruido) {
        const diff = Math.abs(perfil1.ruido - perfil2.ruido);
        if (diff === 0) puntos += 10;
        else if (diff === 1) puntos += 7;
        else if (diff === 2) puntos += 3;
    }

    // 6. Mascotas (peso: 10 puntos) - Compatibilidad con mascotas
    maxPuntos += 10;
    if (perfil1.mascotas === perfil2.mascotas) {
        puntos += 10;
    }

    // 7. Fumador (peso: 10 puntos) - Compatibilidad con fumadores
    maxPuntos += 10;
    if (perfil1.fumador === perfil2.fumador) {
        puntos += 10;
    }

    // 8. Visitantes (peso: 5 puntos) - Frecuencia de visitantes similar
    maxPuntos += 5;
    if (perfil1.visitantes && perfil2.visitantes) {
        if (perfil1.visitantes === perfil2.visitantes) {
            puntos += 5;
        }
    }

    // 9. Hobbies en comun (peso: bonus hasta 10 puntos adicionales)
    const hobbies1 = parseHobbies(perfil1.hobbies);
    const hobbies2 = parseHobbies(perfil2.hobbies);
    if (hobbies1.length > 0 && hobbies2.length > 0) {
        const comunes = hobbies1.filter(h => hobbies2.includes(h)).length;
        const bonusHobbies = Math.min(comunes * 2, 10);
        puntos += bonusHobbies;
        maxPuntos += 10;
    }

    // Calcular porcentaje final
    if (maxPuntos === 0) return 50; // Si no hay datos suficientes, devolver 50%
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

module.exports = router;
