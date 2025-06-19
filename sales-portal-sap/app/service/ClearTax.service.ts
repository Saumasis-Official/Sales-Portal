import logger from "../lib/logger";
import axios from "axios";
const clearTaxConfig = global['configuration'].clearTax;

export const ClearTaxService = {
    async getPan(data: any) {
        try {
            logger.info('inside MdmService -> getPAN');
            const config = {
                method: 'post',
                url: `${clearTaxConfig.panUrl}`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clearTaxConfig.auth.authorization}`,
                    'x-cleartax-auth-token': `${clearTaxConfig.auth.xCleartaxAuthToken}`
                },
                data: JSON.stringify(data)
            }
            const basicResponse = await axios(config);
            config.url = clearTaxConfig.panExtraUrl;
            const extraResponse =  await axios(config);

            if (basicResponse && extraResponse) {
                logger.info(`PAN fetched successfully with response`)
                return Object.assign({},basicResponse.data,extraResponse.data);
            }
            else {
                logger.info(`PAN fetching failed with response`)
                return null;
            }
        }
        catch (err) {
            logger.error(`Error in MdmService -> getGstPan`);
            return null;
        }
    },
    async getGst(data: any) {
        logger.info('inside ClearTaxService -> getGST');
        try {
            const config = {
                method: 'post',
                url: `${clearTaxConfig.gstUrl}`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clearTaxConfig.auth.authorization}`,
                    'x-cleartax-auth-token': `${clearTaxConfig.auth.xCleartaxAuthToken}`
                },
                data: JSON.stringify(data)
            }
            const respone = await axios(config);
            if (respone) {
                logger.info(`GST fetched successfully with response`)
                return respone.data;
            }
            else {
                logger.info(`GST fetching failed with response`)
                return null;
            }
        }
        catch (err) {
            logger.error(`Error in MdmService -> getGstPan`);
            return null;
        }
    }
}