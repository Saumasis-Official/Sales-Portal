/**
 * @file order.service
 * @description defines order service methods
*/
import logger from "../lib/logger";
import { OrderModel } from "../models/order.model";
import { UserService } from "./user.service";
import { RushOrderService } from "./rushOrder.service";
import Helper from "../helper";
import { UpcomingPDPDateOutputType } from "../enums/upcomingPDPDateOutputType";

export const OrderService = {

    /**
     * @param email
     */
    async removeDraft(poNumber: string, distributorId: string) {
        return await OrderModel.removeDraft(poNumber, distributorId);
    },

    async removeExpiredCarts(distributorId: string, cartExpiryWindow: number) {
        return await OrderModel.removeExpiredCarts(distributorId, cartExpiryWindow);
    },

    async getZoneWiseOrders(fromDate: string, toDate: string) {
        return await OrderModel.getZoneWiseOrders(fromDate, toDate);
    },

    async getZoneWiseOrdersByOrderType(fromDate: string, toDate: string,orderType: string) {
        return await OrderModel.getZoneWiseOrdersByOrderType(fromDate, toDate,orderType);
    },

    async getCategoryWiseReportedIssues(fromDate: string, toDate: string) {
        return await OrderModel.getCategoryWiseReportedIssues(fromDate, toDate);
    },
    async getTseAsmAdminDetails(userId: any) {
        return OrderModel.getTseAsmAdminDetails(userId);
    },

    async getMaterialsList(distributorId: string, queryParams: any, isNourishco:boolean = false){
        logger.info(`inside orderService -> getMaterialsList, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`);
        const response =  await OrderModel.getMaterialsList(distributorId, queryParams, isNourishco);
        return response;
    },

    async fetchOrders(distributorId: string, queryParams: any){
        logger.info(`inside orderService -> fetchOrders, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`);
        const response =  await OrderModel.fetchOrders(distributorId, queryParams);
        return response;
    },

    async fetchPODetails(poNumber: string, distributorId: string, po_index: string | undefined){
        logger.info(`inside orderService -> fetchPODetails, distributorId: ${distributorId}, poNumber: ${poNumber}`);
        const response =  await OrderModel.fetchPODetails(poNumber, distributorId, po_index);
        return response;
    },

    async fetchWarehouseDetails(distributorId: string){
        logger.info(`inside orderService -> fetchWarehouseDetails, distributorId: ${distributorId}`);
        const response =  await OrderModel.fetchWarehouseDetails(distributorId);
        return response;
    },

    async savePromisedCredit(data: any){
        logger.info(`inside orderService -> savePromisedCredit,
            distrubutor_id: ${data.distributor_id}, plant : ${data.plant},type : ${data.type}, 
            po_number: ${data.po_number}, input_type: ${data.input_type}, reference_date: ${data.reference_date},
            promised_credit_type: ${data.promised_credit_type}, order_value: ${data.order_value}, open_order_value: ${data.open_order_value},
            credit_shortfall: ${data.credit_shortfall}, promised_credit_date: ${data.promised_credit_date}, 
            promised_credit_time: ${data.promised_credit_time}, promised_credit: ${data.promised_credit}`);
        const response =  await OrderModel.savePromisedCredit(data);
        return response;
    },

    async getDistributorUpcomingPDPDays(distributorId: string, soDate: string, deliveryDate:string[]){
        logger.info("inside OrderService ->getDistributorUpcomingPDPDays, distributorId: "+distributorId);  
        const dbDetails = await UserService.fetchDistributorDetails(distributorId);
        const soDateTimestamp = new Date(soDate);
        const upcomingPDPDate = await RushOrderService.calculateUpcomingPDPDate(dbDetails, soDateTimestamp, UpcomingPDPDateOutputType.RDD_DATE);
        const upcomingDeliveryPDPDate:string[]=[];
        if (deliveryDate.length) {
            const deliveryDateArray = deliveryDate.map((date) => {
                const dateArray = date.split(' ')[0].split('/');
                const time = date.split(' ')[1];
                date = dateArray[2] + '-' + dateArray[1] + '-' + dateArray[0] + 'T' + time;
                const deliveryDateTimestamp = new Date(date);
                return deliveryDateTimestamp;
            });
            const deliveryPDPResult = await Promise.all(deliveryDateArray.map(async (date) =>
                RushOrderService.calculateUpcomingPDPDate(dbDetails, date, UpcomingPDPDateOutputType.RDD_DATE)
            ));
            if(deliveryPDPResult.length){
                deliveryPDPResult.forEach((date) => {
                    upcomingDeliveryPDPDate.push(Helper.formatDate(date));
                });
                return { upcomingSOPDPDate: Helper.formatDate(upcomingPDPDate), upcomingDeliveryPDPDate };
            }
        }
        else {
            const upcomingSOPDPDate = Helper.formatDate(upcomingPDPDate);
            return { upcomingSOPDPDate};
        }
    },

    async fetchLastARSOrder(distributorId: string) {
        logger.info(`inside orderService -> fetchLastARSOrder, distributorId: ${distributorId}`);
        const response = await OrderModel.fetchLastARSOrder(distributorId);
        return response;
    }
}