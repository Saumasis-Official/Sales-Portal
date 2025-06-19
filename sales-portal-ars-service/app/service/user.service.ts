import logger from "../lib/logger";
import { UserModel } from "../model/userModel"

export const UserService = {
    async getSessionInvalidateStatus(loginId: string, uuid: string) {
        return await UserModel.getInvalidateSessionStatus(loginId, uuid)
    },

    async fetchDistributorDetails(distributorCode: string) {
        logger.info('inside UserService -> fetchDistributorDetails, distributorCode: ' + distributorCode);
        const response = await UserModel.fetchDistributorDetails(distributorCode);
        return response;
    },

    async getMaterialsList(distributorId: string, queryParams: any) {
        logger.info(`inside orderService -> getMaterialsList, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`);
        const response = await UserModel.getMaterialsList(distributorId, queryParams);
        return response;
    },

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
                    row.roles.forEach((role: string) => {
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
} 