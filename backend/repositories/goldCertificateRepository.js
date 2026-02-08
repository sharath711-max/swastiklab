const BaseRepository = require('./baseRepository');
const { db, now, genId, getNextSequence, transaction } = require('../db/db');
const { formatTimestamp, generateAutoNumber } = require('../utils/autoNumber');

class GoldCertificateRepository {
    constructor() {
        this.db = db;
    }

    async create(customer_id, items, data, status = 'TODO') {
        const { mode_of_payment = 'Cash', gst = 0, gst_bill_number = '', total_tax = 0, total = 0 } = data;

        return transaction(() => {
            const nowObj = new Date();
            const timestamp = nowObj.toISOString();
            const batchId = formatTimestamp(nowObj);
            const certId = genId('GCR');
            const parentAutoNumber = generateAutoNumber('GC', batchId, 1);

            // 1. Insert Parent
            this.db.prepare(`
                INSERT INTO gold_certificate (
                    id, auto_number, customer_id, status, mode_of_payment, total, 
                    gst, gst_bill_number, total_tax, created, lastmodified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                certId, parentAutoNumber, customer_id, status, mode_of_payment, total,
                gst ? 1 : 0, gst_bill_number, total_tax, timestamp, timestamp
            );

            // 2. Insert Items
            const insertedItems = [];
            let itemSeq = 1;
            for (const item of items) {
                const itemId = genId('GCI');
                const itemNumber = generateAutoNumber('GCI', batchId, itemSeq++);

                this.db.prepare(`
                    INSERT INTO gold_certificate_item (
                        id, gold_certificate_id, item_number, item_type,
                        gross_weight, test_weight, net_weight, purity,
                        rate_per_gram, fine_weight, item_total,
                        returned, created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    itemId, certId, itemNumber, item.item_type || item.item_name || 'Item',
                    item.gross_weight, item.test_weight, item.net_weight, item.purity,
                    item.rate_per_gram, item.fine_weight, item.item_total,
                    item.returned ? 1 : 0, timestamp
                );

                insertedItems.push({
                    id: itemId,
                    item_number: itemNumber,
                    ...item,
                    created: timestamp
                });
            }

            return { id: certId, auto_number: parentAutoNumber, items: insertedItems, created: timestamp };
        })();
    }

    findAll(filters = {}) {
        let query = `
            SELECT 
                gc.*, 
                gc.created as created_at,
                c.name as customer_name,
                (SELECT COUNT(*) FROM gold_certificate_item WHERE gold_certificate_id = gc.id AND deletedon IS NULL) as item_count
            FROM gold_certificate gc
            JOIN customer c ON gc.customer_id = c.id
            WHERE gc.deletedon IS NULL
        `;
        const params = [];
        if (filters.status) { query += " AND gc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND gc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR gc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM gold_certificate_item gci WHERE gci.gold_certificate_id = gc.id AND gci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        query += " ORDER BY gc.created DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }

    count(filters = {}) {
        let query = "SELECT COUNT(*) as total FROM gold_certificate gc JOIN customer c ON gc.customer_id = c.id WHERE gc.deletedon IS NULL";
        const params = [];
        if (filters.status) { query += " AND gc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND gc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR gc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM gold_certificate_item gci WHERE gci.gold_certificate_id = gc.id AND gci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        return this.db.prepare(query).get(...params).total;
    }

    findById(id) {
        const cert = this.db.prepare(`
            SELECT gc.*, gc.created as created_at, c.name as customer_name, c.phone as customer_phone
            FROM gold_certificate gc
            JOIN customer c ON gc.customer_id = c.id
            WHERE gc.id = ? AND gc.deletedon IS NULL
        `).get(id);

        if (!cert) return null;

        const items = this.db.prepare(`
            SELECT * FROM gold_certificate_item WHERE gold_certificate_id = ? AND deletedon IS NULL
        `).all(id);

        return { ...cert, items };
    }

    updateStatus(id, status) {
        return this.db.prepare(`
            UPDATE gold_certificate SET status = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(status, now(), id);
    }

    updateTotal(id, total, total_tax) {
        return this.db.prepare(`
            UPDATE gold_certificate SET total = ?, total_tax = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(total, total_tax || 0, now(), id);
    }

    updateItem(certId, itemId, updates) {
        delete updates.item_number; // Immutable

        if (Object.keys(updates).length === 0) return { changes: 0 };

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), itemId, certId];

        return this.db.prepare(`
            UPDATE gold_certificate_item SET ${fields}
            WHERE id = ? AND gold_certificate_id = ? AND deletedon IS NULL
        `).run(...values);
    }

    softDelete(id) {
        return transaction(() => {
            const timestamp = now();
            this.db.prepare("UPDATE gold_certificate SET deletedon = ?, lastmodified = ? WHERE id = ?").run(timestamp, timestamp, id);
            this.db.prepare("UPDATE gold_certificate_item SET deletedon = ? WHERE gold_certificate_id = ?").run(timestamp, id);
        })();
    }
}

module.exports = new GoldCertificateRepository();
