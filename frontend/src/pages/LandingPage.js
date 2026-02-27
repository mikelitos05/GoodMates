import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

function LandingPage() {
    const { user } = useAuth();

    return (
        <div className="landing">
            
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-orb hero-orb-1"></div>
                    <div className="hero-orb hero-orb-2"></div>
                    <div className="hero-orb hero-orb-3"></div>
                </div>
                <div className="hero-content container">
                    <div className="hero-text animate-fade-in-up">
                        <span className="hero-badge">La plataforma #1 para roommates</span>
                        <h1 className="hero-title">
                            Encuentra tu <span className="text-gradient">roommate ideal</span> y vive la mejor experiencia
                        </h1>
                        <p className="hero-subtitle">
                            GoodMates te conecta con personas compatibles para compartir vivienda.
                            Calcula tu índice de compatibilidad, organiza la convivencia y disfruta tu hogar.
                        </p>
                        <div className="hero-actions">
                            {user ? (
                                <Link to={`/${user.role}/dashboard`} className="btn btn-primary btn-lg">
                                    Ir a mi Dashboard →
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-lg">
                                        Comenzar Gratis →
                                    </Link>
                                    <Link to="/login" className="btn btn-outline btn-lg">
                                        Ya tengo cuenta
                                    </Link>
                                </>
                            )}
                        </div>
                        <div className="hero-stats">
                            <div className="hero-stat">
                                <span className="hero-stat-number">500+</span>
                                <span className="hero-stat-label">Roommates conectados</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-number">150+</span>
                                <span className="hero-stat-label">Propiedades activas</span>
                            </div>

                        </div>
                    </div>
                    <div className="hero-visual animate-fade-in">
                        <div className="hero-card-stack">
                            <div className="hero-card hero-card-1">
                                <div className="hero-card-header">
                                    <div className="avatar">CM</div>
                                    <div>
                                        <p className="hero-card-name">Carlos M.</p>
                                        <p className="hero-card-sub">ITESM · Ing. Sistemas</p>
                                    </div>
                                </div>
                                <div className="hero-card-tags">
                                    <span className="badge badge-accent">Limpio</span>
                                    <span className="badge badge-primary">Gamer</span>
                                    <span className="badge badge-warning">Matutino</span>
                                </div>
                            </div>
                            <div className="hero-card hero-card-2">
                                <div className="hero-card-header">
                                    <div className="avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>AG</div>
                                    <div>
                                        <p className="hero-card-name">Ana G.</p>
                                        <p className="hero-card-sub">UANL · Medicina</p>
                                    </div>
                                    <span className="match-badge">92% Match</span>
                                </div>
                            </div>
                            <div className="hero-card hero-card-3">
                                <div className="hero-card-header">
                                    <div className="avatar" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>LS</div>
                                    <div>
                                        <p className="hero-card-name">Laura S.</p>
                                        <p className="hero-card-sub">ITESM · Administración</p>
                                    </div>
                                    <span className="match-badge">87% Match</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            
            <section className="features">
                <div className="container">
                    <div className="features-header">
                        <h2 className="section-title">Todo lo que necesitas para vivir en armonía</h2>
                        <p className="section-subtitle">
                            GoodMates no es solo buscar roommate. Es una plataforma integral de convivencia.
                        </p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card animate-fade-in-up">
                            <div className="feature-icon">01</div>
                            <h3 className="feature-title">Compatibilidad Inteligente</h3>
                            <p className="feature-desc">
                                Nuestro algoritmo analiza tus hábitos, horarios, preferencias y estilo de vida
                                para encontrar roommates con quienes realmente encajes.
                            </p>
                        </div>
                        <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="feature-icon">02</div>
                            <h3 className="feature-title">Propiedades Verificadas</h3>
                            <p className="feature-desc">
                                Explora propiedades cerca de tu universidad o trabajo. Los landlords publican
                                información detallada con fotos y condiciones claras.
                            </p>
                        </div>
                        <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="feature-icon">03</div>
                            <h3 className="feature-title">Task Manager</h3>
                            <p className="feature-desc">
                                Organiza las tareas del hogar: limpieza, compras, pagos de servicios.
                                Asigna responsables y da seguimiento en tiempo real.
                            </p>
                        </div>
                        <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="feature-icon">04</div>
                            <h3 className="feature-title">Mates Board</h3>
                            <p className="feature-desc">
                                Comunícate con tus roomies mediante un tablero de avisos. Publica noticias,
                                invitaciones y coordina actividades del hogar.
                            </p>
                        </div>
                        <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                            <div className="feature-icon">05</div>
                            <h3 className="feature-title">Privacidad y Seguridad</h3>
                            <p className="feature-desc">
                                Tu información personal está protegida. Tú controlas qué datos compartes
                                y con quién mediante configuraciones de privacidad.
                            </p>
                        </div>
                        <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            <div className="feature-icon">06</div>
                            <h3 className="feature-title">Reputación y Calificaciones</h3>
                            <p className="feature-desc">
                                Al finalizar la convivencia, califica a tus roomies. Las métricas de reputación
                                ayudan a futuros matches más confiables.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            
            <section className="how-it-works">
                <div className="container">
                    <div className="features-header">
                        <h2 className="section-title">¿Cómo funciona?</h2>
                        <p className="section-subtitle">
                            En 4 simples pasos estarás viviendo con los roommates perfectos.
                        </p>
                    </div>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3 className="step-title">Crea tu perfil</h3>
                            <p className="step-desc">Regístrate y completa tu perfil con tus hábitos, preferencias y estilo de vida.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3 className="step-title">Encuentra matches</h3>
                            <p className="step-desc">Nuestro sistema calcula tu compatibilidad con otros usuarios automáticamente.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3 className="step-title">Elige tu espacio</h3>
                            <p className="step-desc">Explora propiedades disponibles y forma tu grupo de roommates.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">4</div>
                            <h3 className="step-title">Convive en armonía</h3>
                            <p className="step-desc">Usa el Task Manager y el Board para organizar la convivencia perfecta.</p>
                        </div>
                    </div>
                </div>
            </section>

            
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <h2 className="cta-title">¿Listo para encontrar a tu roommate ideal?</h2>
                        <p className="cta-subtitle">
                            Únete a GoodMates y haz de la búsqueda de vivienda una experiencia increíble.
                        </p>
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Crear mi cuenta gratis →
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
