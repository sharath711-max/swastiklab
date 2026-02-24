import React, { useState, useEffect } from 'react';
import { Button, Badge, Spinner, Container, Row, Col, Modal, Table } from 'react-bootstrap';
import { FaPlus, FaSync, FaCheckDouble, FaSave, FaCheckCircle, FaPrint, FaCopy } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import NewGoldTestModal from '../components/NewGoldTestModal';
import PaymentDeliveryModal from '../components/PaymentDeliveryModal';

const STATUS_COLUMNS = [
    {
        id: 'TODO',
        label: 'Ongoing',
        chipBg: 'rgba(245, 158, 11, 0.2)',
        chipColor: '#92400e',
        accent: '#f59e0b',
        headingColor: '#7c2d12'
    },
    {
        id: 'IN_PROGRESS',
        label: 'Tested',
        chipBg: 'rgba(139, 92, 246, 0.2)',
        chipColor: '#5b21b6',
        accent: '#8b5cf6',
        headingColor: '#4c1d95'
    },
    {
        id: 'DONE',
        label: 'Completed',
        chipBg: 'rgba(16, 185, 129, 0.2)',
        chipColor: '#065f46',
        accent: '#10b981',
        headingColor: '#064e3b'
    }
];

const boardStyles = {
    page: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '1.5rem'
    },
    headerTitle: {
        fontWeight: 800,
        marginBottom: '0.25rem',
        color: '#ffffff'
    },
    headerSub: {
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 0
    },
    columnWrap: {
        background: 'rgba(255, 255, 255, 0.92)',
        borderRadius: '14px',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
        overflow: 'hidden',
        minHeight: '72vh'
    },
    columnHeader: (accent) => ({
        borderBottom: `3px solid ${accent}`,
        padding: '0.95rem 1rem',
        background: '#ffffff'
    }),
    cardsArea: {
        padding: '1rem',
        background: 'rgba(248, 250, 252, 0.95)',
        minHeight: '67vh'
    },
    card: (accent) => ({
        border: '1px solid #e7eaf0',
        borderLeft: `4px solid ${accent}`,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
        cursor: 'pointer',
        position: 'relative'
    }),
    cardMeta: {
        fontSize: '0.75rem',
        color: '#6b7280'
    },
    emptyState: {
        textAlign: 'center',
        color: '#64748b',
        padding: '2.75rem 0',
        opacity: 0.8
    }
};

const modalStyles = {
    content: {
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)'
    },
    header: {
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #eff6ff, #eef2ff)'
    },
    metaStrip: {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '0.65rem 0.8rem'
    }
};

const shortId = (id) => (id ? `${id.substring(0, 8)}...` : 'N/A');

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const formatCardDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const formatMoney = (value) => {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric)
        ? numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


const isTestedCardReady = (item) => {
    const amount = Number(item?.total || 0);
    const mode = String(item?.mode_of_payment || '').trim();
    return Number.isFinite(amount) && amount > 0 && mode.length > 0;
};


const getWeights = (item) => {
    const total = Number(item.sample_weight || 0);
    const sample = Number(item.test_weight || 0);
    const normalizedSample = Number.isFinite(sample) && sample > 0 ? sample : total;
    const net = Math.max(0, total - normalizedSample);
    return { sample: normalizedSample, total, net };
};

const buildResultsItems = (items) => items.map((i) => ({
    id: i.id,
    purity: Number(i.purity),
    returned: !!i.returned,
    certificate_required: !!i.certificate_required
}));

const UpdatePurityModal = ({ show, onHide, testId, onUpdate }) => {
    const [test, setTest] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (show && testId) {
            fetchDetails();
        }
    }, [show, testId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/gold-tests/${testId}`);
            if (res.data.success) {
                const nextTest = res.data.data;
                setTest(nextTest);
                setItems(nextTest.items || []);
            }
        } catch (_error) {
            toast.error('Failed to load test details');
            onHide();
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (index, field, value) => {
        const next = [...items];
        next[index][field] = value;
        setItems(next);
    };

    const hasValidPurity = () => items.every((item) => {
        const purity = Number(item.purity);
        return Number.isFinite(purity) && purity > 0 && purity <= 100;
    });

    const saveResultsOnly = async () => {
        if (!hasValidPurity()) {
            toast.error('Please enter valid purity for all items (0-100).');
            return false;
        }

        await api.post(`/gold-tests/${test.id}/results`, {
            items: buildResultsItems(items),
            mode_of_payment: test.mode_of_payment || 'Cash',
            total: Number(test.total || 0)
        });

        return true;
    };

    const handleSave = async () => {
        if (!test) return;
        setSaving(true);
        try {
            const ok = await saveResultsOnly();
            if (!ok) return;
            toast.success('Test result details saved. Card remains in Ongoing status.');
            if (onUpdate) onUpdate();
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save test details');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!test) return;
        setSubmitting(true);
        try {
            const ok = await saveResultsOnly();
            if (!ok) return;
            await api.patch(`/gold-tests/${test.id}/status`, { status: 'IN_PROGRESS' });
            toast.success('Success: Sample validated and moved to Tested status.');
            if (onUpdate) onUpdate();
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit test details');
        } finally {
            setSubmitting(false);
        }
    };

    if (!test) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="gt-results-modal" contentClassName="shadow-lg" style={{ backdropFilter: 'blur(2px)' }}>
            <Modal.Header closeButton style={{ ...modalStyles.header, background: '#cbd5e1', borderBottom: '1px solid #b6c2d0' }}>
                <Modal.Title>
                    Add Test Results
                    <span className="ms-2 text-muted h6 mb-0">({test.id})</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ ...modalStyles.content, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, background: '#f8fafc' }}>
                {loading ? <div className="text-center py-4"><Spinner animation="border" /></div> : (
                    <div>
                        <div className="d-flex justify-content-between mb-3 gt-results-summary" style={{ ...modalStyles.metaStrip, background: '#ffffff', borderColor: '#d5dde8' }}>
                            <span className="gt-label"><strong>Customer:</strong> {test.customer_name}</span>
                            <span className="gt-label"><strong>Date:</strong> {new Date(test.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="table-responsive">
                            <table className="table align-middle mb-0 gt-results-table">
                                <thead>
                                    <tr>
                                        <th>Seq</th>
                                        <th>Item</th>
                                        <th>Sample Wt</th>
                                        <th>Total Wt</th>
                                        <th>Net Wt</th>
                                        <th>Purity (%)</th>
                                        <th>Returned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <strong>{item.item_type}</strong>
                                                <div className="text-muted small">{item.item_no || item.item_number || '-'}</div>
                                            </td>
                                            <td>{getWeights(item).sample}g</td>
                                            <td>{getWeights(item).total}g</td>
                                            <td>{getWeights(item).net}g</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm gt-purity-input"
                                                    value={item.purity}
                                                    onChange={(e) => handleFieldChange(index, 'purity', e.target.value)}
                                                    step="0.01"
                                                    min="0.01"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check d-flex justify-content-center">
                                                    <input
                                                        className="form-check-input gt-check"
                                                        type="checkbox"
                                                        checked={!!item.returned}
                                                        onChange={(e) => handleFieldChange(index, 'returned', e.target.checked)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light border-top-0 d-flex justify-content-between gt-results-footer">
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={handleSave} disabled={saving || submitting || loading}>
                        {saving ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-2" />Save</>}
                    </Button>
                    <Button variant="success" onClick={handleSubmit} disabled={saving || submitting || loading}>
                        {submitting ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-2" />Submit</>}
                    </Button>
                </div>
            </Modal.Footer>
            <style>{`
                .gt-results-modal .modal-content {
                    border-radius: 12px;
                    overflow: hidden;
                }
                .gt-results-modal .modal-header .btn-close {
                    opacity: 0.85;
                }
                .gt-results-modal .gt-results-summary .gt-label {
                    font-size: 1.05rem;
                    color: #111827;
                }
                .gt-results-modal .gt-results-table thead th {
                    font-size: 0.82rem;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                    color: #6b7280;
                    background: #f1f5f9;
                    border-bottom: 1px solid #dbe3ee;
                }
                .gt-results-modal .gt-results-table td {
                    vertical-align: middle;
                    border-color: #e4e9f2;
                }
                .gt-results-modal .gt-purity-input {
                    max-width: 150px;
                    border-radius: 8px;
                    font-weight: 600;
                }
                .gt-results-modal .gt-check {
                    width: 1.1rem;
                    height: 1.1rem;
                }
                .gt-results-modal .gt-results-footer .btn {
                    min-width: 116px;
                    font-weight: 600;
                }
            `}</style>
        </Modal>
    );
};

const CompletedDetailsModal = ({ show, onHide, testId }) => {
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && testId) {
            fetchDetails();
        }
    }, [show, testId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/gold-tests/${testId}`);
            if (res.data.success) {
                setTest(res.data.data);
            }
        } catch (_err) {
            toast.error('Failed to load completed details');
            onHide();
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!test) return;
        try {
            const lines = [
                'Completed Details',
                `Customer: ${test.customer_name || '-'}`,
                `Date: ${formatDate(test.created_at)}`,
                `Sample Count: ${(test.items || []).length}`,
                `Amount: Rs ${formatMoney(test.total)}`,
                `Mode: ${test.mode_of_payment || '-'}`,
                '',
                'Items:'
            ];

            (test.items || []).forEach((item, idx) => {
                const w = getWeights(item);
                lines.push(
                    `${idx + 1}. ${item.item_type || '-'} (${item.item_no || item.item_number || '-'}) | ` +
                    `Sample: ${w.sample}g | Total: ${w.total}g | Net: ${w.net}g | ` +
                    `Purity: ${item.purity || 0}% | Returned: ${item.returned ? 'Yes' : 'No'}`
                );
            });

            const text = lines.join('\n');

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            toast.success('Completed details copied to clipboard');
        } catch (_err) {
            toast.error('Unable to copy completed details');
        }
    };

    const printSingle = (item) => {
        if (!test || !item) return;
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        const weights = getWeights(item);
        const weightValue = weights.net > 0
            ? `${weights.net}g / ${weights.sample}g`
            : `${weights.sample}g`;
        const html = `
            <html>
            <head>
                <title>Gold Test Print</title>
                <meta charset="utf-8" />
            </head>
            <body style="font-family:Arial,sans-serif;padding:20px;">
                <div style="max-width:460px;border:1px solid #d1d5db;border-radius:10px;padding:16px;">
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;">
                        <span>${escapeHtml(item.item_no || item.item_number || '-')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;">
                        <span>${escapeHtml(test.customer_name || '-')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:14px;">
                        <span>${weightValue}</span>
                    </div>
                    <div style="display:inline-block;border:2px solid #111827;border-radius:8px;padding:8px 14px;font-weight:800;font-size:20px;">
                        ${item.purity || 0}%
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
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="payment-delivery-modal">
            <Modal.Header closeButton className="modal-soft-header">
                <Modal.Title className="d-flex align-items-center justify-content-between w-100">
                    <span>Completed Details</span>
                    <Button variant="outline-primary" size="sm" onClick={handleCopy}>
                        <FaCopy className="me-1" /> Copy
                    </Button>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading || !test ? (
                    <div className="text-center py-4"><Spinner animation="border" /></div>
                ) : (
                    <div>
                        <div className="mb-3" style={modalStyles.metaStrip}>
                            <div><strong>Customer:</strong> {test.customer_name || '-'}</div>
                            <div><strong>Date:</strong> {formatDate(test.created_at)}</div>
                            <div><strong>Sample Count:</strong> {(test.items || []).length}</div>
                            <div><strong>Amount:</strong> Rs {formatMoney(test.total)}</div>
                            <div><strong>Mode:</strong> {test.mode_of_payment || '-'}</div>
                        </div>

                        <Table bordered hover size="sm" className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Seq</th>
                                    <th>Item</th>
                                    <th>Sample Wt</th>
                                    <th>Total Wt</th>
                                    <th>Net Wt</th>
                                    <th>Purity</th>
                                    <th>Returned</th>
                                    <th className="print-col">Print</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(test.items || []).map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div>{item.item_type || '-'}</div>
                                            <small className="text-muted">{item.item_no || item.item_number || '-'}</small>
                                        </td>
                                        <td>{getWeights(item).sample} g</td>
                                        <td>{getWeights(item).total} g</td>
                                        <td>{getWeights(item).net} g</td>
                                        <td>{item.purity || 0}%</td>
                                        <td>{item.returned ? 'Yes' : 'No'}</td>
                                        <td className="print-col">
                                            <Button variant="outline-secondary" size="sm" onClick={() => printSingle(item)}>
                                                <FaPrint />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

const GoldTest = () => {
    const [columns, setColumns] = useState({
        TODO: [],
        IN_PROGRESS: [],
        DONE: []
    });
    const [loading, setLoading] = useState(false);
    const [batchMoving, setBatchMoving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [paymentModalTestId, setPaymentModalTestId] = useState(null);
    const [completedModalTestId, setCompletedModalTestId] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);

    const fetchColumnData = async (status) => {
        try {
            const res = await api.get(`/gold-tests?status=${status}&limit=100`);
            return res.data.success ? res.data.data : [];
        } catch (error) {
            console.error(`Error fetching ${status}:`, error);
            toast.error(`Failed to load ${status} items`);
            return [];
        }
    };

    const loadBoard = async () => {
        setLoading(true);
        try {
            const [todo, inProgress, done] = await Promise.all([
                fetchColumnData('TODO'),
                fetchColumnData('IN_PROGRESS'),
                fetchColumnData('DONE')
            ]);
            setColumns({
                TODO: todo,
                IN_PROGRESS: inProgress,
                DONE: done
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBoard();
    }, []);

    const handleCardOpen = (item) => {
        if (item.status === 'TODO') {
            setSelectedTestId(item.id);
            return;
        }
        if (item.status === 'IN_PROGRESS') {
            setPaymentModalTestId(item.id);
            return;
        }
        setCompletedModalTestId(item.id);
    };

    const handleDropToColumn = async (targetStatus) => {
        if (!draggedItem || draggedItem.status === targetStatus) return;

        try {
            if (targetStatus === 'IN_PROGRESS' && draggedItem.status === 'TODO') {
                const detailRes = await api.get(`/gold-tests/${draggedItem.id}`);
                const detail = detailRes.data?.data;
                const items = detail?.items || [];
                const hasPurity = items.length > 0 && items.every((item) => {
                    const p = Number(item.purity);
                    return Number.isFinite(p) && p > 0 && p <= 100;
                });
                if (!hasPurity) {
                    toast.info('Add test results before moving to Tested.');
                    setSelectedTestId(draggedItem.id);
                    return;
                }
            }

            if (targetStatus === 'DONE') {
                const amount = Number(draggedItem.total || 0);
                const mode = (draggedItem.mode_of_payment || '').trim();
                if (!(Number.isFinite(amount) && amount > 0 && mode)) {
                    toast.info('Add payment details in Tested status before moving to Completed.');
                    setPaymentModalTestId(draggedItem.id);
                    return;
                }

                const detailRes = await api.get(`/gold-tests/${draggedItem.id}`);
                const detail = detailRes.data?.data;
                await api.post(`/gold-tests/${draggedItem.id}/finalize`, {
                    items: buildResultsItems(detail?.items || []),
                    mode_of_payment: mode,
                    weight_loss: 0
                });
                toast.success('Moved to Completed');
            } else {
                await api.patch(`/gold-tests/${draggedItem.id}/status`, { status: targetStatus });
                toast.success(`Moved to ${STATUS_COLUMNS.find((x) => x.id === targetStatus)?.label || targetStatus}`);
            }

            await loadBoard();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Move failed');
        } finally {
            setDraggedItem(null);
        }
    };

    const handleBatchTransferTested = async () => {
        const testedCards = columns.IN_PROGRESS || [];
        if (testedCards.length === 0) {
            toast.info('No samples in Tested status to transfer');
            return;
        }

        const eligible = testedCards.filter((card) => {
            const amount = Number(card.total || 0);
            return Number.isFinite(amount) && amount > 0 && !!card.mode_of_payment;
        });

        if (eligible.length === 0) {
            toast.info('No eligible samples ready for completion. Add payment details first.');
            return;
        }

        const pendingCount = testedCards.length - eligible.length;
        const confirmed = window.confirm(`Transfer ${eligible.length} eligible tested sample(s) to Completed?\n(${pendingCount} sample(s) will remain in Tested)`);
        if (!confirmed) return;

        setBatchMoving(true);
        let successCount = 0;

        for (const card of eligible) {
            try {
                const detailRes = await api.get(`/gold-tests/${card.id}`);
                const detail = detailRes.data?.data;
                const items = detail?.items || [];
                await api.post(`/gold-tests/${card.id}/finalize`, {
                    items: buildResultsItems(items),
                    mode_of_payment: card.mode_of_payment,
                    weight_loss: 0
                });
                successCount += 1;
            } catch (_err) {
                // Continue with other cards
            }
        }

        await loadBoard();
        setBatchMoving(false);

        toast.success(`${successCount} sample(s) moved to Completed${pendingCount > 0 ? `, ${pendingCount} remain in Tested` : ''}`);
    };

    return (
        <Container fluid style={boardStyles.page}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 style={boardStyles.headerTitle}>Gold Testing Kanban</h2>
                    <p style={boardStyles.headerSub}>Track samples across Ongoing, Tested, and Completed stages.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <Button
                        variant="light"
                        className="d-flex align-items-center gap-2"
                        onClick={handleBatchTransferTested}
                        disabled={batchMoving}
                    >
                        {batchMoving ? <Spinner animation="border" size="sm" /> : <FaCheckDouble />}
                        Move Tested Completed
                    </Button>
                    <Button
                        variant="light"
                        className="d-flex align-items-center gap-2"
                        onClick={loadBoard}
                        disabled={loading}
                    >
                        {loading ? <Spinner animation="border" size="sm" /> : <FaSync />}
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(true)}>
                        <FaPlus className="me-2" /> New Sample
                    </Button>
                </div>
            </div>

            <Row className="g-3">
                {STATUS_COLUMNS.map((col) => {
                    const items = columns[col.id] || [];
                    return (
                        <Col key={col.id} lg={4} md={6}>
                            <div style={boardStyles.columnWrap}>
                                <div className="d-flex justify-content-between align-items-center" style={boardStyles.columnHeader(col.accent)}>
                                    <h6 className="mb-0 fw-bold" style={{ color: col.headingColor }}>{col.label}</h6>
                                    <Badge pill style={{ backgroundColor: col.chipBg, color: col.chipColor, fontWeight: 700 }}>
                                        {items.length}
                                    </Badge>
                                </div>

                                <div style={boardStyles.cardsArea}>
                                    <div
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDropToColumn(col.id)}
                                        style={{ minHeight: '1px' }}
                                    />
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="mb-3"
                                            style={boardStyles.card(col.accent)}
                                            onClick={() => handleCardOpen(item)}
                                            draggable
                                            onDragStart={() => setDraggedItem(item)}
                                        >
                                            {item.status === 'IN_PROGRESS' && isTestedCardReady(item) && (
                                                <div
                                                    title="Ready"
                                                    style={{
                                                        position: 'absolute',
                                                        top: 10,
                                                        right: 10,
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: '50%',
                                                        background: '#3b82f6',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        boxShadow: '0 2px 8px rgba(59,130,246,0.35)'
                                                    }}
                                                >
                                                    ?
                                                </div>
                                            )}
                                            <div className="p-3">
                                                <div className="d-flex justify-content-between align-items-start gap-2">
                                                    <div>
                                                        <div className="fw-semibold text-dark" style={{ fontSize: '1.05rem', lineHeight: 1.2 }} title={item.customer_name || ''}>
                                                            {item.customer_name || 'Unknown Customer'}
                                                        </div>
                                                        <div style={boardStyles.cardMeta}>
                                                            {item.auto_number || shortId(item.id)}
                                                        </div>
                                                    </div>
                                                    <small className="text-muted" style={{ fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                                                        {formatCardDate(item.created_at)}
                                                    </small>
                                                </div>

                                                <div style={{ marginTop: '0.55rem', color: '#4b5563', fontSize: '1.05rem' }}>
                                                    {(item.item_count || 0)} {(item.item_count || 0) === 1 ? 'sample' : 'samples'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {items.length === 0 && !loading && (
                                        <div style={boardStyles.emptyState}>
                                            <small>No items in {col.label}</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Col>
                    );
                })}
            </Row>

            <NewGoldTestModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSuccess={loadBoard}
            />

            <UpdatePurityModal
                show={!!selectedTestId}
                testId={selectedTestId}
                onHide={() => setSelectedTestId(null)}
                onUpdate={loadBoard}
            />

            <PaymentDeliveryModal
                show={!!paymentModalTestId}
                testId={paymentModalTestId}
                onHide={() => setPaymentModalTestId(null)}
                onSuccess={loadBoard}
            />

            <CompletedDetailsModal
                show={!!completedModalTestId}
                testId={completedModalTestId}
                onHide={() => setCompletedModalTestId(null)}
            />
        </Container>
    );
};

export default GoldTest;


