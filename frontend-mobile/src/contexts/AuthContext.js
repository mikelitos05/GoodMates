import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, verifyToken, logoutUser } from '../services/api';

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

    const login = async (email, password) => {
        const result = await loginUser(email, password);
        if (result.success) {
            setUser(result.user);
            return { success: true, user: result.user };
        }
        return { success: false, error: result.error };
    };

    const register = async (nombre, apellido, email, password, role) => {
        const result = await registerUser(nombre, apellido, email, password, role);
        if (result.success) {
            setUser(result.user);
            return { success: true, user: result.user };
        }
        return { success: false, error: result.error };
    };

    const logout = () => {
        logoutUser();
        setUser(null);
    };

    const updateProfile = (profileData) => {
        setUser((prev) => ({
            ...prev,
            profile: { ...prev.profile, ...profileData },
        }));
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
        <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
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
