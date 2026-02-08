const BaseRepository = require('./baseRepository');
const { db, now, genId, getNextSequence, transaction } = require('../db/db');
const { formatTimestamp, generateAutoNumber } = require('../utils/autoNumber');

class PhotoCertificateRepository {
    constructor() {
        this.db = db;
    }

    async create(customer_id, items, data, status = 'TODO') {
        const { mode_of_payment = 'Cash', gst = 0, gst_bill_number = '', total_tax = 0, total = 0 } = data;

        return transaction(() => {
            const nowObj = new Date();
            const timestamp = nowObj.toISOString();
            const batchId = formatTimestamp(nowObj);
            const certId = genId('PCR');
            const parentAutoNumber = generateAutoNumber('PC', batchId, 1);

            // 1. Insert Parent
            this.db.prepare(`
                INSERT INTO photo_certificate (
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
                const itemId = genId('PCI');
                const itemNumber = generateAutoNumber('PCI', batchId, itemSeq++);
                const certNum = item.item_no || `${itemSeq - 1}`;

                this.db.prepare(`
                    INSERT INTO photo_certificate_item (
                        id, item_number, photo_certificate_id, certificate_number,
                        name, item_type, gross_weight, purity, media_path, created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    itemId,
                    itemNumber,
                    certId,
                    certNum,
                    item.name,
                    item.item_type || item.item_name || 'Item',
                    item.gross_weight || item.weight || null,
                    item.purity || null,
                    item.media_path || null,
                    timestamp
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
                pc.*, 
                pc.created as created_at,
                c.name as customer_name,
                (SELECT COUNT(*) FROM photo_certificate_item WHERE photo_certificate_id = pc.id AND deletedon IS NULL) as item_count
            FROM photo_certificate pc
            JOIN customer c ON pc.customer_id = c.id
            WHERE pc.deletedon IS NULL
        `;
        const params = [];
        if (filters.status) { query += " AND pc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND pc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR pc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM photo_certificate_item pci WHERE pci.photo_certificate_id = pc.id AND pci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        query += " ORDER BY pc.created DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }

    count(filters = {}) {
        let query = "SELECT COUNT(*) as total FROM photo_certificate pc JOIN customer c ON pc.customer_id = c.id WHERE pc.deletedon IS NULL";
        const params = [];
        if (filters.status) { query += " AND pc.status = ?"; params.push(filters.status); }
        if (filters.customer_id) { query += " AND pc.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.search) {
            query += ` AND (
                c.name LIKE ? 
                OR c.phone LIKE ? 
                OR pc.auto_number LIKE ? 
                OR EXISTS (SELECT 1 FROM photo_certificate_item pci WHERE pci.photo_certificate_id = pc.id AND pci.item_number LIKE ?)
            )`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        return this.db.prepare(query).get(...params).total;
    }

    findById(id) {
        const cert = this.db.prepare(`
            SELECT pc.*, pc.created as created_at, c.name as customer_name, c.phone as customer_phone
            FROM photo_certificate pc
            JOIN customer c ON pc.customer_id = c.id
            WHERE pc.id = ? AND pc.deletedon IS NULL
        `).get(id);

        if (!cert) return null;

        const items = this.db.prepare(`
            SELECT *, media_path as media FROM photo_certificate_item WHERE photo_certificate_id = ? AND deletedon IS NULL
        `).all(id);

        return { ...cert, items };
    }

    updateStatus(id, status) {
        return this.db.prepare(`
            UPDATE photo_certificate SET status = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL
        `).run(status, now(), id);
    }

    softDelete(id) {
        return transaction(() => {
            const timestamp = now();
            this.db.prepare("UPDATE photo_certificate SET deletedon = ?, lastmodified = ? WHERE id = ?").run(timestamp, timestamp, id);
            this.db.prepare("UPDATE photo_certificate_item SET deletedon = ? WHERE photo_certificate_id = ?").run(timestamp, id);
        })();
    }

    updateItem(certId, itemId, updates) {
        if (Object.keys(updates).length === 0) return { changes: 0 };
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), itemId, certId];
        return this.db.prepare(`UPDATE photo_certificate_item SET ${fields} WHERE id = ? AND photo_certificate_id = ? AND deletedon IS NULL`).run(...values);
    }

    updatePayment(certId, mode_of_payment, total, gst) {
        return this.db.prepare(`UPDATE photo_certificate SET mode_of_payment = ?, total = ?, gst = ?, lastmodified = ? WHERE id = ? AND deletedon IS NULL`).run(mode_of_payment, total, gst ? 1 : 0, now(), certId);
    }
}

module.exports = new PhotoCertificateRepository();
