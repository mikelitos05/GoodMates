import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyGroup, getBoardPosts, createBoardPost, editBoardPost, deleteBoardPost, replyToBoardPost, editBoardReply, deleteBoardReply } from '../../services/api';
import UserAvatar from '../../components/shared/UserAvatar';
import './MatesBoard.css';

function MatesBoard() {
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [posts, setPosts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState({ title: '', content: '', type: 'announcement' });
    const [replyText, setReplyText] = useState({});

    // Edit states
    const [editingPost, setEditingPost] = useState(null);
    const [editPostData, setEditPostData] = useState({ title: '', content: '', type: 'announcement' });
    const [editingReply, setEditingReply] = useState(null);
    const [editReplyText, setEditReplyText] = useState('');

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

    const fetchPosts = async (groupId) => {
        const postsRes = await getBoardPosts(groupId);
        if (postsRes.success) setPosts(postsRes.publicaciones || []);
    };

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
            await fetchPosts(group.id);
            setNewPost({ title: '', content: '', type: 'announcement' });
            setShowForm(false);
        }
    };

    const handleEditPost = async (postId) => {
        const result = await editBoardPost(postId, {
            titulo: editPostData.title,
            contenido: editPostData.content,
            tipo: editPostData.type,
        });
        if (result.success && group) {
            await fetchPosts(group.id);
            setEditingPost(null);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
        const result = await deleteBoardPost(postId);
        if (result.success && group) {
            await fetchPosts(group.id);
        }
    };

    const handleReply = async (postId) => {
        if (!replyText[postId]?.trim()) return;
        const result = await replyToBoardPost(postId, replyText[postId]);
        if (result.success && group) {
            await fetchPosts(group.id);
            setReplyText((prev) => ({ ...prev, [postId]: '' }));
        }
    };

    const handleEditReply = async (postId, replyId) => {
        if (!editReplyText.trim()) return;
        const result = await editBoardReply(postId, replyId, editReplyText);
        if (result.success && group) {
            await fetchPosts(group.id);
            setEditingReply(null);
        }
    };

    const handleDeleteReply = async (postId, replyId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;
        const result = await deleteBoardReply(postId, replyId);
        if (result.success && group) {
            await fetchPosts(group.id);
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
                        const authorName = post.authorName || '';
                        const authorInitials = post.authorAvatar || '??';
                        const authorPhoto = post.authorPhoto || null;
                        const authorId = post.authorId;
                        const titulo = post.titulo || post.title || '';
                        const contenido = post.contenido || post.content || '';
                        const tipo = post.tipo || post.type || 'announcement';
                        const fecha = post.fecha_creacion || post.createdAt || '';
                        const replies = post.respuestas || post.replies || [];
                        const isMyPost = authorId === user?.id;
                        const isEditingThisPost = editingPost === postId;

                        return (
                            <div key={postId} className="post-card animate-fade-in-up">
                                <div className="post-header">
                                    <div className="post-author">
                                        <UserAvatar
                                            name={authorName}
                                            initials={authorInitials}
                                            image={authorPhoto}
                                        />
                                        <div>
                                            <p className="post-author-name">{authorName}</p>
                                            <p className="post-date">{formatDate(fecha)}</p>
                                        </div>
                                    </div>
                                    <div className="post-actions-right">
                                        <span className={`post-type-badge ${tipo}`}>
                                            {typeIcons[tipo] || tipo} {typeLabels[tipo] || tipo}
                                        </span>
                                        {isMyPost && !isEditingThisPost && (
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-ghost btn-xs edit-btn"
                                                    onClick={() => {
                                                        setEditingPost(postId);
                                                        setEditPostData({ title: titulo, content: contenido, type: tipo });
                                                    }}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-xs delete-btn"
                                                    onClick={() => handleDeletePost(postId)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isEditingThisPost ? (
                                    <div className="board-form-card inline-edit animate-fade-in">
                                        <div className="form-group">
                                            <div className="post-type-selector">
                                                {Object.entries(typeLabels).map(([key, label]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        className={`post-type-btn ${editPostData.type === key ? 'active' : ''}`}
                                                        onClick={() => setEditPostData({ ...editPostData, type: key })}
                                                    >
                                                        {typeIcons[key]} {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editPostData.title}
                                                onChange={(e) => setEditPostData({ ...editPostData, title: e.target.value })}
                                                placeholder="Título"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <textarea
                                                className="form-textarea"
                                                value={editPostData.content}
                                                onChange={(e) => setEditPostData({ ...editPostData, content: e.target.value })}
                                                placeholder="Contenido"
                                                required
                                            />
                                        </div>
                                        <div className="action-buttons-row">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingPost(null)}>Cancelar</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleEditPost(postId)}>Guardar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="post-title">{titulo}</h3>
                                        <p className="post-content">{contenido}</p>
                                    </>
                                )}


                                {replies.length > 0 && (
                                    <div className="post-replies">
                                        {replies.map((reply) => {
                                            const replyId = reply.id_respuesta || reply.id;
                                            const replyName = reply.authorName || '';
                                            const replyInitials = reply.authorAvatar || '??';
                                            const replyPhoto = reply.authorPhoto || null;
                                            const replyAuthorId = reply.authorId;
                                            const isMyReply = replyAuthorId === user?.id;
                                            const isEditingThisReply = editingReply === replyId;

                                            return (
                                                <div key={replyId} className="reply-item">
                                                    <UserAvatar
                                                        className="avatar-sm"
                                                        name={replyName}
                                                        initials={replyInitials}
                                                        image={replyPhoto}
                                                    />
                                                    <div className="reply-content">
                                                        <div className="reply-header-info">
                                                            <div className="reply-author-meta">
                                                                <span className="reply-author">{replyName}</span>
                                                                <span className="reply-date">{formatDate(reply.fecha_creacion || reply.createdAt)}</span>
                                                            </div>
                                                            {isMyReply && !isEditingThisReply && (
                                                                <div className="reply-actions-right">
                                                                    <button
                                                                        className="btn-text-xs edit-text"
                                                                        onClick={() => {
                                                                            setEditingReply(replyId);
                                                                            setEditReplyText(reply.contenido || reply.content);
                                                                        }}
                                                                    >
                                                                        Editar
                                                                    </button>
                                                                    <button
                                                                        className="btn-text-xs delete-text"
                                                                        onClick={() => handleDeleteReply(postId, replyId)}
                                                                    >
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isEditingThisReply ? (
                                                            <div className="inline-edit-reply">
                                                                <input
                                                                    type="text"
                                                                    className="reply-input"
                                                                    value={editReplyText}
                                                                    onChange={(e) => setEditReplyText(e.target.value)}
                                                                />
                                                                <div className="action-buttons-row mt-2">
                                                                    <button className="btn btn-ghost btn-xs" onClick={() => setEditingReply(null)}>Cancelar</button>
                                                                    <button className="btn btn-primary btn-xs" onClick={() => handleEditReply(postId, replyId)}>Guardar</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="reply-text">{reply.contenido || reply.content}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}


                                <div className="reply-input-wrapper">
                                    <UserAvatar
                                        className="avatar-sm"
                                        name={`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.username}
                                        initials={user?.avatar}
                                        image={user?.profileImage || user?.foto_perfil}
                                    />
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
