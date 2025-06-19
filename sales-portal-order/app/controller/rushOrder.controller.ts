import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { RushOrderService } from '../service/rushOrder.service';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';
import { LogService } from '../service/LogService';

class RushOrderController {
    public static async fetchRushOrderRequests(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> fetchRushOrderRequests');
        try {
            const {queryParams} = req.body;
            const { roles, user_id } = req?.user;
            
            const result = await RushOrderService.fetchRushOrderRequests(roles,user_id,queryParams);
            
            if(result) {
                logger.info(`inside rushOrderController -> fetchRushOrderRequests, success, rowCount: ${result.rowCount}`);
                return res.status(200)
                    .json(responseTemplate.success(result,SuccessMessage.FETCH_RUSH_ORDER_REQUESTS));
            }
            logger.info(`inside rushOrderController -> fetchRushOrderRequests,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.FETCH_RUSH_ORDER_REQUESTS));
        } catch (error) {
            logger.error(`inside rushOrderController -> fetchRushOrderRequests, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    };

    public static async insertOrderRequest(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> insertOrderRequest');
        try {
            const { po_number, approver_email, location, rsm, reason, comments } = req.body;
            const result = await RushOrderService.insertOrderRequest(po_number, approver_email, location, rsm, reason, comments);
            if (result) {
                logger.info(`inside rushOrderController -> insertOrderRequest, success`);
                return res.status(200)
                    .json(responseTemplate.success(result, SuccessMessage.INSERT_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> insertOrderRequest,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.INSERT_ORDER_REQUEST));
        } catch (error) {
            logger.error(`inside rushOrderController -> insertOrderRequest, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    };

    public static async fetchApprovalCount(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> fetchApprovalCount');
        try {
            const { user_id } = req?.user;
            
            const result = await RushOrderService.fetchApprovalCount(user_id);
            
            if(result) {
                logger.info(`inside rushOrderController -> fetchApprovalCount, success, approvalCount: ${result.count}`);
                return res.status(200)
                    .json(responseTemplate.success(result,SuccessMessage.RUSH_ORDER_APPROVAL_COUNT));
            }
            logger.info(`inside rushOrderController -> fetchApprovalCount,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.RUSH_ORDER_APPROVAL_COUNT));
        } catch (error) {
            logger.error(`inside rushOrderController -> fetchApprovalCount, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async setExpired(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> setExpired');
        try {
            
            const result = await RushOrderService.setExpired();
            
            if(result !== null) {
                logger.info(`inside rushOrderController -> setExpired, success`);
                LogService.insertSyncLog('RO_EXPIRY_CHECK', "SUCCESS", null, null, null, true);
                return res.status(200)
                    .json(responseTemplate.success({recordsUpdated : result?.split(',').length},SuccessMessage.RUSH_ORDER_SET_EXPIRED));
            }
            logger.info(`inside rushOrderController -> setExpired,  failure`);
            LogService.insertSyncLog('RO_EXPIRY_CHECK', "FAIL", null, null, `${ErrorMessage.RUSH_ORDER_SET_EXPIRED}`, true);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.RUSH_ORDER_SET_EXPIRED));
        } catch (error) {
            logger.error(`inside rushOrderController -> setExpired, Error:`, error);
            LogService.insertSyncLog('RO_EXPIRY_CHECK', "FAIL", null, null, `${error}`, true);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async updateOrderRequest(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> updateOrderRequest');
        try {
            const { user_id, roles, first_name, last_name, email } = req?.user;
            const { queryParams } = req.body;
            
            const name = `${first_name} ${last_name}`;
            const result = await RushOrderService.updateOrderRequest(queryParams, user_id, roles, name,email);
            
            if(result?.success) {
                logger.info(`inside rushOrderController -> updateOrderRequest, success`);
                return res.status(200)
                    .json(responseTemplate.successMessage(SuccessMessage.UPDATE_RUSH_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> updateOrderRequest,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(result.message));
        } catch (error) {
            logger.error(`inside rushOrderController -> updateOrderRequest, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async fetchOrderRequestByPO(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> fetchOrderRequestByPO');
        try {
            const { po_number } = req.params;
            
            const result = await RushOrderService.fetchOrderRequestByPO(po_number);
            
            if(result) {
                logger.info(`inside rushOrderController -> fetchOrderRequestByPO, success `);
                return res.status(200)
                    .json(responseTemplate.success(result,SuccessMessage.FETCH_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> fetchOrderRequestByPO,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.FETCH_ORDER_REQUEST));
        } catch (error) {
            logger.error(`inside rushOrderController -> fetchOrderRequestByPO, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async updateOrderRequestFromOrders(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> updateOrderRequestFromOrders');
        try {
            const { user_id, roles } = req?.user;
            const { queryParams } = req.body;
            
            const result = await RushOrderService.updateOrderRequestFromOrders(queryParams, user_id, roles);
            
            if(result) {
                logger.info(`inside rushOrderController -> updateOrderRequestFromOrders, success`);
                return res.status(200)
                    .json(responseTemplate.successMessage(SuccessMessage.UPDATE_RUSH_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> updateOrderRequestFromOrders,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.UPDATE_RUSH_ORDER_REQUEST));
        } catch (error) {
            logger.error(`inside rushOrderController -> updateOrderRequestFromOrders, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async fetchROReasons(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> fetchROReasons');
        try {
            const result = await RushOrderService.fetchROReasons();
            
            if(result) {
                logger.info(`inside rushOrderController -> fetchROReasons, success`);
                return res.status(200)
                    .json(responseTemplate.success(result,SuccessMessage.FETCH_RO_REASONS));
            }
            logger.info(`inside rushOrderController -> fetchROReasons,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.FETCH_RO_REASONS));
        } catch (error) {
            logger.error(`inside rushOrderController -> fetchROReasons, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async triggerApprovalEmail(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> triggerApprovalEmail');
        try {
            const { emailParams } = req.body;
            const { user_id, roles } = req?.user;
            const user = `${user_id}#${roles?.join(',')}`;
            const result = await RushOrderService.triggerApprovalEmail(emailParams,user);
            
            if(result) {
                logger.info(`inside rushOrderController -> triggerApprovalEmail, success`);
                return res.status(200)
                    .json(responseTemplate.successMessage(SuccessMessage.TRIGGER_RO_APPROVAL_EMAIL));
            }
            logger.info(`inside rushOrderController -> triggerApprovalEmail,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.TRIGGER_RO_APPROVAL_EMAIL));
        } catch (error) {
            logger.error(`inside rushOrderController -> triggerApprovalEmail, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async updateOrderRequest2(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> updateOrderRequest2');
        try {
            const { user_id, roles, first_name, last_name, email } = req?.user;
            const { distributor_id, po_number, action, reject_comments } = req.body;
            
            const name = `${first_name} ${last_name}`;
            const result = await RushOrderService.updateOrderRequest2(distributor_id, po_number, action , user_id, roles, name,email, reject_comments);
            
            if(result?.success) {
                logger.info(`inside rushOrderController -> updateOrderRequest2, success`);
                return res.status(200)
                    .json(responseTemplate.successMessage(SuccessMessage.UPDATE_RUSH_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> updateOrderRequest2,  failure`);
            return res.status(200).json(responseTemplate.error(result.message, result?.message, result?.data));
        } catch (error) {
            logger.error(`inside rushOrderController -> updateOrderRequest2, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async updateMultipleOrderRequests(req: Request | any, res: Response) {
        logger.info('inside rushOrderController -> updateMultipleOrderRequests');
        try {
            const { user_id, roles, first_name, last_name, email } = req?.user;
            const { data = []} = req.body;
            
            const name = `${first_name} ${last_name}`;
            const result = await RushOrderService.updateMultipleOrderRequests(data , user_id, roles, name,email);
            
            if(result?.success) {
                logger.info(`inside rushOrderController -> updateMultipleOrderRequests, success`);
                return res.status(200)
                    .json(responseTemplate.success(result.data ,SuccessMessage.UPDATE_RUSH_ORDER_REQUEST));
            }
            logger.info(`inside rushOrderController -> updateMultipleOrderRequests,  failure`);
            return res.status(200).json(responseTemplate.error(result.message, result?.message, result?.data));
        } catch (error) {
            logger.error(`inside rushOrderController -> updateMultipleOrderRequests, Error:`, error);
            return res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async sendPendingEmailsToRSMAndCluster(req: Request | any, res: Response){
        logger.info('inside rushOrderController -> sendPendingEmailsToRSMAndCluster');
        try {
            const result = await RushOrderService.sendPendingEmailsToRSMAndCluster();
            
            if(result) {
                logger.info(`inside rushOrderController -> sendPendingEmailsToRSMAndCluster, success`);
                return res.status(200)
                    .json(responseTemplate.successMessage(SuccessMessage.SEND_RO_PENDING_REPORT));
            }
            logger.info(`inside rushOrderController -> sendPendingEmailsToRSMAndCluster,  failure`);
            return res.status(400).json(responseTemplate.errorMessage(ErrorMessage.SEND_RO_PENDING_REPORT));
        } catch (error) {
            logger.error(`inside rushOrderController -> sendPendingEmailsToRSMAndCluster, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static checkROEnabledByARSWindow(req: any, res: any) {
        logger.info('inside RushOrderController -> checkROEnabledByARSWindow');
        const { distributor_id } = req.params;
    
        RushOrderService.checkROEnabledByARSWindow(distributor_id)
          .then((response) => {
            if (response) {
              logger.info('inside RushOrderController -> checkROEnabledByARSWindow, response fetched successfully');
              return res.status(200).json(responseTemplate.success(response, 'Rush Order disabled by not placing ARS order check successful'));
            } else {
              logger.error('inside RushOrderController -> checkROEnabledByARSWindow, response not fetched');
              return res.status(500).json(responseTemplate.errorMessage('Rush Order disabled by not placing ARS order check unsuccessful'));
            }
          })
          .catch((error) => {
            logger.error('inside RushOrderController -> checkROEnabledByARSWindow, Error = ', error);
            return res.status(500).json(responseTemplate.internalServerError());
          });
    }
}

export default RushOrderController;
