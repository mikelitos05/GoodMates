import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyProperties, createProperty, updateProperty, deleteProperty, getImageUrl } from '../../services/api';
import { getEstados, getCiudades } from '../../data/mexicoLocations';
import { AMENIDADES, REGLAS } from '../../data/propertyOptions';
import { getCoordinates, MEXICO_CENTER } from '../../data/cityCoordinates';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PropertyManager.css';

// Fix default leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/* ─── Map click handler ─── */
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/* ─── Fly to a position ─── */
function MapFlyTo({ lat, lng, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null) {
            map.flyTo([lat, lng], zoom || 16, { animate: true, duration: 0.8 });
        }
    }, [lat, lng, zoom, map]);
    return null;
}

/* ─── Reverse Geocode: pin → estado/ciudad ─── */
async function reverseGeocode(lat, lng) {
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&zoom=14`,
            { headers: { 'User-Agent': 'GoodMates/1.0' } }
        );
        const data = await resp.json();
        if (data && data.address) {
            return {
                state: data.address.state || '',
                city: data.address.city || data.address.town || data.address.village || data.address.municipality || '',
            };
        }
    } catch (e) {
        console.warn('Reverse geocode failed:', e);
    }
    return null;
}

/* ─── Match a reverse geocode result to our dropdown data ─── */
function matchLocationToDropdowns(geoResult) {
    if (!geoResult) return { state: '', city: '' };
    const estados = getEstados();
    // Find closest state match
    const stNorm = geoResult.state.toLowerCase().trim();
    const matchedState = estados.find(e => e.toLowerCase() === stNorm)
        || estados.find(e => stNorm.includes(e.toLowerCase()) || e.toLowerCase().includes(stNorm))
        || '';
    if (!matchedState) return { state: '', city: '' };
    // Find closest city match
    const cities = getCiudades(matchedState);
    const ctNorm = geoResult.city.toLowerCase().trim();
    const matchedCity = cities.find(c => c.toLowerCase() === ctNorm)
        || cities.find(c => ctNorm.includes(c.toLowerCase()) || c.toLowerCase().includes(ctNorm))
        || '';
    return { state: matchedState, city: matchedCity };
}

function PropertyManager() {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);       // new files to upload
    const [imagePreviews, setImagePreviews] = useState([]);  // preview URLs
    const [existingImages, setExistingImages] = useState([]); // paths from DB
    const [geocoding, setGeocoding] = useState(false);
    const fileInputRef = useRef(null);
    const [mapKey, setMapKey] = useState(0); // force re-mount map

    const [form, setForm] = useState({
        title: '', description: '', address: '', city: 'Monterrey', state: 'Nuevo León',
        price: '', rooms: '', bathrooms: '', availableRooms: '', area: '',
        amenities: [], rules: [],
        lat: null, lng: null,
    });

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        setLoading(true);
        const result = await getMyProperties();
        if (result.success) {
            setProperties(result.propiedades || []);
        }
        setLoading(false);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    /* ─── When pin is placed on map ─── */
    const handleLocationSelect = useCallback(async (lat, lng) => {
        setForm((prev) => ({ ...prev, lat, lng }));
        // Reverse geocode to auto-fill state/city
        setGeocoding(true);
        const geoResult = await reverseGeocode(lat, lng);
        const matched = matchLocationToDropdowns(geoResult);
        if (matched.state) {
            setForm((prev) => ({
                ...prev,
                state: matched.state,
                city: matched.city || prev.city,
            }));
        }
        setGeocoding(false);
    }, []);

    /* ─── Image handling ─── */
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setImageFiles((prev) => [...prev, ...files]);
        // Generate previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeNewImage = (index) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    /* ─── Edit a property ─── */
    const handleEdit = (prop) => {
        const title = prop.titulo || prop.title || '';
        const description = prop.descripcion || prop.description || '';
        const address = prop.direccion || prop.address || '';
        const city = prop.ciudad || prop.city || '';
        const state = prop.estado || prop.estado_ubicacion || prop.state || '';
        const price = prop.precio || prop.price || '';
        const rooms = prop.habitaciones || prop.rooms || '';
        const bathrooms = prop.banos || prop.bathrooms || '';
        const availableRooms = prop.habitaciones_disponibles || prop.availableRooms || '';
        const area = prop.area || '';
        const amenities = prop.amenidades || prop.amenities || [];
        const rules = prop.reglas || prop.rules || [];
        const lat = prop.latitud != null ? parseFloat(prop.latitud) : null;
        const lng = prop.longitud != null ? parseFloat(prop.longitud) : null;
        const images = prop.imagenes || prop.images || [];

        setForm({
            title, description, address, city, state, price, rooms,
            bathrooms, availableRooms, area,
            amenities: Array.isArray(amenities) ? amenities : [],
            rules: Array.isArray(rules) ? rules : [],
            lat, lng,
        });
        setExistingImages(Array.isArray(images) ? images : []);
        setImageFiles([]);
        setImagePreviews([]);
        setEditingId(prop.id_propiedad || prop.id);
        setShowForm(true);
        setMapKey((k) => k + 1);
    };

    const handleDelete = async (id) => {
        const result = await deleteProperty(id);
        if (result.success) {
            setProperties((prev) => prev.filter((p) => (p.id_propiedad || p.id) !== id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar que haya al menos una imagen
        const totalImages = imageFiles.length + existingImages.length;
        if (totalImages === 0) {
            alert('Debes subir al menos una imagen de la propiedad.');
            return;
        }

        const propertyData = {
            titulo: form.title,
            descripcion: form.description,
            direccion: form.address,
            ciudad: form.city,
            estado: form.state,           // matches DB column name
            precio: parseInt(form.price),
            habitaciones: parseInt(form.rooms),
            banos: parseInt(form.bathrooms),
            habitaciones_disponibles: parseInt(form.availableRooms),
            area: parseInt(form.area) || null,
            amenidades: form.amenities,
            reglas: form.rules,
            latitud: form.lat,
            longitud: form.lng,
        };

        let result;
        if (editingId) {
            result = await updateProperty(editingId, propertyData, imageFiles);
        } else {
            result = await createProperty(propertyData, imageFiles);
        }

        if (result.success) {
            await fetchProperties();
            resetForm();
        }
    };

    const addToList = (field, value) => {
        if (value && !form[field].includes(value)) {
            setForm((prev) => ({ ...prev, [field]: [...prev[field], value] }));
        }
    };

    const removeFromList = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: prev[field].filter((item) => item !== value) }));
    };

    const resetForm = () => {
        setForm({
            title: '', description: '', address: '', city: 'Monterrey', state: 'Nuevo León',
            price: '', rooms: '', bathrooms: '', availableRooms: '', area: '',
            amenities: [], rules: [],
            lat: null, lng: null,
        });
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        setEditingId(null);
        setShowForm(false);
        setMapKey((k) => k + 1);
    };

    /* ─── When state/city dropdown changes, center map there but clear pin ─── */
    const handleStateChange = (val) => {
        setForm((prev) => ({ ...prev, state: val, city: '', lat: null, lng: null }));
        setMapKey((k) => k + 1);
    };

    const handleCityChange = (val) => {
        setForm((prev) => ({ ...prev, city: val, lat: null, lng: null }));
        setMapKey((k) => k + 1);
    };

    // Map center: use pin if placed, else city coords, else Mexico center
    const mapCenter = form.lat && form.lng
        ? [form.lat, form.lng]
        : form.city && form.state
            ? getCoordinates(form.city, form.state)
            : MEXICO_CENTER;

    const mapZoom = form.lat ? 16 : form.city ? 14 : 5;

    return (
        <div className="manager-page">
            <div className="container">
                <div className="manager-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Mis Propiedades</h1>
                        <p className="section-subtitle">Gestiona tus propiedades publicadas en GoodMates.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
                        {showForm ? '✕ Cancelar' : '+ Nueva Propiedad'}
                    </button>
                </div>


                {showForm && (
                    <div className="property-form-card animate-fade-in-up">
                        <h2 className="form-card-title">
                            {editingId ? 'Editar Propiedad' : 'Nueva Propiedad'}
                        </h2>
                        <form onSubmit={handleSubmit} className="property-form">
                            <div className="property-form-grid">
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Título de la propiedad</label>
                                    <input type="text" className="form-input" value={form.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Ej. Departamento Moderno en Zona Tec" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <input type="text" className="form-input" value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Calle y colonia" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Estado</label>
                                    <select className="form-select" value={form.state} onChange={(e) => handleStateChange(e.target.value)} required>
                                        <option value="">Seleccionar estado</option>
                                        {getEstados().map((est) => (
                                            <option key={est} value={est}>{est}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ciudad</label>
                                    <select className="form-select" value={form.city} onChange={(e) => handleCityChange(e.target.value)} required disabled={!form.state}>
                                        <option value="">{form.state ? 'Seleccionar ciudad' : 'Primero selecciona un estado'}</option>
                                        {getCiudades(form.state).map((cd) => (
                                            <option key={cd} value={cd}>{cd}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* ──── MAP LOCATION PICKER ──── */}
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">
                                        📍 Ubicación en el mapa
                                        <span className="form-label-hint">
                                            {geocoding
                                                ? ' — Detectando ubicación...'
                                                : form.lat
                                                    ? ` — Lat: ${form.lat.toFixed(7)}, Lng: ${form.lng.toFixed(7)}`
                                                    : ' — Haz click en el mapa para marcar la ubicación exacta'}
                                        </span>
                                    </label>
                                    <div className="map-picker-container">
                                        <MapContainer
                                            key={mapKey}
                                            center={mapCenter}
                                            zoom={mapZoom}
                                            scrollWheelZoom={true}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                                            {form.lat != null && form.lng != null && (
                                                <>
                                                    <Marker position={[form.lat, form.lng]} />
                                                    <MapFlyTo lat={form.lat} lng={form.lng} zoom={16} />
                                                </>
                                            )}
                                        </MapContainer>
                                        {form.lat && (
                                            <button
                                                type="button"
                                                className="map-picker-reset"
                                                onClick={() => { handleChange('lat', null); handleChange('lng', null); setMapKey((k) => k + 1); }}
                                            >
                                                ✕ Quitar pin
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Precio por habitación (MXN/mes)</label>
                                    <input type="number" className="form-input" value={form.price} onChange={(e) => handleChange('price', e.target.value)} placeholder="5000" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Habitaciones totales</label>
                                    <input type="number" className="form-input" value={form.rooms} onChange={(e) => handleChange('rooms', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Baños</label>
                                    <input type="number" className="form-input" value={form.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Habitaciones disponibles</label>
                                    <input type="number" className="form-input" value={form.availableRooms} onChange={(e) => handleChange('availableRooms', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Área (m²)</label>
                                    <input type="number" className="form-input" value={form.area} onChange={(e) => handleChange('area', e.target.value)} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Descripción</label>
                                    <textarea className="form-textarea" value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Describe tu propiedad..." required />
                                </div>

                                {/* ──── IMAGE UPLOAD ──── */}
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">📷 Imágenes de la propiedad <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        multiple
                                        onChange={handleImageSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline image-upload-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        + Subir imágenes
                                    </button>
                                    {(existingImages.length > 0 || imagePreviews.length > 0) && (
                                        <div className="image-preview-grid">
                                            {existingImages.map((src, i) => (
                                                <div key={`existing-${i}`} className="image-preview-item">
                                                    <img src={getImageUrl(src)} alt={`Propiedad ${i + 1}`} />
                                                    <button type="button" className="image-preview-remove" onClick={() => removeExistingImage(i)}>✕</button>
                                                </div>
                                            ))}
                                            {imagePreviews.map((src, i) => (
                                                <div key={`new-${i}`} className="image-preview-item image-preview-new">
                                                    <img src={src} alt={`Nueva ${i + 1}`} />
                                                    <span className="image-preview-badge">Nueva</span>
                                                    <button type="button" className="image-preview-remove" onClick={() => removeNewImage(i)}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Amenidades</label>
                                    <select className="form-select" value="" onChange={(e) => { addToList('amenities', e.target.value); e.target.value = ''; }}>
                                        <option value="">+ Agregar amenidad...</option>
                                        {AMENIDADES.filter((a) => !form.amenities.includes(a)).map((a) => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                    {form.amenities.length > 0 && (
                                        <div className="chips-container">
                                            {form.amenities.map((a) => (
                                                <span key={a} className="chip">
                                                    {a}
                                                    <button type="button" className="chip-remove" onClick={() => removeFromList('amenities', a)}>✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Reglas</label>
                                    <select className="form-select" value="" onChange={(e) => { addToList('rules', e.target.value); e.target.value = ''; }}>
                                        <option value="">+ Agregar regla...</option>
                                        {REGLAS.filter((r) => !form.rules.includes(r)).map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                    {form.rules.length > 0 && (
                                        <div className="chips-container">
                                            {form.rules.map((r) => (
                                                <span key={r} className="chip">
                                                    {r}
                                                    <button type="button" className="chip-remove" onClick={() => removeFromList('rules', r)}>✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary btn-lg">
                                    {editingId ? 'Guardar Cambios' : 'Publicar Propiedad'}
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                )}


                <div className="properties-list">
                    {properties.map((prop) => {
                        const id = prop.id_propiedad || prop.id;
                        const title = prop.titulo || prop.title || '';
                        const address = prop.direccion || prop.address || '';
                        const city = prop.ciudad || prop.city || '';
                        const price = prop.precio || prop.price || 0;
                        const rooms = prop.habitaciones || prop.rooms || 0;
                        const bathrooms = prop.banos || prop.bathrooms || 0;
                        const availableRooms = prop.habitaciones_disponibles || prop.availableRooms || 0;
                        const area = prop.area || 0;
                        const amenities = prop.amenidades || prop.amenities || [];
                        const images = prop.imagenes || [];
                        const available = prop.disponible !== undefined ? prop.disponible : (prop.available !== undefined ? prop.available : true);
                        const hasCoords = prop.latitud != null && prop.longitud != null;

                        return (
                            <div key={id} className="manager-property-card animate-fade-in-up">
                                <div className="manager-property-image">
                                    {images.length > 0
                                        ? <img src={getImageUrl(images[0])} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                        : <img src="/house-icon.png" alt="propiedad" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                                    }
                                </div>
                                <div className="manager-property-content">
                                    <div className="manager-property-header">
                                        <h3 className="manager-property-title">{title}</h3>
                                        <span className={`badge ${available ? 'badge-success' : 'badge-error'}`}>
                                            {available ? 'Activa' : 'Inactiva'}
                                        </span>
                                        {hasCoords && <span className="badge badge-accent" title="Ubicación exacta configurada">📍</span>}
                                        {images.length > 0 && <span className="badge badge-primary">{images.length} 📷</span>}
                                    </div>
                                    <p className="manager-property-location">{address}{address && city ? ', ' : ''}{city}</p>
                                    <div className="manager-property-meta">
                                        <span>${price.toLocaleString()}/mes</span>
                                        <span>{rooms} hab. ({availableRooms} disp.)</span>
                                        <span>{bathrooms} baños</span>
                                        {area > 0 && <span>{area}m²</span>}
                                    </div>
                                    <div className="manager-property-amenities">
                                        {(Array.isArray(amenities) ? amenities : []).slice(0, 4).map((a, i) => (
                                            <span key={i} className="badge badge-accent">{a}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="manager-property-actions">
                                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(prop)}>Editar</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(id)}>Eliminar</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!loading && properties.length === 0 && !showForm && (
                    <div className="no-results">
                        <span className="no-results-icon">Sin propiedades</span>
                        <h3>No tienes propiedades publicadas</h3>
                        <p>Comienza publicando tu primera propiedad</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PropertyManager;
