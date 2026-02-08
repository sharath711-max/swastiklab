const { db, now, genId, getNextSequence, transaction } = require('../db/db');
const { formatTimestamp, generateAutoNumber } = require('../utils/autoNumber');

class SilverTestRepository {
    constructor() {
        this.db = db;
    }

    async create(customer_id, items, status = 'TODO', mode_of_payment = 'Cash', totalAmount = 0) {
        return transaction(() => {
            const nowObj = new Date();
            const timestamp = nowObj.toISOString();
            const batchId = formatTimestamp(nowObj);
            const testId = genId('STS');
            const parentAutoNumber = generateAutoNumber('ST', batchId, 1);

            this.db.prepare(`
                INSERT INTO silver_test (id, auto_number, customer_id, status, mode_of_payment, total, created, lastmodified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(testId, parentAutoNumber, customer_id, status, mode_of_payment, totalAmount, timestamp, timestamp);

            const insertedItems = [];
            let itemSeq = 1;

            for (const item of items) {
                const itemId = genId('STI');
                const itemNumber = generateAutoNumber('STI', batchId, itemSeq++);

                // Handle payload from NewSilverTestModal: { item_name, weight, description, qty, returned }
                const itemType = item.item_type || item.item_name || item.item || 'Silver Sample';
                const sampleWeight = item.sample_weight || item.total_weight || item.weight || 0;

                this.db.prepare(`
                    INSERT INTO silver_test_item (
                        id, silver_test_id, item_number, item_type, sample_weight, test_weight, purity,
                        returned, created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    itemId, testId, itemNumber, itemType,
                    sampleWeight,
                    item.test_weight || 0,
                    item.purity || 0,
                    item.returned ? 1 : 0, timestamp
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
                st.*, 
                st.created as created_at,
                c.name as customer_name,
                (SELECT COUNT(*) FROM silver_test_item WHERE silver_test_id = st.id AND deletedon IS NULL) as item_count
            FROM silver_test st
            JOIN customer c ON st.customer_id = c.id
            WHERE st.deletedon IS NULL
        `;
        const params = [];
        if (filters.status) { query += " AND st.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND st.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR st.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM silver_test_item sti WHERE sti.silver_test_id = st.id AND sti.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }

        query += " ORDER BY st.created DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }

    count(filters = {}) {
        let query = "SELECT COUNT(*) as total FROM silver_test st JOIN customer c ON st.customer_id = c.id WHERE st.deletedon IS NULL";
        const params = [];
        if (filters.status) { query += " AND st.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND st.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR st.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM silver_test_item sti WHERE sti.silver_test_id = st.id AND sti.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        return this.db.prepare(query).get(...params).total;
    }

    findById(id) {
        const test = this.db.prepare(`
            SELECT st.*, st.created as created_at, c.name as customer_name, c.phone as customer_phone
            FROM silver_test st
            JOIN customer c ON st.customer_id = c.id
            WHERE st.id = ? AND st.deletedon IS NULL
        `).get(id);
        if (!test) return null;
        const items = this.db.prepare("SELECT * FROM silver_test_item WHERE silver_test_id = ? AND deletedon IS NULL").all(id);
        return { ...test, items };
    }

    updateStatus(id, status) {
        return this.db.prepare("UPDATE silver_test SET status = ?, lastmodified = ? WHERE id = ?").run(status, now(), id);
    }

    updateItem(testId, itemId, updates) {
        // Map frontend fields
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
        delete updates.item_number;

        if (Object.keys(updates).length === 0) return { changes: 0 };

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), itemId, testId];

        return this.db.prepare(`
            UPDATE silver_test_item SET ${fields}
            WHERE id = ? AND silver_test_id = ? AND deletedon IS NULL
        `).run(...values);
    }

    finalize(id, items, mode_of_payment, weightLossAmount) {
        return transaction(() => {
            const timestamp = now();

            // 1. Update Parent Status
            this.db.prepare(`
                UPDATE silver_test 
                SET status = 'DONE', mode_of_payment = ?, lastmodified = ? 
                WHERE id = ? AND deletedon IS NULL
            `).run(mode_of_payment, timestamp, id);

            // 2. Update Items
            const updateItemStmt = this.db.prepare(`
                UPDATE silver_test_item 
                SET purity = ?, returned = ? 
                WHERE id = ? AND silver_test_id = ? AND deletedon IS NULL
            `);

            for (const item of items) {
                updateItemStmt.run(item.purity, item.returned ? 1 : 0, item.id, id);
            }

            // 3. Record Weight Loss if applicable
            if (weightLossAmount > 0) {
                const wlhId = genId('WLH');
                const test = this.db.prepare("SELECT customer_id FROM silver_test WHERE id = ?").get(id);

                if (test) {
                    this.db.prepare(`
                        INSERT INTO weight_loss_history (id, customer_id, amount, mode_of_payment, reason, createdon)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(wlhId, test.customer_id, weightLossAmount, mode_of_payment, `Silver Test Finalization: ${id}`, timestamp);
                }
            }

            return { success: true };
        })();
    }

    updateResults(id, items, mode_of_payment, total) {
        return transaction(() => {
            const timestamp = now();

            // 1. Update items
            const updateItemStmt = this.db.prepare(`
                UPDATE silver_test_item 
                SET purity = ?, returned = ? 
                WHERE id = ? AND silver_test_id = ? AND deletedon IS NULL
            `);

            for (const item of items) {
                updateItemStmt.run(item.purity, item.returned ? 1 : 0, item.id, id);
            }

            // 2. Update parent transaction details if provided
            if (mode_of_payment !== undefined && total !== undefined) {
                this.db.prepare(`
                    UPDATE silver_test 
                    SET mode_of_payment = ?, total = ?, lastmodified = ? 
                    WHERE id = ? AND deletedon IS NULL
                `).run(mode_of_payment, total, timestamp, id);
            } else {
                this.db.prepare("UPDATE silver_test SET lastmodified = ? WHERE id = ?").run(timestamp, id);
            }

            return { success: true };
        })();
    }

    softDelete(id) {
        return transaction(() => {
            const timestamp = now();
            this.db.prepare("UPDATE silver_test SET deletedon = ?, lastmodified = ? WHERE id = ?").run(timestamp, timestamp, id);
            this.db.prepare("UPDATE silver_test_item SET deletedon = ? WHERE silver_test_id = ?").run(timestamp, id);
        })();
    }
}

module.exports = new SilverTestRepository();
