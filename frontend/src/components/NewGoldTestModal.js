import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, ListGroup, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaSearch } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';
import NewCustomerModal from './NewCustomerModal';

const emptyDraft = {
    item: '',
    sampleWeight: '',
    netWeight: '',
    returned: false
};

const parseWeight = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
};

const toFixedNumber = (value, digits) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Number(num.toFixed(digits));
};

const deriveWeights = (draft) => {
    const sampleWeight = parseWeight(draft.sampleWeight);
    const netWeight = parseWeight(draft.netWeight);
    const normalizedNet = netWeight === null ? 0 : netWeight;
    const totalWeight = sampleWeight !== null ? sampleWeight + normalizedNet : null;
    return { sampleWeight, totalWeight, netWeight: normalizedNet };
};

const NewGoldTestModal = ({ show, onHide, onSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const dropdownRef = useRef(null);

    const [sampleDraft, setSampleDraft] = useState(emptyDraft);
    const [sampleItems, setSampleItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const currentDate = new Date().toLocaleDateString('en-US');

    useEffect(() => {
        if (show) {
            fetchCustomers();
            resetForm();
        }
    }, [show]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCustomers([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        const matches = customers
            .filter((c) => (c.name && c.name.toLowerCase().includes(term)) || (c.phone && c.phone.includes(term)))
            .slice(0, 5);
        setFilteredCustomers(matches);
    }, [searchTerm, customers]);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setCustomers(data);
        } catch (_error) {
            toast.error('Unable to load customers');
        }
    };

    const resetForm = () => {
        setSearchTerm('');
        setShowSuggestions(false);
        setSelectedCustomer(null);
        setSampleDraft(emptyDraft);
        setSampleItems([]);
    };

    const customerDisplay = (customer) => {
        if (!customer) return '';
        return `${customer.name}${customer.phone ? `(${customer.phone})` : ''}`;
    };

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setSearchTerm(customerDisplay(customer));
        setShowSuggestions(false);
    };

    const handleCustomerCreated = async (newCustomer) => {
        await fetchCustomers();
        if (newCustomer) {
            handleCustomerSelect(newCustomer);
        }
        setShowCustomerModal(false);
    };

    const handleWeightFieldInput = (field, value) => {
        setSampleDraft((prev) => {
            const next = { ...prev, [field]: value };
            const parsedNet = parseWeight(next.netWeight);
            return {
                ...next,
                returned: Number(parsedNet) > 0
            };
        });
    };

    const handleWeightFieldBlur = (field) => {
        setSampleDraft((prev) => {
            const parsed = parseWeight(prev[field]);
            if (parsed === null) return prev;
            return { ...prev, [field]: parsed.toFixed(3) };
        });
    };

    const toggleReturned = () => {
        // Returned is controlled by net weight rule:
        // net > 0 => true, net <= 0 => false
    };

    const addSampleToList = () => {
        const item = sampleDraft.item.trim();
        const derived = deriveWeights(sampleDraft);
        const sampleWtRaw = derived.sampleWeight;
        const totalWtRaw = derived.totalWeight !== null ? derived.totalWeight : 0;
        const netWtRaw = derived.netWeight;
        const sampleWt = toFixedNumber(sampleWtRaw, 3);
        const totalWt = toFixedNumber(totalWtRaw, 3);
        const netWt = toFixedNumber(netWtRaw, 3);

        if (!item || sampleWt === null || totalWt === null || netWt === null) {
            toast.error('Please enter at least Item Type and Sample Weight');
            return;
        }
        setSampleItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random()}`,
                seq: prev.length + 1,
                item,
                sampleWeight: sampleWt,
                totalWeight: totalWt,
                netWeight: Math.max(0, netWt),
                returned: netWt > 0
            }
        ]);

        setSampleDraft(emptyDraft);
    };

    const removeSample = (id) => {
        setSampleItems((prev) => prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, seq: idx + 1 })));
    };

    const handleSave = async () => {
        if (!selectedCustomer) {
            toast.error('Please select a customer');
            return;
        }
        if (sampleItems.length === 0) {
            toast.error('Add at least one sample item');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customer_id: selectedCustomer.id,
                items: sampleItems.map((s) => ({
                    item_name: s.item,
                    weight: s.totalWeight,
                    sample_weight: s.sampleWeight,
                    description: selectedCustomer.name,
                    returned: s.returned
                }))
            };

            await api.post('/gold-tests', payload);
            toast.success('Gold Test Created Successfully');
            if (onSuccess) onSuccess();
            onHide();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create test');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered className="new-sample-modal">
            <Modal.Header closeButton className="new-sample-header">
                <Modal.Title className="fw-bold">New Sample Entry</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label className="field-label">Date <span className="required">*</span></Form.Label>
                    <Form.Control value={currentDate} readOnly />
                </Form.Group>

                <Form.Group className="mb-3" ref={dropdownRef}>
                    <Form.Label className="field-label">Customer Search <span className="required">*</span></Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                            placeholder="Search by name or phone"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                                if (!e.target.value.trim()) {
                                    setSelectedCustomer(null);
                                }
                            }}
                            onFocus={() => setShowSuggestions(true)}
                        />
                    </InputGroup>

                    {showSuggestions && searchTerm && (
                        <ListGroup className="suggestion-list">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((c) => (
                                    <ListGroup.Item
                                        key={c.id}
                                        action
                                        onClick={() => handleCustomerSelect(c)}
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <span>{customerDisplay(c)}</span>
                                        <Badge bg={c.deletedon ? 'danger' : 'success'}>{c.deletedon ? 'Inactive' : 'Active'}</Badge>
                                    </ListGroup.Item>
                                ))
                            ) : (
                                <ListGroup.Item className="text-center text-muted">
                                    No customers found.{' '}
                                    <Button variant="link" size="sm" onClick={() => setShowCustomerModal(true)}>Create New?</Button>
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    )}
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="field-label">Customer Name <span className="required">*</span></Form.Label>
                    <Form.Control value={customerDisplay(selectedCustomer)} readOnly />
                </Form.Group>

                <Form.Label className="field-label mb-2">Sample Items</Form.Label>
                <Row className="g-2 mb-2">
                    <Col md={6}>
                        <Form.Control
                            placeholder="Item type (eg., Ring, Necklace)"
                            value={sampleDraft.item}
                            onChange={(e) => setSampleDraft((prev) => ({ ...prev, item: e.target.value }))}
                        />
                    </Col>
                    <Col md={6}>
                        <Form.Control
                            type="number"
                            step="0.001"
                            placeholder="Sample Wt (g)"
                            value={sampleDraft.sampleWeight}
                            onChange={(e) => handleWeightFieldInput('sampleWeight', e.target.value)}
                            onBlur={() => handleWeightFieldBlur('sampleWeight')}
                        />
                    </Col>
                </Row>
                <Row className="g-2 mb-3">
                    <Col md={12}>
                        <Form.Control
                            type="number"
                            step="0.001"
                            placeholder="Net Wt (g)"
                            value={sampleDraft.netWeight}
                            onChange={(e) => handleWeightFieldInput('netWeight', e.target.value)}
                            onBlur={() => handleWeightFieldBlur('netWeight')}
                        />
                    </Col>
                </Row>

                <div className="returned-row mb-3">
                    <span className="field-label mb-0">Returned</span>
                    <Form.Check
                        type="switch"
                        checked={sampleDraft.returned}
                        onChange={toggleReturned}
                        disabled
                    />
                </div>

                <Button className="add-sample-btn" onClick={addSampleToList}>
                    <FaPlus className="me-1" /> Add Sample Item
                </Button>

                <div className="sample-list-panel mt-3">
                    <div className="sample-list-head">
                        <span>Sample Items</span>
                        <span className="count-pill">{sampleItems.length} items</span>
                    </div>
                    <div className="sample-list-body">
                        {sampleItems.length === 0 ? (
                            <div className="empty-list">No samples added yet</div>
                        ) : sampleItems.map((s) => (
                            <div key={s.id} className="sample-row">
                                <div className="sample-main">
                                    <div className="sample-title">
                                        #{s.seq} - {s.item}{' '}
                                        <Badge bg={s.returned ? 'success' : 'danger'} className="status-badge">
                                            {s.returned ? 'Returned' : 'Not Returned'}
                                        </Badge>
                                    </div>
                                    <div className="sample-meta">
                                        Sample: {s.sampleWeight}g | Total: {s.totalWeight}g | Net: {s.netWeight}g
                                    </div>
                                </div>
                                <Button variant="outline-danger" size="sm" onClick={() => removeSample(s.id)}>
                                    <FaTrash className="me-1" /> Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="new-sample-footer">
                <Button variant="primary" className="save-btn" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline-secondary" className="cancel-btn" onClick={onHide} disabled={loading}>
                    Cancel
                </Button>
            </Modal.Footer>

            <NewCustomerModal
                show={showCustomerModal}
                onHide={() => setShowCustomerModal(false)}
                onSuccess={handleCustomerCreated}
            />

            <style>{`
                .new-sample-modal .modal-content {
                    border-radius: 12px;
                    border: none;
                }
                .new-sample-header {
                    border-bottom: 1px solid #dee2e6;
                    padding-bottom: 10px;
                }
                .field-label {
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: #374151;
                }
                .required {
                    color: #ef4444;
                }
                .suggestion-list {
                    position: absolute;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    max-height: 220px;
                    overflow-y: auto;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                }
                .returned-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .add-sample-btn {
                    width: 100%;
                    border: none;
                    background: #3b82f6;
                    font-weight: 600;
                }
                .add-sample-btn:hover {
                    background: #2563eb;
                }
                .sample-list-panel {
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .sample-list-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    color: #fff;
                    font-weight: 700;
                    background: linear-gradient(90deg, #5b6ee1, #7456b7);
                }
                .count-pill {
                    font-size: 0.74rem;
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 999px;
                    padding: 3px 10px;
                }
                .sample-list-body {
                    background: #fff;
                }
                .empty-list {
                    padding: 14px 12px;
                    color: #6b7280;
                    font-size: 0.9rem;
                }
                .sample-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border-top: 1px solid #e5e7eb;
                }
                .sample-main {
                    min-width: 0;
                }
                .sample-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #111827;
                }
                .sample-meta {
                    font-size: 0.82rem;
                    color: #4b5563;
                }
                .status-badge {
                    font-size: 0.65rem;
                    margin-left: 6px;
                    vertical-align: middle;
                }
                .new-sample-footer {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    border-top: none;
                }
                .save-btn {
                    border: none;
                    background: linear-gradient(90deg, #5664df, #4f7bea);
                    font-weight: 700;
                }
                .cancel-btn {
                    font-weight: 600;
                }
            `}</style>
        </Modal>
    );
};

export default NewGoldTestModal;
