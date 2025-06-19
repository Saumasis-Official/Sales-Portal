import logger from "../lib/logger";
import { BulkOrderModel } from "../models/bulkOrderModel";

export const BulkOrderService = {
    async getBulkMoqMappingData(area: string | null | undefined, search: string | null | undefined, role: string[], email: string, limit: number, offset: number) {
        logger.info('inside ArsService -> getMoqMappingData');
        try {
            const rows = await BulkOrderModel.getBulkOrderMoqMappingData(area, search, role, email, limit, offset);
            const totalCount = await BulkOrderModel.getBulkOrderMoqMappingDataCount(area, search, role, email);
            return { totalCount, rows };
        } catch (error) {
            logger.error('inside ArsService -> getMoqMappingData,Error: ', error);
            return null;
        }
    },

    async BulkOrderupdateMoq(moq_data: { dbId: string, plantId: number, moq: number }[], user: any) {
        logger.info('inside ArsService -> updateMoq');
        try {
            let success: boolean = true;
            for (let data of moq_data) {
                const response = await BulkOrderModel.BulkOrderupdateMoq(data['dbId'], data['plantId'], data['moq'], user);
                success = success && response;
            }

            return success;
        } catch (error) {
            logger.error('inside ArsService -> updateMoq,Error: ', error);
            return null;
        }
    },

    async getMappingAreaZone(email, roles) {
        let columnName: any;
        if (roles.includes('LOGISTIC_OFFICER')) columnName = 'logistic_email';
        else if (roles.includes('ZONE_MANAGER')) columnName = 'zone_manager_email';
        else if (roles.includes('SUPER_ADMIN') || roles.includes('PORTAL_OPERATIONS')) columnName = null;
        return await BulkOrderModel.getMappingAreaZone(email, columnName);

    },

    async boMassUpdate(data: any, user: any) {

        return await BulkOrderModel.boMassUpdate(data, user);

    },

    async getBoDistributorMOQ(data) {
        const { dbCode, plantCodes } = data
        return await BulkOrderModel.getBoDistributorMoq(dbCode, plantCodes)
    },
}