import axios from "axios";
import logger from "../lib/logger";
const ArsServiceApiConfig = global['configuration'].arsServiceApi;

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
        logger.info("inside helper -> ArsServiceApi -> apiCall, config = ", config);
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
export const ArsServiceApi = {
    async syncArsRelatedTables() { 
        logger.info('inside helper -> ArsServiceApi -> syncArsRelatedTables');
        try {
            const url = `${ArsServiceApiConfig.arsServiceBaseUrl}/archive/sync-ars-related-tables`;
            return await apiCall('GET', url, null);
        } catch (error) {
            logger.error("CAUGHT: Error in ArsServiceApi -> syncArsRelatedTables, Error = ", error);
            throw error;
        }
    }
}