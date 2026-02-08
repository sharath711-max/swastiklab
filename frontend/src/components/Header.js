import React, { useState } from 'react';
import { FaGem, FaSearch, FaBell, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    return (
        <header className="app-header" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 'var(--header-height)',
            background: 'white',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            zIndex: 1000
        }}>
            <div className="logo d-flex align-items-center gap-2 text-primary fw-bold fs-5" style={{ minWidth: '240px' }}>
                <FaGem size={24} color="#D4AF37" />
                <span className="text-dark">Swastik Lab</span>
            </div>

            <div className="search-box flex-grow-1 mx-4" style={{ maxWidth: '600px', position: 'relative' }}>
                <FaSearch className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    type="text"
                    placeholder="Search tests, customers, certificates..."
                    className="form-control"
                    style={{ paddingLeft: '36px', background: 'var(--bg-light)' }}
                />
            </div>

            <div className="header-actions d-flex align-items-center gap-3 ms-auto">
                <div className="position-relative cursor-pointer">
                    <FaBell size={18} className="text-secondary" />
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '9px', padding: '2px 4px' }}>3</span>
                </div>

                <div className="user-menu position-relative" style={{ cursor: 'pointer' }} onClick={() => setShowMenu(!showMenu)}>
                    <div className="d-flex align-items-center gap-2">
                        <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'A'}
                        </div>
                    </div>

                    {showMenu && (
                        <div className="dropdown-menu show" style={{ position: 'absolute', right: 0, top: '40px', minWidth: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
                            <div className="px-3 py-2 border-bottom">
                                <div className="fw-bold">{user?.username}</div>
                                <div className="small text-muted">{user?.role}</div>
                            </div>
                            <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={logout}>
                                <FaSignOutAlt className="text-danger" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
