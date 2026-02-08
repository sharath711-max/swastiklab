const { db } = require('../db/db');

class WorkflowService {
    async getAllItems() {
        const query = `
            SELECT 
                'gold' as type, gt.id, gt.customer_id, gt.status, 
                'Gold Test' as description, 
                gt.total as total_amount, gt.created as createdon, 
                c.name as customer_name
            FROM gold_test gt
            JOIN customer c ON gt.customer_id = c.id
            WHERE gt.deletedon IS NULL
            
            UNION ALL
            
            SELECT 
                'silver' as type, st.id, st.customer_id, st.status, 
                'Silver Test' as description, 
                st.total as total_amount, st.created as createdon, 
                c.name as customer_name
            FROM silver_test st
            JOIN customer c ON st.customer_id = c.id
            WHERE st.deletedon IS NULL

            UNION ALL

            SELECT 
                'gold_cert' as type, gc.id, gc.customer_id, gc.status,
                'Gold Certificate' as description,
                gc.total as total_amount, gc.created as createdon,
                c.name as customer_name
            FROM gold_certificate gc
            JOIN customer c ON gc.customer_id = c.id
            WHERE gc.deletedon IS NULL

            UNION ALL

            SELECT 
                'silver_cert' as type, sc.id, sc.customer_id, sc.status,
                'Silver Certificate' as description,
                0 as total_amount, sc.created as createdon,
                c.name as customer_name
            FROM silver_certificate sc
            JOIN customer c ON sc.customer_id = c.id
            WHERE sc.deletedon IS NULL

            UNION ALL

            SELECT 
                'photo_cert' as type, pc.id, pc.customer_id, pc.status,
                'Photo Certificate' as description,
                pc.total as total_amount, pc.created as createdon,
                c.name as customer_name
            FROM photo_certificate pc
            JOIN customer c ON pc.customer_id = c.id
            WHERE pc.deletedon IS NULL

            ORDER BY createdon DESC
        `;
        return db.prepare(query).all();
    }

    async updateStatus(type, id, status) {
        let table;

        switch (type) {
            case 'gold': table = 'gold_test'; break;
            case 'silver': table = 'silver_test'; break;
            case 'gold_cert': table = 'gold_certificate'; break;
            case 'silver_cert': table = 'silver_certificate'; break;
            case 'photo_cert': table = 'photo_certificate'; break;
            default: throw new Error('Invalid item type: ' + type);
        }

        const query = `UPDATE ${table} SET status = ?, lastmodified = CURRENT_TIMESTAMP WHERE id = ?`;

        const result = db.prepare(query).run(status, id);
        if (result.changes === 0) throw new Error('Record not found');
        return true;
    }
}

module.exports = new WorkflowService();
