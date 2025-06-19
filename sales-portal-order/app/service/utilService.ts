/**
 * @file util.service
 * @description defines util service methods
*/
import { utilModel } from '../models/utilModel';
import logger from '../lib/logger';
import moment from 'moment';
import { OrderModel } from '../models/order.model';
import { UserService } from './user.service';
import { RushOrderService } from './rushOrder.service';
import { UpcomingPDPDateOutputType } from '../enums/upcomingPDPDateOutputType';
import { GetRDDForAutoClosure } from '../interfaces/getRDDForAutoClosure';

export const utilService = {
    async updateMaterialTags(temp: {
        material: string, pack_measure_tags: any, regional_brand_tags: any, general_tags: any, pack_type_tags: any
    }[]) {
        let materials: any = [];

        for (let j = 1; j < temp.length; j++) {

            if (!temp[j].material) continue;

            const tags = {
                pack_measure_tags: temp[j].pack_measure_tags ? temp[j].pack_measure_tags : '',
                regional_brand_tags: temp[j].regional_brand_tags ? temp[j].regional_brand_tags : '',
                general_tags: temp[j].general_tags ? temp[j].general_tags : '',
                pack_type_tags: temp[j].pack_type_tags ? temp[j].pack_type_tags : '',
            };

            for (let tag of Object.keys(tags)) {
                const match1 = tags[tag].match(/(\d+\.?\d*) ?gm/g);
                if (match1 && match1.length) {
                    tags[tag] = tags[tag].replace(match1[0], match1[0].replace(' ', ''));
                }
                const match2 = tags[tag].match(/(\d+\.?\d*) ?g/g);
                if (match2 && match2.length) {
                    tags[tag] = tags[tag].replace(match2[0], match2[0].replace(' ', ''));
                }
                const match3 = tags[tag].match(/(\d+\.?\d*) ?gms/g);
                if (match3 && match3.length) {
                    tags[tag] = tags[tag].replace(match3[0], match3[0].replace(' ', ''));
                }
                const match4 = tags[tag].match(/(\d+\.?\d*|[0-9]\/[0-9]) ?kg/g);
                if (match4 && match4.length) {
                    tags[tag] = tags[tag].replace(match4[0], match4[0].replace(' ', ''));
                }
                const match5 = tags[tag].match(/(\d+\.?\d*|[0-9]\/[0-9]) ?kgs/g);
                if (match5 && match5.length) {
                    tags[tag] = tags[tag].replace(match5[0], match5[0].replace(' ', ''));
                }
            }

            let materialRow = {
                code: temp[j].material,
                tags
            };

            materials.push(materialRow);
        }

        materials = JSON.stringify(materials);

        return await utilModel.updateMaterialTags(materials);
    },

    async updateSalesHierarchyDetails(temp) {
        let salesHierarchyDetails: any = [];

        for (let j = 1; j < temp.length; j++) {
            const mobileNumber = temp[j].mobile_number
                ? temp[j].mobile_number.toString().replace(/[^0-9]/g, '')
                : '';

            let salesHierarchyRow = {
                user_id: temp[j].user_id ? temp[j].user_id.toString() : '',
                first_name: temp[j].first_name ? temp[j].first_name.toString().replace("'", "''") : null,
                last_name: temp[j].last_name ? temp[j].last_name.toString().replace("'", "''") : null,
                email: temp[j].email ? temp[j].email.toString().replace("'", "''") : null,
                mobile_number: mobileNumber.length <= 12 && mobileNumber.length >= 10 ? mobileNumber : null,
                manager_id: temp[j].manager_id ? temp[j].manager_id.toString() : null,
                code: temp[j].code ? temp[j].code.toString() : null
            };

            if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'qa') {
                if (salesHierarchyRow.code === 'KA01') {
                    salesHierarchyRow.email = process.env.ASM_TEST_EMAIL || 'asmuser@yopmail.com';
                    salesHierarchyRow.mobile_number = process.env.ASM_TEST_MOBILE || '8573099028';
                } else {
                    salesHierarchyRow.email = process.env.TSE_TEST_EMAIL || 'tseuser@yopmail.com';
                    salesHierarchyRow.mobile_number = process.env.TSE_TEST_MOBILE || '9473825856';
                }
            }

            salesHierarchyDetails.push(salesHierarchyRow);
        }

        salesHierarchyDetails = JSON.stringify(salesHierarchyDetails);
        return await utilModel.updateSalesHierarchyDetails(salesHierarchyDetails);
    },

    async getSyncLogs() {
        return await utilModel.getSyncLogs();
    },
    async getMaterialsTag() {
        return await utilModel.getMaterialsTag();
    },

    async insertDistributors(distributors: string) {
        logger.info(`inside utilService -> insertDistributors, distributors: ${distributors}`);
        const response = await utilModel.insertDistributors(distributors);
        return response;
    },

    async insertDistributorPlants(distributorsWithPlants: string) {
        logger.info(`inside utilService -> insertDistributorPlants, distributorsWithPlants: ${distributorsWithPlants}`);
        const response = await utilModel.insertDistributorPlants(distributorsWithPlants);
        return response;
    },

    async insertWarehouseDetails(warehouseDetailsRow: string) {
        logger.info(`inside utilService -> insertWarehouseDetails, warehouseDetailsRow: ${warehouseDetailsRow}`);
        const response = await utilModel.insertWarehouseDetails(warehouseDetailsRow);
        return response;
    },

    async insertSalesHierarchy(fileDetails: any[]) {
        logger.info(`inside utilService -> insertSalesHierarchy, fileteredLevels: ${JSON.stringify(fileDetails)}`);
        const response = await utilModel.insertSalesHierarchy(fileDetails);
        return response;
    },

    async insertMaterials(materials: string) {
        logger.info(`inside utilService -> insertMaterials, materials: ${materials}`);
        const response = await utilModel.insertMaterials(materials);
        return response;
    },

    async truncateMaterialMaster() {
        logger.info(`inside utilService -> insertMaterials`);
        const response = await utilModel.truncateMaterialMaster();
        return response;
    },

    async getRDDForAutoClosure(payload): Promise<GetRDDForAutoClosure[]> {
        /**
         * @description getRDDForAutoClosure
         * @param {Array} payload
         * @returns {Array | null} response
         * Among all the SOs in the payload, search in the DB for the RDDs of the SOs
         * If found, return the RDDs in the response
         * If not found, then calculate the RDD using the PDP settings and return the RDDs in the response
         */
        logger.info("inside utilService -> getRDDForAutoClosure");
        try {
            const finalResponse: GetRDDForAutoClosure[] = [];

            const soSet = new Set<string>();
            payload.forEach((element) => {
                element?.SO_DETAILS?.forEach(i => {
                    soSet.add(i.SALESORDER);
                });
            });
            const soList = Array.from(soSet);
            const response = await OrderModel.getAvailableRDDForAutoClosure(soList);
            const soRDDMap = new Map<string, string>();
            const dbStateMap = new Map<string, string>();
            response?.forEach((element) => {
                soRDDMap.set(element.so_number, element.rdd);
            });
            response?.forEach((element) => {
                dbStateMap.set(element.distributor_id, element.state_code);
            });


            for (let i = 0; i < payload.length; i++) {
                const soDetails = payload[i]?.SO_DETAILS;
                const distributorId = payload[i]?.SOLDTOPARTY;
                if (soDetails) {
                    for (let i = 0; i < soDetails.length; i++) {
                        const element = soDetails[i];
                        const soNumber = element.SALESORDER;
                        const rdd = soRDDMap.get(soNumber);
                        if (rdd) {
                            finalResponse.push({
                                so_number: soNumber,
                                rdd: rdd,
                                state_code: dbStateMap.get(distributorId) || null
                            });
                        } else {
                            const orderDate = element.ORDERDATE;
                            const so_date = new Date(orderDate);
                            const dbDetails = await UserService.fetchDistributorDetails(distributorId);
                            if (!dbDetails) {
                                continue;
                            }
                            const rddDetails = await RushOrderService.calculateUpcomingPDPDate(dbDetails, so_date, UpcomingPDPDateOutputType.AUTO_CLOSURE_RDD);
                            finalResponse.push({
                                so_number: soNumber,
                                rdd: rddDetails ? moment(rddDetails).format('YYYYMMDD') : null,
                                state_code: dbDetails?.region_code || null
                            });
                        }
                    }
                }

            }
            return finalResponse;
        } catch (error) {
            logger.error(`CAUGHT: Error in utilService -> getRDDForAutoClosure:`, error);
            return [];
        }
    },

};

