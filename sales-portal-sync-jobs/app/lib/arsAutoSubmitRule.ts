import { SapApi } from "../helper/sapApi";
import CreateOrder from "../models/createOrder";
import { ValidateOrderTransformer } from "../transformer/validateOrder";
import logger from "./logger";
import { ErrorLog, ErrorLogDetails, SalesOrderData } from "../models/ErrorLogs";
import emailConfig from '../config/email';
const weekDays = [
    {
        key: 'MO',
        index: 1,
        value: 'MONDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_MO',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_MO",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_MO",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_MO",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'TU',
        index: 2,
        value: 'TUESDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_TU',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_TU",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_TU",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_TU",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'WE',
        index: 3,
        value: 'WEDNESDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_WE',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_WE",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_WE",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_WE",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'TH',
        index: 4,
        value: 'THURSDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_TH',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_TH",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_TH",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_TH",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'FR',
        index: 5,
        value: 'FRIDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_FR',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_FR",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_FR",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_FR",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'SA',
        index: 6,
        value: 'SATURDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_SA',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_SA",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_SA",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_SA",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    },
    {
        key: 'SU',
        index: 0,
        value: 'SUNDAY',
        orderWindowWE: 'PDP_WE_ORDER_WINDOW_SU',
        orderPlacementEndTimeWE: "PDP_WE_ORDER_PLACEMENT_END_TIME_SU",
        orderWindowFN: "PDP_FN_ORDER_WINDOW_SU",
        orderPlacementEndTimeFN: "PDP_FN_ORDER_PLACEMENT_END_TIME_SU",
        startDayWE: "",
        startTimeWE: "",
        endDayWE: "",
        endTimeWE: "",
        startDayFN: "",
        startTimeFN: "",
        endDayFN: "",
        endTimeFN: "",
    }
];
let settingData: any[];
export const ArsAutoSubmitRules = {
    async handleValidate(create_order: CreateOrder) {
        const orderItemList = create_order.items;
        let ao_list = orderItemList.map(o => {
            let original_quantity = orderItemList.find(i => i.code === o.code)?.quantity;
            original_quantity = (original_quantity != null || original_quantity != undefined) ? original_quantity : '0';
            return { ...o, original_quantity };
        })

        const arsOrderList = ao_list.filter(item => item.quantity > 0);
        const orderData = ValidateOrderTransformer.transform(arsOrderList);
        const originalOrderData = ValidateOrderTransformer.transform(ao_list);
        create_order.setValue('original_items', originalOrderData);
        create_order.setValue('items', orderData);
        const salesData = { ...create_order };
        delete salesData?.error;
        delete salesData?.submit;
        delete salesData?.doc_type;
        delete salesData?.order_payload;
        delete salesData?.order_response;
        delete salesData?.order_total_amount;
        delete salesData?.distributor;
        delete salesData?.soldto;
        delete salesData?.shipto;
        delete salesData?.unloadingpoint;
        delete salesData?.order_type;
        delete salesData?.so_number;
        try {
            const validate = await SapApi.validateDistributorSalesOrder(create_order.distributor, salesData);
            return validate;
        } catch (error) {
            logger.error('Caught Error in ArsAutoSubmitRule -> handleValidate', error);
            throw error;
        }

    },
    handleValidationErrors(regionDetails: any, recommendation: any, validationResponse: any) {
        if (!validationResponse || validationResponse?.success == 'false') {
            return 'SAP validation is unsuccessful'
        }
        const errorObj = {};
        const allTentativeAmounts: number[] = [];
        const dbSpecificErrors = [
            'Customer # has been assigned order block',
            'Sold-to party # not maintained for sales area',
            'Ship-to party # not defined for sales area'
        ];
        let dbSpecificErrorExist = false;
        try {
            const tentativeAmounts = {};
            const salesOrderData = new SalesOrderData(regionDetails, recommendation);
            //!IMPORTANT: cc cannot be empty, null or undefined
            const cc = emailConfig.forecast_dump_email.cc;
            const itemList = validationResponse?.d?.NAVRESULT?.results;
            for (const item of itemList) {
                tentativeAmounts[item.Item] = item.Tentitive;
                if (item.Message != 'Order ready for creation') {
                    const message = errorObj[item.Item] ? `${errorObj[item.Item]}; ${item.Message}` : `${item.Message}`;
                    Object.assign(errorObj, { [item.Item]: message });

                    dbSpecificErrors.forEach(errorMessage => {
                        let tempErrorCheck = errorMessage.replace("#", salesOrderData.distributor.id);

                        if(item.Message.includes(tempErrorCheck)) {
                            dbSpecificErrorExist = true;
                        }
                    })
                }
            }
            salesOrderData?.items?.forEach(i => {
                /**
                 * SAP on validation error send tentative amount as "0". So we are setting default tentative amount as 0.0
                 * This will act as an identifier for the items which are not present in the SAP validation response.
                 */
                i.tentative = tentativeAmounts[i.item_number] ?? 0.0; 
                allTentativeAmounts.push(+i.tentative);
            })
            const errorArray: any[] = [];
            const materialsByItemNo = new Map();
            const itemNumbersReceivedFromSAPValidationResponse = new Set(itemList.map(item => item.Item));
            const missingItemsFromSAPValidation: { item_number: string, psku_code: string }[] = [];
            recommendation?.forEach(item => {
                materialsByItemNo.set(item.item_number, item);
                if (!itemNumbersReceivedFromSAPValidationResponse.has(item.item_number)) {
                    missingItemsFromSAPValidation.push({ "item_number": item.item_number, "psku_code": item.material_code });
                }
            });
            for (const key in errorObj) {
                errorArray.push({ "item_number": key.toString(), "message": errorObj[key], "material": materialsByItemNo.get(key.toString()) })
            }
            const errorLogDetails = new ErrorLogDetails(salesOrderData, errorArray);
            const isAllTentativeAmountsZero: boolean = allTentativeAmounts.every(amount => (amount === 0.0 || amount === 0 ));
            const errorLog = new ErrorLog(regionDetails?.tse, cc, errorLogDetails);
            errorLog.allTentativeAmountsZero = isAllTentativeAmountsZero;
            errorLog.itemNumbersReceivedFromSAPValidationResponseCount = itemNumbersReceivedFromSAPValidationResponse.size;
            errorLog.missingItemsFromSAPValidation = missingItemsFromSAPValidation;
            errorLog.itemsSentForValidationCount = recommendation?.length;
            errorLog.dbSpecificErrorExist = dbSpecificErrorExist;
            return errorLog;
        } catch (error) {
            logger.error('Error in handleValidationError: ', error);
            return null;
        }

    },

    mapDLPOrderDetails(recommendedMaterials) {
        if (!recommendedMaterials?.length) return;
        const mappedData = recommendedMaterials?.map((item, index) => {
            const productDetails = {
                code: item.productCode,
                quantity: item.qty,
                description: item.description,
                sales_unit: item.sales_unit,
                pak_type: item.pak_type,
                buom: '',
                ton: '',
                tentative: '',
                disabled: '',
                selectedValue: item.productCode,
                item_number: ((index + 1) * 10).toString().padStart(6, '0'),
                error: '',
                class: '',
                isAutoOrderRecommended: true,
                sales_org: 1010,
                distribution_channel: 10,
                division: item.division,
                item_type: "universal"
            }
            const productDetailsMaterials = {
                code: item.productCode,
                description: item.description,
                sales_unit: item.sales_unit,
                pak_type: item.pak_type,
                pak_code: item.pak_code,
                appl_area_channel: item.appl_area_channel,
                ton_to_cv: item.ton_to_cv,
                division: item.division,
                stock_in_transit: "",
                stock_in_hand: "",
                open_order: ""
            };
            return {
                ...productDetails,
                materials: [productDetailsMaterials]
            }
        })

        return mappedData ?? [];
    },
}