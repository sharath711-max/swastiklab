import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge, Button, Spinner, Dropdown, DropdownButton, ButtonGroup } from 'react-bootstrap';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import NewGoldTestModal from '../components/NewGoldTestModal';
import NewSilverTestModal from '../components/NewSilverTestModal';
import NewCertificateModal from '../components/NewCertificateModal';
import Phase2Modal from '../components/Phase2Modal';
import { FaClock, FaGem, FaCheck, FaTrash, FaFileInvoice } from 'react-icons/fa';
import './WorkflowBoard.css';

const WorkflowBoard = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchMoving, setBatchMoving] = useState(false);
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [showSilverTestModal, setShowSilverTestModal] = useState(false);
    const [certModal, setCertModal] = useState({ show: false, type: 'gold' });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
    const [activeTab, setActiveTab] = useState('gold');

    const [phase2Modal, setPhase2Modal] = useState({ show: false, test: null, readOnly: false });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/workflow');
            setItems(response.data.data || []);
        } catch (error) {
            addToast('Failed to update workflow board', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleBatchTransferAll = async () => {
        const testedItems = filteredItems.filter(t => t.status === 'IN_PROGRESS');
        if (testedItems.length === 0) {
            addToast('No items in Tested status to transfer.', 'info');
            return;
        }

        const eligible = testedItems.filter(item => {
            const amount = Number(item.total || 0);
            return Number.isFinite(amount) && amount > 0 && !!item.mode_of_payment;
        });

        if (eligible.length === 0) {
            addToast('No eligible items ready for completion. Add payment details first.', 'info');
            return;
        }

        const confirmed = window.confirm(`Move ${eligible.length} ready items from ${getTypeLabel(activeTab)} to Completed?`);
        if (!confirmed) return;

        setBatchMoving(true);
        let count = 0;
        for (const card of eligible) {
            try {
                let resultsEndpoint = '';
                let statusEndpoint = `/workflow/${card.type}/${card.id}/status`;

                if (card.type === 'gold') resultsEndpoint = `/gold-tests/${card.id}/results`;
                else if (card.type === 'silver') resultsEndpoint = `/silver-tests/${card.id}/results`;
                else resultsEndpoint = `/certificates/${card.id}/results`;

                const res = await api.get(card.type === 'gold' ? `/gold-tests/${card.id}` :
                    card.type === 'silver' ? `/silver-tests/${card.id}` :
                        `/certificates/${card.id}?type=${card.type.replace('_cert', '')}`);
                const detail = res.data.data || res.data;
                const cardItems = detail.items || [];

                await api.post(resultsEndpoint, {
                    items: cardItems.map(i => ({ id: i.id, purity: Number(i.purity), returned: !!i.returned })),
                    mode_of_payment: card.mode_of_payment,
                    total: Number(card.total || 0)
                });
                await api.patch(statusEndpoint, { status: 'DONE' });
                count++;
            } catch (err) {
                console.error(`Failed to move item ${card.id}:`, err);
            }
        }
        setBatchMoving(false);
        addToast(`${count} items moved to Completed.`, 'success');
        fetchData();
    };

    const handleCardClick = async (item) => {
        try {
            let details = null;
            if (item.type === 'gold') {
                const res = await api.get(`/gold-tests/${item.id}`);
                details = res.data.data;
            } else if (item.type === 'silver') {
                const res = await api.get(`/silver-tests/${item.id}`);
                details = res.data.data || res.data;
            } else if (item.type.includes('cert')) {
                const apiType = item.type.replace('_cert', '');
                const res = await api.get(`/certificates/${item.id}?type=${apiType}`);
                details = res.data;
            }

            if (!details) {
                addToast("Could not fetch details", 'error');
                return;
            }

            const payload = { ...details, type: item.type, status: item.status };

            if (item.type === 'photo_cert' || item.status === 'TODO' || item.status === 'IN_PROGRESS') {
                setPhase2Modal({ show: true, test: payload, readOnly: false });
            } else if (item.status === 'DONE') {
                setPhase2Modal({ show: true, test: payload, readOnly: true });
            }
        } catch (error) {
            addToast("Opened with limited data (detail fetch failed)", 'error');
        }
    };

    const columnsConfig = [
        { id: 'TODO', title: 'Ongoing', color: '#0176d3' },  // Deep Blue
        { id: 'IN_PROGRESS', title: 'Tested', color: '#f59e0b' }, // Amber
        { id: 'DONE', title: 'Completed', color: '#10b981' } // Success Green
    ];

    const getTabTheme = (tab) => {
        if (tab === 'gold') return { accent: 'var(--gold)', light: 'var(--gold-light)', type: 'gold' };
        if (tab === 'silver') return { accent: 'var(--silver)', light: 'var(--silver-light)', type: 'silver' };
        return { accent: '#6366f1', light: '#eef2ff', type: 'cert' }; // Indigo for certs
    };

    const currentTheme = getTabTheme(activeTab);

    const filteredItems = items.filter(item => item.type === activeTab);

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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: item });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
    };

    const handleReceipt = () => {
        if (contextMenu.item) {
            navigate(`/print/${contextMenu.item.type}-test/${contextMenu.item.id}`);
        }
        handleCloseContextMenu();
    };

    const handleDelete = async () => {
        if (contextMenu.item) {
            if (window.confirm(`Are you sure you want to delete this ${getTypeLabel(contextMenu.item.type)}?`)) {
                try {
                    await api.delete(`/${contextMenu.item.type}-tests/${contextMenu.item.id}`);
                    addToast('Deleted successfully', 'success');
                    fetchData();
                } catch (error) {
                    addToast('Failed to delete', 'error');
                }
            }
        }
        handleCloseContextMenu();
    };

    useEffect(() => {
        if (contextMenu.visible) {
            document.addEventListener('click', handleCloseContextMenu);
            return () => document.removeEventListener('click', handleCloseContextMenu);
        }
    }, [contextMenu.visible]);

    if (loading && items.length === 0) {
        return (
            <div className="slds-spinner_container" style={{ minHeight: '100vh', background: '#f1f5f9' }}>
                <div className="slds-spinner"></div>
            </div>
        );
    }

    return (
        <div className="workflow-page">

            <div className="board-header">
                <div className="board-title">
                    <h1>Laboratory Workflow</h1>
                    <p>Real-time laboratory operations monitoring</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <Button
                        className="btn-secondary-action"
                        onClick={handleBatchTransferAll}
                        disabled={batchMoving}
                    >
                        {batchMoving ? <Spinner animation="border" size="sm" /> : <><FaCheck className="me-2" /> Batch Move</>}
                    </Button>
                    <Button className="btn-secondary-action" onClick={fetchData}>
                        Refresh
                    </Button>

                    {(() => {
                        const btnText = `+ New ${getTypeLabel(activeTab)}`;
                        const handleNew = () => {
                            if (activeTab === 'gold') setShowNewTestModal(true);
                            else if (activeTab === 'silver') setShowSilverTestModal(true);
                            else {
                                const type = activeTab === 'photo_cert' ? 'photo' : activeTab.replace('_cert', '');
                                setCertModal({ show: true, type });
                            }
                        };
                        return <Button className="btn-action" onClick={handleNew}>{btnText}</Button>;
                    })()}
                </div>
            </div>

            <div className={`tab-navigation theme-${currentTheme.type}`}>
                {['gold', 'silver', 'gold_cert', 'silver_cert', 'photo_cert'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab); navigate(`?tab=${tab}`); }}
                    >
                        {getTypeLabel(tab)}
                    </button>
                ))}
            </div>

            <div className="kanban-grid">
                {columnsConfig.map(col => {
                    const colItems = filteredItems.filter(t => t.status === col.id);
                    return (
                        <div key={col.id} className="kanban-column">
                            <div className="column-header" style={{ backgroundColor: col.color, color: 'white' }}>
                                <h3 className="column-title">{col.title}</h3>
                                <span className="column-count" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                                    {colItems.length}
                                </span>
                            </div>

                            <div className="column-body">
                                {colItems.map(item => {
                                    const isReady = item.status === 'IN_PROGRESS' && Number(item.total || 0) > 0 && !!item.mode_of_payment;
                                    const shortId = item.auto_number?.split('-')[1] || item.auto_number;
                                    return (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className="kanban-card mb-3"
                                            onClick={() => handleCardClick(item)}
                                            onContextMenu={(e) => handleContextMenu(e, item)}
                                        >
                                            <div className="card-top d-flex justify-content-between">
                                                <div className="card-customer">{item.customer_name || 'Anonymous'}</div>
                                                <Badge bg="dark" className="p-2">#{shortId}</Badge>
                                            </div>
                                            <div className="card-meta">
                                                <FaClock className="me-1" /> {formatDate(item.createdon)}
                                            </div>
                                            {isReady && <div className="ready-indicator"><FaCheck /></div>}
                                            <div className="card-footer">
                                                <span className="type-tag">{item.type.replace('_cert', '')}</span>
                                                {item.status !== 'TODO' && item.total > 0 && (
                                                    <span className="card-amount" style={{ color: col.color }}>
                                                        ₹{Number(item.total).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {colItems.length === 0 && (
                                    <div className="empty-state">No {col.title.toLowerCase()} items</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <NewGoldTestModal
                show={showNewTestModal}
                onHide={() => setShowNewTestModal(false)}
                onSuccess={fetchData}
            />
            <NewSilverTestModal
                show={showSilverTestModal}
                onHide={() => setShowSilverTestModal(false)}
                onSuccess={fetchData}
            />
            <NewCertificateModal
                show={certModal.show}
                type={certModal.type}
                onHide={() => setCertModal({ ...certModal, show: false })}
                onSuccess={fetchData}
            />
            <Phase2Modal
                show={phase2Modal.show}
                test={phase2Modal.test}
                readOnly={phase2Modal.readOnly}
                onHide={() => setPhase2Modal({ ...phase2Modal, show: false })}
                onSuccess={fetchData}
            />

            {contextMenu.visible && (
                <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button className="menu-item" onClick={handleReceipt}>
                        <FaFileInvoice className="me-2" /> View Receipt
                    </button>
                    <button className="menu-item danger" onClick={handleDelete}>
                        <FaTrash className="me-2" /> Delete Permanent
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkflowBoard;


