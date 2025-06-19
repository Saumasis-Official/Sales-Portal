'use strict';
import axios from 'axios';
import logger from '../lib/logger';
import { LogService } from '../service/LogService';
import Util from '../helper/index';
import { CUSTOMER_GROUPS_FOR_ORDERING, allDivisions, SALES_ORG, ADDITIONAL_CUSTOMER_GROUPS_FOR_SYNC } from '../constant/constants';
const SapConfig = global['configuration']?.sap;
const emailConfig = global['configuration']?.email;
const MuleConfig = global['configuration']?.mule;
import Email from './email';
import { UtilModel } from '../models/UtilModel';

const config = {
    method: 'get',
    url: null,
    headers: {
        'X-Requested-With': 'X',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': '*',
    },
    auth: SapConfig?.auth,
};

const UtilityFunctions = {
    fetchRorData: async (distributorId: string, days: number | 0 = 0) => {
        logger.info(`Fetching SO in fetchRorData`);
        if (!SapConfig.openSOApiEndpoint) {
            logger.error(`Error in SapConfig.openSOApiEndpoint: not defined in env`);
            return null;
        }
        config.url = `${SapConfig.openSOApiEndpoint}?$filter=Distributor%20eq%20'${distributorId}'%20and%20Days%20eq%20'${days}'`;
        config.url += `&sap-client=400&sap-language=EN`;
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);

            if (!response) {
                logger.info(`Response from open SO SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from open SO SAP is: ', { status });
            logger.info(`Data received from open SO SAP is: `, response && response.data && response.data.length);

            return response;
        } catch (err) {
            logger.error('Error in open SO SAP API call', err);
            return null;
        }
    },

    fetchDistributorsFromSap: async () => {
        logger.info(`Fetching distributors in utilityFunctions.fetchDistributors`);
        //Keeping the urls in the format of [cg] : url to make it easier to display the cg during error
        const dbSyncUrl: { [key: string]: string } = {};
        if (!SapConfig.distributorsApiEndpoint) {
            logger.error(`Error in SapConfig.distributorsApiEndpoint: not defined in env`);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in SapConfig.distributorsApiEndpoint: not defined in env`);
            return null;
        }
        const urlDivString = Util.urlDivString(allDivisions.split(','));
        const salesOrg = Util.salesOrg(SALES_ORG);
        // if (Object.values(params).length) CUSTOMER_GROUPS_FOR_ORDERING = Object.values(params);
        [...CUSTOMER_GROUPS_FOR_ORDERING, ...ADDITIONAL_CUSTOMER_GROUPS_FOR_SYNC].forEach((cg) => {
            dbSyncUrl[cg] =
                `${SapConfig.distributorsApiEndpoint}?$filter=(${salesOrg}) and ( Distribution_Channel eq '10' or Distribution_Channel eq '40' or Distribution_Channel eq '70'  or Distribution_Channel eq '90') and ( Customer_group eq '${cg}') and ( ${urlDivString})&sap-client=400&sap-language=EN`;
        });
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config)}`);
        let response = null;
        try {
            //Setting headers separately to store cg during error
            response = await Promise.all(Object.keys(dbSyncUrl).map((cg) => axios({ ...config, url: dbSyncUrl[cg], headers: { ...config.headers, cg: cg } })));

            if (!response) {
                logger.info(`Response from distributors SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response[0];
            logger.info('Status received from distributors SAP is: ', { status });
            const responObj: { status: number; message: string; data } = {
                status,
                message: '',
                data: [],
            };

            for (const res of response) {
                if (!res?.data?.d?.results) {
                    logger.info(`Response from distributors SAP is undefined : ${res}`);
                    return null;
                }
                responObj.data.push(...res.data.d.results);
            }
            logger.info(`Data received from distributors SAP is: `, response && response.data);
            return responObj;
        } catch (err) {
            if (err.config) {
                logger.error('Error while fetching distributors for Customer Group :', [err.config.headers.cg]);
                LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `SAP api failed for customer group : ${err.config.headers.cg}`);
                return null;
            }
            logger.error('Error in distributors SAP API call', err);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `SAP api failed error: ${err.message}`);
            return null;
        }
    },
    fetchKamsCustomerCodeSync: async () => {
        logger.info(`Fetching data from customer code sync API in utilityFunctions.fetchCustomerCodeSync`);
        try {
            // Call the syncCustomerCodes method from UtilModel
            const syncResult = await UtilModel.syncCustomerCodes();
            logger.info('Successfully fetched data from KAMS customer code sync API');
            return syncResult;
        } catch (err) {
            if (err.response) {
                logger.error('Error while fetching data from customer code sync API:', err.response.data);
                LogService.insertSyncLog('KAMS_CUSTOMER_CODE_SYNC', 'FAIL', null, null, `API failed with status: ${err.response.status}`);
            } else if (err.request) {
                logger.error('No response received from customer code sync API:', err.request);
                LogService.insertSyncLog('KAMS_CUSTOMER_CODE_SYNC', 'FAIL', null, null, 'No response received from API');
            } else {
                logger.error('Error in customer code sync API call', err.message);
                LogService.insertSyncLog('CUSTOMER_CODE_SYNC', 'FAIL', null, null, `API call failed: ${err.message}`);
            }
            return null;
        }
    },
    fetchSalesHierarchyDetails: async () => {
        logger.info(`Fetching sales hierarchy in utilityFunctions.fetchSalesHierarchyDetails`);
        if (!SapConfig.salesHierarchyApiEndpoint) {
            logger.error(`Error in SapConfig.salesHierarchyApiEndpoint: not defined in env`);
            return null;
        }

        config.url = `${SapConfig.salesHierarchyApiEndpoint}?$expand=empInfo/jobInfoNav/locationNav,empInfo/personNav/phoneNav/phoneTypeNav,manager&$select=defaultFullName,firstName,lastName,email,country,city,userId,manager/email,empInfo/personNav/phoneNav/isPrimary,empInfo/personNav/phoneNav/phoneNumber,empInfo/personNav/phoneNav/extension,empInfo/personNav/phoneNav/phoneType,empInfo/personNav/phoneNav/phoneTypeNav/localeLabel,empInfo/jobInfoNav/customString21&$format=json&$filter=empInfo/jobInfoNav/customString21 ne 'null'`;
        config.auth = SapConfig.salesHierarchyAuth;

        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);
            if (!response) {
                logger.info(`Response from ${SapConfig.salesHierarchyApiEndpoint} is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from SuccessFactor API is: ', { status });
            logger.info(`Data received from SuccessFactor API is: `, response && response.data);
            return response;
        } catch (err) {
            logger.error('Error in SuccessFactor API call', err);
            return err?.response?.data ?? null;
        }
    },

    fetchProducts: async () => {
        logger.info(`Fetching products in fetchProducts`);
        if (!SapConfig.materialsApiEndpoint) {
            logger.error(`Error in SapConfig.materialsApiEndpoint: not defined in env`);
            return null;
        }
        const urlDivString = Util.urlDivString(allDivisions.split(','));
        config.url = `${SapConfig.materialsApiEndpoint}?$filter= Sales_Org eq '1010' and ( Distribution_Channel eq '10' or Distribution_Channel eq '40' or Distribution_Channel eq '90') and (${urlDivString})&sap-client=400&sap-language=EN`;
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);

            if (!response) {
                logger.info(`Response from products/ parent SKUs SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from products/ parent SKUs SAP is: ', { status });
            // logger.info(`Data received from products/ parent SKUs SAP is: `, response && response.data);
            return response;
        } catch (err) {
            logger.error('Error in products/ parent SKUs SAP API call', err);
            return null;
        }
    },

    fetchOpenSO: async (distributorId: string, syncLogExist: boolean, status: string | null = null) => {
        // logger.info(`Fetching SO in fetchOpenSO`);
        logger.info(`New Log Sync Jobs for Fetching SO in FetchOpenSO`);

        if (!SapConfig.openSOApiEndpoint) {
            logger.error(`Error in SapConfig.openSOApiEndpoint: not defined in env`);
            return null;
        }
        config.url = `${SapConfig.openSOApiEndpoint}?$filter=Distributor%20eq%20'${distributorId}'%20and%20Days%20eq%20'90'`;
        if (status) {
            logger.info(`status is defined in query filter: ${status}`);
            switch (status) {
                case 'not_delivered':
                    logger.info(`inside status not_delivered`);
                    config.url += ` and Status eq 'Not Delivered' `;
                    break;
                case 'partially_delivered':
                    logger.info(`inside status partially_delivered`);
                    config.url += ` and Status eq 'Partially Delivered' `;
                    break;
                case 'delivered':
                    logger.info(`inside status delivered`);
                    config.url += ` and Status eq 'Completed' `;
                    break;
                case 'all':
                    logger.info(`inside status all`);
                    break;
                default:
                    logger.info(`default case`);
            }
        } /* else if (syncLogExist) {
      logger.info(`sync log exists`);
    } */
        config.url += `&sap-client=400&sap-language=EN`;
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);

            if (!response) {
                logger.info(`Response from open SO SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from open SO SAP is: ', { status });
            logger.info(`Data received from open SO SAP is: `, response && response.data && response.data.length);

            return response;
        } catch (err) {
            logger.error('Error in open SO SAP API call', err);
            return null;
        }
    },
    dbSyncFailed(type: string) {
        const email = emailConfig.reportAutoValidationErrorMailIds;
        const data = {
            email,
            type,
        };
        Email.dbSyncFailed(data);
    },

    fetchProductHierarchy: async () => {
        logger.info('inside UtilityFunctions -> fetchProductHierarchy');
        const url = MuleConfig.productHierarchyApi;
        if (!url) {
            logger.error('Error in MuleConfig.productHierarchyApi: not defined in env');
            return null;
        }
        const config = {
            method: 'get',
            url,
            headers: {
                'Content-Type': 'application/json',
                client_id: MuleConfig.clientId,
                client_secret: MuleConfig.clientSecret,
                'x-transaction-id': MuleConfig.xTransactionId,
            },
        };
        logger.info(`Config send to mule from axios call: ${JSON.stringify(config.url)}`);
        try {
            const response = await axios(config);
            if (!response) {
                logger.info(`Response from ${JSON.stringify(config)} is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from SuccessFactor API is: ', { status });
            logger.info(`Data received from SuccessFactor API is: `, response && response.data);
            return response;
        } catch (err) {
            logger.error('Error in SuccessFactor API call', err);
            return err?.response?.data ?? null;
        }
    },

    tseUpperHierarchyQueryByCode(tseCode: string) {
        return `
          WITH RECURSIVE hierarchy AS 
          (SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id,roles 
              FROM sales_hierarchy_details 
              WHERE STRING_TO_ARRAY(code, ',') && STRING_TO_ARRAY('${tseCode}', ',') 
              AND deleted = false 
              UNION 
              SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id, s.roles 
              FROM sales_hierarchy_details s 
              INNER JOIN hierarchy h ON h.manager_id = s.user_id
              WHERE deleted = false) 
          SELECT *, roles::_varchar FROM hierarchy`;
    },

    async fetchMTOpenSO(customerCode: { customer_code: string },date:string) {
        logger.info(`Fetching SO in fetchMTOpenSO`);
        if (!SapConfig.openSOApiEndpoint) {
            logger.error(`Error in SapConfig.openSOApiEndpoint: not defined in env`);
            return null;
        }
        const today = new Date();
        const formattedDate = date || today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
        const code = typeof customerCode === 'object' ? customerCode?.customer_code : customerCode;
        config.url = `${SapConfig.mtEcomSoSync}&$filter=Customer eq '${code}' and Created_on eq '${formattedDate}'`;
        // config.url = `${SapConfig.mtEcomSoSync}&$filter=Customer eq '${customerCode?.customer_code}' and Created_on eq '20250315'`;
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);

            if (!response) {
                logger.info(`Response from fetchMTOpenSO SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from fetchMTOpenSO SAP is: ', { status });
            logger.info(`Data received from fetchMTOpenSO SAP is: `, response.data.d.results.length);

            return response;
        } catch (err) {
            logger.error('Error in open SO SAP API call', err);
            return null;
        }
    },
};

export default UtilityFunctions;
