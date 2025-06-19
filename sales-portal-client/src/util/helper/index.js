import moment from 'moment';
import config from '../../config';
import serverConfig from '../../config/server';
import XLSX from 'xlsx';
import { notification } from 'antd';
import { AES, enc } from 'crypto-js';
const appConfig = config.app_level_configuration;
const authServerConfig = serverConfig[serverConfig.serviceServerName['auth']];
export default class Util {
    static hideSaveButton(i) {
        // document.getElementById(`salesorg_inputbox${i}`).disabled = true
        // document.getElementById(`distribution_channel_inputbox${i}`).disabled = true
        // document.getElementById(`division_inputbox${i}`).disabled = true
        document.getElementById(`plant_name_inputbox${i}`).disabled = true;

        document.getElementById(`editbutton${i}`).style.visibility = 'visible';
        document.getElementById(`actionbutton1${i}`).style.visibility = 'hidden';
        document.getElementById(`actionbutton2${i}`).style.visibility = 'hidden';
    }
    static enablEditButton(i) {
        // document.getElementById(`salesorg_inputbox${i}`).disabled = false
        // document.getElementById(`distribution_channel_inputbox${i}`).disabled = false
        // document.getElementById(`division_inputbox${i}`).disabled = false
        document.getElementById(`plant_name_inputbox${i}`).disabled = false;

        document.getElementById(`actionbutton1${i}`).style.visibility = 'visible';
        document.getElementById(`actionbutton2${i}`).style.visibility = 'visible';
        document.getElementById(`editbutton${i}`).style.visibility = 'hidden';
    }
    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    static validatePassword(password) {
        var re = /^(?=.*[a-zA-Z])(?=.*[0-9])[\w~@#$%^&*+=`|{}:;!.?\"()\[\]-]{6,}$/;
        // /(?=^.{8,}$)(?=.*\d)(?=.*[!@#$%^&*]+)(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
        return re.test(password);
    }
    static getFileName(url) {
        return url ? url.split('/').pop() : null;
    }
    static uid() {
        return Math.random().toString(34).slice(2);
    }
    static filterArrayOfObjects(arr, searchKey, searchVal) {
        let filteredArray = arr.filter((itm) => itm[searchKey] === searchVal);
        return filteredArray;
    }
    static formatErrorMessages(arr) {
        arr.map((error) => error.message);
    }

    static convertDataTimeToIST(arr) {
        return {
            from: `${arr[0]}+05:30`,
            to: `${arr[1]}+05:30`,
        };
    }

    /* Function to validate the order items list */
    static checkItemList = (orderItemList, originalData, tolerance, isAutoOrder, type = '') => {
        let itmFlag = true;
        let errormessage = [];
        orderItemList.forEach((item, index) => {
            const { code, description = '', quantity = '' } = item;
            if (code === '') {
                itmFlag = false;
                errormessage.push(`Item ${index + 1}: Item should not be blank`);
            } else if (type === 'ADD_TABLE_ROW' && (quantity === '' || quantity < 0)) {
                itmFlag = false;
                errormessage.push(`${description}: Quantity should not be blank or zero and no decimal allowed`);
            } else if (type !== 'ADD_TABLE_ROW' && (quantity === '' || quantity <= 0)) {
                itmFlag = false;
                errormessage.push(`${description}: Quantity should not be blank or zero and no decimal allowed`);
            } else if (quantity % 1 !== 0) {
                itmFlag = false;
                errormessage.push(`${description}: No decimal allowed in item quantity`);
            }
            /**Tolerance is being checked in AutoOrderMaterialTable page */
        });
        return {
            itmFlag,
            errormessage: errormessage.join(' | '),
        };
    };

    static formatDate = (date, format = 'YYYY-MM-DD') => {
        if (!date) return null;
        return moment(date, format).format('DD-MMM-YYYY');
    };
    static formatTime = (data) => {
        if (!data) return null;
        return moment(data).format('hh:mm A');
    };

    static formatDateTime = (data, format = 'YYYY-MM-DD') => {
        if (!data) return null;
        if (data.length === 10) {
            return Util.formatDate(data, format);
        } else {
            return Util.formatDate(data, format) + ' ' + Util.formatTime(data);
        }
    };

    static diffOfDates = (date1, date2) => {
        if (!date1 || !date2) return null;
        return Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24));
    };

    static createUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            var r = (Math.random() * 16) | 0,
                v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    static checkPDPDay = (pdpDay, referenceDate, weeklyOrderWindow, fortnightlyOrderWindow, orderPlacementTime, weeklyOff) => {
        // todo: mandatory holiday cases left
        if (!pdpDay || !weeklyOrderWindow || !fortnightlyOrderWindow || !orderPlacementTime || !weeklyOff) return { allowedToOrder: false }; // todo: can be changed
        const date = new Date();
        const today = date.getDay();
        let errorMessage = null;
        orderPlacementTime = parseInt(orderPlacementTime);

        const dayOfWeek = (day) => {
            return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].indexOf(day);
        };

        /*if (weeklyOff !== 'NONE' && today === dayOfWeek(weeklyOff)) {
            isWeeklyOff = true; // if today is weekly off
            errorMessage = 'You cannot place purchase orders as today is a weekly off.';
        }*/

        const now = date.getHours();
        const pdpType = pdpDay[0] + pdpDay[1];
        pdpDay = pdpDay.slice(2);
        if ((pdpType !== 'WE' && pdpType !== 'FN') || !pdpDay) return { allowedToOrder: false };

        const getWeekOfYear = (date) => {
            const oneJan = new Date(date.getFullYear(), 0, 1);
            const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
            const result = Math.ceil(((oneJan.getDay() === 0 ? 7 : oneJan.getDay()) + numberOfDays) / 7);
            return result;
        };

        let orderPlacementBandwidth = null;
        let orderPlacementWindow = null;
        if (pdpType === 'WE') {
            orderPlacementWindow = parseInt(weeklyOrderWindow);
        } else {
            orderPlacementWindow = parseInt(fortnightlyOrderWindow);
        }
        orderPlacementBandwidth = Math.floor((orderPlacementTime + orderPlacementWindow) / 24);
        if ((orderPlacementTime + orderPlacementWindow) % 24 === 0) orderPlacementBandwidth--;
        let allowedToOrder = false,
            orderStartDate = null,
            orderEndDate = null,
            allOrderDates = [];
        const days = {
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
            SU: 0,
        };

        const checkOrderAllowed = (day) => {
            let orderDayStart = day - 1 - orderPlacementBandwidth;
            let orderDayEnd = day - 1;
            if (orderDayStart < 0) orderDayStart += 7;
            if (orderDayEnd < 0) orderDayEnd += 7;
            if (weeklyOff !== 'NONE') {
                let weeklyOffDay = dayOfWeek(weeklyOff);
                if (orderDayStart === weeklyOffDay) {
                    orderDayStart--;
                } else if (orderDayEnd === weeklyOffDay) {
                    orderDayStart--;
                    orderDayEnd--;
                } else {
                    if (orderDayEnd < orderDayStart) {
                        if ((orderDayStart < weeklyOffDay && weeklyOffDay < 7) || (weeklyOffDay >= 0 && orderDayEnd > weeklyOffDay)) {
                            orderDayStart--;
                            orderDayEnd--;
                        }
                    } else {
                        if (orderDayStart < weeklyOffDay && orderDayEnd > weeklyOffDay) {
                            orderDayStart--;
                            orderDayEnd--;
                        }
                    }
                }
            }
            if (orderDayStart < 0) orderDayStart += 7;
            if (orderDayEnd < 0) orderDayEnd += 7;

            const setStartEndDates = (numberOfDays) => {
                if (today > orderDayStart) {
                    if (today > orderDayEnd) {
                        orderStartDate.setDate(orderStartDate.getDate() + (numberOfDays - today + orderDayStart));
                    } else {
                        orderStartDate.setDate(orderStartDate.getDate() - (today - orderDayStart));
                    }
                } else if (today < orderDayStart) {
                    if (orderDayEnd < orderDayStart && today <= orderDayEnd) {
                        orderStartDate.setDate(orderStartDate.getDate() - (numberOfDays - orderDayStart + today));
                    } else {
                        orderStartDate.setDate(orderStartDate.getDate() + (orderDayStart - today));
                    }
                }

                if (today > orderDayEnd) {
                    if (orderDayEnd < orderDayStart || today > orderDayStart) {
                        orderEndDate.setDate(orderEndDate.getDate() + (numberOfDays - today + orderDayEnd));
                    } else {
                        orderEndDate.setDate(orderEndDate.getDate() - (today - orderDayEnd));
                    }
                } else if (today < orderDayEnd) {
                    if (orderDayEnd < orderDayStart) {
                        if (today < orderDayStart) {
                            orderEndDate.setDate(orderEndDate.getDate() + (orderDayEnd - today));
                        } else {
                            orderEndDate.setDate(orderEndDate.getDate() + (numberOfDays - today + orderDayEnd));
                        }
                    } else {
                        orderEndDate.setDate(orderEndDate.getDate() + (orderDayEnd - today));
                    }
                }
            };

            orderStartDate = new Date();
            orderEndDate = new Date();

            if (pdpType === 'FN') {
                if (!referenceDate) return { allowedToOrder: false };
                referenceDate = new Date(referenceDate);
                const referenceWeek = getWeekOfYear(referenceDate);
                const thisWeek = getWeekOfYear(date);
                if (Math.abs(thisWeek - referenceWeek) % 2 !== 0) {
                    if (!pdpDay.includes('MO') && !pdpDay.includes('TU')) {
                        orderStartDate.setDate(orderStartDate.getDate() + (7 - today + orderDayStart));
                        orderEndDate.setDate(orderEndDate.getDate() + (7 - today + orderDayEnd));
                        return {
                            allowedToOrder: false,
                            orderStartDate,
                            orderEndDate,
                        };
                    } else {
                        // handle FNMO & FNTU cases
                        setStartEndDates(7);
                        if (!((pdpDay.includes('MO') && (today === 5 || today === 6)) || (pdpDay.includes('TU') && today === 6))) {
                            return {
                                allowedToOrder: false,
                                orderStartDate,
                                orderEndDate,
                            };
                        }
                    }
                } else {
                    if (pdpDay.includes('MO') || pdpDay.includes('TU')) {
                        if (referenceDate.getFullYear() === date.getFullYear() && referenceDate.getMonth() === date.getMonth() && thisWeek === referenceWeek) {
                            orderStartDate.setDate(orderStartDate.getDate() + (7 - today + orderDayStart));
                            if (orderDayEnd < orderDayStart) {
                                orderEndDate.setDate(orderEndDate.getDate() + (14 - today + orderDayEnd));
                            } else {
                                orderEndDate.setDate(orderEndDate.getDate() + (7 - today + orderDayEnd));
                            }
                            return {
                                allowedToOrder: false,
                                orderStartDate,
                                orderEndDate,
                            };
                        }

                        orderStartDate.setDate(orderStartDate.getDate() + (7 - today + orderDayStart));
                        if (orderDayEnd < orderDayStart) {
                            orderEndDate.setDate(orderEndDate.getDate() + (14 - today + orderDayEnd));
                        } else {
                            orderEndDate.setDate(orderEndDate.getDate() + (7 - today + orderDayEnd));
                        }
                        if ((pdpDay.includes('MO') && (today === 5 || today === 6)) || (pdpDay.includes('TU') && today === 6)) {
                            return {
                                allowedToOrder: false,
                                orderStartDate,
                                orderEndDate,
                            };
                        }
                    } else {
                        if (referenceDate.getFullYear() === date.getFullYear() && referenceDate.getMonth() === date.getMonth() && thisWeek === referenceWeek) {
                            orderStartDate.setDate(orderStartDate.getDate() + (14 - today + orderDayStart));
                            orderEndDate.setDate(orderEndDate.getDate() + (14 - today + orderDayEnd));
                            return {
                                allowedToOrder: false,
                                orderStartDate,
                                orderEndDate,
                            };
                        }
                        setStartEndDates(14);
                    }
                }
            } else if (pdpType === 'WE') {
                setStartEndDates(7);
            }

            let endTime = (orderPlacementTime + orderPlacementWindow) % 24;
            if (endTime === 0) endTime = 24;
            if (
                (orderDayStart < orderDayEnd && today >= orderDayStart && today <= orderDayEnd) ||
                (orderDayStart > orderDayEnd && ((today >= orderDayStart && today <= 6) || (today <= orderDayEnd && today >= 0)))
            ) {
                if (today === orderDayStart) {
                    if (now >= orderPlacementTime) {
                        allowedToOrder = true;
                    }
                } else if (today === orderDayEnd) {
                    if (now < endTime) {
                        allowedToOrder = true;
                    }
                } else {
                    allowedToOrder = true;
                }
            } else if (orderDayStart === orderDayEnd) {
                // case of same day
                if (now >= orderPlacementTime && now < endTime) {
                    allowedToOrder = true;
                }
            }
            allOrderDates.push({
                diff: orderDayStart - today < 0 ? orderDayStart - today + 7 : orderDayStart - today,
                orderStartDate,
                orderEndDate,
            });
        };

        const convert24To12HourFormat = (hours, minutes = '00') => {
            if (hours > 24) return false;
            else if (hours === 24) return `12:${minutes} AM`;
            else if (hours === 12) return `12:${minutes} PM`;
            return hours > 12 ? (hours - 12 <= 9 ? '0' : '') + (hours - 12) + `:${minutes} PM` : (hours <= 9 ? '0' : '') + hours + `:${minutes} AM`;
        };
        const getOrderStartingClosingTime = (startingHour, orderWindow) => {
            startingHour = parseInt(startingHour);
            orderWindow = parseInt(orderWindow);
            return {
                orderStartTime: convert24To12HourFormat(startingHour),
                orderEndTime: convert24To12HourFormat((startingHour + orderWindow - 1) % 24, 59),
            };
        };

        const { orderStartTime, orderEndTime } = getOrderStartingClosingTime(orderPlacementTime, pdpType === 'WE' ? weeklyOrderWindow : fortnightlyOrderWindow);

        for (let day of Object.keys(days)) {
            if (pdpDay.includes(day)) {
                checkOrderAllowed(days[day]);
                if (allowedToOrder)
                    return {
                        allowedToOrder,
                        orderStartDate,
                        orderEndDate,
                        orderStartTime,
                        orderEndTime,
                    };
            }
        }

        if (allOrderDates.length) {
            const earliestOrderDates = allOrderDates.reduce((prev, curr) => (prev.diff < curr.diff ? prev : curr));
            return {
                allowedToOrder,
                orderStartDate: earliestOrderDates.orderStartDate,
                orderEndDate: earliestOrderDates.orderEndDate,
                orderStartTime,
                orderEndTime,
                errorMessage,
            };
        }
        return {
            allowedToOrder,
            orderStartDate,
            orderEndDate,
            orderStartTime,
            orderEndTime,
            errorMessage,
        };
    };

    /*
     * PDP logic changed SOPE-453, SOPE-458 and SOPE-1748
     * WeeklyPDP: WEMOWEFR, WEMO
     * FortnightlyPDP: FNSA, FNTU
     * all time calculations to be made in 24Hr  format, finally displayed in 12Hr format
     * region wise PDP exception window to be considered
     *
     * ***SAME CODE IS MAINTAINED IN `sales-portal-order\app\helper\pdp.ts`, ANY CHANGES HERE SHOULD BE REFLECTED THERE***
     */
    static pdpFrequencyCounter = (pdp) => {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        return days.filter((day) => pdp.includes(day)).length;
    };

    static checkPdpDay = (pdpDay, referenceDate, today = new Date()) => {
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

        let result = {};
        let allUpcomingOrderDates = [];
        let allAllowedOrderDates = [];
        const days = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        const pdpFrequency = this.pdpFrequencyCounter(pdpDay);
        for (let day of Object.keys(days)) {
            if (pdpDay.includes(day)) {
                if (pdpType === 'WE') {
                    result = Util.checkOrderAllowed_WE_PDP(day, today, pdpFrequency);
                } else {
                    result = Util.checkOrderAllowed_FN_PDP(day, referenceDate, today, pdpFrequency);
                    // result = Util.checkOrderAllowed_FN_PDP_Optimized(day, referenceDate, today)
                }
                if (result?.allowedToOrder) {
                    allAllowedOrderDates.push(result);
                } else {
                    allUpcomingOrderDates.push(result);
                }
            }
        }
        if (allAllowedOrderDates.length) {
            const earliestOrderDates = allAllowedOrderDates.reduce((prev, curr) => (prev.orderStartDate < curr.orderStartDate ? prev : curr));
            return {
                allowedToOrder: earliestOrderDates.allowedToOrder,
                orderStartDate: earliestOrderDates.orderStartDate,
                orderEndDate: earliestOrderDates.orderEndDate,
                orderStartTime: Util.formatTime(earliestOrderDates.orderStartDate),
                orderEndTime: Util.formatTime(earliestOrderDates.orderEndDate),
                pdpDate: earliestOrderDates.pdpDate,
            };
        }
        if (allUpcomingOrderDates.length) {
            const earliestOrderDates = allUpcomingOrderDates.reduce((prev, curr) => (prev.orderStartDate < curr.orderStartDate ? prev : curr));
            return {
                allowedToOrder: earliestOrderDates.allowedToOrder,
                orderStartDate: earliestOrderDates.orderStartDate,
                orderEndDate: earliestOrderDates.orderEndDate,
                orderStartTime: Util.formatTime(earliestOrderDates.orderStartDate),
                orderEndTime: Util.formatTime(earliestOrderDates.orderEndDate),
                pdpDate: earliestOrderDates.pdpDate,
                errorMessage: referenceDate && pdpType === 'FN' ? `PDP: ${pdpType}${pdpDay}, Reference Date : ${referenceDate}` : `PDP: ${pdpType}${pdpDay}`,
            };
        }
        return { allowedToOrder: false };
    };

    /*
     * This method will do all the necessary calculation and will return an object with true/false and starting and ending date time
     */
    static checkOrderAllowed_WE_PDP = (day, today, pdpFrequency) => {
        /*
         * receiving one PDP day
         * retrieve the applicable orderWindow and orderPlacementEndTime of that PDP day and extract hours and minutes
         * calculate the start and end day and time
         * check if today belongs within that time window, yes -> allowOrder = true, else false
         */
        let { orderWindow, orderPlacementEndTime, orderWindowException, orderPlacementEndTimeException } = appConfig.pdp_weekly[day];

        if (pdpFrequency <= appConfig.pdp_weekly.THRESHOLD_FREQUENCY) {
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
            pdpDate = new Date(orderEndDate); //PDP date on which the order to be delivered
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

        const orderStartTime = Util.formatTime(orderStartDate);
        const orderEndTime = Util.formatTime(orderEndDate);

        let allowedToOrder = false;
        //check if today is within the orderWindow
        if (orderStartDate <= today && today <= orderEndDate) {
            allowedToOrder = true;
        }
        return {
            allowedToOrder,
            orderStartDate,
            orderEndDate,
            orderStartTime,
            orderEndTime,
            pdpDate,
        };
    };

    static checkOrderAllowed_FN_PDP = (day, referenceDate, today, pdpFrequency) => {
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
        let { orderWindow, orderPlacementEndTime, orderWindowException, orderPlacementEndTimeException } = appConfig.pdp_fortnightly[day];

        if (pdpFrequency <= appConfig.pdp_fortnightly.THRESHOLD_FREQUENCY) {
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
            pdpDate = new Date(orderEndDate); //PDP date on which order to be delivered
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

        const orderStartTime = Util.formatTime(orderStartDate);
        const orderEndTime = Util.formatTime(orderEndDate);

        let allowedToOrder = false;
        //check if today is within the orderWindow
        if (orderStartDate <= today && today <= orderEndDate) {
            allowedToOrder = true;
        }
        return {
            allowedToOrder,
            orderStartDate,
            orderEndDate,
            orderStartTime,
            orderEndTime,
            pdpDate,
        };
    };

    //this method was POC to optimize the FN PDP logic, but it failed for some cases
    static checkOrderAllowed_FN_PDP_Optimized(day, referenceDate, today) {
        /**
         * TODO: Changes: Years 2020, 2026, 2048 have 53 weeks, hence after completing these years there will be a switch between even and odd week numbers. Hence the above logic will fail. We need to consider this scenario.
         */
        const refDate = new Date(referenceDate.substring(0, 4), Number(referenceDate.substring(4, 6)) - 1, referenceDate.substring(6));
        const isoWeekOfYearRefDate = moment(refDate, 'YYYYMMDD').isoWeek();

        const days = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
        const pdpWeekDay = days[day];
        const todayWeekDay = today.getDay();
        const todayWeekYear = moment(today, 'YYYYMMDD').isoWeek();
        let weeks = 0;

        if (todayWeekYear % 2 != isoWeekOfYearRefDate % 2) {
            weeks = 7;
        } else {
            weeks = 14;
            if (today.getMonth() == 0) {
                weeks = 7;
            }
        }
        //Upcoming PDP day
        today.setDate(today.getDate() + (pdpWeekDay - todayWeekDay + weeks));

        //calculation of the order window
        const { orderWindow, orderPlacementEndTime } = appConfig.pdp_fortnightly[day];
        const orderWindowHour = Number(orderWindow.split(':')[0]) | 0;
        const orderWindowMinutes = (orderWindow.charAt(0) === '-' ? 0 - Number(orderWindow.split(':')[0]) : Number(orderWindow.split(':')[1])) | 0;
        const orderPlacementEndTimeHour = Number(orderPlacementEndTime.split(':')[0]) | 0;
        const orderPlacementEndTimeMinutes =
            (orderPlacementEndTime.charAt(0) === '-' ? 0 - Number(orderPlacementEndTime.split(':')[1]) : Number(orderPlacementEndTime.split(':')[1])) | 0;

        const orderEndDate = new Date(today);
        orderEndDate.setHours(0);
        orderEndDate.setMinutes(0);
        orderEndDate.setSeconds(0);
        orderEndDate.setMilliseconds(0);
        orderEndDate.setHours(orderEndDate.getHours() + orderPlacementEndTimeHour);
        orderEndDate.setMinutes(orderEndDate.getMinutes() + orderPlacementEndTimeMinutes);
        //making orderStartDate = orderEndDate
        const orderStartDate = new Date(orderEndDate);
        orderStartDate.setHours(orderEndDate.getHours() - orderWindowHour);
        orderStartDate.setMinutes(orderStartDate.getMinutes() - orderWindowMinutes);

        const orderStartTime = Util.formatTime(orderStartDate);
        const orderEndTime = Util.formatTime(orderEndDate);

        let allowedToOrder = false;
        //check if today is within the orderWindow
        if (orderStartDate <= today && today <= orderEndDate) {
            allowedToOrder = true;
        }
        return {
            allowedToOrder,
            orderStartDate,
            orderEndDate,
            orderStartTime,
            orderEndTime,
        };
    }

    static applicableMonth = (index = '') => {
        // index = "next" => will provide next month, else the current month
        // O/P in "YYYYMM" format
        const date = new Date();
        date.setDate(1);
        if (index === 'next') {
            date.setMonth(date.getMonth() + 1);
        } else if (index === 'next-next') {
            date.setMonth(date.getMonth() + 2);
        }
        const month = Number(date.getMonth()) + 1;
        return `${date.getFullYear()}${month.toString().padStart(2, '0')}`;
    };

    static applicableYearMonths = (updated_on) => {
        if (!updated_on) {
            return null;
        }
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        let updatedOn = updated_on;
        const yearMonthRegex = /^(2\d{3}(0[1-9]|1[0-2]))$/;
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const shortDateRegex = /^(\d{2})-(\w{3})-(\d{2})$/;

        if (yearMonthRegex.test(updated_on)) {
            updatedOn = '01/' + updated_on.substring(4) + '/' + updated_on.substring(0, 4);
        } else if (dateRegex.test(updated_on)) {
            updatedOn = updated_on.replace(dateRegex, '$1/$2/$3');
        } else if (shortDateRegex.test(updated_on)) {
            const monthIndex = monthNames.findIndex((m) => m.substring(0, 3) === updated_on.substring(3, 6));
            updatedOn = updated_on.replace(shortDateRegex, `01/${(monthIndex + 1).toString().padStart(2, '0')}/20$3`);
        }

        const [day, month, year] = updatedOn.split('/');
        const lastUpdatedOn = new Date(`${year}-${month}-${day}`);
        const applicableMonthsCode = [];
        const applicableMonthNames = [];

        for (let i = 4; i >= 2; i--) {
            const date = new Date(lastUpdatedOn.getFullYear(), lastUpdatedOn.getMonth() - i, 1);
            const yearMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            applicableMonthsCode.push(yearMonth);
            applicableMonthNames.push(monthNames[date.getMonth()]);
        }
        applicableMonthNames.push(monthNames[lastUpdatedOn.getMonth()]);
        applicableMonthsCode.push(`${lastUpdatedOn.getFullYear()}${(lastUpdatedOn.getMonth() + 1).toString().padStart(2, '0')}`);
        return {
            monthYear: applicableMonthsCode,
            monthNames: applicableMonthNames,
        };
    };
    static downloadExcelData(BinaryData) {
        return new Promise((resolve, reject) => {
            if (BinaryData) {
                const downloadURL = window.URL.createObjectURL(
                    new Blob([BinaryData], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    }),
                );
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadURL;
                downloadLink.setAttribute('download', `mdmData.csv`);
                document.body.appendChild(downloadLink);
                downloadLink.dispatchEvent(
                    new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    }),
                );
                resolve(true);
            } else {
                reject(false);
            }
        });
    }
    static readExcel(e, setJsonData, setFileName) {
        const fileUploaded = e.target.files[0];
        if (fileUploaded) {
            setFileName(fileUploaded.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const workbook = XLSX.read(e.target.result, {
                    type: 'binary',
                });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const JSONdata = XLSX.utils.sheet_to_json(worksheet);
                setJsonData(JSONdata);
            };
            reader.readAsBinaryString(fileUploaded);
        }
    }
    static notificationSender = (message, description, success, time = 5) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: time,
                className: 'notification-success',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: time,
                className: 'notification-error',
            });
        }
    };

    static openCenteredNotification(type, message, description) {
        notification[type]({
            message: message,
            description: description,
            duration: 0,
        });
    }

    static downloadExcelFile(data, fileName = 'mdm-data') {
        return new Promise((resolve, reject) => {
            if (!data) reject(false);
            try {
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

                const workbookOut = XLSX.write(workbook, {
                    bookType: 'xlsx',
                    type: 'binary',
                });
                const buffer = new ArrayBuffer(workbookOut.length);
                const view = new Uint8Array(buffer);
                for (let i = 0; i < workbookOut.length; i++) {
                    view[i] = workbookOut.charCodeAt(i) & 0xff;
                }

                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
                const downloadURL = window.URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadURL;
                downloadLink.setAttribute('download', `${fileName}.xlsx`);
                document.body.appendChild(downloadLink);
                downloadLink.dispatchEvent(
                    new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    }),
                );
                downloadLink.body.removeChild(downloadLink);
                resolve(true);
            } catch (error) {
                console.log('Error downloading file(downloadExcelFile):', error);
                reject(false);
            }
        });
    }
    static CLdownloadExcelFile = async (data, fileName) => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

            // Generate file blob
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fileName}.xlsx`);

            // Append, click, and clean up
            document.body.appendChild(link);
            link.click();

            // Use setTimeout to ensure proper cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

            return true;
        } catch (error) {
            console.error('Excel download error:', error);
            return false;
        }
    };

    static toTitleCase(str) {
        return str.toLowerCase().replace(/\b\w/g, function (match) {
            return match.toUpperCase();
        });
    }

    static removeLeadingZeros(value) {
        /**
         * Removes leading zeros from a string
         * "00212" -> "212"
         * "00" -> ""
         * @param {string | number} value
         * @returns {string}
         */
        return value.toString().replace(/^0+/, '');
    }

    static getPdpDetails(distributor_details, appSettings) {
        const today = new Date();
        let activeArr = [];
        let activeDiv = new Set();
        let inactiveArr = [];
        let inactiveDiv = new Set();
        let upcomingPdpDay = null;
        const isActive = appSettings?.find((o) => o.key === appConfig.pdp_restriction.key)?.value === appConfig.pdp_restriction.enable_value;
        distributor_details.distributor_sales_details?.forEach((item, index) => {
            //using set to remove duplicates
            if ((item?.distribution_channel === 10 || item?.distribution_channel === 90) && item.division != null) {
                if (distributor_details.enable_pdp === true && isActive && item.pdp_day !== null && item.pdp_day !== undefined && item.pdp_day !== '') {
                    const { orderStartDate, orderEndDate } = this.checkPdpDay(item.pdp_day, item.reference_date);

                    if (moment(today).isBetween(orderStartDate, orderEndDate, undefined, '()')) {
                        upcomingPdpDay = upcomingPdpDay === null || upcomingPdpDay > orderStartDate ? today : upcomingPdpDay;
                        if (!activeDiv.has(item.division)) {
                            activeArr.push({ index, ...item });
                            activeDiv.add(item.division);
                        }
                    } else {
                        upcomingPdpDay = upcomingPdpDay === null || upcomingPdpDay > orderStartDate ? new Date(orderStartDate) : upcomingPdpDay;
                        if (!inactiveDiv.has(item.division)) {
                            inactiveArr.push({ index, ...item });
                            inactiveDiv.add(item.division);
                        }
                    }
                } else {
                    if (!activeDiv.has(item.division)) {
                        activeArr.push({ index, ...item });
                        activeDiv.add(item.division);
                    }
                }
            }
        });
        activeArr = activeArr?.sort((a, b) => a.index - b.index);
        inactiveArr = inactiveArr?.sort((a, b) => a.index - b.index);
        return { activeArr, inactiveArr, upcomingPdpDay };
    }

    static encryptData(data) {
        const encryptedData = AES.encrypt(data, authServerConfig.encryptionKey).toString();
        return encryptedData;
    }

    static decryptData(data) {
        const decryptedData = AES.decrypt(data, authServerConfig.encryptionKey).toString(enc.Utf8);
        return decryptedData;
    }

    static activeSessionToAndFromTimestamp() {
        let currentDate = new Date();
        currentDate = String(moment(currentDate).format('YYYY-MM-DD HH:mm:ss'));
        let startDate = String(moment(currentDate).subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'));
        let fromDate = `${startDate}+05:30`;
        let toDate = `${currentDate}+05:30`;
        return { toDate, fromDate };
    }

    static formatUtcTime = function (date) {
        const dateTime = moment.utc(date, 'YYYY-MM-DD HH:mm:ss.SSS Z');
        return dateTime.format('hh:mm a');
    };

    static applicableMonthToMonthYearString(applicable_month) {
        const date = new Date(applicable_month?.substring(0, 4), +applicable_month?.substring(4, 7) - 1, 1);
        return `${date.toLocaleString('default', {
            month: 'long',
        })} ${date.getFullYear()}`;
    }
    static getRDDDateFlag(rddFromTime, rddToTime) {
        let currentTime = moment(new Date().toLocaleTimeString([], { hour12: false }), 'HH:mm');
        if (currentTime.isBetween(moment(rddFromTime, 'hh:mm'), moment(rddToTime, 'hh:mm'))) return true;
        return false;
    }

    static getDateAsMonthName(isoDate) {
        const dateObj = new Date(isoDate);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        const result = `${day}-${month}-${year}`;
        return result;
    }

    /**
     * Calculate the Levenshtein distance between two strings
     * @param {string} a - The first string
     * @param {string} b - The second string
     * @returns {number} - The Levenshtein distance
     */
    static levenshteinDistance(a, b) {
        const matrix = [];

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1, // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate the similarity score between two strings based on Levenshtein distance
     * @param {string} a - The first string
     * @param {string} b - The second string
     * @returns {number} - The similarity score (0 to 1)
     */
    static calculateSimilarity(a, b) {
        const distance = this.levenshteinDistance(a, b);
        const maxLength = Math.max(a.length, b.length);
        return (maxLength - distance) / maxLength;
    }

    static convertExcelToJson(file, allowedExtensions = ['xlsx', 'csv']) {
        return new Promise((resolve, reject) => {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                this.notificationSender('Error', 'Invalid file type', false);
                reject('Invalid file type');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const result = {};
                    workbook.SheetNames.forEach((sheetName) => {
                        const worksheet = workbook.Sheets[sheetName];
                        result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
                    });
                    resolve(result);
                    // this.notificationSender("Success",`${file.name} file uploaded successfully`, true);
                } catch (error) {
                    this.notificationSender('Error', `Error processing file: ${error.message}`, false);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                this.notificationSender('Success', `Error reading file: ${error.message}`, true);
                reject(error);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    static calculateTotalQuantity = (details, quantityKey, identifierKey) => {
        let totalQuantities = details.reduce((acc, detail) => {
            let quantity = parseFloat(detail[quantityKey]?.trim());
            if (acc[detail[identifierKey]]) {
                acc[detail[identifierKey]] += quantity;
            } else {
                acc[detail[identifierKey]] = quantity;
            }
            return acc;
        }, {});
        return totalQuantities;
    };

    static formatDayAndDate = (dateString) => {
        if (!dateString) return '';

        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        const formattedDate = moment(date).format('DD-MMM-YYYY');
        return `${formattedDate} (${dayName})`;
    };

    static convertDate = (dateString) => {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(5, 7);
        const day = dateString.substring(8, 10);
        return `${day}/${month}/${year}`;
    };

    static convertDateTime = (dateString) => {
        const formattedDateTime = moment(dateString, 'YYYYMMDDHHmmss').format('DD-MMM-YYYY HH:mm:ss');
        return formattedDateTime;
    };

    static convertUTCtoIST = (utc) => {
        const date = new Date(utc);

        // Format the date in IST using toLocaleString
        const istTime = new Date(
            date.toLocaleString('en-US', {
                timeZone: 'Asia/Kolkata',
                timeZoneName: 'short',
            }),
        );
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const day = String(istTime.getDate()).padStart(2, '0');
        let hours = istTime.getHours() % 12 || 12;

        return `${day}-${months[istTime.getMonth()]}-${istTime.getFullYear()} ${String(hours).padStart(2, '0')}:${String(istTime.getMinutes()).padStart(2, '0')} ${istTime.getHours() >= 12 ? 'PM' : 'AM'}`;
    };

    static formatDateTimeFromResponse = (dateString) => {
        if (!dateString) return '-';
        return moment(dateString).format('DD-MMM-YYYY HH:mm:ss');
    };

    static formatDateToCustomString = (date = null, applicableMonth = null) => {
        // Returns date in forecast_month format e.g : 01-Mar-24
        if (!date && !applicableMonth) {
            return null;
        }
        if (!date && applicableMonth) {
            date = new Date(parseInt(applicableMonth.substring(0, 4), 10), parseInt(applicableMonth.substring(4, 6), 10) - 1, 1);
        }
        const options = { month: 'short', year: '2-digit' };
        const formattedDate = date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
        return `01-${formattedDate}`;
    };

    static parseDurationToMilliseconds = (durationStr) => {
        if (!durationStr) return 0;
        const [days, hours, minutes, seconds] = durationStr.split(':').map(Number);
        return moment
            .duration({
                days,
                hours,
                minutes,
                seconds,
            })
            .asMilliseconds();
    };

    static calTimeDifference = (start, end, now = moment()) => {
        if (!end || !moment(end, 'DD.MM.YYYY HH:mm:ss', true).isValid()) {
            end = moment(now, 'DD.MM.YYYY HH:mm:ss');
        } else {
            end = moment(end, 'DD.MM.YYYY HH:mm:ss');
        }
        start = moment(start, 'DD.MM.YYYY HH:mm:ss');
        const duration = moment.duration(end.diff(start));
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        const formattedDuration = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        return formattedDuration;
    };
    static convertMinutesToHHMMSS = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.floor(minutes % 60);
        const seconds = Math.floor((minutes * 60) % 60);

        const formatTime = (time) => (time < 10 ? `0${time}` : time);

        return `${formatTime(hours)}:${formatTime(remainingMinutes)}:${formatTime(seconds)}`;
    };

    static fetchMonths(date, delta = 3, offset = 0) {
        /*
      INPUT : '202501' or '23/01/2025' or '01-Jan-25'
      OUTPUT : { monthYear: ['202501', '202412', '202411'], monthNames: ['January', 'December', 'November'] }
    */
        if (!date) {
            return null;
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Parse the input date
        const yearMonthRegex = /^(2\d{3}(0[1-9]|1[0-2]))$/;
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const shortDateRegex = /^(\d{2})-(\w{3})-(\d{2})$/;

        let parsedDate;
        if (yearMonthRegex.test(date)) {
            parsedDate = moment(date, 'YYYYMM');
        } else if (dateRegex.test(date)) {
            parsedDate = moment(date, 'DD/MM/YYYY');
        } else if (shortDateRegex.test(date)) {
            parsedDate = moment(date, 'DD-MMM-YY');
        } else {
            return null; // Invalid date format
        }

        const monthYear = [];
        const monthNamesResult = [];
        const yearMonth = [];

        // Generate the months based on the delta
        for (let i = offset; i < delta + offset; i++) {
            const currentMonth = parsedDate.clone().subtract(i, 'months');
            monthYear.push(currentMonth.format('YYYYMM'));
            yearMonth.push(currentMonth.format('YYYY-MM'));
            monthNamesResult.push(monthNames[currentMonth.month()]);
        }

        return {
            monthYear: monthYear.reverse(),
            monthNames: monthNamesResult.reverse(),
            yearMonth: yearMonth.reverse(),
        };
    }

    static formatExpiryDate = (date) => {
        if (!date) return null;
        return moment(date).format('YYYY-MM-DD');
    };

    static formatDatesArray = (dates, format = 'YYYY-MM-DD') => {
        if (!dates || !Array.isArray(dates)) return '-';
        return dates
            .map((date) => {
                const dateObj = new Date(date);
                return `${Util.formatDate(dateObj, format)} ${Util.formatTime(dateObj)}`;
            })
            .join(',\n');
    };

    static formatRDDDate = (dateString) => {
        if (!dateString) return '';
        if (dateString.includes('.')) return dateString;

        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${day}.${month}.${year}`;
    };

    // static convertDateTimeToEndOfDay(inputDateTimeStr) {
    //   /**
    //    * Used to handle 5:30 hour gap
    //    * Converts an ISO 8601 datetime string to DD/MM/YYYY 23:59.
    //    * Handles 'Z' for UTC and other timezone offsets.
    //    * @param {string} inputDateTimeStr The input ISO 8601 datetime string.
    //    * @returns {string|null} The formatted datetime string or null if invalid input.
    //    */
    //   try {
    //     let inputDateTime;
    //   // Handle 'Z' and timezone offsets
    //   if (inputDateTimeStr.endsWith('Z')) {
    //     inputDateTimeStr = inputDateTimeStr.slice(0, -1) + '+00:00';
    //   }
    //   inputDateTime = new Date(inputDateTimeStr);
    //   const day = String(inputDateTime.getDate()).padStart(2, '0');
    //   const month = String(inputDateTime.getMonth() + 1).padStart(2, '0');
    //   const year = inputDateTime.getFullYear();
    //   let hours = inputDateTime.getHours();
    //   const minutes = String(inputDateTime.getMinutes()).padStart(2, '0');
    //   const ampm = hours >= 12 ? 'PM' : 'AM';
    //   hours = hours % 12;
    //   hours = hours ? hours : 12; // the hour '0' should be '12'

    //   return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;

    //   } catch (error) {
    //     console.error(`Invalid datetime string: ${inputDateTimeStr}`, error);
    //     return null;
    //   }
    // }

    static fetchDateDifference(startMonth, endMonth) {
        if (!startMonth || !endMonth) return 3; //L3M
        const formattedStartMonth = moment(startMonth);
        const formattedEndMonth = moment(endMonth);
        const delta = formattedEndMonth.diff(formattedStartMonth, 'month') + 1;
        return delta;
    }
}
