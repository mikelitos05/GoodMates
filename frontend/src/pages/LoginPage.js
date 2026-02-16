import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                navigate(`/${result.user.role}/dashboard`);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
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
                                <img src="/GoodMatesIcon.png" alt="GoodMates" style={{ height: '32px', width: 'auto' }} /> Good<span className="text-gradient">Mates</span>
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
                                <label className="form-label">Nombre de usuario</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Tu nombre de usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
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
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                            </button>
                        </form>

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
