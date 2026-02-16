import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockTasks, mockRoommateGroup, getUserById } from '../../data/mockData';
import './TaskManager.css';

function TaskManager() {
    const { user } = useAuth();
    const group = mockRoommateGroup;
    const [tasks, setTasks] = useState(mockTasks);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');
    const [form, setForm] = useState({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
    });

    const members = group.members.map((id) => getUserById(id)).filter(Boolean);

    const filteredTasks = tasks.filter((t) => {
        if (filter === 'pending') return t.status === 'pending';
        if (filter === 'completed') return t.status === 'completed';
        if (filter === 'mine') return t.assigneeId === user?.id;
        return true;
    });

    const toggleTask = (taskId) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId
                    ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
                    : t
            )
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now(),
            groupId: group.id,
            ...form,
            assigneeId: parseInt(form.assigneeId),
            status: 'pending',
            createdAt: new Date().toISOString().split('T')[0],
        };
        setTasks((prev) => [newTask, ...prev]);
        setForm({ title: '', description: '', assigneeId: '', dueDate: '' });
        setShowForm(false);
    };

    const deleteTask = (taskId) => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
    };

    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    const totalCount = tasks.length;

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

                {/* Progress */}
                <div className="task-progress animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="progress-info">
                        <span className="progress-label">Progreso del grupo</span>
                        <span className="progress-count">{completedCount}/{totalCount} tareas completadas</span>
                    </div>
                    <div className="progress-bar" style={{ height: '12px' }}>
                        <div className="progress-fill" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}></div>
                    </div>
                </div>

                {/* New Task Form */}
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
                                            <option key={m.id} value={m.id}>{m.name}</option>
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

                {/* Filters */}
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

                {/* Task List */}
                <div className="task-list">
                    {filteredTasks.map((task) => {
                        const assignee = getUserById(task.assigneeId);
                        return (
                            <div key={task.id} className={`task-card ${task.status} animate-fade-in-up`}>
                                <button
                                    className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                                    onClick={() => toggleTask(task.id)}
                                >
                                    {task.status === 'completed' ? '✓' : ''}
                                </button>
                                <div className="task-content">
                                    <h3 className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                                        {task.title}
                                    </h3>
                                    <p className="task-description">{task.description}</p>
                                    <div className="task-meta">
                                        {assignee && (
                                            <span className="task-assignee">
                                                <span className="avatar avatar-sm">{assignee.avatar}</span>
                                                {assignee.name.split(' ')[0]}
                                            </span>
                                        )}
                                        <span className="task-due">Vence: {task.dueDate}</span>
                                        <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                            {task.status === 'completed' ? 'Completada' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                                <button className="task-delete" onClick={() => deleteTask(task.id)} title="Eliminar">
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
