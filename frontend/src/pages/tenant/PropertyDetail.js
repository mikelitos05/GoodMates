import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPropertyById, getImageUrl } from '../../services/api';
import './PropertyDetail.css';

function PropertyDetail() {
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [interested, setInterested] = useState(false);
    const [activeImg, setActiveImg] = useState(0);
    const [lightbox, setLightbox] = useState(false);

    // Keyboard navigation for lightbox
    const handleKeyDown = useCallback((e) => {
        if (!lightbox) return;
        const imgs = property?.imagenes || [];
        if (e.key === 'Escape') setLightbox(false);
        if (e.key === 'ArrowRight') setActiveImg((prev) => (prev + 1) % imgs.length);
        if (e.key === 'ArrowLeft') setActiveImg((prev) => (prev - 1 + imgs.length) % imgs.length);
    }, [lightbox, property]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

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
    const state = property.estado || property.estado_ubicacion || property.state || '';
    const description = property.descripcion || property.description || '';
    const price = property.precio || property.price || 0;
    const rooms = property.habitaciones || property.rooms || 0;
    const bathrooms = property.banos || property.bathrooms || 0;
    const area = property.area || 0;
    const availableRooms = property.habitaciones_disponibles || property.availableRooms || 0;
    const amenities = property.amenidades || property.amenities || [];
    const rules = property.reglas || property.rules || [];
    const nearbyPlaces = property.lugares_cercanos || property.nearbyPlaces || [];
    const images = property.imagenes || [];
    const featured = property.destacada || property.featured || false;
    const landlordNombre = property.landlord_nombre || '';
    const landlordApellido = property.landlord_apellido || '';
    const landlordEmail = property.landlord_email || '';

    return (
        <>
            <div className="detail-page">
                <div className="container">
                    <Link to="/tenant/properties" className="back-link">← Volver a búsqueda</Link>

                    <div className="detail-layout animate-fade-in-up">

                        <div className="detail-main">

                            <div className="detail-gallery">
                                <div className="gallery-main">
                                    {images.length > 0
                                        ? <>
                                            <img
                                                key={activeImg}
                                                src={getImageUrl(images[activeImg])}
                                                alt={`${title} - ${activeImg + 1}`}
                                                className="gallery-main-img"
                                                onClick={() => setLightbox(true)}
                                                style={{ cursor: 'zoom-in' }}
                                            />
                                            {images.length > 1 && (
                                                <>
                                                    <button className="gallery-arrow gallery-arrow--left" onClick={() => setActiveImg((prev) => (prev - 1 + images.length) % images.length)}>‹</button>
                                                    <button className="gallery-arrow gallery-arrow--right" onClick={() => setActiveImg((prev) => (prev + 1) % images.length)}>›</button>
                                                    <span className="gallery-counter">{activeImg + 1} / {images.length}</span>
                                                </>
                                            )}
                                        </>
                                        : <div className="gallery-placeholder">Sin imagen</div>
                                    }
                                    {featured && <span className="property-featured-badge">Destacada</span>}
                                </div>
                                {images.length > 1 && (
                                    <div className="gallery-thumbs">
                                        {images.map((img, i) => (
                                            <div
                                                key={i}
                                                className={`gallery-thumb ${i === activeImg ? 'gallery-thumb--active' : ''}`}
                                                onClick={() => setActiveImg(i)}
                                            >
                                                <img src={getImageUrl(img)} alt={`${title} ${i + 1}`} />
                                            </div>
                                        ))}
                                    </div>
                                )}
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

            {/* ──── LIGHTBOX FULLSCREEN ──── */}
            {
                lightbox && images.length > 0 && (
                    <div className="lightbox-overlay" onClick={() => setLightbox(false)}>
                        <button className="lightbox-close" onClick={() => setLightbox(false)}>✕</button>
                        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                            <img
                                key={activeImg}
                                src={getImageUrl(images[activeImg])}
                                alt={`${title} - ${activeImg + 1}`}
                                className="lightbox-img"
                            />
                            {images.length > 1 && (
                                <>
                                    <button className="lightbox-arrow lightbox-arrow--left" onClick={() => setActiveImg((prev) => (prev - 1 + images.length) % images.length)}>‹</button>
                                    <button className="lightbox-arrow lightbox-arrow--right" onClick={() => setActiveImg((prev) => (prev + 1) % images.length)}>›</button>
                                    <span className="lightbox-counter">{activeImg + 1} / {images.length}</span>
                                </>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
                                {images.map((img, i) => (
                                    <div
                                        key={i}
                                        className={`lightbox-thumb ${i === activeImg ? 'lightbox-thumb--active' : ''}`}
                                        onClick={() => setActiveImg(i)}
                                    >
                                        <img src={getImageUrl(img)} alt={`${title} ${i + 1}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
        </>
    );
}

export default PropertyDetail;
