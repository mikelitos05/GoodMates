import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockBoardPosts, getUserById } from '../../data/mockData';
import './MatesBoard.css';

function MatesBoard() {
    const { user } = useAuth();
    const [posts, setPosts] = useState(mockBoardPosts);
    const [showForm, setShowForm] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', type: 'announcement' });
    const [replyText, setReplyText] = useState({});

    const handleCreatePost = (e) => {
        e.preventDefault();
        const post = {
            id: Date.now(),
            groupId: 1,
            authorId: user.id,
            ...newPost,
            createdAt: new Date().toISOString(),
            replies: [],
        };
        setPosts([post, ...posts]);
        setNewPost({ title: '', content: '', type: 'announcement' });
        setShowForm(false);
    };

    const handleReply = (postId) => {
        if (!replyText[postId]?.trim()) return;
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        replies: [
                            ...p.replies,
                            {
                                id: Date.now(),
                                authorId: user.id,
                                content: replyText[postId],
                                createdAt: new Date().toISOString(),
                            },
                        ],
                    }
                    : p
            )
        );
        setReplyText((prev) => ({ ...prev, [postId]: '' }));
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="board-page">
            <div className="container">
                <div className="board-header animate-fade-in-up">
                    <div>
                        <h1 className="section-title">Mates Board</h1>
                        <p className="section-subtitle">Comparte avisos, noticias e invitaciones con tus roommates.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✕ Cancelar' : 'Nueva Publicación'}
                    </button>
                </div>

                {/* Create Post Form */}
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

                {/* Post Feed */}
                <div className="post-feed">
                    {posts.map((post) => {
                        const author = getUserById(post.authorId);
                        return (
                            <div key={post.id} className="post-card animate-fade-in-up">
                                <div className="post-header">
                                    <div className="post-author">
                                        <div className="avatar">{author?.avatar}</div>
                                        <div>
                                            <p className="post-author-name">{author?.name}</p>
                                            <p className="post-date">{formatDate(post.createdAt)}</p>
                                        </div>
                                    </div>
                                    <span className={`post-type-badge ${post.type}`}>
                                        {typeIcons[post.type]} {typeLabels[post.type]}
                                    </span>
                                </div>

                                <h3 className="post-title">{post.title}</h3>
                                <p className="post-content">{post.content}</p>

                                {/* Replies */}
                                {post.replies.length > 0 && (
                                    <div className="post-replies">
                                        {post.replies.map((reply) => {
                                            const replyAuthor = getUserById(reply.authorId);
                                            return (
                                                <div key={reply.id} className="reply-item">
                                                    <div className="avatar avatar-sm">{replyAuthor?.avatar}</div>
                                                    <div className="reply-content">
                                                        <span className="reply-author">{replyAuthor?.name}</span>
                                                        <p className="reply-text">{reply.content}</p>
                                                        <span className="reply-date">{formatDate(reply.createdAt)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Reply Input */}
                                <div className="reply-input-wrapper">
                                    <div className="avatar avatar-sm">{user?.avatar}</div>
                                    <input
                                        type="text"
                                        className="reply-input"
                                        placeholder="Escribe una respuesta..."
                                        value={replyText[post.id] || ''}
                                        onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(post.id); }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={() => handleReply(post.id)}>
                                        Enviar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default MatesBoard;
