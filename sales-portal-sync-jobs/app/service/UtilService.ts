/**
 * @file util.service
 * @description defines util service methods
 */
import { ArsServiceApi } from '../helper/arsApi';
import UtilityFunctions from '../helper/utilityFunctions';
import logger from '../lib/logger';
import { UtilModel } from '../models/UtilModel';
import { LogService } from './LogService';
const env = process.env.NODE_ENV || 'dev';
const configuration = require(`../config/environments/${env}`);
const SapConfig = configuration.sap;
import { MT_ECOM_DEFAULT_PO_EXPIRY_DATE } from '../constant/constants';
import Helpers from '../helper/index';
import s3Helper from '../helper/s3Helper';
import { SyncType } from '../enums/syncType';
import fs from 'fs';
import path from 'path';
import commonHelper from '../helper/index';

export const UtilService = {
    async rorSync(days) {
        logger.info('Inside UtilService-> rorSync');
        const rorData = {};
        const distributors = await UtilModel.rorSync(days);
        if (distributors.rows && distributors.rows.length > 0) {
            for (const distributorId of distributors.rows) {
                const logSAPAPITime = process.hrtime();
                const fetchOpenSOResponse = await UtilityFunctions.fetchRorData(distributorId.distributor_id, days);
                const logSAPAPIEndTime = (logSAPAPITime[0] + logSAPAPITime[1] / 1e9 / 60).toFixed(3);
                logger.info(`ROR SYNC SAP API Time: ${logSAPAPIEndTime} seconds for distributor: ${distributorId.distributor_id}`);
                if (!fetchOpenSOResponse || fetchOpenSOResponse.status !== 200 || !fetchOpenSOResponse.data || !fetchOpenSOResponse.data.d || !fetchOpenSOResponse.data.d.results) {
                    logger.error(`sap api failed response: ${fetchOpenSOResponse.data || fetchOpenSOResponse}`);
                    return false;
                }
                const data = fetchOpenSOResponse.data.d.results;
                const soObject: { [key: string]: { itemData: object[] | null } } = {};
                for (const item of data) {
                    if (item.ROR && soObject[item.Sales_Order_Number]) {
                        soObject[item.Sales_Order_Number].itemData.push({
                            itemNumber: item.Sales_Order_Item,
                            material: item.Material_Number,
                            ror: item.ROR,
                            materialDescription: item.Material_Description.replace(/'/g, "''"),
                            qty: item.Sales_Order_QTY.trim(),
                            allocatedQty: item.Allocated_QTY.trim(),
                        });
                    } else {
                        soObject[item.Sales_Order_Number] = {
                            itemData: item.ROR
                                ? [
                                      {
                                          itemNumber: item.Sales_Order_Item,
                                          material: item.Material_Number,
                                          ror: item.ROR,
                                          materialDescription: item.Material_Description.replace(/'/g, ' '),
                                          qty: item.Sales_Order_QTY.trim(),
                                          allocatedQty: item.Allocated_QTY.trim(),
                                      },
                                  ]
                                : [],
                        };
                    }
                }
                logger.info(`UPDATE OPEN SO RESPONSE`);
                for (const value of Object.entries(soObject)) {
                    let orderData = distributorId.order_data;
                    orderData = orderData[`${value[0]}#false`] || orderData[`${value[0]}#true`];
                    let key: any = orderData ? (distributorId.order_data[`${value[0]}#false`] ? `${value[0]}#false` : `${value[0]}#true`) : null;
                    key = key ? key.split('#')[1] === 'true' : null;
                    if (orderData && value[1].itemData.length > 0) {
                        orderData['rorItemset'] = value[1].itemData;
                        rorData[value[0]] = {
                            order_data: orderData,
                            so_number: value[0],
                        };
                        if (!key) {
                            const data = {
                                distributorId: distributorId.distributor_id,
                                distributorName: distributorId.name,
                                email: [distributorId.dbemail, distributorId.tseemail],
                                po_number: orderData.PURCH_NO,
                            };
                            const mailResponse = await LogService.sendCreditCrunchNotification(data);
                            if (mailResponse) {
                                await UtilModel.updateRorMailFlag(value[0]);
                            }
                        }
                    }
                }
                const soList = JSON.stringify(Object.values(rorData));
                await UtilModel.insertBulkRorData(soList);
            }
            return true;
        } else {
            return false;
        }
    },

    async upsertDistributors(
        temp: [
            {
                Distributor: string;
                Name: string;
                City: string;
                Postal_code: string;
                Region: string;
                Region_Name: string;
                Customer_group: string;
                Description: string;
                Plant: string;
                Plant_description: string;
                group5: string;
                group5_description: string;
                TSE_Code: string;
                PDP_Day: string;
                Mobile_Number: string;
                E_mail_id: string;
                Market: string;
                Area_Code: string;
                Channel_Code: string;
                Reference_date: string;
                Sales_Org: string;
                Distribution_Channel: string;
                Division: string;
                LOB: string;
                Division_Desc: string;
                GRN_Type: string;
                Payer_Code: string;
                Payer_Name: string;
                NACH: string;
            },
        ],
    ) {
        logger.info(`DISTRIBUTORS DATA FORM SAP API: ${temp.length}`);
        let distributors: any = [];
        let regions: any = [];
        let groups: any = [];
        let plants: any = [];
        let group5s: any = [];
        let profiles: any = [];
        let distributorsWithPlants: any = [];
        let distributorsPlantsMOQ: any = [];
        let distributorsMap: object = {};
        const nourishcoDB = new Set();

        for (let j = 0; j < temp.length; j++) {
            const regionRow = {
                code: temp[j].Region ? temp[j].Region : '',
                description: temp[j].Region_Name ? temp[j].Region_Name : null,
            };

            const groupRow = {
                name: temp[j].Customer_group ? temp[j].Customer_group : '',
                description: temp[j].Description ? temp[j].Description : null,
            };

            const plantRow = {
                name: temp[j].Plant ? temp[j].Plant : '',
                description: temp[j].Plant_description ? temp[j].Plant_description : null,
            };

            const group5Row = {
                name: temp[j].group5 ? temp[j].group5 : '',
                description: temp[j].group5_description ? temp[j].group5_description : null,
                rsm_code: temp[j].group5 ? `RM${temp[j].group5}` : '',
                cluster_code: temp[j].group5 ? `CM${temp[j].group5.charAt(0)}R` : '',
            };

            const mobileNumber = temp[j].Mobile_Number ? temp[j].Mobile_Number.toString().replace(/[^0-9]/g, '') : '';

            let profileRow = {
                id: temp[j].Distributor,
                name: temp[j].Name ? temp[j].Name.replace(/'/g, "''") : '',
                email: temp[j].E_mail_id ? temp[j].E_mail_id.replace(/'/g, '') : 'noreply.pegasus@tataconsumer.com',
                mobile: mobileNumber.length <= 12 && mobileNumber.length >= 10 ? mobileNumber : null,
                type: 'DISTRIBUTOR',
            };

            if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'qa') {
                profileRow.email = process.env.TEST_DISTRIBUTOR_EMAIL || 'kiran.hebballi@tataconsumer.com';
                profileRow.mobile = process.env.TEST_DISTRIBUTOR_MOBILE || '9620214631';
            }

            if (regionRow.code) regions.push(regionRow);
            if (groupRow.name) groups.push(groupRow);
            if (plantRow.name) plants.push(plantRow);
            if (group5Row.name) group5s.push(group5Row);
            profiles.push(profileRow);
            distributorsMap[temp[j].Distributor] = true;
        }

        const filteredRegions = regions.filter((v, i, a) => a.findIndex((t) => t.code === v.code) === i);
        const filteredGroups = groups.filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);
        const filteredPlants = plants.filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);
        const filteredGroup5s = group5s.filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);
        const filteredProfiles = profiles.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

        regions = JSON.stringify(filteredRegions);
        groups = JSON.stringify(filteredGroups);
        plants = JSON.stringify(filteredPlants);
        group5s = JSON.stringify(filteredGroup5s);
        profiles = JSON.stringify(filteredProfiles);

        const regionsMapping = {};
        const groupsMapping = {};
        const plantsMapping = {};
        const group5sMapping = {};

        let { rows } = await UtilModel.upsertRegions(regions);
        logger.info(`REGION RESULT: ${rows ? rows.length : 'error'}`);
        for (const row of rows) {
            regionsMapping[row.code] = row.id;
        }

        ({ rows } = await UtilModel.upsertCustomerGroups(groups));
        logger.info(`GROUP RESULT: ${rows ? rows.length : 'error'}`);
        for (let row of rows) {
            groupsMapping[row.name] = row.id;
        }

        ({ rows } = await UtilModel.upsertPlants(plants));
        logger.info(`PLANT RESULT: ${rows ? rows.length : 'error'}`);
        for (const row of rows) {
            plantsMapping[row.name] = row.id;
        }

        ({ rows } = await UtilModel.upsertGroup5s(group5s));
        logger.info(`GROUP5 RESULT: ${rows ? rows.length : 'error'}`);
        for (let row of rows) {
            group5sMapping[row.name] = row.id;
        }

        const cfaData = UtilService.upsertCFADepotMapping(temp, rows);
        await UtilModel.upsertCFADepotMapping(cfaData);

        ({ rows } = await UtilModel.upsertProfiles(profiles));
        logger.info(`PROFILE RESULT: ${rows ? rows.length : 'error'}`);

        for (let j = 0; j < temp.length; j++) {
            const distributorRow = {
                id: temp[j].Distributor,
                profile_id: temp[j].Distributor,
                city: temp[j].City ? temp[j].City.toString().replace("'", "''") : null,
                postal_code: temp[j].Postal_code ? temp[j].Postal_code : null,
                region_id: temp[j].Region ? (regionsMapping[temp[j].Region] ? regionsMapping[temp[j].Region] : null) : null,
                group_id: temp[j].Customer_group ? (groupsMapping[temp[j].Customer_group] ? groupsMapping[temp[j].Customer_group] : null) : null,
                group5_id: temp[j].group5 ? (group5sMapping[temp[j].group5] ? group5sMapping[temp[j].group5] : null) : null,
                tse_code: temp[j].TSE_Code ? temp[j].TSE_Code : null,
                market: temp[j].Market ? temp[j].Market.toString().replace("'", "''") : null,
                area_code: temp[j].Area_Code ? temp[j].Area_Code : null,
                channel_code: temp[j].Channel_Code ? temp[j].Channel_Code : null,
                reference_date: temp[j].Reference_date && temp[j].Reference_date !== '00000000' ? temp[j].Reference_date : null,
                grn_type: temp[j].GRN_Type == 'Multiple' ? 'Multi GRN' : 'Single GRN',
                payer_code: temp[j].Payer_Code ? temp[j].Payer_Code.replace(/^0+/, '') : null,
                payer_name: temp[j].Payer_Name ? temp[j].Payer_Name.toString().replace(/'/g, "''") : null,
                nach_type: temp[j].NACH ? temp[j].NACH : null,
            };
            distributors.push(distributorRow);
        }

        const filteredDistributors = distributors.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
        const filteredDistributorsWithPlants = temp.filter(
            (v, i, a) =>
                a.findIndex(
                    (t) =>
                        t.Distributor === v.Distributor &&
                        t.Plant === v.Plant &&
                        t.Sales_Org === v.Sales_Org &&
                        t.Distribution_Channel === v.Distribution_Channel &&
                        t.Division === v.Division &&
                        t.LOB === v.LOB,
                ) === i,
        );

        for (const distributor of filteredDistributorsWithPlants) {
            //need to remove this check, as some dist records don't have plant but has sales area data, but there is foreign key constraint of not null on plant_id, so can't remove
            if (distributor.Plant) {
                const distributorHasPlantsRow = {
                    distributor_id: distributor.Distributor,
                    plant_id: plantsMapping[distributor.Plant] ? plantsMapping[distributor.Plant] : 0,
                    sales_org: distributor.Sales_Org ? distributor.Sales_Org : null,
                    distribution_channel: distributor.Distribution_Channel ? distributor.Distribution_Channel : null,
                    division: distributor.Division ? distributor.Division : null,
                    line_of_business: distributor.LOB ? distributor.LOB : null,
                    reference_date: distributor.Reference_date !== '00000000' ? distributor.Reference_date : null,
                    pdp_day: distributor.PDP_Day ? distributor.PDP_Day : null,
                    division_description: distributor.Division_Desc ? distributor.Division_Desc : null,
                };
                const distributorPlantsMOQRow = {
                    db_id: distributor.Distributor,
                    plant_id: plantsMapping[distributor.Plant] ? plantsMapping[distributor.Plant] : 0,
                };
                distributorsWithPlants.push(distributorHasPlantsRow);
                if (distributorPlantsMOQRow.plant_id !== 0) distributorsPlantsMOQ.push(distributorPlantsMOQRow);
                if (distributorHasPlantsRow.distribution_channel === '90') nourishcoDB.add(distributorHasPlantsRow.distributor_id);
            }
        }

        /**
         * If it is Nourishco DB and the channel_code is null then we are providing the default channel_code as 'P_DEF' (i.e. PORTAL_DEFAULT)
         * This is done to handle the following scenario(SOPE-3951):
         * When channel_code is null in distributor_master then as per logic on material search in order page all material from material_master(irrespective of appl_area_channel) + non-forecasted materials are shown.
         * In case of Nourishco DB, channel_code will be null and there is no B.Y. forecast. So showing all materials from material master is wrong.
         * In this case we will only show materials added in non-forecasted PSKU page.
         */
        /**
         * UPDATE ON CHANNEL CODE: SOPE-4375
         * Nourishco DB channel code updated to NCO (Nourishco) from P_DEF (Portal Default).
         * Because Nourishco Forecast file will have channel = "NCO"
         */
        const filteredDistributorsWithDefaultChannel = filteredDistributors?.map((d) => {
            if (!d.channel_code && nourishcoDB.has(d.id)) {
                d.channel_code = 'NCO';
            }
            return d;
        });

        distributors = JSON.stringify(filteredDistributorsWithDefaultChannel);
        distributorsWithPlants = JSON.stringify(distributorsWithPlants);
        distributorsPlantsMOQ = JSON.stringify(distributorsPlantsMOQ);

        const upsertDistributorsResponse = await UtilModel.upsertDistributors(distributors);
        logger.info(`DISTRIBUTORS RESULT: ${upsertDistributorsResponse ? upsertDistributorsResponse.rows : 'error'}`);

        const usetDistLiquidationFlagResponse = await UtilModel.setDistLiquidationFlag();
        logger.info(`DISTRIBUTORS LIQ SET: ${usetDistLiquidationFlagResponse ? usetDistLiquidationFlagResponse : 'error in LIQ set'}`);

        const setDistPDPFlagResponse = await UtilModel.setDistPDPFlag();
        logger.info(`DISTRIBUTORS PDP SET: ${setDistPDPFlagResponse ? setDistPDPFlagResponse : 'error in PDP set'}`);

        ({ rows } = await UtilModel.upsertDistributorPlants(distributorsWithPlants));
        logger.info(`DISTRIBUTORS HAS PLANTS RESULT: ${rows ? rows.length : 'error'}`);

        return { upsertDistributorsResponse, distributorsMap, distributorsPlantsMOQ };
    },

    async fetchDistributors() {
        return await UtilModel.fetchDistributors();
    },

    async removeDistributors(deletedCodes: string[]) {
        return await UtilModel.removeDistributors(deletedCodes);
    },
    async syncARSRelatedTables() {
        try {
            logger.info('Inside UtilService-> syncARSRelatedTables');
            ArsServiceApi.syncArsRelatedTables();
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in UtilService -> syncARSRelatedTables, Error = ', error);
            return false;
        }
    },
    upsertCFADepotMapping(dbData: any, group5_data: any[]) {
        const keySet: Set<string> = new Set();
        const cfaDepotPayload: object[] = [];
        dbData?.forEach((item: { group5?: string; Plant?: string; Sales_Org?: string; Distribution_Channel?: string; Division?: string }) => {
            if (
                UtilService.isValid(item.group5) &&
                UtilService.isValid(item.Plant) &&
                UtilService.isValid(item.Sales_Org) &&
                UtilService.isValid(item.Distribution_Channel) &&
                UtilService.isValid(item.Division)
            ) {
                const key = item?.['group5'] + '/' + item?.['Plant'] + '/' + item['Sales_Org'] + '/' + item?.['Distribution_Channel'] + '/' + item?.['Division'];
                if (!keySet.has(key)) {
                    const zoneData = group5_data.find((zoneData) => zoneData.name === item?.['group5']);
                    const zoneName = zoneData.description ?? false;
                    if (zoneName) {
                        cfaDepotPayload.push({
                            zone: zoneName,
                            depot_code: item?.['Plant'],
                            sales_org: item['Sales_Org'],
                            distribution_channel: item?.['Distribution_Channel'],
                            division: item?.['Division'],
                            group5_id: zoneData.id,
                        });
                        keySet.add(key);
                    }
                }
            }
        });
        if (cfaDepotPayload.length > 0) {
            const data = JSON.stringify(cfaDepotPayload);
            return data;
        }
    },
    async upsertSalesHierarchyDetails(
        temp: [
            {
                empInfo: {
                    personNav: {
                        phoneNav: {
                            results: [
                                {
                                    isPrimary: boolean;
                                    phoneNumber: string;
                                },
                            ];
                        };
                    };
                    jobInfoNav: {
                        results: [
                            {
                                customString21: string;
                            },
                        ];
                    };
                };
                manager: {
                    __metadata: {
                        uri: any;
                    };
                };
                userId: string;
                firstName: string;
                lastName: string;
                email: string;
                country: string;
            },
        ],
    ) {
        let salesHierarchyDetails: any = [];
        const salesHierarchyUsersMap: object = {};
        /*[{
            user_id: string | null,
            first_name: string | null,
            last_name: string | null,
            email: string | null,
            mobile_number: string | null,
            manager_id: string | null,
            code: string |
        }]*/

        const rolesFromDb = await UtilModel.getRoleByCode();
        const codeRoleMap = rolesFromDb.reduce((acc, item) => {
            acc[item.code] = item.role;
            return acc;
        }, {});
        logger.info(`Roles from DB: ${JSON.stringify(codeRoleMap)}`);

        for (let j = 0; j < temp.length; j++) {
            if (temp[j].country && temp[j].country !== '140') {
                continue;
            }
            let mobileNumber = null,
                code = null,
                role = 'TSE';
            const phoneNumbers = temp[j].empInfo.personNav.phoneNav.results;
            for (const phoneNumberDetails of phoneNumbers) {
                if (phoneNumberDetails.isPrimary) {
                    mobileNumber = phoneNumberDetails.phoneNumber.toString().replace(/[^0-9]/g, '');
                }
            }
            const salesCode = temp[j].empInfo.jobInfoNav.results;
            if (salesCode && salesCode[0]) {
                code = salesCode[0].customString21 ? salesCode[0].customString21.toString() : null;
            }

            if (code && codeRoleMap[code]) {
                role = codeRoleMap[code];
            }

            let managerId = temp[j].manager?.__metadata.uri ? temp[j].manager.__metadata.uri : null;

            if (managerId) {
                managerId = managerId.toString().match(/User\('\d+'\)/g);
                managerId = managerId && managerId.length ? managerId[0].toString().replace(/[^0-9]/g, '') : null;
            }

            const salesHierarchyDetailRow = {
                user_id: temp[j].userId ? temp[j].userId.toString() : '',
                first_name: temp[j].firstName ? temp[j].firstName.toString().replace(/'/g, "''") : null,
                last_name: temp[j].lastName ? temp[j].lastName.toString().replace(/'/g, "''") : null,
                email: temp[j].email ? temp[j].email.toString().replace(/'/g, '') : null,
                mobile_number: mobileNumber && mobileNumber.length <= 12 && mobileNumber.length >= 10 ? mobileNumber : null,
                manager_id: managerId,
                code,
                roles: role,
            };

            salesHierarchyDetails.push(salesHierarchyDetailRow);
            salesHierarchyUsersMap[temp[j].userId] = true;
        }

        salesHierarchyDetails = JSON.stringify(salesHierarchyDetails);
        const upsertSalesHierarchyDetailsResponse = await UtilModel.upsertSalesHierarchyDetails(salesHierarchyDetails);
        return { upsertSalesHierarchyDetailsResponse, salesHierarchyUsersMap };
    },

    async fetchSalesHierarchyDetails() {
        return await UtilModel.fetchSalesHierarchyDetails();
    },

    async removeSalesHierarchyDetails(deletedUserIds: string[]) {
        return await UtilModel.removeSalesHierarchyDetails(deletedUserIds);
    },

    async insertMaterials(
        temp: [
            {
                SKU_Code: any;
                SKU_Description: any;
                Sales_Unit: any;
                Product_hierarchy: any;
                Sales_Org: string;
                Distribution_Channel: string;
                Division: string;
                LOB: string;
                UOM: string;
                ConversionFactor: string;
                Product_hierarchy_code: string;
                BUOM_to_CS: string;
                PAK_to_CS: string;
                BRAND: string;
                BRAND_DESC: string;
                BRAND_VARIANT: string;
                BRAND_VARIANT_DESC: string;
                TON_to_SUOM: string;
                BUOM: string;
            },
        ],
        tempProductHierarchy: [
            {
                SKUGROUPHIERARCHYCODE: string;
                BRANDVARIANTHIERARCHYCODE: string;
                REGIONALBRANDHIERARCHYCODE: string;
                BRANDHIERARCHYCODE: string;
                VARIANTHIERARCHYCODE: string;
                PRODUCTHIERARCHYCODE: string;
                CATEGORYHIERARCHYCODE: string;
                SKUGROUPHIERARCHYDESC: string;
                BRANDVARIANTHIERARCHYDESC: string;
                REGIONALBRANDHIERARCHYDESC: string;
                BRANDHIERARCHYDESC: string;
                VARIANTHIERARCHYDESC: string;
                PRODUCTHIERARCHYDESC: string;
                CATEGORYHIERARCHYDESC: string;
                LAST_MODIFIED_DT: string;
            },
        ],
    ) {
        let materials: any = [];
        const materialsMap: object = {};
        let materialSalesData: any = [];
        let rows;

        /**
         * L1-Category - 2
         * L2-Product - 2
         * L3-Variant - 3
         * L4-Global Brand - 2
         * L5-Regional Brand Code - 3
         * L6-Regional Brand Variant - 3
         * L7-SKU Group Code - 3
         */

        const mappedProductHierarchy = new Map();
        tempProductHierarchy.forEach((item) => {
            mappedProductHierarchy.set(item.SKUGROUPHIERARCHYCODE, item);
        });

        /**This array is prepared for the data that needs to be inserted in material_master table */
        for (const element of temp) {
            const productHierarchyObj = mappedProductHierarchy.get(element.Product_hierarchy_code);
            const materialRow = {
                code: element.SKU_Code ? element.SKU_Code.toString() : '',
                description: element.SKU_Description ? element.SKU_Description.toString().replace("'", "''") : '',
                sales_unit: element.Sales_Unit ? element.Sales_Unit.toString() : null,
                pak_type: element.Product_hierarchy ? element.Product_hierarchy.toString() : null,
                product_hierarchy_code: element.Product_hierarchy_code ? element.Product_hierarchy_code.toString() : null,
                buom_to_cs: element.BUOM_to_CS && !isNaN(+element.BUOM_to_CS) ? +element.BUOM_to_CS : null,
                pak_to_cs: element.PAK_to_CS && !isNaN(+element.PAK_to_CS) ? +element.PAK_to_CS : null,
                brand: element.BRAND ? element.BRAND : null,
                brand_desc: element.BRAND_DESC ? element.BRAND_DESC : null,
                brand_variant: element.BRAND_VARIANT ? element.BRAND_VARIANT : null,
                brand_variant_desc: element.BRAND_VARIANT_DESC ? element.BRAND_VARIANT_DESC : null,
                ton_to_suom: element.TON_to_SUOM && !isNaN(+element.TON_to_SUOM) ? +element.TON_to_SUOM : null,
                buom: element.BUOM ?? null,
                global_brand: productHierarchyObj?.BRANDHIERARCHYCODE ? productHierarchyObj?.BRANDHIERARCHYCODE : null,
                global_brand_desc: productHierarchyObj?.BRANDHIERARCHYDESC ? productHierarchyObj?.BRANDHIERARCHYDESC : null,
                variant: productHierarchyObj?.VARIANTHIERARCHYCODE ? productHierarchyObj?.VARIANTHIERARCHYCODE : null,
                variant_desc: productHierarchyObj?.VARIANTHIERARCHYDESC ? productHierarchyObj?.VARIANTHIERARCHYDESC : null,
                product: productHierarchyObj?.PRODUCTHIERARCHYCODE ? productHierarchyObj?.PRODUCTHIERARCHYCODE : null,
                product_desc: productHierarchyObj?.PRODUCTHIERARCHYDESC ? productHierarchyObj?.PRODUCTHIERARCHYDESC : null,
                category: productHierarchyObj?.CATEGORYHIERARCHYCODE ? productHierarchyObj?.CATEGORYHIERARCHYCODE : null,
                category_desc: productHierarchyObj?.CATEGORYHIERARCHYDESC ? productHierarchyObj?.CATEGORYHIERARCHYDESC : null,
            };
            const materialExists = materials.filter((item) => item.code == materialRow.code);
            if (materialExists.length == 0) {
                materials.push(materialRow);
                materialsMap[element.SKU_Code] = true;
            }
        }

        const filteredMaterialSalesData = temp.filter(
            (v, i, a) =>
                a.findIndex(
                    (t) =>
                        t.SKU_Code === v.SKU_Code &&
                        t.Sales_Org === v.Sales_Org &&
                        t.Distribution_Channel === v.Distribution_Channel &&
                        t.Division === v.Division &&
                        t.LOB === v.LOB,
                ) === i,
        );

        /**This array is prepared for the data that needs to be inserted in material_sales_details table */
        for (const material of filteredMaterialSalesData) {
            const material_sales = {
                material_code: material.SKU_Code,
                sales_org: material.Sales_Org ? material.Sales_Org : null,
                distribution_channel: material.Distribution_Channel ? material.Distribution_Channel : null,
                division: material.Division ? material.Division : null,
                line_of_business: material.LOB ? material.LOB : null,
                unit_of_measurement: material.UOM ? material.UOM : null,
                conversion_factor: material.ConversionFactor ? material.ConversionFactor : null,
            };
            materialSalesData.push(material_sales);
        }

        materials = JSON.stringify(materials);
        materialSalesData = JSON.stringify(materialSalesData);

        const insertMaterialsResponse = await UtilModel.insertMaterials(materials);

        ({ rows } = await UtilModel.insertMaterialSalesData(materialSalesData));
        logger.info(`MATERIAL SALES DETAILS RESULT: ${rows ? rows.length : 'error'}`);

        return { insertMaterialsResponse, materials, materialsMap };
    },

    async updateSearchTextField() {
        return await UtilModel.updateSearchTextField();
    },
    isValid(data) {
        return !(data == null || data == '' || data == 0);
    },

    async getAppLevelConfigurations() {
        logger.info('Inside UtilService-> getAppLevelConfigurations');
        return await UtilModel.getAppLevelConfigurations();
    },

    async inventorySyncOrchestration() {
        let PSKU_DIST_INVENTORY = false;
        try {
            logger.info('inside UtilService -> inventorySyncOrchestration');
            let fileToProcess = SapConfig.distributorInventorySyncFilePrefix;
            const nourishcoFileToProcess = env === 'prod' ? SapConfig.nourishcoPlanningSyncFilePrefix : `${env}_${SapConfig.nourishcoPlanningSyncFilePrefix}`;
            let forecastFileName: string = '';
            let nourishcoForecastFileName: string = '';
            let tempFileName: string[] = [];
            let forecastFile = [];
            let nourishcoForecastFile = [];

            // ================ Fetching latest B.Y. forecast file ========================
            const app_level_settings = await UtilService.getAppLevelConfigurations();
            if (app_level_settings && app_level_settings.rows.length > 0) {
                for (const appConfig of app_level_settings.rows) {
                    if (appConfig.key === 'ENABLE_PSKU' && appConfig.value === 'YES') {
                        fileToProcess = SapConfig.distributorInventorySyncPSKUFilePrefix;
                        PSKU_DIST_INVENTORY = true;
                    }
                }
            }
            const latestForecastFile = await s3Helper.findLatestFileInS3Bucket(SyncType.PSKU_DIST_INVENTORY, fileToProcess);
            if (!latestForecastFile) {
                logger.info(`inside UtilService -> inventorySyncOrchestration: No file found in S3 bucket for ${fileToProcess}`);
                if (PSKU_DIST_INVENTORY) {
                    LogService.insertSyncLog('PSKU_DIST_INVENTORY', 'FAIL', null, null, `No file found in S3 bucket for ${fileToProcess}`);
                } else {
                    LogService.insertSyncLog('DIST_INVENTORY', 'FAIL', null, null, `No file found in S3 bucket for ${fileToProcess}`);
                }
            } else {
                tempFileName = latestForecastFile?.Key?.split('/') ?? [];
                forecastFileName = tempFileName[tempFileName.length - 1];
                const forecastFileResponse = await s3Helper.readFromS3(SyncType.PSKU_DIST_INVENTORY, fileToProcess, latestForecastFile);
                forecastFile = forecastFileResponse?.S3Response ?? [];
            }

            // ========================= Fetching latest Nourishco forecast file =======================
            const latestNourishcoForecastFile = await s3Helper.findLatestFileInS3Bucket(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess);
            if (!latestNourishcoForecastFile) {
                logger.info(`inside UtilService -> inventorySyncOrchestration: No file found in S3 bucket for ${nourishcoFileToProcess}`);
                LogService.insertSyncLog('NOURISHCO_PLANNING_SYNC', 'FAIL', null, null, `No file found in S3 bucket for ${nourishcoFileToProcess}`);
            } else {
                tempFileName = latestNourishcoForecastFile?.Key?.split('/') ?? [];
                nourishcoForecastFileName = tempFileName[tempFileName.length - 1];
                const nourishcoForecastFileResponse = await s3Helper.readFromS3(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess, latestNourishcoForecastFile);
                nourishcoForecastFile = nourishcoForecastFileResponse?.S3Response ?? [];
            }

            // =================== Combining B.Y. forecast and Nourishco forecast for processing ====================
            const combinedForecast = [...forecastFile, ...nourishcoForecastFile];
            const syncResult = await UtilService.mapProductsToDistributors(combinedForecast);
            if (syncResult && !isNaN(syncResult)) {
                const response = {
                    upsertCount: syncResult,
                    deleteCount: 0,
                };
                if (PSKU_DIST_INVENTORY) {
                    LogService.insertSyncLog('PSKU_DIST_INVENTORY', 'SUCCESS', response, null, null, forecastFileName);
                } else {
                    LogService.insertSyncLog('DIST_INVENTORY', 'SUCCESS', response, null, null, forecastFileName);
                }
                LogService.insertSyncLog('NOURISHCO_PLANNING_SYNC', 'SUCCESS', response, null, null, nourishcoForecastFileName);
                return syncResult;
            }
            if (PSKU_DIST_INVENTORY) {
                LogService.insertSyncLog('PSKU_DIST_INVENTORY', 'FAIL');
            } else {
                LogService.insertSyncLog('DIST_INVENTORY', 'FAIL');
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in UtilService -> inventorySyncOrchestration, Error = ', error);
            if (PSKU_DIST_INVENTORY) LogService.insertSyncLog('PSKU_DIST_INVENTORY', 'FAIL', null, null, `Technical error in distributor inventory sync: ${error}`);
            else LogService.insertSyncLog('DIST_INVENTORY', 'FAIL', null, null, `Technical error in distributor inventory sync: ${error}`);
            LogService.insertSyncLog('NOURISHCO_PLANNING_SYNC', 'FAIL', null, null, `Technical error in distributor inventory sync: ${error}`);
            return null;
        }
    },

    async mapProductsToDistributors(temp) {
        const productAreaMapping: {
            [key: string]: {
                code: string;
                appl_area_channel: object[] | null;
                start_date: string | null;
            };
        } = {};
        const currentMonth = new Date().getMonth();
        const { parentSKU, month, area, channel } = SapConfig.distributorInventorySyncFields;

        logger.info(`Total no. of rows from file : ${temp && temp.length}`);

        for (const data of temp) {
            if (!data[parentSKU]) continue;
            if (data[month]) data[month] = new Date(data[month]);
            if (data[channel] === 'NCO' && data[month] > new Date()) continue;
            else if (data[channel] !== 'NCO' && data[month] && data[month].getMonth() !== currentMonth) continue;

            if (productAreaMapping[data[parentSKU]]) {
                const mappedObj = productAreaMapping[data[parentSKU]];
                if (data[channel] && data[area]) {
                    if (mappedObj.appl_area_channel) {
                        if (!mappedObj.appl_area_channel.some((obj: { area: string; channel: string }) => obj.area === data[area] && obj.channel === data[channel])) {
                            mappedObj.appl_area_channel.push({
                                area: data[area],
                                channel: data[channel],
                            });
                        }
                    } else {
                        mappedObj.appl_area_channel = [
                            {
                                area: data[area],
                                channel: data[channel],
                            },
                        ];
                    }
                }
                if (mappedObj.start_date && data[month] && new Date(mappedObj.start_date) > new Date(data[month])) {
                    mappedObj.start_date = data[month].toISOString();
                }
            } else {
                productAreaMapping[data[parentSKU]] = {
                    code: data[parentSKU].toString(),
                    appl_area_channel:
                        data[channel] && data[area]
                            ? [
                                  {
                                      area: data[area],
                                      channel: data[channel],
                                  },
                              ]
                            : null,
                    start_date: data[month] ? data[month].toISOString() : null,
                };
            }
        }
        const productToAreasMapping = JSON.stringify(Object.values(productAreaMapping));
        return await UtilModel.mapProductsToDistributors(productToAreasMapping);
    },

    async updateOpenSO(
        soDetails: [
            {
                SO_Value: string;
                Delivery_Number: string;
                Invoice_Number: string;
                Status: string;
                Sales_Order_Number: string;
                Sales_Order_Item: string;
                Material_Number: string;
                Material_Description: string;
                Sales_Order_QTY: string;
                ROR: string;
                Allocated_QTY: string;
            },
        ],
        distributorId: string,
    ) {
        const soObject: { [key: string]: { so_value: string | null; delivery_no: string[] | null; invoice_no: string[] | null; status: string; so_number: string | null } } = {};
        const rorObject: { [key: string]: { so_number: string | null; itemData: object[] | null } } = {};

        for (const so of soDetails) {
            if (soObject[so.Sales_Order_Number]) {
                if (so.Delivery_Number && !soObject[so.Sales_Order_Number].delivery_no.includes(so.Delivery_Number)) {
                    soObject[so.Sales_Order_Number].delivery_no.push(so.Delivery_Number);
                }
                if (so.Invoice_Number && !soObject[so.Sales_Order_Number].invoice_no.includes(so.Invoice_Number)) {
                    soObject[so.Sales_Order_Number].invoice_no.push(so.Invoice_Number);
                }
                if (so.ROR) {
                    rorObject[so.Sales_Order_Number].itemData.push({
                        itemNumber: so.Sales_Order_Item,
                        material: so.Material_Number,
                        ror: so.ROR,
                        materialDescription: so.Material_Description,
                        qty: so.Sales_Order_QTY.trim(),
                        allocatedQty: so.Allocated_QTY.trim(),
                    });
                }
            } else {
                soObject[so.Sales_Order_Number] = {
                    so_value: so.SO_Value ? so.SO_Value : null,
                    delivery_no: so.Delivery_Number ? [so.Delivery_Number] : [],
                    invoice_no: so.Invoice_Number ? [so.Invoice_Number] : [],
                    status: so.Status ? so.Status.toUpperCase() : 'NOT DELIVERED',
                    so_number: so.Sales_Order_Number,
                };

                // ROR Object
                rorObject[so.Sales_Order_Number] = {
                    so_number: so.Sales_Order_Number,
                    itemData: so.ROR
                        ? [
                              {
                                  itemNumber: so.Sales_Order_Item,
                                  material: so.Material_Number,
                                  ror: so.ROR,
                                  materialDescription: so.Material_Description,
                                  qty: so.Sales_Order_QTY.trim(),
                                  allocatedQty: so.Allocated_QTY.trim(),
                              },
                          ]
                        : [],
                };
            }
        }
        logger.info(`ror object`, rorObject);
        logger.info(`so details`, soDetails);
        logger.info(`soObject: ${JSON.stringify(soObject)}`);
        const soList = JSON.stringify(Object.values(soObject));
        const updateOpenSOResponse = await UtilModel.updateOpenSO(soList, distributorId);
        Object.entries(rorObject).forEach(async (value) => {
            const orderData: any = await UtilModel.getOrderData(value[0]);
            if (orderData.rows.length > 0 && value[1]?.itemData.length > 0) {
                orderData.rows[0].order_data['rorItemset'] = value[1].itemData;
                await UtilModel.insertRorData(orderData.rows[0].order_data, value[0]);
            }
        });
        return updateOpenSOResponse;
    },

    runDbSyncProc(uuid: string) {
        return UtilModel.runDbSyncProc(uuid);
    },
    runMaterialSyncProc(uuid: string) {
        return UtilModel.runMaterialSyncProc(uuid);
    },
    runSalesHierarchySyncProc(uuid: string) {
        return UtilModel.runSalesHierarchySyncProc(uuid);
    },

    syncProcedureStatus(uuid: string, syncType: string) {
        return UtilModel.syncProcedureStatus(uuid, syncType);
    },
    async upsertDistributorMOQ(distributorsPlantsMOQ) {
        const upsertMOQDbMappingResponse = await UtilModel.upsertMOQDbMapping(distributorsPlantsMOQ);
        logger.info(`MOQ_DB_MAPPING TABLE UPDATE RESULT: ${upsertMOQDbMappingResponse ? upsertMOQDbMappingResponse : 'error'}`);
    },

    async unlockNewDbsInPDPUnlockRequestWindow() {
        logger.info('inside UtilService -> unlockNewDbsInPDPUnlockRequestWindow');

        const unlockNewDbsInPDPUnlockRequestWindowResponse = await UtilModel.unlockNewDbsInPDPUnlockRequestWindow();
        if (unlockNewDbsInPDPUnlockRequestWindowResponse === null) {
            logger.error(`Error in unlocking new distributors in PDP unlock request window`);
            return false;
        } else {
            logger.info(`Unlocked new distributors in PDP unlock request window response, count: ${unlockNewDbsInPDPUnlockRequestWindowResponse}`);
            return true;
        }
    },

    async enableROandBOforNewDbs() {
        logger.info('inside UtilService -> enableROandBOforNewDbs');
        const enableROandBOforNewDbsResponse = await UtilModel.enableROandBOforNewDbs();
        if (enableROandBOforNewDbsResponse === null) {
            logger.error(`Failed to enable RO and BO for new distributors`);
            return false;
        } else {
            logger.info(`Enabled RO and BO for new distributors response, count: ${enableROandBOforNewDbsResponse}`);
            return true;
        }
    },

    async disableNourishcoDbsPDP() {
        logger.info('inside UtilService -> disableNourishcoDbsPDP');
        const disableNouricoDbsPDPResponse = await UtilModel.disableNourishcoDbsPDP();
        if (disableNouricoDbsPDPResponse === null) {
            logger.error(`Failed to disable PDP of nourishco distributors`);
            return false;
        } else {
            logger.info(`Disabled PDP of nourishco distributors, count: ${disableNouricoDbsPDPResponse}`);
            return true;
        }
    },

    async setEmptyDistributorEmails() {
        logger.info('inside UtilService -> setEmptyDistributorEmails');
        try {
            const emptyEmailDistributorResponse = await UtilModel.fetchDistributorEmails(true);
            if (emptyEmailDistributorResponse === null) {
                logger.error(`inside UtilService -> setEmptyDistributorEmails, Error in fetching empty distributor emails`);
                return false;
            }

            const dbsUpdated: string[] = [];
            const dbsNotUpdated: string[] = [];
            for (const distributor of emptyEmailDistributorResponse) {
                try {
                    const updateResponse = await UtilModel.setEmptyDistributorEmail(distributor.id, distributor.tse_code);
                    if (updateResponse) dbsUpdated.push(distributor.id);
                    else dbsNotUpdated.push(distributor.id);
                } catch (error) {
                    logger.error(`Error in setting empty distributor emails, distributorId: ${distributor.id}, error: ${error}`);
                    dbsNotUpdated.push(distributor.id);
                }
            }

            logger.info('inside UtilService -> setEmptyDistributorEmails, dbsUpdated: ' + dbsUpdated.toString());
            logger.info('inside UtilService -> setEmptyDistributorEmails, dbsNotUpdated: ' + dbsNotUpdated.toString());
            return true;
        } catch (error) {
            logger.error(`Error in setting empty distributor emails, error: ${error}`);
            return false;
        }
    },
    async mtEcomSoSync(date,customerCode) {
        logger.info('inside UtilService -> mtEcomSoSync');
        try {
            const exclusionCustomerCodes = await UtilModel.fetchExclusionCustomerCodes();
            const exclusionCodes = exclusionCustomerCodes?.map((obj) => obj.customer_code) || [];
            const customerCodes = await UtilModel.fetchCustomerCodes();
            const filteredCustomerCodes = customerCodes?.filter((customer) => !exclusionCodes.includes(customer.customer_code)) || [];
            if (!customerCodes || !customerCodes?.length) {
                logger.error('Error in fetching customer codes');
                return false;
            }

            const defaultExpiryDate = await UtilModel.getConfigurationValue(MT_ECOM_DEFAULT_PO_EXPIRY_DATE);
            if (customerCode){
                const soData = await UtilityFunctions.fetchMTOpenSO(customerCode,date);
                return soData;
            }
            else{
                for (const customerCode of filteredCustomerCodes) {
                const soData = await UtilityFunctions.fetchMTOpenSO(customerCode,date);
                if (!soData || !soData?.data?.d?.results?.length) {
                    logger.info(`No Data for customer code ${customerCode?.customer_code} in mtEcomSoSync`);
                    continue;
                }
                const header = [];
                const item = [];
                for (const items of soData?.data?.d?.results) {
                    try {
                        let itemData = [];
                        let poDate;
                        try {
                            poDate = new Date(items.PO_Date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0];
                        } catch (e) {
                            logger.error('Exception in mtEcomSoSync.poDate', e);
                            continue;
                        }

                        const headerData = {
                            po_created_date: poDate,
                            delivery_date:
                                items.PO_Expiry_Date !== '00000000'
                                    ? new Date(items.PO_Expiry_Date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0]
                                    : new Date(new Date(poDate).getTime() + defaultExpiryDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            so_created_date: new Date(items.Created_on.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0],
                            po_number: items.PO_Number,
                            so_number: '0' + items.SO_Number,
                            // invoice_number: items.Invoice_Number || [],
                            status: items.PO_Status,
                            customer: items.Customer_Name,
                            customer_code: items.Customer.replace(/^0+/, ''),
                        };
                        header.push(headerData);
                        itemData = items?.NAV_ITEMS?.results?.map((item) => ({
                            item_number: String(Math?.floor(parseInt(item?.ItemNumber) / 10))?.padStart(5, '0'),
                            plant_code: parseInt(item?.Depot_Code || 0),
                            plant_name: item?.Depot_Name,
                            system_sku_code: parseInt(item?.SKU_Code),
                            system_sku_description: item?.SKU_Description,
                            psku_code: item?.Parent_Code ? parseInt(item?.Parent_Code) : 0,
                            psku_description: item?.Parent_Description || '',
                            mrp: parseFloat(String(item?.Seller_MRP).trim()).toFixed(2) || 0,
                            caselot: parseFloat(String(item?.CaseSize).trim()).toFixed(2) || 0,
                            sales_order: '0' + items?.SO_Number,
                            sales_unit: item?.Buyer_UOM,
                            response_item_number: item?.ItemNumber?.replace(/^0+/, ''),
                            message: item?.ROR,
                            so_qty: parseInt(parseFloat(item?.PO_Qty || 0)?.toString()),
                            target_qty: parseInt(parseFloat(item?.PO_Qty || 0)?.toString()),
                            uom: item?.Buyer_UOM || 'CV',
                            allocated_qty: parseInt(parseFloat(item?.Allocated_Qty || 0)?.toString()),
                            customer_product_id: item?.Article_Code || '',
                            po_item_description: item?.Article_Description || '',
                        }));
                        item.push(itemData);
                    } catch (e) {
                        logger.error('Exception in mtEcomSoSync', e);
                        continue;
                    }
                    await UtilModel.soSyncData({
                        headerData: header,
                        itemData: item,
                    });
                }
            }
            return true;
            }  
        } catch (error) {
            logger.error('MT ECOM SO SYNC ERROR: ', error);
            return false;
        }
    },

    async previousProcessCalender() {
        logger.info('inside UtilService -> previousProcessCalender');
        const response = await UtilModel.previousProcessCalender();
        return response;
    },

    async nourishcoPlanningSync(file) {
        logger.info('inside UtilService -> nourishcoPlanningSync');
        try {
            const filePrefix = SapConfig.nourishcoPlanningSyncFilePrefix;

            // validate file is .csv
            if (!file.originalname.endsWith('.csv')) return 'Uploaded file is not a csv file';

            /**
             * change the file name to 'NOURISHCO_PLANNING_SYNC_YYYYMMDDHHMMSS.csv' format
             * Rename is necessary because, file name has to start with the prefix 'NOURISHCO_PLANNING_SYNC_' and has to be a csv file.
             */
            const fileName: string =
                env === 'prod'
                    ? `${filePrefix}_${new Date()
                          .toISOString()
                          .replace(/[-:.TZ]/g, '')
                          .slice(0, 14)}.csv`
                    : `${env}_${filePrefix}_${new Date()
                          .toISOString()
                          .replace(/[-:.TZ]/g, '')
                          .slice(0, 14)}.csv`;
            const newFilePath = path.join(file.destination, fileName);
            await fs.promises.rename(file.path, newFilePath);
            // Update the file object to reflect the new file path
            file.path = newFilePath;

            const jsonData = await Helpers.convertExcelToJson(file, true);
            if (!jsonData || Object.keys(jsonData).length === 0) return 'Uploaded file is empty or not in correct format';
            const fileData = jsonData[Object.keys(jsonData)[0]];
            logger.info(`UtilService -> nourishcoPlanningSync: Total no. of rows from file : ${fileData?.length}`);
            const isValid = this.validateNourishcoPlanningData(fileData);
            if (!isValid.valid) {
                logger.error(`Error in nourishcoPlanningSync: ${isValid.error}`);
                return isValid.error;
            }
            const buffer = fs.readFileSync(file.path);
            await s3Helper.writeToS3(SyncType.NOURISHCO_PLANNING_SYNC, fileName, buffer);
            UtilService.inventorySyncOrchestration();
            return true;
        } catch (error) {
            logger.error('CAUGHT:Error in UtilService -> nourishcoPlanningSync', error);
            return false;
        } finally {
            fs.unlink(file.path, (err) => {
                if (err) {
                    logger.error('Error in UtilService -> nourishcoPlanningSync ->  deleting file: ', err);
                } else {
                    logger.info('UtilService -> nourishcoPlanningSync -> file deleted successfully' + file.path);
                }
            });
        }
    },

    validateNourishcoPlanningData(fileData): {
        valid: boolean;
        error: string | null;
    } {
        /**
         * VALIDATIONS APPLIED:
         * 1. Check if the file is empty or not.
         * 2. Check if the file has the required headers("PARENT_SKU", "CHANNEL", "MONTH", "AREA")
         * 3. Mandatory fields are not empty.
         * 4. File name should be in the format "NOURISHCO_PLANNING_SYNC_YYYYMMDDHHMMSS.csv"
         * 5. File has to be .csv file.
         */

        const requiredHeaders = [
            SapConfig.distributorInventorySyncFields.parentSKU,
            SapConfig.distributorInventorySyncFields.channel,
            SapConfig.distributorInventorySyncFields.month,
            SapConfig.distributorInventorySyncFields.area,
        ];

        if (!fileData || fileData.length === 0) {
            return {
                valid: false,
                error: 'File is empty',
            };
        }

        const headers = Object.keys(fileData[0]);
        if (!requiredHeaders.every((header) => headers.includes(header))) {
            return {
                valid: false,
                error: 'File does not contain the required headers',
            };
        }

        for (const row of fileData) {
            for (const header of requiredHeaders) {
                if (!row[header]) {
                    return {
                        valid: false,
                        error: `Mandatory field "${header}" is empty`,
                    };
                }
            }
        }
        return {
            valid: true,
            error: null,
        };
    },

    async downloadNourishcoForecastFile() {
        logger.info('inside UtilService -> downloadNourishcoForecastFile');
        try {
            const nourishcoFileToProcess = env === 'prod' ? SapConfig.nourishcoPlanningSyncFilePrefix : `${env}_${SapConfig.nourishcoPlanningSyncFilePrefix}`;
            const latestNourishcoForecastFile = await s3Helper.findLatestFileInS3Bucket(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess);
            if (!latestNourishcoForecastFile) {
                logger.info(`inside UtilService -> downloadNourishcoForecastFile: No file found in S3 bucket for ${nourishcoFileToProcess}`);
            } else {
                const bucketDetails = s3Helper.getBucketDetails(SyncType.NOURISHCO_PLANNING_SYNC);
                if (!bucketDetails?.bucket || !latestNourishcoForecastFile?.Key) {
                    return null;
                }
                const downloadUrl = await s3Helper.createSignedUrl(bucketDetails?.bucket, latestNourishcoForecastFile?.Key);
                // const nourishcoForecastFileResponse = await s3Helper.readFromS3(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess, latestNourishcoForecastFile);
                return downloadUrl;
            }
        } catch (error) {
            logger.error('CAUGHT:Error in UtilService -> downloadNourishcoForecastFile', error);
            return null;
        }
    },

    async appendMissingNourishcoForecastData() {
        /**
         * SOPE-4378: This job checks which are the Nourishco PSKU x Area combinations not present in NourishCo Forecast file and appends them to the file.
         * The file is then uploaded to S3 and the inventory sync orchestration is triggered.
         */
        logger.info('inside UtilService -> appendMissingNourishcoForecastData');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); // Get the current year
        // Format the date as '01-MMM-YY'
        const formattedDate = `01-${currentDate.toLocaleString('default', { month: 'short' })}-${String(currentYear).slice(-2)}`;

        const { parentSKU, month, area, channel, skuDescription } = SapConfig.distributorInventorySyncFields;
        let fileResult: { fileName: string; filePath: string } | null = null;

        try {
            const areaPskuCombinations = await UtilModel.getAllNourishcoPSKUAreaCombinations();
            if (!areaPskuCombinations || areaPskuCombinations.length === 0) {
                logger.info('No area psku combinations found in the database.');
                return false;
            }
            const nourishcoFileToProcess = env === 'prod' ? SapConfig.nourishcoPlanningSyncFilePrefix : `${env}_${SapConfig.nourishcoPlanningSyncFilePrefix}`;
            const latestNourishcoForecastFile = await s3Helper.findLatestFileInS3Bucket(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess);
            if (!latestNourishcoForecastFile) {
                logger.info(`inside UtilService -> appendMissingNourishcoForecastData: No file found in S3 bucket for ${nourishcoFileToProcess}`);
                return false;
            } else {
                const tempFileName = latestNourishcoForecastFile?.Key?.split('/') ?? [];
                const nourishcoForecastFileName = tempFileName[tempFileName.length - 1];
                const nourishcoForecastFileResponse = await s3Helper.readFromS3(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoFileToProcess, latestNourishcoForecastFile);
                let nourishcoForecastFile = nourishcoForecastFileResponse?.S3Response ?? [];
                nourishcoForecastFile.forEach((i) => (i[parentSKU] = i[parentSKU]?.toString()));
                nourishcoForecastFile = nourishcoForecastFile.filter((i) => i[parentSKU] !== undefined && i[parentSKU] !== '0' && i[parentSKU] !== null && i[parentSKU] !== '');
                const allPSKUAreaMap = new Map();
                const missingCombinations: object[] = [];
                const forecastedPSKUAreaMap = new Map();
                const forecastedPSKU = new Set();
                const forecastedAreaCodes = new Set();
                const allPSKU = new Set();
                const allAreaCodes = new Set();
                areaPskuCombinations.forEach((item) => {
                    const key = `${item.code}_${item.area_code}`;
                    allPSKUAreaMap.set(key, item);
                    allPSKU.add(item.code);
                    allAreaCodes.add(item.area_code);
                });
                nourishcoForecastFile.forEach((item) => {
                    const key = `${item[parentSKU]}_${item[area]}`;
                    forecastedPSKUAreaMap.set(key, item);
                    forecastedPSKU.add(item[parentSKU]);
                    forecastedAreaCodes.add(item[area]);
                });
                allPSKUAreaMap.forEach((item, key) => {
                    if (!forecastedPSKUAreaMap.has(key) && (!forecastedPSKU.has(item.code) || !forecastedAreaCodes.has(item.area_code))) {
                        missingCombinations.push({
                            [parentSKU]: item.code,
                            [skuDescription]: item.description,
                            [area]: item.area_code,
                            [month]: formattedDate,
                            [channel]: 'NCO',
                        });
                    }
                });
                if (missingCombinations.length === 0) {
                    logger.info('No missing combinations found in the forecast file.');
                    return true;
                } else {
                    logger.info('inside UtilService -> appendMissingNourishcoForecastData: Missing combinations found in the forecast file.', missingCombinations);
                    nourishcoForecastFile.push(...missingCombinations);
                    fileResult = commonHelper.createCsvFile(nourishcoForecastFile, nourishcoForecastFileName);
                    if (fileResult) {
                        const buffer = fs.readFileSync(fileResult?.filePath);
                        await s3Helper.writeToS3(SyncType.NOURISHCO_PLANNING_SYNC, nourishcoForecastFileName, buffer);
                        UtilService.inventorySyncOrchestration();
                        return true;
                    }
                }
            }
            return true;
        } catch (error) {
            logger.error('CAUGHT:Error in UtilService -> appendMissingNourishcoForecastData', error);
            return false;
        } finally {
            if (fileResult)
                fs.unlink(fileResult?.filePath, (err) => {
                    if (err) {
                        logger.error('Error in UtilService -> appendMissingNourishcoForecastData ->  deleting file: ', err);
                    } else {
                        logger.info('UtilService -> appendMissingNourishcoForecastData -> file deleted successfully' + fileResult?.filePath);
                    }
                });
        }
    },

    async syncPDDUnlockWindowRegions() {
        logger.info('inside UtilService -> syncPDDUnlockWindowRegions');
        const response = await UtilModel.syncPDDUnlockWindowRegions();
        return response;
    }

};
