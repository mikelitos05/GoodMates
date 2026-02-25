import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRatings } from '../../services/api';
import { mockMatches, mockRoommateGroup, mockTasks, getUserById } from '../../data/mockData';
import './TenantDashboard.css';

function TenantDashboard() {
    const { user } = useAuth();
    const [reputacion, setReputacion] = useState(null);
    const pendingMatches = mockMatches.filter((m) => m.userId === user.id && m.status === 'pending');
    const pendingTasks = mockTasks.filter((t) => t.assigneeId === user.id && t.status === 'pending');
    const group = mockRoommateGroup.members.includes(user.id) ? mockRoommateGroup : null;

    useEffect(() => {
        const fetchReputacion = async () => {
            if (user?.id) {
                const result = await getUserRatings(user.id);
                if (result.success) {
                    setReputacion(result.reputacion);
                }
            }
        };
        fetchReputacion();
    }, [user?.id]);

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
                        <div className="stat-value">{pendingTasks.length}</div>
                        <div className="stat-label">Tareas Pendientes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Grupo</div>
                        <div className="stat-value">{group ? group.members.length : 0}</div>
                        <div className="stat-label">Roommates</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Rep.</div>
                        <div className="stat-value">{reputacion?.promedio_general ?? 'N/A'}</div>
                        <div className="stat-label">Reputación{reputacion?.total_calificaciones ? ` (${reputacion.total_calificaciones})` : ''}</div>
                    </div>
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
                                    {pendingMatches.map((match) => {
                                        const matchUser = getUserById(match.matchedUserId);
                                        return (
                                            <div key={match.id} className="match-preview-item">
                                                <div className="avatar">{matchUser?.avatar}</div>
                                                <div className="match-preview-info">
                                                    <p className="match-preview-name">{matchUser?.name}</p>
                                                    <p className="match-preview-detail">{matchUser?.profile?.university}</p>
                                                </div>
                                                <div className="match-compatibility">
                                                    <span className="compatibility-score">{match.compatibility}%</span>
                                                    <div className="progress-bar" style={{ width: '60px' }}>
                                                        <div className="progress-fill" style={{ width: `${match.compatibility}%` }}></div>
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
                            {pendingTasks.length > 0 ? (
                                <div className="task-preview-list">
                                    {pendingTasks.map((task) => (
                                        <div key={task.id} className="task-preview-item">
                                            <div className="task-preview-check">○</div>
                                            <div className="task-preview-info">
                                                <p className="task-preview-title">{task.title}</p>
                                                <p className="task-preview-due">Vence: {task.dueDate}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">No tienes tareas pendientes</p>
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
        </div>
    );
}

export default TenantDashboard;
