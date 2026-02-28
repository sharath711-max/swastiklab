import Decimal from 'decimal.js';

/**
 * Gold Item Calculation Logic (Frontend Mirror of Backend Service)
 * Always maintains consistent logic with CertificateCalculationService in backend.
 */
export const calculateGoldItem = (input) => {
    const {
        gross_weight = 0,
        test_weight = 0,
        purity = 0,
        rate_per_gram = 0,
        is_returned = false
    } = input;

    try {
        const gross = new Decimal(gross_weight || 0);
        const test = new Decimal(test_weight || 0);
        const purityDec = new Decimal(purity || 0);
        const rate = new Decimal(rate_per_gram || 0);

        // Check for basic validation to avoid weird displays
        if (gross.lte(0) || purityDec.lt(0) || purityDec.gt(100) || test.lt(0) || test.gt(gross)) {
            return {
                net_weight: 0,
                fine_weight: 0,
                item_total: 0,
                isValid: false
            };
        }

        // Net weight = Gross - Test (rounded to 3 decimal places)
        const net_weight = gross.minus(test)
            .toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

        // Fine weight = Net Weight × (Purity / 100) (rounded to 3 decimal places)
        const fine_weight = net_weight.times(purityDec.dividedBy(100))
            .toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

        // Item total = Fine Weight × Rate per Gram (rounded to 2 decimal places)
        let item_total = new Decimal(0);
        if (!is_returned) {
            item_total = fine_weight.times(rate)
                .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        }

        return {
            net_weight: net_weight.toNumber(),
            fine_weight: fine_weight.toNumber(),
            item_total: item_total.toNumber(),
            isValid: true
        };
    } catch (e) {
        return {
            net_weight: 0,
            fine_weight: 0,
            item_total: 0,
            isValid: false
        };
    }
};
