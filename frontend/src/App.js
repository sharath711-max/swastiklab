
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './auth/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/layout/AppShell';

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

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import './index.css';
import './styles/GlobalStyles.css';
import './styles/theme.css';

import Dashboard from './pages/Dashboard';

// Removed inline PrivateRoute block; using ProtectedRoute imported from ./auth/ProtectedRoute

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <ToastContainer />
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Routes wrapped in AppShell */}
                        <Route path="/" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <Dashboard />
                                </AppShell>
                            </ProtectedRoute>
                        } />

                        <Route path="/customers" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <Customers />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/customers/:id" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <CustomerProfile />
                                </AppShell>
                            </ProtectedRoute>
                        } />

                        <Route path="/certificates" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <Certificates />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/list-views" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <ListViewsPage />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/workflow" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <WorkflowBoard />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/gold-test" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <GoldTest />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/weight-loss" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <WeightLoss />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/cash-in-hand" element={
                            <ProtectedRoute roles={['admin']}>
                                <AppShell>
                                    <CashInHand />
                                </AppShell>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/users" element={
                            <ProtectedRoute roles={['admin']}>
                                <AppShell>
                                    <UserManagement />
                                </AppShell>
                            </ProtectedRoute>
                        } />

                        <Route path="/record/:type/:id" element={
                            <ProtectedRoute>
                                <AppShell>
                                    <RecordPage />
                                </AppShell>
                            </ProtectedRoute>
                        } />

                        {/* Print View (No AppShell) */}
                        <Route path="/print/:type/:id" element={
                            <ProtectedRoute>
                                <PrintView />
                            </ProtectedRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
