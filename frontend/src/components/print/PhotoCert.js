import React from 'react';
import './CertificatePrint.css'; // Has the @media print and #root hiding resets
import './PhotoCertificatePrint.css';

/**
 * High-fidelity print template for Photo Certificates.
 * Replaces the legacy SSR photo_certificate.html implementation.
 * Supports a variable photo array (1 to 4 photos per test/item printout).
 */
const PhotoCertificateTemplate = ({ test, item, photos = [] }) => {
    if (!test || !item) return null;

    // Use full base URL for images. Handle local caching if needed.
    const getMediaUrl = (path) => {
        if (!path) return '';
        // If it's a blob/object URL already, just return it
        if (path.startsWith('blob:') || path.startsWith('data:')) return path;

        // Otherwise prefix with backend domain if it is relative
        const urlObj = new URL(window.location.href);
        const baseUrl = `${urlObj.protocol}//${urlObj.hostname}:5000`;
        return path.startsWith('http') ? path : `${baseUrl}/${path}`;
    };

    // Calculate image grid layout (up to 4 photos realistically fitting on A4 comfortably)
    const validPhotos = photos.filter(Boolean).slice(0, 4);
    // If photos prop array is empty but item has a 'media_path', normalize it into our grid
    if (validPhotos.length === 0 && item.media_path) {
        validPhotos.push(item.media_path);
    } else if (validPhotos.length === 0 && item.media) {
        validPhotos.push(item.media);
    }

    const imageCount = validPhotos.length || 1; // Default to 1 so the empty box renders if missing

    // NNN Display Logic
    const itemReferenceNum = item.item_no || item.item_number || '001';

    // Security QR URL hitting 18-character immutable DB record
    const verifyUrl = `${window.location.origin}/verify/pc/${item.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;

    return (
        <div className="pc-certificate-container" id="certificate-print-document">
            {/* Background Watermark */}
            <div className="pc-watermark">
                PHOTO<br />CERTIFICATE
            </div>

            {/* Header */}
            <div className="pc-header">
                <h2>SWASTIK PHOTO LABORATORY</h2>
                <div className="pc-meta">
                    <span className="cert-number">
                        <strong>Case Ref:</strong> {test.bill_number}/{itemReferenceNum}
                    </span>
                    <span className="cert-date">
                        <strong>Date:</strong> {new Date(item.created_at || item.created || test.createdon || Date.now()).toLocaleDateString('en-GB')}
                    </span>
                </div>
            </div>

            {/* Customer Details */}
            <div className="pc-customer">
                <p>
                    <strong>Customer:</strong> {item.name || test.customer_name || (test.customer && test.customer.name) || '-'}
                </p>
            </div>

            {/* Dynamic Evidence Grid (1x1 or 2x2) */}
            <div className="pc-image-container" data-count={imageCount}>
                {validPhotos.length > 0 ? validPhotos.map((photo, idx) => (
                    <div className="pc-photo-wrapper" key={idx}>
                        <img
                            className="pc-main-photo"
                            src={getMediaUrl(photo)}
                            alt={`Evidence ${idx + 1}`}
                        />
                        <div className="pc-photo-timestamp">
                            {new Date(item.created_at || item.created || Date.now()).toLocaleString()}
                        </div>
                    </div>
                )) : (
                    <div className="pc-photo-wrapper">
                        <div className="pc-main-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                            [No Image Uploaded]
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <table className="pc-table">
                <tbody>
                    <tr>
                        <td style={{ width: '50%' }}>
                            <strong>Item Config:</strong> {item.item_type || item.item || '-'}
                        </td>
                        <td style={{ width: '50%', textAlign: 'right' }}>
                            <strong>Gross Wt:</strong> {(Number(item.gross_weight) || 0).toFixed(3)}g
                        </td>
                    </tr>
                    <tr>
                        <td style={{ width: '50%' }}>
                            <strong>Test Wt:</strong> {(Number(item.test_weight) || 0).toFixed(3)}g
                        </td>
                        <td style={{ width: '50%', textAlign: 'right' }}>
                            <strong>Net Wt:</strong> {(Number(item.net_weight) || 0).toFixed(3)}g
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Purity field ONLY if show_kt is true or purity exists and > 0 */}
            {(item.show_kt || Number(item.purity) > 0) && (
                <div className="description-block" style={{ border: '2px solid #333', padding: '15px', borderRadius: '5px' }}>
                    <strong>Tested Purity/Karat:</strong> <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{(Number(item.purity) || 0).toFixed(2)}%</span>
                </div>
            )}

            {/* Footer with Security QR & Print Signature */}
            <div className="pc-footer">
                <div className="pc-qr">
                    <img src={qrUrl} alt="Verify Security QR" />
                </div>
                <div className="pc-signature">
                    Authorized Lab Technician
                </div>
            </div>
        </div>
    );
};

export default PhotoCertificateTemplate;
