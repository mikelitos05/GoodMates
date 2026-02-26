const { v4: uuidv4 } = require('uuid');

const MOTIVO_LABELS = {
    salida_tenant: 'Salida voluntaria del inquilino',
    remocion_landlord: 'Remoción por arrendador',
};

function redondearDecimal(valor, decimales = 1) {
    const factor = 10 ** decimales;
    return Math.round(valor * factor) / factor;
}

function parsearPuntuacionDecimal(valorEntrada) {
    if (valorEntrada === null || valorEntrada === undefined || valorEntrada === '') {
        return { value: null, error: 'La puntuación es obligatoria' };
    }

    const valor = Number(valorEntrada);
    if (!Number.isFinite(valor)) {
        return { value: null, error: 'La puntuación debe ser numérica' };
    }

    const puntuacion = redondearDecimal(valor, 1);
    if (puntuacion < 1 || puntuacion > 5) {
        return { value: null, error: 'La puntuación debe estar entre 1.0 y 5.0' };
    }

    // Solo permitir 1 decimal.
    if (Math.round(valor * 10) !== valor * 10) {
        return { value: null, error: 'La puntuación solo permite un decimal (ej. 4.3)' };
    }

    return { value: puntuacion, error: null };
}

function normalizarPendiente(row) {
    if (!row) return null;
    const nombre = `${row.tenant_nombre || ''} ${row.tenant_apellido || ''}`.trim();
    return {
        id_pendiente: row.id_pendiente,
        id_tenant: row.id_tenant,
        tenant_nombre: nombre || 'Inquilino',
        id_propiedad: row.id_propiedad,
        propiedad_titulo: row.propiedad_titulo || 'Propiedad',
        motivo: row.motivo,
        motivo_label: MOTIVO_LABELS[row.motivo] || row.motivo || 'Pendiente de calificación',
        fecha_evento: row.fecha_evento,
    };
}

async function obtenerPendientesCalificacionLandlord(executor, idLandlord) {
    const [rows] = await executor.query(
        `SELECT cp.id_pendiente, cp.id_tenant, cp.id_propiedad, cp.motivo, cp.fecha_evento,
                u.nombre AS tenant_nombre, u.apellido AS tenant_apellido,
                p.titulo AS propiedad_titulo
         FROM calificaciones_pendientes cp
         JOIN usuarios u ON u.id_usuario = cp.id_tenant
         LEFT JOIN propiedades p ON p.id_propiedad = cp.id_propiedad
         WHERE cp.id_landlord = ? AND cp.estado = 'pendiente'
         ORDER BY cp.fecha_evento ASC`,
        [idLandlord]
    );

    return rows.map(normalizarPendiente);
}

async function obtenerResumenPendientesCalificacionLandlord(executor, idLandlord) {
    const pendientes = await obtenerPendientesCalificacionLandlord(executor, idLandlord);
    return {
        total: pendientes.length,
        pendientes,
    };
}

async function crearPendienteCalificacionLandlordPorEgreso(
    executor,
    { idTenant, idPropiedad, motivo = 'salida_tenant' }
) {
    if (!idTenant || !idPropiedad) return null;

    const [tenantRows] = await executor.query(
        "SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND rol = 'tenant' LIMIT 1",
        [idTenant]
    );

    if (tenantRows.length === 0) {
        return null;
    }

    const [propRows] = await executor.query(
        'SELECT id_propiedad, id_landlord FROM propiedades WHERE id_propiedad = ? LIMIT 1',
        [idPropiedad]
    );

    if (propRows.length === 0) {
        return null;
    }

    const idLandlord = propRows[0].id_landlord;
    if (!idLandlord || idLandlord === idTenant) {
        return null;
    }

    const [existente] = await executor.query(
        `SELECT id_pendiente
         FROM calificaciones_pendientes
         WHERE id_landlord = ?
           AND id_tenant = ?
           AND id_propiedad = ?
           AND estado = 'pendiente'
         LIMIT 1`,
        [idLandlord, idTenant, idPropiedad]
    );

    if (existente.length > 0) {
        return {
            id_pendiente: existente[0].id_pendiente,
            id_landlord: idLandlord,
            id_tenant: idTenant,
            id_propiedad: idPropiedad,
            motivo,
            created: false,
        };
    }

    const idPendiente = uuidv4();
    const motivoFinal = MOTIVO_LABELS[motivo] ? motivo : 'salida_tenant';

    await executor.query(
        `INSERT INTO calificaciones_pendientes
         (id_pendiente, id_landlord, id_tenant, id_propiedad, motivo, estado)
         VALUES (?, ?, ?, ?, ?, 'pendiente')`,
        [idPendiente, idLandlord, idTenant, idPropiedad, motivoFinal]
    );

    return {
        id_pendiente: idPendiente,
        id_landlord: idLandlord,
        id_tenant: idTenant,
        id_propiedad: idPropiedad,
        motivo: motivoFinal,
        created: true,
    };
}

module.exports = {
    parsearPuntuacionDecimal,
    normalizarPendiente,
    obtenerPendientesCalificacionLandlord,
    obtenerResumenPendientesCalificacionLandlord,
    crearPendienteCalificacionLandlordPorEgreso,
};
