import moment from 'moment';
import Helper from './index';

interface OrderDate {
    allowedToOrder: boolean;
    orderStartDate?: Date;
    orderEndDate?: Date;
    orderStartTime?: string;
    orderEndTime?: string;
    errorMessage?: string;
    pdpDate?: Date;
}

export class PDPConfig {
    pdp_restriction: {
        key: string;
        enable_value: string;
        disable_value: string;
        value: boolean;
    };
    db_level_pdp_restrictions: {
        value: boolean;
    };
    pdp_weekly: {
        THRESHOLD_FREQUENCY: number;
        MO: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        TU: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        WE: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        TH: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        FR: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        SA: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        SU: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
    };
    pdp_fortnightly: {
        THRESHOLD_FREQUENCY: number;
        MO: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        TU: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        WE: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        TH: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        FR: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        SA: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
        SU: {
            key1: string;
            key2: string;
            orderWindow: string | null;
            orderPlacementEndTime: string | null;
            orderWindowException: string | null;
            orderPlacementEndTimeException: string | null;
        };
    };
    constructor() {
        this.pdp_restriction = {
            key: 'ENABLE_PDP_RESTRICTION',
            enable_value: 'YES',
            disable_value: 'NO',
            value: false,
        };
        this.db_level_pdp_restrictions = {
            value: false,
        };
        this.pdp_weekly = {
            THRESHOLD_FREQUENCY: 0,
            MO: {
                key1: 'order_window_mo',
                key2: 'order_placement_end_time_mo',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            TU: {
                key1: 'order_window_tu',
                key2: 'order_placement_end_time_tu',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            WE: {
                key1: 'order_window_we',
                key2: 'order_placement_end_time_we',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            TH: {
                key1: 'order_window_th',
                key2: 'order_placement_end_time_th',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            FR: {
                key1: 'order_window_fr',
                key2: 'order_placement_end_time_fr',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            SA: {
                key1: 'order_window_sa',
                key2: 'order_placement_end_time_sa',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            SU: {
                key1: 'order_window_su',
                key2: 'order_placement_end_time_su',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
        };
        this.pdp_fortnightly = {
            THRESHOLD_FREQUENCY: 0,
            MO: {
                key1: 'order_window_mo',
                key2: 'order_placement_end_time_mo',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            TU: {
                key1: 'order_window_tu',
                key2: 'order_placement_end_time_tu',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            WE: {
                key1: 'order_window_we',
                key2: 'order_placement_end_time_we',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            TH: {
                key1: 'order_window_th',
                key2: 'order_placement_end_time_th',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            FR: {
                key1: 'order_window_fr',
                key2: 'order_placement_end_time_fr',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            SA: {
                key1: 'order_window_sa',
                key2: 'order_placement_end_time_sa',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
            SU: {
                key1: 'order_window_su',
                key2: 'order_placement_end_time_su',
                orderWindow: '44:00',
                orderPlacementEndTime: '-04:00',
                orderWindowException: null,
                orderPlacementEndTimeException: null,
            },
        };
    }
}

export const PDPCheck = {
    updateAppSettings(app_level_configuration, pdp_windows, db_level_pdp_flag: boolean): PDPConfig {
        const pdpConfig = new PDPConfig();
        pdpConfig.db_level_pdp_restrictions.value = db_level_pdp_flag;

        if (app_level_configuration?.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === pdpConfig.pdp_restriction.key) {
                    pdpConfig.pdp_restriction.value = config.value === pdpConfig.pdp_restriction.enable_value;
                }
            }
        }

        pdp_windows?.forEach((window) => {
            const config = window.pdp_type === 'WE' ? pdpConfig.pdp_weekly : pdpConfig.pdp_fortnightly;
            if (+window.threshold_frequency === -1) {
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], { orderWindow: window[config[day].key1], orderPlacementEndTime: window[config[day].key2] });
                }
            } else {
                Object.assign(config, { THRESHOLD_FREQUENCY: +window.threshold_frequency });
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], { orderWindowException: window[config[day].key1], orderPlacementEndTimeException: window[config[day].key2] });
                }
            }
        });
        return pdpConfig;
    },

    /**
     * PDP logic is maintained in the client. Hence, this methods has to be kept in sync with the client code
     */
    pdpFrequencyCounter(pdp: string) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        return days.filter((day) => pdp.includes(day)).length;
    },

    checkPdpDay(pdpDay: string, referenceDate: string | null, pdpConfig: PDPConfig, today = new Date()) {
        // -> check if any parameter is missing then return null
        if (!pdpDay) {
            return { allowedToOrder: false };
        }
        const pdpType = pdpDay.substring(0, 2);
        pdpDay = pdpDay.substring(2);

        // -> check if pdpType is valid and pdpDays are present
        if ((pdpType !== 'WE' && pdpType !== 'FN') || !pdpDay) {
            return { allowedToOrder: false };
        }

        let result: OrderDate = {
            allowedToOrder: false,
        };
        let allUpcomingOrderDates: OrderDate[] = [];
        let allAllowedOrderDates: OrderDate[] = [];
        const days = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        const pdpFrequency = PDPCheck.pdpFrequencyCounter(pdpDay);
        for (let day of Object.keys(days)) {
            if (pdpDay.includes(day)) {
                if (pdpType === 'WE') {
                    result = PDPCheck.checkOrderAllowed_WE_PDP(day, today, pdpFrequency, pdpConfig);
                } else {
                    result = PDPCheck.checkOrderAllowed_FN_PDP(day, referenceDate, today, pdpFrequency, pdpConfig);
                }
                if (result?.allowedToOrder) {
                    allAllowedOrderDates.push(result);
                } else {
                    allUpcomingOrderDates.push(result);
                }
            }
        }
        if (allAllowedOrderDates.length) {
            const earliestOrderDates = allAllowedOrderDates.reduce((prev: OrderDate, curr: OrderDate) => (prev?.orderStartDate < curr?.orderStartDate ? prev : curr));
            return {
                allowedToOrder: earliestOrderDates.allowedToOrder,
                orderStartDate: earliestOrderDates.orderStartDate,
                orderEndDate: earliestOrderDates.orderEndDate,
                orderStartTime: Helper.formatTime(earliestOrderDates.orderStartDate),
                orderEndTime: Helper.formatTime(earliestOrderDates.orderEndDate),
                pdpDate: earliestOrderDates.pdpDate,
            };
        }
        if (allUpcomingOrderDates.length) {
            const earliestOrderDates = allUpcomingOrderDates.reduce((prev, curr) => (prev?.orderStartDate < curr?.orderStartDate ? prev : curr));
            return {
                allowedToOrder: earliestOrderDates.allowedToOrder,
                orderStartDate: earliestOrderDates.orderStartDate,
                orderEndDate: earliestOrderDates.orderEndDate,
                orderStartTime: Helper.formatTime(earliestOrderDates.orderStartDate),
                orderEndTime: Helper.formatTime(earliestOrderDates.orderEndDate),
                pdpDate: earliestOrderDates.pdpDate,
                errorMessage: referenceDate && pdpType === 'FN' ? `PDP: ${pdpType}${pdpDay}, Reference Date : ${referenceDate}` : `PDP: ${pdpType}${pdpDay}`,
            };
        }
        return { allowedToOrder: false };
    },

    /*
     * This method will do all the necessary calculation and will return an object with true/false and starting and ending date time
     */
    checkOrderAllowed_WE_PDP(day, today, pdpFrequency, pdpConfig: PDPConfig) {
        /*
         * receiving one PDP day
         * retrieve the applicable orderWindow and orderPlacementEndTime of that PDP day and extract hours and minutes
         * calculate the start and end day and time
         * check if today belongs within that time window, yes -> allowOrder = true, else false
         */
        let { orderWindow, orderPlacementEndTime, orderWindowException, orderPlacementEndTimeException } = pdpConfig.pdp_weekly[day];

        if (pdpFrequency <= pdpConfig.pdp_weekly.THRESHOLD_FREQUENCY) {
            orderWindow = orderWindowException ?? orderWindow;
            orderPlacementEndTime = orderPlacementEndTimeException ?? orderPlacementEndTime;
        }

        const orderWindowHour = Number(orderWindow.split(':')[0]) | 0;
        const orderWindowMinutes = (orderWindow.charAt(0) === '-' ? 0 - Number(orderWindow.split(':')[0]) : Number(orderWindow.split(':')[1])) | 0;
        const orderPlacementEndTimeHour = Number(orderPlacementEndTime.split(':')[0]) | 0;
        //handle -00 = 00 condition, eg. -00:30 = 00Hrs, -30min
        //if hour is -ve, make min as -ve;
        const orderPlacementEndTimeMinutes =
            (orderPlacementEndTime.charAt(0) === '-' ? 0 - Number(orderPlacementEndTime.split(':')[1]) : Number(orderPlacementEndTime.split(':')[1])) | 0;
        const days = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        const todayWeekDay = today.getDay();
        const pdpWeekDay = days[day];
        //finding the nearest PDP day from today, Suppose PDP= "WETU" and I come on SU/MO then it should return 2/1; Now suppose I come on WE/TH it should return 6/5
        let upcomingPDPDay =
            pdpWeekDay - todayWeekDay < 0 || (pdpWeekDay - todayWeekDay === 0 && orderPlacementEndTimeHour < today.getHours())
                ? pdpWeekDay - todayWeekDay + 7
                : pdpWeekDay - todayWeekDay;
        let orderStartDate = new Date(today);
        let orderEndDate = new Date(today);
        let pdpDate = new Date(today);

        const calculateOrderEndDate = (upcomingPDPDay) => {
            orderEndDate.setDate(orderEndDate.getDate() + upcomingPDPDay);
            //setting the time to midnight
            orderEndDate.setHours(0);
            orderEndDate.setMinutes(0);
            orderEndDate.setSeconds(0);
            orderEndDate.setMilliseconds(0);
            pdpDate = new Date(orderEndDate);
            //calculating the orderEndDate
            orderEndDate.setHours(orderEndDate.getHours() + orderPlacementEndTimeHour);
            orderEndDate.setMinutes(orderEndDate.getMinutes() + orderPlacementEndTimeMinutes);
        };
        calculateOrderEndDate(upcomingPDPDay);

        /*
         * Required to handle this type of condition
         *  PDP : WEFR , referenceDate : 20220506, today : Fri Feb 24 2023 11:06:36 GMT+0530 (India Standard Time), orderStartDate1 : Wed Feb 22 2023 00:00:00 GMT+0530 (India Standard Time), orderEndDate1 : Thu Feb 23 2023 19:59:00 GMT+0530 (India Standard Time), startDateTime : Wed Mar 01 2023 00:00:00 GMT+0530 (India Standard Time), endDateTime : Thu Mar 02 2023 19:59:00 GMT+0530 (India Standard Time)
         */
        if (orderEndDate <= today) {
            // + 8 since need to go to day of the PDP when today is the PDP day itself;
            const additionDays = upcomingPDPDay === 0 && orderPlacementEndTimeHour < 0 ? 8 : 7;
            calculateOrderEndDate(upcomingPDPDay + additionDays);
        }
        //making orderStartDate = orderEndDate
        orderStartDate = new Date(orderEndDate);
        orderStartDate.setHours(orderEndDate.getHours() - orderWindowHour);
        orderStartDate.setMinutes(orderStartDate.getMinutes() - orderWindowMinutes);

        const orderStartTime = Helper.formatTime(orderStartDate);
        const orderEndTime = Helper.formatTime(orderEndDate);

        let allowedToOrder = false;
        //check if today is within the orderWindow
        if (orderStartDate <= today && today <= orderEndDate) {
            allowedToOrder = true;
        }
        return { allowedToOrder, orderStartDate, orderEndDate, orderStartTime, orderEndTime, pdpDate };
    },

    checkOrderAllowed_FN_PDP(day, referenceDate, today, pdpFrequency, pdpConfig: PDPConfig) {
        /*
         * receiving one PDP day and referenceDate
         * if any of the parameters are missing return null
         * run a loop to pull the referenceDate to the upcoming PDP date (same year, same week number or less)
         * if the orderEndDate is before today, then the iterate the loop once again
         * calculate the orderWindow
         */
        let orderStartDate = new Date(today);
        let orderEndDate = new Date(today);
        let pdpDate = new Date(today);
        const todayWeekDay = today.getDay();
        let { orderWindow, orderPlacementEndTime, orderWindowException, orderPlacementEndTimeException } = pdpConfig.pdp_fortnightly[day];

        if (pdpFrequency <= pdpConfig.pdp_fortnightly.THRESHOLD_FREQUENCY) {
            orderWindow = orderWindowException ?? orderWindow;
            orderPlacementEndTime = orderPlacementEndTimeException ?? orderPlacementEndTime;
        }

        const orderWindowHour = Number(orderWindow.split(':')[0]) | 0;
        const orderWindowMinutes = (orderWindow.charAt(0) === '-' ? 0 - Number(orderWindow.split(':')[0]) : Number(orderWindow.split(':')[1])) | 0;
        const orderPlacementEndTimeHour = Number(orderPlacementEndTime.split(':')[0]);
        const orderPlacementEndTimeMinutes =
            (orderPlacementEndTime.charAt(0) === '-' ? 0 - Number(orderPlacementEndTime.split(':')[1]) : Number(orderPlacementEndTime.split(':')[1])) | 0;

        if (!day || !referenceDate) {
            return { allowedToOrder: false };
        }

        const refDate = new Date(referenceDate.substring(0, 4), Number(referenceDate.substring(4, 6)) - 1, referenceDate.substring(6));
        const todayWeekNumber = moment(today).format('W');
        let upcomingPDPDate = new Date(refDate);
        let upcomingPDPDateWeekNumber = moment(upcomingPDPDate).format('W');

        const calculateOrderEndDate = (upcomingPDPDate) => {
            orderEndDate = new Date(upcomingPDPDate);
            orderEndDate.setHours(0);
            orderEndDate.setMinutes(0);
            orderEndDate.setSeconds(0);
            orderEndDate.setMilliseconds(0);
            pdpDate = new Date(orderEndDate);
            orderEndDate.setHours(orderEndDate.getHours() + orderPlacementEndTimeHour);
            orderEndDate.setMinutes(orderEndDate.getMinutes() + orderPlacementEndTimeMinutes);
        };

        while (
            upcomingPDPDate.getFullYear() < today.getFullYear() ||
            (upcomingPDPDate.getFullYear() === today.getFullYear() && Number(upcomingPDPDateWeekNumber) < Number(todayWeekNumber)) ||
            (upcomingPDPDate.getFullYear() === today.getFullYear() &&
                Number(upcomingPDPDateWeekNumber) === Number(todayWeekNumber) &&
                Number(upcomingPDPDate.getDay()) < Number(todayWeekDay)) ||
            (upcomingPDPDate.getFullYear() === today.getFullYear() &&
                Number(upcomingPDPDateWeekNumber) === Number(todayWeekNumber) &&
                Number(upcomingPDPDate.getDay()) >= Number(todayWeekDay) &&
                orderEndDate < today)
        ) {
            upcomingPDPDate.setDate(upcomingPDPDate.getDate() + 14);
            upcomingPDPDateWeekNumber = moment(upcomingPDPDate).format('W');
            calculateOrderEndDate(upcomingPDPDate);
        }

        //making orderStartDate = orderEndDate
        orderStartDate = new Date(orderEndDate);
        orderStartDate.setHours(orderEndDate.getHours() - orderWindowHour);
        orderStartDate.setMinutes(orderStartDate.getMinutes() - orderWindowMinutes);

        const orderStartTime = Helper.formatTime(orderStartDate);
        const orderEndTime = Helper.formatTime(orderEndDate);

        let allowedToOrder = false;
        //check if today is within the orderWindow
        if (orderStartDate <= today && today <= orderEndDate) {
            allowedToOrder = true;
        }
        return { allowedToOrder, orderStartDate, orderEndDate, orderStartTime, orderEndTime, pdpDate };
    },
};
