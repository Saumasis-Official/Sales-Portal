import { OrderTypes } from '../../enum/OrderTypes';
import { CreateOrderInterface } from '../interface/CreateOrder';
import { CreateRegularOrder } from '../classes/createRegularOrder';
import commonHelper from '.';
import logger from '../lib/logger';
import otpEvents from './otp';
import { SapModel } from '../models/sap.model';
import Email from './email';
import { CreateSelfLiftingOrder } from '../classes/createSelfLiftingOrder';
import { CreateLiquidationOrder } from '../classes/createLiquidationOrder';
export const createOrderHelper = {
    getCreator: function (order_type: OrderTypes): CreateOrderInterface {
        switch (order_type) {
            case OrderTypes.NORMAL:
                return CreateRegularOrder.getInstance();
            case OrderTypes.SELF_LIFTING:
                return CreateSelfLiftingOrder.getInstance();
            case OrderTypes.LIQUIDATION:
                return CreateLiquidationOrder.getInstance();
            default:
                throw new Error('Invalid order type');
        }

    },

    sendSms: async function(mobile:string, db_name:string, db_code:string, po_number:string, so_number:string, so_date:string, amount:string): Promise<void> {
        // Implement the logic to send SMS
        try {
            let smsData = {
                mobile: commonHelper.modifyMobileNumber(mobile),
                distributorName: db_name,
                distributorCode: db_code,
                poNumber: po_number,
                soRefrence: so_number,
                soDate: so_date,
                amount
            };
            logger.info('data sent for sms: ',smsData);
            await otpEvents.creat_order_message(smsData);
        } catch (error) {
            logger.error(`Error: cannot send sms to distributor- ${db_code}`, error);
        }
        logger.info('SMS sent successfully to mobile number: '+ mobile);
    },

    sendTseAsmSms: async function(distributor_id:string, poNumber:string, amount:string, adminData:any): Promise<void> {
        try {
            const otpDataArr = [adminData.tse, adminData.asm].flat() || [];
            if (otpDataArr.length === 0) {
                logger.info('No ASM/TSE data found for SMS sending');
                return;
            }
            let smsData:any[] = otpDataArr.map((v) => ({
                                                    ...v,
                                                    distributorId: distributor_id,
                                                    poNumber,
                                                    amount,
                                                })) || [];
            logger.info('sms data to be sent: ', smsData);
            smsData.forEach((element) => {
                otpEvents.tse_admin_order_creation(element);
            });
        } catch (error) {
            logger.error(`error in sending sms to admin: `, error);
        }
    },

    sendEmail: async function(emailId:string, db_name:string, db_code: string, po_number:string, so_number:string, so_date:string, amount:string, quantity_in_ton:number, poDetails:any, adminData:any ): Promise<void> {
        try{
            let emailData = {
                area: adminData.region ? adminData.region : '',
                asm: adminData.asm 
                        ? adminData.asm.map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`).join(', ')
                        : '',
                asmareacode: adminData.asm ? adminData.asm.map(item => item.code || '').join(', ') : '',
                tse: adminData.tse
                        ? adminData.tse.map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`).join(', ')
                        : '',
                tseareacode: adminData.tse ? adminData.tse.map(item => item.code || '').join(', ') : '',
                email: emailId,
                distributorName: db_name,
                distributorCode: db_code,
                poNumber: po_number,
                poDate: poDetails.PURCH_DATE.replace(/\./g, '/'),
                soRefrence: so_number,
                soDate: so_date,
                shipTo: poDetails.partnerset.find((item) => item.PARTN_ROLE == 'WE') || '',
                unloadingPoint: poDetails.partnerset.find((item) => item.PARTN_ROLE == 'Y1') || '',
                amount,
                totalQuantityTon: quantity_in_ton.toFixed(2) + ' TO',
                items: poDetails.Itemset,
            };
            logger.info('Sending create order email notification to: '+ emailId);
            Email.order_created({ email: emailId }, emailData);
        }catch(error){
            logger.error(`Error in sending order creation email to distributor: ${db_code} ,for po: ${po_number} -> `, error);
        }
    },

    sendTseAsmEmail: async function(db_name:string, db_code: string, po_number:string, so_number:string, so_date:string, amount:string, quantity_in_ton:number, poDetails:any, adminData:any ): Promise<void> {
        try{
            const otpDataArr = [adminData.tse, adminData.asm].flat() || [];
            if (otpDataArr.length === 0) {
                logger.info('No ASM/TSE data found for Email sending');
                return;
            }
                
            let arrayEmail = otpDataArr.filter(a => a.email).map((a) => a.email);
            if(!arrayEmail.length){
                logger.info('No TSE/ASM email ids found for sending email');
                return;
            }
            logger.info(`email to be sent to the following TSEs and ASMs - `+ arrayEmail.toString());
            const shipTo= poDetails.partnerset.find((item) => item.PARTN_ROLE == 'WE')?.PARTN_NAME || '';
            const shipToCode= poDetails.partnerset.find((item) => item.PARTN_ROLE == 'WE')?.PARTN_NUMB || '';
            const unloadingPoint= poDetails.partnerset.find((item) => item.PARTN_ROLE == 'Y1')?.PARTN_NAME || shipTo;
            const unloadingPointCode= poDetails.partnerset.find((item) => item.PARTN_ROLE == 'Y1')?.PARTN_NUMB || shipToCode;

            Email.tse_admin_order_creation(arrayEmail, {
                area: adminData.region ? adminData.region : '',
                asm: adminData.asm 
                        ? adminData.asm.map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`).join(', ')
                        : '',
                asmareacode: adminData.asm ? adminData.asm.map(item => item.code || '').join(', ') : '',
                tse: adminData.tse
                        ? adminData.tse.map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`).join(', ')
                        : '',
                tseareacode: adminData.tse ? adminData.tse.map(item => item.code || '').join(', ') : '',
                distributorId: db_code,
                distributorname: db_name,
                poNumber: po_number,
                poDate: poDetails?.PURCH_DATE.replace(/\./g, '/'),
                amount,
                soNumber: so_number,
                soDate: so_date,
                shipTo,
                shipToCode,
                unloadingPoint,
                unloadingPointCode,
                totalQuantityTon: quantity_in_ton.toFixed(2) + ' TO',
                items: poDetails.Itemset,
            });
        }catch(error){
            logger.error(`Error in sending order creation email to ASMS/TSEs of distributor: ${db_code} ,for PO: ${po_number} ->  `, error);
        }  
    },

    addPackType: async function(order_data:any): Promise<any> {
        const poDetails = order_data;
        try {
            let tempMaterials = order_data.Itemset?.map((item: any) => item.MATERIAL) || [];
            let tempMaterialsString = tempMaterials.join("','");
            
            logger.info(`fetching pack type`);
            let packTypeRow = (await SapModel.orderQuery.fetchPoDetails.fetchPODetailsPackTypeSqlStatement(tempMaterialsString))?.rows || [];
            if (packTypeRow.length) {
                for (const [index,value] of poDetails.Itemset.entries()) {
                    value.TENTATIVE = commonHelper.numberWithCommas(value.TENTATIVE);
                }
                const materialHashMap= packTypeRow.reduce((acc, item)=> Object.assign({}, acc, {[item.code]: item.pak_type}),{});
                poDetails.Itemset = poDetails.Itemset.map((item) => Object.assign({}, item, {PACK_TYPE: materialHashMap[item.MATERIAL]}));
            }
        } catch (error) {
            logger.error(`error in fetch pack type:`, error);
        }finally{
            return poDetails;
        }
    },

    insertOrderHistoryRecommendation: async function(items:any[], distributor_id:string): Promise<boolean> {
        try{
            const materialCodesArray = items.map((item: any) => { return {material_code: item.MATERIAL}; }) || [];
            if (!materialCodesArray.length) {
                logger.error(`No material codes found in order data`);
                return false;
            }
            const insertResult =   await  SapModel.getGenerateOrderHistory(materialCodesArray, distributor_id);
            if(insertResult && insertResult.rowCount){
                logger.info(`Order history recommendation inserted successfully`);
                return true;
            }else{
                logger.error(`Failed to insert order history recommendation`);
                return false;
            }
        }catch(error){
            logger.error(`Error in insert order history recommendation:`, error);
            return false;
        }
    },
}