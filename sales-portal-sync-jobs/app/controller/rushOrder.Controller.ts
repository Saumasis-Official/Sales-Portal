import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { RushOrderService } from '../service/rushOrder.service';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import { LogService } from '../service/LogService';

class RushOrderController {
   
    static async setExpired(req: Request | any, res: Response) {
        logger.info('inside SyncJob-> rushOrderController -> setExpired');
        try {
            
            const result = await RushOrderService.setExpired();
            
            if(result !== null) {
                logger.info(`inside rushOrderController -> setExpired, success`);
                LogService.insertSyncLog('RO_EXPIRY_CHECK', "SUCCESS", null, null, null,null, true);
                return res.status(200)
                    .json(responseTemplate.success({recordsUpdated : result?.split(',').length},SuccessMessage.RUSH_ORDER_SET_EXPIRED));
            }
            logger.info(`inside rushOrderController -> setExpired,  failure`);
            LogService.insertSyncLog('RO_EXPIRY_CHECK', "FAIL", null, null, `${ErrorMessage.RUSH_ORDER_SET_EXPIRED}`,null, true);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.RUSH_ORDER_SET_EXPIRED));
        } catch (error) {
            logger.error(`inside rushOrderController -> setExpired, Error:`, error);
            LogService.insertSyncLog('RO_EXPIRY_CHECK', "FAIL", null, null, `${error}`,null, true);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

   
}

export default RushOrderController;
