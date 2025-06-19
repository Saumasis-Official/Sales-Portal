import logger from "../lib/logger";
import { UserModel } from "../models/user.model";

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
            user_id: row.user_id || null,
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
    async fetchSalesHierarchyDetails(tseCode: string): Promise<{}> {
        logger.info('inside UserService -> fetchSalesHierarchyDetails');
        const resultObj = {};
        try {
            const resultSet = await UserModel.fetchSalesHierarchyDetails(tseCode);

            resultSet?.forEach(row => {
                const userDetails = this.createSalesHierarchyObject(row);
                row.roles.forEach((role:string) => {
                    if (Object.keys(resultObj)?.includes(role))
                        resultObj[role]?.push(userDetails);
                    else
                        resultObj[role] = [userDetails];  
                })
            });

            /**
             * if TSE is not present, then create object TSE: {code : code}
             */
            !Object.keys(resultObj).includes('TSE') && Object.assign(resultObj, { TSE: [{ code: tseCode }] });

            /**
              * if by manager-id mapping, ASM details is not fetched, then trying to fetch ASM details based on the area-code(first four characters of TSE code)
              * if still no ASM record is found then create object ASM: {code : code}
              */
            if (!Object.keys(resultObj).includes('ASM')) {
                // const asmDetails = await UserModel.fetchASMSalesHierarchyDetails(tseCode);
                // resultObj['ASM'] = asmDetails || [{ code: tseCode.slice(0, 4) }];

                // SOPE - 2104, IF ASM is not present it implies tse with the given tsecode is not present, hence we use the first 4 charactes (asm_code), 
                // to fetch all the hierarchy above the TSE
                const area_code = tseCode.slice(0, 4);
                const asmAndAboveResult = await UserModel.fetchSalesHierarchyDetails(area_code);

                asmAndAboveResult?.forEach(row => {
                    const userDetails = this.createSalesHierarchyObject(row);
                    row.roles.forEach((role:string) => {
                        if (Object.keys(resultObj)?.includes(role))
                            resultObj[role]?.push(userDetails);
                        else
                            resultObj[role] = [userDetails];    
                    })
                });
                
            };
            
            return resultObj;
        } catch (error) {
            logger.error('CAUGHT ERROR in UserService -> fetchSalesHierarchyDetails', error);
            return {};
        }
    },
    async getSessionInvalidateStatus(loginId:string,uuid:string){
        return await UserModel.getInvalidateSessionStatus(loginId,uuid)
    },

    async fetchDistributorDetails(distributorCode: string) {
        logger.info('inside UserService -> fetchDistributorDetails, distributorCode: '+ distributorCode);
        const response = await UserModel.fetchDistributorDetails(distributorCode);
        return response;
    },

    async beginTransaction(name: string) {
        logger.info('inside UserService -> beginTransaction');
        return await UserModel.beginTransaction(name);
    },

    async commitTransaction(name: string) {
        logger.info('inside UserService -> commitTransaction');
        return await UserModel.commitTransaction(name);
    },

    async rollbackTransaction(name: string) {
        logger.info('inside UserService -> rollbackTransaction');
        return await UserModel.rollbackTransaction(name);
    },

    async fetchPlantDetails() {
        logger.info('inside UserService -> fetchPlantDetails');
        try {
            const response = await UserModel.fetchPlantDetails();
               logger.info('UserService -> fetchPlantDetails: return success with data');
                return response;
            
        } catch (error) {
            logger.error('Caught error in UserService -> fetchPlantDetails', error);
            throw error;
        }
    }

}