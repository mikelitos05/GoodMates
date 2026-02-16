import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './TenantProfile.css';

function TenantProfile() {
    const { user, updateProfile } = useAuth();
    const [profile, setProfile] = useState(user?.profile || {});
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('personal');

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

    const handleSave = () => {
        updateProfile(profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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
    ];

    return (
        <div className="profile-page">
            <div className="container">
                <div className="profile-header animate-fade-in-up">
                    <div className="profile-header-left">
                        <div className="avatar avatar-xl">{user?.avatar}</div>
                        <div>
                            <h1 className="profile-title">{user?.full_name || user?.name}</h1>
                            <p className="profile-email">@{user?.username}</p>
                            <span className="badge badge-primary">Inquilino</span>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {saved ? 'Guardado' : 'Guardar Cambios'}
                    </button>
                </div>

                <div className="profile-layout">
                    {/* Section Nav */}
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

                    {/* Form Content */}
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
                                            value={profile.age || ''}
                                            onChange={(e) => handleChange('age', parseInt(e.target.value))}
                                            placeholder="Tu edad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Género</label>
                                        <select className="form-select" value={profile.gender || ''} onChange={(e) => handleChange('gender', e.target.value)}>
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
                                            value={profile.city || ''}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                            placeholder="Tu ciudad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Presupuesto mensual (MXN)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={profile.budget || ''}
                                            onChange={(e) => handleChange('budget', parseInt(e.target.value))}
                                            placeholder="Ej. 5000"
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                                    <label className="form-label">Biografía</label>
                                    <textarea
                                        className="form-textarea"
                                        value={profile.bio || ''}
                                        onChange={(e) => handleChange('bio', e.target.value)}
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
                                            value={profile.university || ''}
                                            onChange={(e) => handleChange('university', e.target.value)}
                                            placeholder="Tu universidad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Carrera</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.career || ''}
                                            onChange={(e) => handleChange('career', e.target.value)}
                                            placeholder="Tu carrera"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Semestre</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={profile.semester || ''}
                                            onChange={(e) => handleChange('semester', parseInt(e.target.value))}
                                            placeholder="Semestre actual"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ocupación</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.occupation || ''}
                                            onChange={(e) => handleChange('occupation', e.target.value)}
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
                                        <select className="form-select" value={profile.schedule || ''} onChange={(e) => handleChange('schedule', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Matutino">Matutino</option>
                                            <option value="Vespertino">Vespertino</option>
                                            <option value="Nocturno">Nocturno</option>
                                            <option value="Mixto">Mixto</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visitantes</label>
                                        <select className="form-select" value={profile.visitors || ''} onChange={(e) => handleChange('visitors', e.target.value)}>
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
                                        <input type="checkbox" className="toggle-checkbox" checked={profile.pets || false} onChange={(e) => handleChange('pets', e.target.checked)} />
                                    </label>
                                    <label className="toggle-item">
                                        <span>Fumo</span>
                                        <input type="checkbox" className="toggle-checkbox" checked={profile.smoking || false} onChange={(e) => handleChange('smoking', e.target.checked)} />
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
                                            <span className="slider-value">{profile.cleanliness || 3}/5</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.cleanliness || 3}
                                            onChange={(e) => handleChange('cleanliness', parseInt(e.target.value))}
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
                                            <span className="slider-value">{profile.noise || 3}/5</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.noise || 3}
                                            onChange={(e) => handleChange('noise', parseInt(e.target.value))}
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
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TenantProfile;
