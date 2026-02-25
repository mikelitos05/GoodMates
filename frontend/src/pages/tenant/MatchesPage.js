import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMatches, acceptMatch, rejectMatch } from '../../services/api';
import './MatchesPage.css';

function MatchesPage() {
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            const result = await getMatches();
            if (result.success) {
                setMatches(result.matches || []);
            }
            setLoading(false);
        };
        fetchMatches();
    }, []);

    const handleAction = async (matchId, action) => {
        const fn = action === 'accepted' ? acceptMatch : rejectMatch;
        const result = await fn(matchId);
        if (result.success) {
            setMatches((prev) =>
                prev.map((m) => (m.id_match === matchId ? { ...m, estado: action === 'accepted' ? 'aceptado' : 'rechazado' } : m))
            );
        }
    };

    const getInitials = (match) => {
        const name = match.usuario_nombre || '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    };

    return (
        <div className="matches-page">
            <div className="container">
                <div className="matches-header animate-fade-in-up">
                    <h1 className="section-title">Mis Matches</h1>
                    <p className="section-subtitle">
                        Personas compatibles para compartir vivienda contigo, basado en tu perfil y preferencias.
                    </p>
                </div>


                <div className="match-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">Pend.</span>
                        <span className="match-stat-value">{matches.filter((m) => m.estado === 'pendiente').length}</span>
                        <span className="match-stat-label">Pendientes</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">Acep.</span>
                        <span className="match-stat-value">{matches.filter((m) => m.estado === 'aceptado').length}</span>
                        <span className="match-stat-label">Aceptados</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">Rech.</span>
                        <span className="match-stat-value">{matches.filter((m) => m.estado === 'rechazado').length}</span>
                        <span className="match-stat-label">Rechazados</span>
                    </div>
                </div>


                <div className="match-list">
                    {matches.map((match) => {
                        const nombre = match.usuario_nombre || 'Usuario';
                        const universidad = match.universidad || '';
                        const carrera = match.carrera || '';
                        const edad = match.edad || '';
                        const ciudad = match.ciudad || '';
                        const horario = match.horario || '';
                        const hobbies = match.hobbies || [];
                        const bio = match.bio || '';
                        const compatibility = match.porcentaje_compatibilidad || 0;
                        const status = match.estado || 'pendiente';

                        return (
                            <div key={match.id_match} className={`match-card animate-fade-in-up ${status === 'aceptado' ? 'accepted' : status === 'rechazado' ? 'rejected' : 'pending'}`}>
                                <div className="match-card-left">
                                    <div className="avatar avatar-lg">{getInitials(match)}</div>
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
                                        {universidad && `${universidad}`}
                                        {carrera && ` · ${carrera}`}
                                    </p>
                                    <p className="match-detail">
                                        {edad && `${edad} años`}
                                        {ciudad && ` · ${ciudad}`}
                                        {horario && ` · ${horario}`}
                                    </p>
                                    <div className="match-tags">
                                        {Array.isArray(hobbies) && hobbies.slice(0, 4).map((h, i) => (
                                            <span key={i} className="badge badge-primary">{h}</span>
                                        ))}
                                    </div>
                                    {bio && <p className="match-bio">"{bio}"</p>}
                                </div>

                                <div className="match-card-right">
                                    {status === 'pendiente' ? (
                                        <div className="match-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleAction(match.id_match, 'accepted')}
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handleAction(match.id_match, 'rejected')}
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

                {!loading && matches.length === 0 && (
                    <div className="no-results">
                        <span className="no-results-icon">Sin matches</span>
                        <h3>Aún no tienes matches</h3>
                        <p>Completa tu perfil para que el sistema pueda calcular tu compatibilidad con otros usuarios</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatchesPage;
