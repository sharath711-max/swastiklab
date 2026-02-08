const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'backend', 'db', 'lab.db');
const db = new Database(dbPath);

console.log('Seeding admin user...');

try {
    const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const now = new Date().toISOString();
        // Manually generate a generic ID or use a fixed one
        const id = 'u_admin_001';

        db.prepare("INSERT INTO users (id, username, password, created, lastmodified) VALUES (?, ?, ?, ?, ?)").run(
            id,
            'admin',
            hashedPassword,
            now,
            now
        );
        console.log('✅ Admin user created successfully.');
    } else {
        console.log('ℹ️ Admin user already exists.');
    }
} catch (error) {
    console.error('❌ Error seeding database:', error);
}
