const DEFAULT_MIN_STAY_MONTHS = Number.parseInt(process.env.TENANT_MIN_STAY_MONTHS, 10) || 3;

function construirErrorRegla(code, message, status = 409) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function toDateSafe(value) {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
}

function addMonthsSafe(dateValue, months) {
    const date = toDateSafe(dateValue);
    if (!date) return null;

    const original = new Date(date);
    const day = original.getDate();
    original.setMonth(original.getMonth() + months);

    // Ajustar fin de mes para no saltar al mes siguiente en fechas limite.
    if (original.getDate() < day) {
        original.setDate(0);
    }

    return original;
}

function esPermanenciaCumplida(fechaUnion, mesesMinimos) {
    if (!fechaUnion || !Number.isFinite(mesesMinimos) || mesesMinimos <= 0) {
        return { cumple: true, fechaHabilitada: null };
    }

    const fechaHabilitada = addMonthsSafe(fechaUnion, mesesMinimos);
    if (!fechaHabilitada) {
        return { cumple: true, fechaHabilitada: null };
    }

    return {
        cumple: new Date() >= fechaHabilitada,
        fechaHabilitada,
    };
}

async function getTenantConvivenciaContext(executor, tenantId, options = {}) {
    const { forUpdateUser = false, forUpdateMembership = false } = options;

    const userLockClause = forUpdateUser ? ' FOR UPDATE' : '';
    const membershipLockClause = forUpdateMembership ? ' FOR UPDATE' : '';

    const [userRows] = await executor.query(
        `SELECT id_usuario, modo_busqueda_activo, fecha_activacion_busqueda, id_solicitud_traslado_pendiente
         FROM usuarios
         WHERE id_usuario = ?${userLockClause}`,
        [tenantId]
    );

    if (userRows.length === 0) {
        throw construirErrorRegla('TENANT_NOT_FOUND', 'El tenant no existe', 404);
    }

    const [activeGroups] = await executor.query(
        `SELECT g.id_grupo, g.id_propiedad, mg.fecha_union, p.min_meses_permanencia
         FROM miembros_grupo mg
         JOIN grupos_roommates g ON g.id_grupo = mg.id_grupo
         LEFT JOIN propiedades p ON p.id_propiedad = g.id_propiedad
         WHERE mg.id_usuario = ? AND g.activo = TRUE
         ORDER BY mg.fecha_union ASC${membershipLockClause}`,
        [tenantId]
    );

    const user = userRows[0];
    const group = activeGroups[0] || null;
    const convivenciaActiva = !!group;

    const mesesMinimosRequeridos = convivenciaActiva
        ? (group.min_meses_permanencia ?? DEFAULT_MIN_STAY_MONTHS)
        : DEFAULT_MIN_STAY_MONTHS;

    const permanencia = esPermanenciaCumplida(group?.fecha_union || null, Number(mesesMinimosRequeridos));

    return {
        tenantId,
        convivenciaActiva,
        activeGroupCount: activeGroups.length,
        idGrupo: group?.id_grupo || null,
        idPropiedad: group?.id_propiedad || null,
        fechaInicioConvivencia: group?.fecha_union || null,
        mesesMinimosRequeridos: Number(mesesMinimosRequeridos),
        fechaHabilitadaBusqueda: permanencia.fechaHabilitada,
        cumplePermanenciaMinima: permanencia.cumple,
        modoBusquedaActivo: !!user.modo_busqueda_activo,
        fechaActivacionBusqueda: user.fecha_activacion_busqueda || null,
        trasladoPendiente: !!user.id_solicitud_traslado_pendiente,
        idSolicitudTrasladoPendiente: user.id_solicitud_traslado_pendiente || null,
    };
}

function validarConsistenciaConvivenciaActiva(contexto) {
    if (contexto.activeGroupCount > 1) {
        throw construirErrorRegla(
            'ACTIVE_CONVIVENCIA_EXISTS',
            'El tenant tiene mas de una convivencia activa y requiere revision administrativa',
            409
        );
    }
}

function validarActivacionModoBusqueda(contexto) {
    validarConsistenciaConvivenciaActiva(contexto);
}

function validarEnvioSolicitud(contexto) {
    validarConsistenciaConvivenciaActiva(contexto);
}

function validarAceptacionMatch(contexto) {
    validarConsistenciaConvivenciaActiva(contexto);
}

function validarUnionAConvivenciaActiva(contexto) {
    validarConsistenciaConvivenciaActiva(contexto);

    if (contexto.convivenciaActiva) {
        throw construirErrorRegla(
            'ACTIVE_CONVIVENCIA_EXISTS',
            'El tenant ya tiene una convivencia activa',
            409
        );
    }
}

async function contarInquilinosActivosEnPropiedad(executor, propertyId) {
    const [rows] = await executor.query(
        `SELECT COUNT(DISTINCT mg.id_usuario) AS total
         FROM grupos_roommates g
         JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
         WHERE g.id_propiedad = ? AND g.activo = TRUE`,
        [propertyId]
    );

    return Number(rows[0]?.total || 0);
}

async function removerTenantDeConvivenciaActiva(
    connection,
    { idGrupo, idTenant, incrementarDisponibilidad = true }
) {
    const [grupoRows] = await connection.query(
        `SELECT g.id_grupo, g.id_propiedad, g.activo
         FROM grupos_roommates g
         WHERE g.id_grupo = ?
         FOR UPDATE`,
        [idGrupo]
    );

    if (grupoRows.length === 0) {
        throw construirErrorRegla('GROUP_NOT_FOUND', 'El grupo no existe', 404);
    }

    const grupo = grupoRows[0];

    const [membresiaRows] = await connection.query(
        `SELECT id_miembro, rol_en_grupo
         FROM miembros_grupo
         WHERE id_grupo = ? AND id_usuario = ?
         FOR UPDATE`,
        [idGrupo, idTenant]
    );

    if (membresiaRows.length === 0) {
        throw construirErrorRegla('MEMBER_NOT_FOUND', 'El tenant no pertenece al grupo indicado', 404);
    }

    const eraCreador = membresiaRows[0].rol_en_grupo === 'creador';

    await connection.query(
        'DELETE FROM miembros_grupo WHERE id_grupo = ? AND id_usuario = ?',
        [idGrupo, idTenant]
    );

    const [miembrosRestantes] = await connection.query(
        `SELECT id_usuario, rol_en_grupo
         FROM miembros_grupo
         WHERE id_grupo = ?
         ORDER BY fecha_union ASC
         FOR UPDATE`,
        [idGrupo]
    );

    let grupoInactivado = false;
    let nuevoCreadorId = null;

    if (miembrosRestantes.length === 0) {
        await connection.query(
            'UPDATE grupos_roommates SET activo = FALSE WHERE id_grupo = ?',
            [idGrupo]
        );
        grupoInactivado = true;
    } else if (eraCreador) {
        nuevoCreadorId = miembrosRestantes[0].id_usuario;

        if (miembrosRestantes[0].rol_en_grupo !== 'creador') {
            await connection.query(
                `UPDATE miembros_grupo
                 SET rol_en_grupo = 'creador'
                 WHERE id_grupo = ? AND id_usuario = ?`,
                [idGrupo, nuevoCreadorId]
            );
        }
    }

    let disponibilidadActualizada = false;
    if (incrementarDisponibilidad && grupo.id_propiedad) {
        await connection.query(
            `UPDATE propiedades
             SET habitaciones_disponibles = LEAST(habitaciones, habitaciones_disponibles + 1)
             WHERE id_propiedad = ?`,
            [grupo.id_propiedad]
        );
        disponibilidadActualizada = true;
    }

    return {
        idGrupo,
        idPropiedad: grupo.id_propiedad || null,
        eraCreador,
        nuevoCreadorId,
        grupoInactivado,
        miembrosRestantes: miembrosRestantes.length,
        disponibilidadActualizada,
        grupoActivoAntes: !!grupo.activo,
    };
}

function enviarErrorRegla(res, error, fallbackMessage = 'Error de validacion de convivencia') {
    if (error && error.code && error.status) {
        return res.status(error.status).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: fallbackMessage,
    });
}

module.exports = {
    DEFAULT_MIN_STAY_MONTHS,
    construirErrorRegla,
    getTenantConvivenciaContext,
    validarConsistenciaConvivenciaActiva,
    validarActivacionModoBusqueda,
    validarEnvioSolicitud,
    validarAceptacionMatch,
    validarUnionAConvivenciaActiva,
    contarInquilinosActivosEnPropiedad,
    removerTenantDeConvivenciaActiva,
    enviarErrorRegla,
};
