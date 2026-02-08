import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, Table, Spinner, Alert } from 'react-bootstrap';
import { FaArrowLeft, FaPrint, FaExternalLinkAlt } from 'react-icons/fa';
import api from '../services/api';

const RecordPage = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRecord();
    }, [type, id]);

    const fetchRecord = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/records/${type}/${id}`);
            setData(response.data.data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to fetch record details.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = (t) => {
        const map = {
            'gold-tests': 'Gold Test',
            'silver-tests': 'Silver Test',
            'gold-certificates': 'Gold Certificate',
            'silver-certificates': 'Silver Certificate',
            'photo-certificates': 'Photo Certificate',
            'gold-test-items': 'Gold Test Item',
            'silver-test-items': 'Silver Test Item',
            'gold-certificate-items': 'Gold Cert Item',
            'silver-certificate-items': 'Silver Cert Item',
            'photo-certificate-items': 'Photo Cert Item',
            'credit-history': 'Credit Transaction',
            'weight-loss-history': 'Weight Loss Record'
        };
        return map[t] || t;
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleString();
    };

    const isParent = type.endsWith('tests') || type.endsWith('certificates');
    const isItem = type.includes('item');
    const isHistory = type.includes('history');

    const handlePrint = () => {
        // Redirect to print page based on type
        // Items don't have print pages usually, but parents do.
        let printType = type;
        if (type === 'gold-tests') printType = 'gold-test';
        if (type === 'silver-tests') printType = 'silver-test';
        if (type === 'gold-certificates') printType = 'certificate'; // Generic certificate print? 
        // Logic in activeTab uses 'certificate' but type here is explicit.
        // Assuming /print/certificate/:id works for GCR/SCR/PCR ids if IDs are unique across certs or handled.
        // Let's assume generic cert print handles prefix.

        if (isParent) {
            navigate(`/print/${printType.replace('gold-certificates', 'certificate').replace('silver-certificates', 'certificate').replace('photo-certificates', 'certificate')}/${id}`);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
    if (error) return <Container className="py-4"><Alert variant="danger">{error}</Alert></Container>;
    if (!data) return <Container className="py-4"><Alert variant="warning">Record not found.</Alert></Container>;

    return (
        <Container fluid className="py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex align-items-center mb-4">
                <Button variant="link" className="me-3 text-dark p-0" onClick={() => navigate(-1)}>
                    <FaArrowLeft size={20} />
                </Button>
                <div>
                    <h4 className="fw-bold mb-0">{getTypeLabel(type)}</h4>
                    {/* Hiding internal ID as per policy. If auto-number exists such as item_no or certificate_number, we can show it here if desired, otherwise rely on content below. */}
                    {data.item_no && <small className="text-muted d-block">{data.item_no}</small>}
                    {data.certificate_number && <small className="text-muted d-block">{data.certificate_number}</small>}
                </div>
                <div className="ms-auto d-flex gap-2">
                    {data.status && (
                        <Badge bg={data.status === 'DONE' ? 'success' : data.status === 'IN_PROGRESS' ? 'warning' : 'primary'} className="fs-6">
                            {data.status}
                        </Badge>
                    )}
                    {isParent && (
                        <Button variant="outline-dark" size="sm" onClick={handlePrint}>
                            <FaPrint className="me-2" /> Print
                        </Button>
                    )}
                </div>
            </div>

            <Row className="g-4">
                {/* Main Details */}
                <Col lg={isParent ? 8 : 12}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Details</Card.Header>
                        <Card.Body>
                            <Row xs={1} md={2} className="g-3">
                                <DetailItem label="Customer Name" value={data.customer_name} />
                                <DetailItem label="Created Date" value={formatDate(data.created || data.created_at || data.createdon)} />

                                {data.mode_of_payment && <DetailItem label="Payment Mode" value={data.mode_of_payment} />}
                                {data.total !== undefined && <DetailItem label="Total Amount" value={`₹${data.total}`} />}

                                {data.gst === 1 && <DetailItem label="GST Applied" value="Yes" />}
                                {data.gst_bill_number && <DetailItem label="GST Bill No" value={data.gst_bill_number} />}

                                {/* Item Specifics */}
                                {data.item_no && <DetailItem label="Item No" value={data.item_no} />}
                                {data.item_type && <DetailItem label="Item Type" value={data.item_type} />}
                                {data.purity !== undefined && <DetailItem label="Purity" value={`${data.purity}%`} />}
                                {data.sample_weight && <DetailItem label="Sample Weight" value={`${data.sample_weight} g`} />}
                                {data.test_weight && <DetailItem label="Test Weight" value={`${data.test_weight} g`} />}
                                {data.gross_weight && <DetailItem label="Gross Weight" value={`${data.gross_weight} g`} />}
                                {data.net_weight && <DetailItem label="Net Weight" value={`${data.net_weight} g`} />}

                                {data.received_by && <DetailItem label="Received By" value={data.received_by} />}
                                {data.reason && <DetailItem label="Reason" value={data.reason} />}
                                {data.amount && !data.total && <DetailItem label="Amount" value={`₹${data.amount}`} />}
                            </Row>

                            {/* Parent Link for Items */}
                            {isItem && data.parent_type && (
                                <div className="mt-4 pt-3 border-top">
                                    <h6 className="text-muted mb-2">Belongs To</h6>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => navigate(`/record/${data.parent_type}/${data.parent_id || data.gold_test_id || data.silver_test_id || data.gold_certificate_id || data.silver_certificate_id || data.photo_certificate_id}`)}
                                    >
                                        <FaExternalLinkAlt className="me-2" />
                                        View Parent Record
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Related Items (For Parents) */}
                {isParent && data.items && (
                    <Col lg={12}>
                        <Card className="shadow-sm border-0">
                            <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                                <span>Items ({data.items.length})</span>
                            </Card.Header>
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Item No</th>
                                        <th>Description</th>
                                        <th>Gross Wt</th>
                                        <th>Sample Wt</th>
                                        <th>Purity</th>
                                        <th>Returned</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.item_no || item.item_number || '-'}</td>
                                            <td>{item.item_type || item.item_name}</td>
                                            {/* Map Weights based on type: Gold/Silver Test vs Certificate */}
                                            {/* Gold/Silver Test: sample_weight (Total), test_weight (Sample) */}
                                            {/* Certificate: gross_weight, test_weight */}
                                            <td>{item.gross_weight || item.sample_weight || item.weight} g</td>
                                            <td>{item.test_weight || (item.sample_weight && item.weight ? item.sample_weight : '-')} g</td>

                                            <td>{item.purity ? `${item.purity}%` : '-'}</td>
                                            <td>
                                                <Badge bg={item.returned ? 'success' : 'secondary'}>
                                                    {item.returned ? 'Yes' : 'No'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => navigate(`/record/${type.replace('s', '-items')}/${item.id}`)}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.items.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-3">No items found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card>
                    </Col>
                )}
            </Row>
        </Container>
    );
};

const DetailItem = ({ label, value }) => (
    <Col>
        <div className="mb-3">
            <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.75rem' }}>{label}</small>
            <div className="fs-6 text-dark">{value}</div>
        </div>
    </Col>
);

export default RecordPage;
