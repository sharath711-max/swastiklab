const { db } = require('../db/db');
const goldTestService = require('./goldTestService');
const silverTestService = require('./silverTestService');
const certificateService = require('./certificateService');

class WorkflowService {
    async getAllItems() {
        const query = `
            SELECT 
                'gold' as type, gt.id, gt.customer_id, gt.status, 
                'Gold Test' as description, 
                gt.total as total, gt.mode_of_payment, gt.created as createdon, 
                c.name as customer_name
            FROM gold_test gt
            JOIN customer c ON gt.customer_id = c.id
            WHERE gt.deletedon IS NULL
            
            UNION ALL
            
            SELECT 
                'silver' as type, st.id, st.customer_id, st.status, 
                'Silver Test' as description, 
                st.total as total, st.mode_of_payment, st.created as createdon, 
                c.name as customer_name
            FROM silver_test st
            JOIN customer c ON st.customer_id = c.id
            WHERE st.deletedon IS NULL

            UNION ALL

            SELECT 
                'gold_cert' as type, gc.id, gc.customer_id, gc.status,
                'Gold Certificate' as description,
                gc.total as total, gc.mode_of_payment, gc.created as createdon,
                c.name as customer_name
            FROM gold_certificate gc
            JOIN customer c ON gc.customer_id = c.id
            WHERE gc.deletedon IS NULL

            UNION ALL

            SELECT 
                'silver_cert' as type, sc.id, sc.customer_id, sc.status,
                'Silver Certificate' as description,
                sc.total as total, sc.mode_of_payment, sc.created as createdon,
                c.name as customer_name
            FROM silver_certificate sc
            JOIN customer c ON sc.customer_id = c.id
            WHERE sc.deletedon IS NULL

            UNION ALL

            SELECT 
                'photo_cert' as type, pc.id, pc.customer_id, pc.status,
                'Photo Certificate' as description,
                pc.total as total, pc.mode_of_payment, pc.created as createdon,
                c.name as customer_name
            FROM photo_certificate pc
            JOIN customer c ON pc.customer_id = c.id
            WHERE pc.deletedon IS NULL

            ORDER BY createdon DESC
        `;
        return db.prepare(query).all();
    }

    async updateStatus(type, id, status) {
        // Map frontend type to service type
        const serviceType = type.replace('_cert', '');

        switch (serviceType) {
            case 'gold':
                if (type === 'gold') return goldTestService.updateStatus(id, status);
                return certificateService.updateStatus('gold', id, status);
            case 'silver':
                if (type === 'silver') return silverTestService.updateStatus(id, status);
                return certificateService.updateStatus('silver', id, status);
            case 'photo':
                return certificateService.updateStatus('photo', id, status);
            default:
                throw new Error('Invalid item type: ' + type);
        }
    }
}

module.exports = new WorkflowService();
