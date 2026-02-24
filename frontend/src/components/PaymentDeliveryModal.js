import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button, Table, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaTruck, FaSave, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';

const getWeights = (item) => {
    const total = Number(item.sample_weight || 0);
    const sample = Number(item.test_weight || 0);
    const normalizedSample = Number.isFinite(sample) && sample > 0 ? sample : total;
    const net = Math.max(0, total - normalizedSample);
    return { sample: normalizedSample, total, net };
};

const PaymentDeliveryModal = ({ show, onHide, testId, onSuccess }) => {
    const [test, setTest] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [modeOfPayment, setModeOfPayment] = useState('Cash');
    const [paymentAmount, setPaymentAmount] = useState('');

    const fetchDetails = useCallback(async () => {
        if (!testId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/gold-tests/${testId}`);
            if (res.data.success) {
                const nextTest = res.data.data;
                setTest(nextTest);
                setItems(nextTest.items || []);
                setModeOfPayment(nextTest.mode_of_payment || 'Cash');
                setPaymentAmount(String(Number(nextTest.total || 0).toFixed(2)));
            }
        } catch (_error) {
            setError('Failed to load test details.');
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        if (show && testId) {
            fetchDetails();
        }
    }, [show, testId, fetchDetails]);

    const itemWeights = useMemo(() => items.map(getWeights), [items]);

    const itemsValid = useMemo(() => items.every((item) => {
        const p = Number(item.purity);
        return Number.isFinite(p) && p > 0 && p <= 100;
    }), [items]);

    const paymentValid = useMemo(() => {
        const amountNum = Number(paymentAmount);
        return Number.isFinite(amountNum) && !!modeOfPayment;
    }, [paymentAmount, modeOfPayment]);

    const payloadItems = useMemo(() => items.map((i) => ({
        id: i.id,
        purity: Number(i.purity),
        returned: !!i.returned,
        certificate_required: !!i.certificate_required
    })), [items]);

    const buildResultsPayload = useCallback(() => ({
        items: payloadItems,
        mode_of_payment: modeOfPayment,
        total: Number(paymentAmount)
    }), [payloadItems, modeOfPayment, paymentAmount]);

    const handleItemChange = useCallback((index, field, value) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }, []);

    const normalizeAmountOnBlur = useCallback(() => {
        const amountNum = Number(paymentAmount);
        if (!Number.isFinite(amountNum)) return;
        setPaymentAmount(amountNum.toFixed(2));
    }, [paymentAmount]);

    const handleSave = async () => {
        if (!itemsValid) {
            toast.error('Please ensure all items have valid purity (0-100%).');
            return;
        }
        if (!paymentValid) {
            toast.error('Please enter valid payment details.');
            return;
        }

        setSaving(true);
        try {
            await api.post(`/gold-tests/${testId}/results`, buildResultsPayload());
            toast.success('Payment details saved in Tested status.');
            if (onSuccess) onSuccess();
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save payment details');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!itemsValid) {
            toast.error('Please ensure all items have valid purity (0-100%).');
            return;
        }
        if (!paymentValid) {
            toast.error('Please enter valid payment details.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/gold-tests/${testId}/results`, buildResultsPayload());
            await api.post(`/gold-tests/${testId}/finalize`, {
                items: payloadItems,
                mode_of_payment: modeOfPayment,
                weight_loss: 0
            });
            toast.success('Payment submitted. Card moved to Completed.');
            if (onSuccess) onSuccess();
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Delivery failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static" keyboard={false} className="payment-delivery-modal">
            <Modal.Header closeButton className="modal-soft-header">
                <Modal.Title>
                    <FaTruck className="me-2 text-primary" />
                    Payment Details
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {loading || !test ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : (
                    <>
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
                                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>SAMPLE COUNT</small>
                                    <span className="fw-bold text-primary h5 mb-0">{items.length}</span>
                                </Col>
                            </Row>
                        </div>

                        {error && (
                            <Alert variant="danger" className="m-3 mb-0 py-2">
                                {error}
                            </Alert>
                        )}

                        <div className="p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <h6 className="mb-3 text-secondary border-bottom pb-2">TESTED ITEMS</h6>
                            <Table bordered hover size="sm" className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '8%' }}>Seq</th>
                                        <th style={{ width: '25%' }}>Item Name</th>
                                        <th style={{ width: '12%' }}>Sample (g)</th>
                                        <th style={{ width: '12%' }}>Total (g)</th>
                                        <th style={{ width: '12%' }}>Net (g)</th>
                                        <th style={{ width: '16%' }}>Purity (%)</th>
                                        <th className="text-center">Returned</th>
                                        <th className="text-center">Cert Req?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="align-middle">{idx + 1}</td>
                                            <td className="align-middle">
                                                <div>{item.item_type}</div>
                                                <small className="text-muted">{item.item_no || item.item_number || '-'}</small>
                                            </td>
                                            <td className="align-middle">{itemWeights[idx].sample}g</td>
                                            <td className="align-middle">{itemWeights[idx].total}g</td>
                                            <td className="align-middle">{itemWeights[idx].net}g</td>
                                            <td className="align-middle">
                                                <Form.Control
                                                    type="number"
                                                    size="sm"
                                                    value={item.purity}
                                                    onChange={(e) => handleItemChange(idx, 'purity', e.target.value)}
                                                    isInvalid={Number(item.purity) <= 0 || Number(item.purity) > 100}
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
                <Row className="w-100 align-items-center g-3">
                    <Col md={3}>
                        <span className="small fw-bold text-muted d-block mb-1">Amount</span>
                        <Form.Control
                            size="sm"
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            onBlur={normalizeAmountOnBlur}
                        />
                    </Col>
                    <Col md={3}>
                        <span className="small fw-bold text-muted d-block mb-1">Payment Mode</span>
                        <Form.Select
                            size="sm"
                            value={modeOfPayment}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Balance">Balance</option>
                        </Form.Select>
                    </Col>
                    <Col md={6} className="text-end d-flex justify-content-end gap-2">
                        <Button
                            variant="outline-primary"
                            onClick={handleSave}
                            disabled={loading || saving || submitting || !itemsValid}
                            className="fw-bold"
                        >
                            {saving ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-2" />Save</>}
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleSubmit}
                            disabled={loading || submitting || saving || !itemsValid}
                            className="fw-bold"
                        >
                            {submitting ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-2" />Submit</>}
                        </Button>
                    </Col>
                </Row>
            </Modal.Footer>
            <style>{`
                .payment-delivery-modal .modal-content {
                    border-radius: 16px;
                    border: none;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
                }
                .payment-delivery-modal .modal-soft-header {
                    background: linear-gradient(135deg, #eff6ff, #eef2ff);
                }
            `}</style>
        </Modal>
    );
};

export default React.memo(PaymentDeliveryModal);
