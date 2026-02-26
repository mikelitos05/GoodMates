import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getProperties, getImageUrl } from '../../services/api';
import { getEstados, getCiudades } from '../../data/mexicoLocations';
import { getCoordinates, MEXICO_CENTER, MEXICO_ZOOM } from '../../data/cityCoordinates';
import './PropertySearch.css';

const NEUTRAL_MATCH_COLOR = '#94a3b8';

/* ───── helper: compatibilidad real por propiedad ───── */
function getCompatibility(property) {
    const raw = property.compatibilidad ?? property.compatibility ?? property.porcentaje_compatibilidad;
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getPropertyRatingSummary(property) {
    const rawPromedio = property.calificacion_promedio_inquilinos;
    const rawCount = property.inquilinos_calificados;
    const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
    const promedio = rawPromedio === null || rawPromedio === undefined || rawPromedio === ''
        ? null
        : Number.parseFloat(rawPromedio);

    if (!Number.isFinite(promedio)) {
        return { promedio: null, count };
    }

    return { promedio: Number(promedio.toFixed(1)), count };
}

/* ───── helper: color semáforo ───── */
function matchColor(pct) {
    if (pct === null || pct === undefined) return NEUTRAL_MATCH_COLOR;
    // 0% = rojo, 50% = amarillo, 100% = verde
    const r = pct < 50 ? 255 : Math.round(255 - (pct - 50) * 5.1);
    const g = pct > 50 ? 220 : Math.round(pct * 4.4);
    return `rgb(${r}, ${g}, 40)`;
}

/* ───── helper: get coordinates preferring stored lat/lng ───── */
function getPropertyCoords(property) {
    const lat = property.latitud != null ? parseFloat(property.latitud) : null;
    const lng = property.longitud != null ? parseFloat(property.longitud) : null;
    if (lat && lng) return [lat, lng];
    return getCoordinates(property.ciudad || property.city, property.estado || property.estado_ubicacion || property.state);
}

/* ───── sub-component: re-center map when data changes ───── */
function MapUpdater({ properties }) {
    const map = useMap();
    useEffect(() => {
        if (properties.length === 0) return;
        if (properties.length === 1) {
            const coords = getPropertyCoords(properties[0]);
            map.setView(coords, 13, { animate: true });
        } else {
            const bounds = properties.map((p) => getPropertyCoords(p));
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
        }
    }, [properties, map]);
    return null;
}

function PropertySearch() {
    const PRICE_FILTER_MAX = 50000;
    const [search, setSearch] = useState('');
    const [priceRange, setPriceRange] = useState([0, PRICE_FILTER_MAX]);
    const [minRooms, setMinRooms] = useState(0);
    const [filterState, setFilterState] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);
    const [viewMode, setViewMode] = useState('split'); // 'split' | 'list' | 'map'

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            const result = await getProperties();
            if (result.success) {
                setProperties(result.propiedades || []);
            }
            setLoading(false);
        };
        fetchProperties();
    }, []);

    const filtered = useMemo(() => properties.filter((p) => {
        const title = (p.titulo || p.title || '').toLowerCase();
        const city = (p.ciudad || p.city || '').toLowerCase();
        const address = (p.direccion || p.address || '').toLowerCase();
        const matchesSearch = title.includes(search.toLowerCase()) ||
            city.includes(search.toLowerCase()) ||
            address.includes(search.toLowerCase());
        const price = p.precio || p.price || 0;
        const matchesPrice = priceRange[1] >= PRICE_FILTER_MAX || (price >= priceRange[0] && price <= priceRange[1]);
        const rooms = p.habitaciones_disponibles || p.availableRooms || 0;
        const matchesRooms = rooms >= minRooms;
        const available = p.disponible !== undefined ? p.disponible : (p.available !== undefined ? p.available : true);
        const state = (p.estado || p.estado_ubicacion || p.state || '').toLowerCase();
        const matchesState = !filterState || state === filterState.toLowerCase();
        const matchesCity = !filterCity || city === filterCity.toLowerCase();
        return matchesSearch && matchesPrice && matchesRooms && available && matchesState && matchesCity;
    }), [properties, search, priceRange, minRooms, filterState, filterCity]);

    const renderPropertyCard = (property, compact = false) => {
        const id = property.id_propiedad || property.id;
        const title = property.titulo || property.title;
        const address = property.direccion || property.address || '';
        const city = property.ciudad || property.city || '';
        const state = property.estado || property.estado_ubicacion || property.state || '';
        const price = property.precio || property.price || 0;
        const rooms = property.habitaciones || property.rooms || 0;
        const bathrooms = property.banos || property.bathrooms || 0;
        const availableRooms = property.habitaciones_disponibles || property.availableRooms || 0;
        const amenities = property.amenidades || property.amenities || [];
        const images = property.imagenes || [];
        const compat = getCompatibility(property);
        const hasCompatibility = compat !== null;
        const ratingSummary = getPropertyRatingSummary(property);
        const hasRating = ratingSummary.promedio !== null && ratingSummary.count > 0;

        return (
            <Link
                to={`/tenant/properties/${id}`}
                key={id}
                className={`property-card ${compact ? 'property-card--compact' : ''} ${hoveredId === id ? 'property-card--highlighted' : ''}`}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                {!compact && (
                    <div className="property-image">
                        {images.length > 0
                            ? <img src={getImageUrl(images[0])} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div className="property-image-placeholder"><img src="/house-icon.png" alt="propiedad" style={{ width: 48, height: 48, objectFit: 'contain' }} /></div>
                        }
                        <span className="property-rooms-badge">
                            {availableRooms} hab. disponible{availableRooms !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                <div className="property-info">
                    <div className="property-info-top">
                        <h3 className="property-title">{title}</h3>
                        <span
                            className={`property-match-badge ${hasCompatibility ? '' : 'property-match-badge--na'}`}
                            style={{ background: matchColor(compat) }}
                            title={hasCompatibility ? `${compat}% compatibilidad` : 'Compatibilidad no disponible'}
                        >
                            {hasCompatibility ? `${compat}%` : 'N/A'}
                        </span>
                    </div>
                    <p className="property-location">
                        {address}{address && city ? ', ' : ''}{city}{city && state ? ', ' : ''}{state}
                    </p>
                    <div className="property-meta">
                        <span>{rooms} hab.</span>
                        <span>{bathrooms} baños</span>
                        <span>{availableRooms} disp.</span>
                    </div>
                    <p className="property-rating-summary">
                        {hasRating
                            ? `Calificación inquilinos: ${ratingSummary.promedio.toFixed(1)} · ${ratingSummary.count} inquilino${ratingSummary.count !== 1 ? 's' : ''} calificado${ratingSummary.count !== 1 ? 's' : ''}`
                            : 'Calificación inquilinos: Sin calificaciones'}
                    </p>
                    {!compact && (
                        <div className="property-amenities-preview">
                            {(Array.isArray(amenities) ? amenities : []).slice(0, 3).map((a, i) => (
                                <span key={i} className="badge badge-accent">{a}</span>
                            ))}
                            {Array.isArray(amenities) && amenities.length > 3 && (
                                <span className="badge badge-primary">+{amenities.length - 3}</span>
                            )}
                        </div>
                    )}
                    <div className="property-footer">
                        <span className="property-price">${price.toLocaleString()}<span className="price-period">/mes</span></span>
                        {!compact && <span className="btn btn-primary btn-sm">Ver detalle →</span>}
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="search-page">
            <div className="container">
                <div className="search-header animate-fade-in-up">
                    <div className="search-header-text">
                        <h1 className="section-title">Buscar Propiedades</h1>
                        <p className="section-subtitle">
                            Encuentra tu próximo hogar entre las propiedades disponibles.
                        </p>
                    </div>
                    <div className="view-mode-toggle">
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'view-btn--active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Solo lista"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'split' ? 'view-btn--active' : ''}`}
                            onClick={() => setViewMode('split')}
                            title="Lista + Mapa"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /></svg>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'map' ? 'view-btn--active' : ''}`}
                            onClick={() => setViewMode('map')}
                            title="Solo mapa"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="search-bar animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="search-input-wrapper">
                        <span className="search-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Buscar por nombre, ciudad o dirección..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                        Filtros {showFilters ? '▲' : '▼'}
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="filters-panel animate-fade-in">
                        <div className="filter-group">
                            <label className="form-label">Precio máximo (MXN/mes)</label>
                            <input
                                type="range"
                                min="2000"
                                max={PRICE_FILTER_MAX}
                                step="500"
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10)])}
                                className="range-slider"
                            />
                            <span className="filter-value">
                                {priceRange[1] >= PRICE_FILTER_MAX ? 'Sin límite' : `$${priceRange[1].toLocaleString()}`}
                            </span>
                        </div>
                        <div className="filter-group">
                            <label className="form-label">Estado</label>
                            <select className="form-select" value={filterState} onChange={(e) => { setFilterState(e.target.value); setFilterCity(''); }}>
                                <option value="">Todos los estados</option>
                                {getEstados().map((est) => (
                                    <option key={est} value={est}>{est}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="form-label">Ciudad</label>
                            <select className="form-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} disabled={!filterState}>
                                <option value="">{filterState ? 'Todas las ciudades' : 'Selecciona un estado'}</option>
                                {getCiudades(filterState).map((cd) => (
                                    <option key={cd} value={cd}>{cd}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="form-label">Habitaciones mínimas</label>
                            <select className="form-select" value={minRooms} onChange={(e) => setMinRooms(parseInt(e.target.value))}>
                                <option value={0}>Cualquiera</option>
                                <option value={1}>Al menos 1</option>
                                <option value={2}>Al menos 2</option>
                                <option value={3}>Al menos 3</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Match legend */}
                <div className="search-results-header">
                    <p className="results-count">
                        {loading ? 'Cargando...' : `${filtered.length} propiedad${filtered.length !== 1 ? 'es' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
                    </p>
                    <div className="match-legend">
                        <span className="match-legend-label">Compatibilidad:</span>
                        <span className="match-legend-dot" style={{ background: matchColor(10) }}></span>
                        <span className="match-legend-text">Baja</span>
                        <span className="match-legend-dot" style={{ background: matchColor(50) }}></span>
                        <span className="match-legend-text">Media</span>
                        <span className="match-legend-dot" style={{ background: matchColor(90) }}></span>
                        <span className="match-legend-text">Alta</span>
                        <span className="match-legend-dot" style={{ background: matchColor(null) }}></span>
                        <span className="match-legend-text">N/A</span>
                    </div>
                </div>

                {/* Main content: split, list, or map */}
                <div className={`search-layout search-layout--${viewMode}`}>
                    {/* Property list */}
                    {viewMode !== 'map' && (
                        <div className="search-list-panel">
                            <div className={viewMode === 'split' ? 'properties-list-compact' : 'properties-grid'}>
                                {filtered.map((property) => renderPropertyCard(property, viewMode === 'split'))}
                            </div>
                            {!loading && filtered.length === 0 && (
                                <div className="no-results">
                                    <span className="no-results-icon">Sin resultados</span>
                                    <h3>No se encontraron propiedades</h3>
                                    <p>Intenta ajustar tus filtros de búsqueda</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Map */}
                    {viewMode !== 'list' && (
                        <div className="search-map-panel">
                            <MapContainer
                                center={MEXICO_CENTER}
                                zoom={MEXICO_ZOOM}
                                scrollWheelZoom={true}
                                style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-xl)' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapUpdater properties={filtered} />

                                {filtered.map((property) => {
                                    const id = property.id_propiedad || property.id;
                                    const title = property.titulo || property.title || '';
                                    const city = property.ciudad || property.city || '';
                                    const state = property.estado || property.estado_ubicacion || property.state || '';
                                    const price = property.precio || property.price || 0;
                                    const rooms = property.habitaciones || property.rooms || 0;
                                    const availableRooms = property.habitaciones_disponibles || property.availableRooms || 0;
                                    const compat = getCompatibility(property);
                                    const ratingSummary = getPropertyRatingSummary(property);
                                    const hasRating = ratingSummary.promedio !== null && ratingSummary.count > 0;
                                    const coords = getPropertyCoords(property);
                                    const isHovered = hoveredId === id;

                                    return (
                                        <CircleMarker
                                            key={id}
                                            center={coords}
                                            radius={isHovered ? 16 : 10}
                                            pathOptions={{
                                                fillColor: matchColor(compat),
                                                fillOpacity: isHovered ? 1 : 0.85,
                                                color: isHovered ? '#fff' : 'rgba(0,0,0,0.3)',
                                                weight: isHovered ? 3 : 1.5,
                                            }}
                                            eventHandlers={{
                                                mouseover: () => setHoveredId(id),
                                                mouseout: () => setHoveredId(null),
                                            }}
                                        >
                                            <Popup>
                                                <div className="map-popup">
                                                    <strong>{title}</strong>
                                                    <p>{city}{city && state ? ', ' : ''}{state}</p>
                                                    <p className="map-popup-price">${price.toLocaleString()}/mes</p>
                                                    <p>{rooms} hab. • {availableRooms} disponible{availableRooms !== 1 ? 's' : ''}</p>
                                                    <p>
                                                        {hasRating
                                                            ? `Calificación: ${ratingSummary.promedio.toFixed(1)} (${ratingSummary.count})`
                                                            : 'Calificación: Sin calificaciones'}
                                                    </p>
                                                    <div className={`map-popup-match ${compat !== null ? '' : 'map-popup-match--na'}`} style={{ background: matchColor(compat) }}>
                                                        {compat !== null ? `${compat}% match` : 'N/A'}
                                                    </div>
                                                    <Link to={`/tenant/properties/${id}`} className="map-popup-link">
                                                        Ver detalle →
                                                    </Link>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PropertySearch;
