import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyProperties, createProperty, updateProperty, deleteProperty } from '../../services/api';
import './PropertyManager.css';

function PropertyManager() {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        title: '', description: '', address: '', city: 'Monterrey', state: 'Nuevo León',
        price: '', rooms: '', bathrooms: '', availableRooms: '', area: '',
        amenities: '', rules: '',
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

    const handleEdit = (prop) => {
        const title = prop.titulo || prop.title || '';
        const description = prop.descripcion || prop.description || '';
        const address = prop.direccion || prop.address || '';
        const city = prop.ciudad || prop.city || '';
        const state = prop.estado_ubicacion || prop.state || '';
        const price = prop.precio || prop.price || '';
        const rooms = prop.habitaciones || prop.rooms || '';
        const bathrooms = prop.banos || prop.bathrooms || '';
        const availableRooms = prop.habitaciones_disponibles || prop.availableRooms || '';
        const area = prop.area || '';
        const amenities = prop.amenidades || prop.amenities || [];
        const rules = prop.reglas || prop.rules || [];

        setForm({
            title, description, address, city, state, price, rooms,
            bathrooms, availableRooms, area,
            amenities: Array.isArray(amenities) ? amenities.join(', ') : amenities,
            rules: Array.isArray(rules) ? rules.join(', ') : rules,
        });
        setEditingId(prop.id_propiedad || prop.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        const result = await deleteProperty(id);
        if (result.success) {
            setProperties((prev) => prev.filter((p) => (p.id_propiedad || p.id) !== id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const propertyData = {
            titulo: form.title,
            descripcion: form.description,
            direccion: form.address,
            ciudad: form.city,
            estado_ubicacion: form.state,
            precio: parseInt(form.price),
            habitaciones: parseInt(form.rooms),
            banos: parseInt(form.bathrooms),
            habitaciones_disponibles: parseInt(form.availableRooms),
            area: parseInt(form.area) || null,
            amenidades: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
            reglas: form.rules.split(',').map((r) => r.trim()).filter(Boolean),
        };

        let result;
        if (editingId) {
            result = await updateProperty(editingId, propertyData);
        } else {
            result = await createProperty(propertyData);
        }

        if (result.success) {
            await fetchProperties();
            resetForm();
        }
    };

    const resetForm = () => {
        setForm({
            title: '', description: '', address: '', city: 'Monterrey', state: 'Nuevo León',
            price: '', rooms: '', bathrooms: '', availableRooms: '', area: '',
            amenities: '', rules: '',
        });
        setEditingId(null);
        setShowForm(false);
    };

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
                                    <label className="form-label">Ciudad</label>
                                    <input type="text" className="form-input" value={form.city} onChange={(e) => handleChange('city', e.target.value)} required />
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
                                <div className="form-group">
                                    <label className="form-label">Amenidades (separadas por coma)</label>
                                    <input type="text" className="form-input" value={form.amenities} onChange={(e) => handleChange('amenities', e.target.value)} placeholder="WiFi, Estacionamiento, Lavadora" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reglas (separadas por coma)</label>
                                    <input type="text" className="form-input" value={form.rules} onChange={(e) => handleChange('rules', e.target.value)} placeholder="No fumar, Horario de silencio" />
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
                        const available = prop.disponible !== undefined ? prop.disponible : (prop.available !== undefined ? prop.available : true);

                        return (
                            <div key={id} className="manager-property-card animate-fade-in-up">
                                <div className="manager-property-image">Sin imagen</div>
                                <div className="manager-property-content">
                                    <div className="manager-property-header">
                                        <h3 className="manager-property-title">{title}</h3>
                                        <span className={`badge ${available ? 'badge-success' : 'badge-error'}`}>
                                            {available ? 'Activa' : 'Inactiva'}
                                        </span>
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
