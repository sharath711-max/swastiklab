
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, ListGroup, Badge, Table } from 'react-bootstrap';
import { FaPlus, FaTrash, FaSearch } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';
import NewCustomerModal from './NewCustomerModal';

const NewGoldTestModal = ({ show, onHide, onSuccess }) => {
    // Customer Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]); // All customers (simulated global search)
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Full customer object
    const dropdownRef = useRef(null);

    const [balance, setBalance] = useState(0);
    const [items, setItems] = useState([
        { name: '', item: '', weight: '', sample_weight: '', returned: false }
    ]);
    const [loading, setLoading] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Fetch initial list of customers
    useEffect(() => {
        if (show) {
            fetchCustomers();
            // Reset form
            if (!selectedCustomer) {
                setItems([{ name: '', item: '', weight: '', sample_weight: '', returned: false }]);
                setBalance(0);
                setSearchTerm('');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Filter customers as user types
    useEffect(() => {
        if (!searchTerm) {
            setFilteredCustomers([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        // Debounce could be added here, but for client-side filtering of ~1000 records, it's fast enough.
        // Matches Name OR Phone
        const matches = customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.phone && c.phone.includes(term))
        ).slice(0, 5); // Limit to top 5 suggestions
        setFilteredCustomers(matches);
    }, [searchTerm, customers]);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setSearchTerm(customer.name); // Display name in search box
        setShowSuggestions(false);
        setBalance(customer.balance || 0);

        // Auto-fill first item name
        setItems(prev => {
            const newItems = [...prev];
            if (newItems.length > 0) {
                newItems[0] = { ...newItems[0], name: customer.name };
            }
            return newItems;
        });
    };

    const handleCustomerCreated = async (newCustomer) => {
        await fetchCustomers();
        if (newCustomer) {
            handleCustomerSelect(newCustomer);
        }
        setShowCustomerModal(false);
    };

    // Item handlers ...
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleCheckboxChange = (index) => {
        const newItems = [...items];
        newItems[index].returned = !newItems[index].returned;
        setItems(newItems);
    };

    const addItem = () => {
        let name = '';
        if (selectedCustomer) {
            name = selectedCustomer.name;
        }
        setItems([...items, { name, item: '', weight: '', sample_weight: '', returned: false }]);
    };

    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) {
            toast.error('Please select a customer');
            return;
        }

        if (items.some(i => !i.weight || !i.item)) {
            toast.error('Please fill in item details (Item name and Weight)');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customer_id: selectedCustomer.id, // Internal ID usage is allowed for API calls
                items: items.map(i => ({
                    item_name: i.item,
                    weight: parseFloat(i.weight),
                    sample_weight: i.sample_weight ? parseFloat(i.sample_weight) : 0,
                    description: i.name,
                    returned: i.returned
                }))
            };

            await api.post('/gold-tests', payload);
            toast.success('Gold Test Created Successfully');
            onSuccess();
            onHide();
            // Reset
            setItems([{ name: '', item: 'Gold Sample', weight: '', sample_weight: '', returned: false }]);
            setSelectedCustomer(null);
            setSearchTerm('');
            setBalance(0);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to create test');
        } finally {
            setLoading(false);
        }
    };

    const currentDate = new Date().toLocaleString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="new-test-modal">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">New Gold Test</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Customer Search Section */}
                <div className="p-3 border rounded mb-4 bg-white shadow-sm">
                    <Row className="g-3 align-items-center">
                        <Col md={9} style={{ position: 'relative' }} ref={dropdownRef}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0 text-muted"><FaSearch /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Search Customer (Name or Phone)..."
                                    className="border-start-0 shadow-none fw-bold"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                        if (!e.target.value) setSelectedCustomer(null);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                />
                                {selectedCustomer && (
                                    <Button variant="outline-seconday" className="border-start-0" onClick={() => {
                                        setSelectedCustomer(null);
                                        setSearchTerm('');
                                        setBalance(0);
                                    }}>
                                        ×
                                    </Button>
                                )}
                            </InputGroup>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && searchTerm && (
                                <ListGroup className="position-absolute w-100 shadow-sm" style={{ zIndex: 1000, top: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(c => (
                                            <ListGroup.Item
                                                key={c.id}
                                                action
                                                onClick={() => handleCustomerSelect(c)}
                                                className="d-flex justify-content-between align-items-center"
                                            >
                                                <div>
                                                    <div className="fw-bold">{c.name}</div>
                                                    <small className="text-muted">{c.phone}</small>
                                                </div>
                                                <div className="text-end">
                                                    <Badge bg={c.deletedon ? 'danger' : 'success'} className="mb-1">
                                                        {c.deletedon ? 'Inactive' : 'Active'}
                                                    </Badge>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: c.balance > 0 ? '#dc3545' : '#198754' }}>
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.balance || 0)}
                                                    </div>
                                                </div>
                                            </ListGroup.Item>
                                        ))
                                    ) : (
                                        <ListGroup.Item className="text-muted text-center">
                                            No customers found. <Button variant="link" size="sm" onClick={() => setShowCustomerModal(true)}>Create New?</Button>
                                        </ListGroup.Item>
                                    )}
                                </ListGroup>
                            )}
                        </Col>
                        <Col md={3}>
                            <InputGroup>
                                <InputGroup.Text className="bg-secondary text-white border-0">Balance</InputGroup.Text>
                                <Form.Control value={balance} disabled className="bg-white" />
                            </InputGroup>
                        </Col>
                    </Row>
                </div>

                {/* Date & Title */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">Sample Details</h6>
                    <InputGroup size="sm" style={{ width: '250px' }}>
                        <InputGroup.Text>Date</InputGroup.Text>
                        <Form.Control value={currentDate} disabled className="bg-white" />
                    </InputGroup>
                </div>

                {/* Items List */}
                <Table responsive bordered hover size="sm" className="mb-3">
                    <thead className="bg-light">
                        <tr>
                            <th>NAME</th>
                            <th>ITEM TYPE</th>
                            <th style={{ width: '100px' }}>GROSS WT</th>
                            <th style={{ width: '100px' }}>SAMPLE WT</th>
                            <th style={{ width: '80px' }}>NET WT</th>
                            <th style={{ width: '80px' }} className="text-center">RETURNED</th>
                            <th style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((row, index) => (
                            <tr key={index}>
                                <td>
                                    <Form.Control
                                        size="sm"
                                        placeholder="Name"
                                        value={row.name}
                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        size="sm"
                                        placeholder="Item"
                                        value={row.item}
                                        onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={row.weight}
                                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        step="0.01"
                                        placeholder="Sample"
                                        value={row.sample_weight}
                                        onChange={(e) => handleItemChange(index, 'sample_weight', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        value={row.weight && row.sample_weight ? (parseFloat(row.weight) - parseFloat(row.sample_weight)).toFixed(3) : '0.000'}
                                        readOnly
                                        className="bg-light"
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    <Form.Check
                                        type="switch"
                                        checked={row.returned}
                                        onChange={() => handleCheckboxChange(index)}
                                    />
                                </td>
                                <td className="text-center">
                                    {items.length > 1 && (
                                        <Button variant="outline-danger" size="sm" className="border-0" onClick={() => removeItem(index)}>
                                            <FaTrash size={14} />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Add Button */}
                <Button variant="outline-primary" className="w-100 mt-2 py-1 dashed-border" onClick={addItem}>
                    <FaPlus />
                </Button>

            </Modal.Body>
            <Modal.Footer className="border-0">
                <Button variant="primary" onClick={handleSubmit} disabled={loading} className="px-4">
                    {loading ? 'Creating...' : 'Submit'}
                </Button>
            </Modal.Footer>

            <NewCustomerModal
                show={showCustomerModal}
                onHide={() => setShowCustomerModal(false)}
                onSuccess={handleCustomerCreated}
            />

            <style>{`
                .dashed-border {
                    border-style: dashed;
                }
                .new-test-modal .modal-content {
                    border-radius: 12px;
                    border: none;
                }
                .input-group-text {
                    background-color: #f8f9fa;
                    color: #6c757d;
                    font-size: 0.85rem;
                }
            `}</style>
        </Modal >
    );
};

export default NewGoldTestModal;
