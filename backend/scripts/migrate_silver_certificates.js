const fs = require('fs');
const path = require('path');
const { db, genId } = require('../db/db');
const { formatTimestamp } = require('../utils/autoNumber');

const CERT_JSON_PATH = path.join('c:/Users/pc/OneDrive/Desktop/db_json/silver_certificate.json');

console.log('Starting Silver Certificate Migration...');

function generateAutoNumber(prefix, createdDate, sequence) {
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = createdDate.getFullYear();
    const MM = pad(createdDate.getMonth() + 1);
    const DD = pad(createdDate.getDate());
    const HH = pad(createdDate.getHours());
    const mm = pad(createdDate.getMinutes());
    const ss = pad(createdDate.getSeconds());
    const batchId = `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
    const seqStr = String(sequence).padStart(5, '0');
    return `${prefix}-${batchId}${seqStr}`;
}

try {
    if (!fs.existsSync(CERT_JSON_PATH)) {
        throw new Error(`File not found: ${CERT_JSON_PATH}`);
    }

    const certs = JSON.parse(fs.readFileSync(CERT_JSON_PATH, 'utf8'));
    console.log(`Found ${certs.length} legacy silver certificates.`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let globalItemSeq = 1;

    const stmtCheckCert = db.prepare('SELECT id FROM silver_certificate WHERE legacy_id = ?');
    const stmtGetCustomer = db.prepare('SELECT id FROM customer WHERE legacy_id = ?');

    const insertCert = db.prepare(`
        INSERT INTO silver_certificate (
            id, auto_number, customer_id, status, 
            mode_of_payment, total, gst, gst_bill_number, total_tax,
            created, lastmodified, in_progress_at, done_at, legacy_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
        INSERT INTO silver_certificate_item (
            id, item_number, silver_certificate_id, certificate_number,
            name, item_type, gross_weight, test_weight, net_weight, purity, returned,
            created, item_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Define helper to process one certificate atomically
    const processCertificate = db.transaction((c, createdDate) => {
        // 1. Get New Customer ID
        const customerRow = stmtGetCustomer.get(c.customer_id);
        if (!customerRow) {
            throw new Error(`Customer not found (LegID: ${c.customer_id})`);
        }

        // 2. Generate Data
        const newCertId = genId('SCR');
        // Random suffix
        const autoNumber = generateAutoNumber('SC', createdDate, Math.floor(Math.random() * 90000) + 10000);

        // 3. Insert Parent
        insertCert.run(
            newCertId,
            autoNumber,
            customerRow.id,
            'DONE',
            c.mode_of_payment || 'cash',
            c.total || 0,
            c.gst ? 1 : 0,
            String(c.gst_bill_number || ''),
            c.total_tax || 0,
            c.created,
            c.created,
            c.created,
            c.created,
            c.id
        );

        // 4. Process Items
        let items = [];
        try {
            items = JSON.parse(c.data);
        } catch (e) {
            console.warn(`Data JSON parse error for ${c.id}`);
        }

        if (Array.isArray(items)) {
            for (const item of items) {
                const newItemId = genId('SCI');
                // Use GLOBAL sequence ensuring uniqueness even if same timestamp
                const itemNumber = generateAutoNumber('SCI', createdDate, globalItemSeq++);
                if (globalItemSeq > 99999) globalItemSeq = 1;

                let gross = parseFloat(item.total_weight || item.gross_weight || 0);
                if (gross <= 0) gross = 0.01;

                let test = parseFloat(item.test_weight || 0);

                // Fix logic: test > gross
                if (test > gross) {
                    // console.warn(`Adjusting test wt for silver cert item...`)
                    test = gross;
                }

                const net = gross - test;
                const item_total = item.item_total || 0; // Legacy data might miss this

                insertItem.run(
                    newItemId,
                    itemNumber,
                    newCertId,
                    item.certificate_number || 'UNKNOWN',
                    item.name || null,
                    item.item || item.item_type || 'Silver Item',
                    gross,
                    test,
                    net,
                    parseFloat(item.purity || 0),
                    item.returned ? 1 : 0,
                    c.created,
                    item_total
                );
            }
        }
    });

    for (const c of certs) {
        try {
            if (stmtCheckCert.get(c.id)) {
                skippedCount++;
                continue;
            }

            const createdDate = new Date(c.created);
            processCertificate(c, createdDate);
            migratedCount++;

        } catch (err) {
            console.error(`❌ Error migrating silver cert ${c.id}:`, err.message);
            errorCount++;
        }
    }

    console.log('✅ Silver Certificate Migration Complete');
    console.log(`- Migrated: ${migratedCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);

} catch (error) {
    console.error('❌ Silver Migration Failed:', error.message);
}
