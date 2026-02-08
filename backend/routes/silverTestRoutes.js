const express = require('express');
const router = express.Router();
const silverTestService = require('../services/silverTestService');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', async (req, res) => {
    try {
        const result = await silverTestService.createTest(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, customer_id, search } = req.query;
        const filters = {
            page: parseInt(page),
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            status, customer_id, search
        };
        const result = await silverTestService.getTests(filters);
        res.json({ success: true, data: result.tests, pagination: { ...result.pagination, page: parseInt(page) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/silver-tests/:id
router.get('/:id', async (req, res) => {
    try {
        const test = await silverTestService.getTestDetails(req.params.id);
        res.json({ success: true, data: test });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// POST /api/silver-tests/:id/finalize
router.post('/:id/finalize', async (req, res) => {
    try {
        const result = await silverTestService.finalizeTest(req.params.id, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/silver-tests/:id/results
router.post('/:id/results', async (req, res) => {
    try {
        const result = await silverTestService.saveTestResults(req.params.id, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT /api/silver-tests/:id/items/:itemId
router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const result = await silverTestService.updateItem(id, itemId, req.body);
        res.json({ success: true, message: 'Item updated successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
