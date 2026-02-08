
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './auth/LoginPage';
import AppShell from './components/AppShell';

import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Certificates from './pages/Certificates';
import WorkflowBoard from './pages/WorkflowBoard';
import ListViewsPage from './pages/ListViewsPage';
import PrintView from './pages/PrintView';
import GoldTest from './pages/GoldTest';
import WeightLoss from './pages/WeightLoss';
import CashInHand from './pages/CashInHand';
import UserManagement from './pages/UserManagement';
import RecordPage from './pages/RecordPage';

import './index.css';
import './styles/GlobalStyles.css';
import './styles/theme.css';

// Dashboard Component (Internal for now)
import { KanbanBoard } from './components/SalesforceComponents';
import { LiveStats, QuickActions, ActivityTimeline } from './components/DashboardEnhancements';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ padding: '0 1rem' }}>
            <div className="row g-4 intro-section">
                <div className="col-12">
                    <h1 className="mb-2">Welcome back, {user?.username}</h1>
                    <p className="text-muted">Here's what's happening in your lab today.</p>
                </div>
            </div>

            {/* Live Stats */}
            <LiveStats />

            <div className="row g-4 mt-2">
                <div className="col-lg-8">
                    {/* Workflow Board Preview */}
                    <div className="card mb-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h2 className="card-title mb-0">Test Status Board</h2>
                            <button className="btn btn-sm btn-link" onClick={() => navigate('/workflow')}>View All</button>
                        </div>
                        <div className="card-body">
                            <KanbanBoard
                                lanes={[
                                    {
                                        id: 'todo',
                                        title: 'To Do',
                                        cards: []
                                    },
                                    {
                                        id: 'testing',
                                        title: 'Testing',
                                        cards: []
                                    },
                                    {
                                        id: 'completed',
                                        title: 'Completed',
                                        cards: []
                                    }
                                ]}
                                onCardMove={() => { }}
                            />
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <QuickActions navigate={navigate} />
                </div>

                <div className="col-lg-4">
                    {/* Activity Timeline */}
                    <ActivityTimeline />
                </div>
            </div>
        </div>
    );
};

const PrivateRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    if (!user) return <Navigate to="/login" />;

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />; // Or a generic Unauthorized page
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Routes wrapped in AppShell */}
                        <Route path="/" element={
                            <PrivateRoute>
                                <AppShell>
                                    <Dashboard />
                                </AppShell>
                            </PrivateRoute>
                        } />

                        <Route path="/customers" element={
                            <PrivateRoute>
                                <AppShell>
                                    <Customers />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/customers/:id" element={
                            <PrivateRoute>
                                <AppShell>
                                    <CustomerProfile />
                                </AppShell>
                            </PrivateRoute>
                        } />

                        <Route path="/certificates" element={
                            <PrivateRoute>
                                <AppShell>
                                    <Certificates />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/list-views" element={
                            <PrivateRoute>
                                <AppShell>
                                    <ListViewsPage />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/workflow" element={
                            <PrivateRoute>
                                <AppShell>
                                    <WorkflowBoard />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/gold-test" element={
                            <PrivateRoute>
                                <AppShell>
                                    <GoldTest />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/weight-loss" element={
                            <PrivateRoute>
                                <AppShell>
                                    <WeightLoss />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/cash-in-hand" element={
                            <PrivateRoute roles={['admin']}>
                                <AppShell>
                                    <CashInHand />
                                </AppShell>
                            </PrivateRoute>
                        } />
                        <Route path="/admin/users" element={
                            <PrivateRoute roles={['admin']}>
                                <AppShell>
                                    <UserManagement />
                                </AppShell>
                            </PrivateRoute>
                        } />

                        <Route path="/record/:type/:id" element={
                            <PrivateRoute>
                                <AppShell>
                                    <RecordPage />
                                </AppShell>
                            </PrivateRoute>
                        } />

                        {/* Print View (No AppShell) */}
                        <Route path="/print/:type/:id" element={
                            <PrivateRoute>
                                <PrintView />
                            </PrivateRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
