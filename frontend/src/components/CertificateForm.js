import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Table, InputGroup, ListGroup, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaCamera, FaImage, FaSearch } from 'react-icons/fa';
import api from '../services/api';

const CertificateForm = ({ onSubmit, onCancel, initialData = null, forcedType = null }) => {
    // Determine type from forcedType, ID prefix, or initialData
    const initialType = forcedType ||
        (initialData?.id?.startsWith('GTS') ? 'gold' :
            initialData?.id?.startsWith('STS') ? 'silver' :
                initialData?.certificate_type || 'gold');

    const [type, setType] = useState(initialType);
    const [includeGst, setIncludeGst] = useState(false);

    // Customer Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const dropdownRef = useRef(null);

    // Map promoteData items (item, total_weight) to certificate items (item_name, weight)
    const initialItems = initialData?.items?.map(i => ({
        customer_name_tag: i.description || '', // Mapping description/name
        item_name: i.item || '',
        weight: i.total_weight || '',
        gross_weight: i.total_weight || '',
        test_weight: i.test_weight || '',
        purity: i.purity || '',
        carat: i.carat || '',
        rate: i.rate_per_gram || '',
        amount: i.total || 0,
        sub_certificate_number: i.sub_certificate_number || ''
    })) || [{ customer_name_tag: '', item_name: '', weight: '', gross_weight: '', test_weight: '', purity: '', carat: '', rate: '', amount: 0, sub_certificate_number: '' }];

    const [items, setItems] = useState(initialItems);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Initial Fetch for Customers
    useEffect(() => {
        fetchCustomers();
        if (initialData?.customer_id && initialData.customer) {
            setSelectedCustomer({
                id: initialData.customer_id,
                name: initialData.customer.name,
                phone: initialData.customer.phone,
                address: initialData.customer.address
            });
            setSearchTerm(initialData.customer.name);
        }
    }, [initialData]);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data.data || res.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // Filter customers effect
    useEffect(() => {
        if (!searchTerm) {
            setFilteredCustomers([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        const matches = customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.phone && c.phone.includes(term))
        ).slice(0, 5);
        setFilteredCustomers(matches);
    }, [searchTerm, customers]);

    // Close dropdown on outside click
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

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setSearchTerm(customer.name);
        setShowSuggestions(false);

        // Auto-fill first item name
        setItems(prev => {
            const newItems = [...prev];
            if (newItems.length > 0) {
                newItems[0] = { ...newItems[0], name: customer.name };
            }
            return newItems;
        });
    };

    // Ensure type is updated if forcedType changes
    useEffect(() => {
        if (forcedType) setType(forcedType);
    }, [forcedType]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { name: selectedCustomer?.name || '', item_name: '', weight: '', gross_weight: '', test_weight: '', purity: '', carat: '', rate: '', amount: 0, sub_certificate_number: '' }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ... validation ...
        if (!selectedCustomer) {
            alert("Please select a customer.");
            return;
        }



        const data = {
            customer_id: selectedCustomer.id,
            customer: {
                name: selectedCustomer.name,
                phone: selectedCustomer.phone,
                address: selectedCustomer.address
            },
            type,
            includeGst,
            items: items.map(item => {
                const mappedItem = {
                    ...item,
                    item_no: item.sub_certificate_number || null,
                    item_type: item.item_name,
                    name: item.name,
                };

                if (type === 'silver' || type === 'photo') {
                    mappedItem.gross_weight = parseFloat(item.weight || 0);
                    if (type === 'silver') {
                        mappedItem.test_weight = mappedItem.test_weight || 0;
                        mappedItem.net_weight = mappedItem.net_weight || mappedItem.gross_weight;
                    }
                } else {
                    mappedItem.gross_weight = parseFloat(item.gross_weight || 0);
                    mappedItem.test_weight = parseFloat(item.test_weight || 0);
                    mappedItem.rate_per_gram = 0;
                    mappedItem.net_weight = mappedItem.gross_weight - mappedItem.test_weight;
                }

                mappedItem.purity = parseFloat(item.purity || 0);
                return mappedItem;
            })
        };

        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        if (photo) {
            formData.append('photo', photo);
        }

        onSubmit(formData);
    };

    return (
        <Form onSubmit={handleSubmit}>
            {/* ... keep top section ... */}
            {/* Customer Search Section */}
            <div className="p-3 border rounded mb-4 bg-white shadow-sm">
                <Row className="g-3 align-items-center">
                    <Col md={!forcedType ? 9 : 12} style={{ position: 'relative' }} ref={dropdownRef}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0 text-muted"><FaSearch /></InputGroup.Text>
                            <Form.Control
                                placeholder="Search Name or Phone..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                    if (!e.target.value) setSelectedCustomer(null);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                className="border-start-0 shadow-none fw-bold"
                            />
                            {selectedCustomer && (
                                <Button variant="outline-secondary" className="border-start-0" onClick={() => {
                                    setSelectedCustomer(null);
                                    setSearchTerm('');
                                }}>×</Button>
                            )}
                        </InputGroup>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && searchTerm && (
                            <ListGroup className="position-absolute w-100 shadow-sm start-0" style={{ zIndex: 1000, top: '100%', maxHeight: '200px', overflowY: 'auto' }}>
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
                                            <Badge bg={c.deletedon ? 'danger' : 'success'}>
                                                {c.deletedon ? 'Inactive' : 'Active'}
                                            </Badge>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <ListGroup.Item className="text-muted text-center">No customers found</ListGroup.Item>
                                )}
                            </ListGroup>
                        )}
                        {!selectedCustomer && searchTerm && !showSuggestions && (
                            <Form.Text className="text-danger ps-2">Please select a customer from the list.</Form.Text>
                        )}
                    </Col>

                    {!forcedType && (
                        <Col md={3}>
                            <Form.Select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="fw-bold"
                            >
                                <option value="gold">Gold</option>
                                <option value="silver">Silver</option>
                                <option value="photo">Photo</option>
                            </Form.Select>
                        </Col>
                    )}
                </Row>
            </div>

            <style>{`
                .dashed-border {
                     border-style: dashed;
                }
                .input-group-text {
                    background-color: #f8f9fa;
                    color: #6c757d;
                    font-size: 0.85rem;
                }
            `}</style>

            <Table responsive bordered hover size="sm" className="mb-3">
                <thead className="bg-light">
                    <tr>
                        {/* Name Column */}
                        <th>NAME</th>
                        {/* Item Type */}
                        <th>ITEM TYPE</th>

                        {type === 'gold' ? (
                            <>
                                <th style={{ width: '100px' }}>GROSS WT</th>
                                <th style={{ width: '100px' }}>TEST WT</th>
                                <th style={{ width: '80px' }}>NET WT</th>
                            </>
                        ) : (
                            <th style={{ width: '120px' }}>WT (g)</th>
                        )}

                        <th style={{ width: '50px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            {/* Name Field */}
                            <td>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    value={item.name || ''}
                                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                    placeholder="Name"
                                />
                            </td>

                            {/* Item Type Field */}
                            <td>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    value={item.item_name}
                                    onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                    required
                                    placeholder="Brief Description"
                                />
                            </td>

                            {type === 'gold' ? (
                                <>
                                    <td>
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            step="0.001"
                                            value={item.gross_weight || ''}
                                            onChange={(e) => handleItemChange(index, 'gross_weight', e.target.value)}
                                            required
                                        />
                                    </td>
                                    <td>
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            step="0.001"
                                            value={item.test_weight || ''}
                                            onChange={(e) => handleItemChange(index, 'test_weight', e.target.value)}
                                            required
                                        />
                                    </td>
                                    <td>
                                        <Form.Control
                                            size="sm"
                                            type="text"
                                            value={items[index].gross_weight && items[index].test_weight ? (items[index].gross_weight - items[index].test_weight).toFixed(3) : '0.000'}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </td>
                                </>
                            ) : (
                                <td>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        step="0.001"
                                        value={item.weight}
                                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                                        required
                                    />
                                </td>
                            )}

                            <td className="text-center">
                                {items.length > 1 && (
                                    <Button variant="outline-danger" size="sm" onClick={() => removeItem(index)} className="border-0">
                                        <FaTrash />
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Button variant="outline-primary" className="w-100 mt-2 py-1 dashed-border" onClick={addItem}>
                <FaPlus />
            </Button>

            <div className="modal-footer border-0 px-0 pb-0 mt-4">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" type="submit" className="px-4">Issue Certificate</Button>
            </div>
        </Form>
    );
};

export default CertificateForm;
