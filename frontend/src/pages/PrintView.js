import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './PrintView.css';

const PrintView = () => {
    const { type, id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let endpoint = '';
                if (type === 'gold-test' || type === 'silver-test') {
                    endpoint = `/${type}s/${id}`;
                } else if (type === 'certificate' || type === 'small-certificate') {
                    endpoint = `/certificates/${id}`;
                } else if (type === 'payment') {
                    endpoint = `/ledger/transaction/${id}`;
                }

                const response = await api.get(endpoint);
                if (response.data.success) {
                    setData(response.data.data);
                } else {
                    setData(response.data); // Fallback if success flag isn't used consistently
                }
            } catch (error) {
                console.error('Error fetching print data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, id]);

    useEffect(() => {
        if (!loading && data) {
            // Auto-print after a short delay to ensure rendering
            const timer = setTimeout(() => {
                window.print();
                // Optional: window.close() - only works if opened with window.open()
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) return <div className="print-loading">Preparing Document...</div>;
    if (!data) return <div className="print-error">Document not found.</div>;

    const numToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

        const convert_thousands = (n) => {
            if (n >= 1000) return convert_thousands(Math.floor(n / 1000)) + " Thousand " + convert_hundreds(n % 1000);
            return convert_hundreds(n);
        };

        const convert_hundreds = (n) => {
            if (n > 99) return ones[Math.floor(n / 100)] + " Hundred " + convert_tens(n % 100);
            return convert_tens(n);
        };

        const convert_tens = (n) => {
            if (n < 10) return ones[n];
            if (n >= 10 && n < 20) return teens[n - 10];
            return tens[Math.floor(n / 10)] + " " + ones[n % 10];
        };

        if (num === 0) return "Zero";
        return convert_thousands(num).trim() + " Only";
    };

    const toCarat = (purity) => (parseFloat(purity) * 0.24).toFixed(2);

    const renderCertificate = (cert) => (
        <div className="certificate-card">
            <div className="cert-header">
                <h1>SWASTIK GOLD & SILVER LAB</h1>
                <p>Govt. Approved Testing & Certification Centre</p>
            </div>
            <div className="cert-body">
                <div className="cert-meta">
                    <div>
                        <span className="label">Certificate No.</span>
                        <span className="value">{cert.certificate_no}</span>
                    </div>
                    <div>
                        <span className="label">Date</span>
                        <span className="value">{new Date(cert.issue_date).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="cert-content">
                    {cert.photo_path && (
                        <div className="cert-photo">
                            <img src={`${process.env.REACT_APP_API_URL || ''}${cert.photo_path}`} alt="Sample" />
                        </div>
                    )}
                    <div className="cert-details">
                        <p>This is to certify that the item described below has been tested for its purity.</p>
                        <table className="cert-table">
                            <thead>
                                <tr>
                                    <th>Cert No</th>
                                    <th>Item</th>
                                    <th>Weight</th>
                                    <th>Purity (%)</th>
                                    <th>Carat (kt)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cert.items.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.sub_certificate_number || '-'}</td>
                                        <td>{item.item_name}</td>
                                        <td>{item.weight}g</td>
                                        <td>
                                            {item.purity}%
                                            <div className="small text-muted">{numToWords(Math.floor(item.purity))}</div>
                                        </td>
                                        <td>{item.carat || toCarat(item.purity)} kt</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="cert-footer">
                    <div className="signature">
                        <div className="sign-line"></div>
                        <p>Lab Technician</p>
                    </div>
                    <div className="seal">
                        <span>SWASTIK LABS</span>
                    </div>
                    <div className="signature">
                        <div className="sign-line"></div>
                        <p>Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTestReceipt = (test) => (
        <div className="test-receipt" style={{ width: '100mm', padding: '4.4cm 5mm 5mm 5mm' }}>
            <div className="receipt-header">
                <h2>TESTING MEMO</h2>
                <p>ID: {test.id}</p>
            </div>
            <div className="receipt-body">
                <table className="receipt-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Weight</th>
                            <th>Loss</th>
                            <th>Purity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(test.items || []).map((item, i) => (
                            <tr key={i} className={parseFloat(item.purity) <= 0 ? 'no-gold-row' : ''}>
                                <td>{item.item}</td>
                                <td>{item.total_weight}g</td>
                                <td>{item.weight_loss || 0}g</td>
                                <td className="fw-bold">
                                    {parseFloat(item.purity) <= 0 ? 'NO GOLD' : `${item.purity}%`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="receipt-total">
                    <span>Total Amount:</span>
                    <span>₹{test.total_amount || test.total}</span>
                </div>
            </div>
            <div className="receipt-footer">
                <p>Thank you for choosing Swastik Lab</p>
                <p>{new Date(test.createdon).toLocaleString()}</p>
            </div>
        </div>
    );

    const renderSmallCertificate = (cert) => (
        <div className="small-certificate" style={{ width: '100mm', minHeight: '150mm', padding: '10mm', border: '5px solid #D4AF37', margin: 'auto', background: 'white' }}>
            <div className="text-center mb-3">
                <h4 style={{ color: '#D4AF37', margin: 0 }}>SWASTIK LAB</h4>
                <small>Authenticity Certified</small>
            </div>
            <div className="small-cert-content" style={{ fontSize: '0.8rem' }}>
                <p><b>Cert No:</b> {cert.certificate_no}</p>
                <p><b>Date:</b> {new Date(cert.issue_date).toLocaleDateString()}</p>
                <hr />
                <table style={{ width: '100%' }}>
                    <tbody>
                        {cert.items.map((item, i) => (
                            <tr key={i}>
                                <td><small>{item.sub_certificate_number}</small></td>
                                <td>{item.item_name}</td>
                                <td>{item.weight}g</td>
                                <td>{item.purity}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <hr />
                <div className="text-center mt-4">
                    <div style={{ height: '40px', borderBottom: '1px solid #000', width: '80%', margin: '0 auto' }}></div>
                    <small>Authorized Signatory</small>
                </div>
            </div>
        </div>
    );
    const renderPaymentReceipt = (trx) => (
        <div className="payment-receipt" style={{ width: '100mm', padding: '10mm', border: '1px solid #eee', background: '#fff', margin: 'auto' }}>
            <div className="text-center mb-4">
                <h4 className="fw-bold m-0">PAYMENT RECEIPT</h4>
                <div style={{ height: '2px', background: 'var(--primary)', width: '50px', margin: '5px auto' }}></div>
            </div>

            <div className="receipt-row d-flex justify-content-between mb-2">
                <span className="text-muted">Receipt No:</span>
                <span className="fw-bold">{trx.id}</span>
            </div>
            <div className="receipt-row d-flex justify-content-between mb-4">
                <span className="text-muted">Date:</span>
                <span>{new Date(trx.createdon).toLocaleString()}</span>
            </div>

            <div className="customer-box mb-4 p-2 bg-light rounded">
                <small className="text-muted uppercase">Customer Details</small>
                <div className="fw-bold">{trx.customer_name}</div>
                <div className="text-muted small">{trx.customer_phone}</div>
            </div>

            <div className="amount-box text-center py-4 border-top border-bottom mb-4">
                <h2 className="fw-bold text-success mb-0">₹{trx.amount}</h2>
                <div className="small text-muted">{numToWords(trx.amount)}</div>
            </div>

            <div className="mb-4">
                <small className="text-muted">Description:</small>
                <p className="m-0 italic">{trx.description || 'Payment Received'}</p>
            </div>

            <div className="signature-area text-center mt-5">
                <div style={{ height: '40px', borderBottom: '1px solid #000', width: '120px', margin: '0 auto' }}></div>
                <small>Receiver's Signature</small>
            </div>

            <div className="text-center mt-4 small text-muted">
                --- This is a computer generated receipt ---
            </div>
        </div>
    );

    return (
        <div className="print-container">
            <div className="no-print print-toolbar">
                <button onClick={() => window.print()}>Print Now</button>
                <button onClick={() => window.history.back()}>Go Back</button>
            </div>

            <div className="print-content">
                {type === 'certificate' && renderCertificate(data)}
                {type === 'small-certificate' && renderSmallCertificate(data)}
                {type === 'payment' && renderPaymentReceipt(data)}
                {(type === 'gold-test' || type === 'silver-test') && renderTestReceipt(data)}
            </div>
        </div>
    );
};

export default PrintView;
