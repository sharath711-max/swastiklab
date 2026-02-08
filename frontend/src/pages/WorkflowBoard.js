import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Spinner, Dropdown, DropdownButton, ButtonGroup, Modal } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import api from '../services/api';
import NewGoldTestModal from '../components/NewGoldTestModal';
import NewSilverTestModal from '../components/NewSilverTestModal';
import NewCertificateModal from '../components/NewCertificateModal';
import Phase2Modal from '../components/Phase2Modal';

const WorkflowBoard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [showSilverTestModal, setShowSilverTestModal] = useState(false);
    const [certModal, setCertModal] = useState({ show: false, type: 'gold' });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
    const [activeTab, setActiveTab] = useState('gold');

    // Phase 2 Modal State
    const [phase2Modal, setPhase2Modal] = useState({ show: false, test: null, readOnly: false });
    // Generic Read Only Modal State (for TODO)
    const [summaryModal, setSummaryModal] = useState({ show: false, item: null });

    // Sync activeTab with URL query param 'tab'
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
            toast.error('Failed to update workflow board');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateStatus = async (type, id, newStatus) => {
        try {
            await api.patch(`/workflow/${type}/${id}/status`, { status: newStatus });
            toast.success(`Moved to ${newStatus}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleCardClick = async (item) => {
        try {
            let details = null;
            if (item.type === 'gold') {
                const res = await api.get(`/gold-tests/${item.id}`);
                details = res.data.data;
            } else if (item.type === 'silver') {
                // Assuming Silver endpoint follows pattern
                const res = await api.get(`/silver-tests/${item.id}`);
                details = res.data.data || res.data;
            } else if (item.type.includes('cert')) {
                // Map type: gold_cert -> gold, etc.
                const apiType = item.type.replace('_cert', '');
                const res = await api.get(`/certificates/${item.id}?type=${apiType}`);
                details = res.data;
            }

            if (!details) {
                toast.error("Could not fetch details");
                return;
            }

            // Inject type info so Phase2Modal knows what to render
            details.type = item.type;

            if (item.status === 'TODO') {
                setSummaryModal({ show: true, item: details });
            } else if (item.status === 'IN_PROGRESS') {
                setPhase2Modal({ show: true, test: details, readOnly: false });
            } else if (item.status === 'DONE') {
                setPhase2Modal({ show: true, test: details, readOnly: true });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load details");
            // If failed, maybe fallback to print view if it was a navigation error? 
            // navigate(`/print/${item.type}-test/${item.id}`);
        }
    };

    const columns = [
        { id: 'TODO', title: 'Ongoing', color: '#3b82f6' },      // Blue
        { id: 'IN_PROGRESS', title: 'Tested', color: '#f59e0b' }, // Orange/Amber
        { id: 'DONE', title: 'Completed', color: '#10b981' }      // Green
    ];

    const filteredItems = items.filter(item => {
        if (activeTab === 'ALL') return true;
        return item.type === activeTab;
    });

    const getTypeLabel = (type) => {
        switch (type) {
            case 'gold': return 'Gold Test';
            case 'silver': return 'Silver Test';
            case 'gold_cert': return 'Gold Cert';
            case 'silver_cert': return 'Silver Cert';
            case 'photo_cert': return 'Photo Cert';
            default: return type;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            item: item
        });
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
                    toast.success('Deleted successfully');
                    fetchData();
                } catch (error) {
                    toast.error('Failed to delete');
                }
            }
        }
        handleCloseContextMenu();
    };

    // Close context menu when clicking outside
    useEffect(() => {
        if (contextMenu.visible) {
            document.addEventListener('click', handleCloseContextMenu);
            return () => document.removeEventListener('click', handleCloseContextMenu);
        }
    }, [contextMenu.visible]);

    if (loading && items.length === 0) {
        return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    }
    return (
        <Container fluid className="py-4 workflow-board-page" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <ToastContainer />
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">{getTypeLabel(activeTab)} Workflow</h2>
                    <p className="text-muted mb-0">Manage your {getTypeLabel(activeTab).toLowerCase()}s</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={fetchData} size="sm">
                        Refresh
                    </Button>

                    {(() => {
                        switch (activeTab) {
                            case 'gold':
                                return (
                                    <Button variant="primary" size="sm" onClick={() => setShowNewTestModal(true)}>
                                        + New Gold Test
                                    </Button>
                                );
                            case 'silver':
                                return (
                                    <Button variant="primary" size="sm" onClick={() => setShowSilverTestModal(true)}>
                                        + New Silver Test
                                    </Button>
                                );
                            case 'gold_cert':
                                return (
                                    <Button variant="primary" size="sm" onClick={() => setCertModal({ show: true, type: 'gold' })}>
                                        + New Gold Certificate
                                    </Button>
                                );
                            case 'silver_cert':
                                return (
                                    <Button variant="primary" size="sm" onClick={() => setCertModal({ show: true, type: 'silver' })}>
                                        + New Silver Certificate
                                    </Button>
                                );
                            case 'photo_cert':
                                return (
                                    <Button variant="primary" size="sm" onClick={() => setCertModal({ show: true, type: 'photo' })}>
                                        + New Photo Certificate
                                    </Button>
                                );
                            default:
                                return (
                                    <DropdownButton
                                        as={ButtonGroup}
                                        title="+ New Item"
                                        variant="primary"
                                        size="sm"
                                    >
                                        <Dropdown.Item onClick={() => setShowNewTestModal(true)}>Gold Test</Dropdown.Item>
                                        <Dropdown.Item onClick={() => setShowSilverTestModal(true)}>Silver Test</Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={() => setCertModal({ show: true, type: 'gold' })}>Gold Certificate</Dropdown.Item>
                                        <Dropdown.Item onClick={() => setCertModal({ show: true, type: 'silver' })}>Silver Certificate</Dropdown.Item>
                                        <Dropdown.Item onClick={() => setCertModal({ show: true, type: 'photo' })}>Photo Certificate</Dropdown.Item>
                                    </DropdownButton>
                                );
                        }
                    })()}
                </div>
            </div>

            <Row className="g-4">
                {columns.map(col => (
                    <Col key={col.id} lg={4}>
                        <div className="kanban-column shadow-sm" style={{ backgroundColor: 'white', borderRadius: '8px', height: '100%', border: 'none' }}>
                            {/* Solid Header */}
                            <div className="d-flex justify-content-between align-items-center p-3"
                                style={{
                                    backgroundColor: col.color,
                                    color: 'white',
                                    borderRadius: '8px 8px 0 0',
                                    fontWeight: '600',
                                    fontSize: '1.1rem'
                                }}>
                                <span>{col.title}</span>
                                <Badge bg="light" text="dark" pill className="px-3">
                                    {filteredItems.filter(t => t.status === col.id).length}
                                </Badge>
                            </div>

                            {/* Column Content */}
                            <div className="p-3" style={{ minHeight: '600px', backgroundColor: '#f8f9fa' }}>
                                {filteredItems.filter(t => t.status === col.id).map(item => (
                                    <Card key={`${item.type}-${item.id}`} className="mb-3 border-0 shadow-sm"
                                        style={{ cursor: 'pointer', borderRadius: '8px' }}
                                        onClick={() => handleCardClick(item)}
                                        onContextMenu={(e) => handleContextMenu(e, item)}>
                                        <Card.Body className="p-3">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <h6 className="fw-bold text-dark mb-1">
                                                    {item.customer_name}
                                                </h6>
                                                {/* Hidden Internal ID as per policy */}
                                            </div>

                                            <div className="text-muted small mb-2">
                                                {formatDate(item.createdon)}
                                            </div>

                                            <div className="d-flex justify-content-between align-items-end mt-2">
                                                <Badge bg="light" text="dark" className="border fw-normal">
                                                    {getTypeLabel(item.type)}
                                                </Badge>

                                                {/* Action Buttons (Mini) */}
                                                <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {col.id === 'TODO' && (
                                                        <Button variant="outline-primary" size="sm" className="py-0 px-2" style={{ fontSize: '0.7rem' }}
                                                            onClick={() => updateStatus(item.type, item.id, 'IN_PROGRESS')}>
                                                            Testing
                                                        </Button>
                                                    )}
                                                    {col.id === 'IN_PROGRESS' && (
                                                        <Button variant="outline-success" size="sm" className="py-0 px-2" style={{ fontSize: '0.7rem' }}
                                                            onClick={() => updateStatus(item.type, item.id, 'DONE')}>
                                                            Ready
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        minWidth: '150px',
                        overflow: 'hidden'
                    }}
                >
                    <button
                        className="context-menu-item"
                        onClick={handleReceipt}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                        📄 Receipt
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={handleDelete}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            color: '#dc3545'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                        🗑️ Delete
                    </button>
                </div>
            )}

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
            // If I add a 'readOnly' prop to Phase2Modal, I need to implement it in Phase2Modal.js
            // I checked Phase2Modal.js and used `CURRENT_SYSTEM !== 'LAB'` for read-only.
            // But I also want to enforce read-only for DONE status regardless of system.
            // The current Phase2Modal only checks SYSTEM. I should pass a prop `readOnlyOverride` or something.
            // I will add a `readOnly` prop support to Phase2Modal in next step.
            />

            {/* Simple Intake Summary Modal */}
            <Modal show={summaryModal.show} onHide={() => setSummaryModal({ show: false, item: null })}>
                <Modal.Header closeButton>
                    <Modal.Title>Intake Summary (Read Only)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {summaryModal.item && (
                        <div>
                            <h5>Customer: {summaryModal.item.customer_name}</h5>
                            {/* Hidden Internal ID */}
                            <hr />
                            <h6>Items</h6>
                            <ul className="list-group">
                                {summaryModal.item.items && summaryModal.item.items.map(i => (
                                    <li key={i.id} className="list-group-item d-flex justify-content-between">
                                        <span>{i.item_type} ({i.item_no})</span>
                                        <span>{i.sample_weight}g / {i.test_weight}g</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 text-end">
                                <Badge bg="primary">{summaryModal.item.status}</Badge>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setSummaryModal({ show: false, item: null })}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    );
};

export default WorkflowBoard;
