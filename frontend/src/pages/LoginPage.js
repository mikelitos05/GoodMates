import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/google';
import { loadGoogleIdentityApi } from '../utils/googleIdentityLoader';
import './LoginPage.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleRole, setGoogleRole] = useState('tenant');
    const [googleReady, setGoogleReady] = useState(false);
    const [googlePending, setGooglePending] = useState(null);
    const [googleNeedsProfile, setGoogleNeedsProfile] = useState(false);
    const [googleRequiresPhoto, setGoogleRequiresPhoto] = useState(false);
    const [googleEmailHint, setGoogleEmailHint] = useState('');
    const [googleProfileData, setGoogleProfileData] = useState({
        nombre: '',
        apellido: '',
        nombre_usuario: '',
        foto_perfil: null,
    });
    const googleButtonRef = useRef(null);
    const googleRoleRef = useRef('tenant');
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        googleRoleRef.current = googleRole;
    }, [googleRole]);

    const navigateAfterAuth = useCallback((authUser) => {
        if (authUser.role === 'tenant' && !authUser.perfil_completo) {
            navigate('/tenant/profile');
            return;
        }
        navigate(`/${authUser.role}/dashboard`);
    }, [navigate]);

    useEffect(() => {
        let isMounted = true;

        const initGoogleButton = async () => {
            if (!GOOGLE_CLIENT_ID) {
                setGoogleReady(false);
                return;
            }

            try {
                await loadGoogleIdentityApi();
                if (!isMounted || !googleButtonRef.current || !window.google?.accounts?.id) return;

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: async (response) => {
                        if (!response?.credential) {
                            setError('No se recibio una credencial valida de Google.');
                            return;
                        }

                        setError('');
                        setGoogleLoading(true);

                        try {
                            const payloadBase = {
                                idToken: response.credential,
                                role: googleRoleRef.current,
                            };

                            const result = await loginWithGoogle(payloadBase);
                            if (result.success) {
                                setGoogleNeedsProfile(false);
                                setGooglePending(null);
                                navigateAfterAuth(result.user);
                            } else if (result.code === 'GOOGLE_PROFILE_REQUIRED') {
                                setGoogleNeedsProfile(true);
                                setGoogleRequiresPhoto(Boolean(result.requiresPhoto));
                                setGoogleEmailHint(result.email || '');
                                setGooglePending(payloadBase);
                                setGoogleProfileData({
                                    nombre: '',
                                    apellido: '',
                                    nombre_usuario: '',
                                    foto_perfil: null,
                                });
                                setError('Completa tu nombre y usuario para terminar el registro con Google.');
                            } else {
                                setError(result.error || 'No fue posible iniciar sesion con Google.');
                            }
                        } catch (err) {
                            setError('Error de conexion con el servidor.');
                        } finally {
                            setGoogleLoading(false);
                        }
                    },
                });

                googleButtonRef.current.innerHTML = '';
                const buttonWidth = Math.min(360, Math.floor(googleButtonRef.current.offsetWidth || 360));
                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'pill',
                    width: buttonWidth,
                });

                setGoogleReady(true);
            } catch (err) {
                if (isMounted) {
                    setGoogleReady(false);
                }
            }
        };

        initGoogleButton();

        return () => {
            isMounted = false;
        };
    }, [loginWithGoogle, navigateAfterAuth]);

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
            setError('Error de conexion con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!googlePending?.idToken) {
            setError('La sesion de Google expiro. Intenta de nuevo.');
            return;
        }

        if (!googleProfileData.nombre.trim() || !googleProfileData.nombre_usuario.trim()) {
            setError('Nombre y usuario son obligatorios.');
            return;
        }

        if (googleRequiresPhoto && !googleProfileData.foto_perfil) {
            setError('La foto de perfil es obligatoria para cuentas de arrendador.');
            return;
        }

        setGoogleLoading(true);
        try {
            const payload = {
                ...googlePending,
                nombre: googleProfileData.nombre.trim(),
                apellido: googleProfileData.apellido.trim(),
                nombre_usuario: googleProfileData.nombre_usuario.trim(),
                foto_perfil: googleProfileData.foto_perfil,
            };
            const result = await loginWithGoogle(payload);
            if (result.success) {
                setGoogleNeedsProfile(false);
                setGooglePending(null);
                navigateAfterAuth(result.user);
            } else {
                setError(result.error || 'No fue posible completar el registro con Google.');
            }
        } catch (err) {
            setError('Error de conexion con el servidor.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2 className="auth-visual-title">Bienvenido de vuelta</h2>
                        <p className="auth-visual-text">
                            Accede a tu cuenta para seguir conectando con roommates increibles.
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
                            <h1 className="auth-title">Iniciar Sesion</h1>
                            <p className="auth-subtitle">Ingresa tus credenciales para continuar</p>
                        </div>

                        {error && (
                            <div className="auth-error animate-fade-in">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Nombre de usuario o correo</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="usuario o correo@email.com"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contrasena</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="********"
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

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || googleLoading}>
                                {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
                            </button>
                        </form>

                        <div className="auth-divider">
                            <span className="auth-divider-line" />
                            <span className="auth-divider-text">o</span>
                            <span className="auth-divider-line" />
                        </div>

                        <div className="google-login-section">
                            <p className="auth-subtitle" style={{ marginBottom: '0.75rem' }}>
                                Si es tu primera vez con Google, elige tu rol:
                            </p>
                            <div className="google-role-selector">
                                <button
                                    type="button"
                                    className={`google-role-option ${googleRole === 'tenant' ? 'google-role-option--active' : ''}`}
                                    onClick={() => setGoogleRole('tenant')}
                                    disabled={googleLoading}
                                >
                                    Inquilino
                                </button>
                                <button
                                    type="button"
                                    className={`google-role-option ${googleRole === 'landlord' ? 'google-role-option--active' : ''}`}
                                    onClick={() => setGoogleRole('landlord')}
                                    disabled={googleLoading}
                                >
                                    Arrendador
                                </button>
                            </div>

                            {GOOGLE_CLIENT_ID ? (
                                <div className={`google-login-button ${googleLoading ? 'google-login-button--loading' : ''}`}>
                                    <div ref={googleButtonRef} />
                                </div>
                            ) : (
                                <p className="auth-note">
                                    Falta configurar <code>REACT_APP_GOOGLE_CLIENT_ID</code> para habilitar login con Google.
                                </p>
                            )}

                            {GOOGLE_CLIENT_ID && !googleReady && (
                                <p className="auth-note">Cargando boton de Google...</p>
                            )}

                            {googleNeedsProfile && (
                                <form onSubmit={handleGoogleProfileSubmit} className="google-onboarding-form">
                                    <p className="auth-subtitle">
                                        Completa tu perfil para finalizar tu acceso con Google.
                                        {googleEmailHint ? ` (${googleEmailHint})` : ''}
                                    </p>
                                    <div className="form-group">
                                        <label className="form-label">Nombre</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={googleProfileData.nombre}
                                            onChange={(e) => setGoogleProfileData((prev) => ({ ...prev, nombre: e.target.value }))}
                                            placeholder="Tu nombre real"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Apellido (opcional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={googleProfileData.apellido}
                                            onChange={(e) => setGoogleProfileData((prev) => ({ ...prev, apellido: e.target.value }))}
                                            placeholder="Tu apellido"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nombre de usuario</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={googleProfileData.nombre_usuario}
                                            onChange={(e) => setGoogleProfileData((prev) => ({ ...prev, nombre_usuario: e.target.value }))}
                                            placeholder="usuario123"
                                            required
                                        />
                                    </div>
                                    {googleRequiresPhoto && (
                                        <div className="form-group">
                                            <label className="form-label">Foto de perfil</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                accept="image/*"
                                                onChange={(e) => setGoogleProfileData((prev) => ({
                                                    ...prev,
                                                    foto_perfil: e.target.files?.[0] || null,
                                                }))}
                                                required
                                            />
                                        </div>
                                    )}
                                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={googleLoading}>
                                        {googleLoading ? 'Finalizando...' : 'Finalizar con Google'}
                                    </button>
                                </form>
                            )}
                        </div>

                        <p className="auth-switch">
                            No tienes cuenta? <Link to="/register" className="auth-switch-link">Registrate aqui</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
