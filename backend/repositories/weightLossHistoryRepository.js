const { db, now, genId, transaction } = require('../db/db');

class WeightLossHistoryRepository {
    constructor() {
        this.db = db;
    }

    /**
     * Append a new weight loss record
     */
    async create(data) {
        const { customer_id, amount, reason } = data;

        return transaction(() => {
            const id = genId('WLH');
            const timestamp = now();

            this.db.prepare(`
                INSERT INTO weight_loss_history (id, customer_id, amount, reason, created)
                VALUES (?, ?, ?, ?, ?)
            `).run(id, customer_id, amount, reason, timestamp);

            return { id, customer_id, amount, reason, created: timestamp };
        })();
    }

    /**
     * Find history for a specific customer
     */
    findByCustomerId(customer_id, limit = 50, offset = 0) {
        return this.db.prepare(`
            SELECT * FROM weight_loss_history 
            WHERE customer_id = ? 
            ORDER BY created DESC 
            LIMIT ? OFFSET ?
        `).all(customer_id, limit, offset);
    }

    /**
     * Count history records for a customer
     */
    countByCustomerId(customer_id) {
        return this.db.prepare(`
            SELECT COUNT(*) as total FROM weight_loss_history WHERE customer_id = ?
        `).get(customer_id).total;
    }

    /**
     * Find a single record (Read-Only)
     */
    findById(id) {
        return this.db.prepare(`SELECT * FROM weight_loss_history WHERE id = ?`).get(id);
    }
}

module.exports = new WeightLossHistoryRepository();
