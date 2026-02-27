import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={`/${user.role}/dashboard`} replace />;
    }

    // Profile completion gate: redirect tenants with incomplete profiles
    if (user.role === 'tenant' && !user.perfil_completo && location.pathname !== '/tenant/profile') {
        return <Navigate to="/tenant/profile" replace />;
    }

    return children;
}

export default ProtectedRoute;
