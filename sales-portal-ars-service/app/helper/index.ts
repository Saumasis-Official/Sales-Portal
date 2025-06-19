import logger from '../lib/logger';
import moment from 'moment';
import XLSX from 'xlsx';
import fs from 'fs';
require('dotenv').config();
const env = process.env.NODE_ENV;
import _ from 'lodash';
import { AES, enc } from 'crypto-js';
import { ArsModel } from '../model/arsModel';
import { CreateXlsxFileReturnType } from '../../enums/createXlsxFileReturnType';
const CryptoConfig = global['configuration'].crypto;

const Helper = {
    isCircular(data) {
        try {
            JSON.stringify(data);
        } catch (e) {
            return true;
        }
        return false;
    },
    isJsonObject(data) {
        try {
            JSON.stringify(data);
        } catch (e) {
            return false;
        }
        return true;
    },
    // tseHierarchyQuery(adminId: any) {
    //   try {
    //     return `(WITH RECURSIVE hierarchy AS
    //         (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id
    //             FROM sales_hierarchy_details
    //             WHERE user_id = '${adminId}'
    //             AND deleted = false
    //             UNION
    //             SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id
    //             FROM sales_hierarchy_details s
    //             INNER JOIN hierarchy h ON h.user_id = s.manager_id)
    //             SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)`;
    //   } catch (error) {
    //     logger.error('Error in tseHierarchyQuery: ', error);
    //     return '';
    //   }
    // },
    tseUpperHierarchyQueryByCode(tseCode: any) {
        try {
            return `
      WITH RECURSIVE hierarchy AS 
      (SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id,roles 
          FROM sales_hierarchy_details 
          WHERE STRING_TO_ARRAY(code, ',') && STRING_TO_ARRAY('${tseCode}', ',') 
          AND deleted = false 
          UNION 
          SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id, s.roles 
          FROM sales_hierarchy_details s 
          INNER JOIN hierarchy h ON h.manager_id = s.user_id
          WHERE deleted = false) 
      SELECT *, roles::_varchar FROM hierarchy`;
        } catch (error) {
            logger.error('Error in tseUpperHierarchyQueryByCode: ', error);
            return '';
        }
    },
    // asmHierarchyQuery(adminId: any) {
    //   try {
    //     return `
    //     (WITH RECURSIVE hierarchy AS
    //     (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id
    //     FROM sales_hierarchy_details WHERE user_id = '${adminId}'
    //     AND deleted = false ) SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)
    //     `;
    //   } catch (error) {
    //     logger.error('Error in asmHierarchyQuery: ', error);
    //     return '';
    //   }
    // },
    applicableMonth(index = '') {
        /**
         * index = '' => current month
         * index = 'next' => next month
         * index = 'next-next' => next to next month
         */
        /**
         * EDGE CASE(Handled): If date is 31st of the month and we add 1 month to it, it will return 3rd of the next month. So we are setting the date to 1st of the month
         */
        const date = new Date();
        date.setDate(1);
        if (index === 'next') {
            date.setMonth(date.getMonth() + 1);
        } else if (index === 'next-next') {
            date.setMonth(date.getMonth() + 2);
        }
        const month = Number(date.getMonth()) + 1;
        return `${date.getFullYear()}${month.toString().padStart(2, '0')}`;
    },
    daysInMonth(applicableMonth: string = '') {
        // Month in JavaScript is 0-indexed (January is 0, February is 1, etc),
        // but by using 0 as the day it will give us the last day of the prior
        // month. So passing in 1 as the month number will return the last day
        // of January, not February
        const month: number = Number(applicableMonth.substring(4, 6));
        const year: number = Number(applicableMonth.substring(0, 4));
        return new Date(year, month, 0).getDate();
    },

    /**
     * Helper method to create a xlsx file
     * @param dataArray - accept the data for each excel sheet in array
     * @param sheetNameArray - accept the sheet names,
     * @param filename - file name of the  to be created file, then it adds current date to the filename
     * @param prevDate - if true then it adds previous date to the filename
     * @returns an object {fileName: string, filePath: string}
     */
    createXlsxFile(
        dataArray: any[],
        sheetNameArray: string[],
        filename: string,
        prevDate: boolean = false,
        returnType: CreateXlsxFileReturnType = CreateXlsxFileReturnType.FILE_PATH,
    ) {
        /**Create new workbook and worksheet */
        const workbook = XLSX.utils.book_new();

        for (let i = 0; i < dataArray.length; i++) {
            const worksheet = XLSX.utils.json_to_sheet(dataArray[i], { header: Object.keys(dataArray[i][0]) });

            /**Add the worksheet to workbook */
            const sheetName = sheetNameArray[i] ? sheetNameArray[i] : `Sheet${i}`;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        /**Generate the excel file binary data */
        const excelData = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        /**Save the csv file to disk */
        const today = new Date();
        prevDate && today.setDate(today.getDate() - 1);
        const currentDate = today.toLocaleDateString('en-GB').split('/').join('-');
        //to know from which environment the report is generated
        if (env === 'dev' || env === 'qa') filename = `${filename}_${env}_${currentDate}.xlsx`;
        else filename = `${filename}_${currentDate}.xlsx`;
        const filepath = filename;

        if (returnType === CreateXlsxFileReturnType.BUFFER) {
            return { fileData: excelData, fileName: filename, filePath: filepath };
        } else {
            fs.writeFile(filepath, excelData, (err) => {
                if (err) {
                    logger.error('Error in helper -> index -> createCsvFile -> writeFile:', err);
                    return null;
                }
                logger.info('in helper -> index -> createCsvFile -> fs.writeFile: file saved successfully');
            });
            return { fileName: filename, filePath: filepath };
        }
    },
    feUrl() {
        return process.env.FE_URL;
    },
    ssSihCgs() {
        return process.env.SS_SIH_EMAIL_CGS;
    },

    /**to find the area code under DIST_ADMIN CLUSTER_MANAGER and ASM and RSM, it exclude the code of DIST_ADMIN, RSM */
    areaCodeHierarchyQuery(adminId: any) {
        return `(WITH RECURSIVE hierarchy AS
        (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id, roles
            FROM sales_hierarchy_details 
            WHERE user_id = '${adminId}' 
            AND deleted = false 
            UNION 
            SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id, s.roles
            FROM sales_hierarchy_details s 
            INNER JOIN hierarchy h ON h.user_id = s.manager_id
        )
        SELECT ac.code
        FROM area_codes ac
        WHERE ac.code in (
          SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) as area_code
          FROM hierarchy
          WHERE 'ASM' = ANY(roles)
        ) 
        ORDER BY ac.code)`;
    },

    /**
   * Helper method to get the applicable year and months based on the forecast updated date
   * This method is the replica of the same helper method in the frontend, hence it should be in sync with the frontend code
   * INPUT : '202501' or '23/01/2025 or '01-Jan-25'
   * OUTPUT : {
        monthYear: [202409, 202410, 202411, 202501],
        monthNames: [September, October, November, January],
      }
   */
    applicableYearMonths(updated_on) {
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
        const applicableMonthsCode: string[] = [];
        const applicableMonthNames: string[] = [];

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
    },

    formatDate(date) {
        let d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [day, month, year].join('/');
    },

    async isNextMonthForecastDumped(areaCode: string, lastForecastMonth: string | null = null): Promise<boolean> {
        /**
         * @param lastForecastMonth: string = '01-Jan-25'
         * @return boolean
         */
        let latestForecast = lastForecastMonth ?? (await ArsModel.fetchLastForecastDate(areaCode))?.rows[0]?.forecast_month;
        const latestForecastFormatted = moment(latestForecast, 'DD-MMM-YY');
        const currentYearMonth = moment().format('YYYYMM');
        return latestForecastFormatted.isAfter(currentYearMonth);
    },

    // /**
    //  * @param areaCode: string
    //  * @returns timeSqlStatement: string;
    //  * This method is used to write the sql statement to find the created on date of the forecast being used for ARS in the current month
    //  */
    async forecastTimeStatementForCurrentMonthForecast(areaCode: string, lastForecastMonth: string | null = null) {
        /**
         * find isNextMonthForecastDumped
         * Condition: if forecast has not been dumped in the current month (i.e. before 18th) then current month forecast = latest dumped forecast
         * else current month forecast is last dumped forecast in the previous month.
         */
        const isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(areaCode, lastForecastMonth);
        const today = new Date();
        const month = today.toLocaleString('default', { month: 'short' });
        const timeSqlStatement = isNextMonthForecastDumped
            ? `select max(created_on) from sales_allocation where asm_code = '${areaCode}' and forecast_month ilike '%${month}%'`
            : `SELECT max(created_on) FROM sales_allocation WHERE asm_code = '${areaCode}'`;
        logger.info(`Helper -> forecastTimeStatementForCurrentMonthForecast:  isNextMonthForecastDumped: ${isNextMonthForecastDumped}, timeSqlStatement: ${timeSqlStatement}`);
        return timeSqlStatement;
    },
    pgFormatDate(date) {
        /* Via http://stackoverflow.com/questions/3605214/javascript-add-leading-zeroes-to-date */
        function zeroPad(d) {
            return ('0' + d).slice(-2);
        }

        var parsed = new Date(date);
        if (typeof parsed === 'undefined' || parsed === null) return null;

        return (
            parsed.getUTCFullYear() +
            '-' +
            zeroPad(parsed.getMonth() + 1) +
            '-' +
            zeroPad(parsed.getDate()) +
            ' ' +
            zeroPad(parsed.getHours()) +
            ':' +
            zeroPad(parsed.getMinutes()) +
            ':' +
            zeroPad(parsed.getSeconds())
        );
    },

    getNormQuantity(snInDays: number = 0, ssInDays: number = 0, arr1: number[] = [], arr2: number[] = []) {
        const today = new Date();
        const snDaysArray: number[] = [];
        let csInDays = snInDays - ssInDays;
        const ssPresent: boolean = !!ssInDays;

        for (let i = 1; i <= snInDays; i++) {
            const day = new Date(today);
            day.setDate(today.getDate() + i);
            snDaysArray.push(day.getDate()); // You can format the date as needed
        }
        let arr = arr1;
        let snQty: number = 0;
        let ssQty: number = 0;
        let csQty: number = 0;
        for (let d of snDaysArray) {
            if (d === 1) arr = arr2;
            let q = arr[d - 1] ? arr[d - 1] : 0;
            snQty += q;
            if (ssInDays > 0) {
                ssQty += q;
                ssInDays--;
            }
            if (csInDays > 0) {
                csQty += q;
                csInDays--;
            }
        }
        if (ssPresent) return [snQty, ssQty, csQty];
        return [snQty];
    },

    generateSearchQuery(searchQuery: string) {
        logger.info(`inside generate search query method`);
        const match1 = searchQuery.match(/(\d+\.?\d*) ?gm/g);
        const match2 = searchQuery.match(/(\d+\.?\d*) ?g/g);
        const match3 = searchQuery.match(/(\d+\.?\d*) ?gram/g);
        const match4 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kg/g);
        const match5 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kilo/g);
        const match6 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kilogram/g);

        let value: any = '',
            type: number = 0;

        if (match1 && match1.length) {
            logger.info(`if match1 true: ${match1}`);
            value = match1[0].replace('gm', '');
            searchQuery = searchQuery.replace(match1[0], '');
            type = 0;
        } else if (match2 && match2.length) {
            logger.info(`else if match2 true: ${match2}`);
            value = match2[0].replace('g', '');
            searchQuery = searchQuery.replace(match2[0], '');
            type = 0;
        } else if (match3 && match3.length) {
            logger.info(`else if match3 true: ${match3}`);
            value = match3[0].replace('gram', '');
            searchQuery = searchQuery.replace(match3[0], '');
            type = 0;
        } else if (match4 && match4.length) {
            logger.info(`else if match4 true: ${match4}`);
            value = match4[0].replace('kg', '');
            searchQuery = searchQuery.replace(match4[0], '');
            type = 1;
        } else if (match6 && match6.length) {
            logger.info(`else if match5 true: ${match5}`);
            searchQuery = searchQuery.replace(match6[0], '');
            value = match6[0].replace('kilogram', '');
            type = 1;
        } else if (match5 && match5.length) {
            logger.info(`else if match6 true: ${match6}`);
            value = match5[0].replace('kilo', '');
            searchQuery = searchQuery.replace(match5[0], '');
            type = 1;
        }
        value = value.replace(' ', '');
        let intValue: number = 0;
        let evalResult: number = 0;
        if (value.includes('/')) {
            const numberArr = value.split('/');
            evalResult = +numberArr[0];
            for (let i = 1; i < numberArr.length; i++) {
                if (+numberArr[i] === 0) {
                    evalResult = +numberArr[0];
                    break;
                }
                evalResult /= +numberArr[i];
            }
        } else intValue = isNaN(parseInt(value)) ? 0 : parseInt(value);
        let valueInKg: any = null;
        if (type === 0) {
            logger.info(`if type = 0, converting value in kg`);
            valueInKg = intValue / 1000;
        }

        if (type === 1) {
            logger.info(`if type = 1`);
            if (value.search('/') > -1) {
                logger.info(`if value contains /`);
                value = evalResult * 1000;
            } else if (value === 'half') {
                logger.info(`if value is half`);
                valueInKg = 0.5;
                value = 500;
            } else if (value === 'one') {
                logger.info(`if value is one`);
                valueInKg = 1;
                value = 1000;
            } else {
                logger.info(`else case`);
                valueInKg = value;
                value = Number.isInteger(value) ? parseInt(value) * 1000 : parseFloat(value) * 1000;
            }
        }

        let weightQueryString: string = '';

        if (value) {
            logger.info(`if case, value exists`);
            weightQueryString += `${value}gm | ${value}gmx:* | (${value} & gm) | (${value} & gmx:*) | ${value}gms | ${value}gmsx:* | (${value} & gms) | (${value} & gmsx:*) | ${value}g | ${value}gx:* | (${value} & g) | (${value} & gx:*) | ${value}gram | ${value}gramx:* | (${value} & gram) | (${value} & gramx:*)`;
        }
        if (valueInKg) {
            logger.info(`if case, value in kg exists`);
            if (value) weightQueryString += ' | ';
            weightQueryString += `${valueInKg}kilo | ${valueInKg}kilox:* | (${valueInKg} & kilo) | (${valueInKg} & kilox:*) | ${valueInKg}kg | ${valueInKg}kgx:* | (${valueInKg} & kg) | (${valueInKg} & kgx:*) | ${valueInKg}kilogram | ${valueInKg}kilogramx:* | (${valueInKg} & kilogram) | (${valueInKg} & kilogramx:*)`;
        }

        searchQuery.trim();
        const searchItems: string[] = searchQuery.split(' ');
        let queryString: string = '';

        if (searchItems.length) {
            logger.info(`if case, search items has length`);
            for (const [index, value] of searchItems.entries()) {
                if (value) {
                    if (queryString) queryString += ' & ';
                    queryString += value + ':*';
                }
            }
        }

        if (weightQueryString) {
            logger.info(`if case, weight query string exists`);
            if (queryString) queryString += ' & ';
            queryString += ' (' + weightQueryString + ')';
        }

        logger.info(`returning query string`);
        return queryString;
    },

    // async generateUId(tableName: string, pk_column: string, prefix: any) {
    //   /**
    //    * @param tableName - table name for which uid is to be generated
    //    * @param pk_column - column name where uid is to be stored
    //    * @param prefix - prefix for the uid
    //    * @returns uid(string) - generated uid
    //    */
    //   let uid = '';
    //   let month = ((new Date()).getMonth()) + 1;
    //   let year = ((new Date()).getFullYear() + "").slice(2);
    //   const monthYear = month.toString().padStart(2, '0') + year.toString();
    //   try {
    //     const result = await utilModel.getLastRequestId(tableName, pk_column);
    //     if (result && result?.rowCount > 0) {
    //       const lastUid = result.rows[0][pk_column];
    //       const lastSerialNumber = Number(lastUid.toString().split('-')[2]);
    //       const serialNumber = (lastSerialNumber + 1).toString().padStart(5, '0');
    //       const lastUidMonth = Number(lastUid.toString().split('-')[1].slice(0, 2));
    //       if (lastUidMonth !== month) {
    //         uid = `${prefix}-${monthYear}-00001`;
    //       } else {
    //         uid = `${prefix}-${monthYear}-${serialNumber}`;
    //       }
    //     } else {
    //       uid = `${prefix}-${monthYear}-00001`;
    //     }
    //     return uid;
    //   } catch (error) {
    //     logger.error('Error in commonHelper -> generateUid ', error);
    //     return null;
    //   }
    // },

    formatTime(data) {
        let d = new Date(data),
            hour = '' + d.getHours(),
            min = '' + d.getMinutes();
        const am_pm = Number(hour) >= 12 ? ' PM' : ' AM';
        Number(hour) > 12 ? (hour = (Number(hour) - 12).toString()) : (hour = hour);
        Number(hour) === 0 ? (hour = '12') : (hour = hour); // the hour '0' should be '12';
        Number(hour) < 10 ? (hour = '0' + hour) : (hour = hour);
        Number(min) < 10 ? (min = '0' + min) : (min = min);
        const time = [hour, min].join(':');
        const time_ampm = time + am_pm;
        return time_ampm;
    },

    encryptData(data) {
        const encryptedData = AES.encrypt(data, CryptoConfig.encryptionKey).toString();
        return encryptedData;
    },

    decryptData(data) {
        const decryptedData = AES.decrypt(data, CryptoConfig.encryptionKey).toString(enc.Utf8);
        return decryptedData;
    },

    formatDateToCustomString(date: Date | null = null, applicableMonth: string | null = null): string | null {
        if (!date && !applicableMonth) {
            return null;
        }
        if (!date && applicableMonth) {
            date = new Date(+applicableMonth.substring(0, 4), +applicableMonth.substring(4, 6) - 1, 1);
        }
        const options: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };
        const formattedDate = date?.toLocaleDateString('en-GB', options).replace(/ /g, '-');
        return `01-${formattedDate}`;
    },

    chunkArray<T>(array: T[], chunkSize: number): T[][] {
        // to create batches of data
        // return array of arrays
        const chunkedArray: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunkedArray.push(array.slice(i, i + chunkSize));
        }
        return chunkedArray;
    },

    wait(ms: number): Promise<void> {
        // Utility function to pause execution and  wait for a specified duration
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    fetchMonths(startDate, delta = 3, offset = 0, lastForecastMonth) {
        /*
      INPUT : '202501' or '23/01/2025' or '01-Jan-25'
      OUTPUT : { monthYear: ['202501', '202412', '202411'], monthNames: ['January', 'December', 'November'] }
    */
        if (!startDate) {
            return null;
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Parse the input date
        const yearMonthRegex = /^(2\d{3}(0[1-9]|1[0-2]))$/;
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const shortDateRegex = /^(\d{2})-(\w{3})-(\d{2})$/;

        let parsedDate;
        if (yearMonthRegex.test(startDate)) {
            parsedDate = moment(startDate, 'YYYYMM');
        } else if (dateRegex.test(startDate)) {
            parsedDate = moment(startDate, 'DD/MM/YYYY');
        } else if (shortDateRegex.test(startDate)) {
            parsedDate = moment(startDate, 'DD-MMM-YY');
        } else {
            return null; // Invalid date format
        }

        const monthYear: string[] = [];
        const monthNamesResult: string[] = [];
        const yearMonth: string[] = [];

        monthYear.push(moment(lastForecastMonth, 'DD-MMM-YY').format('YYYYMM'));
        monthNamesResult.push(monthNames[moment(lastForecastMonth, 'DD-MMM-YY').month()]);

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
        };
    },
};

export default Helper;
