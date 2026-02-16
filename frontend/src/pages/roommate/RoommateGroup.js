import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mockRoommateGroup, getUserById, getPropertyById } from '../../data/mockData';
import './RoommateGroup.css';

function RoommateGroup() {
    const { user } = useAuth();
    const group = mockRoommateGroup.members.includes(user?.id) ? mockRoommateGroup : null;

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

    const property = getPropertyById(group.propertyId);
    const members = group.members.map((id) => getUserById(id)).filter(Boolean);

    return (
        <div className="group-page">
            <div className="container">
                <div className="group-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">{group.name}</h1>
                        <p className="section-subtitle">
                            {property ? `${property.title}` : 'Grupo de roommates'}
                            {' · '} Creado el {group.createdAt}
                        </p>
                    </div>
                </div>

                {/* Members */}
                <div className="group-grid animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="group-card">
                        <h2 className="group-card-title">Miembros ({members.length})</h2>
                        <div className="members-list">
                            {members.map((member) => (
                                <div key={member.id} className="member-card">
                                    <div className="avatar avatar-lg">{member.avatar}</div>
                                    <div className="member-info">
                                        <h3 className="member-name">
                                            {member.name} {member.id === user.id && <span className="you-badge">(Tú)</span>}
                                        </h3>
                                        <p className="member-detail">{member.profile?.university} · {member.profile?.career}</p>
                                        <div className="member-tags">
                                            {member.profile?.hobbies?.slice(0, 3).map((h, i) => (
                                                <span key={i} className="badge badge-primary">{h}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
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
                                        <p className="mini-card-title">{property.title}</p>
                                        <p className="mini-card-location">{property.address}, {property.city}</p>
                                        <p className="mini-card-price">${property.price.toLocaleString()}/mes</p>
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
