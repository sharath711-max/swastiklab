const express = require('express');
const router = express.Router();
const { db, now } = require('../db/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

/**
 * GET /api/cash_register
 * Get all cash register entries (with date range filter)
 * Query params: start_date, end_date, limit, offset
 */
router.get('/', (req, res) => {
    try {
        const { start_date, end_date, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM cash_register WHERE 1=1';
        const params = [];

        if (start_date) {
            query += ' AND DATE(date) >= DATE(?)';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND DATE(date) <= DATE(?)';
            params.push(end_date);
        }

        query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const entries = db.prepare(query).all(...params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM cash_register WHERE 1=1';
        const countParams = [];
        if (start_date) {
            countQuery += ' AND DATE(date) >= DATE(?)';
            countParams.push(start_date)
        }
        if (end_date) {
            countQuery += ' AND DATE(date) <= DATE(?)';
            countParams.push(end_date)
        }

        const countResult = db.prepare(countQuery).get(...countParams);

        res.json({
            success: true,
            data: entries,
            pagination: {
                total: countResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching cash register entries:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cash register entries' });
    }
});

/**
 * POST /api/cash_register
 * Create new cash register entry
 */
router.post('/', (req, res) => {
    try {
        const { date, type, amount, description } = req.body;

        // Validate required fields
        if (!date || !type || !amount) {
            return res.status(400).json({ success: false, error: 'date, type and amount are required' });
        }

        if (!['IN', 'OUT'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Type must be IN or OUT' });
        }

        const timestamp = now();

        // Insert cash register entry
        const stmt = db.prepare(`
      INSERT INTO cash_register (date, type, amount, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

        const info = stmt.run(
            date,
            type,
            parseFloat(amount),
            description || '',
            timestamp
        );

        // Get the created entry
        const newEntry = db.prepare('SELECT * FROM cash_register WHERE id = ?').get(info.lastInsertRowid);

        res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
        console.error('Error creating cash register entry:', error);
        res.status(500).json({ success: false, error: 'Failed to create cash register entry' });
    }
});

/**
 * DELETE /api/cash_register/:id
 * Delete cash register entry
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const stmt = db.prepare('DELETE FROM cash_register WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Entry not found' });
        }

        res.json({ success: true, message: 'Cash register entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting cash register entry:', error);
        res.status(500).json({ success: false, error: 'Failed to delete cash register entry' });
    }
});

module.exports = router;
