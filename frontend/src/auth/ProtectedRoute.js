import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Secures routes based on authentication and RBAC
 */
const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        // Zero-Flash skeleton loader matching the minimalist aesthetic
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#f8f9fa' }}>
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role-Based Access Control
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />; // Or point to a formal Unauthorized page
    }

    return children;
};

export default ProtectedRoute;
