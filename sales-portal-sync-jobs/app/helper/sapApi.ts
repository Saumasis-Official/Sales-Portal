import axios from "axios";
import logger from "../lib/logger";
const SapApiConfig = global['configuration'].sapApi;

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
        // logPayloadSize(config); //to check the payload size
        response = await axios(config);
        if (response == null) {
            logger.info(`SapApi: Response from ${url} is undefined or null`);
            return []
        }
        return response.data
    } catch (err) {
        logger.error(`Error in the ${url} API call: `, err);
        throw err;
    }
}
function logPayloadSize(payload) {
    const jsonString = JSON.stringify(payload);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const sizeInMegabytes = sizeInBytes / (1024 * 1024);
    const sizeInKB = sizeInBytes / (1024);
    console.log(`Payload size: ${sizeInBytes} Bytes, ${sizeInKB} KB, ${sizeInMegabytes} MB`);
}
export const SapApi = {
    async getWarehouseDetails(distributorId: string, distributionChannel: string, divisions: any[]) {
        try {
            const url = `${SapApiConfig.warehouseDetailsOnDistChannel}/${distributorId}/${distributionChannel}/${divisions.toString()}`;
            const warehouseDetails = await apiCall('GET', url, null);
            return warehouseDetails;
        } catch (error) {
            logger.error('Caught Error in SapApi -> getWarehouseDetails', error);
            throw error;
        }
    },

    async validateDistributorSalesOrder(distId, data) {
        try {
            const url = `${SapApiConfig.validateUrl}/${distId}?auto_order=true`;
            return await apiCall('POST', url, data)
        } catch (error) {
            logger.error('Caught Error in SapApi -> validateDistributorSalesOrder', error);
            throw error;
        }
    },

    async reportValidationError(distId,errorObj) {
        try {
            const url = `${SapApiConfig.reportErrorUrl}/${distId}`;
            return await apiCall('POST',url, errorObj);
        } catch (error) {
            logger.error('Caught Error in SapApi -> reportValidationError', error);
            throw error;
        }
    }
}