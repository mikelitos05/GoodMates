import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProperties, getPropertyTenants, removePropertyTenant } from '../../services/api';
import './LandlordTenants.css';

function LandlordTenants() {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [tenants, setTenants] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const selectedProperty = useMemo(
        () => properties.find((p) => (p.id_propiedad || p.id) === selectedPropertyId) || null,
        [properties, selectedPropertyId]
    );

    useEffect(() => {
        const fetchProperties = async () => {
            setLoadingProperties(true);
            const result = await getMyProperties();
            if (result.success) {
                const props = result.propiedades || [];
                setProperties(props);
                if (props.length > 0) {
                    const firstId = props[0].id_propiedad || props[0].id;
                    setSelectedPropertyId(firstId);
                }
            } else {
                setFeedback({ type: 'error', text: result.error || 'No se pudieron cargar tus propiedades.' });
            }
            setLoadingProperties(false);
        };
        fetchProperties();
    }, []);

    useEffect(() => {
        if (!selectedPropertyId) {
            setTenants([]);
            return;
        }

        const fetchTenants = async () => {
            setLoadingTenants(true);
            const result = await getPropertyTenants(selectedPropertyId);
            if (result.success) {
                setTenants(result.inquilinos || []);
            } else {
                setTenants([]);
                setFeedback({ type: 'error', text: result.error || 'No se pudieron cargar los inquilinos.' });
            }
            setLoadingTenants(false);
        };
        fetchTenants();
    }, [selectedPropertyId]);

    const handleRemoveTenant = async (tenant) => {
        if (!selectedPropertyId) return;

        const fullName = `${tenant.nombre || ''} ${tenant.apellido || ''}`.trim() || 'este inquilino';
        const confirmRemove = window.confirm(`¿Seguro que deseas sacar a ${fullName} de la propiedad?`);
        if (!confirmRemove) return;

        const result = await removePropertyTenant(selectedPropertyId, tenant.id_usuario);
        if (result.success) {
            setTenants((prev) => prev.filter((t) => t.id_usuario !== tenant.id_usuario));
            setFeedback({ type: 'success', text: result.message || 'Inquilino removido exitosamente.' });
        } else {
            setFeedback({ type: 'error', text: result.error || 'No se pudo remover al inquilino.' });
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'Sin fecha';
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
        return parsed.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="landlord-tenants-page">
            <div className="container">
                <div className="landlord-tenants-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Gestión de Inquilinos</h1>
                        <p className="section-subtitle">
                            Administra inquilinos activos por propiedad, abre chat y remueve miembros cuando sea necesario.
                        </p>
                    </div>
                </div>

                {feedback && (
                    <div className={`landlord-tenants-alert landlord-tenants-alert--${feedback.type}`}>
                        {feedback.text}
                    </div>
                )}

                <div className="landlord-tenants-filter animate-fade-in-up">
                    <label htmlFor="propertySelect">Propiedad</label>
                    <select
                        id="propertySelect"
                        className="form-select"
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        disabled={loadingProperties || properties.length === 0}
                    >
                        {properties.length === 0 && <option value="">No tienes propiedades disponibles</option>}
                        {properties.map((property) => {
                            const id = property.id_propiedad || property.id;
                            const title = property.titulo || property.title || 'Propiedad sin titulo';
                            const city = property.ciudad || property.city || 'Sin ciudad';
                            return (
                                <option key={id} value={id}>
                                    {title} - {city}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="landlord-tenants-list animate-fade-in-up">
                    {loadingProperties || loadingTenants ? (
                        <p className="empty-state">Cargando inquilinos...</p>
                    ) : !selectedProperty ? (
                        <p className="empty-state">No hay propiedad seleccionada.</p>
                    ) : tenants.length === 0 ? (
                        <div className="no-results">
                            <h3>Sin inquilinos activos</h3>
                            <p>Esta propiedad no tiene inquilinos activos en este momento.</p>
                        </div>
                    ) : (
                        tenants.map((tenant) => {
                            const fullName = `${tenant.nombre || ''} ${tenant.apellido || ''}`.trim();
                            const initials = `${tenant.nombre?.[0] || ''}${tenant.apellido?.[0] || ''}` || 'IN';
                            return (
                                <div key={tenant.id_usuario} className="landlord-tenant-card">
                                    <div className="landlord-tenant-main">
                                        <div className="avatar avatar-lg">{initials.toUpperCase()}</div>
                                        <div>
                                            <h3 className="landlord-tenant-name">{fullName}</h3>
                                            <p className="landlord-tenant-email">{tenant.email}</p>
                                            <p className="landlord-tenant-meta">
                                                Rol: {tenant.rol_en_grupo === 'creador' ? 'Creador' : 'Miembro'} ·
                                                Desde: {formatDate(tenant.fecha_union)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="landlord-tenant-actions">
                                        <button
                                            className="btn btn-accent btn-sm"
                                            onClick={() => tenant.id_solicitud_chat && navigate(`/chat/${tenant.id_solicitud_chat}`)}
                                            disabled={!tenant.id_solicitud_chat}
                                        >
                                            Ir al chat
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveTenant(tenant)}>
                                            Sacar inquilino
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default LandlordTenants;
