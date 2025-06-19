import axios from 'axios';
import logger from '../lib/logger';
const ArsApiConfig = global['configuration'].arsApi;

async function apiCall(method: string, url: string, payload: object | null) {
    const config = {
        method: method,
        url: url,
        headers: {
            'X-Requested-With': 'X',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        data: payload ? JSON.stringify(payload) : '',
    };
    let response: object | null = null;
    try {
        response = await axios(config);
        // return true; // api is taking too much time to respond, getting 502 error, so returning true for now
        if (response == null) {
            logger.info(`ArsApi: Response from ${url} is undefined or null`);
            return [];
        }
        return response['data'];
    } catch (err) {
        logger.error(`Error in the ${url} API call: `, err);
        throw err;
    }
}
export const ArsApi = {
    async forecastDistributorPDPSync() {
        try {
            const url = `${ArsApiConfig.arsBaseUrl}/admin/auto-submit-forecast?forecast_sync=true`;
            return await apiCall('GET', url, null);
        } catch (error) {
            logger.error('Error in ArsApi -> forecastDistributionPDPSync', error);
            throw error;
        }
    },

    async fetchArsConfigurations(configurations: string[], details: boolean = false) {
        try {
            const url = `${ArsApiConfig.arsBaseUrl}/admin/ars-configurations`;
            const payload = {
                configurations,
                details,
            };
            return await apiCall('POST', url, payload);
        } catch (error) {
            logger.error('Error in ArsApi -> fetchArsConfigurations', error);
            throw error;
        }
    },

    async getArsSuggestionForDistributor(distributor_code: string, divisions: string[]) {
        try {
            if (!divisions?.length) {
                return null;
            }
            const url = `${ArsApiConfig.arsBaseUrl}/test-fetch-forecast-for-dist`;
            const payload = {
                distributor_code,
                divisions,
            };
            return await apiCall('POST', url, payload);
        } catch (error) {
            logger.error('Error in ArsApi -> getArsSuggestionForDistributor', error);
            throw error;
        }
    },
};
