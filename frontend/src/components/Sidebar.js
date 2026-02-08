import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaUsers, FaFlask, FaWeight, FaCertificate, FaFileInvoice, FaCog, FaChartLine, FaCoins } from 'react-icons/fa';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <div className="px-3 mb-3 text-muted text-uppercase small fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>App Launcher</div>

            <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaTachometerAlt /></div>
                <span>Dashboard</span>
            </NavLink>

            <div className="mt-4 px-3 mb-2 text-muted text-uppercase small fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Modules</div>

            <NavLink to="/customers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaUsers /></div>
                <span>Customers</span>
            </NavLink>

            <NavLink to="/workflow" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaChartLine /></div>
                <span>Workflow Board</span>
            </NavLink>

            <NavLink to="/gold-tests" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaWeight /></div>
                <span>Gold Testing</span>
            </NavLink>

            <NavLink to="/silver-tests" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaFlask /></div>
                <span>Silver Testing</span>
            </NavLink>

            <NavLink to="/certificates" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaCertificate /></div>
                <span>Certificates</span>
            </NavLink>

            <NavLink to="/ledger" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaFileInvoice /></div>
                <span>Ledger & Billing</span>
            </NavLink>

            <NavLink to="/weight-loss" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaWeight /></div>
                <span>Weight Loss</span>
            </NavLink>

            <NavLink to="/cash-in-hand" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <div className="sidebar-icon"><FaCoins /></div>
                <span>Cash In Hand</span>
            </NavLink>

            <div className="mt-4 px-3 mb-2 text-muted text-uppercase small fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>System</div>

            <div className="sidebar-link" style={{ cursor: 'pointer', opacity: 0.6 }}>
                <div className="sidebar-icon"><FaCog /></div>
                <span>Settings</span>
            </div>
        </div>
    );
};

export default Sidebar;
