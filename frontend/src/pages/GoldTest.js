import React, { useState, useEffect } from 'react';
import { Button, Badge, Spinner, Container, Row, Col, Modal } from 'react-bootstrap';
import { FaPlus, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import NewGoldTestModal from '../components/NewGoldTestModal';
import PaymentDeliveryModal from '../components/PaymentDeliveryModal';

const STATUS_COLUMNS = [
    { id: 'TODO', label: 'Ongoing', color: 'primary', bg: '#0d6efd' },
    { id: 'IN_PROGRESS', label: 'Tested', color: 'warning', bg: '#ffc107' },
    { id: 'DONE', label: 'Completed', color: 'success', bg: '#198754' }
];

const UpdatePurityModal = ({ show, onHide, testId, onUpdate }) => {
    const [test, setTest] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show && testId) {
            fetchDetails();
        }
    }, [show, testId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/gold-tests/${testId}`);
            if (res.data.success) {
                setTest(res.data.data);
                // Ensure items are sorted or ordered if needed
                setItems(res.data.data.items || []);
            }
        } catch (error) {
            toast.error('Failed to load details');
            onHide();
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSaveItem = async (index) => {
        const item = items[index];

        // Validation
        const purity = parseFloat(item.purity);
        if (isNaN(purity) || purity <= 0 || purity > 100) {
            toast.error('Invalid Purity. Must be between 0 and 100.');
            return;
        }

        setSaving(true);
        try {
            await api.put(`/gold-tests/${test.id}/items/${item.id}`, {
                purity: purity,
                returned: item.returned
            });
            toast.success('Item updated');
            // Update the local state to match persisted? It is already local.
            if (onUpdate) onUpdate(); // Refresh board cards if needed
        } catch (error) {
            console.error(error);
            toast.error('Failed to update item');
        } finally {
            setSaving(false);
        }
    };

    if (!test) return null;

    const isReadOnly = test.status === 'DONE';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Update Purity
                    <span className="ms-2 text-muted h6 mb-0">({test.id})</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? <div className="text-center py-4"><Spinner animation="border" /></div> : (
                    <div>
                        <div className="d-flex justify-content-between mb-3 bg-light p-2 rounded">
                            <span><strong>Customer:</strong> {test.customer_name}</span>
                            <span><strong>Date:</strong> {new Date(test.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Item</th>
                                        <th>Details</th>
                                        <th style={{ width: '120px' }}>Purity (%)</th>
                                        <th style={{ width: '100px' }}>Returned</th>
                                        <th style={{ width: '80px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>{item.item_type}</strong>
                                                <div className="text-muted small">{item.item_no}</div>
                                            </td>
                                            <td>
                                                <div className="small">Gross: {item.sample_weight}g</div>
                                                <div className="small">Test: {item.test_weight}g</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={item.purity} // Controlled input
                                                    onChange={(e) => handleFieldChange(index, 'purity', e.target.value)}
                                                    disabled={isReadOnly}
                                                    step="0.01"
                                                    min="0.01"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check d-flex justify-content-center">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={!!item.returned}
                                                        onChange={(e) => handleFieldChange(index, 'returned', e.target.checked)}
                                                        disabled={isReadOnly}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                {!isReadOnly && (
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        disabled={saving}
                                                        onClick={() => handleSaveItem(index)}
                                                    >
                                                        Save
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

const GoldTest = () => {
    const [columns, setColumns] = useState({
        TODO: [],
        IN_PROGRESS: [],
        DONE: []
    });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [paymentModalTestId, setPaymentModalTestId] = useState(null);

    const fetchColumnData = async (status) => {
        try {
            const res = await api.get(`/gold-tests?status=${status}&limit=100`);
            return res.data.success ? res.data.data : [];
        } catch (error) {
            console.error(`Error fetching ${status}:`, error);
            toast.error(`Failed to load ${status} items`);
            return [];
        }
    };

    const loadBoard = async () => {
        setLoading(true);
        try {
            const [todo, inProgress, done] = await Promise.all([
                fetchColumnData('TODO'),
                fetchColumnData('IN_PROGRESS'),
                fetchColumnData('DONE')
            ]);
            setColumns({
                TODO: todo,
                IN_PROGRESS: inProgress,
                DONE: done
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBoard();
    }, []);

    const handleMove = async (test, targetStatus) => {
        // Special case: IN_PROGRESS -> DONE triggers Payment/Delivery Modal
        if (targetStatus === 'DONE') {
            setPaymentModalTestId(test.id);
            return;
        }

        const originalColumns = { ...columns };

        // Optimistic UI Update
        const sourceStatus = test.status;
        setColumns(prev => {
            const sourceList = prev[sourceStatus].filter(t => t.id !== test.id);
            const targetList = [{ ...test, status: targetStatus }, ...prev[targetStatus]];
            return {
                ...prev,
                [sourceStatus]: sourceList,
                [targetStatus]: targetList
            };
        });

        try {
            await api.patch(`/gold-tests/${test.id}/status`, { status: targetStatus });
            toast.success(`Moved to ${STATUS_COLUMNS.find(c => c.id === targetStatus).label}`);
            // Optional: Reload to ensure consistency vs purely optimistic
            // loadBoard(); 
        } catch (error) {
            // Revert on failure
            setColumns(originalColumns);
            toast.error(error.response?.data?.error || 'Move failed');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    // Helper to get next valid status
    const getNextStatus = (currentStatus) => {
        if (currentStatus === 'TODO') return 'IN_PROGRESS';
        if (currentStatus === 'IN_PROGRESS') return 'DONE';
        return null;
    };

    return (
        <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">Gold Test Workflow</h2>
                    <p className="text-muted mb-0">Manage your gold tests</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="link" className="text-decoration-none text-secondary" onClick={loadBoard}>
                        {loading ? <Spinner animation="border" size="sm" /> : <span className="d-flex align-items-center gap-1"><FaSync /> Refresh</span>}
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(true)}>
                        <FaPlus className="me-2" /> New Gold Test
                    </Button>
                </div>
            </div>

            <Row>
                {STATUS_COLUMNS.map(col => {
                    const items = columns[col.id] || [];
                    return (
                        <Col key={col.id} md={4}>
                            <div className="d-flex justify-content-between align-items-center text-white p-3 rounded-top" style={{ backgroundColor: col.bg }}>
                                <h6 className="mb-0 fw-bold">{col.label}</h6>
                                <Badge bg="light" text="dark" pill>{items.length}</Badge>
                            </div>
                            <div className="bg-light border border-top-0 rounded-bottom p-3" style={{ minHeight: '70vh' }}>
                                {items.map(item => (
                                    <div key={item.id} className="card mb-3 shadow-sm border-0">
                                        <div className="card-body p-3">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div style={{ cursor: 'pointer' }} onClick={() => setSelectedTestId(item.id)}>
                                                    <h6 className="fw-bold mb-1 text-dark" title={item.id}>
                                                        {item.customer_name || 'Unknown Customer'}
                                                    </h6>
                                                    <small className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>
                                                        {item.id.substring(0, 8)}... • {formatDate(item.created_at)}
                                                    </small>
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center">
                                                <Badge bg="light" text="dark" className="border">GOLD TEST</Badge>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        className="py-0 border"
                                                        onClick={() => setSelectedTestId(item.id)}
                                                    >
                                                        View
                                                    </Button>
                                                    {getNextStatus(item.status) && (
                                                        <Button
                                                            variant="link"
                                                            className="p-0 text-decoration-none fw-bold"
                                                            style={{ fontSize: '0.85rem' }}
                                                            onClick={() => handleMove(item, getNextStatus(item.status))}
                                                        >
                                                            Move
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {items.length === 0 && !loading && (
                                    <div className="text-center text-muted py-5 opacity-50">
                                        <small>No items</small>
                                    </div>
                                )}
                            </div>
                        </Col>
                    );
                })}
            </Row>

            <NewGoldTestModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSuccess={loadBoard}
            />

            <UpdatePurityModal
                show={!!selectedTestId}
                testId={selectedTestId}
                onHide={() => setSelectedTestId(null)}
                onUpdate={loadBoard}
            />

            <PaymentDeliveryModal
                show={!!paymentModalTestId}
                testId={paymentModalTestId}
                onHide={() => setPaymentModalTestId(null)}
                onSuccess={loadBoard}
            />
        </Container>
    );
};

export default GoldTest;
