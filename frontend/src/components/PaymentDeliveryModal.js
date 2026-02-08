import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaTruck, FaMoneyBillWave, FaSave } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';

const PaymentDeliveryModal = ({ show, onHide, testId, onSuccess }) => {
    const [test, setTest] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form Stats
    const [modeOfPayment, setModeOfPayment] = useState('Cash');


    useEffect(() => {
        if (show && testId) {
            fetchDetails();
        }
    }, [show, testId]);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/gold-tests/${testId}`);
            if (res.data.success) {
                setTest(res.data.data);
                setItems(res.data.data.items || []);
                setModeOfPayment(res.data.data.mode_of_payment || 'Cash');
            }
        } catch (error) {
            setError('Failed to load test details.');
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const validateItems = () => {
        return items.every(item => {
            const p = parseFloat(item.purity);
            return !isNaN(p) && p > 0 && p <= 100;
        });
    };

    const handleDeliver = async () => {
        if (!validateItems()) {
            toast.error('Please ensure all items have valid purity (0-100%).');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                items: items.map(i => ({
                    id: i.id,
                    purity: parseFloat(i.purity),
                    returned: i.returned,
                    certificate_required: i.certificate_required // Optional, frontend-only logic mostly
                })),
                mode_of_payment: modeOfPayment,
                weight_loss: 0
            };

            await api.post(`/gold-tests/${testId}/finalize`, payload);
            toast.success('Gold Test Finalized & Delivered!');
            if (onSuccess) onSuccess();
            onHide();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Delivery failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (!test) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaTruck className="me-2 text-primary" />
                    Payment & Delivery
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {loading ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : (
                    <>
                        {/* PART 2: HEADER SECTION (READ-ONLY) */}
                        <div className="bg-light p-3 border-bottom">
                            <Row className="g-3">
                                <Col md={4}>
                                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>INVOICE NUMBER</small>
                                    <span className="fw-bold text-dark">{test.id}</span>
                                </Col>
                                <Col md={4}>
                                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>CUSTOMER</small>
                                    <span className="fw-bold text-dark">{test.customer_name}</span>
                                </Col>
                                <Col md={4} className="text-end">
                                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>BALANCE TO PAY</small>
                                    <span className="fw-bold text-primary h5 mb-0">₹{test.total}</span>
                                </Col>
                            </Row>
                        </div>

                        {/* PART 3: ITEM GRID */}
                        <div className="p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <h6 className="mb-3 text-secondary border-bottom pb-2">TESTED ITEMS</h6>
                            <Table bordered hover size="sm" className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '25%' }}>Item Name</th>
                                        <th style={{ width: '15%' }}>Sample (g)</th>
                                        <th style={{ width: '20%' }}>Purity (%)</th>
                                        <th className="text-center">Returned</th>
                                        <th className="text-center">Cert Req?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="align-middle">
                                                <div>{item.item_type}</div>
                                                <small className="text-muted">{item.item_no}</small>
                                            </td>
                                            <td className="align-middle">{item.sample_weight}g</td>
                                            <td className="align-middle">
                                                <Form.Control
                                                    type="number"
                                                    size="sm"
                                                    value={item.purity}
                                                    onChange={(e) => handleItemChange(idx, 'purity', e.target.value)}
                                                    isInvalid={item.purity <= 0 || item.purity > 100}
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="text-center align-middle">
                                                <Form.Check
                                                    checked={!!item.returned}
                                                    onChange={(e) => handleItemChange(idx, 'returned', e.target.checked)}
                                                />
                                            </td>
                                            <td className="text-center align-middle">
                                                <Form.Check
                                                    checked={!!item.certificate_required}
                                                    onChange={(e) => handleItemChange(idx, 'certificate_required', e.target.checked)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light border-top p-3">
                {/* PART 4: BOTTOM ACTION BAR */}
                <Row className="w-100 align-items-center g-3">
                    <Col md={8} className="d-flex justify-content-end align-items-center gap-2">
                        <span className="small fw-bold text-muted">Payment Mode:</span>
                        <Form.Select
                            size="sm"
                            value={modeOfPayment}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            style={{ width: '150px' }}
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Balance">Balance</option>
                        </Form.Select>
                    </Col>
                    <Col md={4} className="text-end">
                        <Button
                            variant="success"
                            onClick={handleDeliver}
                            disabled={loading || submitting || !validateItems()}
                            className="w-100 fw-bold"
                        >
                            {submitting ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-2" /> Save & Deliver</>}
                        </Button>
                    </Col>
                </Row>
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentDeliveryModal;
