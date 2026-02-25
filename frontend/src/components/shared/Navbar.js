import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const displayName = user ? (user.username || 'Usuario') : '';
    const fullName = user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || displayName : '';

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cerrar dropdown al cambiar de ruta
    useEffect(() => {
        setDropdownOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
        setDropdownOpen(false);
    };

    const isActive = (path) => location.pathname === path;

    const getNavLinks = () => {
        if (!user) return [];

        switch (user.role) {
            case 'tenant':
                return [
                    { path: '/tenant/dashboard', label: 'Dashboard' },
                    { path: '/tenant/profile', label: 'Mi Perfil' },
                    { path: '/tenant/properties', label: 'Buscar Propiedades' },
                    { path: '/tenant/matches', label: 'Matches' },
                    { path: '/roommate/group', label: 'Mi Grupo' },
                ];
            case 'landlord':
                return [
                    { path: '/landlord/dashboard', label: 'Dashboard' },
                    { path: '/landlord/properties', label: 'Mis Propiedades' },
                ];
            case 'admin':
                return [
                    { path: '/admin/dashboard', label: 'Panel Admin' },
                ];
            default:
                return [];
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to={user ? `/${user.role}/dashboard` : '/'} className="navbar-logo">
                    <img src="/GoodMatesIcon.png" alt="GoodMates" className="logo-img" />
                    <span className="logo-text">Good<span className="logo-accent">Mates</span></span>
                </Link>

                {user && (
                    <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
                        {getNavLinks().map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
                                onClick={() => setMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}

                <div className="navbar-actions">
                    {user ? (
                        <div className="user-menu" ref={dropdownRef}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <div className="avatar avatar-sm">{user.avatar}</div>
                                <span className="user-name">{displayName}</span>
                                <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▾</span>
                            </button>
                            {dropdownOpen && (
                                <div className="user-dropdown animate-fade-in">
                                    <div className="dropdown-header">
                                        <div className="avatar">{user.avatar}</div>
                                        <div>
                                            <p className="dropdown-name">{fullName}</p>
                                            <p className="dropdown-role">{user.role === 'tenant' ? 'Inquilino' : user.role === 'landlord' ? 'Arrendador' : 'Administrador'}</p>
                                        </div>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item" onClick={handleLogout}>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn btn-ghost">Iniciar Sesión</Link>
                            <Link to="/register" className="btn btn-primary">Registrarse</Link>
                        </div>
                    )}

                    <button
                        className={`hamburger ${menuOpen ? 'active' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
