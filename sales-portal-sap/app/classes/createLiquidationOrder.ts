import { CreateOrderInterface } from '../interface/CreateOrder';
import { OrderTypes } from '../../enum/OrderTypes';
import { CreateOrderResponse } from '../interface/CreateOrderResponse';
import logger from '../lib/logger';
import { validateHelper } from '../helper/validateHelper';
import { UserService } from '../service/user.service';
import { SapService } from '../service/sap.service';
import UtilityFunctions from '../helper/utilityFunctions';
import sapController from '../controller/SapController';
import commonHelper from '../helper';
import { PDPCheck, PDPConfig } from '../helper/pdp';
import { CreateOrderSAPPayload } from '../interface/createOrderSAPPayload';
import { CreateOrderTransformer2 } from '../transformer/createOrderTransformer2';
import moment from 'moment';
import { SapModel } from '../models/sap.model';
import { createOrderHelper } from '../helper/createOrderHelper';

export class CreateLiquidationOrder implements CreateOrderInterface {
    public order_type: OrderTypes = OrderTypes.LIQUIDATION;
    public orderType: string = 'LIQUIDATION';
    static #instance: CreateLiquidationOrder;

    private constructor() {}

    public static getInstance(): CreateLiquidationOrder {
        if (!this.#instance) {
            this.#instance = new CreateLiquidationOrder();
        }
        return this.#instance;
    }

    public createPayload(order_details: any): CreateOrderSAPPayload {
        try {
            logger.info('inside CreateLiquidationOrder -> createPayload');
            const order_data = order_details['order_data'] || {};
            if (Object.keys(order_data).length === 0) {
                throw new Error('Order data is missing');
            }

            const payload: CreateOrderSAPPayload = CreateOrderTransformer2.transform(order_data);
            return payload;
            
        } catch (e) {
            logger.error('inside CreateLiquidationOrder -> validatePayload, Error: ', e);
            throw e;
        } 
    }

    public async create(po_number: string, user: any): Promise<CreateOrderResponse> {
        try {
            if(!po_number.startsWith('LIQ')){
                throw new Error('Invalid Liquidation PO number');
            }

            const orderDetails = await SapService.getOrderDetailsByPoNumber(po_number);
            if (!orderDetails || !Object.keys(orderDetails).length) {
                throw new Error('Order not found for po_number: ' + po_number);
            }
            const order_data = orderDetails['order_data'] || {};

            //Fetching distributor details
            const distributor_id = orderDetails.distributor_id || '';
            const dbData = await UserService.fetchDistributorProfile(distributor_id);
            if (!dbData) {
                throw new Error('Distributor not found');
            }

            //PDP validations
            const pdpRestrictionResponse = await SapService.getAppLevelSettingsByKeys(['ENABLE_PDP_RESTRICTION']);
            const isGlobalPDPOn = pdpRestrictionResponse?.rows[0]?.value === 'YES' || false;
            const isDbPDPOn = dbData.enable_pdp;

            const pdpWindows = await SapService.getPDPWindows(dbData?.group5_id);
            const pdp: PDPConfig = PDPCheck.updateAppSettings(pdpRestrictionResponse?.rows, pdpWindows, isDbPDPOn);
            let hasPDPRestrinctions = false;
            for (let item of order_data.Itemset) {
                if (isGlobalPDPOn && dbData.enable_pdp && !(item.CMIR === 'X') && item.pdp_day) {
                    const { hasPDPError, errorText } = validateHelper.handlePdpValidate(item.pdp_day, item.reference_date, this.order_type, pdp);
                    if(hasPDPError) hasPDPRestrinctions = true;
                    item['pdp_error'] = errorText;
                }
            }
            if(hasPDPRestrinctions) {
                return {
                    status: false,
                    message: 'Some items are outside PDP window. Please check and remove the items.',
                    data: order_data.Itemset,
                };
            }

            //Creating SAP payload once pdp validation is done
            const sap_payload:CreateOrderSAPPayload = this.createPayload(orderDetails);

            const createOrderResponse = await sapController.sendToSap(sap_payload,'create');
            
            if(!createOrderResponse || !(createOrderResponse.status === 200 || createOrderResponse.status === 201) || !createOrderResponse.data){
                logger.info('inside CreateLiquidationOrder -> create, Error: SAP failure response - ', createOrderResponse);
                return {
                    status: false,
                    message: 'Failed to create order in SAP',
                    data: createOrderResponse?.data || null,    
                };
            }
            
            const response_data = createOrderResponse.data['d'];
            logger.info('inside CreateLiquidationOrder -> create, SAP success response data ',response_data);

            if(!response_data['NAVRESULT'] || !response_data['NAVRESULT']['results']){
                throw new Error('SAP response does not contain NAVRESULT');
            }
            const nav_results: any[] = response_data['NAVRESULT']['results'] || [];
            if(!nav_results.length){
                throw new Error('SAP response NAVRESULT -> results is empty array');
            }
                
            for(let nav_result of nav_results){
                const poNumber = nav_result['PoNumber']? nav_result['PoNumber'] : '';
                const soNumber = nav_result['SalesOrder']? nav_result['SalesOrder'] : '';
                const soValue = nav_result['Net_value']? nav_result['Net_value'] : '';
                let amount = commonHelper.numberWithCommas(soValue);
                
                if (!poNumber || !soNumber || !soValue) {
                    logger.info('inside CreateLiquidationOrder -> create, Error: SAP response does not contain PoNumber or SalesOrder or Sales Value');
                    return {
                        status: false,
                        message: 'SAP response does not contain po_number or so_number or net_value',
                        data: createOrderResponse.data,
                    };
                }

                //Checking if Ship To sent in SAP response is same as in payload sent to SAP
                if(!nav_result['Ship_to'] || nav_result['Ship_to'] !== sap_payload.ShipTo){
                    logger.info('inside CreateLiquidationOrder -> create, Error: SAP response does not contain Ship_to or Ship_to point does not match with payload');
                    return {
                        status: false,
                        message: 'SAP response does not contain Ship_to or Ship_to does not match with payload',
                        data: createOrderResponse.data,
                    };
                }

                //Checking if Sold To sent in SAP response is same as in payload sent to SAP
                if(!nav_result['Sold_to'] || nav_result['Sold_to'] !== sap_payload.SoldTo){
                    logger.info('inside CreateLiquidationOrder -> create, Error: SAP response does not contain Sold_to or Sold_to does not match with payload');
                    return {
                        status: false,
                        message: 'SAP response does not contain Sold_to or Sold_to does not match with payload',
                        data: createOrderResponse.data,
                    };
                }

                //Checking if Unloading point sent in SAP response is same as in payload sent to SAP
                if(!nav_result['Unloading'] || nav_result['Unloading'] !== sap_payload.Unloading){
                    logger.info('inside CreateLiquidationOrder -> create, Error: SAP response does not contain Unloading or Unloading point does not match with payload');
                    return {
                        status: false,
                        message: 'SAP response does not contain Unloading or Unloading does not match with payload',
                        data: createOrderResponse.data,
                    };
                }

                //Saving data in database
                let product_type= 'dist_specific';
                let totalQuantityTon:number = 0;
                order_data['Itemset'].forEach((item: any) => {
                    totalQuantityTon += parseFloat(item['Quantity_Ton'].split(' ')[0]);
                    if(item.item_type === 'universal'){
                        product_type = 'universal';
                    }
                })
                const soDate = moment(UtilityFunctions.getCurrentDate()).format('DD/MM/YYYY');
                const updateOrdersResult = await SapModel.orderQuery.updateOrdersStatement(soNumber, soValue, product_type, poNumber, distributor_id, user?.roles, user?.user_id, 1);
                if(!updateOrdersResult || updateOrdersResult.rowCount === 0){
                    logger.info('inside CreateLiquidationOrder -> create, Error: Failed to update order in database');
                    return {
                        status: false,
                        message: 'Liquidation order created in SAP but failed to update order in database',
                        data: createOrderResponse.data,
                    };
                }
                logger.info('inside CreateLiquidationOrder -> create, Order updated in database successfully');

                //Inserting order history recommendation
                createOrderHelper.insertOrderHistoryRecommendation(order_data.Itemset, distributor_id);

                //Add pak type
                let poDetails = await createOrderHelper.addPackType(order_data);

                //Fetching notification preference
                const selectUserNotificationResult = await  SapModel.orderQuery.getNotificationPreference(distributor_id);
                logger.info('inside CreateLiquidationOrder -> create, notificationpreferanceResult: ',selectUserNotificationResult?.rows[0]);
                if (!selectUserNotificationResult?.rows?.length) {
                    logger.info('inside CreateLiquidationOrder -> create, notification preference does not exists for distributor- '+ distributor_id);
                    continue;
                }
                
                const isSmsEnabled = selectUserNotificationResult.rows[0].po_so_sms;
                const isSmsTseAsmEnabled = selectUserNotificationResult['rows'][0].sms_tse_asm;
                const isEmailEnabled = selectUserNotificationResult['rows'][0].po_so_email;
                const isEmailTseAsmEnabled = selectUserNotificationResult['rows'][0].email_tse_asm;
                

                //Sending SMS
                if (isSmsEnabled && process.env.NODE_ENV !== 'dev'){
                    createOrderHelper.sendSms(orderDetails.mobile, orderDetails.name, orderDetails.distributor_id, po_number, soNumber, soDate, soValue);
                }
                //Fetching TSE/ASM details
                let adminData = await SapService.getTseAsmAdminDetails(distributor_id);
                if (!adminData || !Object.keys(adminData).length) {
                    logger.info('inside CreateLiquidationOrder -> create, Error: Admin data not found for distributor- '+ distributor_id);
                    continue;
                }
                //Sending email
                if (isEmailEnabled) {
                    createOrderHelper.sendEmail(orderDetails?.email, orderDetails.name, distributor_id, po_number, soNumber, soDate, amount, totalQuantityTon, poDetails, adminData);
                }
                //Sending SMS to TSE/ASM
                if (isSmsTseAsmEnabled){
                    createOrderHelper.sendTseAsmSms(distributor_id, po_number, amount, adminData);
                }
                //Sending email to TSE/ASM
                if (isEmailTseAsmEnabled){
                    createOrderHelper.sendTseAsmEmail(orderDetails.name, distributor_id, po_number, soNumber, soDate, amount, totalQuantityTon, poDetails, adminData);
                }            
            
            }

            return {
                status: true,
                message: 'Liquidation order created successfully',
                data: createOrderResponse.data,
            };
            
        } catch (e) {
            logger.error('inside CreateLiquidationOrder -> create, Error: ', e);
            throw e;
        }
    }
}
