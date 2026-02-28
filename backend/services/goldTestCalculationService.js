const Decimal = require('decimal.js');

class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class GoldTestCalculationService {
    /**
     * Testing charge per item (can be moved to globals later)
     */
    static TESTING_CHARGE = 0.00;

    /**
     * Calculate individual gold test item values
     */
    static calculateItem(input) {
        const {
            gross_weight,
            test_weight = 0,
            purity = 0,
            returned = false,
            item_type = 'Gold'
        } = input;

        // 1. VALIDATION
        const errors = [];
        if (!gross_weight || gross_weight <= 0) {
            errors.push('Gross weight must be > 0');
        }
        if (test_weight < 0) {
            errors.push('Test weight cannot be negative');
        }
        if (new Decimal(test_weight || 0).gt(new Decimal(gross_weight || 0))) {
            errors.push('Test weight cannot exceed gross weight');
        }
        if (purity < 0 || purity > 100) {
            errors.push('Purity must be between 0 and 100%');
        }

        if (errors.length > 0) {
            throw new ValidationError('Gold test item validation failed', errors);
        }

        // 2. CALCULATION
        const gross = new Decimal(gross_weight);
        const test = new Decimal(test_weight);
        const pur = new Decimal(purity);

        // Net Weight = Gross - Test (3 decimal places)
        const net_weight = gross.minus(test).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

        // Fine Weight = Net Weight * (Purity / 100) (3 decimal places)
        const fine_weight = net_weight.times(pur.dividedBy(100)).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

        // Item Total
        const item_total = returned ? new Decimal(0) : new Decimal(this.TESTING_CHARGE);

        return {
            gross_weight: gross.toNumber(),
            test_weight: test.toNumber(),
            net_weight: net_weight.toNumber(),
            purity: pur.toNumber(),
            fine_weight: fine_weight.toNumber(),
            item_total: item_total.toNumber(),
            returned: Boolean(returned),
            item_type
        };
    }

    /**
     * Update parent roll-up totals
     */
    static updateParentTotals(testId, db) {
        // 1. Check Immutability
        const parent = db.prepare('SELECT status FROM gold_test WHERE id = ?').get(testId);
        if (!parent) return;

        if (parent.status === 'DONE') {
            return; // Immutable
        }

        // Amount is manually entered by the user in Tested status, do not overwrite 'total' here
        return 0;
    }
}

module.exports = GoldTestCalculationService;
module.exports.ValidationError = ValidationError;
