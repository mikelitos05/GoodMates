import React, { useState } from 'react';
import { mockMatches, getUserById } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import './MatchesPage.css';

function MatchesPage() {
    const { user } = useAuth();
    const [matches, setMatches] = useState(
        mockMatches.filter((m) => m.userId === user?.id || m.matchedUserId === user?.id)
    );

    const handleAction = (matchId, action) => {
        setMatches((prev) =>
            prev.map((m) => (m.id === matchId ? { ...m, status: action } : m))
        );
    };

    const getMatchUser = (match) => {
        const otherId = match.userId === user?.id ? match.matchedUserId : match.userId;
        return getUserById(otherId);
    };

    return (
        <div className="matches-page">
            <div className="container">
                <div className="matches-header animate-fade-in-up">
                    <h1 className="section-title">💕 Mis Matches</h1>
                    <p className="section-subtitle">
                        Personas compatibles para compartir vivienda contigo, basado en tu perfil y preferencias.
                    </p>
                </div>

                {/* Match Stats */}
                <div className="match-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">⏳</span>
                        <span className="match-stat-value">{matches.filter((m) => m.status === 'pending').length}</span>
                        <span className="match-stat-label">Pendientes</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">✅</span>
                        <span className="match-stat-value">{matches.filter((m) => m.status === 'accepted').length}</span>
                        <span className="match-stat-label">Aceptados</span>
                    </div>
                    <div className="match-stat-card">
                        <span className="match-stat-icon">❌</span>
                        <span className="match-stat-value">{matches.filter((m) => m.status === 'rejected').length}</span>
                        <span className="match-stat-label">Rechazados</span>
                    </div>
                </div>

                {/* Match List */}
                <div className="match-list">
                    {matches.map((match) => {
                        const matchUser = getMatchUser(match);
                        if (!matchUser) return null;
                        const profile = matchUser.profile || {};

                        return (
                            <div key={match.id} className={`match-card animate-fade-in-up ${match.status}`}>
                                <div className="match-card-left">
                                    <div className="avatar avatar-lg">{matchUser.avatar}</div>
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
                                                strokeDasharray={`${match.compatibility}, 100`}
                                                d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <span className="compatibility-text">{match.compatibility}%</span>
                                    </div>
                                </div>

                                <div className="match-card-center">
                                    <h3 className="match-name">{matchUser.name}</h3>
                                    <p className="match-detail">
                                        {profile.university && `📚 ${profile.university}`}
                                        {profile.career && ` · ${profile.career}`}
                                    </p>
                                    <p className="match-detail">
                                        {profile.age && `${profile.age} años`}
                                        {profile.city && ` · 📍 ${profile.city}`}
                                        {profile.schedule && ` · 🕐 ${profile.schedule}`}
                                    </p>
                                    <div className="match-tags">
                                        {profile.hobbies && profile.hobbies.slice(0, 4).map((h, i) => (
                                            <span key={i} className="badge badge-primary">{h}</span>
                                        ))}
                                        {!profile.smoking && <span className="badge badge-success">No fuma</span>}
                                        {!profile.pets && <span className="badge badge-accent">Sin mascotas</span>}
                                    </div>
                                    {profile.bio && <p className="match-bio">"{profile.bio}"</p>}
                                </div>

                                <div className="match-card-right">
                                    {match.status === 'pending' ? (
                                        <div className="match-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleAction(match.id, 'accepted')}
                                            >
                                                ✅ Aceptar
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handleAction(match.id, 'rejected')}
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`match-status-badge ${match.status}`}>
                                            {match.status === 'accepted' ? '✅ Aceptado' : '❌ Rechazado'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {matches.length === 0 && (
                    <div className="no-results">
                        <span className="no-results-icon">💕</span>
                        <h3>Aún no tienes matches</h3>
                        <p>Completa tu perfil para que el sistema pueda calcular tu compatibilidad con otros usuarios</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatchesPage;
