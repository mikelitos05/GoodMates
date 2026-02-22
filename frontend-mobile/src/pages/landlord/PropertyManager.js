import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockProperties } from '../../data/mockData';
import './PropertyManager.css';

function PropertyManager() {
    const { user } = useAuth();
    const [properties, setProperties] = useState(
        mockProperties.filter((p) => p.landlordId === user?.id)
    );
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        title: '', description: '', address: '', city: 'Monterrey', state: 'Nuevo León',
        price: '', rooms: '', bathrooms: '', availableRooms: '', area: '',
        amenities: '', rules: '',
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleEdit = (prop) => {
        setForm({
            title: prop.title, description: prop.description, address: prop.address,
            city: prop.city, state: prop.state, price: prop.price, rooms: prop.rooms,
            bathrooms: prop.bathrooms, availableRooms: prop.availableRooms, area: prop.area,
            amenities: prop.amenities.join(', '), rules: prop.rules.join(', '),
        });
        setEditingId(prop.id);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setProperties((prev) => prev.filter((p) => p.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newProp = {
            id: editingId || Date.now(),
            landlordId: user.id,
            ...form,
            price: parseInt(form.price),
            rooms: parseInt(form.rooms),
            bathrooms: parseInt(form.bathrooms),
            availableRooms: parseInt(form.availableRooms),
            area: parseInt(form.area),
            amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
            rules: form.rules.split(',').map((r) => r.trim()).filter(Boolean),
            images: [],
            nearbyPlaces: [],
            available: true,
            featured: false,
        };

        if (editingId) {
            setProperties((prev) => prev.map((p) => (p.id === editingId ? newProp : p)));
        } else {
            setProperties((prev) => [...prev, newProp]);
        }

        resetForm();
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
                    {properties.map((prop) => (
                        <div key={prop.id} className="manager-property-card animate-fade-in-up">
                            <div className="manager-property-image">Sin imagen</div>
                            <div className="manager-property-content">
                                <div className="manager-property-header">
                                    <h3 className="manager-property-title">{prop.title}</h3>
                                    <span className={`badge ${prop.available ? 'badge-success' : 'badge-error'}`}>
                                        {prop.available ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                                <p className="manager-property-location">{prop.address}, {prop.city}</p>
                                <div className="manager-property-meta">
                                    <span>${prop.price.toLocaleString()}/mes</span>
                                    <span>{prop.rooms} hab. ({prop.availableRooms} disp.)</span>
                                    <span>{prop.bathrooms} baños</span>
                                    <span>{prop.area}m²</span>
                                </div>
                                <div className="manager-property-amenities">
                                    {prop.amenities.slice(0, 4).map((a, i) => (
                                        <span key={i} className="badge badge-accent">{a}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="manager-property-actions">
                                <button className="btn btn-outline btn-sm" onClick={() => handleEdit(prop)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(prop.id)}>Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>

                {properties.length === 0 && !showForm && (
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
