import React, { useState, useEffect } from 'react';
import { getAllTenantsCompatibility, requestMatch, getMatches, acceptMatch, rejectMatch } from '../../services/api';
import './MatchesPage.css';

function MatchesPage() {
    const [tenants, setTenants] = useState([]);
    const [pendingMatches, setPendingMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'pending'
    const [requestingId, setRequestingId] = useState(null);

    // Fetch all tenants with compatibility
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [tenantsResult, matchesResult] = await Promise.all([
                getAllTenantsCompatibility(),
                getMatches(),
            ]);

            if (tenantsResult.success) {
                setTenants(tenantsResult.tenants || []);
            }

            if (matchesResult.success) {
                const normalizados = (matchesResult.matches || []).map((m) => ({
                    ...m,
                    estado: m.estado || m.status || 'pendiente',
                    porcentaje_compatibilidad: m.porcentaje_compatibilidad ?? m.compatibility ?? 0,
                    usuario_nombre: m.usuario_nombre || m.matchedUserName || 'Usuario',
                }));
                setPendingMatches(normalizados);
            }

            setLoading(false);
        };
        fetchData();
    }, []);

    const handleRequestMatch = async (tenantId) => {
        setRequestingId(tenantId);
        const result = await requestMatch(tenantId);
        if (result.success) {
            // Mark as solicited
            setTenants((prev) =>
                prev.map((t) =>
                    t.id_usuario === tenantId ? { ...t, match_estado: 'pendiente' } : t
                )
            );
        } else {
            alert(result.error || 'Error al solicitar match');
        }
        setRequestingId(null);
    };

    const handleMatchAction = async (matchId, action) => {
        const fn = action === 'accepted' ? acceptMatch : rejectMatch;
        const result = await fn(matchId);
        if (result.success) {
            setPendingMatches((prev) =>
                prev.map((m) =>
                    m.id_match === matchId
                        ? { ...m, estado: action === 'accepted' ? 'aceptado' : 'rechazado' }
                        : m
                )
            );
        } else if (action === 'accepted') {
            alert(result.error || 'No fue posible procesar el match');
        }
    };

    const getInitials = (nombre) => {
        return (nombre || '')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '??';
    };

    const getCompatColor = (pct) => {
        if (pct >= 75) return '#22c55e';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const incomingPending = pendingMatches.filter((m) => m.estado === 'pendiente');

    return (
        <div className="matches-page">
            <div className="container">
                <div className="matches-header animate-fade-in-up">
                    <h1 className="section-title">Matches</h1>
                    <p className="section-subtitle">
                        Descubre personas compatibles para compartir vivienda basado en tu perfil y preferencias.
                    </p>
                </div>

                {/* Tab navigation */}
                <div className="matches-tabs animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <button
                        className={`matches-tab ${activeTab === 'discover' ? 'active' : ''}`}
                        onClick={() => setActiveTab('discover')}
                    >
                        Descubrir
                        <span className="tab-count">{tenants.length}</span>
                    </button>
                    <button
                        className={`matches-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Solicitudes
                        {incomingPending.length > 0 && (
                            <span className="tab-count tab-count--alert">{incomingPending.length}</span>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="match-stats animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="match-stat-card">
                        <span className="match-stat-value">{tenants.length}</span>
                        <span className="match-stat-label">Usuarios activos</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-value">
                            {tenants.filter((t) => t.grupo_propiedad).length}
                        </span>
                        <span className="match-stat-label">En una propiedad</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-value">{incomingPending.length}</span>
                        <span className="match-stat-label">Solicitudes pendientes</span>
                    </div>
                </div>

                {/* DISCOVER TAB */}
                {activeTab === 'discover' && (
                    <div className="match-list">
                        {loading && <p className="empty-state">Cargando tenants...</p>}
                        {!loading && tenants.length === 0 && (
                            <div className="no-results">
                                <h3>No hay usuarios disponibles</h3>
                                <p>Completa tu perfil para que el sistema pueda calcular tu compatibilidad con otros usuarios.</p>
                            </div>
                        )}
                        {tenants.map((tenant) => {
                            const nombre = tenant.nombre || 'Usuario';
                            const apellido = tenant.apellido || '';
                            const fullName = `${nombre} ${apellido}`.trim();
                            const universidad = tenant.universidad || '';
                            const carrera = tenant.carrera || '';
                            const edad = tenant.edad || '';
                            const ciudad = tenant.ciudad || '';
                            const horario = tenant.horario || '';
                            const hobbies = typeof tenant.hobbies === 'string' ? JSON.parse(tenant.hobbies || '[]') : (tenant.hobbies || []);
                            const compatibility = tenant.compatibilidad || 0;
                            const inGroup = !!tenant.grupo_propiedad;
                            const matchEstado = tenant.match_estado;

                            return (
                                <div key={tenant.id_usuario} className="match-card animate-fade-in-up">
                                    <div className="match-card-left">
                                        <div className="avatar avatar-lg">{getInitials(fullName)}</div>
                                        <div className="match-compatibility-ring">
                                            <svg viewBox="0 0 36 36" className="compatibility-circle">
                                                <path
                                                    className="circle-bg"
                                                    d="M18 2.0845
                                                      a 15.9155 15.9155 0 0 1 0 31.831
                                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <path
                                                    className="circle-fill"
                                                    strokeDasharray={`${compatibility}, 100`}
                                                    style={{ stroke: getCompatColor(compatibility) }}
                                                    d="M18 2.0845
                                                      a 15.9155 15.9155 0 0 1 0 31.831
                                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <span className="compatibility-text">{compatibility}%</span>
                                        </div>
                                    </div>

                                    <div className="match-card-center">
                                        <div className="match-name-row">
                                            <h3 className="match-name">{fullName}</h3>
                                            {inGroup && (
                                                <span className="badge badge-accent" title={`En propiedad: ${tenant.grupo_propiedad}`}>
                                                    🏠 En propiedad
                                                </span>
                                            )}
                                        </div>
                                        <p className="match-detail">
                                            {universidad && `${universidad}`}
                                            {carrera && ` · ${carrera}`}
                                        </p>
                                        <p className="match-detail">
                                            {edad && `${edad} años`}
                                            {ciudad && ` · ${ciudad}`}
                                            {horario && ` · ${horario}`}
                                        </p>
                                        <div className="match-tags">
                                            {Array.isArray(hobbies) &&
                                                hobbies.slice(0, 4).map((h, i) => (
                                                    <span key={i} className="badge badge-primary">
                                                        {h}
                                                    </span>
                                                ))}
                                            {hobbies.length > 4 && (
                                                <span className="badge badge-accent">+{hobbies.length - 4}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="match-card-right">
                                        {matchEstado === 'pendiente' ? (
                                            <span className="match-status-badge pending-badge">Solicitud enviada</span>
                                        ) : matchEstado === 'aceptado' ? (
                                            <span className="match-status-badge accepted">Match aceptado</span>
                                        ) : (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleRequestMatch(tenant.id_usuario)}
                                                disabled={requestingId === tenant.id_usuario}
                                            >
                                                {requestingId === tenant.id_usuario ? 'Enviando...' : 'Solicitar Match'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* PENDING SOLICITUDES TAB */}
                {activeTab === 'pending' && (
                    <div className="match-list">
                        {loading && <p className="empty-state">Cargando solicitudes...</p>}
                        {!loading && pendingMatches.length === 0 && (
                            <div className="no-results">
                                <h3>Sin solicitudes de match</h3>
                                <p>Cuando otros usuarios te soliciten un match, aparecerán aquí.</p>
                            </div>
                        )}
                        {pendingMatches.map((match) => {
                            const nombre = match.usuario_nombre || 'Usuario';
                            const compatibility = match.porcentaje_compatibilidad || 0;
                            const status = match.estado || 'pendiente';

                            return (
                                <div
                                    key={match.id_match}
                                    className={`match-card animate-fade-in-up ${status === 'aceptado' ? 'accepted' : status === 'rechazado' ? 'rejected' : 'pending'
                                        }`}
                                >
                                    <div className="match-card-left">
                                        <div className="avatar avatar-lg">{getInitials(nombre)}</div>
                                        <div className="match-compatibility-ring">
                                            <svg viewBox="0 0 36 36" className="compatibility-circle">
                                                <path
                                                    className="circle-bg"
                                                    d="M18 2.0845
                                                      a 15.9155 15.9155 0 0 1 0 31.831
                                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <path
                                                    className="circle-fill"
                                                    strokeDasharray={`${compatibility}, 100`}
                                                    style={{ stroke: getCompatColor(compatibility) }}
                                                    d="M18 2.0845
                                                      a 15.9155 15.9155 0 0 1 0 31.831
                                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <span className="compatibility-text">{compatibility}%</span>
                                        </div>
                                    </div>

                                    <div className="match-card-center">
                                        <h3 className="match-name">{nombre}</h3>
                                        <p className="match-detail">
                                            {match.ciudad && `${match.ciudad}`}
                                            {match.edad && ` · ${match.edad} años`}
                                        </p>
                                    </div>

                                    <div className="match-card-right">
                                        {status === 'pendiente' ? (
                                            <div className="match-actions">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleMatchAction(match.id_match, 'accepted')}
                                                >
                                                    Aceptar
                                                </button>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => handleMatchAction(match.id_match, 'rejected')}
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`match-status-badge ${status === 'aceptado' ? 'accepted' : 'rejected'}`}>
                                                {status === 'aceptado' ? 'Aceptado' : 'Rechazado'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatchesPage;
