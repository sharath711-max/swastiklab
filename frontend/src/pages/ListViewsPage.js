
import React, { useState, useEffect } from 'react';
import { Container, Nav, Card, Badge } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import GenericListView from '../components/ListViews/GenericListView';
import { Button } from 'react-bootstrap';
import { FaEye, FaFlask, FaCertificate, FaGem, FaBook } from 'react-icons/fa';

const RecordsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Mapping configuration
    // Category -> SubTabs -> Endpoint/Key
    const CONFIG = {
        tests: {
            label: 'Tests',
            icon: <FaFlask className="mb-1 me-2" />,
            subTabs: [
                { key: 'gold-tests', label: 'Gold Tests' },
                { key: 'silver-tests', label: 'Silver Tests' }
            ]
        },
        certificates: {
            label: 'Certificates',
            icon: <FaCertificate className="mb-1 me-2" />,
            subTabs: [
                { key: 'gold-certificates', label: 'Gold Certificates' },
                { key: 'silver-certificates', label: 'Silver Certificates' },
                { key: 'photo-certificates', label: 'Photo Certificates' }
            ]
        },
        items: {
            label: 'Items',
            icon: <FaGem className="mb-1 me-2" />,
            subTabs: [
                { key: 'gold-test-items', label: 'GT Items' },
                { key: 'silver-test-items', label: 'ST Items' },
                { key: 'gold-certificate-items', label: 'GC Items' },
                { key: 'silver-certificate-items', label: 'SC Items' },
                { key: 'photo-certificate-items', label: 'PC Items' }
            ]
        },
        ledger: {
            label: 'Ledger',
            icon: <FaBook className="mb-1 me-2" />,
            subTabs: [
                { key: 'credit-history', label: 'Credit History' },
                { key: 'weight-loss-history', label: 'Weight Loss' }
            ]
        }
    };

    // Initialize state from URL or Default
    // URL structure: /list-views?category=tests&tab=gold-tests    
    const getInitialState = () => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category') || 'tests';
        const tab = params.get('tab') || 'gold-tests';
        return { category: cat, tab: tab };
    };

    const [activeCategory, setActiveCategory] = useState(getInitialState().category);
    const [activeTab, setActiveTab] = useState(getInitialState().tab);

    useEffect(() => {
        const state = getInitialState();
        setActiveCategory(state.category);
        setActiveTab(state.tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    const handleCategoryChange = (catKey) => {
        const defaultSubTab = CONFIG[catKey].subTabs[0].key;
        setActiveCategory(catKey);
        setActiveTab(defaultSubTab);
        navigate(`/list-views?category=${catKey}&tab=${defaultSubTab}`);
    };

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        navigate(`/list-views?category=${activeCategory}&tab=${tabKey}`);
    };

    // Columns Definitions
    const viewAction = (row) => {
        // Fallback for ID if API changes
        const id = row.id || row.parent_id;
        if (!id) return null;

        return (
            <Button variant="outline-primary" size="sm" onClick={() => handleView(activeTab, id)}>
                <FaEye /> View
            </Button>
        );
    };

    const handleView = (type, id) => {
        // Navigate to the generic record page for all types
        navigate(`/record/${type}/${id}`);
    };

    const COLUMNS = {
        'gold-tests': [
            { key: 'auto_number', label: 'Record No' },
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'mobile', label: 'Phone', render: r => r.phone || r.mobile || '-' },
            { key: 'status', label: 'Status', render: r => <Badge bg={r.status === 'DONE' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'mode_of_payment', label: 'Mode' },
            { key: 'total', label: 'Total' },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'silver-tests': [
            { key: 'auto_number', label: 'Record No' },
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'mobile', label: 'Phone', render: r => r.phone || r.mobile || '-' },
            { key: 'status', label: 'Status', render: r => <Badge bg={r.status === 'DONE' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'mode_of_payment', label: 'Mode' },
            { key: 'total', label: 'Total' },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'gold-certificates': [
            { key: 'auto_number', label: 'Record No' },
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'mobile', label: 'Phone', render: r => r.phone || r.mobile || '-' },
            { key: 'status', label: 'Status', render: r => <Badge bg={r.status === 'DONE' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'total', label: 'Total' },
            { key: 'gst', label: 'GST', render: (r) => r.gst ? <Badge bg="info">Yes</Badge> : <span className="text-muted">No</span> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'silver-certificates': [
            { key: 'auto_number', label: 'Record No' },
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'mobile', label: 'Phone', render: r => r.phone || r.mobile || '-' },
            { key: 'status', label: 'Status', render: r => <Badge bg={r.status === 'DONE' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'photo-certificates': [
            { key: 'auto_number', label: 'Record No' },
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'mobile', label: 'Phone', render: r => r.phone || r.mobile || '-' },
            { key: 'status', label: 'Status', render: r => <Badge bg={r.status === 'DONE' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'total', label: 'Total' },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        // Items
        'gold-test-items': [
            { key: 'item_number', label: 'Item No' },
            { key: 'parent_auto_number', label: 'Record No' },
            { key: 'item_type', label: 'Type' },
            { key: 'purity', label: 'Purity %' },
            { key: 'returned', label: 'Returned', render: r => r.returned ? <Badge bg="secondary">Yes</Badge> : <Badge bg="success">In Lab</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'silver-test-items': [
            { key: 'item_number', label: 'Item No' },
            { key: 'parent_auto_number', label: 'Record No' },
            { key: 'item_type', label: 'Type' },
            { key: 'purity', label: 'Purity %' },
            { key: 'returned', label: 'Returned', render: r => r.returned ? <Badge bg="secondary">Yes</Badge> : <Badge bg="success">In Lab</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'gold-certificate-items': [
            { key: 'item_number', label: 'Item No' },
            { key: 'parent_auto_number', label: 'Record No' },
            { key: 'item_type', label: 'Type' },
            { key: 'item_total', label: 'Valuation' },
            { key: 'returned', label: 'Returned', render: r => r.returned ? <Badge bg="secondary">Yes</Badge> : <Badge bg="success">In Lab</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'silver-certificate-items': [
            { key: 'item_number', label: 'Item No' },
            { key: 'parent_auto_number', label: 'Record No' },
            { key: 'item_type', label: 'Type' },
            { key: 'item_total', label: 'Valuation' },
            { key: 'returned', label: 'Returned', render: r => r.returned ? <Badge bg="secondary">Yes</Badge> : <Badge bg="success">In Lab</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'photo-certificate-items': [
            { key: 'item_number', label: 'Item No' },
            { key: 'parent_auto_number', label: 'Record No' },
            { key: 'item_type', label: 'Type' },
            { key: 'returned', label: 'Returned', render: r => r.returned ? <Badge bg="secondary">Yes</Badge> : <Badge bg="success">In Lab</Badge> },
            { key: 'created', label: 'Created' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        // History
        'credit-history': [
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'type', label: 'Type', render: r => <Badge bg={r.type === 'debit' ? 'danger' : 'success'}>{r.type.toUpperCase()}</Badge> },
            { key: 'amount', label: 'Amount' },
            { key: 'mode_of_payment', label: 'Mode' },
            { key: 'createdon', label: 'Date' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
        'weight-loss-history': [
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'amount', label: 'Loss (g)' },
            { key: 'reason', label: 'Reason' },
            { key: 'createdon', label: 'Date' },
            { key: 'action', label: 'Action', render: viewAction }
        ],
    };

    const getEmptyMessage = (tab) => {
        if (tab.includes('test')) return 'No tests found in this category.';
        if (tab.includes('certificate')) return 'No certificates issued yet.';
        if (tab.includes('item')) return 'No items found.';
        if (tab.includes('credit')) return 'No credit history records found.';
        if (tab.includes('weight')) return 'No weight loss records yet.';
        return 'No records found.';
    };

    return (
        <div className="list-views-page h-100 d-flex flex-column bg-light">
            {/* Header Section */}
            <div className="bg-white border-bottom shadow-sm pt-4 px-4 pb-0">
                <Container fluid className="p-0">
                    <div className="mb-4">
                        <h2 className="fw-bold mb-1 p-0">Records & Reports</h2>
                        <p className="text-muted small mb-0">Browse and search all operational records across the lab.</p>
                    </div>

                    {/* Primary Navigation Tabs */}
                    <Nav variant="tabs" activeKey={activeCategory} onSelect={handleCategoryChange} className="border-bottom-0 gap-2">
                        {Object.keys(CONFIG).map((key) => (
                            <Nav.Item key={key}>
                                <Nav.Link eventKey={key} className={`px-4 py-2 fw-bold ${activeCategory === key ? 'text-primary border-bottom-0' : 'text-secondary bg-transparent border-0'}`} style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                                    {CONFIG[key].icon}
                                    {CONFIG[key].label}
                                </Nav.Link>
                            </Nav.Item>
                        ))}
                    </Nav>
                </Container>
            </div>

            {/* Sub-Navigation & Content */}
            <div className="flex-grow-1 overflow-auto">
                <Container fluid className="py-4">
                    {/* Secondary Navigation (Pills) */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="py-2 px-3 bg-white rounded">
                            <Nav variant="pills" activeKey={activeTab} onSelect={handleTabChange} className="gap-2">
                                {CONFIG[activeCategory].subTabs.map((sub) => (
                                    <Nav.Item key={sub.key}>
                                        <Nav.Link eventKey={sub.key} className="fw-semibold small px-3">
                                            {sub.label}
                                        </Nav.Link>
                                    </Nav.Item>
                                ))}
                            </Nav>
                        </Card.Body>
                    </Card>

                    {/* Data List Component */}
                    <div className="animate-fade-in">
                        <GenericListView
                            type={activeTab}
                            endpoint={`/list/${activeTab}`}
                            columns={COLUMNS[activeTab] || []}
                            title={CONFIG[activeCategory].subTabs.find(t => t.key === activeTab)?.label}
                            emptyMessage={getEmptyMessage(activeTab)}
                            emptyHint="Use the search bar above to find specific records."
                        />
                    </div>
                </Container>
            </div>

            <style jsx>{`
                .nav-link.active {
                    background-color: #fff !important;
                    border-color: #dee2e6 #dee2e6 #fff !important;
                }
                .nav-pills .nav-link.active {
                    background-color: var(--bs-primary) !important;
                    color: white !important;
                }
                .nav-pills .nav-link {
                    color: #6c757d;
                }
            `}</style>
        </div>
    );
};

export default RecordsPage;
