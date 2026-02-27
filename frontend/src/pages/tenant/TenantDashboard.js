import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRatings, getMatches, getMyGroup, getTenantPendingLandlordRatings, rateRoommate } from '../../services/api';
import RatingModal from '../../components/shared/RatingModal';
import './TenantDashboard.css';

function TenantDashboard() {
    const { user } = useAuth();
    const [reputacion, setReputacion] = useState(null);
    const [matches, setMatches] = useState([]);
    const [group, setGroup] = useState(null);
    const [pendingLandlordRatings, setPendingLandlordRatings] = useState([]);
    const [ratingTargetPendingLandlord, setRatingTargetPendingLandlord] = useState(null);
    const [submittingPendingRating, setSubmittingPendingRating] = useState(false);

    const normalizeMatch = (m) => ({
        ...m,
        id_match: m.id_match || m.id || null,
        estado: m.estado || m.status || 'pendiente',
        porcentaje_compatibilidad: m.porcentaje_compatibilidad ?? m.compatibility ?? 0,
        usuario_nombre: m.usuario_nombre || m.matchedUserName || 'Usuario',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;

            const [ratingsRes, matchesRes, groupRes] = await Promise.all([
                getUserRatings(user.id),
                getMatches(),
                getMyGroup(),
            ]);

            if (ratingsRes.success) setReputacion(ratingsRes.reputacion);
            if (matchesRes.success) {
                setMatches((matchesRes.matches || []).map(normalizeMatch));
            }
            if (groupRes.success) setGroup(groupRes.grupo || null);

            const tenantPendingRes = await getTenantPendingLandlordRatings();
            if (tenantPendingRes.success) {
                setPendingLandlordRatings(tenantPendingRes.pendientes || []);
            }
        };
        fetchData();
    }, [user?.id]);

    const pendingMatches = matches.filter((m) => m.estado === 'pendiente');

    const refreshPendingLandlordRatings = async () => {
        const tenantPendingRes = await getTenantPendingLandlordRatings();
        if (tenantPendingRes.success) {
            setPendingLandlordRatings(tenantPendingRes.pendientes || []);
            return tenantPendingRes.pendientes || [];
        }
        return [];
    };

    const handleRatePendingLandlord = async ({ puntuacion, comentario }) => {
        if (!ratingTargetPendingLandlord?.id_pendiente) return false;

        setSubmittingPendingRating(true);
        const result = await rateRoommate({
            id_pendiente: ratingTargetPendingLandlord.id_pendiente,
            puntuacion,
            comentario,
        });
        setSubmittingPendingRating(false);

        if (!result.success) {
            alert(result.error || 'No se pudo registrar la calificación.');
            return false;
        }

        setRatingTargetPendingLandlord(null);
        await refreshPendingLandlordRatings();
        return true;
    };

    return (
        <div className="dashboard-page">
            <div className="container">

                <div className="dashboard-welcome animate-fade-in-up">
                    <div className="welcome-text">
                        <h1 className="welcome-title">
                            ¡Hola, <span className="text-gradient">{user.nombre || user.username || ''}</span>!
                        </h1>
                        <p className="welcome-subtitle">
                            Bienvenido a tu panel de GoodMates. Aquí tienes un resumen de tu actividad.
                        </p>
                    </div>
                    <Link to="/tenant/profile" className="btn btn-outline">
                        Editar Perfil
                    </Link>
                </div>


                <div className="dashboard-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="stat-card">
                        <div className="stat-icon">Matches</div>
                        <div className="stat-value">{pendingMatches.length}</div>
                        <div className="stat-label">Matches Pendientes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Tareas</div>
                        <div className="stat-value">0</div>
                        <div className="stat-label">Tareas Pendientes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Grupo</div>
                        <div className="stat-value">{group?.miembros?.length || 0}</div>
                        <div className="stat-label">Roommates</div>
                    </div>
                    <Link to="/tenant/profile?section=reputation" className="stat-card stat-card-link">
                        <div className="stat-icon">Rep.</div>
                        <div className="stat-value">{reputacion?.promedio_general ?? 'N/A'}</div>
                        <div className="stat-label">Reputación{reputacion?.total_calificaciones ? ` (${reputacion.total_calificaciones})` : ''}</div>
                    </Link>
                </div>

                <div className="dashboard-grid animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2 className="dashboard-card-title">Matches Recientes</h2>
                            <Link to="/tenant/matches" className="btn btn-ghost btn-sm">Ver todos →</Link>
                        </div>
                        <div className="dashboard-card-body">
                            {pendingMatches.length > 0 ? (
                                <div className="match-preview-list">
                                    {pendingMatches.slice(0, 3).map((match) => {
                                        const nombre = match.usuario_nombre || 'Usuario';
                                        const avatar = nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        return (
                                            <div key={match.id_match} className="match-preview-item">
                                                <div className="avatar">{avatar}</div>
                                                <div className="match-preview-info">
                                                    <p className="match-preview-name">{nombre}</p>
                                                    <p className="match-preview-detail">Compatibilidad</p>
                                                </div>
                                                <div className="match-compatibility">
                                                    <span className="compatibility-score">{match.porcentaje_compatibilidad}%</span>
                                                    <div className="progress-bar" style={{ width: '60px' }}>
                                                        <div className="progress-fill" style={{ width: `${match.porcentaje_compatibilidad}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="empty-state">No tienes matches pendientes</p>
                            )}
                        </div>
                    </div>


                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2 className="dashboard-card-title">Mis Tareas</h2>
                            <Link to="/roommate/tasks" className="btn btn-ghost btn-sm">Ver todas →</Link>
                        </div>
                        <div className="dashboard-card-body">
                            <p className="empty-state">No tienes tareas pendientes</p>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2 className="dashboard-card-title">Mates Board</h2>
                            <Link to="/roommate/board" className="btn btn-ghost btn-sm">Ver Mates Board →</Link>
                        </div>
                        <div className="dashboard-card-body">
                            <p className="empty-state">Consulta avisos y conversación de tu grupo.</p>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2 className="dashboard-card-title">Calificaciones a Arrendador</h2>
                        </div>
                        <div className="dashboard-card-body">
                            {pendingLandlordRatings.length === 0 ? (
                                <p className="empty-state">Sin pendientes de calificación.</p>
                            ) : (
                                <div className="match-preview-list">
                                    {pendingLandlordRatings.slice(0, 3).map((pending) => (
                                        <div key={pending.id_pendiente} className="match-preview-item">
                                            <div className="avatar">{(pending.landlord_nombre || 'AR').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                                            <div className="match-preview-info">
                                                <p className="match-preview-name">{pending.landlord_nombre || 'Arrendador'}</p>
                                                <p className="match-preview-detail">{pending.propiedad_titulo || 'Propiedad'}</p>
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => setRatingTargetPendingLandlord(pending)}
                                            >
                                                Calificar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                <div className="quick-links animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <Link to="/tenant/properties" className="quick-link-card">
                        <span className="quick-link-icon">Propiedades</span>
                        <span className="quick-link-text">Buscar Propiedades</span>
                    </Link>
                    <Link to="/roommate/group" className="quick-link-card">
                        <span className="quick-link-icon">Grupo</span>
                        <span className="quick-link-text">Mi Grupo</span>
                    </Link>
                    <Link to="/roommate/board" className="quick-link-card">
                        <span className="quick-link-icon">Board</span>
                        <span className="quick-link-text">Mates Board</span>
                    </Link>
                    <Link to="/roommate/tasks" className="quick-link-card">
                        <span className="quick-link-icon">Tareas</span>
                        <span className="quick-link-text">Task Manager</span>
                    </Link>
                </div>
            </div>

            <RatingModal
                isOpen={!!ratingTargetPendingLandlord}
                title="Calificar arrendador"
                subjectName={ratingTargetPendingLandlord?.landlord_nombre || 'arrendador'}
                submitting={submittingPendingRating}
                submitLabel="Guardar calificación"
                onClose={() => {
                    if (!submittingPendingRating) setRatingTargetPendingLandlord(null);
                }}
                onSubmit={handleRatePendingLandlord}
            />
        </div>
    );
}

export default TenantDashboard;
