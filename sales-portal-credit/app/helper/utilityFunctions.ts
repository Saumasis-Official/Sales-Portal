'use strict';
import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import logger from '../lib/logger';
import { LogService } from '../service/LogService';
import Util from '../helper/index';
const SapConfig = global['configuration'].sap;

const emailConfig = global['configuration'].email;
import Email from './email';
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
    auth: SapConfig.auth,
};

const UtilityFunctions = {
    updateCreditExtention: async (data: any, transactionData: any, type?: string, initialBaseLimit?: any) => {
        try {
            let updateDataString;
            logger.info(`Inside UtilityFunctions -> updateCreditExtention with type: ${type}`);
            //Bulk upload for base limit
            if (type === 'baseLimit') {
                logger.info('Inside UtilityFunctions -> updateCreditExtention ->if - baseLimit');
                logger.info(`Inside UtilityFunctions -> updateCreditExtention ->INITIAL LIMIT : `, initialBaseLimit, 'UPDATE LIMIT: ', parseInt(data.updatedBaseLimit));
                // const finalValue = parseInt(initialBaseLimit) - parseInt(data.updatedBaseLimit);

                const finalValue = initialBaseLimit - data.updatedBaseLimit;
                const finalizedValue = Math.abs(finalValue);
                if (finalValue < 0) {
                    updateDataString = JSON.stringify({
                        KUNNR: String(transactionData.payercode),
                        KKBER: '1001',
                        KLIMK: String(finalizedValue),
                        INDICATOR: 'CR',
                        DATE: '20251312',
                        NavResult: [],
                    });
                } else {
                    updateDataString = JSON.stringify({
                        KUNNR: String(transactionData.payercode),
                        KKBER: '1001',
                        KLIMK: String(finalizedValue),
                        INDICATOR: 'DR',
                        DATE: '20251312',
                        NavResult: [],
                    });
                }
            }
            // Credit extention update after 3rd approval
            else {
                logger.info('Inside UtilityFunctions -> updateCreditExtention ->else -UPDATE EXTENTION ');

                updateDataString = JSON.stringify({
                    KUNNR: transactionData.payercode,
                    KKBER: '1001',
                    KLIMK: data.amount_requested,
                    INDICATOR: 'CR',
                    DATE: '20251312',
                    NavResult: [],
                });
            }
            const apiUrl = SapConfig.creditExtentionUpdateApi;
            const config = {
                method: 'post',
                url: apiUrl,
                headers: {
                    'X-Requested-With': 'X',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                auth: SapConfig.auth,
                data: updateDataString,
            };

            logger.info(`Inside UtilityFunctions -> updateCreditExtention ,Config send to sap =  ${JSON.stringify(config.data)}`);
            let response = await axios(config);
            if (!response) {
                logger.info(`Response from SAP Update Credit Limit is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status,statusText } = response;
            logger.info('Status received from SAP Credit Limit is: ', { status});
            // logger.info(`Inside UtilityFunctions -> updateCreditExtention ,Data received from SAP Update Credit Limit is: `, response && response.data);

            return response;
        } catch (error) {
            logger.error('Inside UtilityFunctions -> updateCreditExtention ,Error = ', error);
            return null;
        }
    },

    sendToSapCreditLimit: async (login_id: any) => {
        try {
            logger.info(`Getting login id in sendToSapCreditLimit method`);
            const config = {
                method: 'get',
                url: `${SapConfig.creditLimitApiEndpoint}?$filter=Distributor%20eq%20'${login_id}'&sap-client=400&sap-language=EN`,
                headers: {
                    'X-Requested-With': 'X',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                auth: SapConfig.auth,
            };

            // logger.info(`config send to sap from axios call for credit limit: ${JSON.stringify(config)}`);
            const response: AxiosResponse = await axios(config);

            if (!response) {
                logger.info(`Response from SAP Credit Limit is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from SAP Credit Limit is: ', { status });
            // logger.info(`Data received from SAP Credit Limit is: `, response && response.data);

            return response;
        } catch (error) {
            logger.error(`Error from credit limit sap api:`, error);
            return {
                status: 500,
                message: 'Technical Error',
                data: null,
            };
        }
    },

    sendToRevertBaseLimit: async (payerCode: string, amountRequested: any) => {
        try {
            let updateDataString;
            logger.info(`Inside UtilityFunctions -> sendToRevertBaseLimit`);
            updateDataString = JSON.stringify({
                KUNNR: payerCode,
                KKBER: '1001',
                KLIMK: amountRequested,
                INDICATOR: 'DR',
                DATE: '20251312',
                NavResult: [],
            });

            const apiUrl = SapConfig.creditExtentionUpdateApi;
            const config = {
                method: 'post',
                url: apiUrl,
                headers: {
                    'X-Requested-With': 'X',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                auth: SapConfig.auth,
                data: updateDataString,
            };

            logger.info(`Inside UtilityFunctions -> sendToRevertBaseLimit ,Config send to sap )}`);
            let response = await axios(config);

            if (!response) {
                logger.info(`Response from SAP Update Credit Limit is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from SAP Credit Limit is: ', { status });
            return response;
        } catch (error) {
            logger.error('Inside UtilityFunctions -> sendToRevertBaseLimit ,Error = ', error);
            return null;
        }
    },
    updateGTCreditLimit: async (data: any, party_code: any, initialBaseLimit?: any) => {
        try {
            let updateDataString;
            logger.info('Inside UtilityFunctions -> updateGTCreditLimit');  
            const finalValue = initialBaseLimit?.baselimit - data?.updatedBaseLimit;
            const finalizedValue = Math.abs(finalValue);
                if (finalValue < 0) {
                    updateDataString = JSON.stringify({
                        KUNNR: String(party_code.payercode),
                        KKBER: '1001',
                        KLIMK: String(finalizedValue),
                        INDICATOR: 'CR',
                        DATE: '20251312',
                        NavResult: [],
                    });
                } 
                else {
                    updateDataString = JSON.stringify({
                        KUNNR: String(party_code.payercode),
                        KKBER: '1001',
                        KLIMK: String(finalizedValue),
                        INDICATOR: 'DR',
                        DATE: '20251312',
                        NavResult: [],
                    });
                }

            const apiUrl = SapConfig.creditExtentionUpdateApi;
            const config = {
                method: 'post',
                url: apiUrl,
                headers: {
                    'X-Requested-With': 'X',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                auth: SapConfig.auth,
                data: updateDataString,
            };

            logger.info(`Inside UtilityFunctions -> updateGTCreditLimit ,Config send to sap =  ${JSON.stringify(config.data)}`);
            let response = await axios(config);
            if (!response) {
                logger.info(`Response from SAP Update Credit Limit is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from SAP Credit Limit is: ', { status});
            
            return response;
        } catch (error) {
            logger.error('Inside UtilityFunctions -> updateGTCreditLimit ,Error = ', error);
            return null;
        }
    },
};

export default UtilityFunctions;
