const fs = require('fs');
const path = require('path');
const { db } = require('../db/db');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_PATH = path.join(__dirname, '../../backend/db/lab.db');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `lab_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    console.log(`📦 Starting backup...`);
    console.log(`   Source: ${DB_PATH}`);
    console.log(`   Dest:   ${backupPath}`);

    try {
        // Use SQLite's online backup API if available via better-sqlite3
        // giving the file name directly allows better-sqlite3 to safely copy
        db.backup(backupPath)
            .then(() => {
                console.log(`✅ Backup completed successfully: ${backupName}`);
                // Optional: Prune old backups (keep last 7 days)
                pruneOldBackups();
            })
            .catch((err) => {
                console.error('❌ Backup failed:', err);
            });
    } catch (err) {
        // Fallback for file copy if db.backup isn't available or fails synchronously
        console.warn('⚠️ SQLite backup API failed/unavailable, falling back to file copy...');
        try {
            fs.copyFileSync(DB_PATH, backupPath);
            console.log(`✅ Backup (Copy) completed successfully: ${backupName}`);
        } catch (copyErr) {
            console.error('❌ File copy failed:', copyErr);
        }
    }
}

function pruneOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > RETENTION_MS) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted old backup: ${file}`);
            }
        });
    } catch (err) {
        console.error('⚠️ Failed to prune old backups:', err);
    }
}

// Run immediately if called directly
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup };
