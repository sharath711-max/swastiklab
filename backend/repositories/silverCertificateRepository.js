const BaseRepository = require('./baseRepository');
const { db, now, genId, getNextSequence, transaction } = require('../db/db');
const { formatTimestamp, generateAutoNumber } = require('../utils/autoNumber');

class SilverCertificateRepository {
    constructor() {
        this.db = db;
    }

    async create(customer_id, items, status = 'TODO') {
        return transaction(() => {
            const nowObj = new Date();
            const timestamp = nowObj.toISOString();
            const batchId = formatTimestamp(nowObj);
            const certId = genId('SCR');
            const parentAutoNumber = generateAutoNumber('SC', batchId, 1);

            // 1. Insert Parent
            this.db.prepare(`
                INSERT INTO silver_certificate (id, auto_number, customer_id, status, created, lastmodified)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(certId, parentAutoNumber, customer_id, status, timestamp, timestamp);

            // 2. Insert Items
            const insertedItems = [];
            let itemSeq = 1;
            for (const item of items) {
                const itemId = genId('SCI');
                const itemNumber = generateAutoNumber('SCI', batchId, itemSeq++);

                this.db.prepare(`
                    INSERT INTO silver_certificate_item (
                        id, silver_certificate_id, item_number, item_type,
                        gross_weight, test_weight, net_weight, purity,
                        item_total, returned, created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    itemId, certId, itemNumber, item.item_type || item.item_name || 'Item',
                    item.gross_weight, item.test_weight, item.net_weight, item.purity,
                    item.item_total,
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
                sc.*, 
                sc.created as created_at,
                c.name as customer_name,
                (SELECT COUNT(*) FROM silver_certificate_item WHERE silver_certificate_id = sc.id AND deletedon IS NULL) as item_count,
                (SELECT SUM(item_total) FROM silver_certificate_item WHERE silver_certificate_id = sc.id AND deletedon IS NULL) as total_amount
            FROM silver_certificate sc
            JOIN customer c ON sc.customer_id = c.id
            WHERE sc.deletedon IS NULL
        `;
        const params = [];
        if (filters.status) { query += " AND sc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND sc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR sc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM silver_certificate_item sci WHERE sci.silver_certificate_id = sc.id AND sci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        query += " ORDER BY sc.created DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }

    count(filters = {}) {
        let query = "SELECT COUNT(*) as total FROM silver_certificate sc JOIN customer c ON sc.customer_id = c.id WHERE sc.deletedon IS NULL";
        const params = [];
        if (filters.status) { query += " AND sc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND sc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR sc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM silver_certificate_item sci WHERE sci.silver_certificate_id = sc.id AND sci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        return this.db.prepare(query).get(...params).total;
    }

    findById(id) {
        const cert = this.db.prepare(`
            SELECT sc.*, sc.created as created_at, c.name as customer_name, c.phone as customer_phone
            FROM silver_certificate sc
            JOIN customer c ON sc.customer_id = c.id
            WHERE sc.id = ? AND sc.deletedon IS NULL
        `).get(id);

        if (!cert) return null;

        const items = this.db.prepare(`
            SELECT * FROM silver_certificate_item WHERE silver_certificate_id = ? AND deletedon IS NULL
        `).all(id);

        return { ...cert, items };
    }

    updateStatus(id, status) {
        return this.db.prepare(`
            UPDATE silver_certificate SET status = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(status, now(), id);
    }

    updateItem(certId, itemId, updates) {
        delete updates.item_number;
        if (Object.keys(updates).length === 0) return { changes: 0 };

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), itemId, certId];

        return this.db.prepare(`
            UPDATE silver_certificate_item SET ${fields}
            WHERE id = ? AND silver_certificate_id = ? AND deletedon IS NULL
        `).run(...values);
    }

    softDelete(id) {
        return transaction(() => {
            const timestamp = now();
            this.db.prepare("UPDATE silver_certificate SET deletedon = ?, lastmodified = ? WHERE id = ?").run(timestamp, timestamp, id);
            this.db.prepare("UPDATE silver_certificate_item SET deletedon = ? WHERE silver_certificate_id = ?").run(timestamp, id);
        })();
    }
}

module.exports = new SilverCertificateRepository();
