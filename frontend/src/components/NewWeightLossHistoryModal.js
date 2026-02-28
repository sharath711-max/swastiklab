import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, InputGroup } from 'react-bootstrap';
import { FaSave, FaTimes, FaBalanceScale } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const NewWeightLossHistoryModal = ({ show, onHide, customerId, onSuccess }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        amount: '',
        reason: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let localErrors = {};
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            localErrors.amount = true;
        }
        if (!formData.reason) {
            localErrors.reason = true;
        }

        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors);
            addToast('Please correct the highlighted fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post('/weight-loss', {
                ...formData,
                customer_id: customerId
            });
            addToast('Weight loss recorded successfully', 'success');
            onSuccess();
            onHide();
            // Reset form
            setFormData({
                amount: '',
                reason: ''
            });
            setErrors({});
        } catch (error) {
            console.error('Error recording weight loss:', error);
            addToast(error.response?.data?.error || 'Failed to record weight loss', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fw-bold text-primary">
                    <FaBalanceScale className="me-2" /> Log Material Loss
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body className="p-4">
                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Group controlId="amount">
                                <Form.Label className="fw-semibold small text-muted text-uppercase">Weight Loss (grams)</Form.Label>
                                <InputGroup size="lg">
                                    <Form.Control
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        placeholder="0.000"
                                        required
                                        min="0.001"
                                        step="0.001"
                                        isInvalid={errors.amount}
                                        className="fw-bold"
                                    />
                                    <InputGroup.Text>g</InputGroup.Text>
                                    <Form.Control.Feedback type="invalid">Valid weight amount required</Form.Control.Feedback>
                                </InputGroup>
                                <Form.Text className="text-muted">
                                    Enter the exact amount of material missing/scrapped.
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={12}>
                            <Form.Group controlId="reason">
                                <Form.Label className="fw-semibold small text-muted text-uppercase">Reason for Loss</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    placeholder="e.g., Refining scrap, testing loss, moisture loss..."
                                    required
                                    isInvalid={errors.reason}
                                />
                                <Form.Control.Feedback type="invalid">Reason is required</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="mt-4 p-3 bg-light rounded border text-center">
                        <small className="text-muted d-block italic">
                            Weight loss records are strictly <strong>append-only</strong> and serve as a permanent audit trail for material discrepancies.
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-light border-top-0">
                    <Button variant="link" className="text-muted text-decoration-none" onClick={onHide} disabled={loading}>
                        <FaTimes className="me-1" /> Cancel
                    </Button>
                    <Button variant="primary" type="submit" className="px-4 fw-bold shadow-sm" disabled={loading}>
                        {loading ? <><Spinner size="sm" className="me-2" /> Saving...</> : <><FaSave className="me-1" /> Save Record</>}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default NewWeightLossHistoryModal;
