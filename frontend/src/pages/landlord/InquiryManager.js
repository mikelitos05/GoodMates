import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceivedInquiries, acceptInquiry, rejectInquiry, confirmInquiry, declineInquiry, getImageUrl } from '../../services/api';
import UserAvatar from '../../components/shared/UserAvatar';
import './InquiryManager.css';

function InquiryManager() {
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todas'); // todas, pendiente, aceptada, rechazada
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        setLoading(true);
        setActionError('');
        const result = await getReceivedInquiries();
        if (result.success) {
            setInquiries(result.solicitudes || []);
        } else {
            setActionError(result.message || 'No se pudieron cargar las solicitudes');
        }
        setLoading(false);
    };

    const handleAccept = async (id) => {
        setActionError('');
        const result = await acceptInquiry(id);
        if (result.success) {
            setInquiries(prev => prev.map(s =>
                s.id_solicitud === id ? { ...s, estado: 'aceptada' } : s
            ));
            return;
        }
        setActionError(result.message || 'No se pudo aceptar la solicitud');
    };

    const handleReject = async (id) => {
        setActionError('');
        const result = await rejectInquiry(id);
        if (result.success) {
            setInquiries(prev => prev.map(s =>
                s.id_solicitud === id ? { ...s, estado: 'rechazada' } : s
            ));
            return;
        }
        setActionError(result.message || 'No se pudo rechazar la solicitud');
    };

    const handleConfirm = async (id) => {
        setActionError('');
        const result = await confirmInquiry(id);
        if (result.success) {
            const estadoFinal = result.estado || 'confirmada';
            setInquiries(prev => prev.map(s =>
                s.id_solicitud === id ? { ...s, estado: estadoFinal } : s
            ));
            return;
        }
        setActionError(result.message || 'No se pudo confirmar al inquilino');
    };

    const handleDecline = async (id) => {
        setActionError('');
        const result = await declineInquiry(id);
        if (result.success) {
            setInquiries(prev => prev.map(s =>
                s.id_solicitud === id ? { ...s, estado: 'declinada' } : s
            ));
            return;
        }
        setActionError(result.message || 'No se pudo declinar al inquilino');
    };

    const filtered = filter === 'todas'
        ? inquiries
        : inquiries.filter(s => s.estado === filter);

    const pendingCount = inquiries.filter(s => s.estado === 'pendiente').length;

    return (
        <div className="inquiry-page">
            <div className="container">
                <div className="inquiry-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Solicitudes de Informes</h1>
                        <p className="section-subtitle">
                            {pendingCount > 0
                                ? `Tienes ${pendingCount} solicitud${pendingCount > 1 ? 'es' : ''} pendiente${pendingCount > 1 ? 's' : ''}`
                                : 'No tienes solicitudes pendientes'}
                        </p>
                    </div>
                </div>

                <div className="inquiry-filters animate-fade-in-up">
                    {['todas', 'pendiente', 'aceptada', 'rechazada', 'confirmada', 'declinada'].map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1) + (f.endsWith('s') ? '' : 's')}
                            {f === 'pendiente' && pendingCount > 0 && (
                                <span className="filter-badge">{pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>
                {actionError && (
                    <p className="empty-state" style={{ color: '#b42318' }}>{actionError}</p>
                )}

                {loading ? (
                    <p className="empty-state">Cargando solicitudes...</p>
                ) : filtered.length === 0 ? (
                    <div className="no-results animate-fade-in-up">
                        <span className="no-results-icon">Sin resultados</span>
                        <h3>No hay solicitudes {filter !== 'todas' ? filter + 's' : ''}</h3>
                        <p>Cuando un inquilino solicite informes sobre una de tus propiedades, aparecerá aquí.</p>
                    </div>
                ) : (
                    <div className="inquiry-list">
                        {filtered.map((sol) => {
                            const images = sol.imagenes || [];
                            const date = new Date(sol.fecha_creacion).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            });

                            return (
                                <div key={sol.id_solicitud} className={`inquiry-card inquiry-card--${sol.estado} animate-fade-in-up`}>
                                    <div className="inquiry-card-image">
                                        {images.length > 0
                                            ? <img src={getImageUrl(images[0])} alt={sol.titulo_propiedad} />
                                            : <img src="/house-icon.png" alt="propiedad" className="inquiry-card-placeholder" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                                        }
                                    </div>
                                    <div className="inquiry-card-body">
                                        <div className="inquiry-card-top">
                                            <h3 className="inquiry-card-title">{sol.titulo_propiedad}</h3>
                                            <span className={`badge badge-${sol.estado === 'pendiente' ? 'warning' : sol.estado === 'aceptada' ? 'success' : sol.estado === 'confirmada' ? 'success' : 'error'}`}>
                                                {sol.estado === 'pendiente'
                                                    ? 'Pendiente'
                                                    : sol.estado === 'aceptada'
                                                        ? 'Aceptada'
                                                        : sol.estado === 'confirmada'
                                                                ? 'Confirmada'
                                                                : sol.estado === 'declinada'
                                                                    ? 'Declinada'
                                                                    : 'Rechazada'}
                                            </span>
                                        </div>
                                        <p className="inquiry-card-location">{sol.ciudad}</p>
                                        <div className="inquiry-card-tenant">
                                            <UserAvatar
                                                className="avatar-sm"
                                                name={`${sol.tenant_nombre || ''} ${sol.tenant_apellido || ''}`.trim()}
                                                initials={`${(sol.tenant_nombre?.[0] || '') + (sol.tenant_apellido?.[0] || '')}`}
                                                image={sol.tenant_foto_perfil}
                                            />
                                            <div>
                                                <span className="inquiry-tenant-name">{sol.tenant_nombre} {sol.tenant_apellido}</span>
                                                <span className="inquiry-tenant-email">{sol.tenant_email}</span>
                                            </div>
                                        </div>
                                        {sol.mensaje_tenant && (
                                            <p className="inquiry-card-message">"{sol.mensaje_tenant}"</p>
                                        )}
                                        <span className="inquiry-card-date">{date}</span>
                                    </div>
                                    <div className="inquiry-card-actions">
                                        {sol.estado === 'pendiente' && (
                                            <>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleAccept(sol.id_solicitud)}>
                                                    Aceptar
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(sol.id_solicitud)}>
                                                    Rechazar
                                                </button>
                                            </>
                                        )}
                                        {sol.estado === 'aceptada' && (
                                            <>
                                                <button className="btn btn-accent btn-sm" onClick={() => navigate(`/chat/${sol.id_solicitud}`)}>
                                                    Ir al chat
                                                </button>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(sol.id_solicitud)}>
                                                    Aceptar inquilino
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDecline(sol.id_solicitud)}>
                                                    Rechazar inquilino
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InquiryManager;
