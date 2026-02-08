const express = require('express');
const router = express.Router();
const certificateService = require('../services/certificateService');
const upload = require('../middleware/uploadMiddleware');
const { generateCertificateHTML } = require('../utils/certificateTemplate');
const { authMiddleware } = require('../middleware/authMiddleware');

// Health/Public routes should be above router.use(authMiddleware) if any
// But for now lab policy is to protect all certificates except the specific print view if needed.

// GET /api/certificates/:no/print -> KEEP PUBLIC for accessibility (or protect if strict)
// We'll put it at the BOTTOM and apply middleware to the router now.

// router.use(authMiddleware);

// GET /api/certificates
// GET /api/certificates
router.get('/', async (req, res) => {
    try {
        const { type, customer_id, status, limit, page } = req.query;
        if (!type) {
            return res.status(400).json({ error: 'Certificate type (gold, silver, photo) is required' });
        }

        const filters = {
            customer_id,
            status,
            limit: limit ? parseInt(limit) : 20,
            offset: page ? (parseInt(page) - 1) * (parseInt(limit) || 20) : 0
        };

        const result = await certificateService.listCertificates(type, filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/certificates/:id
router.get('/:id', async (req, res) => {
    try {
        const { type } = req.query; // ID is not unique across tables potentially, though prefixes help.
        // We can infer type from ID prefix GCR/SCR/PCR
        const id = req.params.id;
        let inferredType = type;

        if (!inferredType) {
            if (id.startsWith('GCR')) inferredType = 'gold';
            else if (id.startsWith('SCR')) inferredType = 'silver';
            else if (id.startsWith('PCR')) inferredType = 'photo';
            else return res.status(400).json({ error: 'Cannot infer certificate type from ID, please provide type query param' });
        }

        const certificate = await certificateService.getCertificate(inferredType, id);
        if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
        res.json(certificate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/certificates
router.post('/', async (req, res) => {
    try {
        const certificate = await certificateService.generateCertificate(req.body);
        res.status(201).json(certificate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/certificates/with-photo
router.post('/with-photo', upload.single('photo'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data);
        if (req.file) {
            // For photo certificates, items might need the media. 
            // The frontend should ideally send items array where one item has this media path.
            // We'll normalize this: assign the photo path to the first item's media field if it's a photo cert.
            const photoPath = req.file.path.split('backend')[1] || req.file.path;

            if (data.type !== 'photo') {
                return res.status(400).json({ error: 'Photo upload is only allowed for Photo Certificates.' });
            }

            if (data.type === 'photo' && data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    item.media = photoPath;

                    // Since Schema lacks weight/purity columns for Photo Certs, append to description
                    // Frontend sends: item_type, gross_weight, purity
                    const details = [];
                    if (item.gross_weight) details.push(`Wt: ${item.gross_weight}g`);
                    if (item.purity) details.push(`Purity: ${item.purity}%`);

                    if (details.length > 0) {
                        item.item_type = `${item.item_type || 'Item'} (${details.join(', ')})`;
                    }
                });
            }
        }
        const certificate = await certificateService.generateCertificate(data);
        res.status(201).json(certificate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/certificates/:no/print
router.get('/:no/print', async (req, res) => {
    try {
        const certData = await certificateService.getCertificateByNo(req.params.no);
        if (!certData) return res.status(404).send('Certificate not found');

        // Transform for template
        const templateData = {
            ...certData,
            customer: {
                name: certData.customer_name,
                phone: certData.customer_phone
            },
            // Add full URL for image if it exists
            photo_path: certData.photo_path ? `${req.protocol}://${req.get('host')}${certData.photo_path}` : null
        };

        const html = generateCertificateHTML(templateData);
        res.send(html);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


// POST /api/certificates/:id/results
router.post('/:id/results', upload.single('photo'), async (req, res) => {
    try {
        const id = req.params.id;
        let data = req.body;

        // If multipart/form-data
        if (req.body.data) {
            data = JSON.parse(req.body.data);
        }

        if (req.file) {
            const photoPath = req.file.path.split('backend')[1];
            // If photo_item_id is provided, update that item. 
            // Else if items array exists, maybe update the first one?
            // Or data.items is the array of updates.

            if (data.photo_item_id && data.items) {
                const item = data.items.find(i => i.id === data.photo_item_id);
                if (item) item.media = photoPath;
            } else if (data.items && data.items.length > 0) {
                // Fallback: assign to first item if not specified (legacy behavior compat)
                // But ideally frontend sends photo_item_id
                data.items[0].media = photoPath;
            }
        }

        let type = data.type;
        if (!type) {
            if (id.startsWith('PCR')) type = 'photo';
            else if (id.startsWith('GCR')) type = 'gold';
            else if (id.startsWith('SCR')) type = 'silver';
        }

        await certificateService.saveResults(type, id, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
