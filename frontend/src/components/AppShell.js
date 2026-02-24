import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    FaTachometerAlt, FaUsers, FaCertificate,
    FaWeight, FaMoneyBillWave, FaCheckDouble,
    FaBars, FaGem, FaSearch, FaBell, FaQuestionCircle,
    FaUser, FaChevronDown, FaUserCog, FaSignOutAlt
} from 'react-icons/fa';
import ChangePasswordModal from './ChangePasswordModal';
import './AppShell.css';
import { useAuth } from '../auth/AuthContext';
import ProtectedComponent from './ProtectedComponent';

const AppShell = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const navigation = React.useMemo(() => [
        {
            name: 'Dashboard',
            path: '/',
            icon: <FaTachometerAlt />,
            exact: true
        },
        {
            name: 'Customers',
            path: '/customers',
            icon: <FaUsers />,
        },

        {
            name: 'Workflow Board',
            path: '/workflow', // This path acts as the base for active checking
            icon: <FaCheckDouble />,
            subItems: [
                {
                    name: 'Gold Test',
                    path: '/workflow?tab=gold',
                    icon: <FaGem />
                },
                {
                    name: 'Silver Test',
                    path: '/workflow?tab=silver',
                    icon: <FaCheckDouble />
                },
                {
                    name: 'Gold Cert',
                    path: '/workflow?tab=gold_cert',
                    icon: <FaCertificate />
                },
                {
                    name: 'Silver Cert',
                    path: '/workflow?tab=silver_cert',
                    icon: <FaCertificate />
                },
                {
                    name: 'Photo Cert',
                    path: '/workflow?tab=photo_cert',
                    icon: <FaCertificate />
                }
            ]
        },
        {
            name: 'List Views',
            path: '/list-views',
            icon: <FaBars />
        }
    ], []);

    const isActive = React.useCallback((path, exact = false) => {
        if (!path) return false;

        // Support query-based nav items like /workflow?tab=gold
        if (path.includes('?')) {
            const [basePath, query] = path.split('?');
            if (location.pathname !== basePath) return false;
            const expected = new URLSearchParams(query);
            const current = new URLSearchParams(location.search);
            return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
        }

        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    }, [location.pathname, location.search]);

    const [expandedMenus, setExpandedMenus] = useState({});

    // Initialize/Update expanded menus based on active route
    React.useEffect(() => {
        const newExpanded = { ...expandedMenus };
        let hasChanges = false;
        navigation.forEach(item => {
            if (item.subItems && isActive(item.path)) {
                if (!newExpanded[item.name]) {
                    newExpanded[item.name] = true;
                    hasChanges = true;
                }
            }
        });
        if (hasChanges) {
            setExpandedMenus(newExpanded);
        }
    }, [navigation, isActive, expandedMenus]);

    const toggleMenu = (name) => {
        setExpandedMenus(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    return (
        <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Header */}
            <header className="app-header">
                {/* ... existing header left/center ... */}
                <div className="header-left">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        <FaBars />
                    </button>
                    <div className="logo">
                        <FaGem />
                        {!sidebarCollapsed && <span>Swastik Gold & Silver Lab</span>}
                    </div>
                </div>

                <div className="header-center">
                    <div className="search-box">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search tests, certificates, customers..."
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="header-right">
                    <div className="header-actions">
                        <button className="header-action-btn" title="Notifications">
                            <FaBell />
                            <span className="notification-badge">3</span>
                        </button>
                        <button className="header-action-btn" title="Help">
                            <FaQuestionCircle />
                        </button>
                        <div className="user-menu-container">
                            <button
                                className="user-menu-btn"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="user-avatar">
                                    <FaUser />
                                </div>
                                {!sidebarCollapsed && (
                                    <div className="user-info">
                                        <span className="user-name">{user?.username || 'Admin User'}</span>
                                        <span className="user-role">Administrator</span>
                                    </div>
                                )}
                                <FaChevronDown />
                            </button>

                            {userMenuOpen && (
                                <div className="user-menu-dropdown">
                                    <div className="user-menu-header">
                                        <div className="user-avatar large">
                                            <FaUser />
                                        </div>
                                        <div className="user-menu-info">
                                            <strong>{user?.username || 'Admin User'}</strong>
                                            <span>admin@swastiklab.com</span>
                                        </div>
                                    </div>
                                    <div className="user-menu-items">
                                        {user?.role === 'admin' && (
                                            <button
                                                className="user-menu-item"
                                                onClick={() => {
                                                    navigate('/admin/users');
                                                    setUserMenuOpen(false);
                                                }}
                                            >
                                                <FaUsers />
                                                <span>User Management</span>
                                            </button>
                                        )}
                                        <button
                                            className="user-menu-item"
                                            onClick={() => {
                                                setShowChangePasswordModal(true);
                                                setUserMenuOpen(false);
                                            }}
                                        >
                                            <FaUserCog />
                                            <span>Change Password</span>
                                        </button>
                                        <div className="divider"></div>
                                        <button className="user-menu-item logout" onClick={logout}>
                                            <FaSignOutAlt />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <ChangePasswordModal
                show={showChangePasswordModal}
                onHide={() => setShowChangePasswordModal(false)}
            />

            {/* Sidebar */}
            <aside className="app-sidebar">
                <nav className="sidebar-nav">
                    {navigation.map((item, index) => {
                        const NavItemContent = (
                            <div className="nav-section">
                                {!item.subItems ? (
                                    <Link
                                        to={item.path}
                                        className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className="nav-label">{item.name}</span>
                                                {item.badge && (
                                                    <span className="nav-badge">{item.badge}</span>
                                                )}
                                            </>
                                        )}
                                    </Link>
                                ) : (
                                    <div className={`nav-group ${isActive(item.path) ? 'active' : ''}`}>
                                        <div
                                            className="nav-group-header"
                                            onClick={() => !sidebarCollapsed && toggleMenu(item.name)}
                                            style={{ cursor: !sidebarCollapsed ? 'pointer' : 'default' }}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            {!sidebarCollapsed && (
                                                <>
                                                    <span className="nav-label">{item.name}</span>
                                                    <FaChevronDown
                                                        style={{
                                                            marginLeft: 'auto',
                                                            fontSize: '0.8em',
                                                            transform: expandedMenus[item.name] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.2s'
                                                        }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        {!sidebarCollapsed && expandedMenus[item.name] && (
                                            <div className="nav-subitems">
                                                {item.subItems.map((subItem, subIndex) => (
                                                    <Link
                                                        key={subIndex}
                                                        to={subItem.path}
                                                        className={`nav-subitem ${isActive(subItem.path) ? 'active' : ''}`}
                                                    >
                                                        <span className="nav-icon-sm">{subItem.icon}</span>
                                                        <span>{subItem.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );

                        return item.roles ? (
                            <ProtectedComponent key={index} roles={item.roles}>
                                {NavItemContent}
                            </ProtectedComponent>
                        ) : (
                            <React.Fragment key={index}>
                                {NavItemContent}
                            </React.Fragment>
                        );
                    })}
                </nav>

                {!sidebarCollapsed && (
                    <div className="sidebar-footer">
                        <div className="app-info">
                            <div className="app-version">v2.1.0</div>
                            <div className="app-copyright">© 2024 Swastik Lab</div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="app-main">
                <div className="app-content">
                    {children}
                </div>

                <footer className="app-footer">
                    <div className="footer-content">
                        <span>© 2024 Swastik Gold & Silver Testing Lab. All rights reserved.</span>
                        <div className="footer-links">
                            {/* <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/help">Help Center</a> */}
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default AppShell;
