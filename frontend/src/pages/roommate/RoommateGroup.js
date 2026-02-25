import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyGroup, getPropertyById } from '../../services/api';
import './RoommateGroup.css';

function RoommateGroup() {
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const groupRes = await getMyGroup();
            if (groupRes.success && groupRes.grupo) {
                setGroup(groupRes.grupo);
                if (groupRes.grupo.id_propiedad) {
                    const propRes = await getPropertyById(groupRes.grupo.id_propiedad);
                    if (propRes.success) {
                        setProperty(propRes.propiedad || propRes);
                    }
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

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
                        <p>Acepta un match y forma tu grupo de roommates para acceder a las herramientas de convivencia.</p>
                        <Link to="/tenant/matches" className="btn btn-primary btn-lg">Ver Matches →</Link>
                    </div>
                </div>
            </div>
        );
    }

    const members = group.miembros || [];
    const propTitle = property?.titulo || property?.title || '';
    const propAddress = property?.direccion || property?.address || '';
    const propCity = property?.ciudad || property?.city || '';
    const propPrice = property?.precio || property?.price || 0;

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
                    </div>
                </div>


                <div className="group-grid animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="group-card">
                        <h2 className="group-card-title">Miembros ({members.length})</h2>
                        <div className="members-list">
                            {members.map((member) => {
                                const nombre = member.nombre || '';
                                const apellido = member.apellido || '';
                                const initials = (nombre[0] || '') + (apellido[0] || '');
                                const memberId = member.id_usuario;
                                return (
                                    <div key={memberId} className="member-card">
                                        <div className="avatar avatar-lg">{initials.toUpperCase()}</div>
                                        <div className="member-info">
                                            <h3 className="member-name">
                                                {nombre} {apellido} {memberId === user?.id && <span className="you-badge">(Tú)</span>}
                                            </h3>
                                            <p className="member-detail">{member.email || ''}</p>
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
                                    <div className="mini-card-image">Sin imagen</div>
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
        </div>
    );
}

export default RoommateGroup;
