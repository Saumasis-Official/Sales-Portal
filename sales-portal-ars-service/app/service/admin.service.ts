import logger from "../lib/logger";
import { AdminModel } from "../model/adminModel"

export const AdminService = {
    async adminDetailsStatement(email: string) {
        return await AdminModel.adminDetailsStatement(email)
    },
    async validateSuperAdminStatement(distributorId: string) {
        return await AdminModel.validateSuperAdminStatement(distributorId);
    },
    async validateDistributorAdminMapping(distributorId: string, role: string[], code: string = '') {
        logger.info('inside AdminService -> validateDistributorAdminMapping');
        const response = await AdminModel.validateDistributorAdminMapping(distributorId, role, code);
        return response;
    }
}