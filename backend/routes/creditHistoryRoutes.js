const express = require('express');
const router = express.Router();
const creditHistoryRepository = require('../repositories/creditHistoryRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/credit-history
router.get('/', (req, res) => {
    try {
        const { customer_id, start_date, end_date, limit, offset } = req.query;
        const entries = creditHistoryRepository.findAll({
            customer_id,
            start_date,
            end_date,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        res.json({
            success: true,
            data: entries
        });
    } catch (error) {
        console.error('Error fetching credit history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch credit history' });
    }
});

module.exports = router;
