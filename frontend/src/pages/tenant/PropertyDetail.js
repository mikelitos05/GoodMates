import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    getPropertyById,
    getImageUrl,
    createInquiry,
    getConvivenciaEstado,
    getMyInquiries,
} from '../../services/api';
import './PropertyDetail.css';

function PropertyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inquiryState, setInquiryState] = useState(null); // null | 'pendiente' | 'aceptada' | 'rechazada' | 'confirmada' | 'declinada'
    const [inquirySolicitudId, setInquirySolicitudId] = useState(null);
    const [sending, setSending] = useState(false);
    const [convivenciaActiva, setConvivenciaActiva] = useState(false);
    const [mensajeBloqueo, setMensajeBloqueo] = useState('');
    const [activeImg, setActiveImg] = useState(0);
    const [lightbox, setLightbox] = useState(false);
    const [roommates, setRoommates] = useState([]);

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
                if (result.roommates) {
                    setRoommates(result.roommates);
                }
            }
            setLoading(false);
        };
        fetchProperty();
    }, [id]);

    useEffect(() => {
        const fetchConvivenciaEstado = async () => {
            const result = await getConvivenciaEstado();
            if (result.success) {
                const activa = !!result.convivenciaActiva;
                setConvivenciaActiva(activa);
                if (activa) {
                    setMensajeBloqueo('Puedes explorar propiedades, pero no postularte mientras pertenezcas a un grupo activo.');
                }
            }
        };
        fetchConvivenciaEstado();
    }, []);

    // Check if tenant already sent an inquiry for this property
    useEffect(() => {
        const checkExisting = async () => {
            const result = await getMyInquiries();
            if (result.success && result.solicitudes) {
                const existing = result.solicitudes.find(s => s.id_propiedad === id);
                if (existing) {
                    setInquiryState(existing.estado);
                    setInquirySolicitudId(existing.id_solicitud);
                }
            }
        };
        checkExisting();
    }, [id]);

    const handleInquiry = async () => {
        if (inquiryState) return;
        if (convivenciaActiva) {
            setMensajeBloqueo('Debes salir de tu grupo actual antes de enviar una solicitud.');
            return;
        }

        setSending(true);
        const result = await createInquiry(id, '');
        if (result.success) {
            setInquiryState('pendiente');
            setInquirySolicitudId(result.solicitud?.id_solicitud);
        } else {
            if (result.code === 'ACTIVE_CONVIVENCIA_EXISTS') {
                setConvivenciaActiva(true);
                setMensajeBloqueo(result.error || 'No puedes aplicar mientras pertenezcas a un grupo activo.');
            } else {
                alert(result.error || 'Error al enviar solicitud');
            }
        }
        setSending(false);
    };

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
    const inquilinosCompatibles = Array.isArray(property.inquilinos_compatibles) ? property.inquilinos_compatibles : [];
    const inquilinosActivos = Number.isFinite(Number(property.inquilinos_activos))
        ? Number(property.inquilinos_activos)
        : Math.max(0, rooms - availableRooms);
    const calificacionPromedioRaw = property.calificacion_promedio_inquilinos !== null && property.calificacion_promedio_inquilinos !== undefined
        ? Number(property.calificacion_promedio_inquilinos)
        : null;
    const calificacionPromedioInquilinos = Number.isFinite(calificacionPromedioRaw)
        ? calificacionPromedioRaw
        : null;
    const inquilinosCalificados = Number.isFinite(Number(property.inquilinos_calificados))
        ? Number(property.inquilinos_calificados)
        : 0;

    // Button label and style based on inquiry state
    const getInquiryButton = () => {
        if (sending) {
            return { label: 'Enviando...', className: 'btn btn-primary btn-lg', disabled: true };
        }
        switch (inquiryState) {
            case 'pendiente':
                return { label: 'Solicitud pendiente', className: 'btn btn-accent btn-lg', disabled: true };
            case 'aceptada':
                return { label: 'Ir al Chat', className: 'btn btn-success btn-lg', disabled: false };
            case 'rechazada':
                return { label: 'Solicitud Rechazada', className: 'btn btn-danger btn-lg', disabled: true };
            case 'confirmada':
                return { label: 'Confirmado como Inquilino', className: 'btn btn-success btn-lg', disabled: true };
            case 'declinada':
                return { label: 'Solicitud Declinada', className: 'btn btn-danger btn-lg', disabled: true };
            case 'traslado_pendiente':
                return { label: 'Solicitud en revisión', className: 'btn btn-accent btn-lg', disabled: true };
            default:
                if (convivenciaActiva) {
                    return {
                        label: 'No disponible en grupo activo',
                        className: 'btn btn-accent btn-lg',
                        disabled: true,
                    };
                }
                return { label: 'Solicitar Informes', className: 'btn btn-primary btn-lg', disabled: false };
        }
    };

    const inquiryBtn = getInquiryButton();

    const handleBtnClick = () => {
        if (inquiryState === 'aceptada' && inquirySolicitudId) {
            navigate(`/chat/${inquirySolicitudId}`);
        } else if (!inquiryState) {
            handleInquiry();
        }
    };

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
                                                    <span className="amenity-check">OK</span>
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

                                {inquilinosCompatibles.length > 0 && (
                                    <div className="detail-section">
                                        <h2 className="detail-section-title">Inquilinos actuales y compatibilidad</h2>
                                        <div className="tenant-compat-list">
                                            {inquilinosCompatibles.map((tenant) => {
                                                const fullName = `${tenant.nombre || ''} ${tenant.apellido || ''}`.trim() || 'Inquilino';
                                                const avatar = tenant.avatar || fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
                                                const compat = tenant.compatibilidad;
                                                const ratingRaw = tenant.calificacion_promedio !== null && tenant.calificacion_promedio !== undefined
                                                    ? Number(tenant.calificacion_promedio)
                                                    : null;
                                                const ratingPromedio = Number.isFinite(ratingRaw) ? ratingRaw : null;
                                                const ratingCount = Number(tenant.total_calificaciones || 0);

                                                return (
                                                    <div key={tenant.id_usuario} className="tenant-compat-item">
                                                        <div className="avatar avatar-md">{avatar}</div>
                                                        <div className="tenant-compat-meta">
                                                            <p className="tenant-compat-name">{fullName}</p>
                                                            <p className="tenant-compat-subtitle">
                                                                {ratingPromedio !== null && ratingCount > 0
                                                                    ? `Calificación: ${ratingPromedio.toFixed(1)} (${ratingCount})`
                                                                    : 'Calificación: Sin calificaciones'}
                                                            </p>
                                                        </div>
                                                        <div className="tenant-compat-right">
                                                            <p className="tenant-compat-subtitle">Compatibilidad contigo</p>
                                                            <span className="tenant-compat-score">{compat}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                                    className={inquiryBtn.className}
                                    style={{ width: '100%' }}
                                    onClick={handleBtnClick}
                                    disabled={inquiryBtn.disabled}
                                >
                                    {inquiryBtn.label}
                                </button>

                                {inquiryState === 'pendiente' && (
                                    <p className="interest-note animate-fade-in">
                                        Tu solicitud ha sido enviada al arrendador. Te notificaremos cuando responda.
                                    </p>
                                )}
                                {inquiryState === 'aceptada' && (
                                    <p className="interest-note animate-fade-in" style={{ color: 'var(--success, #22c55e)' }}>
                                        ¡El arrendador aceptó tu solicitud! Haz clic en el botón para iniciar el chat.
                                    </p>
                                )}
                                {inquiryState === 'rechazada' && (
                                    <p className="interest-note animate-fade-in" style={{ color: 'var(--danger, #ef4444)' }}>
                                        Lo sentimos, el arrendador rechazó tu solicitud.
                                    </p>
                                )}
                                {inquiryState === 'confirmada' && (
                                    <p className="interest-note animate-fade-in" style={{ color: 'var(--success, #22c55e)' }}>
                                        ¡Felicidades! Has sido confirmado como inquilino. Revisa tu grupo de roommates.
                                    </p>
                                )}
                                {inquiryState === 'declinada' && (
                                    <p className="interest-note animate-fade-in" style={{ color: 'var(--danger, #ef4444)' }}>
                                        El arrendador ha declinado tu solicitud después de la revisión. No es posible volver a solicitar.
                                    </p>
                                )}
                                {mensajeBloqueo && (
                                    <p className="interest-note animate-fade-in" style={{ color: 'var(--warning, #f59e0b)' }}>
                                        {mensajeBloqueo}
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

                            {roommates.length > 0 && (
                                <div className="sidebar-card">
                                    <h3 className="sidebar-card-title">Roommates en esta propiedad</h3>
                                    <div className="roommates-list">
                                        {roommates.map((r) => (
                                            <div key={r.id_usuario} className="roommate-item">
                                                <div className="avatar avatar-sm">{r.avatar}</div>
                                                <div className="roommate-info">
                                                    <span className="roommate-name">{r.nombre}</span>
                                                </div>
                                                {r.compatibilidad !== null && (
                                                    <span
                                                        className="roommate-compat"
                                                        style={{
                                                            color: r.compatibilidad >= 70 ? '#22c55e' : r.compatibilidad >= 40 ? '#f59e0b' : '#ef4444',
                                                        }}
                                                    >
                                                        {r.compatibilidad}%
                                                    </span>
                                                )}
                                            </div>
                                        ))}
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
                                    <div className="availability-row">
                                        <span>Inquilinos activos</span>
                                        <span className="availability-value">{inquilinosActivos}</span>
                                    </div>
                                    <div className="availability-row">
                                        <span>Rating promedio inquilinos</span>
                                        <span className="availability-value">
                                            {calificacionPromedioInquilinos !== null && inquilinosCalificados > 0
                                                ? `${calificacionPromedioInquilinos.toFixed(1)} (${inquilinosCalificados})`
                                                : 'Sin calificaciones'}
                                        </span>
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
                        <button className="lightbox-close" onClick={() => setLightbox(false)}>Cerrar</button>
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
