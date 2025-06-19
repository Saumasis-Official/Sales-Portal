declare function require(name: string);
import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import Template from '../helper/responseTemplate';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import CreateOrderTransomer from '../transformer/createOrderTransformer';
import ValidateOrderTransomer from '../transformer/validateOrderTransformer';
import otpEvents from '../helper/otp';
import Email from '../helper/email';
import { SapService } from '../service/sap.service';
import Helper from '../helper';
import moment from 'moment';
import { SapModel } from '../models/sap.model';
import { LogService } from '../service/LogService';
import { UtilService } from '../service/UtilService';
import AosLogsDto from '../dto/AosLogsDto';
import AutoOrderService from '../service/aor.service';
import { roles } from '../constant/persona';
import { OrderTypes } from '../../enum/OrderTypes';
import _ from 'lodash';

const env = process.env.NODE_ENV;
const SapConfig = global['configuration'].sap;

const saltRounds = 10;
class sapController {
    static async sendToSap(order: any, type: string = 'create') {
        try {
            /**
             * TEMPORARY FIX: SOPE-4954:
             * Remove REQ_QTY from validate payload
             */
            const formattedOrder = _.cloneDeep(order);
            if (type === 'validate') {
                formattedOrder.Itemset?.forEach((i) => {
                    delete i.REQ_QTY;
                });
            }
            // logger.info(`Sent to SAP controller with data:`, order);
            const orderData = JSON.stringify(formattedOrder);

            const config = {
                method: 'post',
                url: type == 'validate' ? SapConfig.validateApiEndpoint : SapConfig.createApiEndpoint,
                headers: {
                    'X-Requested-With': 'X',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                auth: SapConfig.auth,
                data: orderData,
            };
            // console.log(config);

            logger.info(`Config send to sap from axios call: ${JSON.stringify(config)}`);
            let response = null;
            try {
                response = await axios(config);
            } catch (err) {
                logger.error('Error in the SAP API call: ', err);
            }

            if (!response) {
                logger.info(`Response from SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status, statusText, data } = response;
            logger.info('Status received from SAP is: ', { status });
            logger.info(`Data received from SAP is: `, response && response.data);

            if (status == 200 || status == 201) {
                logger.info(`SAP returned success`);
                return {
                    status,
                    message: statusText,
                    data,
                };
            } else {
                logger.info(`SAP returned a non 200/201 response`);
                return {
                    status,
                    message: statusText,
                    data: null,
                };
            }
        } catch (error) {
            logger.error(`Error while making the sendToSap method call: ${error}`);
            return {
                status: 500,
                message: 'Technical Error',
                data: null,
            };
        }
    }

    static filterArrayOfObjects(arr, searchKey, searchVal) {
        let filteredArray = arr.filter((itm) => itm[searchKey] == searchVal);
        return filteredArray;
    }

    static filterObjectFromArray(arr, searchKey, searchVal) {
        return arr.find((itm) => itm[searchKey] == searchVal);
    }

    /**
     * Function to save order data in jsonb format
     * @param req
     * @returns
     */
    static async saveOrderData(order: any, intitialOrder: any, validateResponse: any, id: any) {
        logger.info(`Save Order Data Controller: ${id}`);
        let totalAmount = 0;

        const { NAVRESULT } = validateResponse.d;
        const navresult = NAVRESULT.results;

        let newArr = [];
        const newObj = {};
        let modifiedPartnerSet = [];
        const prioritization: any | null = await SapService.fetchPrioritizationByDistributorId(id);
        order.partnerset.map((partner) => {
            const partnerName = intitialOrder['partners'].find(
                (itm) => itm['partner_number'] == parseInt(partner.PARTN_NUMB) && itm['partner_role'] == partner.PARTN_ROLE,
            ).partner_name;
            partner.PARTN_NAME = partnerName ? partnerName : '';
            modifiedPartnerSet.push(partner);
        });
        order['partnerset'] = modifiedPartnerSet;
        order.Itemset.map((item, i) => {
            let res = this.filterArrayOfObjects(navresult, 'Item', item.ITM_NUMBER);
            let materialData: any = {};
            if (order.PURCH_NO?.startsWith('BO')) {
                materialData = this.filterObjectFromArray(intitialOrder['items'], 'item_number', item.ITM_NUMBER);
            } else {
                if (Array.isArray(intitialOrder['items'])) {
                    logger.info(`if initial order items is array`);
                    materialData = this.filterObjectFromArray(intitialOrder['items'], 'material_code', item.MATERIAL);
                } else {
                    logger.info(`else initial order items is object`);
                    materialData = intitialOrder['items'];
                }
            }

            logger.info(`MATERIAL DATA: ${JSON.stringify(materialData)}`);
            if (res.length) {
                // item['Priority'] = prioritization[item.MATERIAL] ?? '';
                res.map((itm, idx) => {
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
                    }
                    if (itm.Message != 'Order ready for creation') {
                        item['error'] += `${idx > 0 ? ', ' : ''} ${itm.Message}`;
                    } else {
                        totalAmount = Math.ceil(totalAmount) + Math.ceil(itm.Tentitive);
                    }
                    if ('ReqDeliveryDate' in materialData) {
                        item['RDD'] = materialData.ReqDeliveryDate;
                        if (!(materialData.ReqDeliveryDate in newObj)) {
                            newObj[materialData.ReqDeliveryDate] = { totalAmount: 0, items: [] };
                        }
                    }
                    // if('po_index' in materialData){
                    //   item['po_index'] = materialData.po_index;
                    // }
                });
                newArr.push(item);
                if ('RDD' in item && item['RDD'] in newObj) {
                    newObj[materialData.ReqDeliveryDate].totalAmount += Math.ceil(+item['TENTATIVE']);
                    newObj[materialData.ReqDeliveryDate].items.push(item);
                }
            }
        });

        if (Object.keys(newObj).length == 0) {
            order['Itemset'] = newArr;
        }

        if (order['PURCH_NO'] != null && (order['PURCH_NO'].startsWith('AOR') || order['PURCH_NO'].startsWith('AOS'))) {
            if (intitialOrder['original_items'] != null) {
                let originalItems: any = {};
                originalItems = intitialOrder['original_items'];
                order['ArsItemset'] = originalItems;
            } else {
                logger.error('Payload attribute original_items is missing.');
            }
            if (intitialOrder['distributor_psku_tolerance'] != null) {
                order['DISTRIBUTOR_PSKU_TOLERANCE'] = intitialOrder['distributor_psku_tolerance'];
            }
        }
        order['OrderAmount'] = totalAmount;
        order['PDP'] = intitialOrder.pdp;
        const result: any[] = [];
        if (order['PURCH_NO'] != null && order['PURCH_NO'].startsWith('BO')) {
            for (let key in newObj) {
                let temp = structuredClone(order);
                temp['Itemset'] = newObj[key].items;
                temp['OrderAmount'] = newObj[key].totalAmount;
                temp['REQ_DATE_H'] = key;
                result.push(JSON.stringify(temp));
            }
        } else {
            result.push(JSON.stringify(order));
        }
        // logger.info(`ORDER: `,result);
        return result;
    }

    /**
     * Function is used to validate the order request form
     * @param req
     * @returns Object with success true or false
     */
    static async validateOrder(req: any) {
        try {
            logger.info('inside SapController -> validateOrder: Body, Query, Params:', {
                params: req.params,
                query: req.query,
                body: req.body,
            });
            const order = req.body;
            const login_id = req.user?.login_id ? req.user?.login_id : req.params?.distributor_id;
            /**
             * CONDITION FOR CHOOSING roles:
             * roles = "": if done by Distributor login
             * roles = user role: if done by SSO login
             * roles = "SUPPORT": if done by DLP run
             * roles = "" OR "SUPER_ADMIN": if done by AOS run
             */
            let rolesArr: string[] | null;

            if (req?.query?.aos_order) {
                rolesArr = null;
            } else if (req.user?.roles) {
                rolesArr = req.user.roles;
            } else if (req.user?.type) {
                rolesArr = req.user.type;
            } else {
                rolesArr = ['SUPPORT'];
            }
            const sendForApproval = req.query.send_for_approval ?? false;

            if ((req.query.auto_order && order.original_items == null) || (req.query.aos_order && order.original_items == null)) {
                logger.error(`Inside SapController-> validateOrder, Error: attribute "arsItemset" not present for auto order validate items`);
                return { success: false, orderData: null };
            }
            let orderData = ValidateOrderTransomer.transform(order, req.query.liquidation, req.query.self_lifting);

            let purchaseOrderNo = order.po_number;
            let purchaseDate = order.po_date != '' ? order.po_date : UtilityFunctions.getCurrentDate();
            let requestDate = order.po_date != '' ? order.po_date : UtilityFunctions.getCurrentDate();

            if (purchaseOrderNo === '') {
                const randomPart = Helper.generateRandomNumber().toString().padStart(16, '0').substring(0, 16);
                if (req.query.liquidation) {
                    purchaseOrderNo = `LIQ` + `-${randomPart}`;
                } else if (req.query.self_lifting) {
                    purchaseOrderNo = `SFL` + `-${randomPart}`;
                } else if (req.query.aos_order) {
                    purchaseOrderNo = `AOS-${randomPart}`;
                } else if (req.query.auto_order) {
                    purchaseOrderNo = `AOR` + `-${randomPart}`;
                } else if (req.query.rush_order) {
                    purchaseOrderNo = `RO` + `-${randomPart}`;
                } else if (req.query.bulk_order) {
                    purchaseOrderNo = `BO` + `-${randomPart}`;
                } else if (rolesArr?.includes(roles.CALL_CENTRE_OPERATIONS)) {
                    purchaseOrderNo = `CCO` + `-${randomPart}`;
                } else {
                    purchaseOrderNo = `DBO` + `-${randomPart}`;
                }
            }

            orderData['PURCH_NO'] = `${purchaseOrderNo}`;
            orderData['PURCH_DATE'] = `${purchaseDate}`;
            orderData['REQ_DATE_H'] = `${requestDate}`;

            if (req.query.aos_order) {
                // This is AOS order, SAP validation payload to be saved in aos_workflow table
                const aosLogs = new AosLogsDto(login_id);
                if (req.query.validation_counter && req.query.validation_counter === '2') aosLogs.sap_validation_payload_2 = orderData;
                else aosLogs.sap_validation_payload_1 = orderData;
                await AutoOrderService.updateAosLogs(aosLogs);
            }

            const validateOrderResponse = await this.sendToSap(orderData, 'validate');
            if (validateOrderResponse.status == 200 || validateOrderResponse.status == 201) {
                logger.info('validate Order api return success from sap end');
                let validationSuccess = true;
                let plant;

                const validatedOrder =
                    validateOrderResponse.data && validateOrderResponse.data.d && validateOrderResponse.data.d.NAVRESULT && validateOrderResponse.data.d.NAVRESULT.results;

                if (validatedOrder) {
                    plant = validatedOrder[0].Plant;
                    for (let result of validatedOrder) {
                        if (result.Message !== 'Order ready for creation') {
                            validationSuccess = false;
                            break;
                        }
                    }
                }

                //save poValidity only when role is CCO

                let app_level_settings;

                const response = await UtilService.getAppLevelConfigurations();
                app_level_settings = response?.rows;
                if (app_level_settings && app_level_settings?.length > 0 && rolesArr?.includes(roles.CALL_CENTRE_OPERATIONS)) {
                    const appconfig = app_level_settings.find((config) => config.key === 'CCO_PO_VALIDITY');
                    if (appconfig) {
                        let ccoValidityDate = appconfig?.value;
                        if (ccoValidityDate === '') {
                            orderData['PoValidity'] = '';
                        } else {
                            ccoValidityDate = parseInt(ccoValidityDate, 10);
                            if (isNaN(ccoValidityDate)) {
                                ccoValidityDate = 0;
                            }
                            const [dayStr, monthStr, yearStr] = purchaseDate.split('.');
                            const day = Number(dayStr);
                            const month = Number(monthStr);
                            const year = Number(yearStr);

                            const purchaseDateObj = new Date(year, month - 1, day);
                            purchaseDateObj.setDate(purchaseDateObj.getDate() + ccoValidityDate);

                            const formattedDay = String(purchaseDateObj.getDate()).padStart(2, '0');
                            const formattedMonth = String(purchaseDateObj.getMonth() + 1).padStart(2, '0');
                            const formattedYear = purchaseDateObj.getFullYear();
                            const poValidity = `${formattedDay}.${formattedMonth}.${formattedYear}`;

                            orderData['PoValidity'] = poValidity;
                        }
                    }
                }

                // do not save a record on validation if it is done by a support role
                if (((rolesArr && !rolesArr.includes(roles.SUPPORT)) || !rolesArr) && validationSuccess) {
                    const purchaseOrderData = await this.saveOrderData(orderData, order, validateOrderResponse.data, login_id);
                    const orderInsertResponse = await this._generatePurchaseOrderNo(
                        purchaseOrderNo,
                        login_id,
                        purchaseOrderData,
                        req.user,
                        req.query.liquidation,
                        req.query.self_lifting,
                        req.query.auto_order,
                        req.query.aos_order,
                        req.query.rush_order,
                        req.query.bulk_order,
                        sendForApproval,
                        plant,
                    );
                    if (validateOrderResponse?.data?.d) {
                        validateOrderResponse.data.d['db_response'] = orderInsertResponse;
                    }
                }

                return {
                    success: true,
                    orderData: validateOrderResponse.data,
                };
            } else {
                logger.info('validate Order api return fail', validateOrderResponse);
                return {
                    success: false,
                    orderData: validateOrderResponse.data,
                };
            }
        } catch (error) {
            logger.error('Error in validate order', error);
            return { success: false, orderData: null };
        }
    }

    static async createOrder(req: any) {
        let po_number : string | null = null;
        try {
            po_number = req?.body?.po_number;
            const isPOUnderProcessing = await SapService.isPoUnderOrderSubmissionProcessing(po_number);
            if (isPOUnderProcessing) {
                logger.info(`inside SapController -> createOrder: PO ${po_number} is under order submission processing, returning 202 status`);
                return {
                    success: false,
                    message: ErrorMessage.PO_UNDER_SUBMISSION_PROCESSING
                };
            }

            const login_id = req.user?.login_id ? req.user?.login_id : req.params?.distributor_id;
            logger.info(`Create Order controller: ${login_id}`);
            const order = req.body;
            const raised_by_id = order?.raised_by?.split('#')[0] ? order.raised_by.split('#')[0] : '';
            const raised_by_role = order?.raised_by?.split('#')[1] ? order.raised_by.split('#')[1] : '';

            const user_id = order?.po_number.startsWith('RO') ? raised_by_id : req.user.user_id;
            const roles = order?.po_number.startsWith('RO') ? raised_by_role : req.user.roles;

            let orderData = await CreateOrderTransomer.transform(order, req.query.liquidation, req.query.self_lifting);

            const checkPoNumberWithDistIdResult = await SapModel.orderQuery.checkPoNumberWithDistId(orderData.PoNumber, login_id);
            if (!checkPoNumberWithDistIdResult || !checkPoNumberWithDistIdResult['rows'] || !checkPoNumberWithDistIdResult['rows'][0]) {
                logger.info('Create Order: could not send email or message as no data found');

                return {
                    success: false,
                    result: 'INVALID_PONUMBER',
                    orderData: null,
                };
            }
            logger.info('Create Order: checkPoNumberWithDistIdResult', checkPoNumberWithDistIdResult['rows']);

            if (orderData?.PoNumber?.startsWith('AOS-')) {
                // This is AOS order, SAP submit payload to be saved in aos_workflow table
                const aosLogs = new AosLogsDto(login_id);
                aosLogs.sap_submit_payload = orderData;
                await AutoOrderService.updateAosLogs(aosLogs);
            }

            const createOrderResponse = await this.sendToSap(orderData, 'create');

            if (orderData?.PoNumber?.startsWith('AOS-')) {
                // This is AOS order, SAP submit response to be saved in aos_workflow table
                const aosLogs = new AosLogsDto(login_id);
                aosLogs.sap_submit_response = createOrderResponse;
                await AutoOrderService.updateAosLogs(aosLogs);
            }

            if (createOrderResponse.status == 201 || createOrderResponse.status == 200) {
                logger.info('Create Order if return success from sap end');
                const data = createOrderResponse.data['d'];
                if (data.NAVRESULT.results) {
                    for (let nav_result of data.NAVRESULT.results) {
                        const poNumber = nav_result['PoNumber'] ? nav_result['PoNumber'] : '';
                        const soNumber = nav_result['SalesOrder'] ? nav_result['SalesOrder'] : '';
                        const soValue = nav_result['Net_value'] ? nav_result['Net_value'] : '';

                        if (!poNumber || !soNumber) {
                            return {
                                success: false,
                                orderData: createOrderResponse.data,
                            };
                        }

                        // UtilModel.orderQuery.updateOrderStatus(soValue, order.product_type, soNumber, poNumber, login_id, req.user.roles, req.user.user_id)

                        let rd = order?.rdd_data?.find((obj) => obj.date === nav_result.ReqDate) || null;
                        const po_number_index = rd ? +rd.po_number_index : 1;

                        const updateOrdersResult = await SapModel.orderQuery.updateOrdersStatement(
                            soNumber,
                            soValue,
                            order.product_type,
                            poNumber,
                            login_id,
                            roles,
                            user_id,
                            po_number_index,
                        );

                        logger.info('Create Order updateOrdersResult:', updateOrdersResult);

                        if (updateOrdersResult && updateOrdersResult?.rowCount) {
                            const selectUserNotificationResult = await SapModel.orderQuery.getNotificationPreference(login_id);
                            logger.info('Create Order selectUserNotificationResult:', selectUserNotificationResult);

                            const orderDetails = await SapModel.getOrderDetails(poNumber);
                            logger.info('Create Order orderDetails: ', orderDetails);

                            if (!selectUserNotificationResult || !selectUserNotificationResult['rows'] || !selectUserNotificationResult['rows'][0] || !orderDetails) {
                                logger.info('Create Order: notification preference does not exists for distributor');

                                continue;
                            }

                            let amount = Helper.numberWithCommas(orderDetails.so_value ? orderDetails.so_value : orderDetails.order_data.OrderAmount);
                            const soDate = orderDetails.so_date ? moment(orderDetails.so_date).format('DD/MM/YYYY') : '';

                            try {
                                if (selectUserNotificationResult['rows'][0].po_so_sms && process.env.NODE_ENV !== 'dev') {
                                    let otpData = {
                                        mobile: Helper.modifyMobileNumber(orderDetails.mobile),
                                        distributorName: orderDetails.name,
                                        distributorCode: login_id,
                                        poNumber: poNumber,
                                        soRefrence: soNumber,
                                        soDate: soDate,
                                        amount,
                                    };
                                    logger.info('Create Order otpDatasms:');
                                    await otpEvents.creat_order_message(otpData);
                                }
                            } catch (error) {
                                logger.error(`error in Create Order otpDataSMS: `);
                                // return { success: false };
                            }
                            //Get PO details
                            let poDetails = null;
                            try {
                                logger.info(`fetch po details controller`);

                                let order_data = orderDetails?.order_data || {};
                                if (Object.keys(order_data).length) {
                                    logger.info(`if case, order_data exists`);
                                    poDetails = order_data;
                                    let tempMaterials = [];
                                    for (let result of order_data.Itemset) {
                                        tempMaterials.push(result.MATERIAL);
                                    }
                                    let materials = tempMaterials.join("','");
                                    try {
                                        logger.info(`fetch pack type`);
                                        let { rows } = await SapModel.orderQuery.fetchPoDetails.fetchPODetailsPackTypeSqlStatement(materials);
                                        if (rows && rows.length) {
                                            for (const [index, value] of poDetails.Itemset.entries()) {
                                                value.TENTATIVE = Helper.numberWithCommas(value.TENTATIVE);
                                            }
                                            const materialHashMap = rows.reduce(
                                                (acc, item) =>
                                                    Object.assign({}, acc, {
                                                        [item.code]: item.pak_type,
                                                    }),
                                                {},
                                            );
                                            poDetails.Itemset = poDetails.Itemset.map((item) =>
                                                Object.assign({}, item, {
                                                    PACK_TYPE: materialHashMap[item.MATERIAL],
                                                }),
                                            );
                                        }
                                    } catch (error) {
                                        logger.info('po_details: ', poDetails);
                                        logger.error(`error in fetch pack type:`, error);

                                        // return { success: false, data: poDetails };
                                    }
                                }
                            } catch (error) {
                                logger.info('po_details: ', poDetails);
                                logger.error(`error in fetchPODetails:`, error);

                                // return { success: false, data: poDetails };
                            }
                            let adminData = await SapService.getTseAsmAdminDetails(login_id);
                            //Send email to distributor
                            if (selectUserNotificationResult['rows'][0].po_so_email) {
                                let emailId = orderDetails?.email;
                                let otpData = {
                                    area: adminData.region ? adminData.region : '',
                                    asm: adminData.asm
                                        ? adminData.asm
                                            .map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`)
                                            .join(', ')
                                        : '',
                                    asmareacode: adminData.asm ? adminData.asm.map((item) => (item.code ? item.code : '')).join(', ') : '',
                                    tse: adminData.tse
                                        ? adminData.tse
                                            .map((item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`)
                                            .join(', ')
                                        : '',
                                    tseareacode: adminData.tse ? adminData.tse.map((item) => (item.code ? item.code : '')).join(', ') : '',
                                    email: emailId,
                                    distributorName: orderDetails?.name,
                                    distributorCode: login_id,
                                    poNumber: poNumber,
                                    poDate: poDetails.PURCH_DATE.replace(/\./g, '/'),
                                    soRefrence: soNumber,
                                    soDate: soDate,
                                    shipTo:
                                        poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE').length > 0
                                            ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE')[0]
                                            : '',
                                    unloadingPoint:
                                        poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1').length > 0
                                            ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1')[0]
                                            : '',
                                    amount,
                                    totalQuantityTon: order.ton.toFixed(2) + ' TO',
                                    items: poDetails.Itemset,
                                };
                                logger.info('Create Order otpDataemail:', emailId);
                                Email.order_created({ email: emailId }, otpData);
                            }

                            this.generateOrderHistory(order['items'], login_id);

                            let otpDataArr = [adminData.tse, adminData.asm];
                            otpDataArr = otpDataArr.flat();
                            let otpData =
                                otpDataArr &&
                                otpDataArr.length > 0 &&
                                otpDataArr.map((v) => ({
                                    ...v,
                                    distributorId: login_id,
                                    poNumber,
                                    amount,
                                }));
                            logger.info('otpData', otpData);
                            try {
                                if (selectUserNotificationResult['rows'][0].sms_tse_asm) {
                                    // send sms to admin
                                    otpData &&
                                        otpData.length > 0 &&
                                        otpData.forEach((element) => {
                                            otpEvents.tse_admin_order_creation(element);
                                        });
                                }
                            } catch (error) {
                                logger.error(`error in send sms to admin: `, error);
                                // return { success: false };
                            }

                            if (selectUserNotificationResult['rows'][0].email_tse_asm) {
                                // send email to admin(TSE/ASM)
                                let arryaEmail = otpData && otpData.length > 0 && otpData.filter((a) => a.email).map((a) => a.email);
                                logger.info('arryaEmail', arryaEmail);
                                if (arryaEmail && Object.keys(arryaEmail).length !== 0) {
                                    Email.tse_admin_order_creation(arryaEmail, {
                                        area: adminData.region ? adminData.region : '',
                                        asm: adminData.asm
                                            ? adminData.asm
                                                .map(
                                                    (item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`,
                                                )
                                                .join(', ')
                                            : '',
                                        asmareacode: adminData.asm ? adminData.asm.map((item) => (item.code ? item.code : '')).join(', ') : '',
                                        tse: adminData.tse
                                            ? adminData.tse
                                                .map(
                                                    (item) => `${item.first_name ? item.first_name : ''} ${item.last_name ? item.last_name : ''} (${item.code ? item.code : ''})`,
                                                )
                                                .join(', ')
                                            : '',
                                        tseareacode: adminData.tse ? adminData.tse.map((item) => (item.code ? item.code : '')).join(', ') : '',
                                        distributorId: login_id,
                                        distributorname: orderDetails?.name,
                                        poNumber,
                                        poDate: poDetails.PURCH_DATE.replace(/\./g, '/'),
                                        amount,
                                        soNumber,
                                        soDate: soDate,
                                        shipTo:
                                            poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE').length > 0
                                                ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE')[0].PARTN_NAME
                                                : '',
                                        shipToCode:
                                            poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE').length > 0
                                                ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'WE')[0].PARTN_NUMB
                                                : '',
                                        unloadingPoint:
                                            poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1').length > 0
                                                ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1')[0].PARTN_NAME
                                                : '',
                                        unloadingPointCode:
                                            poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1').length > 0
                                                ? poDetails.partnerset.filter((item) => item.PARTN_ROLE == 'Y1')[0].PARTN_NUMB
                                                : '',
                                        totalQuantityTon: order.ton.toFixed(2) + ' TO',
                                        items: poDetails.Itemset,
                                    });
                                }
                            }

                            logger.info('Create Order: sending success response');

                            continue;
                        } else {
                            logger.info('Create Order: sending fail response as could not update order so number and date');

                            return {
                                success: false,
                                orderData: createOrderResponse.data,
                            };
                        }
                    }
                    return {
                        success: true,
                        orderData: createOrderResponse.data,
                    };
                } else {
                    logger.info('Create Order: sap api gave empty result array in response');
                    return {
                        success: false,
                        orderData: createOrderResponse.data,
                    };
                }
            } else {
                logger.info('Create Order: sending fail response as sap api gave fail response', createOrderResponse);

                return {
                    success: false,
                    orderData: createOrderResponse.data,
                };
            }
        } catch (error) {
            logger.error('Error in Create Order', error);
            return { success: false, orderData: null };
        } finally { 
            // Ensure that the PO under submission processing is cleared after the operation
            if (po_number) {
                await SapService.removePoFromOrderSubmissionProcessing(po_number);
            }
        }
    }

    static getDDMMFormat(date: any) {
        let mm = date.getMonth() + 1; // Months start at 0!
        let dd = date.getDate();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        return `${dd}${mm}`;
    }

    static async fetchCartsCountToday(distributorId: string) {
        try {
            logger.info(`Fetching today's carts count`);
            const fetchCartsCountTodayResponse = await SapModel.fetchCartsCountTodayQuery(distributorId);
            logger.info(`no of carts present today: ${fetchCartsCountTodayResponse && fetchCartsCountTodayResponse.rows && fetchCartsCountTodayResponse.rows[0]}`);
            return fetchCartsCountTodayResponse && fetchCartsCountTodayResponse.rows && fetchCartsCountTodayResponse.rows[0];
        } catch (error) {
            logger.error(`Error in fetching today's carts count: `, error);
            return false;
        }
    }

    static async _generatePurchaseOrderNo(
        po_number: string,
        id: any,
        order_data: any[],
        user: any,
        isLiquidationOrder: boolean | undefined,
        isSelfLiftingOrder: boolean | undefined,
        isAutoOrder: boolean | undefined,
        isAosOrder: boolean | undefined,
        isRushOrder: boolean | undefined,
        isBulkOrder: boolean | undefined,
        isSendForApproval: boolean | undefined,
        plant: string | undefined,
    ) {
        try {
            logger.info('Generating purchase order number', { po_number });

            let cartNumber = 'CART-' + this.getDDMMFormat(new Date()) + '-';
            const cartsCountToday = await this.fetchCartsCountToday(id);
            cartNumber += cartsCountToday && cartsCountToday.count ? parseInt(cartsCountToday.count) + 1 : 1;

            function getStatus() {
                if (isLiquidationOrder) {
                    return 'LIQUID_DRAFT';
                } else if (isSelfLiftingOrder) {
                    return 'SELF_LIFTING_DRAFT';
                } else if (isRushOrder && isSendForApproval) {
                    return 'RUSH_DRAFT';
                } else {
                    return 'DRAFT';
                }
            }

            function getOrderType() {
                if (isLiquidationOrder) {
                    return 'LIQUIDATION';
                } else if (isSelfLiftingOrder) {
                    return 'SELF_LIFTING';
                } else if (isAutoOrder || isAosOrder) {
                    return 'ARS';
                } else if (isRushOrder) {
                    return 'RUSH';
                } else if (isBulkOrder) {
                    return 'BULK';
                } else {
                    return 'NORMAL';
                }
            }
            const deleteResponse = await SapService.deletePurchaseOrder(po_number);
            if (deleteResponse == null) {
                throw new Error('Error in deleting existing purchase order records having po_number: ' + po_number);
            }
            const insertPayload = {
                distributor_id: id,
                po_period: UtilityFunctions.getCurrentMMYY(),
                po_number: po_number,
                so_number: '',
                cart_number: cartNumber,
                created_by: user?.roles ? user.user_id : null,
                created_by_user_group: user?.roles ? user.roles?.join(',') : 'SELF',
                status: getStatus(),
                order_type: getOrderType(),
                plant: plant,
            };
            let insertStatus = true;
            let insertedRows = 0;
            let poIndex = 1;
            let insertedResult: any[] = [];
            for (let od of order_data) {
                insertPayload['order_data'] = od.replace(/'/g, "''");
                insertPayload['po_index'] = poIndex;

                const insertResult = await SapModel.generatePurchaseOrderNo(insertPayload);
                if (insertResult && insertResult.rowCount) {
                    let resultObj = insertResult.rows[0];
                    const od_obj = JSON.parse(od);
                    resultObj['date'] = od_obj?.REQ_DATE_H ? od_obj.REQ_DATE_H : null;
                    insertedResult.push(resultObj);
                    insertedRows += insertResult.rowCount;
                    poIndex += 1;
                } else {
                    insertStatus = false;
                }
            }

            if (insertStatus) {
                logger.info('Inserted Purchase order in DB', { po_number, insertedRows });
                return { success: true, data: insertedResult };
            } else {
                logger.info('Data insertion failed into orders table for purchase order number:', { po_number, insertedRows });
                return { success: false, data: insertedResult };
            }
        } catch (error) {
            logger.error('Error in generating purchase order number:', error);
            return { success: false, data: null };
        }
    }

    static async generateOrderHistory(order: any, distributorId: string) {
        try {
            logger.info('Generate order history');
            if (!order || !distributorId) {
                logger.info(`order or distributorId does not exist:`, order);
                return { success: false };
            }

            const insertResult = await SapModel.getGenerateOrderHistory(order, distributorId);

            if (insertResult && insertResult.rowCount) {
                return { success: true };
            } else {
                logger.info('If data insert failed into order history recommendation table:', insertResult);
                return { success: false };
            }
        } catch (error) {
            logger.error('Error in Generate order history:', error);
            return { success: false, data: null };
        }
    }

    public static async materialsBOMExplode(req: any, res: any) {
        try {
            const distributorId = req.user.login_id;
            const materialsCode = req.body.materialCode;
            const quantity = req.body.quantity;
            const fetchMaterialsBOMResponse = await UtilityFunctions.fetchMaterialsBOMExplode(distributorId, materialsCode, quantity);

            if (fetchMaterialsBOMResponse.status === 200) {
                const items = fetchMaterialsBOMResponse.data.d.results;
                return res.status(200).json(Template.success(items, SuccessMessage.MATERIALS_BOUM_EXPLODE_SUCCESS));
            } else {
                return res.status(fetchMaterialsBOMResponse.status || 500).json(Template.error('Technical Error', ErrorMessage.SAP_API_FAILED, fetchMaterialsBOMResponse.data));
            }
        } catch (error) {
            logger.error(`Failed fetching materialsBOMExplode:`, error);
            return res.status(500).json(Template.error('Technical Error', ErrorMessage.MATERIALS_BOUM_EXPLODE_ERROR, []));
        }
    }

    public static async getLiquidationMaterials(req: any, res: any) {
        try {
            const { plantCode, distChannel = '10' } = req.query;
            logger.info(`inside SAP controller getLiquidationMaterials`);
            if (!plantCode) {
                return res.status(400).json(Template.error('Technical Error', ErrorMessage.PLANT_CODE_NOT_FOUND));
            }
            const liquidationResponse = await UtilityFunctions.fetchLiquidationMaterials(plantCode, distChannel);
            if (liquidationResponse.status == 200) {
                logger.info('Successfully fetched liquidation material details with response:');
                let uniqueMaterials = [];
                //group by material code
                if (liquidationResponse.data) {
                    if (liquidationResponse.data.d) {
                        if (liquidationResponse.data.d.results.length > 0) {
                            let allMaterials = liquidationResponse.data.d.results;
                            const uniqueMaterialCodes = [...new Set(allMaterials.map((item) => item.MaterialCode))];
                            allMaterials.forEach((record) => {
                                let position = -1;
                                const found = uniqueMaterials.some((el, index) => {
                                    if (el.MaterialCode === record.MaterialCode) {
                                        position = index;
                                        return true;
                                    }
                                });
                                if (found) {
                                    uniqueMaterials[position].StockQuantity = parseFloat(uniqueMaterials[position].StockQuantity) + parseFloat(record.StockQuantity);
                                    uniqueMaterials[position].BatchNo = uniqueMaterials[position].BatchNo + ',' + record.BatchNo;
                                } else {
                                    uniqueMaterials.push(record);
                                }
                            });
                            res.status(200).json(Template.success(uniqueMaterials, 'Successfully fetched liquidation material details'));
                            return { success: true, data: uniqueMaterials };
                        }
                    }
                }
            } else {
                logger.info('Failed to fetch liquidation material details with response:', liquidationResponse);
                res.status(500).json(Template.error('Technical Error', 'There is some issue occurred while fetching the liquidation materials ', liquidationResponse.data));
            }
        } catch (error) {
            logger.error('Error in fetching liquidation materials:', error);
            res.status(500).json(Template.error('Technical Error', 'There is some issue occurred while fetching liquidation materials'));
        }
    }

    public static async getSapMaterialList(req: any, res: any) {
        logger.info('inside SapController -> getMaterialMaster');
        try {
            const { distributionChannels, divisions } = req.body;
            const materialListResponse = await SapService.getSapMaterialList(distributionChannels, divisions);
            return res.status(200).json({ success: true, data: materialListResponse });
        } catch (error) {
            logger.error('Error in getSapMMaterialList ', error);
            return res.status(400).json({ success: false, data: null, massage: 'Technical Error' });
        }
    }
    public static async PlantCodeUpateRequest(req: any, res: any) {
        logger.info('inside plant code update request method sap controller');
        const { body, user } = req;
        try {
            if (
                !(
                    user.roles === 'SUPER_ADMIN' ||
                    user.roles === 'TSE' ||
                    user.roles === 'ASM' ||
                    user.roles === 'LOGISTIC_OFFICER' ||
                    user.roles === 'ZONAL_OFFICER' ||
                    user.roles === 'PORTAL_OPERATIONS'
                )
            ) {
                return res.status(403).json(Template.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
            }
            const response = await SapService.PlantUpdateRequest(body, user);
            if (response) {
                logger.info('successfully inserted request', response);
                res.status(200).json({ success: true, data: response });
            } else {
                logger.error('Error in response in Sapcontroller in plant code request', req.body);
                res.status(200).json({ success: false, data: null });
            }
        } catch (error) {
            logger.error('Error in Sap Controller while inserting recording', req.body);
            res.status(500).json(Template.internalServerError());
        }
    }
    public static async getUpdatedController(req: any, res: any) {
        const { body, user } = req;

        let response: any;
        response = await SapService.plantCodeUpdateByLogisticOfficer(body, user);
        if (response) {
            logger.info('successfully inserted request', response);
            res.status(200).json({ success: true, data: response });
        }
    }
    public static async logisticOfficerResponse(req: any, res: any) {
        try {
            const response = await SapService.logisticOfficerResponse(req.body, req.user);
            if (response) {
                logger.info('Data fetch successfully ', response);
                res.status(200).json({ success: true, data: response });
            } else {
                logger.error('Error in response in Sapcontroller inside logistic plant code update', req.body);
                res.status(200).json({ success: false, data: null });
            }
        } catch (error) {
            logger.error('Error in Sap Controller while updating plant Code');
            res.status(500).json({ success: false, data: null });
        }
    }

    public static async pdpUpdateRequest(req: any, res: any) {
        logger.info('inside sap.controller -> pdpUpdateRequest');
        const { body, user } = req;
        try {
            if (
                !(
                    user.roles === 'SUPER_ADMIN' ||
                    user.roles === 'TSE' ||
                    user.roles === 'ASM' ||
                    user.roles === 'LOGISTIC_OFFICER' ||
                    user.roles === 'ZONAL_OFFICER' ||
                    user.roles === 'PORTAL_OPERATIONS'
                )
            ) {
                return res.status(403).json(Template.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
            }
            const response = await SapService.pdpUpdateRequest(body, user);
            if (response.length === req.body.pdp_data.length) {
                logger.info('inside sap.controller -> pdpUpdateRequest, ' + SuccessMessage.PDP_UPDATE_REQUEST_SUCCESS);
                res.status(200).json(Template.successMessage(SuccessMessage.PDP_UPDATE_REQUEST_SUCCESS));
            } else {
                logger.error('inside sap.controller -> pdpUpdateRequest, ' + ErrorMessage.PDP_UPDATE_REQUEST_FAILURE);
                res.status(500).json(Template.errorMessage(ErrorMessage.PDP_UPDATE_REQUEST_FAILURE));
            }
        } catch (error) {
            logger.error('inside sap.controller -> pdpUpdateRequest, Error = ', error);
            res.status(500).json(Template.internalServerError());
        }
    }

    public static async getPDPUpdateRequests(req: any, res: any) {
        logger.info('Inside SapController -> getPDPUpdateRequests ');
        try {
            logger.info('Inside SapController -> getPDPUpdateRequests ,  User = \n', req.user);
            logger.info('Inside SapController -> getPDPUpdateRequests ,  Body = \n', req.body);

            const response = await SapService.getPDPUpdateRequests(req.user, req.body);
            const countResponse = await SapService.getPDPUpdateRequestsCount(req.user, req.body);

            if (response && countResponse) {
                logger.info('Inside SapController -> getPDPUpdateRequests , ' + SuccessMessage.PDP_UPDATE_REQUESTS_FETCH_SUCCESS);
                res.status(200).json(Template.success({ rows: response, totalCount: countResponse }, SuccessMessage.PDP_UPDATE_REQUESTS_FETCH_SUCCESS));
            } else {
                logger.error('Inside SapController -> getPDPUpdateRequests , ' + ErrorMessage.PDP_UPDATE_REQUESTS_FETCH_FAILURE);
                res.status(500).json(Template.errorMessage(ErrorMessage.PDP_UPDATE_REQUESTS_FETCH_FAILURE));
            }
        } catch (error) {
            logger.error('Inside SapController -> getPDPUpdateRequests ,  Error = ', error);
            res.status(500).json(Template.internalServerError());
        }
    }

    public static async pdpUpdateRequestResponse(req: any, res: any) {
        logger.info('inside sap.controller -> pdpUpdateRequestResponse');
        try {
            const response = await SapService.pdpUpdateRequestResponse(req.body, req.user);
            if (response) {
                logger.info('inside sap.controller -> pdpUpdateRequestResponse, ' + SuccessMessage.PDP_UPDATE_RESPONSE_SUCCESS);
                res.status(200).json(Template.successMessage(SuccessMessage.PDP_UPDATE_RESPONSE_SUCCESS));
            } else {
                logger.error('inside sap.controller -> pdpUpdateRequestResponse, ' + ErrorMessage.PDP_UPDATE_RESPONSE_FAILURE);
                res.status(500).json(Template.errorMessage(ErrorMessage.PDP_UPDATE_RESPONSE_FAILURE));
            }
        } catch (error) {
            logger.error('Error in SapController -> pdpUpdateRequestResponse, Error = ', error);
            res.status(500).json(Template.internalServerError());
        }
    }

    public static async depotCodeMapping(req: any, res: any) {
        try {
            if (req.body) {
                let response = await SapService.depotCodeMappingService(req.body, req);
                res.send(response);
            }
        } catch (error) {
            res.send(req.body);
        }
    }
    public static async getMrpAndCaselotCheckDetails(req: any, res: any) {
        try {
            const response = await UtilityFunctions.getMrpAndCaselotCheckDetails(req.body);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.MRP_AND_CASELOT_CHECK_SUCCESS));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MRP_AND_CASELOT_CHECK_FAILURE));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }
    public static async createSO(req: any, res: any) {
        try {
            const response = await UtilityFunctions.createSO(req.body);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.SALES_ORDER_CREATED_SUCCESSFULLY));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.SALES_ORDER_CREATION_FAILED));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }
    public static async getMrp2CheckDetails(req: any, res: any) {
        try {
            const response = await UtilityFunctions.getMrp2CheckDetails(req.body);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.MRP2_CHECK_SUCCESS));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MRP2_CHECK_FAILURE));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }
    public static async getSODetails(req: any, res: any) {
        try {
            const response = await UtilityFunctions.getSODetails(req.body);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.SO_DETAILS_FETCH_SUCCESS));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.SO_DETAILS_FETCH_ERROR));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }

    public static async fetchSapHolidayList(req: any, res: any) {
        logger.info('inside SapController -> fetchSapHolidayList');
        const { year, state_code, state_name } = req.body;

        try {
            const response = await SapService.fetchSapHolidayList(year, state_code, state_name);
            if (response) {
                logger.info('inside SapController -> fetchSapHolidayList, response fetched successfully, rowCount ', response.length);
                res.status(200).json(Template.success(response, SuccessMessage.SAP_HOLIDAY_LIST));
            } else {
                logger.error('inside SapController -> fetchSapHolidayList, response not fetched');
                res.status(408).json(Template.errorMessage(ErrorMessage.SAP_HOLIDAY_LIST));
            }
        } catch (error) {
            logger.error('inside SapController -> fetchSapHolidayList, Error = ', error);
            res.status(500).json(Template.internalServerError());
        }
    }

    public static async updateHolidaySync(req: any, res: any) {
        logger.info('Inside SapController -> updateHolidaySync');
        try {
            const { selectedYears } = req.body;
            const success = await SapService.updateHolidaySync(selectedYears);
            if (success?.rowCount >= 0) {
                logger.info('Inside SapController -> updateHolidaySync, Holiday sync updated successfully');
                return res.json({
                    status: 200,
                    data: {
                        success: true,
                        message: `${success.rowCount} Records updated successfully.`,
                    },
                });
            } else {
                logger.info('Inside SapController -> updateHolidaySync, Holiday sync Failed');
                return res.status(400).json(Template.errorMessage(ErrorMessage.SAP_HOLIDAY_LIST_UPDATE));
            }
        } catch (error) {
            LogService.insertSyncLog('SAP_HOLIDAY_SYNC', 'FAIL');
            logger.error('Inside SapController -> updateHolidaySync, Error updating holiday sync: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    }
    public static async getAmendmentDetails(req: any, res: any) {
        try {
            const response = await UtilityFunctions.getAmendmentDetails(req.params);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.AMENDMENT_DETAILS_FETCH_SUCCESS));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.AMENDMENT_DETAILS_FETCH_ERROR));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }
    public static async createAmendment(req: any, res: any) {
        try {
            const response = await UtilityFunctions.createAmendment(req.body);
            if (response) {
                return res.status(200).json(Template.success({ data: response.data }, SuccessMessage.AMENDMENT_CREATED_SUCCESSFULLY));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.AMENDMENT_CREATE_ERROR));
            }
        } catch (error) {
            res.status(500).json({ success: error.message, data: null });
        }
    }

    public static async validateOrder2(req: Request, res: Response) {
        try {
            logger.info('inside SapController -> validateOrder2');
            const { order_data, distributor_id, order_type = 'NORMAL' } = req.body;
            const user = req['user'];
            const response = await SapService.validateOrder2(order_data, distributor_id, OrderTypes[order_type as keyof typeof OrderTypes], user);
            if (response?.status || (response?.status === false && response?.message !== ErrorMessage.REGULAR_INSTEAD_OF_ARS)) {
                logger.info('inside SapController -> validateOrder2, SAP response fetched successfully');
                return res.status(200).json(Template.success(response.data, SuccessMessage.VALIDATE_ORDER));
            } else {
                logger.error("inside SapController -> validateOrder2, couldn't fetch SAP response");
                return res.status(200).json(Template.error('Validation Error!', response.message, response.data));
            }
        } catch (error) {
            logger.error('CAUGHT: Error in SapController -> validateOrder2: ', error);
            res.status(500).json(Template.internalServerError());
        }
    }

    public static async createOrder2(req: any, res: any) {
        let poNumber: string | null = null;
        try {
            logger.info('inside SapController -> createOrder2');
            const { po_number, order_type = 'NORMAL' } = req.body;
            poNumber = po_number;
            const isPOUnderProcessing = await SapService.isPoUnderOrderSubmissionProcessing(po_number);
            if (isPOUnderProcessing) {
                logger.info(`inside SapController -> createOrder2: PO ${po_number} is under order submission processing, returning 202 status`);
                return res.status(202).json(Template.errorMessage(ErrorMessage.PO_UNDER_SUBMISSION_PROCESSING));
            }
            const { user } = req;
            const response = await SapService.createOrder2(po_number, OrderTypes[order_type as keyof typeof OrderTypes], user);
            if (response && response.status) {
                logger.info('inside SapController -> createOrder2, SAP response fetched successfully');
                return res.status(200).json(Template.success(response.data, SuccessMessage.CREATE_ORDER));
            } else {
                logger.error("inside SapController -> createOrder2, couldn't fetch SAP response");
                return res.status(500).json(Template.error(response.message || ErrorMessage.CREATE_ORDER, response.data));
            }
        } catch (error) {
            res.status(500).json(Template.internalServerError());
        } finally {
            if (poNumber) {
                SapService.removePoFromOrderSubmissionProcessing(poNumber);
            }
        }
    }
}

export default sapController;
