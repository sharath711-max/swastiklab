import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    FaCrown, FaCoins, FaCertificate, FaClock, FaCheckCircle,
    FaUserPlus, FaChartLine, FaClipboardList, FaArrowRight
} from 'react-icons/fa';
import api from '../services/api';
import { Spinner } from 'react-bootstrap';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workflowItems, setWorkflowItems] = useState([]);

    const [stats, setStats] = useState({
        pendingGold: 0,
        pendingSilver: 0,
        pendingCerts: 0,
        readyToComplete: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const wkRes = await api.get('/workflow');
                const items = wkRes.data.data || [];
                setWorkflowItems(items);

                let pGold = 0, pSilver = 0, pCerts = 0, ready = 0;

                items.forEach(item => {
                    if (item.status === 'TODO' || item.status === 'IN_PROGRESS') {
                        if (item.type === 'gold') pGold++;
                        else if (item.type === 'silver') pSilver++;
                        else if (item.type.includes('cert')) pCerts++;
                    }
                    if (item.status === 'IN_PROGRESS' && item.total > 0 && item.mode_of_payment) {
                        ready++;
                    }
                });

                setStats({
                    pendingGold: pGold,
                    pendingSilver: pSilver,
                    pendingCerts: pCerts,
                    readyToComplete: ready
                });
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getTypeLabel = (type) => {
        switch (type) {
            case 'gold': return 'Gold Test';
            case 'silver': return 'Silver Test';
            case 'gold_cert': return 'Gold Cert';
            case 'silver_cert': return 'Silver Cert';
            case 'photo_cert': return 'Photo Cert';
            default: return type.toUpperCase();
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'TODO': return { text: 'Ongoing', bg: '#dbeafe', color: '#1e40af' };
            case 'IN_PROGRESS': return { text: 'Tested', bg: '#fef3c7', color: '#92400e' };
            case 'DONE': return { text: 'Completed', bg: '#d1fae5', color: '#065f46' };
            default: return { text: status, bg: '#f1f5f9', color: '#475569' };
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const recentItems = [...workflowItems]
        .sort((a, b) => new Date(b.createdon) - new Date(a.createdon))
        .slice(0, 6);

    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <div className="welcome-msg">
                    <h1>Welcome back, {user?.username}</h1>
                    <p>Here is what's happening in your laboratory today.</p>
                </div>
                <button onClick={() => navigate('/workflow')} className="header-btn">
                    Go to Workflow <FaArrowRight />
                </button>
            </div>

            {loading ? (
                <div className="slds-spinner_container" style={{ height: '50vh' }}>
                    <div className="slds-spinner"></div>
                </div>
            ) : (
                <>
                    {/* Live Stats Grid */}
                    <div className="stats-grid">
                        <div className="stat-card gold-stat">
                            <div className="stat-card-content">
                                <div className="stat-header">
                                    <FaCrown size={20} /> <span>Pending Gold</span>
                                </div>
                                <h2 className="stat-value">{stats.pendingGold}</h2>
                            </div>
                            <FaCrown size={120} className="stat-icon-bg" />
                        </div>

                        <div className="stat-card silver-stat">
                            <div className="stat-card-content">
                                <div className="stat-header">
                                    <FaCoins size={20} /> <span>Pending Silver</span>
                                </div>
                                <h2 className="stat-value">{stats.pendingSilver}</h2>
                            </div>
                            <FaCoins size={120} className="stat-icon-bg" />
                        </div>

                        <div className="stat-card cert-stat">
                            <div className="stat-card-content">
                                <div className="stat-header">
                                    <FaCertificate size={20} /> <span>Certs in Queue</span>
                                </div>
                                <h2 className="stat-value">{stats.pendingCerts}</h2>
                            </div>
                            <FaCertificate size={120} className="stat-icon-bg" />
                        </div>

                        <div className="stat-card ready-stat">
                            <div className="stat-card-content">
                                <div className="stat-header">
                                    <FaCheckCircle size={20} /> <span>Ready to Complete</span>
                                </div>
                                <h2 className="stat-value">{stats.readyToComplete}</h2>
                            </div>
                            <FaCheckCircle size={120} className="stat-icon-bg" />
                        </div>
                    </div>

                    <div className="main-grid">
                        {/* Quick Actions Panel */}
                        <div className="panel-card">
                            <h3 className="panel-title">Core Laboratory Actions</h3>
                            <div className="actions-grid">
                                {[
                                    { text: 'Create Gold Test', icon: <FaCrown size={24} color="#f59e0b" />, route: '/workflow?tab=gold', bg: '#fef3c7' },
                                    { text: 'Create Silver Test', icon: <FaCoins size={24} color="#64748b" />, route: '/workflow?tab=silver', bg: '#f1f5f9' },
                                    { text: 'Generate Certificate', icon: <FaCertificate size={24} color="#6366f1" />, route: '/workflow?tab=gold_cert', bg: '#e0e7ff' },
                                    { text: 'Register Customer', icon: <FaUserPlus size={24} color="#10b981" />, route: '/customers', bg: '#d1fae5' },
                                    { text: 'Laboratory Workflow', icon: <FaClipboardList size={24} color="#0ea5e9" />, route: '/workflow', bg: '#e0f2fe' },
                                    { text: 'Performance History', icon: <FaChartLine size={24} color="#ec4899" />, route: '/list-views', bg: '#fce7f3' }
                                ].map((action, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => navigate(action.route)}
                                        className="action-card"
                                        style={{ background: action.bg }}
                                    >
                                        <div>{action.icon}</div>
                                        <span>{action.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity Timeline */}
                        <div className="panel-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 className="panel-title" style={{ margin: 0 }}>Recent Work</h3>
                                <span className="slds-badge slds-badge_light">{recentItems.length} ITEMS</span>
                            </div>

                            {recentItems.length === 0 ? (
                                <div className="empty-state">
                                    No ongoing workflow items detected. <br />Start a new test to see activity here!
                                </div>
                            ) : (
                                <div className="timeline">
                                    {recentItems.map((item, idx) => {
                                        const badge = getStatusBadge(item.status);
                                        return (
                                            <div
                                                key={idx}
                                                className="activity-card"
                                                onClick={() => navigate('/workflow')}
                                            >
                                                <div className="activity-header">
                                                    <div className="customer">{item.customer_name || 'Anonymous Customer'}</div>
                                                    <div className="time">{formatTime(item.createdon)}</div>
                                                </div>
                                                <div className="activity-footer">
                                                    <div className="activity-info">
                                                        <FaClock size={12} /> {getTypeLabel(item.type)} • #{item.auto_number?.split('-')[1] || item.auto_number}
                                                    </div>
                                                    <div className="status-label" style={{ background: badge.bg, color: badge.color }}>
                                                        {badge.text}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;

