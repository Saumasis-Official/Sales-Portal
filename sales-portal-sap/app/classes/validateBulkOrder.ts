import { ValidateOrderInterface } from "../interface/ValidateOrder";
import { OrderTypes } from "../../enum/OrderTypes";
import { ValidateOrderResponse } from "../interface/ValidateOrderResponse";
import logger from "../lib/logger";
import { orderForValidationObj } from "../interface/orderForValidation";
import { itemsForValidationObj } from "../interface/itemsForValidation";
import { partnersForValidationObj } from "../interface/partnersForValidation";
import { ErrorMessage } from "../constant/error.message";
import { SuccessMessage } from "../constant/sucess.message";
import { validateHelper } from "../helper/validateHelper";
import { SapService } from "../service/sap.service";
import UtilityFunctions from "../helper/utilityFunctions";
import {ValidateOrderTransformer} from "../transformer/validateOrderTransformer2";
import sapController from "../controller/SapController";
import { roles } from "../constant/persona";
import { sapPayloadPartners } from "../interface/sapPayloadPartners";
import { SapValidationPayloadItems } from "../interface/sapValidationPayloadItems";
import { UserService } from "../service/user.service";

export class ValidateBulkOrder implements ValidateOrderInterface{
    order_type: OrderTypes  = OrderTypes.BULK;
    public orderType: string = 'BULK';
    static #instance: ValidateBulkOrder;

    private constructor() {
    }

    public static getInstance(): ValidateBulkOrder {
        if(!this.#instance){
            this.#instance = new ValidateBulkOrder();
        }
        return this.#instance;
    }


    public validatePayload(order_data: any): { status: boolean; message: string; } {
        const response = {
            status: true,
            message: ""
        };
        try{
            // Define the keys of the OrderForValidation interface
            const requiredKeys = Object.keys(orderForValidationObj);
            //You can add any extra keys that are required for the regular order here

            // Find missing keys
            const missingKeys = requiredKeys.filter(key => !(key in order_data));

            if (missingKeys.length > 0) {
                logger.error('inside validateBulkOrder -> validatePayload, Missing required parameters - ', missingKeys);
                response.status = false;
                response.message = `Validation failed: Missing required parameters - ${missingKeys.join(', ')}`;
                return response;
            }

            // Validate items array
            if (!Array.isArray(order_data.items) || order_data.items.length === 0) {
                logger.error('inside validateBulkOrder -> validatePayload, Validation failed: items array is either missing or empty.');
                response.status = false;
                response.message = "Validation failed: 'items' array is either missing or empty.";
                return response;
            }

            const invalidItems = order_data.items.filter(
                (item: any) => {
                    const requiredItemKeys = Object.keys(itemsForValidationObj);
                    const missingItemKeys = requiredItemKeys.filter(key => !(key in item));
                    return missingItemKeys.length > 0;
                }
            );
            if (invalidItems.length > 0) {
                logger.error('inside validateBulkOrder -> validatePayload, Validation failed: items array contains invalid objects.');
                response.status = false;
                response.message = "Validation failed: 'items' array contains invalid objects.";
                return response;
            }

            // Validate partners array
            if (!Array.isArray(order_data.partners) || order_data.partners.length === 0) {
                logger.error('inside validateBulkOrder -> validatePayload, Validation failed: partners array is either missing or empty.');
                response.status = false;
                response.message = "Validation failed: 'partners' array is either missing or empty.";
                return response;
            }

            const invalidPartners = order_data.partners.filter(
                (partner: any) => {
                    const requiredPartnerKeys = Object.keys(partnersForValidationObj);
                    const missingPartnerKeys = requiredPartnerKeys.filter(key => !(key in partner));
                    return missingPartnerKeys.length > 0;
                }
            );
            if (invalidPartners.length > 0) {
                logger.error('inside validateBulkOrder -> validatePayload, Validation failed: partners array contains invalid objects.');
                response.status = false;
                response.message = "Validation failed: 'partners' array contains invalid objects.";
                return response;
            }
            
        }catch(e){
            logger.error('inside validateBulkOrder -> validatePayload, Error: ', e);
            response.status = false;
            response.message = ErrorMessage.VALIDATE_PAYLOAD;
        }finally{
            return response;
        }
    }

    public async validate(order_data: any, distributor_id: string, user: any): Promise<ValidateOrderResponse>  {
        const response: ValidateOrderResponse = {
            status: true,
            message: "",
            data: null
        };

        try{
            let po_number = order_data?.po_number || '';
            const todayDate = UtilityFunctions.getCurrentDate();
            let req_date = todayDate, pur_date = todayDate;
            if(!po_number){
                po_number = validateHelper.generatePO(this.order_type);
                order_data['po_number'] = po_number;
            }else{
                const orderData = await SapService.getOrderDetailsByPoNumber(po_number);
            
                if(orderData && Object.keys(orderData).length > 0){
                    req_date = orderData['order_data']['REQ_DATE_H'];
                    pur_date = orderData['order_data']['PURCH_DATE'];
                }
            }

            order_data['sales_org'] = '1010';
            order_data['doc_type'] = 'ZOR';
            order_data['distribution_channel'] = '10';
            order_data['division'] = '14';
            order_data['req_date'] = req_date;
            order_data['pur_date'] = pur_date;
            const payloadValidationResponse = this.validatePayload(order_data);
            if(!payloadValidationResponse.status){
                throw new Error(payloadValidationResponse.message);
            }
            const sap_payload = ValidateOrderTransformer.transform(order_data);
            const sap_response =  await sapController.sendToSap(sap_payload,'validate' ); 
            const {status, message, data} = sap_response;
            if(status === 200 || status === 201){
                const validatedOrderResult:any[] = (data?.d?.NAVRESULT?.results) || [];
                if(!validatedOrderResult || validatedOrderResult.length === 0){
                    throw new Error('No results array as response from SAP');
                }
                let validationSuccess = true;
                for (let result of validatedOrderResult) {
                    if (result.Message !== 'Order ready for creation') {
                      validationSuccess = false;
                      break;
                    }
                }

                const userRoles = user?.roles || [];
                if(validationSuccess){
                    logger.info('inside validateBulkOrder -> validate, SAP Validation success');
                    if(userRoles.length === 0 || !userRoles.includes(roles.SUPPORT)){
                        const pdpRestrictionResponse = await SapService.getAppLevelSettingsByKeys(['ENABLE_PDP_RESTRICTION']);
                        const isGlobalPDPOn = pdpRestrictionResponse?.rows[0]?.value === 'YES' || false;
                        const dbData = await UserService.fetchDistributorProfile(distributor_id);
                        sap_payload['PDP'] = isGlobalPDPOn && dbData?.enable_pdp ? "ON" : "OFF";
                        const saveOrderResponse = await this.saveOrder(order_data, sap_payload, data, distributor_id, user);
                        if(!saveOrderResponse.status){
                            throw new Error(saveOrderResponse.message);
                        }
                        if(data?.d) data.d['db_response'] = saveOrderResponse.data;
                    }
                }
                response.data = data;
                response.message = message;
                response.status = validationSuccess;
                
            }else{
                logger.error('inside validateBulkOrder -> validate, SAP Validation failed: ', message);
                response.status = false;
                response.message = message || ErrorMessage.VALIDATE_BULK;
                response.data = data || null
            }
        }catch(e){
            logger.error('inside validateBulkOrder -> validate, Error: ', e);
            response.status = false;
            response.message = (<Error>e).message || ErrorMessage.VALIDATE_BULK;
            response.data = null;
        }finally{
            return response;
        }
    }
    public async saveOrder(order_data: any, sap_payload: any, sap_result: any, distributor_id: string, user: any): Promise<{status: boolean, message: string, data: any}> {
        const response = {
            status: false,
            message: ErrorMessage.SAVE_ORDER,
            data: [] as any[]
        }
        logger.info('inside validateBulkOrder -> saveOrder');
        try{
            const nav_result = sap_result?.d?.NAVRESULT?.results || [];
            let totalAmount = 0;
    
            sap_payload['partnerset'] = sap_payload?.partnerset.map((partner: sapPayloadPartners) => {
                                            partner['PARTN_NAME'] = order_data['partners']?.find(
                                                                    (itm: any) =>
                                                                        itm['partner_number'] == parseInt(partner.PARTN_NUMB) &&
                                                                        itm['partner_role'] == partner.PARTN_ROLE,
                                                                    )?.partner_name || '';
                                            return partner;
                                        }) || [];
            const initialOrderItemsMap = order_data['items']
                                            ?.reduce((acc: any, item: any) => {
                                                    acc[item.item_number] = item;
                                                    return acc;
                                                }
                                            , {});

            const itemset: {[date: string]: {totalAmount: number, items: any[]}} = {};
            sap_payload?.Itemset.forEach((item: SapValidationPayloadItems) => {
                let res = nav_result?.filter((itm: any) => itm.Item === item.ITM_NUMBER) || [];
                const materialData:any = initialOrderItemsMap[item.ITM_NUMBER] || {};
                
                res?.forEach((itm, idx) => {
                    if (itm.Item == item.ITM_NUMBER) {
                        item['TENTATIVE'] = itm.Tentitive || '';
                        item['BUOM'] = itm.Buom || '';
                        item['DESCRIPTION'] = materialData.description || '';
                        item['SALES_UNIT'] = materialData.sales_unit || '';
                        item['PACK_TYPE'] = materialData.pak_type || '';
                        item['Quantity_Ton'] = itm.Quantity_Ton || '';
                        item['original_quantity'] = materialData.original_quantity || '';
                        item['stock_in_hand'] = materialData.stock_in_hand || '';
                        item['stock_in_transit'] = materialData.stock_in_transit || '';
                        item['open_order'] = materialData.open_order || '';
                        item['item_type'] = materialData.item_type || '';
                        item['pdp_day'] = itm.PDP_Day || '';
                        item['reference_date'] = itm.Reference_date || '';
                        item['CMIR'] = itm.CMIR_Flag || '';
                        if('ReqDeliveryDate' in materialData){
                            item['RDD'] = materialData.ReqDeliveryDate;
                            if(!(materialData.ReqDeliveryDate in itemset)){
                                itemset[materialData.ReqDeliveryDate] = {totalAmount: 0, items: []};
                            }
                        }
                    }
                    if (itm.Message != 'Order ready for creation') {
                        item['error'] += `${idx > 0 ? ', ' : ''} ${itm.Message}`;
                    } else {
                        totalAmount += Math.ceil(itm.Tentitive);
                    }
                
                });
                if(materialData?.ReqDeliveryDate in itemset){
                    itemset[materialData.ReqDeliveryDate].totalAmount += Math.ceil(+item['TENTATIVE']);
                    itemset[materialData.ReqDeliveryDate].items.push(item);
                }
            });
    
            const dataToBeInserted: string[] = [];
            for(let key in itemset){
                let temp = structuredClone(sap_payload);
                temp['Itemset'] = itemset[key].items;
                temp['OrderAmount'] = itemset[key].totalAmount;
                temp['REQ_DATE_H'] = key;
                dataToBeInserted.push(JSON.stringify(temp));
            }
            


            const deleteResponse = await SapService.deletePurchaseOrder(order_data.po_number);
            if(deleteResponse == null){
                throw new Error('Error in deleting existing purchase order records having po_number: ' + order_data.po_number);
            }
            const insertPayload = {
                distributor_id: distributor_id,
                po_period: UtilityFunctions.getCurrentMMYY(),
                po_number: order_data.po_number,
                so_number: '',
                cart_number: '',
                created_by: user?.roles ? user.user_id : null,
                created_by_user_group: user?.roles ? user.roles?.join(",") : 'SELF',
                status: 'DRAFT',
                order_type: this.orderType,
                plant: nav_result[0]?.Plant || '',
            };

            let insertStatus = true;
            let insertedRows = 0;
            let poIndex = 1;
            let insertedResult:any[] = [];
            for(let od of dataToBeInserted) {
                insertPayload['order_data'] = od.replace(/'/g, "''");
                insertPayload['po_index'] = poIndex;
                
                const insertResult = await SapService.savePurchaseOrder(insertPayload);
                if (insertResult && insertResult.rowCount) {
                    logger.info(`inside validateBulkOrder -> saveOrder, PO: ${order_data.po_number}, po_index: ${poIndex}, saved successfully`);
                    let resultObj = insertResult.rows[0];
                    const od_obj = JSON.parse(od);
                    resultObj['date'] = od_obj?.REQ_DATE_H ? od_obj.REQ_DATE_H : null;
                    insertedResult.push(resultObj);
                    insertedRows += insertResult.rowCount;
                    poIndex += 1;
                } else {
                    logger.error(`inside validateBulkOrder -> saveOrder, PO: ${order_data.po_number}, po_index: ${poIndex}, failed to save PO`);
                    insertStatus = false;
                }
            };
            response.status = insertStatus;
            response.message = insertStatus ? SuccessMessage.SAVE_ORDER : ErrorMessage.SAVE_ORDER;
            response.data = insertedResult;    

        }catch(error){
            logger.error('inside validateBulkOrder -> saveOrder, Error: ', error);
            response.message = (<Error>error).message || ErrorMessage.SAVE_ORDER;
        }finally{
            return response;
        }
    }
}