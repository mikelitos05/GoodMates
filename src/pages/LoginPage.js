import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        setTimeout(() => {
            const result = login(email, password);
            if (result.success) {
                navigate(`/${result.user.role}/dashboard`);
            } else {
                setError(result.error);
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2 className="auth-visual-title">Bienvenido de vuelta</h2>
                        <p className="auth-visual-text">
                            Accede a tu cuenta para seguir conectando con roommates increíbles.
                        </p>
                        <div className="auth-visual-features">
                            <div className="auth-feature">Revisa tus matches</div>
                            <div className="auth-feature">Gestiona tus tareas</div>
                            <div className="auth-feature">Administra tu espacio</div>
                        </div>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-form-wrapper">
                        <div className="auth-header">
                            <Link to="/" className="auth-logo">
                                <img src="/logo.svg" alt="GoodMates" style={{ height: '32px', width: 'auto' }} /> Good<span className="text-gradient">Mates</span>
                            </Link>
                            <h1 className="auth-title">Iniciar Sesión</h1>
                            <p className="auth-subtitle">Ingresa tus credenciales para continuar</p>
                        </div>

                        {error && (
                            <div className="auth-error animate-fade-in">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Correo electrónico</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contraseña</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <label className="checkbox-label">
                                    <input type="checkbox" />
                                    <span>Recordarme</span>
                                </label>
                                <Link to="#" className="forgot-link">¿Olvidaste tu contraseña?</Link>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                            </button>
                        </form>

                        <div className="auth-demo-accounts">
                            <p className="demo-title">Cuentas de prueba:</p>
                            <div className="demo-list">
                                <button className="demo-account" onClick={() => { setEmail('carlos@goodmates.com'); setPassword('demo'); }}>
                                    <span className="avatar avatar-sm">CM</span>
                                    <div>
                                        <p className="demo-name">Carlos (Tenant)</p>
                                        <p className="demo-email">carlos@goodmates.com</p>
                                    </div>
                                </button>
                                <button className="demo-account" onClick={() => { setEmail('roberto@goodmates.com'); setPassword('demo'); }}>
                                    <span className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>RD</span>
                                    <div>
                                        <p className="demo-name">Roberto (Landlord)</p>
                                        <p className="demo-email">roberto@goodmates.com</p>
                                    </div>
                                </button>
                                <button className="demo-account" onClick={() => { setEmail('admin@goodmates.com'); setPassword('demo'); }}>
                                    <span className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>AD</span>
                                    <div>
                                        <p className="demo-name">Admin</p>
                                        <p className="demo-email">admin@goodmates.com</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <p className="auth-switch">
                            ¿No tienes cuenta? <Link to="/register" className="auth-switch-link">Regístrate aquí</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
