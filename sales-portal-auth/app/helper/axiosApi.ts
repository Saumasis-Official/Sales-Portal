import axios, { AxiosResponse } from 'axios';
import logger from '../lib/logger';
import { AuthModel } from '../models/authModel';

const url = global['configuration'].url;

const axiosApi = {
    async postApiUpdateEmailMobile(apiUrl, type, updateValue, user_id) {
        const messageData = {
            type,
            updateValue,
        };
        const responseData = await AuthModel.getLastFailedAttemptCount(user_id);
        const correlation_id = responseData.length && responseData[responseData.length - 1].correlation_id;

        const config = {
            method: 'post',
            url: `${apiUrl}/sap/api/v1/update-email-mobile/${user_id}`,
            data: messageData,
            headers: {
                'x-correlation-id': correlation_id,
            },
        };

        logger.info(`Config email mobile ${JSON.stringify(config)}`);
        const response: AxiosResponse = await axios(config);
        const { status, statusText, data } = response;
        if (status === 200) {
            return {
                status,
                message: statusText,
                data,
            };
        } else {
            return {
                message: 'Not Accepted',
                data: null,
            };
        }
    },
    async postApiSeedingData(payload, url: string) {
        const config = {
            method: 'POST',
            url: url,
            headers: {
                'X-Requested-With': 'X',
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(payload),
        };

        try {
            const response = await axios(config);
            if (response == null) {
                logger.info(`Response from ${url},  ${payload} is undefined or null`);
            }
            return response?.data?.data ?? [];
        } catch (err) {
            logger.error(`CAUGHT: Error in the url: ${url}, payload: ${JSON.stringify(payload)} API call: `, err);
            return null;
        }
    },

    async getSoClosureStatus(so: string[]) {
        const payload = {
            so_list: so,
        };
        const api = `${url.ARS_ALLOCATION_BASE_URL}/auto-closure/so-closure-status`;
        const config = {
            method: 'POST',
            url: api,
            headers: {
                'X-Requested-With': 'X',
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(payload),
        };
        try {
            const response = await axios(config);
            if (response == null) {
                logger.info(`Response from ${api},  ${payload} is undefined or null`);
            }
            return response?.data?.data ?? [];
        } catch (error) {
            logger.error(`CAUGHT: Error in the url: ${api}, payload: ${JSON.stringify(payload)} API call: `, error);
            return null;
        }
    },
};

export default axiosApi;
