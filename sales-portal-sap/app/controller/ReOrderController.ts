import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import { UtilModel } from '../models/UtilModel';
class ReOrderController {

    static async getReOrderDetails(req: any) {
        
        try {
            logger.info('Fetching re-order details with request query:', req.query);
            const login_id = req.user.login_id;
            const queryData = req.query;
            const checkSoNumberWithDistIdResult = await UtilModel.getReOrderData({login_id, queryData})
            
            logger.info('Re-Order: checkSoNumberWithDistIdResult', checkSoNumberWithDistIdResult?.rows || []);

            if (checkSoNumberWithDistIdResult?.rows.length) {
                return { success: true, data: checkSoNumberWithDistIdResult.rows };
                /*
                    As per the fix for the issue SOPE-4506, the re-order itemss are fetched from sales portal db 
                    and need not to be sent to SAP for further validation. Hence the below code is commented.
                */
                // const reOrderResponse = await UtilityFunctions.sendToSapReOrder(queryData.so_number);
                
                // if (reOrderResponse.status == 200) {
                //     logger.info('Successfully fetched Re-Order details with response:', reOrderResponse.data);
                //     return { success: true, data: reOrderResponse.data };
                // } else {
                //     logger.info('Failed to Fetch Re-Order Details with response:', reOrderResponse);
                //     return { success: false, data: reOrderResponse.data };
                // }
            } else {
                logger.info('inside ReOrderController -> getReorderDetails, Error: SO details is not found for re-order:');
                return { success: false, data: null };
            }
        } catch (error) {
            logger.error('Error in fetching reorder:', error);
          
            return { success: false, data: null };
        }
    }

}

export default ReOrderController;