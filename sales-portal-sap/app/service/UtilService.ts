/**
 * @file util.service
 * @description defines util service methods
*/
import UtilityFunctions from '../helper/utilityFunctions';
import logger from '../lib/logger';
import { UtilModel } from '../models/UtilModel';
import { mdmTransformer } from '../transformer/mdmTransformer';
import { LogService } from './LogService';
import * as workerThread from 'worker-thread';
import { LogModel } from '../models/LogModel';
import { AutoClosureAuditTables } from '../../enum/autoClosureAuditTables';
import { AutoClosureLogs} from '../interface/autoClosureInterfaces';

const env = process.env.NODE_ENV || 'dev';
const configuration = require(`../config/environments/${env}`);
const SapConfig = configuration.sap;

export const UtilService = {
    async insertMaterials(
        temp: [{
            SKU_Code: any,
            SKU_Description: any,
            Sales_Unit: any,
            Product_hierarchy: any,
            Sales_Org: string,
            Distribution_Channel: string,
            Division: string,
            LOB: string,
            UOM: string,
            ConversionFactor: string,
            Product_hierarchy_code: string,
            BUOM_to_CS: string,
            PAK_to_CS: string,
            BRAND: string,
            BRAND_DESC: string,
            BRAND_VARIANT: string,
            BRAND_VARIANT_DESC: string,
            TON_to_SUOM: string,
            BUOM: string,
        }],
        tempProductHierarchy: [{
            SKUGROUPHIERARCHYCODE: string,
            BRANDVARIANTHIERARCHYCODE: string,
            REGIONALBRANDHIERARCHYCODE: string,
            BRANDHIERARCHYCODE: string,
            VARIANTHIERARCHYCODE: string,
            PRODUCTHIERARCHYCODE: string,
            CATEGORYHIERARCHYCODE: string,
            SKUGROUPHIERARCHYDESC: string,
            BRANDVARIANTHIERARCHYDESC: string,
            REGIONALBRANDHIERARCHYDESC: string,
            BRANDHIERARCHYDESC: string,
            VARIANTHIERARCHYDESC: string,
            PRODUCTHIERARCHYDESC: string,
            CATEGORYHIERARCHYDESC: string,
            LAST_MODIFIED_DT: string,
        }]
    ) {

        let materials: any = [], materialsMap: {} = {};
        let materialSalesData: any = [];
        let rows;

        const mappedProductHierarchy = new Map();
        tempProductHierarchy.forEach((item) => {
            mappedProductHierarchy.set(item.SKUGROUPHIERARCHYCODE, item);
        });

        /**This array is prepared for the data that needs to be inserted in material_master table */
        for (const element of temp) {
            const productHierarchyObj = mappedProductHierarchy.get(element.Product_hierarchy_code);

            let materialRow = {
                code: element.SKU_Code ? element.SKU_Code.toString() : '',
                description: element.SKU_Description
                    ? element.SKU_Description.toString().replace("'", "''")
                    : '',
                sales_unit: element.Sales_Unit ? element.Sales_Unit.toString() : null,
                pak_type: element.Product_hierarchy ? element.Product_hierarchy.toString() : null,
                product_hierarchy_code: element.Product_hierarchy_code ? element.Product_hierarchy_code.toString() : null,
                buom_to_cs: (element.BUOM_to_CS && !isNaN(+element.BUOM_to_CS)) ? +element.BUOM_to_CS : null,
                pak_to_cs: (element.PAK_to_CS && !isNaN(+element.PAK_to_CS)) ? +element.PAK_to_CS : null,
                brand: element.BRAND ? element.BRAND : null,
                brand_desc: element.BRAND_DESC ? element.BRAND_DESC : null,
                brand_variant: element.BRAND_VARIANT ? element.BRAND_VARIANT : null,
                brand_variant_desc: element.BRAND_VARIANT_DESC ? element.BRAND_VARIANT_DESC : null,
                ton_to_suom: (element.TON_to_SUOM && !isNaN(+element.TON_to_SUOM)) ? +element.TON_to_SUOM : null,
                buom: element.BUOM ?? null,
                global_brand: productHierarchyObj?.BRANDHIERARCHYCODE ? productHierarchyObj?.BRANDHIERARCHYCODE : null,
                global_brand_desc: productHierarchyObj?.BRANDHIERARCHYDESC ? productHierarchyObj?.BRANDHIERARCHYDESC : null,
                variant: productHierarchyObj?.VARIANTHIERARCHYCODE ? productHierarchyObj?.VARIANTHIERARCHYCODE : null,
                variant_desc: productHierarchyObj?.VARIANTHIERARCHYDESC ? productHierarchyObj?.VARIANTHIERARCHYDESC : null,
                product: productHierarchyObj?.PRODUCTHIERARCHYCODE ? productHierarchyObj?.PRODUCTHIERARCHYCODE : null,
                product_desc: productHierarchyObj?.PRODUCTHIERARCHYDESC ? productHierarchyObj?.PRODUCTHIERARCHYDESC : null,
                category: productHierarchyObj?.CATEGORYHIERARCHYCODE ? productHierarchyObj?.CATEGORYHIERARCHYCODE : null,
                category_desc: productHierarchyObj?.CATEGORYHIERARCHYDESC ? productHierarchyObj?.CATEGORYHIERARCHYDESC : null
            };
            let materialExists = materials.filter(item => item.code == materialRow.code);
            if (materialExists.length == 0) {
                materials.push(materialRow);
                materialsMap[element.SKU_Code] = true;
            }
        }

        const filteredMaterialSalesData = temp.filter((v, i, a) => a.findIndex(t => (t.SKU_Code === v.SKU_Code && t.Sales_Org === v.Sales_Org && t.Distribution_Channel === v.Distribution_Channel && t.Division === v.Division && t.LOB === v.LOB)) === i);

        /**This array is prepared for the data that needs to be inserted in material_sales_details table */
        for (let material of filteredMaterialSalesData) {
            const material_sales = {
                material_code: material.SKU_Code,
                sales_org: material.Sales_Org ? material.Sales_Org : null,
                distribution_channel: material.Distribution_Channel ? material.Distribution_Channel : null,
                division: material.Division ? material.Division : null,
                line_of_business: material.LOB ? material.LOB : null,
                unit_of_measurement: material.UOM ? material.UOM : null,
                conversion_factor: material.ConversionFactor ? material.ConversionFactor : null
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

    async fetchMaterials() {
        return await UtilModel.fetchMaterials();
    },

    async removeMaterials(deletedCodes: string[]) {
        return await UtilModel.removeMaterials(deletedCodes);
    },

    async updateOpenSO(soDetails: [{
        SO_Value: string,
        Delivery_Number: string,
        Invoice_Number: string,
        Status: string,
        Sales_Order_Number: string,
        Sales_Order_Item : string,
        Material_Number : string,
        Material_Description:string,
        Sales_Order_QTY: string,
        ROR : string,
        Allocated_QTY: string,
        Delivery_Datetime:string,
        Invoice_Datetime:string,
        Eway_Bill_Number:string,
        Eway_Bill_Datetime: string,
        Req_Delv_Date:string
    }], distributorId: string) {
        
        let soObject: { [key: string]: { so_value: string | null, delivery_no: string[] | null, invoice_no: string[] | null, status: string, so_number: string , statusArray:string[], delivery_date_time:string[]|null,invoice_date_time:string[]|null,eway_bill_number:string[]|null,eway_bill_date_time:string[]|null,rdd:string|null } } = {};
        let rorObject: { [key: string]: { so_number: string | null, itemData: object[] | null } } = {};

        for (let so of soDetails) {
            if (soObject[so.Sales_Order_Number]) {
                if (so.Delivery_Number && !soObject[so.Sales_Order_Number].delivery_no.includes(so.Delivery_Number)) {
                    soObject[so.Sales_Order_Number].delivery_no.push(so.Delivery_Number);
                }
                if (so.Invoice_Number && !soObject[so.Sales_Order_Number].invoice_no.includes(so.Invoice_Number)) {
                    soObject[so.Sales_Order_Number].invoice_no.push(so.Invoice_Number);
                }
                if (so.ROR){
                    rorObject[so.Sales_Order_Number].itemData.push({
                        'itemNumber' : so.Sales_Order_Item,
                        'material' : so.Material_Number,
                        'ror': so.ROR,
                        'materialDescription': so.Material_Description,
                        'qty': so.Sales_Order_QTY.trim(),
                        'allocatedQty': so.Allocated_QTY.trim()
                    });
                }
                
                if (so.Status && !soObject[so.Sales_Order_Number].statusArray.includes(so.Status)) {
                    soObject[so.Sales_Order_Number].statusArray.push(so.Status ? so.Status?.toUpperCase() : ' ');
                }                

                if (so.Delivery_Datetime && !soObject[so.Sales_Order_Number].delivery_date_time?.includes(so.Delivery_Datetime)) {
                    soObject[so.Sales_Order_Number].delivery_date_time?.push(so.Delivery_Datetime);
                }
                if(so.Invoice_Datetime && !soObject[so.Sales_Order_Number].invoice_date_time?.includes(so.Invoice_Datetime)){
                    soObject[so.Sales_Order_Number].invoice_date_time?.push(so.Invoice_Datetime);
                }
                if(so.Eway_Bill_Number && !soObject[so.Sales_Order_Number].eway_bill_number?.includes(so.Eway_Bill_Number)){
                    soObject[so.Sales_Order_Number].eway_bill_number?.push(so.Eway_Bill_Number);
                }
                if(so.Eway_Bill_Datetime && !soObject[so.Sales_Order_Number].eway_bill_date_time?.includes(so.Eway_Bill_Datetime)){
                    soObject[so.Sales_Order_Number].eway_bill_date_time?.push(so.Eway_Bill_Datetime);}

                
            } else {
                soObject[so.Sales_Order_Number] = {
                    so_value: so.SO_Value ? so.SO_Value : null,
                    delivery_no: so.Delivery_Number ? [so.Delivery_Number] : [],
                    invoice_no: so.Invoice_Number ? [so.Invoice_Number] : [],
                    status: so.Status ? so.Status.toUpperCase() : '-',
                    statusArray: [so.Status ? so.Status.toUpperCase() : ' '] ,
                    so_number: so.Sales_Order_Number,
                    delivery_date_time: so.Delivery_Datetime ? [so.Delivery_Datetime] : [],
                    invoice_date_time: so.Invoice_Datetime ? [so.Invoice_Datetime] : [],
                    eway_bill_number: so.Eway_Bill_Number ? [so.Eway_Bill_Number] : [],
                    eway_bill_date_time: so.Eway_Bill_Datetime ? [so.Eway_Bill_Datetime] : [],
                    rdd: so.Req_Delv_Date?so.Req_Delv_Date:null
                    
                };
                // ROR Object
                rorObject[so.Sales_Order_Number] = {
                    so_number: so.Sales_Order_Number,
                    itemData : so.ROR?[{
                        'itemNumber' : so.Sales_Order_Item,
                        'material' : so.Material_Number,
                        'ror': so.ROR,
                        'materialDescription': so.Material_Description,
                        'qty': so.Sales_Order_QTY.trim(),
                        'allocatedQty': so.Allocated_QTY.trim()
                    }]: []
                };
            }
       
        
        }

        for (let so of Object.values(soObject)) {
            let setStatusArray = new Set(so.statusArray);
            if (so.status && Array.from(setStatusArray).every((status) => status === 'COMPLETED')) {
                soObject[so.so_number].status = 'FULLY SERVICED';
            }
            else if (so.status && Array.from(setStatusArray).every((status) => status === 'NOT DELIVERED')) {
                soObject[so.so_number].status = 'ORDER PLACED';
            }
            else {
                soObject[so.so_number].status = 'PARTIALLY SERVICED';
            }
        }

        logger.info(`ror object`,rorObject);
        logger.info(`so details`, soDetails);
        logger.info(`soObject: ${JSON.stringify(soObject)}`);
        const soList = JSON.stringify(Object.values(soObject));
        const updateOpenSOResponse = await UtilModel.updateOpenSO(soList, distributorId);
        Object.entries(rorObject).forEach(async (value) => {
            let orderData:any = await UtilModel.getOrderData(value[0])
            if(orderData.rows.length> 0 && value[1].itemData.length > 0){
                orderData.rows[0].order_data['rorItemset'] = value[1].itemData
                await UtilModel.insertRorData(orderData.rows[0].order_data,value[0])
            }
        });
        return updateOpenSOResponse;
    },

    async upsertDistributors(temp: [{
        Distributor: string,
        Name: string,
        City: string,
        Postal_code: string,
        Region: string,
        Region_Name: string,
        Customer_group: string,
        Description: string,
        Plant: string,
        Plant_description: string,
        group5: string,
        group5_description: string,
        TSE_Code: string,
        PDP_Day: string,
        Mobile_Number: string,
        E_mail_id: string,
        Market: string,
        Area_Code: string,
        Channel_Code: string,
        Reference_date: string,
        Sales_Org: string,
        Distribution_Channel: string,
        Division: string,
        LOB: string,
        Division_Desc: string,
        GRN_Type : string,
    }]) {

        logger.info(`DISTRIBUTORS DATA FORM SAP API: ${temp.length}`);
        let distributors: any = [];
        let regions: any = [];
        let groups: any = [];
        let plants: any = [];
        let group5s: any = [];
        let profiles: any = [];
        let distributorsWithPlants: any = [];
        let distributorsPlantsMOQ: any = [];
        let distributorsMap: {} = {};

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
                rsm_code: temp[j].group5 ? `RM${temp[j].group5}`:'',
                cluster_code: temp[j].group5 ? `CM${temp[j].group5.charAt(0)}R` :''
            }

            const mobileNumber = temp[j].Mobile_Number ? temp[j].Mobile_Number.toString().replace(/[^0-9]/g, '') : '';

            let profileRow = {
                id: temp[j].Distributor,
                name: temp[j].Name ? temp[j].Name.replace(/'/g, "''") : '',
                email: temp[j].E_mail_id ? temp[j].E_mail_id.replace(/'/g, "") : 'noreply.pegasus@tataconsumer.com',
                mobile: (mobileNumber.length <= 12 && mobileNumber.length >= 10) ? mobileNumber : null,
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

        const filteredRegions = regions.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
        const filteredGroups = groups.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        const filteredPlants = plants.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        const filteredGroup5s = group5s.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        const filteredProfiles = profiles.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        regions = JSON.stringify(filteredRegions);
        groups = JSON.stringify(filteredGroups);
        plants = JSON.stringify(filteredPlants);
        group5s = JSON.stringify(filteredGroup5s);
        profiles = JSON.stringify(filteredProfiles);

        let regionsMapping = {};
        let groupsMapping = {};
        let plantsMapping = {};
        let group5sMapping = {};

        let { rows } = await UtilModel.upsertRegions(regions);
        logger.info(`REGION RESULT: ${rows ? rows.length : 'error'}`);
        for (let row of rows) {
            regionsMapping[row.code] = row.id;
        }

        ({ rows } = await UtilModel.upsertCustomerGroups(groups));
        logger.info(`GROUP RESULT: ${rows ? rows.length : 'error'}`);
        for (let row of rows) {
            groupsMapping[row.name] = row.id;
        }

        ({ rows } = await UtilModel.upsertPlants(plants));
        logger.info(`PLANT RESULT: ${rows ? rows.length : 'error'}`);
        for (let row of rows) {
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
                // pdp_day: temp[j].PDP_Day ? temp[j].PDP_Day : null,
                market: temp[j].Market ? temp[j].Market.toString().replace("'", "''") : null,
                area_code: temp[j].Area_Code ? temp[j].Area_Code : null,
                channel_code: temp[j].Channel_Code ? temp[j].Channel_Code : null,
                reference_date: (temp[j].Reference_date && temp[j].Reference_date !== '00000000') ? temp[j].Reference_date : null,
                grn_type : temp[j].GRN_Type == 'Multiple' ? 'Multi GRN' : 'Single GRN',
            };
            distributors.push(distributorRow);
        }

        const filteredDistributors = distributors.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        const filteredDistributorsWithPlants = temp.filter((v, i, a) => a.findIndex(t => (t.Distributor === v.Distributor && t.Plant === v.Plant && t.Sales_Org === v.Sales_Org && t.Distribution_Channel === v.Distribution_Channel && t.Division === v.Division && t.LOB === v.LOB)) === i);

        for (let distributor of filteredDistributorsWithPlants) {
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
                if (distributorPlantsMOQRow.plant_id !== 0)
                    distributorsPlantsMOQ.push(distributorPlantsMOQRow);
            }
        }

        distributors = JSON.stringify(filteredDistributors);
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

    async upsertSalesHierarchyDetails(temp: [{
        empInfo: {
            personNav: {
                phoneNav: {
                    results: [{
                        isPrimary: boolean,
                        phoneNumber: string
                    }]
                }
            },
            jobInfoNav: {
                results: [{
                    customString21: string
                }]
            }
        },
        manager: {
            __metadata: {
                uri: any
            }
        },
        userId: string,
        firstName: string,
        lastName: string,
        email: string,
        country: string
    }]) {
        let salesHierarchyDetails: any = [], salesHierarchyUsersMap: {} = {};
        /*[{
            user_id: string | null,
            first_name: string | null,
            last_name: string | null,
            email: string | null,
            mobile_number: string | null,
            manager_id: string | null,
            code: string |
        }]*/

        for (let j = 0; j < temp.length; j++) {
            if (temp[j].country && temp[j].country !== '140') {
                continue;
            }
            let mobileNumber = null, code = null;
            const phoneNumbers = temp[j].empInfo.personNav.phoneNav.results;
            for (let phoneNumberDetails of phoneNumbers) {
                if (phoneNumberDetails.isPrimary) {
                    mobileNumber = phoneNumberDetails.phoneNumber.toString().replace(/[^0-9]/g, '');
                }
            }
            const salesCode = temp[j].empInfo.jobInfoNav.results;
            if (salesCode && salesCode[0]) {
                code = salesCode[0].customString21 ? salesCode[0].customString21.toString() : null;
            }
            let managerId = temp[j].manager?.__metadata.uri ? temp[j].manager.__metadata.uri : null;

            if (managerId) {
                managerId = managerId.toString().match(/User\('\d+'\)/g);
                managerId = managerId && managerId.length ? managerId[0].toString().replace(/[^0-9]/g, '') : null;
            }

            let salesHierarchyDetailRow = {
                user_id: temp[j].userId ? temp[j].userId.toString() : '',
                first_name: temp[j].firstName ? temp[j].firstName.toString().replace(/'/g, "''") : null,
                last_name: temp[j].lastName ? temp[j].lastName.toString().replace(/'/g, "''") : null,
                email: temp[j].email ? temp[j].email.toString().replace(/'/g, "") : null,
                mobile_number: (mobileNumber && mobileNumber.length <= 12 && mobileNumber.length >= 10) ? mobileNumber : null,
                manager_id: managerId,
                code,
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

    async mapProductsToDistributors(temp) {
        let productAreaMapping: {
            [key: string]: {
                code: string,
                appl_area_channel: object[] | null,
                start_date: string | null
            }
        } = {};
        const currentMonth = new Date().getMonth();
        const { parentSKU, month, area, channel } = SapConfig.distributorInventorySyncFields;

        logger.info(`Total no. of rows from file : ${temp && temp.length}`);
        let counter = 0;

        for (let data of temp) {
            if (!data[parentSKU]) continue;
            if (data[month]) data[month] = new Date(data[month]);
            if (data[month] && data[month].getMonth() !== currentMonth) continue;
            counter++;

            if (productAreaMapping[data[parentSKU]]) {
                const mappedObj = productAreaMapping[data[parentSKU]];
                if (data[channel] && data[area]) {
                    if (mappedObj.appl_area_channel) {
                        if (!mappedObj.appl_area_channel.some((obj: { area: string, channel: string }) => obj.area === data[area] && obj.channel === data[channel])) {
                            mappedObj.appl_area_channel.push({
                                area: data[area],
                                channel: data[channel]
                            });
                        }
                    } else {
                        mappedObj.appl_area_channel = [{
                            area: data[area],
                            channel: data[channel]
                        }];
                    }
                }
                if (mappedObj.start_date && data[month] && new Date(mappedObj.start_date) > new Date(data[month])) {
                    mappedObj.start_date = data[month].toISOString();
                }
            } else {
                productAreaMapping[data[parentSKU]] = {
                    code: data[parentSKU].toString(),
                    appl_area_channel: data[channel] && data[area] ? [{
                        area: data[area],
                        channel: data[channel]
                    }] : null,
                    start_date: data[month] ? data[month].toISOString() : null
                };
            }
        }
        logger.info(`Updated no. of rows from file : ${counter}`);

        const productToAreasMapping = JSON.stringify(Object.values(productAreaMapping));
        return await UtilModel.mapProductsToDistributors(productToAreasMapping);
    },

    async addUsers(userList: any) {
        let users: any = [];
        for (let j = 0; j < userList.length; j++) {
            let userRow = {
                user_id: userList[j].userId ? userList[j].userId.toString() : '',
                first_name: userList[j].firstName ? userList[j].firstName.toString() : '',
                last_name: userList[j].lastName ? userList[j].lastName.toString() : '',
                email: userList[j].emailAddress ? userList[j].emailAddress.toString() : '',
                mobile_number: userList[j].mobileNumber ? userList[j].mobileNumber : '',
                manager_id: userList[j].managerId ? userList[j].managerId.toString() : 'PORTAL_MANAGED',
                code: userList[j].code ? userList[j].code.toString() : null,
                roles: userList[j].roles ? userList[j].roles.toString() : ''
            };
            users.push(userRow);
        }
        users = JSON.stringify(users);
        return await UtilModel.addUsers(users);
    },

    async addMappingRequests(mappingRequest: { status: any, type: any, distributor_code: any, TSE_code: any, ASMRSM_code: any, submission_comments: string }, createdBy: string) {
        const { status, type, distributor_code, TSE_code, ASMRSM_code, submission_comments } = mappingRequest;
        return await UtilModel.addMappingRequests(status, type, distributor_code, TSE_code, ASMRSM_code, submission_comments, createdBy);
    },

    async getMappingRequestListByAdminRole(roles: string[], code: string, limit: number, offset: number, status: string, search: string) {

        return await UtilModel.getMappingRequestListByAdminRole(roles, code, limit, offset, status, search)

    },

    async getMappingRequestListByAdminRoleCount(roles: string[], code: string, status: string, search: string) {
        return await UtilModel.getMappingRequestListByAdminRoleCount(roles, code, status, search)
    },

    async updateDistributor(mappingRequest: { distributor_code: any, TSE_code: any, type: any }) {
        const { distributor_code, TSE_code, type } = mappingRequest;
        return await UtilModel.updateDistributor(distributor_code, TSE_code, type);
    },

    async updateMappingRequest(mappingRequestId: number, mappingRequest: { status: any, comments: string }, updatedBy: string) {
        const { status, comments } = mappingRequest;
        return await UtilModel.updateMappingRequest(mappingRequestId, status, comments, updatedBy);
    },
    async getTseList(code: string) {

        return await UtilModel.getTseList(code);

    },
    async getDistributorList(role: string[], code: string | any, email: string | any) {
        return await UtilModel.getDistributorUnderTse(role, code, email);
    },
    async getPlantUpdateRequestByAdminRole(roles: string, code: string, limit: number, offset: number, status: string, search: string, first_name: any, user_id: any, email: any) {
        return await UtilModel.getPlantUpdateRequestByAdminRole(roles, code, limit, offset, status, search, first_name, user_id, email)
    },
    async getPlantUpdateRequestCountByAdminRole(roles: string, code: string, limit: number, offset: number, status: string, search: string, first_name: any, user_id: any, email: any) {
        return await UtilModel.getPlantUpdateRequestCountByAdminRole(roles, code, limit, offset, status, search, first_name, user_id, email)
    },
    async getCustomerGroupDetails() {
        logger.info('Inside UtilService-> getCustomerGroupDetails');
        return await UtilModel.getCustomerGroupDetails();
    },
    async syncARSRelatedTables() {
        logger.info('Inside UtilService-> syncARSRelatedTables');
        const areaSyncResponse = await UtilModel.syncAreaCodeTable();
        const arsToleranceSyncResponse = await UtilModel.syncArsToleranceTable();
        return areaSyncResponse && arsToleranceSyncResponse;
    },
    async mapProductsToMDMData(temp) {
        const currentMonth = new Date().getMonth();
        const { parentSKU, month, sku, channel, subChannel } = SapConfig.distributorInventorySyncFields;

        logger.info(`Total no. of rows from file : ${temp && temp.length}`);
        let filteredData = []
        let counter = 0;
        temp.forEach((data) => {
            if (data[parentSKU] && data[sku] && data[month] && new Date(data[month]).getMonth() === currentMonth && data[channel] == 'EC' && data[subChannel] == 'ECBB') {
                let bbData = {
                    customer_name: 'BIGBASKET',
                    sku: data[sku],
                    sku_desc: data['SYSTEM_SKU_DESCR'],
                    psku: data['PARENT_SKU'],
                    psku_desc: data['PARENT_SKU_DESCR'],
                    region: data['STATE_DESCR'],
                    plant_code: data['DEPOT'].split('-')[0],
                    updated_on: new Date()
                }
                filteredData.push(bbData);
            }
            else if (data[parentSKU] && data[sku] && data[month] && new Date(data[month]).getMonth() === currentMonth && data[channel] == 'EC' && data[subChannel] == 'ECAM') {
                let azData = {
                    customer_name: 'AMAZON',
                    sku: data[sku],
                    sku_desc: data['SYSTEM_SKU_DESCR'],
                    psku: data['PARENT_SKU'],
                    psku_desc: data['PARENT_SKU_DESCR'],
                    region: data['STATE_DESCR'],
                    plant_code: data['DEPOT'].split('-')[0],
                    updated_on: new Date()
                }
                filteredData.push(azData);
            }
        })
        const response = await UtilModel.mapProductsToMDMData(filteredData);
        let updateResponse: any

        let data = await UtilityFunctions.fetchProducts();
        if (data.data.d.results.length > 0) {
            data = data.data.d.results;
            const updatedData = mdmTransformer.updateMDMDataTransformer(data)
            updateResponse = await UtilModel.updateMDMData(updatedData);
        }
        logger.info(`Updated no. of rows from file : ${filteredData.length}`);
        if (response && updateResponse) return response
    },
    async getAppLevelConfigurations() {
        logger.info('Inside UtilService-> getAppLevelConfigurations');
        return await UtilModel.getAppLevelConfigurations();
    },
    async rorSync(days) {
        logger.info('Inside UtilService-> rorSync');
        let distributors = await UtilModel.rorSync(days);
        async function worker(distributorId: { distributor_id: string;}) {
            const logSAPAPITime = process.hrtime();
            const fetchOpenSOResponse = await UtilityFunctions.fetchOpenSO(
                distributorId.distributor_id,
                false,
              );
            const logSAPAPIEndTime = (logSAPAPITime[0] + (logSAPAPITime[1] / 1e9) / 60).toFixed(3);
            logger.info(`ROR SYNC SAP API Time: ${logSAPAPIEndTime} seconds for distributor: ${distributorId.distributor_id}`);
              if (
                !fetchOpenSOResponse ||
                fetchOpenSOResponse.status !== 200 ||
                !fetchOpenSOResponse.data ||
                !fetchOpenSOResponse.data.d ||
                !fetchOpenSOResponse.data.d.results
              ) {
                logger.error(
                  `sap api failed response: ${fetchOpenSOResponse.data || fetchOpenSOResponse
                  }`,
                );
                return false;
            }
            const data = fetchOpenSOResponse.data.d.results;
            let soObject: { [key: string]: {itemData : object[] | null } } = {};
            for (let item of  data){
                if (item.ROR && soObject[item.Sales_Order_Number]) {
                    soObject[item.Sales_Order_Number].itemData.push({
                        'itemNumber' : item.Sales_Order_Item,
                        'material' : item.Material_Number,
                        'ror': item.ROR,
                        'materialDescription': item.Material_Description,
                        'qty': item.Sales_Order_QTY.trim(),
                        'allocatedQty': item.Allocated_QTY.trim()
                    });
                }
                else {

                    soObject[item.Sales_Order_Number] = {
                        itemData : item.ROR?[{
                            'itemNumber' : item.Sales_Order_Item,
                            'material' : item.Material_Number,
                            'ror': item.ROR,
                            'materialDescription': item.Material_Description,
                            'qty': item.Sales_Order_QTY.trim(),
                            'allocatedQty': item.Allocated_QTY.trim()
                        }]: []
                    };
                }

            }
            logger.info(`UPDATE OPEN SO RESPONSE`);
            Object.entries(soObject).forEach(async (value) => {
                let orderData:any = await UtilModel.getOrderData(value[0])
                if(orderData.rows.length> 0 && value[1].itemData.length > 0){
                    orderData.rows[0].order_data['rorItemset'] = value[1].itemData
                    await UtilModel.insertRorData(orderData.rows[0].order_data,value[0])
                    if(!orderData.rows[0].ror_mail_flag){
                        let mailData:any = await UtilModel.getDBandTSEEmails(orderData.rows[0].distributor_id)
                        let data ={
                            distributorId : orderData.rows[0].distributor_id,
                            distributorName : mailData.name,
                            email : mailData.email,
                            po_number : orderData.rows[0].po_number,
                        }
                       let mailResponse =  await LogService.sendCreditCrunchNotification(data)
                       if(mailResponse){
                        await UtilModel.updateRorMailFlag(value[0])
                       }

                    }
                }
            });
            return true;
    }
        if (distributors.rows && distributors.rows.length > 0) {
        const noOfThreads = 5;
        const channel = workerThread.createChannel(worker, noOfThreads);
        channel.on('done', (error: any, result: any) => {
            if (error) {
                logger.error('Error in UtilService-> rorSync:- on.done: execution: ', error);
            }
            logger.info('Result in AUtilService-> rorSync: on.done ', result);
        });

        channel.on('stop', () => {
            logger.info('UtilService-> rorSync: All Execution completed: Channel is stop');
            return true;
        })
        for (const dist of distributors.rows) {
            channel.add(dist);
        }
        return true;
    }else{
        return false;
    }
    },
    isValid(data) {
        return !(data == null || data == "" || data == 0);
    },
    upsertCFADepotMapping(dbData: any, group5_data: any[]) {
        const keySet: Set<string> = new Set();
        const cfaDepotPayload: {}[] = [];
        dbData?.forEach((item: any) => {
            if (UtilService.isValid(item.group5) && UtilService.isValid(item.Plant) && UtilService.isValid(item.Sales_Org) && UtilService.isValid(item.Distribution_Channel) && UtilService.isValid(item.Division)) {
                const key = item?.['group5'] + "/" + item?.['Plant'] + "/" + item['Sales_Org'] + "/" + item?.['Distribution_Channel'] + "/" + item?.['Division']
                if (!keySet.has(key)) {
                    const zoneData = group5_data.find(zoneData => zoneData.name === item?.['group5']);
                    const zoneName = zoneData.description ?? false;
                    if (zoneName) {
                        cfaDepotPayload.push({ zone: zoneName, depot_code: item?.['Plant'], sales_org: item['Sales_Org'], distribution_channel: item?.['Distribution_Channel'], division: item?.['Division'], group5_id: zoneData.id })
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
    runDbSyncProc(uuid:string) {
        return UtilModel.runDbSyncProc(uuid)
    },
    runMaterialSyncProc(uuid:string) {
        return UtilModel.runMaterialSyncProc(uuid)
    },
    runSalesHierarchySyncProc(uuid:string) {
        return UtilModel.runSalesHierarchySyncProc(uuid)
    },

    syncProcedureStatus(uuid: string, syncType:string) {
        return UtilModel.syncProcedureStatus(uuid, syncType);
    },

    async upsertDistributorMOQ(distributorsPlantsMOQ) {
        const upsertMOQDbMappingResponse = await UtilModel.upsertMOQDbMapping(distributorsPlantsMOQ);
        logger.info(`MOQ_DB_MAPPING TABLE UPDATE RESULT: ${upsertMOQDbMappingResponse ? upsertMOQDbMappingResponse : 'error'}`);
    },

    async unlockNewDbsInPDPUnlockRequestWindow(){
        logger.info('inside UtilService -> unlockNewDbsInPDPUnlockRequestWindow');

        const unlockNewDbsInPDPUnlockRequestWindowResponse = await UtilModel.unlockNewDbsInPDPUnlockRequestWindow();
        if(unlockNewDbsInPDPUnlockRequestWindowResponse === null){
            logger.error(`Error in unlocking new distributors in PDP unlock request window`);
            return false;
        }else{
            logger.info(`Unlocked new distributors in PDP unlock request window response, count: ${unlockNewDbsInPDPUnlockRequestWindowResponse}`);
            return true;
        }
    },

    async enableROandBOforNewDbs(){
        logger.info('inside UtilService -> enableROandBOforNewDbs');
        const enableROandBOforNewDbsResponse = await UtilModel.enableROandBOforNewDbs();
        if(enableROandBOforNewDbsResponse === null){
            logger.error(`Failed to enable RO and BO for new distributors`);
            return false;
        }else{
            logger.info(`Enabled RO and BO for new distributors response, count: ${enableROandBOforNewDbsResponse}`);
            return true;
        }
    },

    async syncAutoClosure(auditId: string, customerType: string) {
        logger.info('inside UtilService -> syncAutoClosure');
        try {
            const fetchedSoDetails = await UtilModel.fetchAutoClosureSOData(auditId, AutoClosureAuditTables[customerType]);
            const payloadArr = fetchedSoDetails?.sap_payload;
            let responseArr: any[] =[];
            if(payloadArr?.length  > 0){
                for(let i = 0; i< payloadArr.length; i++){
                    const response = await UtilityFunctions.sendToSAPForAutoClosure(payloadArr[i]);
                    if (response?.config) delete response.config;
                    if (response?.headers) delete response.headers;
                    if (response?.request) delete response.request;
                    responseArr.push(response);
                }
            }
            const data: AutoClosureLogs = {
                sap_response: JSON.stringify(responseArr).replace(/'/g, "''"),
            }
            LogModel.upsertAutoClosureLogs(auditId, AutoClosureAuditTables[customerType], data);
            return true;
        } catch (error) {
            logger.error("CAUGHT: Error in UtilService -> syncAutoClosure: ", error);
            return false;
        }
    },

    async disableNourishcoDbsPDP(){
        logger.info('inside UtilService -> disableNourishcoDbsPDP');
        const disableNouricoDbsPDPResponse = await UtilModel.disableNourishcoDbsPDP();
        if(disableNouricoDbsPDPResponse === null){
            logger.error(`Failed to disable PDP of nourishco distributors`);
            return false;
        }else{
            logger.info(`Disabled PDP of nourishco distributors, count: ${disableNouricoDbsPDPResponse}`);
            return true;
        }
    },
};