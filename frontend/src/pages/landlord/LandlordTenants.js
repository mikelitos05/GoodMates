import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getMyProperties,
    getPendingRatings,
    getPropertyTenants,
    omitPendingRating,
    rateRoommate,
    removePropertyTenant,
} from '../../services/api';
import RatingModal from '../../components/shared/RatingModal';
import './LandlordTenants.css';

function LandlordTenants() {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [tenants, setTenants] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [loadingPending, setLoadingPending] = useState(true);
    const [feedback, setFeedback] = useState(null);
    const [pendingRatings, setPendingRatings] = useState([]);
    const [ratingTargetPending, setRatingTargetPending] = useState(null);
    const [submittingRating, setSubmittingRating] = useState(false);

    const selectedProperty = useMemo(
        () => properties.find((p) => (p.id_propiedad || p.id) === selectedPropertyId) || null,
        [properties, selectedPropertyId]
    );

    const hasPendingRatings = pendingRatings.length > 0;

    const fetchPendingRatings = async () => {
        setLoadingPending(true);
        const result = await getPendingRatings();
        if (result.success) {
            setPendingRatings(result.pendientes || []);
            setLoadingPending(false);
            return result.pendientes || [];
        }
        setLoadingPending(false);
        setPendingRatings([]);
        setFeedback({ type: 'error', text: result.error || 'No se pudieron cargar los pendientes de calificación.' });
        return [];
    };

    useEffect(() => {
        const fetchProperties = async () => {
            setLoadingProperties(true);
            const result = await getMyProperties();
            if (result.success) {
                const props = result.propiedades || [];
                setProperties(props);
                if (props.length > 0) {
                    const firstId = props[0].id_propiedad || props[0].id;
                    setSelectedPropertyId(firstId);
                }
            } else {
                setFeedback({ type: 'error', text: result.error || 'No se pudieron cargar tus propiedades.' });
            }
            setLoadingProperties(false);
        };
        fetchProperties();
        fetchPendingRatings();
    }, []);

    useEffect(() => {
        if (!selectedPropertyId) {
            setTenants([]);
            return;
        }

        const fetchTenants = async () => {
            setLoadingTenants(true);
            const result = await getPropertyTenants(selectedPropertyId);
            if (result.success) {
                setTenants(result.inquilinos || []);
            } else {
                setTenants([]);
                setFeedback({ type: 'error', text: result.error || 'No se pudieron cargar los inquilinos.' });
            }
            setLoadingTenants(false);
        };
        fetchTenants();
    }, [selectedPropertyId]);

    const handleRemoveTenant = async (tenant) => {
        if (!selectedPropertyId) return;
        if (hasPendingRatings) {
            setFeedback({
                type: 'error',
                text: 'Debes resolver tus calificaciones pendientes antes de remover otro inquilino.',
            });
            return;
        }

        const fullName = `${tenant.nombre || ''} ${tenant.apellido || ''}`.trim() || 'este inquilino';
        const confirmRemove = window.confirm(`¿Seguro que deseas sacar a ${fullName} de la propiedad?`);
        if (!confirmRemove) return;

        const result = await removePropertyTenant(selectedPropertyId, tenant.id_usuario);
        if (result.success) {
            setTenants((prev) => prev.filter((t) => t.id_usuario !== tenant.id_usuario));
            setFeedback({ type: 'success', text: result.message || 'Inquilino removido exitosamente.' });
            const nuevosPendientes = await fetchPendingRatings();
            const idPendienteCreado = result.pendiente_calificacion?.id_pendiente;
            if (idPendienteCreado) {
                const pendienteCreado = nuevosPendientes.find((p) => p.id_pendiente === idPendienteCreado);
                if (pendienteCreado) {
                    setRatingTargetPending(pendienteCreado);
                }
            }
        } else {
            if (result.code === 'LANDLORD_PENDING_RATINGS' && result.pending_ratings?.pendientes) {
                setPendingRatings(result.pending_ratings.pendientes);
            }
            setFeedback({ type: 'error', text: result.error || 'No se pudo remover al inquilino.' });
        }
    };

    const handleRatePending = async ({ puntuacion, comentario }) => {
        if (!ratingTargetPending?.id_pendiente) return false;

        setSubmittingRating(true);
        const result = await rateRoommate({
            id_pendiente: ratingTargetPending.id_pendiente,
            puntuacion,
            comentario,
        });
        setSubmittingRating(false);

        if (!result.success) {
            setFeedback({ type: 'error', text: result.error || 'No se pudo registrar la calificación.' });
            return false;
        }

        setFeedback({ type: 'success', text: result.message || 'Calificación registrada correctamente.' });
        setRatingTargetPending(null);
        await fetchPendingRatings();
        return true;
    };

    const handleOmitPending = async (pending) => {
        const motivo = window.prompt(`Escribe el motivo para omitir la calificación de ${pending.tenant_nombre}:`);
        if (!motivo) return;

        const result = await omitPendingRating(pending.id_pendiente, motivo);
        if (!result.success) {
            setFeedback({ type: 'error', text: result.error || 'No se pudo omitir el pendiente.' });
            return;
        }

        setFeedback({ type: 'success', text: result.message || 'Pendiente omitido correctamente.' });
        await fetchPendingRatings();
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'Sin fecha';
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
        return parsed.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="landlord-tenants-page">
            <div className="container">
                <div className="landlord-tenants-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Gestión de Inquilinos</h1>
                        <p className="section-subtitle">
                            Administra inquilinos activos por propiedad, abre chat y remueve miembros cuando sea necesario.
                        </p>
                    </div>
                </div>

                {feedback && (
                    <div className={`landlord-tenants-alert landlord-tenants-alert--${feedback.type}`}>
                        {feedback.text}
                    </div>
                )}

                <div className="landlord-pending-panel animate-fade-in-up">
                    <div className="landlord-pending-header">
                        <h2>Calificaciones pendientes obligatorias</h2>
                        <span className={`landlord-pending-count ${hasPendingRatings ? 'is-active' : ''}`}>
                            {loadingPending ? 'Cargando...' : `${pendingRatings.length} pendiente${pendingRatings.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                    {loadingPending ? (
                        <p className="empty-state">Cargando pendientes...</p>
                    ) : pendingRatings.length === 0 ? (
                        <p className="empty-state">Sin pendientes de calificación.</p>
                    ) : (
                        <div className="landlord-pending-list">
                            {pendingRatings.map((pending) => (
                                <div key={pending.id_pendiente} className="landlord-pending-item">
                                    <div>
                                        <p className="landlord-pending-title">{pending.tenant_nombre}</p>
                                        <p className="landlord-pending-meta">
                                            {pending.propiedad_titulo} · {pending.motivo_label} · {formatDate(pending.fecha_evento)}
                                        </p>
                                    </div>
                                    <div className="landlord-pending-actions">
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setRatingTargetPending(pending)}
                                        >
                                            Calificar ahora
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleOmitPending(pending)}
                                        >
                                            Omitir con motivo
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="landlord-tenants-filter animate-fade-in-up">
                    <label htmlFor="propertySelect">Propiedad</label>
                    <select
                        id="propertySelect"
                        className="form-select"
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        disabled={loadingProperties || properties.length === 0}
                    >
                        {properties.length === 0 && <option value="">No tienes propiedades disponibles</option>}
                        {properties.map((property) => {
                            const id = property.id_propiedad || property.id;
                            const title = property.titulo || property.title || 'Propiedad sin titulo';
                            const city = property.ciudad || property.city || 'Sin ciudad';
                            return (
                                <option key={id} value={id}>
                                    {title} - {city}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="landlord-tenants-list animate-fade-in-up">
                    {loadingProperties || loadingTenants ? (
                        <p className="empty-state">Cargando inquilinos...</p>
                    ) : !selectedProperty ? (
                        <p className="empty-state">No hay propiedad seleccionada.</p>
                    ) : tenants.length === 0 ? (
                        <div className="no-results">
                            <h3>Sin inquilinos activos</h3>
                            <p>Esta propiedad no tiene inquilinos activos en este momento.</p>
                        </div>
                    ) : (
                        tenants.map((tenant) => {
                            const fullName = `${tenant.nombre || ''} ${tenant.apellido || ''}`.trim();
                            const initials = `${tenant.nombre?.[0] || ''}${tenant.apellido?.[0] || ''}` || 'IN';
                            const ratingRaw = tenant.calificacion_promedio !== null && tenant.calificacion_promedio !== undefined
                                ? Number(tenant.calificacion_promedio)
                                : null;
                            const ratingPromedio = Number.isFinite(ratingRaw) ? ratingRaw : null;
                            return (
                                <div key={tenant.id_usuario} className="landlord-tenant-card">
                                    <div className="landlord-tenant-main">
                                        <div className="avatar avatar-lg">{initials.toUpperCase()}</div>
                                        <div>
                                            <h3 className="landlord-tenant-name">{fullName}</h3>
                                            <p className="landlord-tenant-email">{tenant.email}</p>
                                            <p className="landlord-tenant-meta">
                                                Rol: {tenant.rol_en_grupo === 'creador' ? 'Creador' : 'Miembro'} ·
                                                Desde: {formatDate(tenant.fecha_union)}
                                            </p>
                                            <p className="landlord-tenant-meta">
                                                Reputación: {ratingPromedio !== null
                                                    ? `${ratingPromedio.toFixed(1)} (${Number(tenant.total_calificaciones || 0)})`
                                                    : 'Sin calificaciones'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="landlord-tenant-actions">
                                        <button
                                            className="btn btn-accent btn-sm"
                                            onClick={() => tenant.id_solicitud_chat && navigate(`/chat/${tenant.id_solicitud_chat}`)}
                                            disabled={!tenant.id_solicitud_chat}
                                        >
                                            Ir al chat
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleRemoveTenant(tenant)}
                                            disabled={hasPendingRatings}
                                            title={hasPendingRatings
                                                ? 'Resuelve primero las calificaciones pendientes'
                                                : 'Sacar inquilino'}
                                        >
                                            Sacar inquilino
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <RatingModal
                isOpen={!!ratingTargetPending}
                title="Calificar inquilino"
                subjectName={ratingTargetPending?.tenant_nombre || 'inquilino'}
                submitting={submittingRating}
                submitLabel="Guardar calificación"
                onClose={() => {
                    if (!submittingRating) setRatingTargetPending(null);
                }}
                onSubmit={handleRatePending}
            />
        </div>
    );
}

export default LandlordTenants;
