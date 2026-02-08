const BaseRepository = require('./baseRepository');
const { db, now, genId, getNextSequence, transaction } = require('../db/db');
const { formatTimestamp, generateAutoNumber } = require('../utils/autoNumber');

class GoldTestRepository {
    constructor() {
        this.db = db;
    }

    async create(customer_id, items, status = 'TODO', mode_of_payment = 'Cash', totalAmount = 0) {
        return transaction(() => {
            const nowObj = new Date();
            const timestamp = nowObj.toISOString();
            const batchId = formatTimestamp(nowObj);
            const testId = genId('GTS');
            const parentAutoNumber = generateAutoNumber('GT', batchId, 1);

            // 1. Insert parent
            this.db.prepare(`
                INSERT INTO gold_test (id, auto_number, customer_id, status, mode_of_payment, total, created, lastmodified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(testId, parentAutoNumber, customer_id, status, mode_of_payment, totalAmount, timestamp, timestamp);

            // 2. Insert items
            const insertedItems = [];
            let itemSeq = 1;
            for (const item of items) {
                const itemId = genId('GTI');
                const itemNumber = generateAutoNumber('GTI', batchId, itemSeq++);

                // Handle payload from NewGoldTestModal: { item_name, weight, ... }
                const itemType = item.item_type || item.item_name || item.item || 'Gold Sample';
                const sampleWeight = item.sample_weight || item.total_weight || item.weight || 0;

                // Matches schema: id, gold_test_id, item_number, item_type, sample_weight, test_weight, purity, returned, created, deletedon
                this.db.prepare(`
                    INSERT INTO gold_test_item (
                        id, gold_test_id, item_number, item_type, 
                        sample_weight, test_weight, purity, 
                        returned, created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    itemId, testId, itemNumber, itemType,
                    sampleWeight,
                    item.test_weight || 0,
                    item.purity || 0,
                    item.returned ? 1 : 0,
                    timestamp
                );

                insertedItems.push({
                    id: itemId,
                    item_number: itemNumber,
                    item_type: itemType,
                    sample_weight: sampleWeight,
                    test_weight: item.test_weight || 0,
                    purity: item.purity || 0,
                    returned: item.returned ? 1 : 0,
                    created: timestamp
                });
            }

            return { id: testId, auto_number: parentAutoNumber, items: insertedItems, created: timestamp };
        })();
    }

    findAll(filters = {}) {
        let query = `
            SELECT 
                gt.*, 
                gt.created as created_at, 
                c.name as customer_name,
                (SELECT COUNT(*) FROM gold_test_item WHERE gold_test_id = gt.id AND deletedon IS NULL) as item_count
            FROM gold_test gt
            JOIN customer c ON gt.customer_id = c.id
            WHERE gt.deletedon IS NULL
        `;
        const params = [];

        if (filters.status) {
            query += " AND gt.status = ?";
            params.push(filters.status);
        }
        if (filters.customer_id) {
            query += " AND gt.customer_id = ?";
            params.push(filters.customer_id);
        }
        if (filters.search) {
            // Updated search to support auto_number and child item_number
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR gt.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM gold_test_item gti WHERE gti.gold_test_id = gt.id AND gti.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }

        query += " ORDER BY gt.created DESC";
        if (filters.limit) {
            query += " LIMIT ? OFFSET ?";
            params.push(filters.limit, filters.offset || 0);
        }

        return this.db.prepare(query).all(...params);
    }

    count(filters = {}) {
        let query = "SELECT COUNT(*) as total FROM gold_test gt JOIN customer c ON gt.customer_id = c.id WHERE gt.deletedon IS NULL";
        const params = [];
        if (filters.status) { query += " AND gt.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND gt.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR gt.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM gold_test_item gti WHERE gti.gold_test_id = gt.id AND gti.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }

        return this.db.prepare(query).get(...params).total;
    }

    findById(id) {
        const test = this.db.prepare(`
            SELECT gt.*, gt.created as created_at, c.name as customer_name, c.phone as customer_phone
            FROM gold_test gt
            JOIN customer c ON gt.customer_id = c.id
            WHERE gt.id = ? AND gt.deletedon IS NULL
        `).get(id);

        if (!test) return null;

        const items = this.db.prepare(`
            SELECT * FROM gold_test_item WHERE gold_test_id = ? AND deletedon IS NULL
        `).all(id);

        return { ...test, items };
    }

    updateStatus(id, status) {
        return this.db.prepare(`
            UPDATE gold_test SET status = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(status, now(), id);
    }

    updateTotal(id, total) {
        return this.db.prepare(`
            UPDATE gold_test SET total = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(total, now(), id);
    }

    updateItem(testId, itemId, updates) {
        // Map frontend fields (total_weight -> sample_weight) if needed
        if (updates.total_weight) {
            updates.sample_weight = updates.total_weight;
            delete updates.total_weight;
        }
        if (updates.item) {
            updates.item_type = updates.item;
            delete updates.item;
        }

        // Remove unsupported fields
        delete updates.total;
        delete updates.certificate_required;
        delete updates.parent_id;
        delete updates.weight_loss;
        delete updates.certificate_number;

        // Explicitly prevent editing item_number
        delete updates.item_number;

        // Important: check if updates object becomes empty to avoid SQL error
        if (Object.keys(updates).length === 0) return { changes: 0 };

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), itemId, testId];

        return this.db.prepare(`
            UPDATE gold_test_item SET ${fields}
            WHERE id = ? AND gold_test_id = ? AND deletedon IS NULL
        `).run(...values);
    }

    finalize(id, items, mode_of_payment, weightLossAmount) {
        return transaction(() => {
            const timestamp = now();

            // 1. Update Parent Status
            this.db.prepare(`
                UPDATE gold_test 
                SET status = 'DONE', mode_of_payment = ?, lastmodified = ? 
                WHERE id = ? AND deletedon IS NULL
            `).run(mode_of_payment, timestamp, id);

            // 2. Update Items
            const updateItemStmt = this.db.prepare(`
                UPDATE gold_test_item 
                SET purity = ?, returned = ? 
                WHERE id = ? AND gold_test_id = ? AND deletedon IS NULL
            `);

            for (const item of items) {
                updateItemStmt.run(item.purity, item.returned ? 1 : 0, item.id, id);
            }

            // 3. Record Weight Loss if applicable
            if (weightLossAmount > 0) {
                const wlhId = genId('WLH');
                // Fetch customer_id to link history
                const test = this.db.prepare("SELECT customer_id FROM gold_test WHERE id = ?").get(id);

                if (test) {
                    this.db.prepare(`
                        INSERT INTO weight_loss_history (id, customer_id, amount, mode_of_payment, reason, createdon)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(wlhId, test.customer_id, weightLossAmount, mode_of_payment, `Gold Test Finalization: ${id}`, timestamp);
                }
            }

            return { success: true };
        })();
    }

    softDelete(id) {
        return transaction(() => {
            const timestamp = now();
            this.db.prepare("UPDATE gold_test SET deletedon = ?, lastmodified = ? WHERE id = ?").run(timestamp, timestamp, id);
            this.db.prepare("UPDATE gold_test_item SET deletedon = ? WHERE gold_test_id = ?").run(timestamp, id);
        })();
    }

    updateResults(id, items, mode_of_payment, total) {
        return transaction(() => {
            const timestamp = now();

            // 1. Update items
            const updateItemStmt = this.db.prepare(`
                UPDATE gold_test_item 
                SET purity = ?, returned = ? 
                WHERE id = ? AND gold_test_id = ? AND deletedon IS NULL
            `);

            for (const item of items) {
                updateItemStmt.run(item.purity, item.returned ? 1 : 0, item.id, id);
            }

            // 2. Update parent transaction details if provided
            if (mode_of_payment !== undefined && total !== undefined) {
                this.db.prepare(`
                    UPDATE gold_test 
                    SET mode_of_payment = ?, total = ?, lastmodified = ? 
                    WHERE id = ? AND deletedon IS NULL
                `).run(mode_of_payment, total, timestamp, id);
            } else {
                // Touch parent only
                this.db.prepare("UPDATE gold_test SET lastmodified = ? WHERE id = ?").run(timestamp, id);
            }

            return { success: true };
        })();
    }

    getStats(startDate, endDate) {
        let query = `
            SELECT 
                COUNT(*) as total_tests,
                SUM(gt.total) as total_amount,
                SUM((SELECT SUM(test_weight) FROM gold_test_item WHERE gold_test_id = gt.id AND deletedon IS NULL)) as total_gold_weight,
                AVG((SELECT AVG(purity) FROM gold_test_item WHERE gold_test_id = gt.id AND deletedon IS NULL)) as avg_purity,
                COUNT(CASE WHEN gt.status = 'TODO' THEN 1 END) as pending,
                COUNT(CASE WHEN gt.status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                COUNT(CASE WHEN gt.status = 'DONE' THEN 1 END) as completed
            FROM gold_test gt
            WHERE gt.deletedon IS NULL
        `;
        const params = [];
        if (startDate) { query += " AND DATE(gt.created) >= DATE(?)"; params.push(startDate); }
        if (endDate) { query += " AND DATE(gt.created) <= DATE(?)"; params.push(endDate); }

        return this.db.prepare(query).get(...params);
    }
}

module.exports = new GoldTestRepository();
