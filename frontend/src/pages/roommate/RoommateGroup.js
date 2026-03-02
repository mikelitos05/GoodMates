import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl, getMyGroup, removeGroupMember, rateRoommate } from '../../services/api';
import RatingModal from '../../components/shared/RatingModal';
import UserAvatar from '../../components/shared/UserAvatar';
import './RoommateGroup.css';

function RoommateGroup() {
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [ratingTarget, setRatingTarget] = useState(null);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const groupRes = await getMyGroup();
        if (groupRes.success && groupRes.grupo) {
            setGroup(groupRes.grupo);
        } else {
            setGroup(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="group-page">
                <div className="container">
                    <p className="empty-state">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="group-page">
                <div className="container">
                    <div className="no-group">
                        <div className="no-group-icon">Sin grupo</div>
                        <h2>Aún no perteneces a un grupo</h2>
                        <p>Cuando un arrendador te confirme como inquilino, serás agregado automáticamente al grupo de la propiedad.</p>
                        <Link to="/tenant/properties" className="btn btn-primary btn-lg">Ver Propiedades →</Link>
                    </div>
                </div>
            </div>
        );
    }

    const members = group.miembros || [];
    const property = group.propiedad || null;
    const propTitle = property?.titulo || property?.title || '';
    const propAddress = property?.direccion || property?.address || '';
    const propCity = property?.ciudad || property?.city || '';
    const propPrice = property?.precio || property?.price || 0;
    const propertyImages = Array.isArray(property?.imagenes) ? property.imagenes : [];
    const firstPropertyImage = propertyImages.length > 0 ? getImageUrl(propertyImages[0]) : null;

    const handleLeaveGroup = async () => {
        if (!group?.id || !user?.id || leaving) return;

        const confirmLeave = window.confirm('¿Seguro que deseas salir del grupo?');
        if (!confirmLeave) return;

        setLeaving(true);
        setFeedback('');

        const result = await removeGroupMember(group.id, user.id);

        if (result.success) {
            setFeedback(result.message || 'Saliste del grupo exitosamente.');
            await fetchData();
        } else {
            setFeedback(result.error || 'No se pudo completar la operación.');
        }

        setLeaving(false);
    };

    const closeRatingModal = () => {
        if (ratingSubmitting) return;
        setRatingTarget(null);
    };

    const handleSubmitRating = async ({ puntuacion, comentario }) => {
        if (!ratingTarget?.id) return false;

        setRatingSubmitting(true);
        const result = await rateRoommate({
            id_usuario_calificado: ratingTarget.id,
            puntuacion,
            comentario,
        });
        setRatingSubmitting(false);

        if (!result.success) {
            setFeedback(result.error || 'No se pudo guardar la calificación.');
            return false;
        }

        setFeedback(result.message || 'Calificación guardada correctamente.');
        setRatingTarget(null);
        await fetchData();
        return true;
    };

    return (
        <div className="group-page">
            <div className="container">
                <div className="group-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">{group.nombre || 'Mi Grupo'}</h1>
                        <p className="section-subtitle">
                            {propTitle ? propTitle : 'Grupo de roommates'}
                            {group.fecha_creacion ? ` · Creado el ${group.fecha_creacion.split('T')[0]}` : ''}
                        </p>
                        {feedback && (
                            <p className="section-subtitle" style={{ marginTop: '8px' }}>
                                {feedback}
                            </p>
                        )}
                    </div>
                    <button className="btn btn-danger" onClick={handleLeaveGroup} disabled={leaving}>
                        {leaving ? 'Saliendo...' : 'Salir del Grupo'}
                    </button>
                </div>
                <div className="group-grid animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="group-card">
                        <h2 className="group-card-title">Miembros ({members.length})</h2>
                        <div className="members-list">
                            {members.map((member) => {
                                const memberId = member.id;
                                const fullName = member.nombre || '';
                                const initials = member.avatar || (fullName[0] || '??');
                                const memberPhoto = member.profileImage || member.foto_perfil || null;
                                const promedioRaw = member.calificacionPromedio !== null && member.calificacionPromedio !== undefined
                                    ? Number(member.calificacionPromedio)
                                    : null;
                                const calificacionPromedio = Number.isFinite(promedioRaw) ? promedioRaw : null;
                                const totalCalificaciones = Number(member.totalCalificaciones || 0);
                                const miRaw = member.miCalificacion !== null && member.miCalificacion !== undefined
                                    ? Number(member.miCalificacion)
                                    : null;
                                const miCalificacion = Number.isFinite(miRaw) ? miRaw : null;
                                return (
                                    <div key={memberId} className="member-card">
                                        <UserAvatar
                                            className="avatar-lg"
                                            name={fullName}
                                            initials={initials}
                                            image={memberPhoto}
                                        />
                                        <div className="member-info">
                                            <h3 className="member-name">
                                                {fullName} {memberId === user?.id && <span className="you-badge">(Tú)</span>}
                                            </h3>
                                            <p className="member-detail">{member.rol === 'creador' ? 'Creador del grupo' : 'Miembro'}</p>
                                            <p className="member-rating">
                                                {calificacionPromedio !== null && calificacionPromedio !== undefined
                                                    ? `Calificación promedio: ${Number(calificacionPromedio).toFixed(1)} (${totalCalificaciones})`
                                                    : 'Calificación promedio: Sin calificaciones'}
                                            </p>
                                            {memberId !== user?.id && (
                                                <div className="member-rating-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => setRatingTarget({
                                                            id: memberId,
                                                            nombre: fullName,
                                                            miCalificacion,
                                                        })}
                                                    >
                                                        {miCalificacion !== null && miCalificacion !== undefined
                                                            ? 'Editar mi calificación'
                                                            : 'Calificar'}
                                                    </button>
                                                    {miCalificacion !== null && miCalificacion !== undefined && (
                                                        <span className="member-my-rating">Tu calificación: {Number(miCalificacion).toFixed(1)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>


                    <div className="group-actions-card">
                        <h2 className="group-card-title">Herramientas</h2>
                        <div className="group-tools">
                            <Link to="/roommate/tasks" className="group-tool-card">
                                <span className="tool-icon">Tareas</span>
                                <div>
                                    <h3 className="tool-title">Task Manager</h3>
                                    <p className="tool-desc">Organiza las tareas del hogar</p>
                                </div>
                                <span className="tool-arrow">→</span>
                            </Link>
                            <Link to="/roommate/board" className="group-tool-card">
                                <span className="tool-icon">Board</span>
                                <div>
                                    <h3 className="tool-title">Mates Board</h3>
                                    <p className="tool-desc">Avisos y comunicación</p>
                                </div>
                                <span className="tool-arrow">→</span>
                            </Link>
                        </div>

                        {property && (
                            <div className="group-property-preview">
                                <h3 className="group-card-title" style={{ marginTop: 'var(--space-6)' }}>Nuestra Propiedad</h3>
                                <div className="property-mini-card">
                                    <div className="mini-card-image">
                                        {firstPropertyImage ? (
                                            <img
                                                src={firstPropertyImage}
                                                alt={propTitle || 'Propiedad'}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                                            />
                                        ) : (
                                            'Sin imagen'
                                        )}
                                    </div>
                                    <div>
                                        <p className="mini-card-title">{propTitle}</p>
                                        <p className="mini-card-location">{propAddress}{propAddress && propCity ? ', ' : ''}{propCity}</p>
                                        {propPrice > 0 && <p className="mini-card-price">${propPrice.toLocaleString()}/mes</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <RatingModal
                isOpen={!!ratingTarget}
                title="Calificar roommate"
                subjectName={ratingTarget?.nombre || 'roommate'}
                initialScore={ratingTarget?.miCalificacion ?? ''}
                submitting={ratingSubmitting}
                submitLabel={ratingTarget?.miCalificacion !== null && ratingTarget?.miCalificacion !== undefined
                    ? 'Actualizar calificación'
                    : 'Guardar calificación'}
                onClose={closeRatingModal}
                onSubmit={handleSubmitRating}
            />
        </div>
    );
}

export default RoommateGroup;
