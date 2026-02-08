import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Modal, Toast } from '../components/SalesforceComponents';
import { FaUserPlus, FaSearch } from 'react-icons/fa';
import api from '../services/api';
import NewCustomerModal from '../components/NewCustomerModal';

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase();
        setFilteredCustomers(customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
            (c.phone && c.phone.includes(searchTerm))
        ));
    }, [searchTerm, customers]);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            showToast('Failed to fetch customers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCustomer = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    const handleAddCustomer = () => {
        setSelectedCustomer(null);
        setShowModal(true);
    };

    const columns = [
        {
            header: 'Name', field: 'name', sortable: true, render: (row) => (
                <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate(`/customers/${row.id}`)}>
                    {row.name}
                </span>
            )
        },
        { header: 'Phone', field: 'phone' },
        {
            header: 'Balance', field: 'balance', sortable: true, render: (row) => (
                <span style={{ color: row.balance > 0 ? '#ea001e' : '#04844b', fontWeight: 'bold' }}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(row.balance || 0)}
                </span>
            )
        },
        { header: 'Notes', field: 'notes' },
        {
            header: 'Status', field: 'status', render: (row) => (
                <span className={`slds-badge ${row.deletedon ? 'slds-badge_danger' : 'slds-badge_success'}`}>
                    {row.deletedon ? 'Disabled' : 'Active'}
                </span>
            )
        },
        {
            header: 'Actions', render: (row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => handleEditCustomer(row)}>
                        Edit
                    </button>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
                ))}
            </div>

            <div className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Customers</h1>
                        <p className="text-muted" style={{ margin: 0 }}>Manage customer profiles and accounts</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleAddCustomer}>
                        <FaUserPlus style={{ marginRight: '8px' }} /> Add Customer
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Customer List ({filteredCustomers.length})</h2>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#706e6b' }} />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '32px' }}
                        />
                    </div>
                </div>
                <div className="card-body">
                    <DataTable
                        columns={columns}
                        data={filteredCustomers}
                        sortable={true}
                        loading={loading}
                    />
                </div>
            </div>

            <NewCustomerModal
                show={showModal}
                onHide={() => setShowModal(false)}
                customer={selectedCustomer}
                onSuccess={() => {
                    fetchCustomers();
                    // Toast is already shown by the modal
                }}
            />
        </div>
    );
};

export default Customers;
