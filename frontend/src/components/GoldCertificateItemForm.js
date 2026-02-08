import React, { useState } from 'react';
import { Form, Button, Alert, Row, Col, Card } from 'react-bootstrap';
import api from '../services/api';

const GoldCertificateItemForm = ({ certificateId, onItemAdded }) => {
    const [formData, setFormData] = useState({
        gross_weight: '',
        test_weight: '',
        purity: '91.6', // Default 22K purity
        rate_per_gram: '',
        item_name: '',
        sub_certificate_number: '',
        certificate_required: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverResponse, setServerResponse] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setServerResponse(null);

        try {
            // Prepare payload - ONLY raw inputs
            const payload = {
                gross_weight: parseFloat(formData.gross_weight),
                test_weight: parseFloat(formData.test_weight || 0),
                purity: parseFloat(formData.purity),
                rate_per_gram: parseFloat(formData.rate_per_gram),
                item_name: formData.item_name.trim(),
                sub_certificate_number: formData.sub_certificate_number.trim() || null,
                certificate_required: formData.certificate_required
            };

            const response = await api.post(`/certificates/${certificateId}/items`, payload);

            if (response.data.success) {
                setServerResponse({
                    type: 'success',
                    message: 'Item added successfully!',
                    data: response.data.data
                });

                // Reset form
                setFormData({
                    gross_weight: '',
                    test_weight: '',
                    purity: '91.6',
                    rate_per_gram: '',
                    item_name: '',
                    sub_certificate_number: '',
                    certificate_required: true
                });

                if (onItemAdded) {
                    onItemAdded(response.data.data);
                }
            } else {
                setServerResponse({
                    type: 'danger',
                    message: response.data.message || 'Failed to add item',
                    details: response.data.details
                });
            }
        } catch (error) {
            setServerResponse({
                type: 'danger',
                message: error.response?.data?.message || 'Network error. Please try again.',
                details: error.response?.data?.details
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-sm border-0 mb-4" style={{ borderTop: '4px solid #0176d3' }}>
            <Card.Body>
                <Card.Title className="mb-3 d-flex align-items-center" style={{ color: '#0176d3' }}>
                    <span className="me-2">Add Gold Item</span>
                    <small className="text-muted fw-normal" style={{ fontSize: '0.8rem' }}>(Backend-Calculated)</small>
                </Card.Title>

                <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                    <strong>Note:</strong> All calculations (net weight, fine weight, value) are performed
                    by the backend server for accuracy and security.
                </p>

                {serverResponse && (
                    <Alert variant={serverResponse.type} dismissible onClose={() => setServerResponse(null)}>
                        <div className="fw-bold">{serverResponse.message}</div>
                        {serverResponse.details && (
                            <div className="small mt-1">{Array.isArray(serverResponse.details) ? serverResponse.details.join(', ') : serverResponse.details}</div>
                        )}
                        {serverResponse.data && serverResponse.type === 'success' && (
                            <div className="mt-2 small pt-2 border-top">
                                <strong>Calculated:</strong> Net: {serverResponse.data.calculated_values.net_weight}g,
                                Fine: {serverResponse.data.calculated_values.fine_weight}g,
                                Value: ₹{serverResponse.data.calculated_values.item_total}
                            </div>
                        )}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Item Name *</Form.Label>
                                <Form.Control
                                    type="text"
                                    size="sm"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    placeholder="e.g., Ring, Chain, Bracelet"
                                    required
                                    disabled={isSubmitting}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Gross Weight (g) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    size="sm"
                                    step="0.001"
                                    min="0.001"
                                    value={formData.gross_weight}
                                    onChange={(e) => setFormData({ ...formData, gross_weight: e.target.value })}
                                    placeholder="e.g., 10.500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Test Weight (g)</Form.Label>
                                <Form.Control
                                    type="number"
                                    size="sm"
                                    step="0.001"
                                    min="0"
                                    value={formData.test_weight}
                                    onChange={(e) => setFormData({ ...formData, test_weight: e.target.value })}
                                    placeholder="Optional, e.g., 0.250"
                                    disabled={isSubmitting}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Purity (%) *</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={formData.purity}
                                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                                    disabled={isSubmitting}
                                >
                                    <option value="91.6">22K - 91.6%</option>
                                    <option value="99.9">24K - 99.9%</option>
                                    <option value="75">18K - 75%</option>
                                    <option value="58.3">14K - 58.3%</option>
                                    <option value="41.7">10K - 41.7%</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Rate per Gram (₹) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    size="sm"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.rate_per_gram}
                                    onChange={(e) => setFormData({ ...formData, rate_per_gram: e.target.value })}
                                    placeholder="e.g., 4650.00"
                                    required
                                    disabled={isSubmitting}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Sub Certificate Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    size="sm"
                                    value={formData.sub_certificate_number}
                                    onChange={(e) => setFormData({ ...formData, sub_certificate_number: e.target.value })}
                                    placeholder="e.g., A01, B12"
                                    disabled={isSubmitting}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={12}>
                            <Form.Check
                                type="checkbox"
                                id="cert-req"
                                label="Certificate Required"
                                className="small"
                                checked={formData.certificate_required}
                                onChange={(e) => setFormData({ ...formData, certificate_required: e.target.checked })}
                                disabled={isSubmitting}
                            />
                        </Col>
                    </Row>

                    <div className="mt-4 border-top pt-3 d-flex flex-column align-items-center">
                        <Button
                            variant="primary"
                            type="submit"
                            size="sm"
                            className="w-100 mb-2 py-2"
                            disabled={isSubmitting}
                            style={{ backgroundColor: '#0176d3', borderColor: '#0176d3' }}
                        >
                            {isSubmitting ? 'Calculating...' : 'Add Item (Server Calculation)'}
                        </Button>

                        <small className="text-center text-muted mt-2 px-3" style={{ fontSize: '0.75rem' }}>
                            <strong>Security Notice:</strong> The server will calculate net weight, fine weight,
                            and total value to ensure accuracy and prevent manipulation.
                        </small>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default GoldCertificateItemForm;
