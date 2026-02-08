const goldCertificateRepository = require('../repositories/goldCertificateRepository');
const silverCertificateRepository = require('../repositories/silverCertificateRepository');
const photoCertificateRepository = require('../repositories/photoCertificateRepository');
const customerRepository = require('../repositories/customerRepository');
const billingService = require('./billingService');
const Decimal = require('decimal.js');
const { ValidationError } = require('../utils/errors');

class CertificateService {
    calculateGoldItem(input) {
        const {
            gross_weight,
            test_weight = 0,
            purity,
            rate_per_gram = 0,
            is_returned = false
        } = input;

        // Validation
        const errors = [];
        if (gross_weight === undefined || gross_weight === null) errors.push('Weight is required'); // checking undefined null
        if (gross_weight < 0) errors.push('Gross weight cannot be negative');
        if (test_weight < 0) errors.push('Test weight cannot be negative');
        if (test_weight > gross_weight && gross_weight > 0) errors.push('Test weight cannot exceed gross weight');
        if (purity < 0 || purity > 100) errors.push('Purity must be between 0 and 100%');

        if (errors.length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        const gross = new Decimal(gross_weight || 0);
        const test = new Decimal(test_weight || 0);
        const purityDec = new Decimal(purity || 0);
        const rate = new Decimal(rate_per_gram || 0);

        const net_weight = gross.minus(test);
        const fine_weight = net_weight
            .times(purityDec.div(100))
            .toDecimalPlaces(3);

        const item_total = net_weight
            .times(purityDec.div(100))
            .times(rate)
            .toDecimalPlaces(2);

        return {
            gross_weight: gross.toNumber(),
            test_weight: test.toNumber(),
            net_weight: net_weight.toNumber(),
            purity: purityDec.toNumber(),
            rate_per_gram: rate.toNumber(),
            fine_weight: fine_weight.toNumber(),
            item_total: is_returned ? 0 : item_total.toNumber()
        };
    }

    calculateSilverItem(input) {
        // Silver usually just needs gross weight, purity, maybe test weight logic too.
        // Assuming simple gross - test = net.
        const {
            gross_weight,
            test_weight = 0,
            purity,
            is_returned = false
        } = input;

        const gross = new Decimal(gross_weight || 0);
        const test = new Decimal(test_weight || 0);
        const purityDec = new Decimal(purity || 0);

        const net_weight = gross.minus(test); // if testing involves removal?

        // item_total for silver might be fee based or value based?
        // Schema has item_total.
        // If user provided input.item_total, use it, else calculate 0?
        // Usually silver testing is per piece fee.

        return {
            gross_weight: gross.toNumber(),
            test_weight: test.toNumber(),
            net_weight: net_weight.toNumber(),
            purity: purityDec.toNumber(),
            item_total: input.item_total || 0, // Fee or value? 
            is_returned: is_returned
        };
    }

    async generateCertificate(data) {
        const { customer_id, items, type, status, mode_of_payment, total, gst, gst_bill_number, total_tax } = data;

        // 1. Verify customer
        const customer = customerRepository.findById(customer_id);
        if (!customer) throw new Error('Customer not found');

        // 2. Process items
        const processedItems = items.map(item => {
            if (type === 'gold') {
                const calcs = this.calculateGoldItem(item);
                return { ...item, ...calcs };
            } else if (type === 'silver') {
                const calcs = this.calculateSilverItem(item);
                return { ...item, ...calcs };
            } else {
                return item; // photo items
            }
        });

        // 3. Dispatch to Repo
        let result;
        if (type === 'gold') {
            result = await goldCertificateRepository.create(customer_id, processedItems, {
                mode_of_payment, total, gst, gst_bill_number, total_tax
            }, status);
        } else if (type === 'silver') {
            result = await silverCertificateRepository.create(customer_id, processedItems, status);
        } else if (type === 'photo') {
            result = await photoCertificateRepository.create(customer_id, processedItems, {
                mode_of_payment, total, gst, gst_bill_number, total_tax
            }, status);
        } else {
            throw new Error('Invalid certificate type');
        }

        return result;
    }

    async getCertificate(type, id) {
        if (type === 'gold') return goldCertificateRepository.findById(id);
        if (type === 'silver') return silverCertificateRepository.findById(id);
        if (type === 'photo') return photoCertificateRepository.findById(id);
        throw new Error('Invalid certificate type');
    }

    async listCertificates(type, filters) {
        if (type === 'gold') return goldCertificateRepository.findAll(filters);
        if (type === 'silver') return silverCertificateRepository.findAll(filters);
        if (type === 'photo') return photoCertificateRepository.findAll(filters);
        throw new Error('Invalid certificate type');
    }

    async updateStatus(type, id, status) {
        if (type === 'gold') return goldCertificateRepository.updateStatus(id, status);
        if (type === 'silver') return silverCertificateRepository.updateStatus(id, status);
        if (type === 'photo') return photoCertificateRepository.updateStatus(id, status);
        throw new Error('Invalid certificate type');
    }

    async getCertificateByNo(id) {
        // Infer type from ID prefix
        let type;
        if (id.startsWith('GCR')) type = 'gold';
        else if (id.startsWith('SCR')) type = 'silver';
        else if (id.startsWith('PCR')) type = 'photo';
        else throw new Error('Invalid certificate ID format');

        return this.getCertificate(type, id);
    }

    // Add update item methods dispatching to repositories if needed

    async saveResults(type, id, data) {
        const { items, mode_of_payment, total, gst } = data;

        if (type === 'photo') {
            // Update items
            for (const item of items) {
                const updates = {};
                if (item.media !== undefined) updates.media_path = item.media;
                if (item.purity !== undefined) updates.purity = parseFloat(item.purity);

                await photoCertificateRepository.updateItem(id, item.id, updates);
            }
            // Update Parent
            if (mode_of_payment !== undefined || total !== undefined || gst !== undefined) {
                const cert = await photoCertificateRepository.findById(id);
                if (cert) {
                    await photoCertificateRepository.updatePayment(
                        id,
                        mode_of_payment || cert.mode_of_payment,
                        total !== undefined ? total : cert.total,
                        gst !== undefined ? gst : cert.gst
                    );
                }
            }
            return { success: true };
        } else if (type === 'gold' || type === 'silver') {
            // Forward to existing logic if needed or impl specific
            // For now assume only photo cert needs this via this service
            throw new Error('Update not implemented for this type via certificateService');
        }

        return { success: false, error: 'Unknown type' };
    }
}

module.exports = new CertificateService();
