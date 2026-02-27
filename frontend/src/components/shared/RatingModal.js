import React, { useEffect, useState } from 'react';
import './RatingModal.css';

function parseScore(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return { value: null, error: 'La puntuación debe ser numérica' };
    }
    if (parsed < 1 || parsed > 5) {
        return { value: null, error: 'La puntuación debe estar entre 1.0 y 5.0' };
    }
    if (Math.round(parsed * 10) !== parsed * 10) {
        return { value: null, error: 'Solo se permite un decimal (ej. 4.3)' };
    }
    return { value: Number(parsed.toFixed(1)), error: null };
}

function RatingModal({
    isOpen,
    title = 'Calificar',
    subjectName = 'usuario',
    initialScore = '',
    initialComment = '',
    submitting = false,
    submitLabel = 'Guardar calificación',
    onClose,
    onSubmit,
}) {
    const [score, setScore] = useState(initialScore === null || initialScore === undefined ? '' : String(initialScore));
    const [comment, setComment] = useState(initialComment || '');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setScore(initialScore === null || initialScore === undefined ? '' : String(initialScore));
        setComment(initialComment || '');
        setError('');
    }, [isOpen, initialScore, initialComment]);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const parsed = parseScore(score);
        if (parsed.error) {
            setError(parsed.error);
            return;
        }

        setError('');
        const result = await onSubmit({
            puntuacion: parsed.value,
            comentario: comment.trim() || null,
        });

        if (result === false) {
            return;
        }
    };

    return (
        <div className="rating-modal-overlay" onClick={submitting ? undefined : onClose}>
            <div className="rating-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="rating-modal-header">
                    <h3>{title}</h3>
                    <button
                        className="rating-modal-close"
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                <p className="rating-modal-subtitle">
                    Evalúa a <strong>{subjectName}</strong> con una puntuación de 1.0 a 5.0.
                </p>

                <form onSubmit={handleSubmit} className="rating-modal-form">
                    <label className="form-label" htmlFor="ratingScoreInput">Puntuación</label>
                    <input
                        id="ratingScoreInput"
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        className="form-input"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="Ej. 4.3"
                        disabled={submitting}
                        required
                    />

                    <label className="form-label" htmlFor="ratingCommentInput">Comentario (opcional)</label>
                    <textarea
                        id="ratingCommentInput"
                        className="form-textarea"
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Agrega contexto de tu evaluación..."
                        disabled={submitting}
                    />

                    {error && <p className="rating-modal-error">{error}</p>}

                    <div className="rating-modal-actions">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Guardando...' : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RatingModal;
