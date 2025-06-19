import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { OrderService } from '../service/order.service';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';
import { utilService } from '../service/utilService';
import { utilModel } from '../models/utilModel';

class orderController {
    public async fetchOrders(req: Request, res: Response) {
        logger.info('inside orderController -> fetchOrders');
        try {
            
            const distributorId = req.user.login_id;
            const queryParams = req.query;
            
            const result = await OrderService.fetchOrders(distributorId, queryParams);
            
            if(result) {
                const { orders, drafts, rushDrafts, totalCount, sync, lastSync } = result;
                logger.info(`inside orderController -> fetchOrders,  success`);
                return res.status(200)
                    .json({ success: true, message: SuccessMessage.FETCH_ORDERS, data: orders, drafts, rushDrafts, totalCount, sync, lastSync });
            }
            logger.info(`inside orderController -> fetchOrders,  failure`);
            return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.FETCH_ORDERS));
        } catch (error) {
            logger.error(`inside orderController -> fetchOrders, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async fetchPODetails(req: Request, res: Response) {
        logger.info(`inside orderController -> fetchPODetails`);
        try {
            
            const {po_number, distributor_id, po_index} = req.params;
            const response = await OrderService.fetchPODetails(po_number, distributor_id, po_index);
            
            if (response && response.order_data) {
                logger.info(`inside orderController -> fetchPODetails, fetch order_data success`);
                res.status(200).json(responseTemplate.success(response.order_data, SuccessMessage.FETCH_PO_DETAILS));
            }else{
                logger.info(`inside orderController -> fetchPODetails, fetch order_data failure`);
                res.status(202).json(responseTemplate.errorMessage(ErrorMessage.FETCH_PO_DETAILS));
            }
        } catch (error) {
            logger.error(`inside orderController -> fetchPODetails, Error: `, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async removeDraft(req: Request, res: Response) {
        try {
            logger.info(`removing draft controller`);
            const { po_number } = req.params;
            const { login_id, roles } = req.user;
            if (roles?.includes('SUPPORT')) {
                return res.status(403).json(responseTemplate.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
            }
            const removeDraftResponse = await OrderService.removeDraft(po_number, login_id);
            if (removeDraftResponse) {
                logger.info(`remove draft - success`);
                return res.status(200).json(responseTemplate.successMessage(SuccessMessage.REMOVE_DRAFT_SUCCESS));
            }
            logger.info(`remove draft - failure`);
            res.status(400).json(responseTemplate.error(
                'Error occurred',
                ErrorMessage.REMOVE_DRAFT_ERROR
            ));
        } catch (error) {
            logger.error(`error in removing draft:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async removeExpiredCarts(req: Request, res: Response) {
        try {
            logger.info(`removing expired carts`);
            const distributorId = req.user.login_id;
            let getCartExpiryWindowValue = await utilModel.getAppSettings(['CART_EXPIRY_WINDOW']);
            if (!getCartExpiryWindowValue ||  getCartExpiryWindowValue[0]['key'] !== 'CART_EXPIRY_WINDOW') {
                logger.info('Remove Expired Carts: could not check Cart Expiry Window value as no data found');
                return res.status(200).json(responseTemplate.error(ErrorMessage.CART_EXPIRY_WINDOW_NOT_FOUND, null));
            }

            const cartExpiryWindow = getCartExpiryWindowValue[0];
            logger.info('Remove Expired Carts - App Level Settings: ', cartExpiryWindow);
            const removeExpiredCartsResponse = await OrderService.removeExpiredCarts(distributorId, cartExpiryWindow.value);
            if (typeof removeExpiredCartsResponse === 'number') {
                logger.info(`remove expired carts - success`);
                return res.status(200).json(responseTemplate.success({ delete_count: removeExpiredCartsResponse }, SuccessMessage.REMOVE_EXPIRED_CARTS_SUCCESS));
            }
            logger.info(`remove expired carts - failure`);
            res.status(400).json(responseTemplate.error(
                'Error occurred',
                ErrorMessage.REMOVE_EXPIRED_CARTS_ERROR
            ));
        } catch (error) {
            logger.error(`error in removing expired carts: `, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async getZoneWiseOrders(req: Request, res: Response) {
        try {
            logger.info(`get zone wise orders controller`);
            const { from_date, to_date } = req.body;
            let getZoneWiseOrdersData = await OrderService.getZoneWiseOrders(from_date, to_date);

            if (getZoneWiseOrdersData) {
                logger.info(`get zone wise orders - success`);
                return res.status(200).json({ success: true, data: getZoneWiseOrdersData });
            }
            logger.info(`get zone wise orders - failure`);
            res.status(400).json(responseTemplate.error(
                'Error occurred',
                ErrorMessage.ZONE_WISE_ORDER_ERROR
            ));
        } catch (error) {
            logger.error(`error in get zone wise orders controller:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async getZoneWiseOrdersByOrderType(req: Request, res: Response) {
        try {
            logger.info(`get zone wise orders controller`);
            const { from_date, to_date,orderType } = req.body;
            let getZoneWiseOrdersData = await OrderService.getZoneWiseOrdersByOrderType(from_date, to_date,orderType);
            if (getZoneWiseOrdersData) {
                logger.info(`get zone wise orders - success`);
                return res.status(200).json({ success: true, data: getZoneWiseOrdersData });
            }
            logger.info(`get zone wise orders - failure`);
            res.status(400).json(responseTemplate.error(
                'Error occurred',
                ErrorMessage.ZONE_WISE_ORDER_ERROR
            ));
        } catch (error) {
            logger.error(`error in get zone wise orders controller:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async getCategoryWiseReportedIssues(req: Request, res: Response) {
        try {
            logger.info(`get category wise reported issues controller`);
            const { from_date, to_date } = req.body;
            let getCategoryWiseIssuesData = await OrderService.getCategoryWiseReportedIssues(from_date, to_date);

            if (getCategoryWiseIssuesData) {
                logger.info(`get category wise reported issues - success`);
                return res.status(200).json(responseTemplate.success(getCategoryWiseIssuesData, SuccessMessage.CATEGORY_WISE_ISSUES_SUCCESS));
            }
            logger.info(`get category wise reported issues - failure`);
            res.status(400).json(responseTemplate.error(
                'Error occurred',
                ErrorMessage.CATEGORY_WISE_ISSUES_ERROR
            ));
        } catch (error) {
            logger.error(`error in get category wise reported issues controller:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public async savePromisedCredit(req: Request, res: Response) {
        try {
            logger.info(`inside orderController -> savePromisedCredit`);
            const response = await OrderService.savePromisedCredit(req.body);
          

            if (response) {
                logger.info(`inside orderController -> savePromisedCredit,-> success`);
                return res.status(200).json(responseTemplate.successMessage(SuccessMessage.SAVE_PROMISED_CREDIT));
            }
            logger.info(`inside orderController -> savePromisedCredit,-> failure`);
            res.status(400).json(responseTemplate.errorMessage(ErrorMessage.SAVE_PROMISED_CREDIT));
        } catch (error) {
            logger.error(`inside orderController -> savePromisedCredit, Error: `, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
    
    public async getDistributorUpcomingPDPDays(req: Request, res: Response){
        logger.info('inside orderController -> getDistributorUpcomingPDPDays');
        try {
            
            const { distributor_id } = req.params;
            const { soDate,deliveryDate } = req.body;
            const result = await OrderService.getDistributorUpcomingPDPDays(distributor_id,soDate,deliveryDate);
            if(result) {
                logger.info(`inside orderController -> getDistributorUpcomingPDPDays,  success`);
                return res.status(200).json(responseTemplate.success( result, SuccessMessage.UPCOMING_PDP_FETCH));
            }
            else {
                logger.info(`inside orderController -> getDistributorUpcomingPDPDays,  failure`);
                return res.status(404).json(responseTemplate.errorMessage(ErrorMessage.UPCOMING_PDP_FETCH));
            }
        } catch (error) {
            logger.error(`inside orderController -> getDistributorUpcomingPDPDays, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }

    } 

}

export default orderController;
