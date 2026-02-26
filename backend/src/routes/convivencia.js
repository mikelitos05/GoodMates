const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const {
    getTenantConvivenciaContext,
    validarActivacionModoBusqueda,
    enviarErrorRegla,
} = require('../services/convivenciaRules');

// Obtener el estado de convivencia del tenant autenticado.
router.get('/estado', verificarToken, verificarRol('tenant'), async (req, res) => {
    try {
        const contexto = await getTenantConvivenciaContext(pool, req.usuario.id);

        res.json({
            success: true,
            convivenciaActiva: contexto.convivenciaActiva,
            idGrupo: contexto.idGrupo,
            idPropiedad: contexto.idPropiedad,
            fechaInicioConvivencia: contexto.fechaInicioConvivencia,
            mesesMinimosRequeridos: contexto.mesesMinimosRequeridos,
            fechaHabilitadaBusqueda: contexto.fechaHabilitadaBusqueda,
            cumplePermanenciaMinima: contexto.cumplePermanenciaMinima,
            modoBusquedaActivo: contexto.modoBusquedaActivo,
            trasladoPendiente: contexto.trasladoPendiente,
            idSolicitudTrasladoPendiente: contexto.idSolicitudTrasladoPendiente,
        });
    } catch (error) {
        console.error('Error obteniendo estado de convivencia:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    }
});

// Activar o desactivar el modo busqueda del tenant.
router.put('/modo-busqueda', verificarToken, verificarRol('tenant'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo activo debe ser booleano',
            });
        }

        await connection.beginTransaction();

        const contexto = await getTenantConvivenciaContext(connection, req.usuario.id, {
            forUpdateUser: true,
            forUpdateMembership: true,
        });

        if (activo) {
            validarActivacionModoBusqueda(contexto);
        }

        await connection.query(
            `UPDATE usuarios
             SET modo_busqueda_activo = ?,
                 fecha_activacion_busqueda = ?
             WHERE id_usuario = ?`,
            [activo, activo ? new Date() : null, req.usuario.id]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: activo
                ? 'Modo busqueda activado correctamente'
                : 'Modo busqueda desactivado correctamente',
            modoBusquedaActivo: activo,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error actualizando modo busqueda:', error);
        return enviarErrorRegla(res, error, 'Error interno del servidor');
    } finally {
        connection.release();
    }
});

module.exports = router;
