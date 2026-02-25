import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRatings, getMyProfile, updateProfile as apiUpdateProfile } from '../../services/api';
import './TenantProfile.css';

function TenantProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState({});
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('personal');
    const [reputacion, setReputacion] = useState(null);
    const [calificaciones, setCalificaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar perfil del backend al montar
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const result = await getMyProfile();
            if (result.success && result.perfil) {
                const p = result.perfil;
                setProfile({
                    edad: p.edad || '',
                    genero: p.genero || '',
                    ciudad: p.ciudad || '',
                    presupuesto: p.presupuesto || '',
                    biografia: p.biografia || '',
                    universidad: p.universidad || '',
                    carrera: p.carrera || '',
                    semestre: p.semestre || '',
                    ocupacion: p.ocupacion || '',
                    horario: p.horario || '',
                    visitantes: p.visitantes || '',
                    mascotas: p.mascotas || false,
                    fumador: p.fumador || false,
                    limpieza: p.limpieza || 3,
                    ruido: p.ruido || 3,
                    hobbies: (typeof p.hobbies === 'string' ? JSON.parse(p.hobbies) : p.hobbies) || [],
                });
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    // Cargar calificaciones
    useEffect(() => {
        const fetchRatings = async () => {
            if (user?.id) {
                const result = await getUserRatings(user.id);
                if (result.success) {
                    setReputacion(result.reputacion);
                    setCalificaciones(result.calificaciones || []);
                }
            }
        };
        fetchRatings();
    }, [user?.id]);

    const handleChange = (field, value) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleHobbiesChange = (hobby) => {
        const hobbies = profile.hobbies || [];
        if (hobbies.includes(hobby)) {
            handleChange('hobbies', hobbies.filter((h) => h !== hobby));
        } else {
            handleChange('hobbies', [...hobbies, hobby]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await apiUpdateProfile(profile);
        setSaving(false);
        if (result.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            alert('Error al guardar el perfil: ' + (result.error || 'Error desconocido'));
        }
    };

    const allHobbies = [
        'Videojuegos', 'Gimnasio', 'Cocinar', 'Lectura', 'Yoga', 'Series',
        'Arte', 'Música', 'Fotografía', 'Running', 'Netflix', 'Deportes',
        'Viajes', 'Películas', 'Baile', 'Programación',
    ];

    const sections = [
        { id: 'personal', label: 'Personal', icon: '' },
        { id: 'academic', label: 'Académico', icon: '' },
        { id: 'lifestyle', label: 'Estilo de Vida', icon: '' },
        { id: 'preferences', label: 'Preferencias', icon: '' },
        { id: 'reputation', label: 'Reputación', icon: '' },
    ];


    return (
        <div className="profile-page">
            <div className="container">
                <div className="profile-header animate-fade-in-up">
                    <div className="profile-header-left">
                        <div className="avatar avatar-xl">{user?.avatar}</div>
                        <div>
                            <h1 className="profile-title">{`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.username}</h1>
                            <p className="profile-email">@{user?.username}</p>
                            <span className="badge badge-primary">Inquilino</span>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Cambios'}
                    </button>
                </div>

                <div className="profile-layout">

                    <div className="profile-nav">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`profile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>


                    <div className="profile-content animate-fade-in">
                        {activeSection === 'personal' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Información Personal</h2>
                                <div className="profile-form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Edad</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={profile.edad || ''}
                                            onChange={(e) => handleChange('edad', parseInt(e.target.value) || '')}
                                            placeholder="Tu edad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Género</label>
                                        <select className="form-select" value={profile.genero || ''} onChange={(e) => handleChange('genero', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                            <option value="No binario">No binario</option>
                                            <option value="Prefiero no decir">Prefiero no decir</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.ciudad || ''}
                                            onChange={(e) => handleChange('ciudad', e.target.value)}
                                            placeholder="Tu ciudad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Presupuesto mensual (MXN)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={profile.presupuesto || ''}
                                            onChange={(e) => handleChange('presupuesto', parseInt(e.target.value) || '')}
                                            placeholder="Ej. 5000"
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                                    <label className="form-label">Biografía</label>
                                    <textarea
                                        className="form-textarea"
                                        value={profile.biografia || ''}
                                        onChange={(e) => handleChange('biografia', e.target.value)}
                                        placeholder="Cuéntanos sobre ti..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        )}

                        {activeSection === 'academic' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Información Académica y Laboral</h2>
                                <div className="profile-form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Universidad</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.universidad || ''}
                                            onChange={(e) => handleChange('universidad', e.target.value)}
                                            placeholder="Tu universidad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Carrera</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.carrera || ''}
                                            onChange={(e) => handleChange('carrera', e.target.value)}
                                            placeholder="Tu carrera"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Semestre</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={profile.semestre || ''}
                                            onChange={(e) => handleChange('semestre', parseInt(e.target.value) || '')}
                                            placeholder="Semestre actual"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ocupación</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.ocupacion || ''}
                                            onChange={(e) => handleChange('ocupacion', e.target.value)}
                                            placeholder="Ej. Estudiante, Freelancer"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'lifestyle' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Estilo de Vida</h2>
                                <div className="profile-form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Horario</label>
                                        <select className="form-select" value={profile.horario || ''} onChange={(e) => handleChange('horario', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Matutino">Matutino</option>
                                            <option value="Vespertino">Vespertino</option>
                                            <option value="Nocturno">Nocturno</option>
                                            <option value="Mixto">Mixto</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visitantes</label>
                                        <select className="form-select" value={profile.visitantes || ''} onChange={(e) => handleChange('visitantes', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Raramente">Raramente</option>
                                            <option value="Ocasionalmente">Ocasionalmente</option>
                                            <option value="Frecuentemente">Frecuentemente</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="toggle-group">
                                    <label className="toggle-item">
                                        <span>Tengo mascotas</span>
                                        <input type="checkbox" className="toggle-checkbox" checked={profile.mascotas || false} onChange={(e) => handleChange('mascotas', e.target.checked)} />
                                    </label>
                                    <label className="toggle-item">
                                        <span>Fumo</span>
                                        <input type="checkbox" className="toggle-checkbox" checked={profile.fumador || false} onChange={(e) => handleChange('fumador', e.target.checked)} />
                                    </label>
                                </div>

                                <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                                    <label className="form-label">Hobbies e intereses</label>
                                    <div className="hobbies-grid">
                                        {allHobbies.map((hobby) => (
                                            <button
                                                key={hobby}
                                                className={`hobby-tag ${(profile.hobbies || []).includes(hobby) ? 'selected' : ''}`}
                                                onClick={() => handleHobbiesChange(hobby)}
                                            >
                                                {hobby}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'preferences' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Preferencias de Convivencia</h2>

                                <div className="slider-group">
                                    <div className="slider-item">
                                        <div className="slider-header">
                                            <label className="form-label">Nivel de limpieza</label>
                                            <span className="slider-value">{profile.limpieza || 3}/5</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.limpieza || 3}
                                            onChange={(e) => handleChange('limpieza', parseInt(e.target.value))}
                                            className="range-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>Relajado</span>
                                            <span>Muy limpio</span>
                                        </div>
                                    </div>

                                    <div className="slider-item">
                                        <div className="slider-header">
                                            <label className="form-label">Tolerancia al ruido</label>
                                            <span className="slider-value">{profile.ruido || 3}/5</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.ruido || 3}
                                            onChange={(e) => handleChange('ruido', parseInt(e.target.value))}
                                            className="range-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>Silencio total</span>
                                            <span>No me importa</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'reputation' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Mi Reputación</h2>
                                {reputacion && reputacion.total_calificaciones > 0 ? (
                                    <>
                                        <div className="reputation-overview">
                                            <div className="reputation-score-big">
                                                <span className="score-number">{reputacion.promedio_general}</span>
                                                <span className="score-max">/5</span>
                                            </div>
                                            <p className="reputation-count">{reputacion.total_calificaciones} calificación{reputacion.total_calificaciones !== 1 ? 'es' : ''}</p>
                                        </div>
                                        <div className="reputation-categories">
                                            <div className="reputation-category">
                                                <span className="category-label">Limpieza</span>
                                                <div className="category-bar-wrapper">
                                                    <div className="category-bar" style={{ width: `${(reputacion.promedio_limpieza / 5) * 100}%` }}></div>
                                                </div>
                                                <span className="category-value">{reputacion.promedio_limpieza}</span>
                                            </div>
                                            <div className="reputation-category">
                                                <span className="category-label">Convivencia</span>
                                                <div className="category-bar-wrapper">
                                                    <div className="category-bar" style={{ width: `${(reputacion.promedio_convivencia / 5) * 100}%` }}></div>
                                                </div>
                                                <span className="category-value">{reputacion.promedio_convivencia}</span>
                                            </div>
                                            <div className="reputation-category">
                                                <span className="category-label">Respeto a reglas</span>
                                                <div className="category-bar-wrapper">
                                                    <div className="category-bar" style={{ width: `${(reputacion.promedio_respeto_reglas / 5) * 100}%` }}></div>
                                                </div>
                                                <span className="category-value">{reputacion.promedio_respeto_reglas}</span>
                                            </div>
                                        </div>
                                        {calificaciones.length > 0 && (
                                            <div className="reviews-list">
                                                <h3 className="reviews-title">Reseñas recibidas</h3>
                                                {calificaciones.map((c) => (
                                                    <div key={c.id} className="review-card">
                                                        <div className="review-header">
                                                            <div className="avatar avatar-sm">{c.calificador.avatar}</div>
                                                            <div className="review-meta">
                                                                <p className="review-author">{c.calificador.nombre}</p>
                                                                <p className="review-date">{new Date(c.fecha).toLocaleDateString('es-MX')}</p>
                                                            </div>
                                                            <span className="review-score">{c.promedio}/5</span>
                                                        </div>
                                                        {c.comentario && <p className="review-comment">{c.comentario}</p>}
                                                        <div className="review-scores">
                                                            <span className="badge badge-accent">Limpieza: {c.limpieza}</span>
                                                            <span className="badge badge-accent">Convivencia: {c.convivencia}</span>
                                                            <span className="badge badge-accent">Reglas: {c.respeto_reglas}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="no-results" style={{ padding: 'var(--space-8)' }}>
                                        <h3>Sin calificaciones todavía</h3>
                                        <p>Cuando tus roommates te califiquen, aparecerán aquí.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TenantProfile;
