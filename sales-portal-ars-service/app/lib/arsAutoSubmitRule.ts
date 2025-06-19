import { SapApi } from "../helper/sapApi";
import { ValidateOrderTransformer } from "../transformer/validateOrder";
import logger from "./logger";
import { ErrorLog, ErrorLogDetails, SalesOrderData } from "../model/ErrorLogs";
import emailConfig from '../config/email';
import CreateOrder from "../model/createOrder";
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
    async pdpWindowCalculation(app_setting_list) {
        /**
         * TODO: Changes: According to SOPE-1748, the logic applied in this function is obsolete and should be changed.
         * Since this function is only used in ArsService -> arsAutoSubmit, so not changing it now.
         */

        if (app_setting_list) {
            let settingList: any[] = [];
            for (let data of app_setting_list) {
                settingList.push({ ...data })
            }
            settingData = settingList;
            const weeklyPdpClosingDays: string[] = [];
            const fortnightlyPdpClosingDays: string[] = [];
            for (let day of weekDays) {
                const result = await this.convertHoursToDayTime(day.orderWindowWE, day.orderPlacementEndTimeWE, day.key);
                if (result)
                    weeklyPdpClosingDays.push(day.key);

            }
            for (let day of weekDays) {
                const result = await this.convertHoursToDayTime(day.orderWindowFN, day.orderPlacementEndTimeFN, day.key);
                if (result)
                    fortnightlyPdpClosingDays.push(day.key);
            }
            return { weeklyPdpClosingDays, fortnightlyPdpClosingDays };
        }
    },
    async convertHoursToDayTime(orderWindowKey, orderPlacementEndTimeKey, pdpDay) {

        const orderPlacementEndTime = (settingData.find(setting => setting.key === orderPlacementEndTimeKey))?.value;

        const orderPlacementEndTimeHour = Number(orderPlacementEndTime?.split(':')[0]) || 0;
        const orderPlacementEndTimeMin = ((orderPlacementEndTime?.charAt(0) === '-') ? Number('-' + orderPlacementEndTime?.split(':')[1]) : Number(orderPlacementEndTime?.split(':')[1])) || 0;

        let now = new Date();
        const day = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        const pdpDayIndex = day.indexOf(pdpDay);
        while (now.getDay() !== pdpDayIndex) {
            now.setDate(now.getDate() + 1);
        }
        now.setHours(0);
        now.setMinutes(0);
        now.setMilliseconds(0);

        now.setHours(now.getHours() + orderPlacementEndTimeHour);
        now.setMinutes(now.getMinutes() + orderPlacementEndTimeMin);

        const endDay = dayName[now.getDay()];
        if ((new Date()).getDay() === dayName.indexOf(endDay))
            return true;
        return false;
    },
    async regionsWithAutoSubmitEnabled(app_setting_list) {
        const autoOrdering = "AO";
        const gtMetro = "AO_METRO";
        const gtNonMetro = "AO_NON_METRO";
        const enable = "_ENABLE";
        const submit = "_ORDER_SUBMIT";

        let applicableRegions = new Set();

        if (app_setting_list) {
            for (const item of app_setting_list) {
                const keyExtract = item.key.split('_');
                if (keyExtract[0] === autoOrdering) {
                    if ([enable, submit].includes(`_${keyExtract[keyExtract.length - 2]}`)) {
                        applicableRegions.add(keyExtract[keyExtract.length - 1]);
                    }
                }
            };
            const metroRegions: any[] = [];
            const nonMetroRegions: any[] = [];
            for (const region of applicableRegions) {
                const metroEnable = app_setting_list?.find((item: { key: string; }) => item.key === `${gtMetro}${enable}_${region}`).value === 'TRUE';
                const metroSubmit = app_setting_list?.find((item: { key: string; }) => item.key === `${gtMetro}${submit}_${region}`).value === 'TRUE';
                const nonMetroEnable = app_setting_list?.find((item: { key: string; }) => item.key === `${gtNonMetro}${enable}_${region}`).value === 'TRUE';
                const nonMetroSubmit = app_setting_list?.find((item: { key: string; }) => item.key === `${gtNonMetro}${submit}_${region}`).value === 'TRUE';
                if (metroEnable && metroSubmit)
                    metroRegions.push(region);
                if (nonMetroEnable && nonMetroSubmit)
                    nonMetroRegions.push(region)
            };
            return { metroRegions, nonMetroRegions };
        }
    },
    mapAutoOrderDetails(recommendedMaterials, region_details, materials) {
        if (!materials?.length) return;
        let mappedData = [];
        mappedData = recommendedMaterials.map((item, index) => {
            return materials.map(element => {
                if (item.productCode === element.code) {
                    const orderItem = {
                        materials: [element],
                        code: item.productCode,
                        quantity: item.qty,
                        description: element.description,
                        sales_unit: element.sales_unit,
                        pak_type: element.pak_type,
                        buom: '',
                        ton: '',
                        tentative: '',
                        disabled: '',
                        selectedValue: item.productCode,
                        item_number: ((index + 1) * 10).toString().padStart(6, '0'),
                        error: '',
                        class: '',
                        isAutoOrderRecommended: true,
                        sales_org: element.sales_org || 1010,
                        distribution_channel: element.distribution_channel || 10,
                        division: element.division,
                    };
                    if (region_details?.area_code
                        && region_details?.channel_code
                        && element.appl_area_channel
                        && element.appl_area_channel.some(obj => (obj.area === region_details.area_code)
                            && (obj.channel === region_details.channel_code))) {
                        orderItem['item_type'] = 'dist_specific';
                    } else {
                        orderItem['item_type'] = 'universal';
                    }
                    return orderItem;
                }
            }).filter(i => i);
        });
        return mappedData?.flat();
    },
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