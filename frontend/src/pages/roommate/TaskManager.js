import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyGroup, getGroupTasks, createTask, completeTask, deleteTask as deleteTaskApi } from '../../services/api';
import UserAvatar from '../../components/shared/UserAvatar';
import './TaskManager.css';

// Build a string for the week span "28 Feb - 6 Mar"
const formatWeekSpan = (sundayStr) => {
    if (!sundayStr) return '';
    const start = new Date(sundayStr + 'T12:00:00'); // enforce noon to avoid timezone shift
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startObj = { day: start.getDate(), month: start.toLocaleString('es-MX', { month: 'short' }) };
    const endObj = { day: end.getDate(), month: end.toLocaleString('es-MX', { month: 'short' }), year: end.getFullYear() };

    if (start.getMonth() === end.getMonth()) {
        return `${startObj.day} al ${endObj.day} de ${endObj.month} ${endObj.year}`;
    }
    return `${startObj.day} ${startObj.month} al ${endObj.day} ${endObj.month} ${endObj.year}`;
};

function TaskManager() {
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
    });

    // Week navigation state
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dom = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dom}`;
    });

    const fetchTasks = async (groupId, weekStr) => {
        setLoading(true);
        // Include specific week to filter only those and process carry-over
        const tasksRes = await getGroupTasks(groupId);
        if (tasksRes.success) {
            // Because our getGroupTasks might fetch all or just one depending on API implementation
            // The safest is to filter client side or pass `?semana=` to backend. 
            // In `getGroupTasks` (api.js) it currently doesn't take params but let's assume it gets all 
            // and we filter here by weekStart. Or ideally modify api.js but here we just filter the result:
            const allTasks = tasksRes.tareas || [];
            if (weekStr) {
                setTasks(allTasks.filter(t => t.weekStart === weekStr));
            } else {
                setTasks(allTasks);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            const groupRes = await getMyGroup();
            if (groupRes.success && groupRes.grupo) {
                setGroup(groupRes.grupo);
                await fetchTasks(groupRes.grupo.id, currentWeekStart);
            } else {
                setLoading(false);
            }
        };
        fetchInitial();
    }, []); // Run once on mount. 

    // Handle week navigation change
    useEffect(() => {
        if (group) {
            fetchTasks(group.id, currentWeekStart);
        }
    }, [currentWeekStart]);

    const changeWeek = (direction) => {
        const d = new Date(currentWeekStart + 'T12:00:00');
        d.setDate(d.getDate() + (direction * 7));
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const members = group?.miembros || [];

    const filteredTasks = tasks.filter((t) => {
        const status = t.estado || t.status;
        const assignee = t.id_asignado || t.assigneeId;
        if (filter === 'pending') return status === 'pendiente' || status === 'pending';
        if (filter === 'completed') return status === 'completada' || status === 'completed';
        if (filter === 'mine') return assignee === user?.id;
        return true;
    });

    const toggleTask = async (taskId) => {
        const currentTask = tasks.find((t) => (t.id_tarea || t.id) === taskId);
        if (!currentTask) return;

        const currentStatus = currentTask.estado || currentTask.status;
        const newStatus = (currentStatus === 'completada' || currentStatus === 'completed') ? 'pendiente' : 'completada';
        const result = await completeTask(taskId, newStatus);
        if (result.success) {
            setTasks((prev) =>
                prev.map((t) => {
                    const id = t.id_tarea || t.id;
                    if (id === taskId) {
                        const persistedStatus = result.estado || newStatus;
                        return { ...t, estado: persistedStatus, status: persistedStatus };
                    }
                    return t;
                })
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!group) return;
        const result = await createTask({
            id_grupo: group.id,
            titulo: form.title,
            descripcion: form.description,
            id_asignado: form.assigneeId,
            fecha_vencimiento: form.dueDate,
        });
        if (result.success) {
            await fetchTasks(group.id, currentWeekStart);
            setForm({ title: '', description: '', assigneeId: '', dueDate: '' });
            setShowForm(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        const result = await deleteTaskApi(taskId);
        if (result.success) {
            setTasks((prev) => prev.filter((t) => (t.id_tarea || t.id) !== taskId));
        }
    };

    const completedCount = tasks.filter((t) => (t.estado || t.status) === 'completada' || (t.estado || t.status) === 'completed').length;
    const totalCount = tasks.length;

    // Is it current week?
    const isCurrentWeek = () => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const dom = String(today.getDate()).padStart(2, '0');
        const thisSunday = `${year}-${month}-${dom}`;
        return currentWeekStart === thisSunday;
    };

    if (loading && !tasks.length) {
        return (
            <div className="task-page">
                <div className="container">
                    <p className="empty-state">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="task-page">
                <div className="container">
                    <div className="no-results">
                        <span className="no-results-icon">Sin grupo</span>
                        <h3>Necesitas pertenecer a un grupo</h3>
                        <p>Únete a un grupo de roommates para acceder al Task Manager.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="task-page">
            <div className="container">
                <div className="task-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Task Manager</h1>
                        <p className="section-subtitle">Organiza y da seguimiento a las tareas del hogar.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancelar' : '+ Nueva Tarea'}
                    </button>
                </div>

                <div className="week-navigation animate-fade-in-up">
                    <button className="btn btn-ghost btn-icon" onClick={() => changeWeek(-1)}>
                        &#8592;
                    </button>
                    <div className="week-label">
                        <span className="week-dates">{formatWeekSpan(currentWeekStart)}</span>
                        {isCurrentWeek() && <span className="badge badge-primary badge-sm ml-2">Semana Actual</span>}
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => changeWeek(1)}>
                        &#8594;
                    </button>
                </div>

                <div className="task-progress animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="progress-info">
                        <span className="progress-label">Progreso de la semana</span>
                        <span className="progress-count">{completedCount}/{totalCount} tareas completadas</span>
                    </div>
                    <div className="progress-bar" style={{ height: '12px' }}>
                        <div className="progress-fill" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}></div>
                    </div>
                </div>


                {showForm && (
                    <div className="task-form-card animate-fade-in">
                        <h2 className="form-card-title">Nueva Tarea</h2>
                        <form onSubmit={handleSubmit} className="task-form">
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="¿Qué necesitan hacer?"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <textarea
                                    className="form-textarea"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Detalles adicionales..."
                                />
                            </div>
                            <div className="task-form-row">
                                <div className="form-group">
                                    <label className="form-label">Asignar a</label>
                                    <select className="form-select" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} required>
                                        <option value="">Seleccionar...</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha límite</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary">Crear Tarea</button>
                        </form>
                    </div>
                )}


                <div className="task-filters animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {['all', 'pending', 'completed', 'mine'].map((f) => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completadas' : 'Mis tareas'}
                        </button>
                    ))}
                </div>


                <div className="task-list">
                    {filteredTasks.map((task) => {
                        const taskId = task.id_tarea || task.id;
                        const title = task.titulo || task.title;
                        const description = task.descripcion || task.description || '';
                        const status = task.estado || task.status || 'pendiente';
                        const dueDate = task.fecha_vencimiento || task.dueDate || '';
                        const assigneeName = task.asignado_nombre || task.assigneeName || '';
                        const assigneeApellido = task.asignado_apellido || '';
                        const assigneePhoto = task.assigneePhoto || task.profileImage || task.foto_perfil || null;
                        const assigneeAvatar = task.assigneeAvatar || null;
                        const isCompleted = status === 'completada' || status === 'completed';

                        let initials = '??';
                        if (assigneeName && assigneeName !== 'Sin asignar') {
                            const nameParts = assigneeName.split(' ');
                            if (nameParts.length > 1) {
                                initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                            } else {
                                initials = (nameParts[0][0] + (assigneeApellido?.[0] || '')).toUpperCase();
                            }
                        }

                        return (
                            <div key={taskId} className={`task-card ${isCompleted ? 'completed' : 'pending'} animate-fade-in-up`}>
                                <button
                                    className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
                                    onClick={() => toggleTask(taskId)}
                                >
                                    {isCompleted ? 'OK' : ''}
                                </button>
                                <div className="task-content">
                                    <h3 className={`task-title ${isCompleted ? 'completed' : ''}`}>
                                        {title}
                                    </h3>
                                    {description && <p className="task-description">{description}</p>}
                                    <div className="task-meta">
                                        {assigneeName && assigneeName !== 'Sin asignar' && (
                                            <span className="task-assignee">
                                                <UserAvatar
                                                    className="avatar-sm"
                                                    name={assigneeName}
                                                    initials={assigneeAvatar || initials}
                                                    image={assigneePhoto}
                                                />
                                                {assigneeName.split(' ')[0]}
                                            </span>
                                        )}
                                        {dueDate && <span className="task-due">Vence: {dueDate.split('T')[0]}</span>}
                                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
                                            {isCompleted ? 'Completada' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                                <button className="task-delete" onClick={() => handleDeleteTask(taskId)} title="Eliminar">
                                    Eliminar
                                </button>
                            </div>
                        );
                    })}
                </div>

                {filteredTasks.length === 0 && (
                    <div className="no-results">
                        <span className="no-results-icon">Sin tareas</span>
                        <h3>No hay tareas para esta semana</h3>
                        <p>Crea una nueva tarea o navega a otra semana.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskManager;
