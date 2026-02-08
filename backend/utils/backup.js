const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const DB_PATH = path.join(__dirname, '../db/lab.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Keep last 30 daily backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const performBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `lab_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    console.log(`📦 Starting backup...`);

    try {
        // Simple file copy using streams for reliability
        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`✅ Backup created successfully: ${backupName}`);

        // Rotate backups (cleanup old ones)
        rotateBackups();
    } catch (error) {
        console.error(`❌ Backup failed:`, error.message);
    }
};

const rotateBackups = () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('lab_backup_') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort newest first

        // Remove files exceeding the limit
        if (files.length > MAX_BACKUPS) {
            const filesToDelete = files.slice(MAX_BACKUPS);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`🗑️ Deleted old backup: ${file.name}`);
            });
        }
    } catch (error) {
        console.error('Warning: Failed to rotate backups:', error.message);
    }
};

// Run if called directly
if (require.main === module) {
    performBackup();
}

module.exports = { performBackup };
