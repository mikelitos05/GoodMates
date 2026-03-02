import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyProfile, getUniversities, getUserRatings } from '../../services/api';
import UserAvatar from '../../components/shared/UserAvatar';
import careerCategories from '../../data/careerOptions';
import hobbyCategories from '../../data/hobbyOptions';
import mexicoStatesCities from '../../data/mexicoStatesCities';
import './TenantProfile.css';

const ADD_UNIVERSITY_VALUE = '__add_university__';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeInteger = (value, fallback = '') => {
    if (value === '' || value === null || value === undefined) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeSlider = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return 3;
    return Math.min(5, Math.max(1, parsed));
};

const normalizeHobbies = (value) => {
    const parsed = Array.isArray(value)
        ? value
        : (typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return []; } })() : []);

    return [...new Set(parsed.map((h) => normalizeText(h)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es-MX'));
};

const normalizeProfile = (profile = {}) => ({
    edad: normalizeInteger(profile.edad, ''),
    genero: normalizeText(profile.genero),
    ciudad: normalizeText(profile.ciudad),
    presupuesto: normalizeInteger(profile.presupuesto, ''),
    biografia: normalizeText(profile.biografia),
    universidad: normalizeText(profile.universidad),
    carrera: normalizeText(profile.carrera),
    semestre: normalizeInteger(profile.semestre, ''),
    ocupacion: normalizeText(profile.ocupacion),
    horario: normalizeText(profile.horario),
    visitantes: normalizeText(profile.visitantes),
    mascotas: Boolean(profile.mascotas),
    fumador: Boolean(profile.fumador),
    limpieza: normalizeSlider(profile.limpieza),
    ruido: normalizeSlider(profile.ruido),
    preferencia_visitantes: normalizeText(profile.preferencia_visitantes),
    preferencia_social: normalizeSlider(profile.preferencia_social),
    preferencia_ruido: normalizeSlider(profile.preferencia_ruido),
    preferencia_mascotas: normalizeText(profile.preferencia_mascotas),
    hobbies: normalizeHobbies(profile.hobbies),
});

const uniqueSortedList = (items = []) => (
    [...new Set(items.map((item) => normalizeText(item)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es-MX'))
);

const normalizeUniversityList = (value) => uniqueSortedList(Array.isArray(value) ? value : []);

const getStateFromCity = (city) => {
    const normalizedCity = normalizeText(city).toLowerCase();
    if (!normalizedCity) return '';

    const stateEntry = mexicoStatesCities.find((entry) =>
        entry.cities.some((stateCity) => normalizeText(stateCity).toLowerCase() === normalizedCity)
    );

    return stateEntry ? stateEntry.state : '';
};

const getStateCities = (state) => {
    const stateEntry = mexicoStatesCities.find((entry) => entry.state === state);
    return stateEntry ? stateEntry.cities : [];
};

const revokeBlobUrl = (url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};

const semesterOptions = Array.from({ length: 10 }, (_, index) => index + 1);

function TenantProfile() {
    const { user, updateProfile: ctxUpdateProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [profile, setProfile] = useState(() => normalizeProfile({}));
    const [initialProfile, setInitialProfile] = useState(() => normalizeProfile({}));
    const [selectedState, setSelectedState] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('personal');
    const [reputacion, setReputacion] = useState(null);
    const [calificaciones, setCalificaciones] = useState([]);
    const [expandedHobbyCategories, setExpandedHobbyCategories] = useState(() =>
        hobbyCategories.reduce((acc, cat, index) => {
            acc[cat.category] = index === 0;
            return acc;
        }, {})
    );

    const [universityOptions, setUniversityOptions] = useState([]);
    const [universityMode, setUniversityMode] = useState('select');
    const [customUniversity, setCustomUniversity] = useState('');

    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const photoInputRef = useRef(null);

    const availableCities = useMemo(() => getStateCities(selectedState), [selectedState]);
    const fieldsDirty = JSON.stringify(normalizeProfile(profile)) !== JSON.stringify(initialProfile);
    const isDirty = fieldsDirty || Boolean(selectedPhotoFile);
    const displayProfileImage = photoPreview || user?.profileImage || user?.foto_perfil || null;
    const isProfileIncomplete = !user?.perfil_completo;

    useEffect(() => {
        const fetchProfileAndUniversities = async () => {
            const [profileResult, universitiesResult] = await Promise.all([
                getMyProfile(),
                getUniversities(),
            ]);

            const perfilNormalizado = profileResult.success && profileResult.perfil
                ? normalizeProfile(profileResult.perfil)
                : normalizeProfile({});

            setProfile(perfilNormalizado);
            setInitialProfile(perfilNormalizado);
            setSelectedState(getStateFromCity(perfilNormalizado.ciudad));

            const backendPhoto = normalizeText(
                profileResult?.perfil?.profileImage ||
                profileResult?.perfil?.foto_perfil ||
                user?.profileImage ||
                user?.foto_perfil
            );

            if (backendPhoto) {
                setPhotoPreview(backendPhoto);
            }

            const fetchedUniversities = universitiesResult.success
                ? normalizeUniversityList(universitiesResult.universidades)
                : [];

            const withCurrentUniversity = perfilNormalizado.universidad
                ? uniqueSortedList([...fetchedUniversities, perfilNormalizado.universidad])
                : fetchedUniversities;

            setUniversityOptions(withCurrentUniversity);
            setUniversityMode('select');
            setCustomUniversity('');
        };

        fetchProfileAndUniversities();
    }, [user?.foto_perfil, user?.profileImage]);

    useEffect(() => {
        const fetchRatings = async () => {
            if (!user?.id) return;
            const result = await getUserRatings(user.id);
            if (result.success) {
                setReputacion(result.reputacion);
                setCalificaciones(result.calificaciones || []);
            }
        };

        fetchRatings();
    }, [user?.id]);

    useEffect(() => {
        const requestedSection = searchParams.get('section');
        if (requestedSection) {
            setActiveSection(requestedSection);
        }
    }, [searchParams]);

    useEffect(() => () => {
        revokeBlobUrl(photoPreview);
    }, [photoPreview]);

    const handleChange = (field, value) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    const handleHobbiesChange = (hobby) => {
        const hobbies = profile.hobbies || [];
        if (hobbies.includes(hobby)) {
            handleChange('hobbies', hobbies.filter((h) => h !== hobby));
        } else {
            handleChange('hobbies', [...hobbies, hobby]);
        }
    };

    const toggleHobbyCategory = (category) => {
        setExpandedHobbyCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const handleStateChange = (newState) => {
        setSelectedState(newState);

        if (!newState) {
            handleChange('ciudad', '');
            return;
        }

        const nextCities = getStateCities(newState);
        if (!nextCities.includes(profile.ciudad)) {
            handleChange('ciudad', '');
        }
    };

    const handleUniversitySelect = (value) => {
        if (value === ADD_UNIVERSITY_VALUE) {
            setUniversityMode('custom');
            handleChange('universidad', '');
            return;
        }

        setUniversityMode('select');
        setCustomUniversity('');
        handleChange('universidad', value);
    };

    const handleAddUniversity = () => {
        const normalizedUniversity = normalizeText(customUniversity);
        if (!normalizedUniversity) return;

        const updatedList = uniqueSortedList([...universityOptions, normalizedUniversity]);
        setUniversityOptions(updatedList);
        setUniversityMode('select');
        setCustomUniversity('');
        handleChange('universidad', normalizedUniversity);
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Selecciona un archivo de imagen valido.');
            if (photoInputRef.current) {
                photoInputRef.current.value = '';
            }
            return;
        }

        revokeBlobUrl(photoPreview);
        setSelectedPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const clearSelectedPhoto = () => {
        setSelectedPhotoFile(null);

        const fallbackImage = normalizeText(user?.profileImage || user?.foto_perfil);
        revokeBlobUrl(photoPreview);
        setPhotoPreview(fallbackImage || null);

        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        const normalizedCurrent = normalizeProfile(profile);
        const hasFieldChanges = JSON.stringify(normalizedCurrent) !== JSON.stringify(initialProfile);
        const hasPhotoChange = Boolean(selectedPhotoFile);

        if (!hasFieldChanges && !hasPhotoChange) return;

        const payload = { ...normalizedCurrent };
        if (selectedPhotoFile) {
            payload.foto_perfil = selectedPhotoFile;
        }

        setSaving(true);
        const result = await ctxUpdateProfile(payload);
        setSaving(false);

        if (result.success) {
            setProfile(normalizedCurrent);
            setInitialProfile(normalizedCurrent);
            setSelectedPhotoFile(null);

            if (photoInputRef.current) {
                photoInputRef.current.value = '';
            }

            const savedImage = normalizeText(result.user?.profileImage || result.user?.foto_perfil);
            if (savedImage) {
                revokeBlobUrl(photoPreview);
                setPhotoPreview(savedImage);
            }
        } else {
            alert('Error al guardar el perfil: ' + (result.error || 'Error desconocido'));
        }
    };

    const sections = [
        { id: 'personal', label: 'Personal', icon: '' },
        { id: 'academic', label: 'Academico', icon: '' },
        { id: 'lifestyle', label: 'Estilo de Vida', icon: '' },
        { id: 'preferences', label: 'Preferencias', icon: '' },
        { id: 'reputation', label: 'Reputacion', icon: '' },
    ];

    const socialLabels = ['Introvertido', '', 'Neutral', '', 'Extrovertido'];
    const ruidoLabels = ['Silencio total', '', 'Neutral', '', 'No me importa'];

    return (
        <div className="profile-page">
            <div className="container">
                {isProfileIncomplete && (
                    <div className="profile-incomplete-banner animate-fade-in-up">
                        <div className="banner-content">
                            <span className="banner-icon">Aviso</span>
                            <div>
                                <strong>Completa tu perfil</strong>
                                <p>Necesitas completar tu perfil para usar la plataforma. Llena al menos: edad, ciudad, horario y hobbies.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="profile-header animate-fade-in-up">
                    <div className="profile-header-left">
                        <UserAvatar
                            className="avatar-xl"
                            name={`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.username || 'Usuario'}
                            initials={user?.avatar}
                            image={displayProfileImage}
                        />
                        <div>
                            <h1 className="profile-title">{`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.username}</h1>
                            <p className="profile-email">@{user?.username}</p>
                            <span className="badge badge-primary">Inquilino</span>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
                        {saving ? 'Guardando...' : isDirty ? 'Guardar Cambios' : 'Sin cambios'}
                    </button>
                </div>

                <div className="profile-layout">
                    <div className="profile-nav">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`profile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveSection(section.id);
                                    setSearchParams({ section: section.id });
                                }}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>

                    <div className="profile-content animate-fade-in">
                        {activeSection === 'personal' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Informacion Personal</h2>

                                <div className="profile-photo-editor">
                                    <label className="form-label">Foto de perfil</label>
                                    <div className="profile-photo-editor-row">
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            className="form-input"
                                            accept="image/png,image/jpeg,image/webp,image/gif"
                                            onChange={handlePhotoChange}
                                        />
                                        {selectedPhotoFile && (
                                            <button type="button" className="btn btn-outline btn-sm" onClick={clearSelectedPhoto}>
                                                Quitar seleccion
                                            </button>
                                        )}
                                    </div>
                                    <p className="form-help-text">Formatos permitidos: JPG, PNG, WebP, GIF (maximo 5 MB).</p>
                                </div>

                                <div className="profile-form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Edad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            value={profile.edad || ''}
                                            onChange={(e) => handleChange('edad', normalizeInteger(e.target.value, ''))}
                                            placeholder="Tu edad"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Genero</label>
                                        <select className="form-select" value={profile.genero || ''} onChange={(e) => handleChange('genero', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                            <option value="No binario">No binario</option>
                                            <option value="Prefiero no decir">Prefiero no decir</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Estado</label>
                                        <select className="form-select" value={selectedState} onChange={(e) => handleStateChange(e.target.value)}>
                                            <option value="">Seleccionar estado</option>
                                            {mexicoStatesCities.map((entry) => (
                                                <option key={entry.state} value={entry.state}>{entry.state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ciudad</label>
                                        <select
                                            className="form-select"
                                            value={profile.ciudad || ''}
                                            onChange={(e) => handleChange('ciudad', e.target.value)}
                                            disabled={!selectedState}
                                        >
                                            <option value="">{selectedState ? 'Seleccionar ciudad' : 'Primero selecciona estado'}</option>
                                            {availableCities.map((city) => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Presupuesto mensual (MXN)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-input"
                                            value={profile.presupuesto || ''}
                                            onChange={(e) => handleChange('presupuesto', normalizeInteger(e.target.value, ''))}
                                            placeholder="Ej. 5000"
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                                    <label className="form-label">Biografia</label>
                                    <textarea
                                        className="form-textarea"
                                        value={profile.biografia || ''}
                                        onChange={(e) => handleChange('biografia', e.target.value)}
                                        placeholder="Cuentanos sobre ti..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        )}

                        {activeSection === 'academic' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Informacion Academica y Laboral</h2>
                                <div className="profile-form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Universidad</label>
                                        <select
                                            className="form-select"
                                            value={universityMode === 'custom' ? ADD_UNIVERSITY_VALUE : (profile.universidad || '')}
                                            onChange={(e) => handleUniversitySelect(e.target.value)}
                                        >
                                            <option value="">Seleccionar universidad</option>
                                            {universityOptions.map((university) => (
                                                <option key={university} value={university}>{university}</option>
                                            ))}
                                            <option value={ADD_UNIVERSITY_VALUE}>No encuentro mi universidad</option>
                                        </select>

                                        {universityMode === 'custom' && (
                                            <div className="university-custom-row">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={customUniversity}
                                                    onChange={(e) => setCustomUniversity(e.target.value)}
                                                    placeholder="Escribe tu universidad"
                                                />
                                                <button type="button" className="btn btn-outline btn-sm" onClick={handleAddUniversity}>
                                                    Agregar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Carrera</label>
                                        <select
                                            className="form-select"
                                            value={profile.carrera || ''}
                                            onChange={(e) => handleChange('carrera', e.target.value)}
                                        >
                                            <option value="">Seleccionar carrera</option>
                                            {careerCategories.map((cat) => (
                                                <optgroup key={cat.category} label={cat.category}>
                                                    {cat.careers.map((career) => (
                                                        <option key={career} value={career}>{career}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Semestre</label>
                                        <select
                                            className="form-select"
                                            value={profile.semestre || ''}
                                            onChange={(e) => handleChange('semestre', normalizeInteger(e.target.value, ''))}
                                        >
                                            <option value="">Seleccionar semestre</option>
                                            {semesterOptions.map((semester) => (
                                                <option key={semester} value={semester}>{semester}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ocupacion</label>
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
                                        <input
                                            type="checkbox"
                                            className="toggle-checkbox"
                                            checked={profile.mascotas || false}
                                            onChange={(e) => handleChange('mascotas', e.target.checked)}
                                        />
                                    </label>
                                    <label className="toggle-item">
                                        <span>Fumo</span>
                                        <input
                                            type="checkbox"
                                            className="toggle-checkbox"
                                            checked={profile.fumador || false}
                                            onChange={(e) => handleChange('fumador', e.target.checked)}
                                        />
                                    </label>
                                </div>

                                <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                                    <label className="form-label">Hobbies e intereses</label>
                                    {hobbyCategories.map((cat) => (
                                        <div key={cat.category} className="hobby-category-section">
                                            <button
                                                type="button"
                                                className="hobby-category-toggle"
                                                onClick={() => toggleHobbyCategory(cat.category)}
                                            >
                                                <h4 className="hobby-category-title">{cat.category}</h4>
                                                <span className="hobby-category-icon">
                                                    {expandedHobbyCategories[cat.category] ? '-' : '+'}
                                                </span>
                                            </button>
                                            {expandedHobbyCategories[cat.category] && (
                                                <div className="hobbies-grid">
                                                    {cat.hobbies.map((hobby) => (
                                                        <button
                                                            key={hobby}
                                                            type="button"
                                                            className={`hobby-tag ${(profile.hobbies || []).includes(hobby) ? 'selected' : ''}`}
                                                            onClick={() => handleHobbiesChange(hobby)}
                                                        >
                                                            {hobby}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
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
                                            onChange={(e) => handleChange('limpieza', Number.parseInt(e.target.value, 10))}
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
                                            onChange={(e) => handleChange('ruido', Number.parseInt(e.target.value, 10))}
                                            className="range-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>Silencio total</span>
                                            <span>No me importa</span>
                                        </div>
                                    </div>

                                    <div className="slider-item">
                                        <div className="slider-header">
                                            <label className="form-label">Preferencia social</label>
                                            <span className="slider-value">{socialLabels[(profile.preferencia_social || 3) - 1] || `${profile.preferencia_social}/5`}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.preferencia_social || 3}
                                            onChange={(e) => handleChange('preferencia_social', Number.parseInt(e.target.value, 10))}
                                            className="range-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>Introvertido</span>
                                            <span>Extrovertido</span>
                                        </div>
                                    </div>

                                    <div className="slider-item">
                                        <div className="slider-header">
                                            <label className="form-label">Preferencia de ruido (musica, TV)</label>
                                            <span className="slider-value">{ruidoLabels[(profile.preferencia_ruido || 3) - 1] || `${profile.preferencia_ruido}/5`}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={profile.preferencia_ruido || 3}
                                            onChange={(e) => handleChange('preferencia_ruido', Number.parseInt(e.target.value, 10))}
                                            className="range-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>Silencio total</span>
                                            <span>No me importa</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: 'var(--space-6)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Tolerancia a visitantes de otros</label>
                                        <select className="form-select" value={profile.preferencia_visitantes || ''} onChange={(e) => handleChange('preferencia_visitantes', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Me agrada">Me agrada</option>
                                            <option value="No me importa">No me importa</option>
                                            <option value="No me agrada">No me agrada</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Preferencia sobre mascotas</label>
                                        <select className="form-select" value={profile.preferencia_mascotas || ''} onChange={(e) => handleChange('preferencia_mascotas', e.target.value)}>
                                            <option value="">Seleccionar</option>
                                            <option value="Me gustan">Me gustan</option>
                                            <option value="No me importan">No me importan</option>
                                            <option value="No me gustan">No me gustan</option>
                                            <option value="Soy alergico">Soy alergico/a</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'reputation' && (
                            <div className="profile-section">
                                <h2 className="profile-section-title">Mi Reputacion</h2>
                                {reputacion && reputacion.total_calificaciones > 0 ? (
                                    <>
                                        <div className="reputation-overview">
                                            <div className="reputation-score-big">
                                                <span className="score-number">{reputacion.promedio_general}</span>
                                                <span className="score-max">/5</span>
                                            </div>
                                            <p className="reputation-count">
                                                {reputacion.total_calificaciones} calificacion{reputacion.total_calificaciones !== 1 ? 'es' : ''}
                                            </p>
                                        </div>
                                        {calificaciones.length > 0 && (
                                            <div className="reviews-list">
                                                <h3 className="reviews-title">Resenas recibidas</h3>
                                                {calificaciones.map((c) => {
                                                    const calificador = c.calificador || {};
                                                    return (
                                                        <div key={c.id} className="review-card">
                                                            <div className="review-header">
                                                                <UserAvatar
                                                                    className="avatar-sm"
                                                                    name={calificador.nombre || 'Usuario'}
                                                                    initials={calificador.avatar}
                                                                    image={calificador.profileImage || calificador.foto_perfil}
                                                                />
                                                                <div className="review-meta">
                                                                    <p className="review-author">{calificador.nombre}</p>
                                                                    <p className="review-date">{new Date(c.fecha).toLocaleDateString('es-MX')}</p>
                                                                </div>
                                                                <span className="review-score">{c.puntuacion}/5</span>
                                                            </div>
                                                            {c.comentario && <p className="review-comment">{c.comentario}</p>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="no-results" style={{ padding: 'var(--space-8)' }}>
                                        <h3>Sin calificaciones todavia</h3>
                                        <p>Cuando tus roommates te califiquen, apareceran aqui.</p>
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
