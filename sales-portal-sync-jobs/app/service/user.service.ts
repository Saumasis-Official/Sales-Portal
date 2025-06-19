import logger from '../lib/logger';
import { UserModel } from '../models/user.model';

export const UserService = {
    async getUserDetails(login_id) {
        logger.info('inside UserService -> getUserDetails');
        try {
            const resultSet = await UserModel.getUserDetails(login_id);
            const { tse_code: tseCode, ...userData } = resultSet;
            const salesDetails = await UserModel.getSalesDetails(login_id);
            userData.distributor_sales_details = salesDetails;

            if (tseCode) {
                const salesHierarchyDetails = await this.fetchSalesHierarchyDetails(tseCode);
                userData.tse = salesHierarchyDetails.TSE;
                userData.asm = salesHierarchyDetails.ASM;
                userData.rsm = salesHierarchyDetails.RSM;
                userData.cluster = salesHierarchyDetails.CLUSTER_MANAGER;
            } else {
                logger.info(`UserService -> getUserDetails1: else case, TSE code not available`);
                userData.tse = null;
            }

            logger.info('UserService -> getUserDetails: return success with data');
            return userData;
        } catch (error) {
            logger.error('Caught error in UserService -> getUserDetails', error);
            throw error;
        }
    },

    createSalesHierarchyObject(row) {
        return {
            user_id: row.user_id,
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            email: row.email || null,
            mobile_number: row.mobile_number || null,
            code: row.code || null,
        };
    },

    /**
     * This function will fetch the sales-hierarchy details based on the tse code
     * @param tseCode
     * @returns
     *
     * SCENARIOS:
     * 1. 1TSE -> 1ASM
     * 2. 2TSE -> 1ASM
     * 3. TSE -> RSM (no ASM)
     * 4. TSE -> 2ASM
     * 5. TSE not present, ASM present
     * 6. TSE present, ASM not present
     * 7. TSE, ASM, RSM can have multiple codes(SOPE-510: https://tataconsumer.atlassian.net/browse/SOPE-510)
     * 8. Incorrect roles: Then it will be considered as data issue, role of the person need to be changed
     */
    async fetchSalesHierarchyDetails(tseCode: string): Promise<object> {
        logger.info('inside UserService -> fetchSalesHierarchyDetails');
        const resultObj = {};
        try {
            const resultSet = await UserModel.fetchSalesHierarchyDetails(tseCode);
            resultSet?.forEach((row) => {
                const userDetails = this.createSalesHierarchyObject(row);
                if (Object.keys(resultObj)?.includes(row.roles)) resultObj[row.roles]?.push(userDetails);
                else resultObj[row.roles] = [userDetails];
            });

            /**
             * if TSE is not present, then create object TSE: {code : code}
             */
            if (!Object.keys(resultObj).includes('TSE')) Object.assign(resultObj, { TSE: [{ code: tseCode }] });

            /**
             * if by manager-id mapping, ASM details is not fetched, then trying to fetch ASM details based on the area-code(first four characters of TSE code)
             * if still no ASM record is found then create object ASM: {code : code}
             */
            if (!Object.keys(resultObj).includes('ASM')) {
                const asmDetails = await UserModel.fetchASMSalesHierarchyDetails(tseCode);
                resultObj['ASM'] = asmDetails || [{ code: tseCode.slice(0, 4) }];
            }

            if (!Object.keys(resultObj).includes('RSM')) {
                resultObj['RSM'] = [];
            }

            if (!Object.keys(resultObj).includes('CLUSTER_MANAGER')) {
                resultObj['CLUSTER_MANAGER'] = resultObj['DIST_ADMIN'];
            }

            return resultObj;
        } catch (error) {
            logger.error('CAUGHT ERROR in UserService -> fetchSalesHierarchyDetails', error);
            return {};
        }
    },
    async getSessionInvalidateStatus(loginId: string, uuid: string) {
        return await UserModel.getInvalidateSessionStatus(loginId, uuid);
    },

    async adminDetailsStatement(email) {
        return await UserModel.adminDetailsStatement(email);
    },

    async validateSuperAdminStatement(distributorId: string) {
        return await UserModel.validateSuperAdminStatement(distributorId);
    },

    async validateDistributorAdminMapping(distributorId: string, role: string, code: string = '') {
        const response = await UserModel.validateDistributorAdminMapping(distributorId, role, code);
        return response;
    },
};
