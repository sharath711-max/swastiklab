const goldTestRepository = require('../repositories/goldTestRepository');
const customerRepository = require('../repositories/customerRepository');


class GoldTestService {
    calculateGoldValues(testWeight, purity) {
        // Business logic as per distilled rules: Testing is a flat 30.00 per item
        return {
            total: 30.00
        };
    }

    async createTest(data) {
        const { customer_id, items, status, mode_of_payment = 'Cash' } = data;

        // 1. Verify customer
        const customer = customerRepository.findById(customer_id);
        if (!customer) throw new Error('Customer not found');

        // 2. Process items and validate
        let totalAmount = 0;
        const processedItems = items.map(item => {
            // Map inputs
            const totalWeight = parseFloat(item.total_weight || item.weight || 0);
            const sampleWeight = parseFloat(item.sample_weight || 0);
            let testWeight = 0;

            // Sample Logic Rules
            if (sampleWeight > 0) {
                testWeight = sampleWeight;
            } else {
                testWeight = totalWeight;
            }

            // Validations
            if (totalWeight <= 0) throw new Error(`Invalid total weight: ${totalWeight}`);
            if (sampleWeight < 0) throw new Error(`Invalid sample weight: ${sampleWeight}`);
            if (sampleWeight > totalWeight) throw new Error(`Sample weight (${sampleWeight}) cannot exceed total weight (${totalWeight})`);
            if (testWeight <= 0) throw new Error('Test weight must be greater than 0');

            const purity = parseFloat(item.purity || 0);
            if (purity < 0 || purity > 100) throw new Error(`Invalid purity: ${purity}`);

            const calcs = this.calculateGoldValues(testWeight, purity);
            totalAmount += calcs.total;

            return {
                ...item,
                item_type: item.item_type || item.item_name || item.name || item.item || 'Gold Sample',
                sample_weight: totalWeight, // DB schema uses sample_weight as the main weight? Waittt. 
                // DB Schema Definition:
                // sample_weight REAL NOT NULL CHECK (sample_weight > 0), -- This seems to be the TOTAL weight received based on previous files??
                // test_weight REAL NOT NULL CHECK (test_weight >= 0 AND test_weight <= sample_weight),
                // Ah, looking at repository: 
                // values are: itemId, testId, itemNo, itemType, sampleWeight, item.test_weight, ...
                // And sampleWeight variable in repo was: item.sample_weight || item.total_weight || item.weight

                // SO: Database 'sample_weight' column = Total Receiving Weight. 
                // Database 'test_weight' column = Weight used for testing.
                // This naming is slightly confusing in DB but I must stick to it.
                // Let's align: 
                // DB.sample_weight = Input.total_weight
                // DB.test_weight = Input.test_weight (calculated above)

                sample_weight: totalWeight,
                test_weight: testWeight,
                purity: purity,
                total: calcs.total
            };
        });

        // 3. Save to repository with new fields
        const result = await goldTestRepository.create(customer_id, processedItems, status, mode_of_payment, totalAmount);

        return result;
    }

    async getTests(filters) {
        const tests = goldTestRepository.findAll(filters);
        const total = goldTestRepository.count(filters);
        return {
            tests,
            pagination: {
                total,
                pages: Math.ceil(total / (filters.limit || 20))
            }
        };
    }

    async getTestDetails(id) {
        const test = goldTestRepository.findById(id);
        if (!test) throw new Error('Gold test not found');
        return test;
    }

    async updateStatus(id, status) {
        const result = goldTestRepository.updateStatus(id, status);
        if (result.changes === 0) throw new Error('Gold test not found');
        return true;
    }

    async finalizeTest(id, data) {
        const { items, mode_of_payment, weight_loss } = data;
        return goldTestRepository.finalize(id, items, mode_of_payment, weight_loss || 0);
    }

    async updateItem(testId, itemId, updates) {
        // If weights or purity changed, recalculate
        if (updates.test_weight !== undefined || updates.purity !== undefined) {
            const currentItem = goldTestRepository.findById(testId).items.find(i => i.id === itemId);
            const w = updates.test_weight || currentItem.test_weight;
            const p = updates.purity || currentItem.purity;
            const calcs = this.calculateGoldValues(w, p);
            updates.total = calcs.total;
        }

        const result = goldTestRepository.updateItem(testId, itemId, updates);
        if (result.changes === 0) throw new Error('Item not found');
        return true;
    }

    async deleteTest(id) {
        const test = goldTestRepository.findById(id);
        if (!test) throw new Error('Gold test not found');
        if (test.status === 'IN_PROGRESS') throw new Error('Cannot delete test in progress');

        return goldTestRepository.softDelete(id);
    }

    async getSummaryStats(startDate, endDate) {
        const summary = goldTestRepository.getStats(startDate, endDate);
        // Add trends logic here if needed (e.g. daily breakdown)
        return summary;
    }

    async saveTestResults(id, data) {
        const { items, mode_of_payment, total } = data;

        // Validate items
        items.forEach(item => {
            const purity = parseFloat(item.purity);
            if (isNaN(purity) || purity < 0 || purity > 100) {
                throw new Error(`Invalid purity for item ${item.item_no}: ${item.purity}`);
            }
            if (item.returned === undefined || item.returned === null) {
                throw new Error(`Returned status required for item ${item.item_no}`);
            }
        });

        // Validate payment fields if provided (Required for Lab Phase-2)
        if (mode_of_payment && !['Cash', 'UPI', 'Balance'].includes(mode_of_payment)) {
            throw new Error('Invalid mode of payment');
        }
        if (total !== undefined && (isNaN(parseFloat(total)) || parseFloat(total) < 0)) {
            throw new Error('Invalid total amount');
        }

        return goldTestRepository.updateResults(id, items, mode_of_payment, total);
    }
}

module.exports = new GoldTestService();
