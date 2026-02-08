const BaseRepository = require('./baseRepository');
const { db, genId, now } = require('../db/db');

class CreditHistoryRepository extends BaseRepository {
    constructor() {
        super('credit_history');
    }

    create(data) {
        const { customer_id, amount, type, mode_of_payment = 'Cash', previous_balance = 0, description } = data;
        const id = genId('CRD');
        const timestamp = now();

        this.db.prepare(`
            INSERT INTO credit_history (id, customer_id, amount, type, mode_of_payment, previous_balance, description, createdon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, customer_id, amount, type, mode_of_payment, previous_balance, description, timestamp);

        return { id, ...data, createdon: timestamp };
    }

    findAll(filters = {}) {
        let query = `
            SELECT ch.*, c.name as customer_name, c.phone as customer_phone
            FROM credit_history ch
            JOIN customer c ON ch.customer_id = c.id
            WHERE ch.deletedon IS NULL
        `;
        const params = [];

        if (filters.customer_id) { query += " AND ch.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.start_date) { query += " AND DATE(ch.createdon) >= DATE(?)"; params.push(filters.start_date); }
        if (filters.end_date) { query += " AND DATE(ch.createdon) <= DATE(?)"; params.push(filters.end_date); }

        query += " ORDER BY ch.createdon DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }
}

module.exports = new CreditHistoryRepository();
