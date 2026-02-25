import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../../services/api';
import './PropertySearch.css';

function PropertySearch() {
    const [search, setSearch] = useState('');
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [minRooms, setMinRooms] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const filtered = properties.filter((p) => {
        const title = (p.titulo || p.title || '').toLowerCase();
        const city = (p.ciudad || p.city || '').toLowerCase();
        const address = (p.direccion || p.address || '').toLowerCase();
        const matchesSearch = title.includes(search.toLowerCase()) ||
            city.includes(search.toLowerCase()) ||
            address.includes(search.toLowerCase());
        const price = p.precio || p.price || 0;
        const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
        const rooms = p.habitaciones_disponibles || p.availableRooms || 0;
        const matchesRooms = rooms >= minRooms;
        const available = p.disponible !== undefined ? p.disponible : (p.available !== undefined ? p.available : true);
        return matchesSearch && matchesPrice && matchesRooms && available;
    });

    return (
        <div className="search-page">
            <div className="container">
                <div className="search-header animate-fade-in-up">
                    <h1 className="section-title">Buscar Propiedades</h1>
                    <p className="section-subtitle">
                        Encuentra tu próximo hogar entre las propiedades disponibles en la plataforma.
                    </p>
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
                            placeholder="Buscar por nombre, ciudad o dirección..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-outline filter-toggle"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        Filtros
                    </button>
                </div>


                {showFilters && (
                    <div className="filters-panel animate-fade-in">
                        <div className="filter-group">
                            <label className="form-label">Precio máximo (MXN/mes)</label>
                            <input
                                type="range"
                                min="2000"
                                max="15000"
                                step="500"
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                className="range-slider"
                            />
                            <span className="filter-value">${priceRange[1].toLocaleString()}</span>
                        </div>
                        <div className="filter-group">
                            <label className="form-label">Habitaciones disponibles mínimas</label>
                            <select className="form-select" value={minRooms} onChange={(e) => setMinRooms(parseInt(e.target.value))}>
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
                </div>

                <div className="properties-grid">
                    {filtered.map((property) => {
                        const id = property.id_propiedad || property.id;
                        const title = property.titulo || property.title;
                        const address = property.direccion || property.address || '';
                        const city = property.ciudad || property.city || '';
                        const price = property.precio || property.price || 0;
                        const rooms = property.habitaciones || property.rooms || 0;
                        const bathrooms = property.banos || property.bathrooms || 0;
                        const area = property.area || 0;
                        const availableRooms = property.habitaciones_disponibles || property.availableRooms || 0;
                        const amenities = property.amenidades || property.amenities || [];
                        const featured = property.destacada || property.featured || false;

                        return (
                            <Link to={`/tenant/properties/${id}`} key={id} className="property-card animate-fade-in-up">
                                <div className="property-image">
                                    <div className="property-image-placeholder">
                                        Sin imagen
                                    </div>
                                    {featured && (
                                        <span className="property-featured-badge">Destacada</span>
                                    )}
                                    <span className="property-rooms-badge">
                                        {availableRooms} hab. disponible{availableRooms !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="property-info">
                                    <h3 className="property-title">{title}</h3>
                                    <p className="property-location">{address}{address && city ? ', ' : ''}{city}</p>
                                    <div className="property-meta">
                                        <span>{rooms} habitaciones</span>
                                        <span>{bathrooms} baños</span>
                                        {area > 0 && <span>{area}m²</span>}
                                    </div>
                                    <div className="property-amenities-preview">
                                        {(Array.isArray(amenities) ? amenities : []).slice(0, 3).map((a, i) => (
                                            <span key={i} className="badge badge-accent">{a}</span>
                                        ))}
                                        {Array.isArray(amenities) && amenities.length > 3 && (
                                            <span className="badge badge-primary">+{amenities.length - 3}</span>
                                        )}
                                    </div>
                                    <div className="property-footer">
                                        <span className="property-price">${price.toLocaleString()}<span className="price-period">/mes</span></span>
                                        <span className="btn btn-primary btn-sm">Ver detalle →</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {!loading && filtered.length === 0 && (
                    <div className="no-results">
                        <span className="no-results-icon">Sin resultados</span>
                        <h3>No se encontraron propiedades</h3>
                        <p>Intenta ajustar tus filtros de búsqueda</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PropertySearch;
