import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FaGem, FaUser, FaLock } from 'react-icons/fa';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password, remember);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card" style={{ borderTop: '4px solid var(--primary)' }}>
                <div className="auth-logo">
                    <FaGem style={{ fontSize: '32px', color: '#0176d3' }} />
                    <span style={{ marginLeft: '10px', fontSize: '24px', color: '#0176d3' }}>SWASTIK</span>
                </div>
                <div className="auth-subtitle" style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Gold & Silver Testing Lab
                </div>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    {error && (
                        <div className="slds-alert slds-alert_error" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Username</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#b0adab' }}>
                                <FaUser />
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                style={{ paddingLeft: '32px' }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                                placeholder="Enter your username"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#b0adab' }}>
                                <FaLock />
                            </div>
                            <input
                                type="password"
                                className="form-control"
                                style={{ paddingLeft: '32px' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={3}
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <div className="d-flex justify-content-between mb-4" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                id="remember"
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                            />
                            <label htmlFor="remember" style={{ margin: 0, fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>Remember me</label>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', fontSize: '14px', fontWeight: 'bold' }}>
                        Log In
                    </button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    &copy; 2024 <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Swastik Lab</span>. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
