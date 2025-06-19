'use strict';
import axios from 'axios';
import logger from '../lib/logger';
const SapConfig = global['configuration'].sap;

const config = {
    method: 'get',
    url: null,
    headers: {
        'X-Requested-With': 'X',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': '*'
    },
    data: null
    //   auth: SapConfig.auth,
};

const UtilityFunctions = {
    updateLoginSetting: async (distributorId: string, enableLogin: boolean) => {
        logger.info(`executing utilityFunctions.updateLoginSetting`);
        config.method = 'PUT';
        config.url = `${SapConfig.updateLoginSettingApiEndpoint}/${distributorId}`;
        config.data = {
            enable_login: enableLogin
        };
        logger.info(`Config send to api from axios call: ${JSON.stringify(config)}`);
        let response = null;
        try {
            response = await axios(config);
            return response;
        } catch (err) {
            logger.error("Error in the UPDATE LOGIN SETTING API call:", err);
            return {
                status: 500,
                message: "Technical Error",
                data: null
            };
        }
    },

    updateAlertSettings: async (distributorId: string, data: {
        enable_po_so_sms: boolean | undefined,
        enable_po_so_email: boolean | undefined,
        enable_invoice_sync_sms: boolean | undefined,
        enable_invoice_sync_email: boolean | undefined,
        email_tse_asm: boolean | undefined,
        sms_tse_asm: boolean | undefined,
    }) => {
        logger.info(`executing utilityFunctions.updateAlertSettings`);
        config.method = 'PUT';
        config.url = `${SapConfig.updateAlertSettingsApiEndpoint}/${distributorId}`;
        config.data = data;
        logger.info(`Config send to api from axios call: ${JSON.stringify(config)}`);
        let response = null;
        try {
            response = await axios(config);
            return response;
        } catch (err) {
            logger.error("Error in the UPDATE ALERT SETTINGS API call:", err);
            return {
                status: 500,
                message: "Technical Error",
                data: null
            };
        }
    },

    updateAlertHistory: async (distributorId: string, data: {
        alert_setting_changes: {
            enable_po_so_sms: boolean | undefined,
            enable_po_so_email: boolean | undefined,
            enable_invoice_sync_sms: boolean | undefined,
            enable_invoice_sync_email: boolean | undefined,
            enable_login: boolean | undefined,
            email_tse_asm: boolean | undefined,
            sms_tse_asm: boolean | undefined,
        },
        remarks: string,
        changed_by: string
    }) => {
        logger.info(`executing utilityFunctions.updateAlertHistory`);
        config.method = 'POST';
        config.url = `${SapConfig.updateAlertHistoryApiEndpoint}/${distributorId}`;
        config.data = data;
        logger.info(`Config send to api from axios call: ${JSON.stringify(config)}`);
        let response = null;
        try {
            response = await axios(config);
            return response;
        } catch (err) {
            logger.error("Error in the UPDATE ALERT HISTORY API call:", err);
            return {
                status: 500,
                message: "Technical Error",
                data: null
            };
        }
    }
}

export default UtilityFunctions;
