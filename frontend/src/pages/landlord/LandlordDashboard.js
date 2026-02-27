import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyProperties, getImageUrl, getInterestedCount, getUserRatings } from '../../services/api';
import './LandlordDashboard.css';

function LandlordDashboard() {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [interestedCount, setInterestedCount] = useState(0);
    const [reputacion, setReputacion] = useState(null);

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            const result = await getMyProperties();
            if (result.success) {
                setProperties(result.propiedades || []);
            }
            setLoading(false);
        };
        fetchProperties();
        // Fetch interested tenants count
        const fetchCount = async () => {
            const result = await getInterestedCount();
            if (result.success) {
                setInterestedCount(result.total || 0);
            }
        };
        const fetchMyRating = async () => {
            if (!user?.id) return;
            const result = await getUserRatings(user.id);
            if (result.success) {
                setReputacion(result.reputacion || null);
            }
        };
        fetchCount();
        fetchMyRating();
    }, [user?.id]);

    const availableRooms = properties.reduce((sum, p) => sum + (p.habitaciones_disponibles || p.availableRooms || 0), 0);

    return (
        <div className="dashboard-page">
            <div className="container">
                <div className="dashboard-welcome animate-fade-in-up">
                    <div className="welcome-text">
                        <h1 className="welcome-title">
                            ¡Hola, <span className="text-gradient">{user?.nombre || user?.username || ''}</span>!
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
                        <div className="stat-value">{properties.length}</div>
                        <div className="stat-label">Propiedades Publicadas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Hab.</div>
                        <div className="stat-value">{availableRooms}</div>
                        <div className="stat-label">Habitaciones Disponibles</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Int.</div>
                        <div className="stat-value">{interestedCount}</div>
                        <div className="stat-label">Tenants Interesados</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Cal.</div>
                        <div className="stat-value">{reputacion?.promedio_general ?? 'N/A'}</div>
                        <div className="stat-label">Calificación{reputacion?.total_calificaciones ? ` (${reputacion.total_calificaciones})` : ''}</div>
                    </div>
                </div>

                <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="dashboard-card-header">
                        <h2 className="dashboard-card-title">Mis Propiedades</h2>
                        <Link to="/landlord/properties" className="btn btn-ghost btn-sm">Gestionar →</Link>
                    </div>
                    <div className="dashboard-card-body">
                        {properties.length > 0 ? (
                            <div className="landlord-property-list">
                                {properties.map((prop) => {
                                    const id = prop.id_propiedad || prop.id;
                                    const title = prop.titulo || prop.title || '';
                                    const city = prop.ciudad || prop.city || '';
                                    const rooms = prop.habitaciones || prop.rooms || 0;
                                    const avail = prop.habitaciones_disponibles || prop.availableRooms || 0;
                                    const price = prop.precio || prop.price || 0;
                                    const available = prop.disponible !== undefined ? prop.disponible : (prop.available !== undefined ? prop.available : true);
                                    const images = prop.imagenes || [];

                                    return (
                                        <div key={id} className="landlord-property-item">
                                            <div className="landlord-property-image">
                                                {images.length > 0
                                                    ? <img src={getImageUrl(images[0])} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                                    : <img src="/house-icon.png" alt="propiedad" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                                                }
                                            </div>
                                            <div className="landlord-property-info">
                                                <h3 className="landlord-property-title">{title}</h3>
                                                <p className="landlord-property-location">{city}</p>
                                                <p className="landlord-property-meta">
                                                    {rooms} hab. · {avail} disponible{avail !== 1 ? 's' : ''} · ${price.toLocaleString()}/mes
                                                </p>
                                            </div>
                                            <span className={`badge ${available ? 'badge-success' : 'badge-error'}`}>
                                                {available ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                    );
                                })}
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
