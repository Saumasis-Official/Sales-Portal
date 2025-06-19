import { ValidateOrderInterface } from '../interface/ValidateOrder';
import { OrderTypes } from '../../enum/OrderTypes';
import { ValidateOrderResponse } from '../interface/ValidateOrderResponse';
import logger from '../lib/logger';
import { ErrorMessage } from '../constant/error.message';
import { orderForValidationObj } from '../interface/orderForValidation';
import { itemsForValidationObj } from '../interface/itemsForValidation';
import { partnersForValidationObj } from '../interface/partnersForValidation';
import { validateHelper } from '../helper/validateHelper';
import { UserService } from '../service/user.service';
import { SapService } from '../service/sap.service';
import UtilityFunctions from '../helper/utilityFunctions';
import { ValidateOrderTransformer } from '../transformer/validateOrderTransformer2';
import sapController from '../controller/SapController';
import { SuccessMessage } from '../constant/sucess.message';
import { sapPayloadPartners } from '../interface/sapPayloadPartners';
import { SapValidationPayloadItems } from '../interface/sapValidationPayloadItems';
import { PDPConfig, PDPCheck } from '../helper/pdp';
import commonHelper from '../helper';
import { roles } from '../constant/persona';

export class ValidateARSOrder implements ValidateOrderInterface {
    public order_type: OrderTypes = OrderTypes.ARS;
    public orderType: string = 'ARS';
    static #instance: ValidateARSOrder;

    private constructor() {}

    public static getInstance(): ValidateARSOrder {
        if (!this.#instance) {
            this.#instance = new ValidateARSOrder();
        }
        return this.#instance;
    }

    public validatePayload(order_data: any): { status: boolean; message: string } {
        const response = {
            status: true,
            message: '',
        };
        try {
            // Define the keys of the OrderForValidation interface
            const requiredKeys = Object.keys(orderForValidationObj);
            //You can add any extra keys that are required for the regular order here

            // Find missing keys
            const missingKeys = requiredKeys.filter((key) => !(key in order_data));

            if (missingKeys.length > 0) {
                response.status = false;
                response.message = `Validation failed: Missing required parameters - ${missingKeys.join(', ')}`;
                return response;
            }

            // Validate items array
            if (!Array.isArray(order_data.original_items) || order_data.original_items.length === 0) {
                response.status = false;
                response.message = "Validation failed: 'original_items' array is either missing or empty.";
                return response;
            }

            // Validate items array
            if (!Array.isArray(order_data.items) || order_data.items.length === 0) {
                response.status = false;
                response.message = "Validation failed: 'items' array is either missing or empty.";
                return response;
            }

            const allMissingItemKeys = new Set();
            const invalidItems = order_data.items.filter((item: any) => {
                const requiredItemKeys: string[] = Object.keys(itemsForValidationObj);
                const missingItemKeys: string[] = requiredItemKeys.filter((key) => !(key in item));
                missingItemKeys.forEach((key) => allMissingItemKeys.add(key));
                return missingItemKeys.length > 0;
            });
            if (invalidItems.length > 0) {
                response.status = false;
                response.message = `Missing Item keys: ${Array.from(allMissingItemKeys).join(', ')}`;
                return response;
            }

            // Validate partners array
            if (!Array.isArray(order_data.partners) || order_data.partners.length === 0) {
                response.status = false;
                response.message = "Validation failed: 'partners' array is either missing or empty.";
                return response;
            }

            const invalidPartners = order_data.partners.filter((partner: any) => {
                const requiredPartnerKeys = Object.keys(partnersForValidationObj);
                const missingPartnerKeys = requiredPartnerKeys.filter((key) => !(key in partner));
                return missingPartnerKeys.length > 0;
            });
            if (invalidPartners.length > 0) {
                response.status = false;
                response.message = "Validation failed: 'partners' array contains invalid objects.";
                return response;
            }
        } catch (e) {
            logger.error('inside validateARSOrder -> validatePayload, Error: ', e);
            response.status = false;
            response.message = ErrorMessage.VALIDATE_PAYLOAD;
        } finally {
            return response;
        }
    }

    public async validate(order_data: any, distributor_id: string, user: any): Promise<ValidateOrderResponse> {
        const response: ValidateOrderResponse = {
            status: true,
            message: '',
            data: null,
        };
        try {
            let po_number = order_data?.po_number || '';
            const todayDate = UtilityFunctions.getCurrentDate();
            let req_date = todayDate,
                pur_date = todayDate;

            const rolesArr = user?.roles || [];
            const isCCO = rolesArr?.includes(roles.CALL_CENTRE_OPERATIONS);
            if (!po_number) {
                if (rolesArr?.includes(roles.CALL_CENTRE_OPERATIONS)) {
                    po_number = validateHelper.generatePO(OrderTypes.CALL_CENTER);
                } else {
                    po_number = validateHelper.generatePO(this.order_type);
                }
                order_data['po_number'] = po_number;
            } else {
                const orderData = await SapService.getOrderDetailsByPoNumber(po_number);

                if (orderData && Object.keys(orderData).length > 0) {
                    req_date = orderData['order_data']['REQ_DATE_H'];
                    pur_date = orderData['order_data']['PURCH_DATE'];
                }
            }
            logger.info('inside validateARSOrder -> validate, po_number: ', po_number);

            const dbData = await UserService.fetchDistributorProfile(distributor_id);
            if (!dbData) {
                throw new Error('Distributor not found');
            }

            order_data['sales_org'] = '1010';
            order_data['doc_type'] = 'ZOR';
            order_data['distribution_channel'] = dbData.is_nourishco ? '90' : '10';
            order_data['division'] = dbData.is_nourishco ? '12' : '10';
            order_data['req_date'] = req_date;
            order_data['pur_date'] = pur_date;

            order_data?.items?.forEach((o: any) => {
                const original_item_index = order_data?.original_items?.findIndex((i: any) => i.material_code === o.material_code) || -1;
                if (original_item_index !== -1) {
                    order_data.original_items[original_item_index]['required_qty'] = o.required_qty || '0';
                }
            });
            order_data['items'] = order_data['items']?.filter((o: any) => o.material_code && o.required_qty > 0);

            const payloadValidationResponse = this.validatePayload(order_data);
            if (!payloadValidationResponse.status) {
                response.status = false;
                response.message = payloadValidationResponse.message;
                return response;
            }
            const sap_payload = ValidateOrderTransformer.transform(order_data);
            const sap_response = await sapController.sendToSap(sap_payload, 'validate');
            const { status, message, data } = sap_response;
            if (status === 200 || status === 201) {
                const validatedOrderResult: any[] = data?.d?.NAVRESULT?.results || [];
                if (!validatedOrderResult || validatedOrderResult.length === 0) {
                    throw new Error('No results array as response from SAP');
                }
                let validationSuccess = true;
                const pdpRestrictionResponse = await SapService.getAppLevelSettingsByKeys(['ENABLE_PDP_RESTRICTION']);
                const isGlobalPDPOn = pdpRestrictionResponse?.rows[0]?.value === 'YES' || false;

                const pdpWindows = await SapService.getPDPWindows(dbData?.group5_id);
                const pdp: PDPConfig = PDPCheck.updateAppSettings(pdpRestrictionResponse?.rows, pdpWindows, dbData.enable_pdp);

                for (let result of validatedOrderResult) {
                    if (!isCCO && isGlobalPDPOn && dbData.enable_pdp && !(result.CMIR_Flag === 'X') && result.PDP_Day) {
                        const { hasPDPError, errorText } = validateHelper.handlePdpValidate(result.PDP_Day, result.Reference_date, this.order_type, pdp);
                        validationSuccess = !hasPDPError;
                        result['pdp_error'] = errorText;
                    }
                    if (result.Message !== 'Order ready for creation') {
                        validationSuccess = false;
                        break;
                    }
                }

                if (validationSuccess) {
                    if (rolesArr.length === 0 || !rolesArr.includes(roles.SUPPORT)) {
                        sap_payload['PDP'] = isGlobalPDPOn && dbData.enable_pdp ? "ON" : "OFF";
                        const saveOrderResponse = await this.saveOrder(order_data, sap_payload, data, distributor_id, user);
                        if (!saveOrderResponse.status) {
                            throw new Error(saveOrderResponse.message);
                        }
                        if (data?.d) data.d['db_response'] = saveOrderResponse.data;
                    }
                }
                response.data = data;
                response.message = message;
                response.status = validationSuccess;
            } else {
                response.status = false;
                response.message = message || ErrorMessage.VALIDATE_REGULAR;
                response.data = data || null;
            }
        } catch (e) {
            logger.error('inside validateARSOrder, Error: ', e);
            response.status = false;
            response.message = JSON.stringify(e) || ErrorMessage.VALIDATE_REGULAR;
            response.data = null;
        } finally {
            return response;
        }
    }
    public async saveOrder(order_data: any, sap_payload: any, sap_result: any, distributor_id: string, user: any): Promise<{ status: boolean; message: string; data: any }> {
        const response = {
            status: false,
            message: ErrorMessage.SAVE_ORDER,
            data: null,
        };
        logger.info('inside validateARSOrder -> saveOrder');
        try {
            const nav_result = sap_result?.d?.NAVRESULT?.results || [];
            let totalAmount = 0;

            sap_payload['partnerset'] =
                sap_payload?.partnerset.map((partner: sapPayloadPartners) => {
                    partner['PARTN_NAME'] =
                        order_data['partners']?.find((itm: any) => itm['partner_number'] == parseInt(partner.PARTN_NUMB) && itm['partner_role'] == partner.PARTN_ROLE)
                            ?.partner_name || '';
                    return partner;
                }) || [];
            const initialOrderItemsMap = order_data['items']?.reduce((acc: any, item: any) => {
                acc[item.material_code] = item;
                return acc;
            }, {});
            const itemset =
                sap_payload?.Itemset.map((item: SapValidationPayloadItems) => {
                    let res = nav_result?.filter((itm: any) => itm.Item === item.ITM_NUMBER) || [];
                    const materialData: any = initialOrderItemsMap[item.MATERIAL] || {};

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
                        }
                        if (itm.Message != 'Order ready for creation') {
                            item['error'] += `${idx > 0 ? ', ' : ''} ${itm.Message}`;
                        } else {
                            totalAmount += Math.ceil(itm.Tentitive);
                        }
                    });

                    return item;
                }) || [];

            sap_payload['Itemset'] = itemset;
            if (order_data['original_items'] != null) {
                sap_payload['ArsItemset'] = order_data['original_items'];
            }
            if (order_data['distributor_psku_tolerance'] != null) {
                sap_payload['DISTRIBUTOR_PSKU_TOLERANCE'] = order_data['distributor_psku_tolerance'];
            }
            sap_payload['OrderAmount'] = totalAmount;
            const rolesArr = user?.roles || [];
            if (rolesArr?.includes(roles.CALL_CENTRE_OPERATIONS)) {
                sap_payload['PoValidity'] = await validateHelper.getPoValidity(sap_payload['REQ_DATE_H']);
            }
            const dataToBeInserted = JSON.stringify(sap_payload);

            let cartNumber = 'CART-' + commonHelper.getDDMMFormat(new Date()) + '-';
            const cartsCountToday = await SapService.fetchCartsCountToday(distributor_id);
            cartNumber += cartsCountToday && cartsCountToday.count ? parseInt(cartsCountToday.count) + 1 : 1;

            const deleteResponse = await SapService.deletePurchaseOrder(order_data.po_number);
            if (deleteResponse == null) {
                throw new Error('Error in deleting existing purchase order records having po_number: ' + order_data.po_number);
            }
            const insertPayload = {
                distributor_id: distributor_id,
                po_period: UtilityFunctions.getCurrentMMYY(),
                po_number: order_data.po_number,
                so_number: '',
                cart_number: cartNumber,
                created_by: user?.roles ? user.user_id : null,
                created_by_user_group: user?.roles ? user.roles?.join(',') : 'SELF',
                status: 'DRAFT',
                order_type: this.orderType,
                plant: nav_result[0]?.Plant || '',
                order_data: dataToBeInserted.replace(/'/g, "''"),
                po_index: 1,
            };

            const insertResult = await SapService.savePurchaseOrder(insertPayload);
            if (insertResult?.rowCount) {
                logger.info(`inside validateARSOrder -> saveOrder, PO: ${order_data.po_number} saved successfully`);
                let resultObj = insertResult.rows[0];
                const od_obj = JSON.parse(dataToBeInserted);
                resultObj['date'] = od_obj?.REQ_DATE_H ? od_obj.REQ_DATE_H : null;

                response.status = true;
                response.message = SuccessMessage.SAVE_ORDER;
                response.data = resultObj;
            } else {
                logger.info(`inside validateARSOrder -> saveOrder, failed to save PO: ${order_data.po_number}`);
            }
        } catch (error) {
            logger.error('inside validateARSOrder -> saveOrder, Error: ', error);
            response.message = (<Error>error).message || ErrorMessage.SAVE_ORDER;
        } finally {
            return response;
        }
    }
}
