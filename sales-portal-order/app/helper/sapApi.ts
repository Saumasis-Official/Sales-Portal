import axios from "axios";
import logger from "../lib/logger";
const SapApiConfig = global['configuration'].sapApi;

async function apiCall(method: string, url: string, payload: any) {
    const config = {
        method: method,
        url: url,
        headers: {
            'X-Requested-With': 'X',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        data: payload ? JSON.stringify(payload) : "",
    };
    let response: any = null;
    try {
        // logPayloadSize(config); //to check the payload 
        response = await axios(config);
        if (response == null) {
            logger.info(`SapApi: Response from ${url} is undefined or null`);
            return []
        }
        return response.data
    } catch (err) {
        logger.error(`Error in the ${url} API call: `, err);
        throw err;
    }
}
function logPayloadSize(payload) {
    const jsonString = JSON.stringify(payload);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const sizeInMegabytes = sizeInBytes / (1024 * 1024);
    const sizeInKB = sizeInBytes / (1024);
    console.log(`Payload size: ${sizeInBytes} Bytes, ${sizeInKB} KB, ${sizeInMegabytes} MB`);
}
export const SapApi = {
    async getWarehouseDetails(distributorId: string, distributionChannel: string, divisions: any[]) {
        try {
            const url = `${SapApiConfig.warehouseDetailsOnDistChannel}/${distributorId}/${distributionChannel}/${divisions.toString()}`;
            const warehouseDetails = await apiCall('GET', url, null);
            return warehouseDetails;
        } catch (error) {
            logger.error('Caught Error in SapApi -> getWarehouseDetails', error);
            throw error;
        }
    },

    async validateDistributorSalesOrder(distId, data) {
        try {
            const url = `${SapApiConfig.validateUrl}/${distId}?auto_order=true`;
            return await apiCall('POST', url, data)
        } catch (error) {
            logger.error('Caught Error in SapApi -> validateDistributorSalesOrder', error);
            throw error;
        }
    },

    async reportValidationError(distId,errorObj) {
        try {
            const url = `${SapApiConfig.reportErrorUrl}/${distId}`;
            return await apiCall('POST',url, errorObj);
        } catch (error) {
            logger.error('Caught Error in SapApi -> reportValidationError', error);
            throw error;
        }
    },

    async validateOrder(po: any, distId: string) {
        logger.info(`inside SapApi -> validateOrder, po_number: ` + po.PURCH_NO);
        try {
            const url = `${SapApiConfig.validateUrl}/${distId}`;
            const partners = po.partnerset.map((partner) => {
                return {
                    partner_name: partner.PARTN_NAME,
                    partner_role: partner.PARTN_ROLE,
                    partner_number: partner.PARTN_NUMB,
                };
            });
            const items = po.Itemset.map((item) => {
                return {
                    description: item.DESCRIPTION,
                    distribution_channel: +(item.DISTR_CHAN),
                    division: +(item.DIVISION),
                    item_number: item.ITM_NUMBER,
                    material_code: item.MATERIAL,
                    open_order: item.open_order,
                    pack_type: item.PACK_TYPE,
                    required_qty: item.REQ_QTY,
                    sales_org: +(item.SALES_ORG),
                    sales_unit: item.SALES_UNIT,
                    stock_in_hand: item.stock_in_hand,
                    stock_in_transit: item.stock_in_transit,
                    target_qty: item.TARGET_QTY
                };
            });
            const validate_payload = {
                sales_org: (po.SALES_ORG),
                distribution_channel: +(po.DISTR_CHAN),
                division: (po.DIVISION),
                items: items,
                navresult: [],
                partners: partners,
                po_date: po.PURCH_DATE,
                po_number: po.PURCH_NO,
                req_date: po.REQ_DATE_H,
                pdp: 'OFF'
            };
            
            const response =  await apiCall('POST',url, validate_payload);
            return response;
        } catch (error) {
            logger.error('Caught Error in SapApi -> validateOrder'+ error.toString());
            return false;
        }
    },

    async createOrder(po: any, vr:any,  distId: string, distributor_sales_details : any[], raised_by: string| null = '') {
        logger.info(`inside SapApi -> createOrder, po_number: ` + po.PURCH_NO);
        try {
            const url = `${SapApiConfig.createOrderUrl}/${distId}`;
            vr = vr.d || {};
            if(po && Object.keys(po).length && vr && Object.keys(vr).length){
                const { NAVRESULT } = vr;
                const navresult = NAVRESULT.results;
                const filteredNavMap = new Map();
                navresult.filter(item => item.Message === 'Order ready for creation').forEach(item => {
                    filteredNavMap.set(item.Item, item);
                });
    
                let itemType = 'dist_specific';
                const tonn = po.Itemset.reduce((acc, item) => {
                    const val = +(item.Quantity_Ton.split(' ')[0]);
                    if(item.item_type === 'universal')
                        itemType = 'universal';
                    return acc + val;
                },0);
    
                const filteredItems = po.Itemset
                                        .filter(item => filteredNavMap.has(item.ITM_NUMBER))
                                        .map(item => {
                                                    return {
                                                        item_number: item.ITM_NUMBER,
                                                        distribution_channel: +(item.DISTR_CHAN),
                                                        division: +(item.DIVISION),
                                                        material_code: item.MATERIAL,
                                                        required_qty: item.REQ_QTY,
                                                        sales_org: +(item.SALES_ORG),
                                                        sales_unit: item.SALES_UNIT,
                                                    };
                                                });
                
                const unloading = po.partnerset.find(partner => partner.PARTN_ROLE === 'Y1');
            
                const create_order_payload = {
                    sales_org: (po.SALES_ORG),
                    distribution_channel: +(po.DISTR_CHAN),
                    division: (po.DIVISION),
                    items: filteredItems,
                    navresult: [],
                    po_date: po.PURCH_DATE,
                    po_number: po.PURCH_NO,
                    req_date: po.REQ_DATE_H,
                    pdp: 'OFF',
                    soldto : distId,
                    shipto : po.partnerset.find(partner => partner.PARTN_ROLE === 'WE').PARTN_NUMB,
                    unloading : unloading ? unloading.PARTN_NUMB : '',
                    ton : tonn,
                    product_type: itemType,
                    pay_terms: ""
                };
                if(po.PURCH_NO?.startsWith('RO')){
                    create_order_payload['raised_by'] = raised_by || distId;
                }
                
                const response =  await apiCall('POST',url, create_order_payload);
                return response;
            }
            logger.error('inside SapApi -> createOrder, empty validate response for po_number: ' + po.PURCH_NO);
            return false;
            
        } catch (error) {
            logger.error('inside SapApi -> createOrder, Error: '+ error.toString());
            return false;
        }
    }
}