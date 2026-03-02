import React from 'react';
import { getImageUrl } from '../../services/api';

const getInitials = (name = '', fallback = '??') => {
    const normalized = String(name || '').trim();
    if (!normalized) return fallback;
    const letters = normalized
        .split(' ')
        .map((part) => part.trim()[0])
        .filter(Boolean)
        .join('')
        .toUpperCase();
    return letters.slice(0, 2) || fallback;
};

function UserAvatar({
    name = '',
    initials,
    image,
    className = '',
    style,
    title,
}) {
    const resolvedImage = getImageUrl(image || null);
    const fallback = initials || getInitials(name);

    return (
        <div className={`avatar ${className}`.trim()} style={style} title={title || name || undefined}>
            {resolvedImage ? (
                <img
                    src={resolvedImage}
                    alt={name || 'Usuario'}
                    className="avatar-image"
                />
            ) : (
                fallback
            )}
        </div>
    );
}

export default UserAvatar;
