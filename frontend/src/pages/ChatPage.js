import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getChatMessages, sendChatMessage } from '../services/api';
import './ChatPage.css';

const BACKEND_URL = `http://${window.location.hostname}:5001`;

function ChatPage() {
    const { idSolicitud } = useParams();
    const { user } = useAuth();
    const [solicitud, setSolicitud] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    // Fetch messages
    useEffect(() => {
        const fetchChat = async () => {
            setLoading(true);
            const result = await getChatMessages(idSolicitud);
            if (result.success) {
                setSolicitud(result.solicitud);
                setMensajes(result.mensajes || []);
            }
            setLoading(false);
        };
        fetchChat();
    }, [idSolicitud]);

    // Socket.io for real-time
    useEffect(() => {
        const socket = io(BACKEND_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('unirse-chat', idSolicitud);
            if (user?.id) {
                socket.emit('unirse-usuario', user.id);
            }
        });

        socket.on('nuevo-mensaje', (mensaje) => {
            setMensajes(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id_mensaje === mensaje.id_mensaje)) return prev;
                return [...prev, mensaje];
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [idSolicitud, user?.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() || sending) return;

        setSending(true);
        const result = await sendChatMessage(idSolicitud, nuevoMensaje.trim());
        if (result.success) {
            setMensajes(prev => {
                if (prev.some(m => m.id_mensaje === result.mensaje.id_mensaje)) return prev;
                return [...prev, result.mensaje];
            });
            setNuevoMensaje('');
        }
        setSending(false);
    };

    if (loading) {
        return (
            <div className="chat-page">
                <div className="container">
                    <p className="empty-state">Cargando chat...</p>
                </div>
            </div>
        );
    }

    if (!solicitud) {
        return (
            <div className="chat-page">
                <div className="container">
                    <div className="not-found">
                        <h2>Chat no encontrado</h2>
                        <Link to="/" className="btn btn-primary">← Volver</Link>
                    </div>
                </div>
            </div>
        );
    }

    const isLandlord = user?.id === solicitud.id_landlord;
    const otherName = isLandlord
        ? `${solicitud.tenant_nombre} ${solicitud.tenant_apellido}`
        : `${solicitud.landlord_nombre} ${solicitud.landlord_apellido}`;
    const backLink = isLandlord ? '/landlord/inquiries' : '/tenant/properties';

    return (
        <div className="chat-page">
            <div className="chat-container animate-fade-in-up">
                {/* Header */}
                <div className="chat-header">
                    <Link to={backLink} className="chat-back-btn">←</Link>
                    <div className="chat-header-info">
                        <div className="avatar avatar-sm chat-avatar">
                            {otherName.split(' ').map(n => n[0] || '').join('').slice(0, 2)}
                        </div>
                        <div>
                            <h3 className="chat-header-name">{otherName}</h3>
                            <p className="chat-header-property">{solicitud.titulo_propiedad}</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {mensajes.length === 0 && (
                        <div className="chat-empty">
                            <p>👋 ¡Di hola! Comienza la conversación sobre la propiedad.</p>
                        </div>
                    )}
                    {mensajes.map((msg) => {
                        const isMine = msg.id_emisor === user?.id;
                        const time = new Date(msg.fecha_envio).toLocaleTimeString('es-MX', {
                            hour: '2-digit', minute: '2-digit',
                        });

                        return (
                            <div key={msg.id_mensaje} className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--other'}`}>
                                {!isMine && (
                                    <span className="chat-bubble-name">{msg.emisor_nombre}</span>
                                )}
                                <p className="chat-bubble-text">{msg.contenido}</p>
                                <span className="chat-bubble-time">{time}</span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form className="chat-input-bar" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Escribe un mensaje..."
                        value={nuevoMensaje}
                        onChange={(e) => setNuevoMensaje(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="chat-send-btn"
                        disabled={!nuevoMensaje.trim() || sending}
                    >
                        {sending ? '...' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChatPage;
