const API_URL = 'http://localhost:5000/api';

// -- FUNCIONES AUXILIARES --

// Obtener el token almacenado en localStorage
const getToken = () => localStorage.getItem('token');

// Crear headers con autorizacion JWT
const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
});

// Manejar la respuesta de la API de forma unificada
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        return { success: false, error: data.message };
    }
    return { success: true, ...data };
};

// Peticion generica con manejo de errores
const apiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        return await handleResponse(response);
    } catch (error) {
        return { success: false, error: 'Error de conexion con el servidor' };
    }
};

// -- AUTENTICACION --

// Registrar un nuevo usuario
export const registerUser = async (nombre_usuario, nombre, apellido, email, password, role) => {
    const result = await apiRequest(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario, nombre, apellido, email, password, role }),
    });

    if (result.success && result.token) {
        localStorage.setItem('token', result.token);
    }

    return result;
};

// Iniciar sesion
export const loginUser = async (nombre_usuario, password) => {
    const result = await apiRequest(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario, password }),
    });

    if (result.success && result.token) {
        localStorage.setItem('token', result.token);
    }

    return result;
};

// Verificar token actual
export const verifyToken = async () => {
    const token = getToken();
    if (!token) return { success: false, error: 'No hay token' };

    return await apiRequest(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
};

// Cerrar sesion
export const logoutUser = () => {
    localStorage.removeItem('token');
};

// -- PERFILES --

// Obtener el perfil del tenant autenticado
export const getMyProfile = async () => {
    return await apiRequest(`${API_URL}/perfiles/me`, {
        headers: authHeaders(),
    });
};

// Actualizar el perfil del tenant
export const updateProfile = async (profileData) => {
    return await apiRequest(`${API_URL}/perfiles/me`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(profileData),
    });
};

// Obtener el perfil de otro tenant
export const getUserProfile = async (userId) => {
    return await apiRequest(`${API_URL}/perfiles/${userId}`, {
        headers: authHeaders(),
    });
};

// -- PROPIEDADES --

// Listar propiedades con filtros
export const getProperties = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.ciudad) params.append('ciudad', filters.ciudad);
    if (filters.precioMin) params.append('precioMin', filters.precioMin);
    if (filters.precioMax) params.append('precioMax', filters.precioMax);
    if (filters.habitaciones) params.append('habitaciones', filters.habitaciones);
    if (filters.pagina) params.append('pagina', filters.pagina);
    if (filters.limite) params.append('limite', filters.limite);

    return await apiRequest(`${API_URL}/propiedades?${params.toString()}`);
};

// Obtener detalle de una propiedad
export const getPropertyById = async (id) => {
    return await apiRequest(`${API_URL}/propiedades/${id}`);
};

// Obtener las propiedades del landlord autenticado
export const getMyProperties = async () => {
    return await apiRequest(`${API_URL}/propiedades/mis-propiedades`, {
        headers: authHeaders(),
    });
};

// Crear una propiedad con imagenes
export const createProperty = async (propertyData, imageFiles = []) => {
    try {
        const formData = new FormData();
        // Agregar campos de texto
        Object.keys(propertyData).forEach(key => {
            formData.append(key, propertyData[key]);
        });
        // Agregar imagenes
        imageFiles.forEach(file => {
            formData.append('imagenes', file);
        });

        const response = await fetch(`${API_URL}/propiedades`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData,
        });

        return await handleResponse(response);
    } catch (error) {
        return { success: false, error: 'Error de conexion con el servidor' };
    }
};

// Actualizar una propiedad
export const updateProperty = async (id, propertyData, imageFiles = []) => {
    try {
        const formData = new FormData();
        Object.keys(propertyData).forEach(key => {
            formData.append(key, propertyData[key]);
        });
        imageFiles.forEach(file => {
            formData.append('imagenes', file);
        });

        const response = await fetch(`${API_URL}/propiedades/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData,
        });

        return await handleResponse(response);
    } catch (error) {
        return { success: false, error: 'Error de conexion con el servidor' };
    }
};

// Eliminar una propiedad
export const deleteProperty = async (id) => {
    return await apiRequest(`${API_URL}/propiedades/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// -- MATCHES --

// Obtener mis matches
export const getMatches = async () => {
    return await apiRequest(`${API_URL}/matches`, {
        headers: authHeaders(),
    });
};

// Calcular compatibilidad y generar matches
export const calculateMatches = async () => {
    return await apiRequest(`${API_URL}/matches/calcular`, {
        method: 'POST',
        headers: authHeaders(),
    });
};

// Aceptar un match
export const acceptMatch = async (matchId) => {
    return await apiRequest(`${API_URL}/matches/${matchId}/aceptar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Rechazar un match
export const rejectMatch = async (matchId) => {
    return await apiRequest(`${API_URL}/matches/${matchId}/rechazar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// -- GRUPOS --

// Obtener mi grupo de roommates
export const getMyGroup = async () => {
    return await apiRequest(`${API_URL}/grupos/mi-grupo`, {
        headers: authHeaders(),
    });
};

// Crear un grupo de roommates
export const createGroup = async (nombre, idPropiedad) => {
    return await apiRequest(`${API_URL}/grupos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ nombre, id_propiedad: idPropiedad }),
    });
};

// Agregar miembro al grupo
export const addGroupMember = async (groupId, userId) => {
    return await apiRequest(`${API_URL}/grupos/${groupId}/miembros`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id_usuario: userId }),
    });
};

// Remover miembro del grupo
export const removeGroupMember = async (groupId, userId) => {
    return await apiRequest(`${API_URL}/grupos/${groupId}/miembros/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// -- TAREAS --

// Obtener tareas de un grupo
export const getGroupTasks = async (groupId) => {
    return await apiRequest(`${API_URL}/tareas/grupo/${groupId}`, {
        headers: authHeaders(),
    });
};

// Crear tarea
export const createTask = async (taskData) => {
    return await apiRequest(`${API_URL}/tareas`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(taskData),
    });
};

// Actualizar tarea
export const updateTask = async (taskId, taskData) => {
    return await apiRequest(`${API_URL}/tareas/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(taskData),
    });
};

// Completar tarea
export const completeTask = async (taskId) => {
    return await apiRequest(`${API_URL}/tareas/${taskId}/completar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Eliminar tarea
export const deleteTask = async (taskId) => {
    return await apiRequest(`${API_URL}/tareas/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// -- BOARD (MATES BOARD) --

// Obtener publicaciones del board de un grupo
export const getBoardPosts = async (groupId) => {
    return await apiRequest(`${API_URL}/board/grupo/${groupId}`, {
        headers: authHeaders(),
    });
};

// Crear publicacion en el board
export const createBoardPost = async (postData) => {
    return await apiRequest(`${API_URL}/board`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(postData),
    });
};

// Responder a una publicacion
export const replyToBoardPost = async (postId, contenido) => {
    return await apiRequest(`${API_URL}/board/${postId}/respuestas`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contenido }),
    });
};

// Eliminar publicacion
export const deleteBoardPost = async (postId) => {
    return await apiRequest(`${API_URL}/board/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// -- ADMIN --

// Obtener estadisticas del sistema
export const getAdminStats = async () => {
    return await apiRequest(`${API_URL}/admin/estadisticas`, {
        headers: authHeaders(),
    });
};

// Listar usuarios (admin)
export const getAdminUsers = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.pagina) params.append('pagina', filters.pagina);
    if (filters.limite) params.append('limite', filters.limite);
    if (filters.rol) params.append('rol', filters.rol);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.busqueda) params.append('busqueda', filters.busqueda);

    return await apiRequest(`${API_URL}/admin/usuarios?${params.toString()}`, {
        headers: authHeaders(),
    });
};

// Cambiar estado de usuario (admin)
export const changeUserStatus = async (userId, estado) => {
    return await apiRequest(`${API_URL}/admin/usuarios/${userId}/estado`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ estado }),
    });
};

// Listar propiedades (admin)
export const getAdminProperties = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.pagina) params.append('pagina', filters.pagina);
    if (filters.limite) params.append('limite', filters.limite);

    return await apiRequest(`${API_URL}/admin/propiedades?${params.toString()}`, {
        headers: authHeaders(),
    });
};

// Eliminar propiedad (admin)
export const adminDeleteProperty = async (id) => {
    return await apiRequest(`${API_URL}/admin/propiedades/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// -- CALIFICACIONES --

// Crear calificacion para un roommate
export const rateRoommate = async (ratingData) => {
    return await apiRequest(`${API_URL}/calificaciones`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(ratingData),
    });
};

// Obtener calificaciones de un usuario
export const getUserRatings = async (userId) => {
    return await apiRequest(`${API_URL}/calificaciones/usuario/${userId}`, {
        headers: authHeaders(),
    });
};
