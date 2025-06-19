import { RushOrderModel } from "../models/rushOrder.model";
import { UserModel } from "../models/user.model";
import { AdminModel } from "../models/admin.model";
import logger from "../lib/logger";
import Helper from "../helper";
import { UserService } from "./user.service";
import { utilModel } from "../models/utilModel";
import { PDPCheck, PDPConfig } from "../helper/pdp";
import Email from "../helper/email";
import { OrderModel } from "../models/order.model";
import { OrderService } from "./order.service";
import { SapApi } from "../helper/sapApi";
import { UpcomingPDPDateOutputType } from "../enums/upcomingPDPDateOutputType";
import _ from "lodash";
import { Moment } from "moment";
export const RushOrderService = {
    async fetchRushOrderRequests(roles:string[], user_id: string, queryParams: {
                                        status: string | null,
                                        region: string[] | null,
                                        area: string[] | null,  
                                        search: string | null,
                                        startDate: string | null,
                                        endDate: string | null,
                                        limit: number | null,
                                        offset: number | null,
                                    })  
    { 
        
        let dbList: string[] | null = null;
        if (_.isEmpty(_.intersection(roles, ['FINANCE', 'SUPER_ADMIN', 'SUPPORT', 'PORTAL_OPERATIONS', 'VP', 'FINANCE_CONTROLLER']))) {
            const dbListResponse = await UserModel.fetchDBCodesUnderUser(user_id);
            if(dbListResponse){
                logger.info("inside RushOrderService -> fetchRushOrderRequests, dbCodes under user: ", dbListResponse.db_codes);
                dbList = (dbListResponse.db_codes) ? dbListResponse.db_codes : [''];
            }else{
                logger.info("inside RushOrderService -> fetchRushOrderRequests, dbListResponse is null");
                return null;
            }
        }
        const params = {...queryParams,type: 'RUSH',dbList: dbList};
        logger.info("inside RushOrderService -> fetchRushOrderRequests, queryParams: ", params);
        const response = await RushOrderModel.fetchOrderRequests(params);
        return response;
        
    },

    async fetchApprovalCount(user_id: string){
        logger.info("inside RushOrderService -> fetchApprovalCount, email: "+ user_id);
        const response = await RushOrderModel.fetchApprovalCount(user_id);
        return response;
    },

    async setExpired(){
        logger.info("inside RushOrderService -> setExpired ");
        const response = await RushOrderModel.setExpired();
        return response;
    },

    async insertOrderRequest(po_number: string, approver_email: string, location: string, rsm: string, reason: string, comments: string | undefined) {
        logger.info("inside RushOrderService -> insertOrderRequest");
        const tableName = 'order_approval_requests';
        const primaryKey = 'request_number';
        const prefix = 'OR';
        try {
            const uid = await Helper.generateUId(tableName, primaryKey, prefix);
            if (uid) {
                const response = await RushOrderModel.insertOrderRequest(po_number, uid, reason, comments);
                if (response) {
                    RushOrderService.sendOrderRequestApprovalEmail(response?.distributor_id, po_number, response.amount, approver_email, location, rsm, '', reason, comments ?? '');
                    return uid;
                }
                return response;
            }
            return null;
        } catch (error) {
            logger.error("CAUGHT: Error in RushOrderService -> insertOrderRequest, Error: ", error);
            return null;
        }
    },

    async updateOrderRequest(queryParams: {
                                        distributor_id: string,
                                        distributor_name: string,
                                        distributor_email: string,
                                        tse_email: string[],
                                        asm_email: string[],
                                        rsm_email: string[],
                                        cluster_email: string[],
                                        upcoming_pdp: any,
                                        request_date: string,
                                        po_number: string,
                                        so_number: string | null,
                                        so_amount: string | null,
                                        status: string,
                                        tentative_amount: string | undefined,
                                        location: string | undefined,
                                        rsm: string | undefined,
                                        reason: string,
                                        comments: string | undefined,
                                    }, login_id: string, role: string[], name: string,email:string)
    {
        logger.info("inside RushOrderService -> updateOrderRequest ");
        const { distributor_name, request_date, upcoming_pdp, distributor_email, tse_email, asm_email, rsm_email, cluster_email, ...restParams } = queryParams;
        
        const canRespond = await RushOrderService.checkRORequest(queryParams.po_number,login_id,email);
        if(!canRespond || !canRespond.success){
            return {success: false, message: canRespond?.errorMessage || "Failed to validate request."};
        }
        const params = { ...restParams, responded_by: login_id, role };
        const response = await RushOrderModel.updateOrderRequest(params);

        if(response){
            const {distributor_id, status, po_number, so_amount,  tentative_amount, location, rsm, reason, comments} = queryParams;
            if(status === 'PENDING'){
                const ro_approvers_res = await OrderModel.getAppLevelSettings('RO_APPROVERS');
                const ro_approvers: string[] = ro_approvers_res?.length ? ro_approvers_res[0].value.split(',') : [];
                const email_index = ro_approvers.findIndex(approver => approver.toLowerCase() === email.toLowerCase());
                const next_approver_email:string = (email_index + 1 < ro_approvers.length) ? ro_approvers[email_index + 1] : '';
                logger.info("inside RushOrderService -> updateOrderRequest, sending email to next approver: "+ next_approver_email);
                const message = `${name} has approved the request for Rush Order`;
                RushOrderService.sendOrderRequestApprovalEmail(distributor_id, po_number, tentative_amount??'-', next_approver_email, location??'-', rsm??'-', message, reason, comments ?? '');
            }
            const email_payload = {
                db_name: distributor_name,
                db_code: distributor_id,
                req_date: request_date,
                db_email: distributor_email,
                tse_email: tse_email || [],
                asm_email: asm_email || [],
                rsm_email: rsm_email || [],
                cluster_email: cluster_email || [],
                po_number: po_number,
                amount: so_amount??'-',
                upcoming_pdp_date: upcoming_pdp??'-',
                status: status,
                approver_name: name,
            };
            Email.rushOrderResponseNotification(email_payload);
        }
        return response ? {success: true, message: "Request updated successfully"} : {success: false, message: "Failed to update request"};
    },

    async sendOrderRequestApprovalEmail(distributorId: string, po_number: string, amount: string, approver_email: string, location: string, rsm: string, message: string, reason: string , comments: string, triggered_by: string | null | undefined = null) {
        logger.info("inside RushOrderService -> sendOrderRequestApprovalEmail, distributorId: "+distributorId);
        // const dbDetails = await UserService.getUserDetails(distributorId);
        const dbDetails = await UserService.fetchDistributorDetails(distributorId);
        const upcomingPDPDate = await RushOrderService.calculateUpcomingPDPDate(dbDetails);
        const approverDetails = await AdminModel.adminDetailsStatement(approver_email);
        if(!approverDetails?.rows[0]){
            logger.error("inside RushOrderService -> sendOrderRequestApprovalEmail, approver with email: "+approver_email+" not found/inactive.");
            return;
        }
        const approver_obj = approverDetails?.rows[0];
        const emailPayload = {
            db_name: dbDetails?.name,
            db_code: dbDetails?.id,
            req_date: `${Helper.formatDate(new Date())}`,
            po_number: po_number,
            amount: amount,
            upcoming_pdp_date: Helper.formatDate(upcomingPDPDate),
            approver: {first_name: approver_obj.first_name, last_name: approver_obj.last_name, email: approver_obj.email}, 
            message: message,
            location: location,
            rsm: rsm,
            reason: reason,
            comments: comments,
            created_by: triggered_by
        }
        await Email.rushOrderNotification(emailPayload);
    },

    async calculateUpcomingPDPDate(dbDetails: any, today = new Date(), outputType: UpcomingPDPDateOutputType | null = null) {
        /**
         * OUTPUT: To determine if we want upcoming startDates or rddDates as output
         * 1."START_DATE"
         * 2."RDD_DATE"
         */
        try {
            let definedPDPCounter: number = 0;
            const startDates: Date[] = [];
            const rddDates: Date[] = [];

            const db_level_pdp = dbDetails?.enable_pdp ?? false;
            const appSettings = await utilModel.getAppSettings();
            const pdpWindows = await utilModel.getPDPWindows(dbDetails?.group5_id);
            const pdp:PDPConfig = PDPCheck.updateAppSettings(appSettings, pdpWindows, db_level_pdp)
            for (const details of dbDetails?.distributor_sales_details) {
                if (db_level_pdp && details.distribution_channel === 10) {
                    if (!details.pdp_day || (details.pdp_day.slice(0, 2) === "FN" && !details.reference_date)) {
                        startDates.push(new Date());
                        rddDates.push(new Date());
                    } else {
                        const check = PDPCheck.checkPdpDay(details?.pdp_day, details?.reference_date, pdp, today);
                        check?.orderStartDate && startDates.push(check?.orderStartDate);
                        check?.pdpDate && rddDates.push(check?.pdpDate);
                        definedPDPCounter++;
                    }
                }
            }
            //finding the upcoming pdp date..
            //iterate through the startDates array and find the earliest upcoming date including today an return
            if (outputType === UpcomingPDPDateOutputType.RDD_DATE) {
                const upcomingRdd = rddDates.filter((date) => date > today);
                const rdddate= upcomingRdd.length > 0 ? upcomingRdd?.reduce((prev, curr) => prev < curr ? prev : curr) : new Date();
                return rdddate;
            } else if (outputType === UpcomingPDPDateOutputType.AUTO_CLOSURE_RDD) { 
                /**
                 * https://tataconsumer.atlassian.net/browse/SOPE-3520: Handling SO auto closure if no PDP is defined for a GT distributor
                 * If no PDP is defined for a GT distributor, then the RDD should be calculated based on the order date.
                 * Which is so_date(today) + 1 day
                 */
                if (definedPDPCounter === 0) { 
                    const rdd = today;
                    rdd.setDate(rdd.getDate() + 1);
                    return rdd;
                } else {
                    const upcomingRdd = rddDates.filter((date) => date > today);
                    const rdddate = upcomingRdd.length > 0 ? upcomingRdd?.reduce((prev, curr) => prev < curr ? prev : curr) : new Date();
                    return rdddate;
                }
            } else {
            const startDatesWithToday = startDates.filter((date) => date >=today);
            const earliestOrderDates = startDatesWithToday.length > 0 ? startDatesWithToday?.reduce((prev, curr) => prev < curr ? prev : curr) : new Date();
            return earliestOrderDates;
            }
        } catch (error) {
            logger.error("CAUGHT: Error in RushOrderService -> calculateUpcomingPDPDate, Error: ", error);
            return null;
        }
    },

    async fetchOrderRequestByPO(poNumber: string){
        logger.info("inside RushOrderService -> fetchOrderRequestByPO, poNumber: "+poNumber);
        const response = await RushOrderModel.fetchOrderRequestByPO(poNumber);
        return response;
    },

    async updateOrderRequestFromOrders(queryParams: {
        distributor_id: string,
        distributor_name: string,
        distributor_email: string | null,
        tse_email: string[],
        asm_email: string[],
        rsm_email: string[],
        cluster_email: string[],
        upcoming_pdp: any,
        request_date: string,
        po_number: string,
    }, login_id: string, role: string[]) {
        logger.info("inside RushOrderService -> updateOrderRequestFromOrders, po_number: " + queryParams.po_number);
        const { distributor_name, request_date, upcoming_pdp, distributor_email, tse_email, asm_email, rsm_email, cluster_email, ...restParams } = queryParams;

        const response = await RushOrderModel.updateOrderRequestFromOrders(queryParams.po_number,login_id,role);

        if (response) {
            logger.info("inside RushOrderService -> updateOrderRequestFromOrders, succes, sending email... ");
            const email_payload = {
                db_name: distributor_name,
                db_code: queryParams.distributor_id,
                req_date: request_date,
                db_email: distributor_email || '',
                tse_email: tse_email || [],
                asm_email: asm_email || [],
                rsm_email: rsm_email || [],
                cluster_email: cluster_email || [],
                po_number: queryParams.po_number,
                amount: response,
                status: "APPROVED",
            };
            Email.rushOrderResponseNotification(email_payload);
        }
        return response;
    },

    async checkRORequest(poNumber: any, userId: string, email: string) {
        logger.info('inside RushOrderService -> checkRORequest, poNumber: '+ poNumber + ' , email: '+ email);
        try {
    
          const ro_approvers_res = await OrderModel.getAppLevelSettings('RO_APPROVERS');
          const ro_approvers = ro_approvers_res?.length ? ro_approvers_res[0].value.split(',') : [];
    
          const response =  {success: true, errorMessage : ''};
          
          const requestData = await RushOrderModel.fetchRORequest(poNumber);
          
          if(!requestData || Object.keys(requestData).length === 0){
            logger.error(`inside RushOrderService -> checkRORequest, Request ID for po - ${poNumber} not found`);
            response.success = false;
            response.errorMessage = 'Request ID not found';
            return response;
          }

          const { responded_by, status, request_number} = requestData;
    
          if(status !== 'PENDING'){
            logger.error(`inside RushOrderService -> checkRORequest, Request - ${request_number} is already ${status}`);
            response.success = false;
            response.errorMessage = `Request is already ${status}`;
            return response;
          }
    
          const email_index = ro_approvers.findIndex(approver => approver.toLowerCase() === email.toLowerCase());
          if(email_index === -1){
            logger.error(`inside RushOrderService -> checkRORequest, You are not authorized to approve request - ${request_number}`);
            response.success = false;
            response.errorMessage = 'You are not authorized to approve this request';
            return response;
          }
    
          const expiredResult = await RushOrderModel.setExpired();
          if(expiredResult?.includes(poNumber)){
            logger.error(`inside RushOrderService -> checkRORequest, Request - ${request_number} has expired`);
            response.success = false;
            response.errorMessage = 'Request has expired';
            return response;
          }
    
          if(email_index > 0){
            const fetchPreviousUserResult = await AdminModel.adminDetailsStatement(ro_approvers[email_index - 1]);
            const previousUser = fetchPreviousUserResult?.rows.length? fetchPreviousUserResult.rows[0] : {};
            if(Object.keys(previousUser).length === 0){
                logger.error(`inside RushOrderService -> checkRORequest, Previous approver not found, for request - ${request_number}`);
              response.success = false;
              response.errorMessage = 'Previous approver not found';
              return response;
            }

            if(!responded_by || !responded_by.find(user => user.includes(previousUser.user_id))){
                logger.error(`inside RushOrderService -> checkRORequest, Previous approver has not responded to request - ${request_number}`);
              response.success = false;
              response.errorMessage = 'Previous approver has not responded to this request';
              return response;
            }
          }
    
          if(responded_by && responded_by.find(user => user.includes(userId))){
            logger.error(`inside RushOrderService -> checkRORequest, You have already responded to request - ${request_number}`);
            response.success = false;
            response.errorMessage = 'You have already responded to this request';
            return response;
          }
    
          logger.info(`inside RushOrderService -> checkRORequest, You are allowed to approve/reject Request - ${request_number} `);
          return response;
        } catch (error) {
          logger.error('inside RushOrderService -> checkRORequest, Error: ', error);
          return null;
        }
      },

      async fetchROReasons(){
        logger.info('inside RushOrderService -> fetchROReasons');
        const response = await RushOrderModel.fetchOrderRequestReasons('RO_REASONS');
        return response;
      },

      async triggerApprovalEmail(params: {
                distributor_id: string,
                po_number: string,
                amount: string,
                approver_email: string,
                previous_approver_email: string | null | undefined,
                location: string,
                rsm: string,
                reason: string,
                comments: string | undefined | null,
                approver_no: number,
            }, triggered_by: string)
        {
            logger.info('inside RushOrderService -> triggerApprovalEmail: params: ', params);
            try{
                const { distributor_id, po_number, amount, approver_email, previous_approver_email, location, rsm, reason, comments, approver_no } = params;
                let message = '';
                if(approver_no > 1){
                    if(!previous_approver_email){
                        logger.error("inside RushOrderService -> triggerApprovalEmail, previous_approver_email is not provided for approval_no: "+approver_no);
                        return false;
                    }
                    const approverDetails = await AdminModel.adminDetailsStatement(previous_approver_email);
                    if(!approverDetails?.rows[0]){
                        logger.error("inside RushOrderService -> triggerApprovalEmail, approver with email: "+previous_approver_email+" not found/inactive.");
                        return  false;
                    }
                    const approver_obj = approverDetails?.rows[0];
                    message = `${approver_obj.first_name} ${approver_obj.last_name} has approved the request for Rush Order`;
                }
                
                await RushOrderService.sendOrderRequestApprovalEmail(distributor_id, po_number, amount, approver_email, location, rsm, message, reason, comments ?? '', triggered_by);
                return true;
            }catch(error){
                logger.error('inside RushOrderService -> triggerApprovalEmail, Error: ', error);
                return false;
            }
            
        },

        async checkRORequest2(poNumber: any, request_number: string, status: string, responded_by: any[], userId: string, email: string) {
            logger.info('inside RushOrderService -> checkRORequest2, poNumber: '+ poNumber + ' , email: '+ email);
            try {
        
              const ro_approvers_res = await OrderModel.getAppLevelSettings('RO_APPROVERS');
              const ro_approvers = ro_approvers_res?.length ? ro_approvers_res[0].value.split(',') : [];
        
              const response =  {success: true, errorMessage : ''};
        
              if(status !== 'PENDING'){
                logger.error(`inside RushOrderService -> checkRORequest2, Request - ${request_number} is already ${status}`);
                response.success = false;
                response.errorMessage = `Request is already ${status}`;
                return response;
              }
        
              const email_index = ro_approvers.findIndex(approver => approver.toLowerCase() === email.toLowerCase());
              if(email_index === -1){
                logger.error(`inside RushOrderService -> checkRORequest2, You are not authorized to approve request - ${request_number}`);
                response.success = false;
                response.errorMessage = 'You are not authorized to approve this request';
                return response;
              }
        
              const expiredResult = await RushOrderModel.setExpired();
              if(expiredResult?.includes(poNumber)){
                logger.error(`inside RushOrderService -> checkRORequest2, Request - ${request_number} has expired`);
                response.success = false;
                response.errorMessage = 'Request has expired';
                return response;
              }
        
              if(email_index > 0){
                const fetchPreviousUserResult = await AdminModel.adminDetailsStatement(ro_approvers[email_index - 1]);
                const previousUser = fetchPreviousUserResult?.rows.length? fetchPreviousUserResult.rows[0] : {};
                if(Object.keys(previousUser).length === 0){
                    logger.error(`inside RushOrderService -> checkRORequest2, Previous approver not found, for request - ${request_number}`);
                  response.success = false;
                  response.errorMessage = 'Previous approver not found';
                  return response;
                }
    
                if(!responded_by || !responded_by.find(user => user.includes(previousUser.user_id))){
                    logger.error(`inside RushOrderService -> checkRORequest2, Previous approver has not responded to request - ${request_number}`);
                  response.success = false;
                  response.errorMessage = 'Previous approver has not responded to this request';
                  return response;
                }
              }
        
              if(responded_by && responded_by.find(user => user.includes(userId))){
                logger.error(`inside RushOrderService -> checkRORequest2, You have already responded to request - ${request_number}`);
                response.success = false;
                response.errorMessage = 'You have already responded to this request';
                return response;
              }
        
              logger.info(`inside RushOrderService -> checkRORequest2, You are allowed to approve/reject Request - ${request_number} `);
              return response;
            } catch (error) {
              logger.error('inside RushOrderService -> checkRORequest2, Error: ', error);
              return null;
            }
        },

        async updateOrderRequest2( distributor_id: string, po_number: string, action: string , login_id: string, role: string[], name: string, email:string, reject_comments:string){
            logger.info("inside RushOrderService -> updateOrderRequest2, distributor_id: "+distributor_id+", po_number: "+po_number+", action: "+action);
            
            try{
                //Fetching distributor details, rush order request data and po details
                const dbDetails = await UserService.fetchDistributorDetails(distributor_id);
                const requestData = await RushOrderModel.fetchRORequest(po_number);
                const poDetails = await OrderService.fetchPODetails(po_number, distributor_id, undefined);

                if(!dbDetails){
                    logger.error("inside RushOrderService -> updateOrderRequest2, Distributor not found");
                    return {success: false, message: "Distributor not found"};
                }
                if(Object.keys(requestData).length === 0){
                    logger.error("inside RushOrderService -> updateOrderRequest2, Request not found");
                    return {success: false, message: "Request not found"};
                }
                if(!poDetails){
                    logger.error("inside RushOrderService -> updateOrderRequest2, PO not found");
                    return {success: false, message: "PO not found"};
                }

                //checking if user can respond to the request
                const { request_number, responded_by, status } = requestData;
                const canRespond = await RushOrderService.checkRORequest2(po_number, request_number, status, responded_by, login_id,email);

                if(!canRespond || !canRespond.success){
                    return {success: false, message: canRespond?.errorMessage || `Failed to validate request ${request_number}.`};
                }

                //fetching RO approvers and determining the resultant status of the rush order request
                const ro_approvers_res = await OrderModel.getAppLevelSettings('RO_APPROVERS');
                const ro_approvers = ro_approvers_res?.length ? ro_approvers_res[0].value.split(',') : [];

                let resultantStatus = '';
                if(action === 'APPROVE'){
                    if(ro_approvers[ro_approvers.length - 1].toLowerCase() === email.toLowerCase()){
                        resultantStatus = 'APPROVED';
                    }else{
                        resultantStatus = 'PENDING';
                    }
                }else{
                    resultantStatus = 'REJECTED';
                }

                //extracting so_number and so_amount from po details
                const po = poDetails.order_data[0] || {};
                const {SO_NUMBER = '', SO_VALUE = '', OrderAmount = ''} = po;
                let so_amount:string = SO_VALUE;
                let so_number:string = SO_NUMBER;
                let tentative_amount:string = OrderAmount;

                const beginTransactionResponse = await UserService.beginTransaction('UPDATE_RUSH_ORDER_REQUEST');
                if(!beginTransactionResponse){
                    logger.error("inside RushOrderService -> updateOrderRequest2, Failed to begin transaction");
                    return {success: false, message: "Failed to update request"};
                }

                //if the resultant status is APPROVED, validate the order in SAP and create order in SAP
                if(resultantStatus === 'APPROVED'){
                    const validateResponse = await SapApi.validateOrder(po, distributor_id);
                    if(!validateResponse || !validateResponse.success){
                        logger.error("inside RushOrderService -> updateOrderRequest2, SAP validation failed for po: "+po_number);
                        return {success: false, message: "Failed to validate order"};
                    }

                    //checking if any items failed validation in SAP
                    const navresult = validateResponse.data?.d?.NAVRESULT?.results || [];
                    // navresult.forEach(item => {
                    //     item.Message = 'Test error';
                    // });
                    const itemset = validateResponse.data?.d?.Itemset?.results || [];
                    const errorItems: any[] = [];
                    navresult.forEach(item => {
                        if(item.Message !== 'Order ready for creation'){
                            const po = itemset.find(o => o.ITM_NUMBER === item.Item) || {};
                            errorItems.push({psku: po?.MATERIAL, error: item.Message, item_number: item.Item, quantity: po?.REQ_QTY});
                        }
                    });
                    if(errorItems.length){
                        logger.error("inside RushOrderService -> updateOrderRequest2, SAP validation failed for po: "+po_number);
                        return {success: false, message: "PO validation failed for some items", data: errorItems};
                    }

                    //creating order in SAP on successful validation
                    logger.info("inside RushOrderService -> updateOrderRequest2, SAP validation success for po: "+po_number);
                    const createOrderResponse = await SapApi.createOrder(po, validateResponse.data, distributor_id, dbDetails?.distributor_sales_details, requestData?.requested_by);
                    if(!createOrderResponse || !createOrderResponse.success){
                        logger.error("inside RushOrderService -> updateOrderRequest2, SAP order creation failed for po: "+po_number);
                        return {success: false, message: "Failed to create order"};
                    }

                    logger.info("inside RushOrderService -> updateOrderRequest2, SAP order creation success for po: "+po_number);
                    const createOrderNavResult = createOrderResponse.data?.d.NAVRESULT.results[0] || {};
                    so_number = createOrderNavResult?.SalesOrder || '';
                    so_amount = createOrderNavResult?.Net_value || '';  //Net_value is the total amount of the order after so is created in SAP
                    tentative_amount = so_amount;
                }

                //updating the rush order request in orders_approval_requests table
                const params = { distributor_id, po_number,reject_comments, so_number ,so_amount, status: resultantStatus, responded_by: login_id, role };
                const updateResponse = await RushOrderModel.updateOrderRequest(params);
                if(!updateResponse){
                    logger.error("inside RushOrderService -> updateOrderRequest2, Failed to update request");
                    // const rollbackResponse = await UserService.rollbackTransaction('UPDATE_RUSH_ORDER_REQUEST');
                    return {success: false, message: "Failed to update request"};
                }

                //Sending rush order request email to next approver if status is PENDING
                if(resultantStatus === 'PENDING'){
                    const ro_approvers_res = await OrderModel.getAppLevelSettings('RO_APPROVERS');
                    const ro_approvers: string[] = ro_approvers_res?.length ? ro_approvers_res[0].value.split(',') : [];
                    const email_index = ro_approvers.findIndex(approver => approver.toLowerCase() === email.toLowerCase());
                    const next_approver_email:string = (email_index + 1 < ro_approvers.length) ? ro_approvers[email_index + 1] : '';
                    const location = `${dbDetails?.group5} - ${dbDetails?.area_code}`;
                    const rsm = dbDetails?.rsm?.map(o => `${o?.first_name} ${o?.last_name}`).join(', ') || '-';
                    logger.info("inside RushOrderService -> updateOrderRequest2, sending email to next approver: "+ next_approver_email);
                    const message = `${name} has approved the request for Rush Order`;
                    RushOrderService.sendOrderRequestApprovalEmail(distributor_id, po_number, tentative_amount??'-', next_approver_email, location, rsm, message, requestData?.reason, requestData?.comments ?? '');
                }

                //Sending rush order response email to distributor and other approvers
                const tse_email=  dbDetails?.tse?.filter(o => o.email).map(o => o.email);
                const asm_email=  dbDetails?.asm?.filter(o => o.email).map(o => o.email);
                const rsm_email= dbDetails?.rsm?.filter(o => o.email).map(o => o.email);
                const cluster_email= dbDetails?.cluster?.filter(o => o.email).map(o => o.email);
                const email_payload = {
                    db_name: dbDetails?.name,
                    db_code: distributor_id,
                    req_date: po?.REQ_DATE_H,
                    db_email: dbDetails?.email,
                    tse_email: tse_email || [],
                    asm_email: asm_email || [],
                    rsm_email: rsm_email || [],
                    cluster_email: cluster_email || [],
                    po_number: po_number,
                    amount: tentative_amount??'-',
                    status: resultantStatus,
                    approver_name: name,
                };
                Email.rushOrderResponseNotification(email_payload);

                //committing transaction
                const commitTransactionResponse = await UserService.commitTransaction('UPDATE_RUSH_ORDER_REQUEST');
                if(!commitTransactionResponse){
                    logger.error("inside RushOrderService -> updateOrderRequest2, Failed to commit transaction");
                    const rollbackResponse = await UserService.rollbackTransaction('UPDATE_RUSH_ORDER_REQUEST');
                    return {success: false, message: "Failed to update request"};
                }
                return {success: true, message: "Request updated successfully"};
            }catch(error){
                logger.error("inside RushOrderService -> updateOrderRequest2, Error: ", error);
                return {success: false, message: "Failed to update request"};
            }
        },

        async updateMultipleOrderRequests(data: {distributor_id:string, po_number:string, action:string, reject_comments:string}[], login_id: string, role: string[], name: string, email:string){
            logger.info("inside RushOrderService -> updateMultipleOrderRequests, po_numbers: ",data.map(o => o.po_number));
            try{
                const responseArr: {po_number:string, success: boolean, message: string}[] = [];
                for(const item of data){
                    const { distributor_id, po_number, action,reject_comments } = item;
                    if(!distributor_id || !po_number || !action)
                        continue;
                    const response = await RushOrderService.updateOrderRequest2(distributor_id, po_number, action, login_id, role, name, email, reject_comments);
                    if(response.success){
                        responseArr.push({po_number, message: response.message, success: true});
                    }else{
                        responseArr.push({po_number, message: response.message, success: false});
                    }
                }  
                return {success: true, message: "Requests updated successfully", data: responseArr};
            }catch(error){
                logger.error("inside RushOrderService -> updateMultipleOrderRequests, Error: ", error);
                return {success: false, message: "Failed to update requests", data: []};
            }
        },

    async fetchPendingNonExpiredRequests(){
        logger.info("inside RushOrderService -> fetchPendingNonExpiredRequests");
        return await RushOrderModel.fetchPendingRequests();
    },

    async sendPendingEmailsToRSMAndCluster(){
        logger.info("inside RushOrderService -> sendPendingEmailsToRSMAndCluster");
        try{
            const pendingRequests = await RushOrderService.fetchPendingNonExpiredRequests();
            
            if(!pendingRequests){
                logger.info("inside RushOrderService -> sendPendingEmailsToRSMAndCluster, Failed to fetch pending requests");
                return false;
            }
            if(pendingRequests.length === 0){
                logger.info("inside RushOrderService -> sendPendingEmailsToRSMAndCluster, No pending requests found");
                return true;
            }
            
            const rsmObj = {};
            const clusterObj = {};
            pendingRequests.filter(request => request.rsm_email).forEach(req => { 
                if(!rsmObj[req.rsm_code]) {
                    rsmObj[req.rsm_code] = {
                        name: req.rsm_name,
                        to: req.rsm_email,
                        requests: []
                    };
                }
                rsmObj[req.rsm_code].requests.push({
                    distributor_id : req.distributor_id,
                    distributor_name: req.distributor_name,
                    po_number: req.po_number,
                    request_number: req.request_number,
                    area_code: req.area_code,
                    amount: req.amount,
                    request_date:  Helper.formatDate(req.created_on),
                    status: req.status
                });
            });

            pendingRequests.filter(request => request.cluster_email).forEach(req => {
                if(!clusterObj[req.cluster_code]) {
                    clusterObj[req.cluster_code] = {
                        name: req.cluster_name,
                        to: req.cluster_email,
                        requests: []
                    };
                }
                clusterObj[req.cluster_code].requests.push({
                    distributor_id : req.distributor_id,
                    distributor_name: req.distributor_name,
                    po_number: req.po_number,
                    request_number: req.request_number,
                    area_code: req.area_code,
                    amount: req.amount,
                    request_date:  Helper.formatDate(req.created_on),
                    status: req.status
                });
            });

            for(const key in rsmObj){
                const data = rsmObj[key];
                await Email.nonExpiredRONotification(data);
            }
            for(const key in clusterObj){
                const data = clusterObj[key];
                await Email.nonExpiredRONotification(data);
            }

            return true;

        }catch(error){
            logger.error("inside RushOrderService -> sendPendingEmailsToRSMAndCluster, Error: ", error);
            return false;
        }
    },

    async checkROEnabledByARSWindow(distributorId: string){
        logger.info("inside RushOrderService -> checkROEnabledByARSWindow, distributorId: "+distributorId);
        try{
            const roLockArsWindowConfig = await utilModel.getAppSettings(['RO_LOCK_ARS_WINDOW']);
            if(!roLockArsWindowConfig?.length){
                logger.error("inside RushOrderService -> checkROEnabledByARSWindow, configurations for RO Lock based on ARS window is not present in app_level_settings.");
                return null;
            }
            const ars_days = +(roLockArsWindowConfig[0]?.value);
            if(ars_days == 0){
                logger.info("inside RushOrderService -> checkROEnabledByARSWindow, ARS window is not configured, allowing rush orders.");
                return { canPlace: true, lastARSDate : '', message: 'ARS window is not configured. Hence rush order is allowed.' }; // If ARS window is not configured, allow placing orders
            }
            const lastArsOrder = await OrderModel.fetchLastARSOrder(distributorId);
            if(lastArsOrder == null){
                logger.info("inside RushOrderService -> checkROEnabledByARSWindow, Failed to fetch last ARS order for distributor: "+distributorId);
                return null;
            }
            if(Object.keys(lastArsOrder).length === 0){
                logger.info("inside RushOrderService -> checkROEnabledByARSWindow, No ARS orders found for distributor: "+distributorId);
                return { canPlace: true, lastARSDate : '', message: 'No ARS orders found. Hence rush order is allowed'}; // If no ARS orders found, do not allow placing rush orders
            }
            if(!lastArsOrder?.ao_enable ){
                logger.info("inside RushOrderService -> checkROEnabledByARSWindow, ARS orders are not enabled for distributor: "+distributorId);
                return { canPlace: true, lastARSDate : '', message: 'ARS order is not enabled for distributor. Hence rush order is allowed.'}; // If ARS orders are not enabled, allow placing rush orders
            }
            const lastArsDate:Moment = Helper.getISTDateTime(lastArsOrder?.created_on);
            const currentDate:Moment = Helper.getISTDateTime();

            // Normalize the time to midnight (00:00:00) for both dates
            const normalizedLastArsDate = lastArsDate.clone().startOf('day');
            const normalizedCurrentDate = currentDate.clone().startOf('day');

            const differenceInDays = normalizedCurrentDate.diff(normalizedLastArsDate, 'days');
            const differenceInHours = currentDate.diff(lastArsDate, 'hours');
            const canPlace = differenceInDays <= (ars_days);

            logger.info("inside RushOrderService -> checkROEnabledByARSWindow, canPlaceRushOrder: "+canPlace+", lastARSDate: "+lastArsDate.format('DD-MMM-YYYY HH:mm:ss') + ' ,currentServerDate: ' + currentDate.format('DD-MMM-YYYY HH:mm:ss') + ' , differenceInDays: '+differenceInDays+ ' ,differenceInHours: '+ differenceInHours+ ' , ro_lock_ars_window: '+ars_days);
            return { canPlace, lastARSDate: lastArsDate.format('DD-MMM-YYYY HH:mm:ss'), message: canPlace ? 'ARS order(s) is/are placed within the configured limit. Hence rush order is allowed.' : `Last ARS order was placed more than ${differenceInDays} days (${differenceInHours} hours) ago. Rush order is not allowed since no ARS order is placed within ${ars_days} days.` };
        }catch(error){
            logger.error("inside RushOrderService -> checkROEnabledByARSWindow, Error: ", error);
            return null;
        }
    }
};