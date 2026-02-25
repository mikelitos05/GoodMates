import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyGroup, getGroupTasks, createTask, completeTask, deleteTask as deleteTaskApi } from '../../services/api';
import './TaskManager.css';

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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const groupRes = await getMyGroup();
            if (groupRes.success && groupRes.grupo) {
                setGroup(groupRes.grupo);
                const tasksRes = await getGroupTasks(groupRes.grupo.id_grupo);
                if (tasksRes.success) {
                    setTasks(tasksRes.tareas || []);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

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
        const result = await completeTask(taskId);
        if (result.success) {
            setTasks((prev) =>
                prev.map((t) => {
                    const id = t.id_tarea || t.id;
                    if (id === taskId) {
                        const currentStatus = t.estado || t.status;
                        const newStatus = (currentStatus === 'completada' || currentStatus === 'completed') ? 'pendiente' : 'completada';
                        return { ...t, estado: newStatus, status: newStatus };
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
            id_grupo: group.id_grupo,
            titulo: form.title,
            descripcion: form.description,
            id_asignado: form.assigneeId,
            fecha_limite: form.dueDate,
        });
        if (result.success) {
            const tasksRes = await getGroupTasks(group.id_grupo);
            if (tasksRes.success) setTasks(tasksRes.tareas || []);
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

    if (loading) {
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
                        {showForm ? '✕ Cancelar' : '+ Nueva Tarea'}
                    </button>
                </div>


                <div className="task-progress animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="progress-info">
                        <span className="progress-label">Progreso del grupo</span>
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
                                            <option key={m.id_usuario} value={m.id_usuario}>
                                                {m.nombre} {m.apellido}
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
                        const dueDate = task.fecha_limite || task.dueDate || '';
                        const assigneeName = task.asignado_nombre || '';
                        const assigneeApellido = task.asignado_apellido || '';
                        const isCompleted = status === 'completada' || status === 'completed';
                        const initials = assigneeName ? (assigneeName[0] + (assigneeApellido?.[0] || '')).toUpperCase() : '??';

                        return (
                            <div key={taskId} className={`task-card ${isCompleted ? 'completed' : 'pending'} animate-fade-in-up`}>
                                <button
                                    className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
                                    onClick={() => toggleTask(taskId)}
                                >
                                    {isCompleted ? '✓' : ''}
                                </button>
                                <div className="task-content">
                                    <h3 className={`task-title ${isCompleted ? 'completed' : ''}`}>
                                        {title}
                                    </h3>
                                    {description && <p className="task-description">{description}</p>}
                                    <div className="task-meta">
                                        {assigneeName && (
                                            <span className="task-assignee">
                                                <span className="avatar avatar-sm">{initials}</span>
                                                {assigneeName}
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
                        <h3>No hay tareas en esta categoría</h3>
                        <p>Crea una nueva tarea para empezar a organizar el hogar</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskManager;
