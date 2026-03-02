import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties, getImageUrl } from '../../services/api';
import { getEstados, getCiudades } from '../../data/mexicoLocations';
import { getCoordinates, MEXICO_CENTER, MEXICO_ZOOM } from '../../data/cityCoordinates';
import { loadGoogleMapsApi } from '../../utils/googleMapsLoader';
import './PropertySearch.css';

const NEUTRAL_MATCH_COLOR = '#94a3b8';

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

function matchColor(pct) {
    if (pct === null || pct === undefined) return NEUTRAL_MATCH_COLOR;
    const r = pct < 50 ? 255 : Math.round(255 - (pct - 50) * 5.1);
    const g = pct > 50 ? 220 : Math.round(pct * 4.4);
    return `rgb(${r}, ${g}, 40)`;
}

function getPropertyCoords(property) {
    const lat = property.latitud != null ? Number.parseFloat(property.latitud) : null;
    const lng = property.longitud != null ? Number.parseFloat(property.longitud) : null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return getCoordinates(property.ciudad || property.city, property.estado || property.estado_ubicacion || property.state);
}

function buildMarkerIcon(color, highlighted) {
    return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: highlighted ? 1 : 0.85,
        strokeColor: highlighted ? '#ffffff' : 'rgba(0,0,0,0.35)',
        strokeWeight: highlighted ? 3 : 1.5,
        scale: highlighted ? 11 : 8,
    };
}

function createMapPopupContent(property) {
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

    const root = document.createElement('div');
    root.className = 'map-popup';

    const strong = document.createElement('strong');
    strong.textContent = title;
    root.appendChild(strong);

    const location = document.createElement('p');
    location.textContent = `${city}${city && state ? ', ' : ''}${state}`;
    root.appendChild(location);

    const priceNode = document.createElement('p');
    priceNode.className = 'map-popup-price';
    priceNode.textContent = `$${price.toLocaleString()}/mes`;
    root.appendChild(priceNode);

    const roomsNode = document.createElement('p');
    roomsNode.textContent = `${rooms} hab. - ${availableRooms} disponible${availableRooms !== 1 ? 's' : ''}`;
    root.appendChild(roomsNode);

    const ratingNode = document.createElement('p');
    ratingNode.textContent = hasRating
        ? `Calificacion: ${ratingSummary.promedio.toFixed(1)} (${ratingSummary.count})`
        : 'Calificacion: Sin calificaciones';
    root.appendChild(ratingNode);

    const matchNode = document.createElement('div');
    matchNode.className = `map-popup-match ${compat !== null ? '' : 'map-popup-match--na'}`.trim();
    matchNode.style.background = matchColor(compat);
    matchNode.textContent = compat !== null ? `${compat}% match` : 'N/A';
    root.appendChild(matchNode);

    const link = document.createElement('a');
    link.className = 'map-popup-link';
    link.href = `/tenant/properties/${id}`;
    link.textContent = 'Ver detalle ->';
    root.appendChild(link);

    return root;
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
    const [viewMode, setViewMode] = useState('split');
    const [mapError, setMapError] = useState('');

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const infoWindowRef = useRef(null);
    const markersRef = useRef(new Map());

    const filtered = useMemo(() => properties.filter((p) => {
        const title = (p.titulo || p.title || '').toLowerCase();
        const city = (p.ciudad || p.city || '').toLowerCase();
        const address = (p.direccion || p.address || '').toLowerCase();
        const searchLower = search.toLowerCase();

        const matchesSearch = title.includes(searchLower) || city.includes(searchLower) || address.includes(searchLower);
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

    const clearMapObjects = () => {
        markersRef.current.forEach(({ marker }) => {
            marker.setMap(null);
        });
        markersRef.current.clear();

        if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current = null;
        }

        mapRef.current = null;
    };

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

    useEffect(() => {
        if (viewMode === 'list') {
            clearMapObjects();
            return;
        }

        let cancelled = false;

        const initMap = async () => {
            try {
                await loadGoogleMapsApi();
                if (cancelled || !mapContainerRef.current) return;

                mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                    center: { lat: MEXICO_CENTER[0], lng: MEXICO_CENTER[1] },
                    zoom: MEXICO_ZOOM,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    streetViewControl: false,
                });
                infoWindowRef.current = new window.google.maps.InfoWindow();
                setMapError('');
            } catch (err) {
                if (!cancelled) {
                    setMapError('No se pudo cargar Google Maps. Verifica tu API key.');
                }
            }
        };

        initMap();

        return () => {
            cancelled = true;
        };
    }, [viewMode]);

    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const map = mapRef.current;
        const markerEntries = markersRef.current;
        const nextIds = new Set();

        filtered.forEach((property) => {
            const rawId = property.id_propiedad || property.id;
            if (!rawId) return;
            const markerId = String(rawId);
            const [lat, lng] = getPropertyCoords(property);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const compat = getCompatibility(property);
            nextIds.add(markerId);

            if (!markerEntries.has(markerId)) {
                const marker = new window.google.maps.Marker({
                    map,
                    position: { lat, lng },
                    icon: buildMarkerIcon(matchColor(compat), false),
                    zIndex: 1,
                });

                marker.addListener('mouseover', () => setHoveredId(rawId));
                marker.addListener('mouseout', () => setHoveredId((prev) => (String(prev) === markerId ? null : prev)));
                marker.addListener('click', () => {
                    const current = markersRef.current.get(markerId);
                    if (!current || !infoWindowRef.current) return;
                    infoWindowRef.current.setContent(createMapPopupContent(current.property));
                    infoWindowRef.current.open({ map, anchor: current.marker });
                });

                markerEntries.set(markerId, { marker, property });
                return;
            }

            const currentEntry = markerEntries.get(markerId);
            currentEntry.property = property;
            currentEntry.marker.setMap(map);
            currentEntry.marker.setPosition({ lat, lng });
            currentEntry.marker.setIcon(buildMarkerIcon(matchColor(compat), false));
            currentEntry.marker.setZIndex(1);
        });

        markerEntries.forEach((entry, markerId) => {
            if (nextIds.has(markerId)) return;
            entry.marker.setMap(null);
            markerEntries.delete(markerId);
        });

        const coords = filtered
            .map((property) => getPropertyCoords(property))
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

        if (coords.length === 0) {
            map.setCenter({ lat: MEXICO_CENTER[0], lng: MEXICO_CENTER[1] });
            map.setZoom(MEXICO_ZOOM);
            return;
        }

        if (coords.length === 1) {
            map.setCenter({ lat: coords[0][0], lng: coords[0][1] });
            map.setZoom(13);
            return;
        }

        const bounds = new window.google.maps.LatLngBounds();
        coords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
        map.fitBounds(bounds, 60);
    }, [filtered, viewMode]);

    useEffect(() => {
        if (!window.google?.maps) return;

        markersRef.current.forEach((entry, markerId) => {
            const compat = getCompatibility(entry.property);
            const highlighted = String(hoveredId) === markerId;
            entry.marker.setIcon(buildMarkerIcon(matchColor(compat), highlighted));
            entry.marker.setZIndex(highlighted ? 999 : 1);
        });
    }, [hoveredId]);

    useEffect(() => () => {
        clearMapObjects();
    }, []);

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
                        <span>{bathrooms} banos</span>
                        <span>{availableRooms} disp.</span>
                    </div>
                    <p className="property-rating-summary">
                        {hasRating
                            ? `Calificacion inquilinos: ${ratingSummary.promedio.toFixed(1)} - ${ratingSummary.count} inquilino${ratingSummary.count !== 1 ? 's' : ''} calificado${ratingSummary.count !== 1 ? 's' : ''}`
                            : 'Calificacion inquilinos: Sin calificaciones'}
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
                        {!compact && <span className="btn btn-primary btn-sm">Ver detalle -&gt;</span>}
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
                            Encuentra tu proximo hogar entre las propiedades disponibles.
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
                            placeholder="Buscar por nombre, ciudad o direccion..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                        Filtros {showFilters ? '^' : 'v'}
                    </button>
                </div>

                {showFilters && (
                    <div className="filters-panel animate-fade-in">
                        <div className="filter-group">
                            <label className="form-label">Precio maximo (MXN/mes)</label>
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
                                {priceRange[1] >= PRICE_FILTER_MAX ? 'Sin limite' : `$${priceRange[1].toLocaleString()}`}
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
                            <label className="form-label">Habitaciones minimas</label>
                            <select className="form-select" value={minRooms} onChange={(e) => setMinRooms(parseInt(e.target.value, 10))}>
                                <option value={0}>Cualquiera</option>
                                <option value={1}>Al menos 1</option>
                                <option value={2}>Al menos 2</option>
                                <option value={3}>Al menos 3</option>
                            </select>
                        </div>
                    </div>
                )}

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

                <div className={`search-layout search-layout--${viewMode}`}>
                    {viewMode !== 'map' && (
                        <div className="search-list-panel">
                            <div className={viewMode === 'split' ? 'properties-list-compact' : 'properties-grid'}>
                                {filtered.map((property) => renderPropertyCard(property, viewMode === 'split'))}
                            </div>
                            {!loading && filtered.length === 0 && (
                                <div className="no-results">
                                    <span className="no-results-icon">Sin resultados</span>
                                    <h3>No se encontraron propiedades</h3>
                                    <p>Intenta ajustar tus filtros de busqueda</p>
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode !== 'list' && (
                        <div className="search-map-panel">
                            {mapError ? (
                                <div className="map-error-box">{mapError}</div>
                            ) : (
                                <div ref={mapContainerRef} className="google-map-canvas" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PropertySearch;
