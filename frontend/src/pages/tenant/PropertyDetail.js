import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPropertyById, getUserById } from '../../data/mockData';
import './PropertyDetail.css';

function PropertyDetail() {
    const { id } = useParams();
    const property = getPropertyById(parseInt(id));
    const [interested, setInterested] = useState(false);

    if (!property) {
        return (
            <div className="detail-page">
                <div className="container">
                    <div className="not-found">
                        <h2>Propiedad no encontrada</h2>
                        <Link to="/tenant/properties" className="btn btn-primary">← Volver a búsqueda</Link>
                    </div>
                </div>
            </div>
        );
    }

    const landlord = getUserById(property.landlordId);

    return (
        <div className="detail-page">
            <div className="container">
                <Link to="/tenant/properties" className="back-link">← Volver a búsqueda</Link>

                <div className="detail-layout animate-fade-in-up">
                    {/* Main Content */}
                    <div className="detail-main">
                        {/* Image Gallery */}
                        <div className="detail-gallery">
                            <div className="gallery-main">
                                <div className="gallery-placeholder">Sin imagen</div>
                                {property.featured && <span className="property-featured-badge">Destacada</span>}
                            </div>
                        </div>

                        <div className="detail-content">
                            <h1 className="detail-title">{property.title}</h1>
                            <p className="detail-location">{property.address}, {property.city}, {property.state}</p>

                            <div className="detail-stats">
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{property.rooms}</span>
                                    <span className="detail-stat-label">Habitaciones</span>
                                </div>
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{property.bathrooms}</span>
                                    <span className="detail-stat-label">Baños</span>
                                </div>
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{property.area}m²</span>
                                    <span className="detail-stat-label">Área</span>
                                </div>
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{property.availableRooms}</span>
                                    <span className="detail-stat-label">Disponibles</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h2 className="detail-section-title">Descripción</h2>
                                <p className="detail-description">{property.description}</p>
                            </div>

                            <div className="detail-section">
                                <h2 className="detail-section-title">Amenidades</h2>
                                <div className="amenities-grid">
                                    {property.amenities.map((a, i) => (
                                        <div key={i} className="amenity-item">
                                            <span className="amenity-check">✓</span>
                                            {a}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-section">
                                <h2 className="detail-section-title">Reglas de Convivencia</h2>
                                <div className="rules-list">
                                    {property.rules.map((rule, i) => (
                                        <div key={i} className="rule-item">
                                            <span className="rule-icon">•</span>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-section">
                                <h2 className="detail-section-title">Lugares Cercanos</h2>
                                <div className="nearby-list">
                                    {property.nearbyPlaces.map((place, i) => (
                                        <div key={i} className="nearby-item">
                                            <span className="nearby-icon">•</span>
                                            {place}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="detail-sidebar">
                        <div className="sidebar-card">
                            <div className="price-display">
                                <span className="price-amount">${property.price.toLocaleString()}</span>
                                <span className="price-label">/mes por habitación</span>
                            </div>

                            <button
                                className={`btn ${interested ? 'btn-accent' : 'btn-primary'} btn-lg`}
                                style={{ width: '100%' }}
                                onClick={() => setInterested(!interested)}
                            >
                                {interested ? 'Solicitud Enviada' : 'Me interesa'}
                            </button>

                            {interested && (
                                <p className="interest-note animate-fade-in">
                                    Tu solicitud ha sido enviada al arrendador. Te notificaremos cuando responda.
                                </p>
                            )}
                        </div>

                        {landlord && (
                            <div className="sidebar-card">
                                <h3 className="sidebar-card-title">Arrendador</h3>
                                <div className="landlord-info">
                                    <div className="avatar avatar-lg">{landlord.avatar}</div>
                                    <div>
                                        <p className="landlord-name">{landlord.name}</p>
                                        <p className="landlord-email">{landlord.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="sidebar-card">
                            <h3 className="sidebar-card-title">Disponibilidad</h3>
                            <div className="availability-info">
                                <div className="availability-row">
                                    <span>Habitaciones totales</span>
                                    <span className="availability-value">{property.rooms}</span>
                                </div>
                                <div className="availability-row">
                                    <span>Disponibles</span>
                                    <span className="availability-value highlight">{property.availableRooms}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PropertyDetail;
