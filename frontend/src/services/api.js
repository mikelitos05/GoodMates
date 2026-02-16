// Cliente API para conectar con el backend de GoodMates

const API_URL = 'http://localhost:5000/api';

// ==========================================
// Registro de usuario
// ==========================================
export const registerUser = async (username, password, fullName, role) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                full_name: fullName,
                role,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message };
        }

        // Guardar token en localStorage
        localStorage.setItem('token', data.token);

        return { success: true, user: data.user, token: data.token };
    } catch (error) {
        return { success: false, error: 'Error de conexión con el servidor' };
    }
};

// ==========================================
// Inicio de sesión
// ==========================================
export const loginUser = async (username, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message };
        }

        // Guardar token en localStorage
        localStorage.setItem('token', data.token);

        return { success: true, user: data.user, token: data.token };
    } catch (error) {
        return { success: false, error: 'Error de conexión con el servidor' };
    }
};

// ==========================================
// Verificar token (restaurar sesión)
// ==========================================
export const verifyToken = async () => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return { success: false, error: 'No hay token' };
        }

        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            localStorage.removeItem('token');
            return { success: false, error: data.message };
        }

        return { success: true, user: data.user };
    } catch (error) {
        localStorage.removeItem('token');
        return { success: false, error: 'Error de conexión con el servidor' };
    }
};

// ==========================================
// Cerrar sesión
// ==========================================
export const logoutUser = () => {
    localStorage.removeItem('token');
};
