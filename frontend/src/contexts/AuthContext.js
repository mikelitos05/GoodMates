import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, googleLoginUser, registerUser, verifyToken, logoutUser, updateProfile as apiUpdateProfile, getMyProfile } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const restoreSession = async () => {
            const result = await verifyToken();
            if (result.success) {
                setUser(result.user);
            }
            setLoading(false);
        };
        restoreSession();
    }, []);

    const login = async (nombre_usuario, password) => {
        const result = await loginUser(nombre_usuario, password);
        if (result.success) {
            setUser(result.user);
            return { success: true, user: result.user };
        }
        return { success: false, error: result.error, code: result.code };
    };

    const loginWithGoogle = async (googlePayloadOrToken, role = 'tenant') => {
        const result = await googleLoginUser(googlePayloadOrToken, role);
        if (result.success) {
            setUser(result.user);
            return { success: true, user: result.user };
        }
        return {
            success: false,
            error: result.error,
            code: result.code,
            requiresPhoto: result.requiresPhoto,
            role: result.role,
            email: result.email,
        };
    };

    const register = async (nombre_usuario, nombre, apellido, email, password, role) => {
        const result = await registerUser(nombre_usuario, nombre, apellido, email, password, role);
        if (result.success) {
            setUser(result.user);
            return { success: true, user: result.user };
        }
        return { success: false, error: result.error, code: result.code };
    };

    const logout = () => {
        logoutUser();
        setUser(null);
    };

    // Actualizar perfil: envía datos al backend y actualiza estado local
    const updateProfile = async (profileData) => {
        const result = await apiUpdateProfile(profileData);
        if (result.success) {
            const safeProfileData = { ...(profileData || {}) };
            delete safeProfileData.foto_perfil;
            // Actualizar el estado local del usuario con los datos del perfil
            setUser((prev) => ({
                ...prev,
                profile: { ...prev?.profile, ...safeProfileData },
                perfil_completo: result.perfil_completo !== undefined ? result.perfil_completo : prev?.perfil_completo,
                avatar: result.user?.avatar || prev?.avatar,
                profileImage: result.user?.profileImage || prev?.profileImage || null,
                foto_perfil: result.user?.foto_perfil || prev?.foto_perfil || null,
            }));
        }
        return result;
    };

    // Cargar perfil extendido del backend
    const loadProfile = async () => {
        const result = await getMyProfile();
        if (result.success && result.perfil) {
            setUser((prev) => ({
                ...prev,
                profile: result.perfil,
                avatar: result.perfil.avatar || prev?.avatar,
                profileImage: result.perfil.profileImage || prev?.profileImage || null,
                foto_perfil: result.perfil.foto_perfil || prev?.foto_perfil || null,
            }));
        }
        return result;
    };


    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-primary, #0a0a1a)',
                color: 'var(--text-primary, #fff)',
                fontSize: '1.1rem',
            }}>
                Cargando...
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, updateProfile, loadProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}

export default AuthContext;
