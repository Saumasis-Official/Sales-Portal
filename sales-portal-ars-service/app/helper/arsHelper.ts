import Helper from '.';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import logger from '../lib/logger';
import { ArsModel } from '../model/arsModel';
import moment from 'moment';

export const arsHelpers = {
    getCurrentWeek() {
        // Using lame approach due to time constraints need to change this to better code
        const today = new Date().getDate();
        if (today <= 7) {
            return 1;
        } else if (today >= 8 && today <= 14) {
            return 2;
        } else if (today >= 15 && today <= 21) {
            return 3;
        } else {
            return 4;
        }
    },

    generateWeekColumns(start: number, end: number, max: number | null = null) {
        const weekColumnsArray: Array<string> = [];
        end = Math.min(end, max ?? end);
        for (start; start <= end; start++) {
            weekColumnsArray.push(`_${start}`);
        }
        return weekColumnsArray;
    },

    calculateWeekDays(
        type: string,
        pdpArray: string[],
        pskuSN: number = 0,
        psku: Array<string>,
        applicableMonth: string,
        nextApplicableMonth: string,
        simulation_date: string | null = null,
    ) {
        const days = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        let date = new Date();
        if (simulation_date) {
            date = new Date(simulation_date);
        }
        const month = date.getMonth() + 1;
        const nextMonth = +nextApplicableMonth.substring(4, 6);
        const monthDays = new Date(date.getFullYear(), month, 0).getDate();
        const lastDay = new Date(date.getFullYear(), date.getMonth(), monthDays);
        lastDay.setHours(23, 59, 59, 999);

        let weekdaysArray: string[] = [],
            overFlowWeeks: string[] = [];
        const availablePdpDays =
            pdpArray?.map((ele) => {
                return days[ele];
            }) ?? [];
        let day,
            nextPdpDate: Date | null = null;

        for (let i = 1; i < 8; i++) {
            date.setDate(date.getDate() + 1);
            day = date.getDay();
            // if (day == 0) continue;
            if (availablePdpDays.includes(day)) {
                nextPdpDate = date;
                break;
            }
        }

        if (nextPdpDate && pskuSN) {
            nextPdpDate.setDate(nextPdpDate.getDate() + 1);
            const start = new Date(nextPdpDate);
            nextPdpDate.setDate(nextPdpDate.getDate() + pskuSN - 1);
            const end = nextPdpDate;
            const weekDaysByMonth = {};
            for (let i = start; i <= end; i.setDate(i.getDate() + 1)) {
                const m = i.getMonth() + 1;
                const d = i.getDate();
                if (weekDaysByMonth[m]) {
                    weekDaysByMonth[m].push(`_${d}`);
                } else {
                    weekDaysByMonth[m] = [`_${d}`];
                }
            }
            if (weekDaysByMonth[month]?.length) {
                weekdaysArray = weekDaysByMonth[month];
                if (weekDaysByMonth[nextMonth]?.length) {
                    overFlowWeeks = weekDaysByMonth[nextMonth];
                }
            } else if (weekDaysByMonth[nextMonth]?.length) {
                weekdaysArray = weekDaysByMonth[nextMonth];
                applicableMonth = nextApplicableMonth;
            }
        }
        const final = {};

        if (overFlowWeeks.length > 0) {
            Object.assign(final, { current: applicableMonth, next: nextApplicableMonth, [applicableMonth]: weekdaysArray, [nextApplicableMonth]: overFlowWeeks, psku: psku });
        } else {
            Object.assign(final, { current: applicableMonth, [applicableMonth]: weekdaysArray, psku: psku });
        }
        return final;
    },
    rekey(arrayOfObjects: any[] | null, key1: string, key2: string) {
        if (!arrayOfObjects) {
            return {};
        }
        const arr = {};
        for (const ele of arrayOfObjects) {
            arr[ele[key1]] = ele[key2];
        }
        return arr;
    },

    nestedRekey(arrayOfObjects: any[] | null, keys: string[], returnEntireObj: boolean = false) {
        /**
         * The nestedRekey function dynamically nests an array of objects based on a specified array of keys. It allows for flexible nesting and can return either the value of a specific key or the entire object at the end node.
         * Params:
         * arrayOfObjects (any[] | null): The array of objects to be nested. If null, the function returns an empty object.
         * keys (string[]): An array of keys that determine the nesting structure. The length of this array should be greater than 2.
         * returnEntireObj (boolean, optional): A flag to determine if the end node should be the entire object (true) or the value of the next key (false). Defaults to false.
         * Returns:
         * arr (object): The nested object based on the specified keys.
         */
        const arr = {};
        if (!arrayOfObjects || keys.length <= 2) {
            return arr;
        }

        const nestedRekeyHelper = (arr, obj, keys, depth) => {
            const key = obj[keys[depth]];
            if (depth === keys.length - 1 && returnEntireObj) {
                arr[key] = returnEntireObj ? obj : obj[keys[depth + 1]];
            } else if (depth === keys.length - 2 && !returnEntireObj) {
                arr[key] = obj[keys[depth + 1]];
            } else {
                if (!arr[key]) {
                    arr[key] = {};
                }
                nestedRekeyHelper(arr[key], obj, keys, depth + 1);
            }
        };

        for (const ele of arrayOfObjects) {
            nestedRekeyHelper(arr, ele, keys, 0);
        }
        return arr;
    },

    async groupUpData(distPdpDistributionArray: any, normCycleSafetyValues: any) {
        let temp = {},
            final = {};

        distPdpDistributionArray.map((ele: any) => {
            let sn = normCycleSafetyValues[ele.psku]?.['stock_norm'] ?? 0;
            let pdp = ele.pdp;
            let psku = ele.psku;
            let key = sn + '_' + pdp;

            if (Object.keys(final).length > 0 && Object.keys(final).includes(key)) {
                if (final[key].length > 0) {
                    final[key].push(psku);
                } else {
                    final[key] = [psku];
                }
            } else {
                final[key] = [psku];
            }
        });
        return final;
    },
    convertExcelToJson(file: any): any | null {
        const fileUploaded = file;
        const jsonData = {};
        if (fileUploaded) {
            try {
                if (!(fileUploaded.originalname.endsWith('.xls') || fileUploaded.originalname.endsWith('.xlsx') || fileUploaded.originalname.endsWith('.xlsb'))) {
                    throw new Error('Invalid file type');
                }
                // Validate the file path to prevent path manipulation
                if (!fileUploaded.path || fileUploaded.path.includes('..') || path.isAbsolute(fileUploaded.path)) {
                    logger.error('Invalid file path');
                    return null;
                }
                const buffer = fs.readFileSync(fileUploaded.path);
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                for (let sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet) || [];
                    jsonData[sheetName] = data;
                }

                return jsonData;
            } catch (error) {
                logger.error('CAUGHT: Error in ArsHelper -> convertExcelToJson: ', error);
                return null;
            } finally {
                fs.unlink(fileUploaded.path, (err) => {
                    if (err) {
                        logger.error('Error in ArsHelper -> convertExcelToJson ->  deleting file: ', err);
                    }
                });
            }
        }
        return null;
    },

    async getMonthYear(areaCode: string) {
        const lastForecastDate: any = (await ArsModel.fetchLastForecastDate(areaCode)) || ' ';
        const lastForecastMonth = lastForecastDate?.rows[0]?.forecast_month;
        return Helper.applicableYearMonths(lastForecastMonth);
    },

    getAreaCode: async (data: {}) => {
        return await ArsModel.getAreaCodeForDist(data['DB Code']);
    },
    appendSalesAllocationKeyToUploadedFile(data: any[], existingForecast: any[] | null) {
        const dbPSKUMap = new Map();
        existingForecast?.forEach((item) => {
            dbPSKUMap.set(item.sold_to_party + item.parent_sku, { key: item.key, class: item.class });
        });

        //map the key from existing forecast to the new uploaded forecast
        data?.forEach((item) => {
            const key = dbPSKUMap.get(item.sold_to_party + item.parent_sku) ?? 0;
            const pskuClass = item.by_allocation == 0 && +item.adjusted_forecast > 0 ? 'Q' : key.class;
            item.sales_allocation_key = key.key;
            item.updated_allocation = item.adjusted_forecast;
            item.pskuClass = pskuClass;
            delete item.adjusted_forecast;
        });
        return data;
    },

    phasingReadjustment(
        forecastConfig: {
            customer_group: string;
            fortnightly_week12: string;
            fortnightly_week34: string;
            weekly_week1: string;
            weekly_week2: string;
            weekly_week3: string;
            weekly_week4: string;
        }[],
    ) {
        /**
         * SOPE-1289:Adjustment to be done by ASM in between of the month
         * This function to be used to calculate the phasing readjustment(using pro rata logic),
         * which will be used when updating forecast_distribution for current month
         */
        const presentDate = new Date();
        const today = presentDate.getDate();
        const lastDate = new Date(presentDate.getFullYear(), presentDate.getMonth() + 1, 0).getDate();
        const weekStartEndWeekly = {
            weekly_week1: [1, 7, 7],
            weekly_week2: [8, 14, 7],
            weekly_week3: [15, 21, 7],
            weekly_week4: [22, lastDate, lastDate - 22 + 1],
        };
        const weekStartEndFortnightly = {
            fortnightly_week12: [1, 14, 14],
            fortnightly_week34: [15, lastDate, lastDate - 15 + 1],
        };
        /**
         * newTotal = 100 - (% of each elapsed week) - (current week% / (current week end - current week start + 1))* (today - current week start + 1)
         * adjusted phasing:
         * 1. for elapsed week it will remain the same
         * 2. for current week = ((current week%/ (current week end - current week start + 1)) * (current week end - today))/ newTotal
         * 3. for future weeks = (respective week% / newTotal) * 100
         */
        const calculateAdjustments = (config: any, weekStartEnd: { [key: string]: number[] }, today: number) => {
            let newTotal = 100;
            // Calculate new total
            Object.entries(weekStartEnd).forEach(([key, [start, end, length]]) => {
                if (+today > end) {
                    newTotal -= +config[key];
                } else if (today >= start && today <= end) {
                    newTotal -= (+config[key] / length) * (today - start + 1);
                }
            });
            // Adjust phasing
            Object.keys(weekStartEnd).forEach((key: string) => {
                const [start, end, length] = weekStartEnd[key];
                if (today >= start && today <= end) {
                    config[key] = ((+config[key] / length) * (end - today) * 100) / newTotal;
                } else if (today < start) {
                    config[key] = (+config[key] * 100) / newTotal;
                }
            });
        };

        forecastConfig.forEach((config) => {
            calculateAdjustments(config, weekStartEndWeekly, +today);
            calculateAdjustments(config, weekStartEndFortnightly, +today);
        });

        return forecastConfig;
    },

    convertAmountLakhOrCrore(amount: number | string): string {
        /**
         * This function will convert the amount to lakh or crore based on the amount
         * If the amount < 1000000 then it will return the amount as it is
         */
        let v: string = '';
        if (typeof amount === 'string') {
            amount = parseFloat(amount);
        }
        if (amount >= 10000000) {
            v = `${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            v = `${(amount / 100000).toFixed(2)} Lakh`;
        } else {
            v = `${amount}`;
        }
        return v;
    },

    evaluateApplicableMonthFromDate(date: Date): {
        applicableMonth: string;
        nextApplicableMonth: string;
    } {
        /**
         * Function accepts date and evaluates the applicableMonth and nextApplicableMonth
         */
        const currentMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        const nextMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        return {
            applicableMonth: currentMonth,
            nextApplicableMonth: nextMonth,
        };
    },

    getDynamicYearMonth(startMonth: string, endMonth: string, lastForecastMonth: string) {
        const formattedStartMonth = moment(startMonth);
        const formattedEndMonth = moment(endMonth);
        const delta = formattedEndMonth.diff(formattedStartMonth, 'month') + 1;
        return Helper.fetchMonths(formattedEndMonth.format('YYYYMM'), delta, 0, lastForecastMonth);
    },
};
