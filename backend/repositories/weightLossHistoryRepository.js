const BaseRepository = require('./baseRepository');
const { db, genId, now } = require('../db/db');

class WeightLossHistoryRepository extends BaseRepository {
    constructor() {
        super('weight_loss_history');
    }

    create(data) {
        const { customer_id, amount, mode_of_payment = 'Cash', reason } = data;
        const id = genId('WLH');
        const timestamp = now();

        this.db.prepare(`
            INSERT INTO weight_loss_history (id, customer_id, amount, mode_of_payment, reason, createdon)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, customer_id, amount, mode_of_payment, reason, timestamp);

        return { id, ...data, createdon: timestamp };
    }

    findAll(filters = {}) {
        let query = `
            SELECT wlh.*, c.name as customer_name, c.phone as customer_phone
            FROM weight_loss_history wlh
            JOIN customer c ON wlh.customer_id = c.id
            WHERE wlh.deletedon IS NULL
        `;
        const params = [];

        if (filters.customer_id) { query += " AND wlh.customer_id = ?"; params.push(filters.customer_id); }
        if (filters.start_date) { query += " AND DATE(wlh.createdon) >= DATE(?)"; params.push(filters.start_date); }
        if (filters.end_date) { query += " AND DATE(wlh.createdon) <= DATE(?)"; params.push(filters.end_date); }

        query += " ORDER BY wlh.createdon DESC";
        if (filters.limit) { query += " LIMIT ? OFFSET ?"; params.push(filters.limit, filters.offset || 0); }

        return this.db.prepare(query).all(...params);
    }
}

module.exports = new WeightLossHistoryRepository();
