import React from 'react';
import { Modal } from 'react-bootstrap';
import CertificateForm from './CertificateForm';
import api from '../services/api';
import { toast } from 'react-toastify';

const NewCertificateModal = ({ show, onHide, onSuccess, type }) => {
    const handleCreate = async (formData) => {
        try {
            const res = await api.post('/certificates/with-photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data) {
                toast.success('Certificate issued successfully');
                if (onSuccess) onSuccess();
                onHide();
            }
        } catch (error) {
            console.error('Error issuing certificate:', error);
            const msg = error.response?.data?.error || 'Failed to issue certificate';
            toast.error(msg);
        }
    };

    const titleMap = {
        gold: 'New Gold Certificate',
        silver: 'New Silver Certificate',
        photo: 'New Photo Certificate'
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="new-test-modal">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    {titleMap[type] || 'New Certificate'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <CertificateForm
                    forcedType={type}
                    onSubmit={handleCreate}
                    onCancel={onHide}
                />
            </Modal.Body>
            <style>{`
                .new-test-modal .modal-content {
                    border-radius: 12px;
                    border: none;
                }
            `}</style>
        </Modal>
    );
};

export default NewCertificateModal;
