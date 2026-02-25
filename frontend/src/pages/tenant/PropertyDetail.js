import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPropertyById } from '../../services/api';
import './PropertyDetail.css';

function PropertyDetail() {
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [interested, setInterested] = useState(false);

    useEffect(() => {
        const fetchProperty = async () => {
            setLoading(true);
            const result = await getPropertyById(id);
            if (result.success) {
                setProperty(result.propiedad || result);
            }
            setLoading(false);
        };
        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="detail-page">
                <div className="container">
                    <p className="empty-state">Cargando propiedad...</p>
                </div>
            </div>
        );
    }

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

    const title = property.titulo || property.title || '';
    const address = property.direccion || property.address || '';
    const city = property.ciudad || property.city || '';
    const state = property.estado_ubicacion || property.state || '';
    const description = property.descripcion || property.description || '';
    const price = property.precio || property.price || 0;
    const rooms = property.habitaciones || property.rooms || 0;
    const bathrooms = property.banos || property.bathrooms || 0;
    const area = property.area || 0;
    const availableRooms = property.habitaciones_disponibles || property.availableRooms || 0;
    const amenities = property.amenidades || property.amenities || [];
    const rules = property.reglas || property.rules || [];
    const nearbyPlaces = property.lugares_cercanos || property.nearbyPlaces || [];
    const featured = property.destacada || property.featured || false;
    const landlordNombre = property.landlord_nombre || '';
    const landlordApellido = property.landlord_apellido || '';
    const landlordEmail = property.landlord_email || '';

    return (
        <div className="detail-page">
            <div className="container">
                <Link to="/tenant/properties" className="back-link">← Volver a búsqueda</Link>

                <div className="detail-layout animate-fade-in-up">

                    <div className="detail-main">

                        <div className="detail-gallery">
                            <div className="gallery-main">
                                <div className="gallery-placeholder">Sin imagen</div>
                                {featured && <span className="property-featured-badge">Destacada</span>}
                            </div>
                        </div>

                        <div className="detail-content">
                            <h1 className="detail-title">{title}</h1>
                            <p className="detail-location">{address}{address && city ? ', ' : ''}{city}{state ? `, ${state}` : ''}</p>

                            <div className="detail-stats">
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{rooms}</span>
                                    <span className="detail-stat-label">Habitaciones</span>
                                </div>
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{bathrooms}</span>
                                    <span className="detail-stat-label">Baños</span>
                                </div>
                                {area > 0 && (
                                    <div className="detail-stat">
                                        <span className="detail-stat-value">{area}m²</span>
                                        <span className="detail-stat-label">Área</span>
                                    </div>
                                )}
                                <div className="detail-stat">
                                    <span className="detail-stat-value">{availableRooms}</span>
                                    <span className="detail-stat-label">Disponibles</span>
                                </div>
                            </div>

                            {description && (
                                <div className="detail-section">
                                    <h2 className="detail-section-title">Descripción</h2>
                                    <p className="detail-description">{description}</p>
                                </div>
                            )}

                            {Array.isArray(amenities) && amenities.length > 0 && (
                                <div className="detail-section">
                                    <h2 className="detail-section-title">Amenidades</h2>
                                    <div className="amenities-grid">
                                        {amenities.map((a, i) => (
                                            <div key={i} className="amenity-item">
                                                <span className="amenity-check">✓</span>
                                                {a}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Array.isArray(rules) && rules.length > 0 && (
                                <div className="detail-section">
                                    <h2 className="detail-section-title">Reglas de Convivencia</h2>
                                    <div className="rules-list">
                                        {rules.map((rule, i) => (
                                            <div key={i} className="rule-item">
                                                <span className="rule-icon">•</span>
                                                {rule}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 && (
                                <div className="detail-section">
                                    <h2 className="detail-section-title">Lugares Cercanos</h2>
                                    <div className="nearby-list">
                                        {nearbyPlaces.map((place, i) => (
                                            <div key={i} className="nearby-item">
                                                <span className="nearby-icon">•</span>
                                                {place}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="detail-sidebar">
                        <div className="sidebar-card">
                            <div className="price-display">
                                <span className="price-amount">${price.toLocaleString()}</span>
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

                        {landlordNombre && (
                            <div className="sidebar-card">
                                <h3 className="sidebar-card-title">Arrendador</h3>
                                <div className="landlord-info">
                                    <div className="avatar avatar-lg">
                                        {(landlordNombre[0] || '') + (landlordApellido[0] || '')}
                                    </div>
                                    <div>
                                        <p className="landlord-name">{landlordNombre} {landlordApellido}</p>
                                        {landlordEmail && <p className="landlord-email">{landlordEmail}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="sidebar-card">
                            <h3 className="sidebar-card-title">Disponibilidad</h3>
                            <div className="availability-info">
                                <div className="availability-row">
                                    <span>Habitaciones totales</span>
                                    <span className="availability-value">{rooms}</span>
                                </div>
                                <div className="availability-row">
                                    <span>Disponibles</span>
                                    <span className="availability-value highlight">{availableRooms}</span>
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
