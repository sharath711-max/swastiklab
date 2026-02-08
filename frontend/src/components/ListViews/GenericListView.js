import React, { useState, useEffect } from 'react';
import { Table, Form, InputGroup, Button, Pagination, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaSearch, FaInbox } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const GenericListView = ({ type, endpoint, columns, title, emptyMessage, emptyHint }) => {
    // const navigate = useNavigate(); // eslint-disable-line no-unused-vars
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`${endpoint}?page=${page}&limit=10&search=${search}`);
            setData(response.data.data);
            setPagination(response.data.pagination);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch data');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // Refetch when type, page, or search changes
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset to page 1 on search
        fetchData();
    };

    const formatCell = (row, col) => {
        if (col.render) return col.render(row);

        const val = row[col.key];

        if (col.key === 'created' || col.key === 'createdon') {
            if (!val) return '-';
            return new Date(val).toLocaleDateString() + ' ' + new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Currency formatting (right-aligned usually, but handled by parent td style)
        if ((col.key === 'total' || col.key === 'amount' || col.key === 'item_total' || col.key === 'balance')) {
            if (val === undefined || val === null) return '-';
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
        }

        // Logic for booleans or codes if not handled by render
        if (val === true) return <Badge bg="success">Yes</Badge>;
        if (val === false) return <Badge bg="secondary">No</Badge>;

        return val;
    };

    return (
        <div className="generic-list-view">
            {/* Search & Filter Bar */}
            <div className="mb-4 bg-white p-3 rounded shadow-sm border">
                <div className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-center">
                    <Form onSubmit={handleSearch} className="flex-grow-1 w-100" style={{ maxWidth: '600px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-light border-end-0 text-muted"><FaSearch /></InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search by Record No, Item No, Name or Phone..." // Updated placeholder
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="border-start-0 shadow-none bg-light fw-medium"
                            />
                            <Button type="submit" variant="primary" className="px-4 fw-bold">Search</Button>
                        </InputGroup>
                    </Form>
                    <div className="text-secondary fw-semibold text-nowrap">
                        Total Records: <Badge bg="secondary" pill>{pagination.total}</Badge>
                    </div>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Content Area */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" role="status" variant="primary">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p className="mt-2 text-muted">Loading records...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="text-center py-5 border rounded bg-white">
                    <div className="text-muted mb-3"><FaInbox size={40} opacity={0.3} /></div>
                    <h5 className="text-secondary fw-bold">{emptyMessage || 'No records found'}</h5>
                    <p className="text-muted small">{emptyHint || 'Records matching your search criteria will appear here.'}</p>
                    {/* Optional: 'Clear Search' button if search is active */}
                    {search && (
                        <Button variant="outline-primary" size="sm" onClick={() => { setSearch(''); setPage(1); handleSearch({ preventDefault: () => { } }); }}>Clear Search</Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="table-responsive shadow-sm rounded border">
                        <Table hover className="mb-0 bg-white align-middle">
                            <thead className="bg-light text-uppercase small text-muted">
                                <tr>
                                    {columns.map((col, idx) => {
                                        const isNumeric = ['total', 'amount', 'item_total', 'balance', 'gross_weight', 'test_weight', 'net_weight', 'purity', 'carat'].includes(col.key);
                                        return (
                                            <th key={idx} className={`py-3 ${isNumeric ? 'text-end' : ''}`} style={{ fontWeight: 600, paddingRight: isNumeric ? '1rem' : undefined }}>{col.label}</th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {columns.map((col, cIdx) => {
                                            const isNumeric = ['total', 'amount', 'item_total', 'balance', 'gross_weight', 'test_weight', 'net_weight', 'purity', 'carat'].includes(col.key);
                                            return (
                                                <td key={cIdx} className={`py-3 ${isNumeric ? 'text-end font-monospace' : ''}`} style={isNumeric ? { paddingRight: '1rem' } : {}}>
                                                    {formatCell(row, col)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="d-flex justify-content-end mt-4">
                            <Pagination>
                                <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                                <Pagination.Prev onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                                <Pagination.Item active>{page}</Pagination.Item>
                                <Pagination.Next onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} />
                                <Pagination.Last onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages} />
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GenericListView;
