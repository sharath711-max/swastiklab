import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Alert, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { useToast } from '../contexts/ToastContext';
import { FaCamera, FaCopy, FaPrint } from 'react-icons/fa';
import api from '../services/api';

const CURRENT_SYSTEM = 'LAB';

const getWeights = (item) => {
    // Priority to gross_weight from schema, fallback to sample_weight/total_weight
    const gross = Number(item.gross_weight || item.sample_weight || 0);
    const test = Number(item.test_weight || 0);
    const net = item.net_weight !== undefined ? Number(item.net_weight) : Math.max(0, gross - test);
    return { gross, test, net };
};

const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const Phase2Modal = ({ show, onHide, test, onSuccess, readOnly = false }) => {
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [modeOfPayment, setModeOfPayment] = useState('Cash');
    const [amount, setAmount] = useState('');
    const [includeGst, setIncludeGst] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [photos, setPhotos] = useState({});

    const isSystemReadOnly = CURRENT_SYSTEM !== 'LAB';
    const isModalReadOnly = readOnly || isSystemReadOnly;

    const isPhotoCert = test?.type === 'photo_cert' || test?.id?.startsWith('PCR');
    const isGoldTest = test?.type === 'gold' || test?.id?.startsWith('GT');
    const isSilverTest = test?.type === 'silver' || test?.id?.startsWith('ST');
    const isCertificate = test?.type?.includes('cert') || test?.id?.startsWith('GCR') || test?.id?.startsWith('SCR') || isPhotoCert;

    const currentStatus = test?.status || '';
    const isTodoStage = currentStatus === 'TODO';
    const isDoneStage = currentStatus === 'DONE';
    const nextStatus = currentStatus === 'TODO'
        ? 'IN_PROGRESS'
        : currentStatus === 'IN_PROGRESS'
            ? 'DONE'
            : null;

    useEffect(() => {
        if (!test) return;

        setItems((test.items || []).map((item) => ({
            ...item,
            purity: (item.purity !== undefined && item.purity !== null && item.purity !== 0 && item.purity !== '0') ? item.purity : '',
            returned: item.returned === 1 || item.returned === true,
            show_kt: item.show_kt === 1 || item.show_kt === true
        })));
        setModeOfPayment(test.mode_of_payment || 'Cash');
        setAmount(isDoneStage && test.total > 0 ? test.total : '');
        setIncludeGst(test.gst === 1);
        setPhotos({});
        setError('');
    }, [test, isDoneStage]);

    const handleItemChange = (index, field, value) => {
        if (isModalReadOnly) return;
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handlePhotoSelect = (itemId, file) => {
        if (isModalReadOnly || !file) return;
        setPhotos((prev) => ({ ...prev, [itemId]: file }));
    };

    const validate = () => {
        for (const item of items) {
            const purity = parseFloat(item.purity);
            if (isNaN(purity) || purity <= 0 || purity > 100) {
                return `Invalid purity for item ${item.item_number || item.item_no || '-'}. Must be > 0 and <= 100.`;
            }

            if (isPhotoCert) {
                const hasNewPhoto = !!photos[item.id];
                const hasExistingPhoto = !!item.media;
                if (!hasNewPhoto && !hasExistingPhoto) {
                    return `Photo is required for item ${item.item_number || item.item_no || '-'}.`;
                }
            }
        }

        if (!isTodoStage) {
            const parsedAmount = parseFloat(amount);
            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                return 'Invalid amount. Must be >= 0.';
            }
            if (!modeOfPayment) {
                return 'Mode of payment is required.';
            }
        }

        return null;
    };

    const getEndpoint = () => {
        if (isGoldTest) return `/gold-tests/${test.id}/results`;
        if (isSilverTest) return `/silver-tests/${test.id}/results`;
        if (isPhotoCert || test?.type?.includes('cert')) return `/certificates/${test.id}/results`;
        return `/gold-tests/${test.id}/results`;
    };

    const buildBaseData = () => ({
        mode_of_payment: modeOfPayment,
        total: parseFloat(amount || 0),
        gst: includeGst ? 1 : 0
    });

    const handleSave = async (closeModal = true) => {
        const valError = validate();
        if (valError) {
            setError(valError);
            return false;
        }

        setLoading(true);
        setError('');
        try {
            const endpoint = getEndpoint();
            const baseData = buildBaseData();

            if (isPhotoCert) {
                const photoItemIds = Object.keys(photos);
                for (const itemId of photoItemIds) {
                    const file = photos[itemId];
                    const formData = new FormData();
                    formData.append('photo', file);
                    formData.append('data', JSON.stringify({
                        type: 'photo',
                        photo_item_id: itemId,
                        items: [{ id: itemId }]
                    }));

                    await api.post(endpoint, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                await api.post(endpoint, {
                    type: 'photo',
                    ...baseData,
                    items: items.map((i) => ({
                        id: i.id,
                        show_kt: !!i.show_kt,
                        returned: !!i.returned,
                        purity: Number(i.purity),
                        media: i.media || null
                    }))
                });
            } else {
                await api.post(endpoint, {
                    ...baseData,
                    items: items.map((i) => ({
                        id: i.id,
                        purity: Number(i.purity),
                        returned: !!i.returned,
                        item_number: i.item_number || i.item_no
                    }))
                });
            }

            addToast('Results Saved Successfully', 'success');
            if (onSuccess && closeModal) {
                onSuccess();
            }
            if (closeModal) {
                onHide();
            }

            return true;
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to save results');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFlow = async () => {
        if (!nextStatus) return;
        const targetLabel = nextStatus === 'IN_PROGRESS' ? 'Tested' : 'Completed';
        if (!window.confirm(`Submit and move this card to ${targetLabel}?`)) return;

        // Skip closemodal on handlesave to manage it here
        const saved = await handleSave(false);
        if (!saved) return;

        setLoading(true);
        try {
            await api.patch(`/workflow/${test.type}/${test.id}/status`, { status: nextStatus });
            addToast(`Moved to ${targetLabel}`, 'success');
            onSuccess?.();
            onHide();
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to update workflow status', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!test || !items.length) return;
        try {
            const lines = [
                `Customer: ${test.customer_name || '-'}`,
                `Date: ${formatDate(test.created_at || test.createdon)}`,
                `Sample Count: ${items.length}`,
                ''
            ];

            items.forEach((item, idx) => {
                const w = getWeights(item);
                lines.push(
                    `${idx + 1}. ${item.item_no || item.item_number || '-'} | ${test.customer_name || '-'} | ` +
                    `Weight: ${w.net > 0 ? `${w.net}g / ${w.sample}g` : `${w.sample}g`} | Purity: ${item.purity || 0}%`
                );
            });

            const text = lines.join('\n');
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            addToast('Completed details copied', 'success');
        } catch (_err) {
            addToast('Unable to copy completed details', 'error');
        }
    };

    const printSingle = (item) => {
        if (!test || !item) return;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const w = getWeights(item);
        const weightValue = w.net > 0 ? `${w.net}g / ${w.sample}g` : `${w.sample}g`;
        const html = `
            <html>
            <head><meta charset="utf-8" /><title>Sample Print</title></head>
            <body style="font-family:Arial,sans-serif;padding:20px;">
                <div style="max-width:460px;border:1px solid #d1d5db;border-radius:10px;padding:16px;">
                    <div style="margin-bottom:12px;">${escapeHtml(item.item_no || item.item_number || '-')}</div>
                    <div style="margin-bottom:12px;">${escapeHtml(test.customer_name || '-')}</div>
                    <div style="margin-bottom:14px;">${escapeHtml(weightValue)}</div>
                    <div style="display:inline-block;border:2px solid #111827;border-radius:8px;padding:8px 14px;font-weight:800;font-size:20px;">
                        ${escapeHtml(item.purity || 0)}%
                    </div>
                </div>
                <script>
                    window.onload = function () {
                        setTimeout(function () {
                            window.print();
                            window.onafterprint = function () { window.close(); };
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const modalTitle = isTodoStage ? 'Add Test Results' : isDoneStage ? 'Completed Details' : 'Payment Details';

    return (
        <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" keyboard={false} className="new-test-modal">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                    {modalTitle}
                    {isModalReadOnly && <Badge bg="secondary">View Only</Badge>}
                    {isPhotoCert && <Badge bg="info">Photo Cert</Badge>}
                </Modal.Title>
                {isDoneStage && (
                    <Button variant="outline-primary" size="sm" onClick={handleCopy}>
                        <FaCopy className="me-1" /> Copy
                    </Button>
                )}
            </Modal.Header>

            <Modal.Body className="pt-3">
                {isSystemReadOnly && (
                    <Alert variant="warning" className="mb-3">
                        Testing actions are available on Lab system only.
                    </Alert>
                )}
                {error && <Alert variant="danger">{error}</Alert>}

                <div className="p-3 border rounded mb-3" style={{ background: '#eef9f4' }}>
                    <Row className="g-2">
                        <Col md={6}><strong>Customer:</strong> {test?.customer_name || '-'}</Col>
                        <Col md={6} className="text-md-end"><strong>Date:</strong> {formatDate(test?.created_at || test?.createdon)}</Col>
                        <Col md={12}><strong>Sample Count:</strong> {items.length}</Col>
                    </Row>
                </div>

                <Table responsive bordered hover size="sm" className="mb-3 align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Seq</th>
                            <th>Item Name</th>
                            <th>Gross Wt</th>
                            <th>Sample Wt</th>
                            <th>Net Wt</th>
                            <th>Purity (%)</th>
                            {isPhotoCert && <th>Photo</th>}
                            {isPhotoCert && <th>KT</th>}
                            <th>Returned</th>
                            {isDoneStage && <th>Print</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const w = getWeights(item);
                            return (
                                <tr key={item.id || idx}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <div>{item.item_type || '-'}</div>
                                        <small className="text-muted">{item.item_no || item.item_number || '-'}</small>
                                    </td>
                                    <td>{w.gross}g</td>
                                    <td>{w.test}g</td>
                                    <td>{w.net}g</td>
                                    <td style={{ minWidth: 120 }}>
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max="100"
                                            placeholder="0.00"
                                            value={item.purity}
                                            onChange={(e) => handleItemChange(idx, 'purity', e.target.value)}
                                            disabled={isModalReadOnly}
                                        />
                                    </td>
                                    {isPhotoCert && (
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {(photos[item.id] || item.media) && (
                                                    <div style={{ width: 40, height: 40, overflow: 'hidden', borderRadius: 4, border: '1px solid #ddd' }}>
                                                        <img
                                                            src={photos[item.id] ? URL.createObjectURL(photos[item.id]) : `${api.defaults.baseURL.replace(/\/api$/, '')}/${item.media}`}
                                                            alt=""
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                )}
                                                {!isModalReadOnly && (
                                                    <label className="btn btn-sm btn-outline-secondary p-1 mb-0">
                                                        <FaCamera />
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={(e) => handlePhotoSelect(item.id, e.target.files?.[0])}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {isPhotoCert && (
                                        <td className="text-center">
                                            <Form.Check
                                                checked={!!item.show_kt}
                                                onChange={(e) => handleItemChange(idx, 'show_kt', e.target.checked)}
                                                disabled={isModalReadOnly}
                                            />
                                        </td>
                                    )}
                                    <td className="text-center">
                                        <Form.Check
                                            type="switch"
                                            checked={!!item.returned}
                                            onChange={(e) => handleItemChange(idx, 'returned', e.target.checked)}
                                            disabled={isModalReadOnly}
                                        />
                                    </td>
                                    {isDoneStage && (
                                        <td>
                                            <Button variant="outline-secondary" size="sm" onClick={() => printSingle(item)}>
                                                <FaPrint />
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={isPhotoCert ? (isDoneStage ? 10 : 9) : (isDoneStage ? 8 : 7)} className="text-center text-muted py-4">
                                    No sample items found for this card.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {!isTodoStage && (
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">Amount</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={isModalReadOnly}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">Mode</Form.Label>
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
                            {isCertificate && (
                                <Col md={4}>
                                    <Form.Check
                                        type="switch"
                                        id="gst-switch-phase2"
                                        label="Include GST"
                                        checked={includeGst}
                                        onChange={(e) => setIncludeGst(e.target.checked)}
                                        disabled={isModalReadOnly}
                                        className="fw-bold mb-2 mt-4"
                                    />
                                </Col>
                            )}
                        </Row>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="border-0">
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                {!isModalReadOnly && (
                    <>
                        <Button
                            variant="primary"
                            onClick={() => handleSave().then((ok) => ok && addToast('Saved', 'success'))}
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : 'Save'}
                        </Button>
                        {nextStatus && (
                            <Button variant="success" onClick={handleSubmitFlow} disabled={loading}>
                                {nextStatus === 'IN_PROGRESS' ? 'Submit to Tested' : 'Submit to Completed'}
                            </Button>
                        )}
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default Phase2Modal;
