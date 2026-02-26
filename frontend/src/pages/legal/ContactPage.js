import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

function ContactPage() {
    const [form, setForm] = useState({
        nombre: '',
        email: '',
        asunto: '',
        mensaje: '',
    });
    const [sent, setSent] = useState(false);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: Integrar con backend para envío de formulario de contacto
        setSent(true);
    };

    return (
        <div className="legal-page">
            <div className="container">
                <div className="legal-header animate-fade-in-up">
                    <h1 className="section-title">Contacto</h1>
                    <p className="legal-subtitle">
                        ¿Tienes preguntas, sugerencias o necesitas ayuda? Estamos aquí para asistirte. Contáctanos por cualquiera de los medios disponibles.
                    </p>
                </div>

                <div className="contact-grid animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    {/* Información de contacto */}
                    <div className="contact-info-card">
                        <h2 className="contact-info-title">Información de Contacto</h2>

                        <div className="contact-item">
                            <div className="contact-item-icon">Email</div>
                            <div>
                                <p className="contact-item-label">Correo de soporte</p>
                                <p className="contact-item-value">soporte@goodmates.mx</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-item-icon">Privacidad</div>
                            <div>
                                <p className="contact-item-label">Privacidad y datos personales</p>
                                <p className="contact-item-value">privacidad@goodmates.mx</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-item-icon">Ubicación</div>
                            <div>
                                <p className="contact-item-label">Ubicación</p>
                                <p className="contact-item-value">Monterrey, Nuevo León, México</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-item-icon">Horario</div>
                            <div>
                                <p className="contact-item-label">Horario de atención</p>
                                <p className="contact-item-value">Lunes a Viernes, 9:00 - 18:00 hrs (CST)</p>
                            </div>
                        </div>

                        <hr className="legal-divider" />

                        <div className="legal-text">
                            <p style={{ margin: 0 }}>
                                <strong>Tiempo de respuesta estimado:</strong> 1-3 días hábiles. Para solicitudes urgentes relacionadas con la seguridad de tu cuenta, incluye "URGENTE" en el asunto de tu mensaje.
                            </p>
                        </div>
                    </div>

                    {/* Formulario */}
                    <div className="contact-form-card">
                        <h2 className="contact-form-title">Envíanos un Mensaje</h2>

                        {sent ? (
                            <div className="contact-success animate-fade-in">
                                <div className="contact-success-icon">OK</div>
                                <h3>¡Mensaje Enviado!</h3>
                                <p>Hemos recibido tu mensaje. Te responderemos a la brevedad posible al correo electrónico proporcionado.</p>
                                <button
                                    className="btn btn-outline"
                                    style={{ marginTop: 'var(--space-4)' }}
                                    onClick={() => {
                                        setSent(false);
                                        setForm({ nombre: '', email: '', asunto: '', mensaje: '' });
                                    }}
                                >
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="contact-form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nombre completo</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={form.nombre}
                                            onChange={(e) => handleChange('nombre', e.target.value)}
                                            placeholder="Tu nombre"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Correo electrónico</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={form.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="tu@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Asunto</label>
                                    <select
                                        className="form-select"
                                        value={form.asunto}
                                        onChange={(e) => handleChange('asunto', e.target.value)}
                                        required
                                    >
                                        <option value="">Selecciona un tema</option>
                                        <option value="soporte">Soporte técnico</option>
                                        <option value="cuenta">Problemas con mi cuenta</option>
                                        <option value="privacidad">Privacidad y datos personales (ARCO)</option>
                                        <option value="reporte">Reportar un usuario o propiedad</option>
                                        <option value="sugerencia">Sugerencia o mejora</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mensaje</label>
                                    <textarea
                                        className="form-textarea"
                                        value={form.mensaje}
                                        onChange={(e) => handleChange('mensaje', e.target.value)}
                                        placeholder="Describe tu consulta con el mayor detalle posible..."
                                        rows={6}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                    Enviar Mensaje
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* FAQ rápido */}
                <div className="legal-content animate-fade-in-up" style={{ animationDelay: '0.2s', marginTop: 'var(--space-12)' }}>
                    <div className="legal-card">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">FAQ</div>
                            <div>
                                <h2 className="legal-card-title">Preguntas Frecuentes</h2>
                                <p className="legal-card-subtitle">Respuestas rápidas a consultas comunes</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p><strong>¿GoodMates gestiona contratos de renta?</strong></p>
                            <p>No. GoodMates es una plataforma tecnológica intermediaria. Los acuerdos legales, contractuales y financieros derivados de la renta son responsabilidad exclusiva de las partes involucradas y se gestionan fuera de la plataforma.</p>

                            <hr className="legal-divider" />

                            <p><strong>¿Cómo puedo eliminar mi cuenta y mis datos?</strong></p>
                            <p>Puedes ejercer tu derecho de cancelación enviando un correo a privacidad@goodmates.mx con tu nombre y correo registrado. Tus datos serán eliminados en un plazo máximo de 30 días hábiles.</p>

                            <hr className="legal-divider" />

                            <p><strong>¿Quién puede ver mi perfil de convivencia?</strong></p>
                            <p>Tu perfil detallado es privado. Solo se comparte información limitada y esencial cuando se genera un match o dentro de tu grupo de roommates, para el funcionamiento del Índice de Compatibilidad.</p>

                            <hr className="legal-divider" />

                            <p><strong>¿Qué hago si encuentro información falsa en una publicación?</strong></p>
                            <p>Puedes reportar la publicación o el usuario a través del formulario de contacto seleccionando el asunto "Reportar un usuario o propiedad". Nuestro equipo revisará el caso.</p>
                        </div>
                    </div>
                </div>

                <div className="legal-nav animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <Link to="/terminos" className="legal-nav-link">Términos y Condiciones</Link>
                    <Link to="/privacidad" className="legal-nav-link">Aviso de Privacidad</Link>
                    <Link to="/contacto" className="legal-nav-link active">Contacto</Link>
                </div>
            </div>
        </div>
    );
}

export default ContactPage;
