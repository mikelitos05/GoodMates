import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function RegisterPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setStep(2);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            const result = register(name, email, password, role);
            if (result.success) {
                navigate(`/${role}/dashboard`);
            } else {
                setError(result.error || 'Error al registrar');
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2 className="auth-visual-title">Únete a GoodMates</h2>
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
                                {step === 1 ? '¿Quién eres?' : 'Crea tu cuenta'}
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
                        ) : (
                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label">Nombre completo</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Tu nombre completo"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>

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
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Repite tu contraseña"
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
                        )}

                        <p className="auth-switch">
                            ¿Ya tienes cuenta? <Link to="/login" className="auth-switch-link">Inicia sesión aquí</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
