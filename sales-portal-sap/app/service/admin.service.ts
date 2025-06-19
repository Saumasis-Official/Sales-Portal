/**
 * @file admin.service
 * @description defines admin service methods
*/
import logger from "../lib/logger";
import { AdminModel } from "../models/admin.model";


export const AdminService = {

    /**
     * @param email
     */
    async adminDetailsStatement(email: string) {
        return await AdminModel.adminDetailsStatement(email)
    },
    /**
     * @param adminId
     * @param distributorId
     */
    async validateDistAdminOrTseStatement(adminId: string, distributorId: string) {
        return await AdminModel.validateDistAdminOrTseStatement(adminId, distributorId)
    },
    /**
     * @param adminCode
     * @param distributorId
     */
    async validateTseAdminStatement(adminCode: string, distributorId: string) {
        return await AdminModel.validateTseAdminStatement(adminCode, distributorId)
    },
    /**
     * @param distributorId
     */
     async validateSuperAdminStatement(distributorId: string) {
        return await AdminModel.validateSuperAdminStatement(distributorId);
    },

    
    async updateContactDetailsHistory(distributorId: string,
        data: {
            contact_detail_changes:
            {
                update_mobile?: string,
                update_email?: string
            },
            changed_by: string,
            remark: string
        }) {
            logger.info('inside AdminService->updateContactDetailHistory');
            try {
                const { contact_detail_changes = null, changed_by = null, remark = 'PORTAL_MANAGED' } = data;
                const updateContactDetailsHistoryResponse = await AdminModel.updateContactDetailsHistory(distributorId, contact_detail_changes, changed_by, remark);
                return (updateContactDetailsHistoryResponse && updateContactDetailsHistoryResponse.command === 'INSERT' && updateContactDetailsHistoryResponse.rowCount > 0);
            } catch (error) {
                logger.error('Error in AdminService->updateContactDetailHistory',error);
                return error;
                
            }
         },

    async validateDistributorAdminMapping(distributorId: string, role: string, code: string = ''){
        logger.info('inside AdminService -> validateDistributorAdminMapping');
        const response = await AdminModel.validateDistributorAdminMapping(distributorId, role, code);
        return response;
    },

};