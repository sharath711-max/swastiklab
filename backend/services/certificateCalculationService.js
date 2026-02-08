const Decimal = require('decimal.js');

class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class CertificateCalculationService {
    /**
     * Calculate gold item values with financial-grade precision
     * @param {Object} input - Raw input from client
     * @returns {Object} - Calculated values (authoritative)
     */
    static calculateGoldItem(input) {
        const {
            gross_weight,
            test_weight = 0,
            purity,
            rate_per_gram,
            is_returned = false,
            item_name = 'Unknown'
        } = input;

        // 1. VALIDATION (non-negotiable)
        const errors = [];

        if (!gross_weight || gross_weight <= 0) {
            errors.push('Gross weight must be > 0');
        }

        if (test_weight < 0) {
            errors.push('Test weight cannot be negative');
        }

        if (new Decimal(test_weight).gt(new Decimal(gross_weight))) {
            errors.push('Test weight cannot exceed gross weight');
        }

        if (!purity || purity < 0 || purity > 100) {
            errors.push('Purity must be between 0 and 100%');
        }

        if (!rate_per_gram || rate_per_gram <= 0) {
            errors.push('Rate per gram must be > 0');
        }

        if (errors.length > 0) {
            throw new ValidationError('Gold item validation failed', errors);
        }

        // 2. CALCULATION (authoritative, using Decimal.js)
        const gross = new Decimal(gross_weight);
        const test = new Decimal(test_weight);
        const purityDec = new Decimal(purity);
        const rate = new Decimal(rate_per_gram);

        // Net weight = Gross - Test (to 3 decimal places)
        const net_weight = gross.minus(test)
            .toDecimalPlaces(3)
            .toNumber();

        // Fine weight = Net weight × (Purity/100) (to 3 decimal places)
        const fine_weight = gross
            .minus(test)
            .times(purityDec.dividedBy(100))
            .toDecimalPlaces(3)
            .toNumber();

        // Item total = Fine weight × Rate per gram (to 2 decimal places)
        // Returned items have ZERO value
        const item_total = is_returned ? 0 : gross
            .minus(test)
            .times(purityDec.dividedBy(100))
            .times(rate)
            .toDecimalPlaces(2)
            .toNumber();

        // 3. RETURN AUTHORITATIVE VALUES
        return {
            // Raw inputs (validated)
            gross_weight: gross.toNumber(),
            test_weight: test.toNumber(),
            purity: purityDec.toNumber(),
            rate_per_gram: rate.toNumber(),

            // Calculated outputs (authoritative)
            net_weight,
            fine_weight,
            item_total,

            // Metadata
            is_returned: Boolean(is_returned),
            item_name,
            calculated_at: new Date().toISOString(),
            calculation_version: '1.0.0'
        };
    }

    /**
     * Update parent certificate roll-up totals
     * Salesforce-style Master-Detail roll-up
     */
    static async updateCertificateTotals(certificateId, db) {
        // Determine table based on ID prefix
        let tableName = 'gold_certificate';
        let itemTable = 'gold_certificate_item';
        let idPrefix = certificateId.substring(0, 3);

        if (idPrefix === 'SCR') {
            tableName = 'silver_certificate';
            itemTable = 'silver_certificate_item';
        } else if (idPrefix === 'PCR') {
            tableName = 'photo_certificate';
            itemTable = 'photo_certificate_item';
        }

        // Get all non-returned items for this certificate
        const items = db.prepare(`
            SELECT 
                COUNT(*) as item_count,
                COALESCE(SUM(item_total), 0) as grand_total,
                COALESCE(SUM(net_weight), 0) as total_net_weight,
                COALESCE(SUM(fine_weight), 0) as total_fine_weight
            FROM ${itemTable}
            WHERE 
                ${tableName}_id = ? 
                AND deletedon IS NULL 
                AND returned = 0
        `).get(certificateId);

        // Update parent certificate
        // Note: gold_certificate only has 'total' column for amount.
        // silver_certificate does NOT have 'total' column.
        // photo_certificate has 'total'.
        if (idPrefix === 'SCR') {
            db.prepare(`
                UPDATE ${tableName} 
                SET lastmodified = ?
                WHERE id = ?
            `).run(
                new Date().toISOString(),
                certificateId
            );
        } else {
            db.prepare(`
                UPDATE ${tableName} 
                SET 
                    total = ?,
                    lastmodified = ?
                WHERE id = ?
            `).run(
                items.grand_total,
                new Date().toISOString(),
                certificateId
            );
        }

        return {
            grand_total: items.grand_total,
            item_count: items.item_count,
            total_net_weight: items.total_net_weight,
            total_fine_weight: items.total_fine_weight
        };
    }
}

module.exports = CertificateCalculationService;
module.exports.ValidationError = ValidationError;
