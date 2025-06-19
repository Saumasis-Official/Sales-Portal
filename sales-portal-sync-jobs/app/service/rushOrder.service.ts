import { RushOrderModel } from "../models/rushOrder.model";;
import logger from "../lib/logger";


export const RushOrderService = {
  async setExpired(){
        logger.info("inside  SyncJob-> RushOrderService -> setExpired ");
        const response = await RushOrderModel.setExpired();
        return response;
    },

   
};