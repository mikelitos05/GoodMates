import React, { useState, useEffect } from 'react';
import { getAdminUsers, getAdminProperties, getAdminStats } from '../../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [usersRes, propsRes, statsRes] = await Promise.all([
                getAdminUsers(),
                getAdminProperties(),
                getAdminStats(),
            ]);
            if (usersRes.success) setUsers(usersRes.usuarios || []);
            if (propsRes.success) setProperties(propsRes.propiedades || []);
            if (statsRes.success) setStats(statsRes.stats || statsRes);
            setLoading(false);
        };
        fetchData();
    }, []);

    const tabs = [
        { id: 'users', label: 'Usuarios', icon: '' },
        { id: 'properties', label: 'Propiedades', icon: '' },
        { id: 'stats', label: 'Estadísticas', icon: '' },
    ];

    const totalUsers = users.length;
    const tenants = users.filter((u) => u.tipo_usuario === 'tenant' || u.role === 'tenant');
    const landlords = users.filter((u) => u.tipo_usuario === 'landlord' || u.role === 'landlord');
    const admins = users.filter((u) => u.tipo_usuario === 'admin' || u.role === 'admin');

    return (
        <div className="admin-page">
            <div className="container">
                <div className="admin-header animate-fade-in-up">
                    <h1 className="section-title">Panel de Administración</h1>
                    <p className="section-subtitle">Gestiona usuarios, propiedades y supervisa la actividad del sistema.</p>
                </div>


                <div className="admin-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="stat-card">
                        <div className="stat-icon">Usu.</div>
                        <div className="stat-value">{totalUsers}</div>
                        <div className="stat-label">Usuarios Totales</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Prop.</div>
                        <div className="stat-value">{properties.length}</div>
                        <div className="stat-label">Propiedades</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Inq.</div>
                        <div className="stat-value">{tenants.length}</div>
                        <div className="stat-label">Inquilinos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Arr.</div>
                        <div className="stat-value">{landlords.length}</div>
                        <div className="stat-label">Arrendadores</div>
                    </div>
                </div>


                <div className="admin-tabs animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>


                <div className="admin-content animate-fade-in-up">
                    {activeTab === 'users' && (
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Avatar</th>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => {
                                        const id = u.id_usuario || u.id;
                                        const nombre = u.nombre || '';
                                        const apellido = u.apellido || '';
                                        const email = u.email || '';
                                        const role = u.tipo_usuario || u.role || 'tenant';
                                        const estado = u.estado || 'activo';
                                        const initials = (nombre[0] || '') + (apellido[0] || '');

                                        return (
                                            <tr key={id}>
                                                <td><span className="table-avatar">{initials.toUpperCase()}</span></td>
                                                <td className="table-name">{nombre} {apellido}</td>
                                                <td className="table-email">{email}</td>
                                                <td>
                                                    <span className={`badge ${role === 'admin' ? 'badge-error' : role === 'landlord' ? 'badge-warning' : 'badge-primary'}`}>
                                                        {role === 'tenant' ? 'Inquilino' : role === 'landlord' ? 'Arrendador' : 'Admin'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${estado === 'activo' ? 'badge-success' : 'badge-error'}`}>
                                                        {estado === 'activo' ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm">Ver</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'properties' && (
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Propiedad</th>
                                        <th>Ciudad</th>
                                        <th>Precio</th>
                                        <th>Habitaciones</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {properties.map((p) => {
                                        const id = p.id_propiedad || p.id;
                                        const title = p.titulo || p.title || '';
                                        const city = p.ciudad || p.city || '';
                                        const price = p.precio || p.price || 0;
                                        const rooms = p.habitaciones || p.rooms || 0;
                                        const availableRooms = p.habitaciones_disponibles || p.availableRooms || 0;
                                        const available = p.disponible !== undefined ? p.disponible : (p.available !== undefined ? p.available : true);

                                        return (
                                            <tr key={id}>
                                                <td className="table-name">{title}</td>
                                                <td>{city}</td>
                                                <td className="table-price">${price.toLocaleString()}/mes</td>
                                                <td>{rooms} ({availableRooms} disp.)</td>
                                                <td>
                                                    <span className={`badge ${available ? 'badge-success' : 'badge-error'}`}>
                                                        {available ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm">Ver</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="stats-dashboard">
                            <div className="stat-chart-card">
                                <h3 className="stat-chart-title">Usuarios por tipo</h3>
                                <div className="stat-bars">
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Inquilinos</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill primary" style={{ width: `${totalUsers > 0 ? (tenants.length / totalUsers) * 100 : 0}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{tenants.length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Arrendadores</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill accent" style={{ width: `${totalUsers > 0 ? (landlords.length / totalUsers) * 100 : 0}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{landlords.length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Administradores</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill warning" style={{ width: `${totalUsers > 0 ? (admins.length / totalUsers) * 100 : 0}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{admins.length}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="stat-chart-card">
                                <h3 className="stat-chart-title">Propiedades por disponibilidad</h3>
                                <div className="stat-bars">
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Activas</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill accent" style={{ width: `${properties.length > 0 ? (properties.filter((p) => (p.disponible !== undefined ? p.disponible : p.available)).length / properties.length) * 100 : 0}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{properties.filter((p) => (p.disponible !== undefined ? p.disponible : p.available)).length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Inactivas</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill error" style={{ width: `${properties.length > 0 ? (properties.filter((p) => !(p.disponible !== undefined ? p.disponible : p.available)).length / Math.max(properties.length, 1)) * 100 : 0}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{properties.filter((p) => !(p.disponible !== undefined ? p.disponible : p.available)).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
