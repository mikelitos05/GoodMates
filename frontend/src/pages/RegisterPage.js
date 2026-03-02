import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/google';
import { loadGoogleIdentityApi } from '../utils/googleIdentityLoader';
import './LoginPage.css';

function RegisterPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const [googlePending, setGooglePending] = useState(null);
    const [googleNeedsProfile, setGoogleNeedsProfile] = useState(false);
    const [googleEmailHint, setGoogleEmailHint] = useState('');
    const [googleProfileData, setGoogleProfileData] = useState({
        nombre: '',
        apellido: '',
        nombre_usuario: '',
        foto_perfil: null,
    });

    const googleButtonRef = useRef(null);
    const { register, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setStep(2);
        setError('');
    };

    useEffect(() => {
        if (step !== 2 || role !== 'landlord' || !GOOGLE_CLIENT_ID) {
            return;
        }

        let isMounted = true;
        const initGoogleButton = async () => {
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
                                role: 'landlord',
                            };

                            const result = await loginWithGoogle(payloadBase);
                            if (result.success) {
                                navigate('/landlord/dashboard');
                            } else if (result.code === 'GOOGLE_PROFILE_REQUIRED') {
                                setGooglePending(payloadBase);
                                setGoogleNeedsProfile(true);
                                setGoogleEmailHint(result.email || '');
                                setGoogleProfileData({
                                    nombre: '',
                                    apellido: '',
                                    nombre_usuario: '',
                                    foto_perfil: null,
                                });
                                setError('Completa tus datos para finalizar tu registro de arrendador.');
                            } else {
                                setError(result.error || 'No fue posible continuar con Google.');
                            }
                        } catch (err) {
                            setError('Error de conexion con el servidor');
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
    }, [step, role, loginWithGoogle, navigate]);

    const handleTenantRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contrasenas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contrasena debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const result = await register(nombreUsuario, nombre, apellido, email, password, role);
            if (result.success) {
                navigate('/tenant/profile');
            } else {
                setError(result.error || 'Error al registrar');
            }
        } catch (err) {
            setError('Error de conexion con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleLandlordOnboardingSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!googlePending?.idToken) {
            setError('La sesion de Google expiro. Intenta nuevamente.');
            return;
        }

        if (!googleProfileData.nombre.trim() || !googleProfileData.nombre_usuario.trim()) {
            setError('Nombre y usuario son obligatorios.');
            return;
        }

        if (!googleProfileData.foto_perfil) {
            setError('La foto de perfil es obligatoria para arrendadores.');
            return;
        }

        setGoogleLoading(true);
        try {
            const result = await loginWithGoogle({
                ...googlePending,
                nombre: googleProfileData.nombre.trim(),
                apellido: googleProfileData.apellido.trim(),
                nombre_usuario: googleProfileData.nombre_usuario.trim(),
                foto_perfil: googleProfileData.foto_perfil,
            });

            if (result.success) {
                navigate('/landlord/dashboard');
            } else {
                setError(result.error || 'No fue posible finalizar tu registro.');
            }
        } catch (err) {
            setError('Error de conexion con el servidor');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2 className="auth-visual-title">Unete a GoodMates</h2>
                        <p className="auth-visual-text">
                            Crea tu cuenta y comienza a conectar con roommates compatibles o publica tus propiedades.
                        </p>
                        <div className="auth-visual-features">
                            <div className="auth-feature">Encuentra roommates compatibles</div>
                            <div className="auth-feature">Publica o busca propiedades</div>
                            <div className="auth-feature">Organiza la convivencia</div>
                        </div>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-form-wrapper">
                        <div className="auth-header">
                            <Link to="/" className="auth-logo">
                                <img src="/GoodMatesIcon.png" alt="GoodMates" style={{ height: '32px', width: 'auto' }} /> Good<span className="text-gradient">Mates</span>
                            </Link>
                            <h1 className="auth-title">
                                {step === 1 ? 'Quien eres?' : 'Crea tu cuenta'}
                            </h1>
                            <p className="auth-subtitle">
                                {step === 1
                                    ? 'Selecciona tu rol en la plataforma'
                                    : `Registro como ${role === 'tenant' ? 'Inquilino' : 'Arrendador'}`}
                            </p>
                        </div>

                        {error && (
                            <div className="auth-error animate-fade-in">
                                {error}
                            </div>
                        )}

                        {step === 1 ? (
                            <div className="role-selector">
                                <button className="role-option" onClick={() => handleRoleSelect('tenant')}>
                                    <div className="role-icon">Inquilino</div>
                                    <p className="role-title">Soy Inquilino</p>
                                    <p className="role-desc">Busco vivienda y roommates</p>
                                </button>
                                <button className="role-option" onClick={() => handleRoleSelect('landlord')}>
                                    <div className="role-icon">Arrendador</div>
                                    <p className="role-title">Soy Arrendador</p>
                                    <p className="role-desc">Publico propiedades en renta</p>
                                </button>
                            </div>
                        ) : role === 'tenant' ? (
                            <form onSubmit={handleTenantRegister} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label">Nombre de usuario</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="usuario123"
                                        value={nombreUsuario}
                                        onChange={(e) => setNombreUsuario(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Nombre</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nombre"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Apellido</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Apellido"
                                            value={apellido}
                                            onChange={(e) => setApellido(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Correo electronico</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Contrasena</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Minimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirmar contrasena</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Repite tu contrasena"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                                    {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ width: '100%' }}
                                    onClick={() => { setStep(1); setError(''); }}
                                >
                                    ← Cambiar tipo de usuario
                                </button>
                            </form>
                        ) : (
                            <div className="auth-form">
                                <p className="auth-subtitle" style={{ marginBottom: '0.5rem' }}>
                                    Registro de arrendador obligatorio con Google (cuenta Gmail) y foto de perfil.
                                </p>
                                {GOOGLE_CLIENT_ID ? (
                                    <div className={`google-login-button ${googleLoading ? 'google-login-button--loading' : ''}`}>
                                        <div ref={googleButtonRef} />
                                    </div>
                                ) : (
                                    <p className="auth-note">
                                        Falta configurar <code>REACT_APP_GOOGLE_CLIENT_ID</code> para habilitar Google.
                                    </p>
                                )}

                                {GOOGLE_CLIENT_ID && !googleReady && (
                                    <p className="auth-note">Cargando boton de Google...</p>
                                )}

                                {googleNeedsProfile && (
                                    <form onSubmit={handleLandlordOnboardingSubmit} className="google-onboarding-form">
                                        <p className="auth-subtitle">
                                            Completa tu perfil para finalizar tu registro.
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
                                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={googleLoading}>
                                            {googleLoading ? 'Finalizando...' : 'Finalizar registro'}
                                        </button>
                                    </form>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ width: '100%' }}
                                    onClick={() => { setStep(1); setError(''); }}
                                >
                                    ← Cambiar tipo de usuario
                                </button>
                            </div>
                        )}

                        <p className="auth-switch">
                            Ya tienes cuenta? <Link to="/login" className="auth-switch-link">Inicia sesion aqui</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
