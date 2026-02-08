const { db } = require('../db/db');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = db;
    }

    findAll() {
        return this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`).all();
    }

    findById(id) {
        return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    }

    delete(id) {
        return this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    }
}

module.exports = BaseRepository;
