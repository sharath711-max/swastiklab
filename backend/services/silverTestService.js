const silverTestRepository = require('../repositories/silverTestRepository');
const customerRepository = require('../repositories/customerRepository');
const billingService = require('./billingService');


class SilverTestService {
    calculateSilverValues(testWeight, purity) {
        // Business logic as per distilled rules: Testing is a flat 30.00 per item? 
        // Or dependent on silver? 
        // For now, assuming parity with Gold until instructed otherwise, but billingService suggests otherwise.
        const bill = billingService.calculateTestBill(1); // 1 item
        return {
            total: bill.netAmount
        };
    }

    async createTest(data) {
        const { customer_id, items, status, mode_of_payment = 'Cash' } = data;
        const customer = customerRepository.findById(customer_id);
        if (!customer) throw new Error('Customer not found');

        let totalAmount = 0;
        const processedItems = items.map(item => {
            const bill = billingService.calculateTestBill(1);
            totalAmount += bill.netAmount;
            return {
                ...item,
                item_type: item.item || item.item_type || 'Silver Sample',
                sample_weight: Math.round((parseFloat(item.total_weight || item.sample_weight) || 0) * 1000) / 1000,
                test_weight: Math.round((parseFloat(item.test_weight) || 0) * 1000) / 1000,
                purity: Math.round((parseFloat(item.purity) || 0) * 100) / 100,
            };
        });

        // Pass totalAmount and mode_of_payment
        const result = await silverTestRepository.create(customer_id, processedItems, status, mode_of_payment, totalAmount);

        return result;
    }

    async getTests(filters) {
        const tests = silverTestRepository.findAll(filters);
        const total = silverTestRepository.count(filters);
        return { tests, pagination: { total, pages: Math.ceil(total / (filters.limit || 20)) } };
    }

    async getTestDetails(id) {
        const test = silverTestRepository.findById(id);
        if (!test) throw new Error('Silver test not found');
        return test;
    }

    async updateStatus(id, status) {
        const result = silverTestRepository.updateStatus(id, status);
        if (result.changes === 0) throw new Error('Silver test not found');
        return true;
    }

    async updateItem(testId, itemId, updates) {
        // If weights or purity changed, maybe recalculate total?
        // Silver usually has a fixed per-item cost, so maybe not sensitive to weight changes for *Price*.

        const result = silverTestRepository.updateItem(testId, itemId, updates);
        if (result.changes === 0) throw new Error('Item not found');
        return true;
    }

    async finalizeTest(id, data) {
        const { items, mode_of_payment, weight_loss } = data;
        return silverTestRepository.finalize(id, items, mode_of_payment, weight_loss || 0);
    }

    async saveTestResults(id, data) {
        const { items, mode_of_payment, total } = data;

        // Validate items
        items.forEach(item => {
            const purity = parseFloat(item.purity);
            if (isNaN(purity) || purity < 0 || purity > 100) {
                throw new Error(`Invalid purity for item ${item.item_no}: ${item.purity}`);
            }
        });

        return silverTestRepository.updateResults(id, items, mode_of_payment, total);
    }

    async deleteTest(id) {
        const test = silverTestRepository.findById(id);
        if (!test) throw new Error('Silver test not found');
        if (test.status === 'IN_PROGRESS') throw new Error('Cannot delete test in progress');
        return silverTestRepository.softDelete(id);
    }
}

module.exports = new SilverTestService();
