import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mockProperties } from '../../data/mockData';
import './LandlordDashboard.css';

function LandlordDashboard() {
    const { user } = useAuth();
    const myProperties = mockProperties.filter((p) => p.landlordId === user?.id);
    const availableRooms = myProperties.reduce((sum, p) => sum + p.availableRooms, 0);

    return (
        <div className="dashboard-page">
            <div className="container">
                <div className="dashboard-welcome animate-fade-in-up">
                    <div className="welcome-text">
                        <h1 className="welcome-title">
                            ¡Hola, <span className="text-gradient">{user?.name.split(' ')[0]}</span>!
                        </h1>
                        <p className="welcome-subtitle">
                            Gestiona tus propiedades y revisa el interés de los inquilinos.
                        </p>
                    </div>
                    <Link to="/landlord/properties" className="btn btn-primary">
                        + Nueva Propiedad
                    </Link>
                </div>

                <div className="dashboard-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="stat-card">
                        <div className="stat-icon">Prop.</div>
                        <div className="stat-value">{myProperties.length}</div>
                        <div className="stat-label">Propiedades Publicadas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Hab.</div>
                        <div className="stat-value">{availableRooms}</div>
                        <div className="stat-label">Habitaciones Disponibles</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Int.</div>
                        <div className="stat-value">12</div>
                        <div className="stat-label">Tenants Interesados</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Cal.</div>
                        <div className="stat-value">4.9</div>
                        <div className="stat-label">Calificación</div>
                    </div>
                </div>

                <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="dashboard-card-header">
                        <h2 className="dashboard-card-title">Mis Propiedades</h2>
                        <Link to="/landlord/properties" className="btn btn-ghost btn-sm">Gestionar →</Link>
                    </div>
                    <div className="dashboard-card-body">
                        {myProperties.length > 0 ? (
                            <div className="landlord-property-list">
                                {myProperties.map((prop) => (
                                    <div key={prop.id} className="landlord-property-item">
                                        <div className="landlord-property-image">Sin imagen</div>
                                        <div className="landlord-property-info">
                                            <h3 className="landlord-property-title">{prop.title}</h3>
                                            <p className="landlord-property-location">{prop.city}</p>
                                            <p className="landlord-property-meta">
                                                {prop.rooms} hab. · {prop.availableRooms} disponible{prop.availableRooms !== 1 ? 's' : ''} · ${prop.price.toLocaleString()}/mes
                                            </p>
                                        </div>
                                        <span className={`badge ${prop.available ? 'badge-success' : 'badge-error'}`}>
                                            {prop.available ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="empty-state">Aún no has publicado propiedades</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LandlordDashboard;
