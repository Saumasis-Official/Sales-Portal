/**
 * @file admin.service
 * @description defines admin service methods
*/
import { AdminModel } from "../models/admin.model";
import logger from "../lib/logger";

export const AdminService = {

    /**
     * @param email
     */
    async adminDetailsStatement(email: string) {
        return await AdminModel.adminDetailsStatement(email)
    },
    
    /**
     * @param distributorId
     */
     async validateSuperAdminStatement(distributorId: string) {
        return await AdminModel.validateSuperAdminStatement(distributorId);
    },

    async validateDistributorAdminMapping(distributorId: string, role: string, code: string = ''){
        logger.info('inside AdminService -> validateDistributorAdminMapping');
        const response = await AdminModel.validateDistributorAdminMapping(distributorId, role, code);
        return response;
    }

};