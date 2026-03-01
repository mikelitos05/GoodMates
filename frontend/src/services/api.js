// Use the current browser hostname so the app works from any device on the same network
// e.g. from PC: http://localhost:5000/api  |  from phone: http://192.168.1.X:5000/api
const BACKEND_URL = `http://${window.location.hostname}:5000`;
const API_URL = `${BACKEND_URL}/api`;

// Helper: build full URL for images stored on the backend
export const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BACKEND_URL}${path}`;  // e.g. /uploads/propiedades/123.jpg → http://192.168.1.X:5000/uploads/propiedades/123.jpg
};

// -- FUNCIONES AUXILIARES --

// Obtener el token almacenado en localStorage
const getToken = () => localStorage.getItem('token');

// Crear headers con autorizacion JWT
const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
});

const optionalAuthHeaders = () => {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Manejar la respuesta de la API de forma unificada
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        return { success: false, error: data.message, code: data.code, ...data };
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

    return await apiRequest(`${API_URL}/propiedades?${params.toString()}`, {
        headers: optionalAuthHeaders(),
    });
};

// Obtener detalle de una propiedad
export const getPropertyById = async (id) => {
    return await apiRequest(`${API_URL}/propiedades/${id}`, {
        headers: optionalAuthHeaders(),
    });
};

// Obtener las propiedades del landlord autenticado
export const getMyProperties = async () => {
    return await apiRequest(`${API_URL}/propiedades/mis-propiedades`, {
        headers: authHeaders(),
    });
};

// Obtener inquilinos activos de una propiedad del landlord
export const getPropertyTenants = async (propertyId) => {
    return await apiRequest(`${API_URL}/propiedades/${propertyId}/inquilinos`, {
        headers: authHeaders(),
    });
};

// Remover un inquilino activo de una propiedad del landlord
export const removePropertyTenant = async (propertyId, tenantId) => {
    return await apiRequest(`${API_URL}/propiedades/${propertyId}/inquilinos/${tenantId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// Helper: append propertyData to FormData safely (skip null/undefined, stringify arrays)
const appendPropertyData = (formData, propertyData) => {
    Object.keys(propertyData).forEach(key => {
        const val = propertyData[key];
        if (val === null || val === undefined) return; // skip nulls (avoid "null" string)
        if (Array.isArray(val)) {
            formData.append(key, val.join(','));
        } else {
            formData.append(key, val);
        }
    });
};

// Crear una propiedad con imagenes
export const createProperty = async (propertyData, imageFiles = []) => {
    try {
        const formData = new FormData();
        appendPropertyData(formData, propertyData);
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
        appendPropertyData(formData, propertyData);
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

// Desvincular/eliminar un match existente
export const unlinkMatch = async (matchId) => {
    return await apiRequest(`${API_URL}/matches/${matchId}/desvincular`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
};

// Obtener todos los tenants con compatibilidad en tiempo real
export const getAllTenantsCompatibility = async () => {
    return await apiRequest(`${API_URL}/matches/all-tenants`, {
        headers: authHeaders(),
    });
};

// Solicitar un match con otro tenant
export const requestMatch = async (targetUserId) => {
    return await apiRequest(`${API_URL}/matches/${targetUserId}/solicitar`, {
        method: 'POST',
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

// Obtener estado de convivencia del tenant autenticado
export const getConvivenciaEstado = async () => {
    return await apiRequest(`${API_URL}/convivencia/estado`, {
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

// Editar publicacion en el board
export const editBoardPost = async (postId, postData) => {
    return await apiRequest(`${API_URL}/board/${postId}`, {
        method: 'PUT',
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

// Editar una respuesta
export const editBoardReply = async (postId, replyId, contenido) => {
    return await apiRequest(`${API_URL}/board/${postId}/respuestas/${replyId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ contenido }),
    });
};

// Eliminar una respuesta
export const deleteBoardReply = async (postId, replyId) => {
    return await apiRequest(`${API_URL}/board/${postId}/respuestas/${replyId}`, {
        method: 'DELETE',
        headers: authHeaders(),
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

// Crear o actualizar calificacion de grupo
export const rateGroup = async (groupData) => {
    return await apiRequest(`${API_URL}/calificaciones/grupo`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(groupData),
    });
};

// Obtener pendientes de calificacion del landlord autenticado
export const getPendingRatings = async () => {
    return await apiRequest(`${API_URL}/calificaciones/pendientes`, {
        headers: authHeaders(),
    });
};

// Omitir un pendiente de calificacion con justificacion
export const omitPendingRating = async (pendingId, motivo_omision) => {
    return await apiRequest(`${API_URL}/calificaciones/pendientes/${pendingId}/omitir`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ motivo_omision }),
    });
};

// Obtener pendientes de tenant para calificar arrendadores
export const getTenantPendingLandlordRatings = async () => {
    return await apiRequest(`${API_URL}/calificaciones/pendientes-tenant`, {
        headers: authHeaders(),
    });
};

// -- SOLICITUDES DE INFORMES --

// Crear solicitud de informes para una propiedad
export const createInquiry = async (idPropiedad, mensaje) => {
    return await apiRequest(`${API_URL}/solicitudes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id_propiedad: idPropiedad, mensaje }),
    });
};

// Obtener mis solicitudes enviadas (tenant)
export const getMyInquiries = async () => {
    return await apiRequest(`${API_URL}/solicitudes/mis-solicitudes`, {
        headers: authHeaders(),
    });
};

// Obtener solicitudes recibidas (landlord)
export const getReceivedInquiries = async () => {
    return await apiRequest(`${API_URL}/solicitudes/recibidas`, {
        headers: authHeaders(),
    });
};

// Aceptar una solicitud (landlord)
export const acceptInquiry = async (id) => {
    return await apiRequest(`${API_URL}/solicitudes/${id}/aceptar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Rechazar una solicitud (landlord)
export const rejectInquiry = async (id) => {
    return await apiRequest(`${API_URL}/solicitudes/${id}/rechazar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Confirmar inquilino (decisión final positiva tras chatear)
export const confirmInquiry = async (id) => {
    return await apiRequest(`${API_URL}/solicitudes/${id}/confirmar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Declinar inquilino (decisión final negativa tras chatear)
export const declineInquiry = async (id) => {
    return await apiRequest(`${API_URL}/solicitudes/${id}/declinar`, {
        method: 'PUT',
        headers: authHeaders(),
    });
};

// Obtener conteo de tenants interesados (landlord dashboard)
export const getInterestedCount = async () => {
    return await apiRequest(`${API_URL}/solicitudes/contador`, {
        headers: authHeaders(),
    });
};

// -- CHAT --

// Obtener mis chats activos
export const getMyChats = async () => {
    return await apiRequest(`${API_URL}/chat/mis-chats`, {
        headers: authHeaders(),
    });
};

// Obtener mensajes de un chat
export const getChatMessages = async (idSolicitud) => {
    return await apiRequest(`${API_URL}/chat/solicitud/${idSolicitud}`, {
        headers: authHeaders(),
    });
};

// Enviar mensaje en un chat
export const sendChatMessage = async (idSolicitud, contenido) => {
    return await apiRequest(`${API_URL}/chat/solicitud/${idSolicitud}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contenido }),
    });
};

// Obtener mensajes de chat tenant-tenant por match
export const getMatchChatMessages = async (idMatch) => {
    return await apiRequest(`${API_URL}/chat/match/${idMatch}`, {
        headers: authHeaders(),
    });
};

// Enviar mensaje en chat tenant-tenant por match
export const sendMatchChatMessage = async (idMatch, contenido) => {
    return await apiRequest(`${API_URL}/chat/match/${idMatch}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contenido }),
    });
};
