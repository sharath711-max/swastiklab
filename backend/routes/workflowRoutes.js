const express = require('express');
const router = express.Router();
const workflowService = require('../services/workflowService');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/workflow
router.get('/', async (req, res) => {
    try {
        const items = await workflowService.getAllItems();
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/workflow/:type/:id/status
router.patch('/:type/:id/status', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { status } = req.body;
        await workflowService.updateStatus(type, id, status);
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
