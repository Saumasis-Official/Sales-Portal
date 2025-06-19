import { ValidateRegularOrder } from '../classes/validateRegularOrder';
import { ValidateRushOrder } from '../classes/validateRushOrder';
import { ValidateBulkOrder } from '../classes/validateBulkOrder';
import { ValidateSelfLiftingOrder } from '../classes/validateSelfLiftingOrder';
import { ValidateLiquidationOrder } from '../classes/validateLiquidationOrder';
import { ValidateOrderInterface } from '../interface/ValidateOrder';
import { OrderTypes } from '../../enum/OrderTypes';
import Helper from './index';
import { UtilService } from '../service/UtilService';
import appConfig from './appConfig';
const { app_config } = appConfig;
import moment from 'moment-timezone';
import { ValidateARSOrder } from '../classes/validateARSOrder';
import { PDPCheck, PDPConfig } from './pdp';
import { ErrorMessage } from '../constant/error.message';

export const validateHelper = {
    getValidator: (order_type: OrderTypes): ValidateOrderInterface => {
        switch (order_type) {
            case OrderTypes.NORMAL:
                return ValidateRegularOrder.getInstance();
            case OrderTypes.RUSH:
                return ValidateRushOrder.getInstance();
            case OrderTypes.BULK:
                return ValidateBulkOrder.getInstance();
            case OrderTypes.SELF_LIFTING:
                return ValidateSelfLiftingOrder.getInstance();
            case OrderTypes.LIQUIDATION:
                return ValidateLiquidationOrder.getInstance();
            case OrderTypes.ARS:
                return ValidateARSOrder.getInstance();
            default:
                return ValidateRegularOrder.getInstance();
        }
    },

    generatePO: (order_type: OrderTypes): string => {
        const randomPart = Helper.generateRandomNumber().toString().padStart(16, '0').substring(0, 16);

        switch (order_type) {
            case OrderTypes.LIQUIDATION:
                return `LIQ` + `-${randomPart}`;
            case OrderTypes.SELF_LIFTING:
                return `SFL` + `-${randomPart}`;
            case OrderTypes.ARS:
                return `AOR` + `-${randomPart}`;
            case OrderTypes.RUSH:
                return `RO` + `-${randomPart}`;
            case OrderTypes.BULK:
                return `BO` + `-${randomPart}`;
            case OrderTypes.CALL_CENTER:
                return `CCO` + `-${randomPart}`;
            case OrderTypes.AOS:
                return `AOS` + `-${randomPart}`;
            default:
                return `DBO` + `-${randomPart}`;
        }
    },

    getPoValidity: async (purchase_date: string): Promise<string> => {
        let poValidity = '';
        const { rows } = (await UtilService.getAppLevelConfigurations()) || { rows: [] };
        const appconfig = rows.find((config) => config.key === 'CCO_PO_VALIDITY');
        if (appconfig) {
            let ccoValidityDate = appconfig?.value;
            if (ccoValidityDate) {
                ccoValidityDate = parseInt(ccoValidityDate, 10);
                if (isNaN(ccoValidityDate)) ccoValidityDate = 0;

                const [dayStr, monthStr, yearStr] = purchase_date.split('.');
                const day = Number(dayStr);
                const month = Number(monthStr);
                const year = Number(yearStr);

                const purchaseDateObj = new Date(year, month - 1, day);
                purchaseDateObj.setDate(purchaseDateObj.getDate() + ccoValidityDate);

                const formattedDay = String(purchaseDateObj.getDate()).padStart(2, '0');
                const formattedMonth = String(purchaseDateObj.getMonth() + 1).padStart(2, '0');
                const formattedYear = purchaseDateObj.getFullYear();
                poValidity = `${formattedDay}.${formattedMonth}.${formattedYear}`;
            }
        }
        return poValidity;
    },

    formatTime: (data: Date) => {
        if (!data) return null;
        return moment(data).format('hh:mm A');
    },

    handlePdpValidate: function (pdpDay: string, referenceDate: string, order_type: OrderTypes, pdp: PDPConfig | null) {
        let errorText: string = '';
        const today: Date = Helper.getISTDateTime();
        let hasPDPError: boolean = false;
        const isRushOrder = order_type === OrderTypes.RUSH;

        let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage, allowedToOrder } = PDPCheck.checkPdpDay(pdpDay, referenceDate, pdp, today);

        if (pdpDay.substring(0, 2) == 'WE') {
            //PDP logic changed SOPE-453, SOPE-458 and SOPE-1748

            if (orderStartDate && orderEndDate) {
                if (!moment(today).isBetween(orderStartDate, orderEndDate, undefined, '[]') && !isRushOrder) {
                    errorText = `${errorMessage ? `${errorMessage};` : ''} You can place order for this item between ${moment(orderStartDate).format('DD-MMM-YYYY hh:mm A')} to ${moment(orderEndDate).format('DD-MMM-YYYY hh:mm A')}.`;
                    hasPDPError = true;
                } else if (isRushOrder && moment(today).isBetween(orderStartDate, orderEndDate, undefined, '[]')) {
                    errorText = ErrorMessage.RUSH_ORDER_PDP_ERROR;
                    hasPDPError = true;
                }
            }
        } else if (pdpDay.substring(0, 2) == 'FN' && !(referenceDate == '' || referenceDate == '00000000')) {
            //PDP logic changed SOPE-453 and SOPE-458

            if (orderStartDate && orderEndDate) {
                if (!moment(today).isBetween(orderStartDate, orderEndDate, undefined, '[]') && !isRushOrder) {
                    errorText = `${errorMessage ? errorMessage + '; ' : ''} You can place order for this item between ${moment(orderStartDate).format('DD-MMM-YYYY hh:mm A')} to ${moment(orderEndDate).format('DD-MMM-YYYY hh:mm A')}.`;
                    hasPDPError = true;
                } else if (moment(today).isBetween(orderStartDate, orderEndDate, undefined, '[]') && isRushOrder) {
                    errorText = ErrorMessage.RUSH_ORDER_PDP_ERROR;
                    hasPDPError = true;
                }
            }
        }
        return { hasPDPError, errorText };
    },
};
