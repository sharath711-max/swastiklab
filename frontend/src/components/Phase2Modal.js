
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Alert, Badge, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FaCamera } from 'react-icons/fa';

// SIMULATION CONSTANT - Change to 'FRONT_DESK' to test restricted access
const CURRENT_SYSTEM = 'LAB';

const Phase2Modal = ({ show, onHide, test, onSuccess, readOnly = false }) => {
    const [items, setItems] = useState([]);
    const [modeOfPayment, setModeOfPayment] = useState('Cash');
    const [amount, setAmount] = useState(0);
    const [includeGst, setIncludeGst] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [photos, setPhotos] = useState({}); // { itemId: File }

    const isSystemReadOnly = CURRENT_SYSTEM !== 'LAB';
    const isModalReadOnly = readOnly || isSystemReadOnly;

    // Determine Type
    const isPhotoCert = test?.type === 'photo_cert' || test?.id?.startsWith('PCR');
    const isGoldTest = test?.type === 'gold' || test?.id?.startsWith('GT');
    const isSilverTest = test?.type === 'silver' || test?.id?.startsWith('ST');

    useEffect(() => {
        if (test) {
            setItems((test.items || []).map(item => ({
                ...item,
                purity: item.purity !== undefined ? item.purity : '',
                returned: item.returned === 1 || item.returned === true,
                show_kt: item.show_kt === 1 || item.show_kt === true // For Photo Cert
            })));
            setModeOfPayment(test.mode_of_payment || 'Cash');
            setAmount(test.total || 0);
            setIncludeGst(test.gst === 1);
            setPhotos({});
        }
    }, [test]);

    const handleItemChange = (index, field, value) => {
        if (isModalReadOnly) return;
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handlePhotoSelect = (itemId, file) => {
        if (file) {
            setPhotos(prev => ({ ...prev, [itemId]: file }));
        }
    };

    const validate = () => {
        for (const item of items) {
            // Purity Validation (Required for ALL types)
            const purity = parseFloat(item.purity);
            if (isNaN(purity) || purity <= 0 || purity > 100) {
                return `Invalid purity for item ${item.item_number}. Must be > 0 and <= 100.`;
            }

            // Photo Validation (Required for Photo Cert)
            if (isPhotoCert) {
                const hasNewPhoto = !!photos[item.id];
                const hasExistingPhoto = !!item.media;
                if (!hasNewPhoto && !hasExistingPhoto) {
                    return `Photo is required for item ${item.item_number}.`;
                }
            }
        }
        if (parseFloat(amount) < 0 || amount === '' || amount === null) {
            return "Invalid amount. Must be >= 0.";
        }
        return null;
    };

    const handleSave = async () => {
        const valError = validate();
        if (valError) {
            setError(valError);
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Determine Endpoint
            let endpoint = '';
            if (isGoldTest) endpoint = `/gold-tests/${test.id}/results`;
            else if (isSilverTest) endpoint = `/silver-tests/${test.id}/results`; // Assuming implementation
            else if (isPhotoCert) endpoint = `/certificates/${test.id}/results`;
            else endpoint = `/gold-tests/${test.id}/results`; // Fallback

            // Prepare Data
            const baseData = {
                mode_of_payment: modeOfPayment,
                total: parseFloat(amount),
                gst: includeGst ? 1 : 0
            };

            // If Photo Cert, we handle Photos + Items
            if (isPhotoCert) {
                // 1. Upload Photos (One by one due to backend limitation)
                const photoItemIds = Object.keys(photos);
                for (const itemId of photoItemIds) {
                    const file = photos[itemId];
                    const formData = new FormData();
                    formData.append('photo', file);
                    // Send minimal data to identify item
                    const itemData = {
                        type: 'photo',
                        photo_item_id: itemId,
                        items: [{ id: itemId }] // context
                    };
                    formData.append('data', JSON.stringify(itemData));

                    await api.post(endpoint, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                // 2. Update Text Data (Show Kt, Returned, Payment, Purity)
                const textData = {
                    type: 'photo',
                    ...baseData,
                    items: items.map(i => ({
                        id: i.id,
                        show_kt: i.show_kt,
                        returned: i.returned,
                        purity: i.purity
                    }))
                };

                // We send this as JSON in 'data' field because the endpoint expects multipart/form-data usually?
                // Actually step 72 supports req.body directly IF no file?
                // Step 72: "if (req.body.data) data = JSON.parse...". "let data = req.body".
                // So regular JSON post should work if no file.
                // Wait, endpoint has `upload.single('photo')`.
                // If I send regular JSON, `req.file` is undefined. `req.body` has JSON.
                // My backend logic handles `req.body` directly.
                // So I can send a regular JSON request for the text updates.

                await api.post(endpoint, textData);

                // Regular Gold/Silver Test
                await api.post(endpoint, {
                    ...baseData,
                    items: items.map(i => ({
                        id: i.id,
                        purity: parseFloat(i.purity),
                        returned: i.returned,
                        item_number: i.item_number
                    }))
                });
            }

            return true; // Indicate success
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Failed to save results');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!window.confirm('Are you sure you want to finalize? This action cannot be undone.')) return;

        // 1. Save First
        const saved = await handleSave();
        if (!saved) return;

        // 2. Update Status to DONE
        setLoading(true);
        try {
            await api.patch(`/workflow/${test.type}/${test.id}/status`, { status: 'DONE' });
            toast.success('Finalized successfully!');
            if (onSuccess) onSuccess();
            onHide();
        } catch (error) {
            console.error(error);
            toast.error('Failed to finalize status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={false} className="new-test-modal">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    Testing Actions
                    <span className="ms-3 fw-normal text-muted fs-6">{test?.customer_name}</span>
                    {isModalReadOnly && <Badge bg="secondary" className="ms-2">View Only</Badge>}
                    {isPhotoCert && <Badge bg="info" className="ms-2">Photo Cert</Badge>}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-3">
                {/* System Enforcement Message */}
                {isSystemReadOnly && (
                    <Alert variant="warning" className="mb-3">
                        Testing actions available on Lab system only.
                    </Alert>
                )}

                {error && <Alert variant="danger">{error}</Alert>}

                {/* Items List */}
                <Table responsive bordered hover size="sm" className="mb-4 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Item</th>
                            <th>Type</th>
                            <th style={{ width: '100px' }}>Purity % <span className="text-danger">*</span></th>
                            {isPhotoCert ? (
                                <>
                                    <th style={{ width: '150px' }}>Photo <span className="text-danger">*</span></th>
                                    <th style={{ width: '100px' }} className="text-center">Show Kt?</th>
                                </>
                            ) : (
                                <>
                                    <th style={{ width: '100px' }}>Total Wt</th>
                                    <th style={{ width: '100px' }}>Sample Wt</th>
                                </>
                            )}
                            <th style={{ width: '100px' }} className="text-center">Returned?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id}>
                                <td>{item.item_number}</td>
                                <td>{item.item_type}</td>

                                <td>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max="100"
                                        value={item.purity}
                                        onChange={(e) => handleItemChange(idx, 'purity', e.target.value)}
                                        disabled={isModalReadOnly}
                                        isInvalid={
                                            item.purity !== '' &&
                                            (item.purity <= 0 || item.purity > 100)
                                        }
                                    />
                                </td>

                                {isPhotoCert ? (
                                    <>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {(photos[item.id] || item.media) && (
                                                    <div style={{ width: 40, height: 40, overflow: 'hidden', borderRadius: 4, border: '1px solid #ddd' }}>
                                                        <img
                                                            src={photos[item.id] ? URL.createObjectURL(photos[item.id]) : `${api.defaults.baseURL}/${item.media}`}
                                                            alt=""
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                )}
                                                {!isModalReadOnly && (
                                                    <label className="btn btn-sm btn-outline-secondary p-1">
                                                        <FaCamera />
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={(e) => handlePhotoSelect(item.id, e.target.files[0])}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Form.Check
                                                checked={item.show_kt}
                                                onChange={(e) => handleItemChange(idx, 'show_kt', e.target.checked)}
                                                disabled={isModalReadOnly}
                                            />
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{item.sample_weight}</td>
                                        <td>{item.test_weight || item.sample_weight}</td>
                                    </>
                                )}

                                <td className="text-center">
                                    <Form.Check
                                        type="switch"
                                        checked={item.returned}
                                        onChange={(e) => handleItemChange(idx, 'returned', e.target.checked)}
                                        disabled={isModalReadOnly}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Payment Details Section */}
                {CURRENT_SYSTEM === 'LAB' && (
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">Mode of Payment</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={modeOfPayment}
                                        onChange={(e) => setModeOfPayment(e.target.value)}
                                        disabled={isModalReadOnly}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Balance">Balance</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">Test Amount (₹)</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={isModalReadOnly}
                                        isInvalid={parseFloat(amount) < 0}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Check
                                    type="switch"
                                    id="gst-switch-phase2"
                                    label="Include GST"
                                    checked={includeGst}
                                    onChange={(e) => setIncludeGst(e.target.checked)}
                                    disabled={isModalReadOnly}
                                    className="fw-bold mb-2"
                                />
                            </Col>
                        </Row>
                    </div>
                )}

            </Modal.Body>
            <Modal.Footer className="border-0">
                <Button variant="secondary" onClick={onHide}>Close</Button>
                {!isModalReadOnly && (
                    <>
                        <Button
                            variant="primary"
                            onClick={() => handleSave().then(success => success && toast.success('Saved draft'))}
                            disabled={loading}
                            className="px-4 me-2"
                        >
                            {loading ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleFinalize}
                            disabled={loading}
                            className="px-4"
                        >
                            Finalize & Complete
                        </Button>
                    </>
                )}
            </Modal.Footer>

            <style>{`
                .new-test-modal .modal-content {
                    border-radius: 12px;
                    border: none;
                }
            `}</style>
        </Modal>
    );
};

export default Phase2Modal;
