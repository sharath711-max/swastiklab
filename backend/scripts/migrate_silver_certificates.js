const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'swastik_lab.db');
const db = new Database(dbPath);

console.log('Migrating silver_certificate_item table...');

try {
    // 1. Add item_total if it doesn't exist
    try {
        db.prepare('ALTER TABLE silver_certificate_item ADD COLUMN item_total REAL DEFAULT 0').run();
        console.log('Added item_total column');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('item_total column already exists');
        } else {
            console.error('Error adding item_total:', e.message);
        }
    }

    // 2. Add fine_weight if it doesn't exist
    try {
        db.prepare('ALTER TABLE silver_certificate_item ADD COLUMN fine_weight REAL DEFAULT 0').run();
        console.log('Added fine_weight column');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('fine_weight column already exists');
        } else {
            console.error('Error adding fine_weight:', e.message);
        }
    }

    // 3. Add item_no if it doesn't exist (repo mentions it)
    try {
        db.prepare('ALTER TABLE silver_certificate_item ADD COLUMN item_no TEXT').run();
        console.log('Added item_no column');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('item_no column already exists');
        } else {
            console.error('Error adding item_no:', e.message);
        }
    }

    // 4. Update silver_certificate table with roll-up columns consistent with Gold if needed
    // The user said silver_certificate does not use a 'total' column for roll-up in existing logic,
    // but CertificateCalculationService mentions fine_weight and net_weight roll-ups.
    // Let's add them to be safe if we want automated roll-ups.
    const parentColumns = [
        { name: 'total_net_weight', type: 'REAL DEFAULT 0' },
        { name: 'total_fine_weight', type: 'REAL DEFAULT 0' }
    ];

    for (const col of parentColumns) {
        try {
            db.prepare(`ALTER TABLE silver_certificate ADD COLUMN ${col.name} ${col.type}`).run();
            console.log(`Added ${col.name} to silver_certificate`);
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log(`${col.name} column already exists on silver_certificate`);
            } else {
                console.error(`Error adding ${col.name} to silver_certificate:`, e.message);
            }
        }
    }

    console.log('Migration completed successfully');
} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
