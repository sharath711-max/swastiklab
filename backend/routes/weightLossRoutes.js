const express = require('express');
const router = express.Router();
const { db, genId, now } = require('../db/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

/**
 * GET /api/weight_loss_ledger
 * Get all weight loss ledger entries (with optional customer filter)
 * Query params: customer_id, start_date, end_date, limit, offset
 */
const weightLossHistoryRepository = require('../repositories/weightLossHistoryRepository');

// GET /api/weight_loss_ledger
router.get('/', (req, res) => {
    try {
        const { customer_id, start_date, end_date, limit, offset } = req.query;
        const entries = weightLossHistoryRepository.findAll({
            customer_id,
            start_date,
            end_date,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        // Count not implemented in repo yet, simple response for now or assume pagination handled by frontend scrolling
        // Or adding count method to repo if needed.

        res.json({
            success: true,
            data: entries,
            // pagination omitted for brevity in this refactor, strictly adhering to simple repo pattern
        });
    } catch (error) {
        console.error('Error fetching weight loss ledger:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch weight loss ledger entries' });
    }
});

// POST /api/weight_loss_ledger
router.post('/', (req, res) => {
    try {
        const { customer_id, description, weight_loss, date, mode_of_payment } = req.body;

        if (!customer_id || weight_loss === undefined) {
            return res.status(400).json({ success: false, error: 'customer_id and weight_loss are required' });
        }

        const newEntry = weightLossHistoryRepository.create({
            customer_id,
            amount: parseFloat(weight_loss),
            reason: description, // Mapping description to reason
            mode_of_payment: mode_of_payment || 'Cash'
        });

        res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
        console.error('Error creating weight loss entry:', error);
        res.status(500).json({ success: false, error: 'Failed to create weight loss entry' });
    }
});

/**
 * DELETE /api/weight_loss_ledger/:id
 * Delete weight loss ledger entry
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const stmt = db.prepare('DELETE FROM weight_loss_ledger WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Entry not found' });
        }

        res.json({ success: true, message: 'Weight loss entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting weight loss entry:', error);
        res.status(500).json({ success: false, error: 'Failed to delete weight loss entry' });
    }
});

module.exports = router;
