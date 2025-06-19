import axios from "axios";
import logger from "../lib/logger";
const OrderApiConfig = global['configuration'].orderApi;

async function apiCall(method: string, url: string, payload: any) {
    const config = {
        method: method,
        url: url,
        headers: {
            'X-Requested-With': 'X',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        data: payload ? JSON.stringify(payload) : "",
    };
    let response: any = null;
    try {
        axios(config);
        return true; // api is taking too much time to respond, getting 502 error, so returning true for now
        // if (response == null) {
        //     logger.info(`OrderApi: Response from ${url} is undefined or null`);
        //     return []
        // }
        // return response.data
    } catch (err) {
        logger.error(`Error in the ${url} API call: `, err);
        throw err;
    }
}
export const OrderApi = {
    async forecastDistributorPDPSync(){
        try {
            logger.info('Inside helper -> OrderApi -> forecastDistributorPDPSync ')
            const url = `${OrderApiConfig.orderBaseUrl}/admin/auto-submit-forecast?forecast_sync=true`;
            return await apiCall('GET', url, null);
        } catch (error) {
            logger.error('Error in OrderApi -> forecastDistributionPDPSync', error);
            throw error;
        }
    }
}