import React, { useState } from 'react';
import { mockUsers, mockProperties } from '../../data/mockData';
import './AdminDashboard.css';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users');
    const [users] = useState(mockUsers);
    const [properties] = useState(mockProperties);

    const tabs = [
        { id: 'users', label: 'Usuarios', icon: '' },
        { id: 'properties', label: 'Propiedades', icon: '' },
        { id: 'stats', label: 'Estadísticas', icon: '' },
    ];

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
                        <div className="stat-value">{users.length}</div>
                        <div className="stat-label">Usuarios Totales</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Prop.</div>
                        <div className="stat-value">{properties.length}</div>
                        <div className="stat-label">Propiedades</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Inq.</div>
                        <div className="stat-value">{users.filter((u) => u.role === 'tenant').length}</div>
                        <div className="stat-label">Inquilinos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">Arr.</div>
                        <div className="stat-value">{users.filter((u) => u.role === 'landlord').length}</div>
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
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td><span className="table-avatar">{u.avatar}</span></td>
                                            <td className="table-name">{u.name}</td>
                                            <td className="table-email">{u.email}</td>
                                            <td>
                                                <span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'landlord' ? 'badge-warning' : 'badge-primary'}`}>
                                                    {u.role === 'tenant' ? 'Inquilino' : u.role === 'landlord' ? 'Arrendador' : 'Admin'}
                                                </span>
                                            </td>
                                            <td><span className="badge badge-success">Activo</span></td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm">Ver</button>
                                            </td>
                                        </tr>
                                    ))}
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
                                    {properties.map((p) => (
                                        <tr key={p.id}>
                                            <td className="table-name">{p.title}</td>
                                            <td>{p.city}</td>
                                            <td className="table-price">${p.price.toLocaleString()}/mes</td>
                                            <td>{p.rooms} ({p.availableRooms} disp.)</td>
                                            <td>
                                                <span className={`badge ${p.available ? 'badge-success' : 'badge-error'}`}>
                                                    {p.available ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm">Ver</button>
                                            </td>
                                        </tr>
                                    ))}
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
                                            <div className="stat-bar-fill primary" style={{ width: `${(users.filter((u) => u.role === 'tenant').length / users.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{users.filter((u) => u.role === 'tenant').length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Arrendadores</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill accent" style={{ width: `${(users.filter((u) => u.role === 'landlord').length / users.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{users.filter((u) => u.role === 'landlord').length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Administradores</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill warning" style={{ width: `${(users.filter((u) => u.role === 'admin').length / users.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{users.filter((u) => u.role === 'admin').length}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="stat-chart-card">
                                <h3 className="stat-chart-title">Propiedades por disponibilidad</h3>
                                <div className="stat-bars">
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Activas</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill accent" style={{ width: `${(properties.filter((p) => p.available).length / properties.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{properties.filter((p) => p.available).length}</span>
                                    </div>
                                    <div className="stat-bar-item">
                                        <span className="stat-bar-label">Inactivas</span>
                                        <div className="stat-bar-track">
                                            <div className="stat-bar-fill error" style={{ width: `${(properties.filter((p) => !p.available).length / Math.max(properties.length, 1)) * 100}%` }}></div>
                                        </div>
                                        <span className="stat-bar-value">{properties.filter((p) => !p.available).length}</span>
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
