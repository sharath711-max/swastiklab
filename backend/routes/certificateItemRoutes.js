const express = require('express');
const router = express.Router({ mergeParams: true }); // Access parent params
const GoldCertificateItemRepository = require('../repositories/goldCertificateItemRepository');
const repo = new GoldCertificateItemRepository();

router.post('/items', async (req, res, next) => {
    try {
        const { id } = req.params; // certificateId from parent route /certificates/:id/items
        const clientData = req.body;

        // SECURITY: Strip any calculated fields from client
        const allowedFields = [
            'gross_weight', 'test_weight', 'purity', 'rate_per_gram',
            'sub_certificate_number', 'item_name', 'is_returned'
        ];

        // Validation: Check for forbidden fields
        const forbiddenFields = ['net_weight', 'fine_weight', 'item_total', 'amount'];
        const detectedForbidden = forbiddenFields.filter(f => clientData[f] !== undefined);

        if (detectedForbidden.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Security Violation: Calculated fields [${detectedForbidden.join(', ')}] cannot be provided by client.`
            });
        }

        const sanitizedInput = {};
        allowedFields.forEach(field => {
            if (clientData[field] !== undefined) {
                sanitizedInput[field] = clientData[field];
            }
        });

        const result = repo.createItem(id, sanitizedInput);

        res.status(201).json({
            success: true,
            message: 'Item created with server-calculated values',
            data: result
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
