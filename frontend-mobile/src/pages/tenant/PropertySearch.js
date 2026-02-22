import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockProperties } from '../../data/mockData';
import './PropertySearch.css';

function PropertySearch() {
    const [search, setSearch] = useState('');
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [minRooms, setMinRooms] = useState(0);
    const [showFilters, setShowFilters] = useState(false);

    const filtered = mockProperties.filter((p) => {
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.city.toLowerCase().includes(search.toLowerCase()) ||
            p.address.toLowerCase().includes(search.toLowerCase());
        const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
        const matchesRooms = p.availableRooms >= minRooms;
        return matchesSearch && matchesPrice && matchesRooms && p.available;
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
                        <span className="search-icon">Buscar</span>
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
                    <p className="results-count">{filtered.length} propiedad{filtered.length !== 1 ? 'es' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="properties-grid">
                    {filtered.map((property) => (
                        <Link to={`/tenant/properties/${property.id}`} key={property.id} className="property-card animate-fade-in-up">
                            <div className="property-image">
                                <div className="property-image-placeholder">
                                    Sin imagen
                                </div>
                                {property.featured && (
                                    <span className="property-featured-badge">Destacada</span>
                                )}
                                <span className="property-rooms-badge">
                                    {property.availableRooms} hab. disponible{property.availableRooms !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="property-info">
                                <h3 className="property-title">{property.title}</h3>
                                <p className="property-location">{property.address}, {property.city}</p>
                                <div className="property-meta">
                                    <span>{property.rooms} habitaciones</span>
                                    <span>{property.bathrooms} baños</span>
                                    <span>{property.area}m²</span>
                                </div>
                                <div className="property-amenities-preview">
                                    {property.amenities.slice(0, 3).map((a, i) => (
                                        <span key={i} className="badge badge-accent">{a}</span>
                                    ))}
                                    {property.amenities.length > 3 && (
                                        <span className="badge badge-primary">+{property.amenities.length - 3}</span>
                                    )}
                                </div>
                                <div className="property-footer">
                                    <span className="property-price">${property.price.toLocaleString()}<span className="price-period">/mes</span></span>
                                    <span className="btn btn-primary btn-sm">Ver detalle →</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filtered.length === 0 && (
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
