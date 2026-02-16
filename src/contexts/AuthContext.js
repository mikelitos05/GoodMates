import React, { createContext, useContext, useState } from 'react';
import { mockUsers } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = (email, password) => {
        // Simulated login — find user by email
        const found = mockUsers.find((u) => u.email === email);
        if (found) {
            setUser(found);
            return { success: true, user: found };
        }
        return { success: false, error: 'Credenciales inválidas' };
    };

    const register = (name, email, password, role) => {
        // Simulated register — create mock user
        const newUser = {
            id: Date.now(),
            name,
            email,
            role,
            avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase(),
            profile: role === 'tenant' ? {
                age: null,
                gender: '',
                university: '',
                career: '',
                semester: null,
                occupation: '',
                schedule: '',
                budget: null,
                city: '',
                hobbies: [],
                pets: false,
                smoking: false,
                cleanliness: 3,
                noise: 3,
                visitors: '',
                bio: '',
            } : undefined,
            properties: role === 'landlord' ? [] : undefined,
        };
        setUser(newUser);
        return { success: true, user: newUser };
    };

    const logout = () => {
        setUser(null);
    };

    const updateProfile = (profileData) => {
        setUser((prev) => ({
            ...prev,
            profile: { ...prev.profile, ...profileData },
        }));
    };

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
