import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyGroup, getBoardPosts, createBoardPost, replyToBoardPost } from '../../services/api';
import './MatesBoard.css';

function MatesBoard() {
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [posts, setPosts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState({ title: '', content: '', type: 'announcement' });
    const [replyText, setReplyText] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const groupRes = await getMyGroup();
            if (groupRes.success && groupRes.grupo) {
                setGroup(groupRes.grupo);
                const postsRes = await getBoardPosts(groupRes.grupo.id);
                if (postsRes.success) {
                    setPosts(postsRes.publicaciones || []);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!group) return;
        const result = await createBoardPost({
            id_grupo: group.id,
            titulo: newPost.title,
            contenido: newPost.content,
            tipo: newPost.type,
        });
        if (result.success) {
            const postsRes = await getBoardPosts(group.id_grupo);
            if (postsRes.success) setPosts(postsRes.publicaciones || []);
            setNewPost({ title: '', content: '', type: 'announcement' });
            setShowForm(false);
        }
    };

    const handleReply = async (postId) => {
        if (!replyText[postId]?.trim()) return;
        const result = await replyToBoardPost(postId, replyText[postId]);
        if (result.success && group) {
            const postsRes = await getBoardPosts(group.id);
            if (postsRes.success) setPosts(postsRes.publicaciones || []);
            setReplyText((prev) => ({ ...prev, [postId]: '' }));
        }
    };

    const typeIcons = {
        announcement: 'Aviso',
        discussion: 'Chat',
        event: 'Evento',
    };

    const typeLabels = {
        announcement: 'Aviso',
        discussion: 'Discusión',
        event: 'Evento',
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="board-page">
                <div className="container">
                    <p className="empty-state">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="board-page">
                <div className="container">
                    <div className="no-results">
                        <span className="no-results-icon">Sin grupo</span>
                        <h3>Necesitas pertenecer a un grupo</h3>
                        <p>Únete a un grupo de roommates para acceder al Mates Board.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="board-page">
            <div className="container">
                <div className="board-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Mates Board</h1>
                        <p className="section-subtitle">Comparte avisos, noticias e invitaciones con tus roommates.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancelar' : 'Nueva Publicación'}
                    </button>
                </div>


                {showForm && (
                    <div className="board-form-card animate-fade-in">
                        <form onSubmit={handleCreatePost} className="board-form">
                            <div className="form-group">
                                <label className="form-label">Tipo de publicación</label>
                                <div className="post-type-selector">
                                    {Object.entries(typeLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`post-type-btn ${newPost.type === key ? 'active' : ''}`}
                                            onClick={() => setNewPost({ ...newPost, type: key })}
                                        >
                                            {typeIcons[key]} {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newPost.title}
                                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                    placeholder="Título de tu publicación"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contenido</label>
                                <textarea
                                    className="form-textarea"
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    placeholder="Escribe tu mensaje para los roomies..."
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary">Publicar</button>
                        </form>
                    </div>
                )}


                <div className="post-feed">
                    {posts.map((post) => {
                        const postId = post.id_publicacion || post.id;
                        const authorName = post.autor_nombre || '';
                        const authorApellido = post.autor_apellido || '';
                        const authorInitials = (authorName[0] || '') + (authorApellido[0] || '');
                        const titulo = post.titulo || post.title || '';
                        const contenido = post.contenido || post.content || '';
                        const tipo = post.tipo || post.type || 'announcement';
                        const fecha = post.fecha_creacion || post.createdAt || '';
                        const replies = post.respuestas || post.replies || [];

                        return (
                            <div key={postId} className="post-card animate-fade-in-up">
                                <div className="post-header">
                                    <div className="post-author">
                                        <div className="avatar">{authorInitials.toUpperCase()}</div>
                                        <div>
                                            <p className="post-author-name">{authorName} {authorApellido}</p>
                                            <p className="post-date">{formatDate(fecha)}</p>
                                        </div>
                                    </div>
                                    <span className={`post-type-badge ${tipo}`}>
                                        {typeIcons[tipo] || tipo} {typeLabels[tipo] || tipo}
                                    </span>
                                </div>

                                <h3 className="post-title">{titulo}</h3>
                                <p className="post-content">{contenido}</p>


                                {replies.length > 0 && (
                                    <div className="post-replies">
                                        {replies.map((reply) => {
                                            const replyId = reply.id_respuesta || reply.id;
                                            const replyName = reply.autor_nombre || '';
                                            const replyApellido = reply.autor_apellido || '';
                                            const replyInitials = (replyName[0] || '') + (replyApellido[0] || '');
                                            return (
                                                <div key={replyId} className="reply-item">
                                                    <div className="avatar avatar-sm">{replyInitials.toUpperCase()}</div>
                                                    <div className="reply-content">
                                                        <span className="reply-author">{replyName} {replyApellido}</span>
                                                        <p className="reply-text">{reply.contenido || reply.content}</p>
                                                        <span className="reply-date">{formatDate(reply.fecha_creacion || reply.createdAt)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}


                                <div className="reply-input-wrapper">
                                    <div className="avatar avatar-sm">
                                        {((user?.nombre?.[0] || '') + (user?.apellido?.[0] || '')).toUpperCase() || '??'}
                                    </div>
                                    <input
                                        type="text"
                                        className="reply-input"
                                        placeholder="Escribe una respuesta..."
                                        value={replyText[postId] || ''}
                                        onChange={(e) => setReplyText({ ...replyText, [postId]: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(postId); }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={() => handleReply(postId)}>
                                        Enviar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {posts.length === 0 && (
                    <div className="no-results">
                        <span className="no-results-icon">Sin publicaciones</span>
                        <h3>Aún no hay publicaciones</h3>
                        <p>Sé el primero en compartir algo con tus roommates.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatesBoard;
