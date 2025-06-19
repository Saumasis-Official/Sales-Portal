import logger from "../lib/logger";
import XLSX from 'xlsx';
import fs from 'fs';
require('dotenv').config();
const env = process.env.NODE_ENV;
import _ from 'lodash';
import { utilModel } from "../models/utilModel";
import { AES, enc } from 'crypto-js';
const CryptoConfig = global['configuration'].crypto;
import moment, { Moment } from 'moment-timezone';


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
  tseHierarchyQuery(adminId: any) {
    try {
      return `(WITH RECURSIVE hierarchy AS
          (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
              FROM sales_hierarchy_details 
              WHERE user_id = '${adminId}' 
              AND deleted = false 
              UNION 
              SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id 
              FROM sales_hierarchy_details s 
              INNER JOIN hierarchy h ON h.user_id = s.manager_id) 
              SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)`;
    } catch (error) {
      logger.error('Error in tseHierarchyQuery: ', error);
      return '';
    }
  },
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
      SELECT *, roles::_varchar FROM hierarchy`
    } catch (error) {
      logger.error('Error in tseUpperHierarchyQueryByCode: ', error);
      return '';
    }
  },
  asmHierarchyQuery(adminId: any) {
    try {
      return `
      (WITH RECURSIVE hierarchy AS
      (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
      FROM sales_hierarchy_details WHERE user_id = '${adminId}' 
      AND deleted = false ) SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)
      `;
    } catch (error) {
      logger.error('Error in asmHierarchyQuery: ', error);
      return '';
    }
  },

  /**
   * Helper method to create a xlsx file
   * @param dataArray - accept the data for each excel sheet in array
   * @param sheetNameArray - accept the sheet names,
   * @param filename - file name of the  to be created file, then it adds current date to the filename
   * @param prevDate - if true then it adds previous date to the filename
   * @returns an object {fileName: string, filePath: string}
   */
  createXlsxFile(dataArray: any[], sheetNameArray: string[], filename: string, prevDate: boolean = false) {
    /**Create new workbook and worksheet */
    const workbook = XLSX.utils.book_new();

    for (let i = 0; i < dataArray.length; i++) {
      const worksheet = XLSX.utils.json_to_sheet(dataArray[i], { header: Object.keys(dataArray[i][0]) });

      /**Add the worksheet to workbook */
      const sheetName = sheetNameArray[i] ? sheetNameArray[i] : `Sheet${i}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }


    /**Generate the excel file binary data */
    const excelData = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    /**Save the csv file to disk */
    const today = new Date();
    prevDate && today.setDate(today.getDate() - 1);
    const currentDate = (today.toLocaleDateString('en-GB')).split('/').join('-');
    //to know from which environment the report is generated
    if (env === 'dev' || env === 'qa')
      filename = `${filename}_${env}_${currentDate}.xlsx`;
    else
      filename = `${filename}_${currentDate}.xlsx`;
    const filepath = filename;
    fs.writeFile(filepath, excelData, (err) => {
      if (err) {
        logger.error('Error in helper -> index -> createCsvFile -> writeFile:', err);
        return null;
      }
      logger.info('in helper -> index -> createCsvFile -> fs.writeFile: file saved successfully');
    });
    return { fileName: filename, filePath: filepath };
  },
  feUrl() {
    return process.env.FE_URL;
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
   */
  applicableYearMonths(updated_on) {
    if (!updated_on) {
      return null;
    }
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const updatedOn = updated_on.split('/');
    const lastUpdatedOn = new Date(updatedOn[2], Number(updatedOn[1]) - 1, updatedOn[0]);
    const today = new Date();
    const lastUpdateOnYearMonth = Number(`${lastUpdatedOn.getFullYear()}${(lastUpdatedOn.getMonth() + 1).toString().padStart(2, '0')}`);
    const todayYearMonth = Number(`${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}`);
    let salesYearMonth;
    let applicableMonthsCode: string[] = [];
    let monthNames: string[] = [];
    /*
    * INPUT = [202302, 202304]; [202302, 202303, 202304]; [202303,202304]
    */
    //CASE 1: updated - April, Current- May => O/P [FEB, MAR, APR, MAY]
    //CASE 2: updated - May, Current - May => O/P [FEB, MAR, APR, JUNE]

    //CASE 1:
    if (lastUpdateOnYearMonth < todayYearMonth) {
      salesYearMonth = lastUpdateOnYearMonth;
      for (let i = 1; i <= 3; i++) {
        if ((salesYearMonth - 1) % 100 === 0) {//beginning of year, reduce the year
          salesYearMonth = Number(`${Number(salesYearMonth.toString().substring(0, 4)) - 1}12`);
        } else {
          salesYearMonth--;
        }
        applicableMonthsCode.push(salesYearMonth.toString());
        monthNames.push(month[Number(salesYearMonth.toString().substring(4, 6)) - 1]);
      }
      applicableMonthsCode = _.reverse(applicableMonthsCode);
      monthNames = _.reverse(monthNames);
      applicableMonthsCode.push(todayYearMonth.toString());
      monthNames.push(month[Number(todayYearMonth.toString().substring(4, 6)) - 1]);
    } else {
      //CASE 2:
      salesYearMonth = todayYearMonth;
      for (let i = 1; i <= 3; i++) {

        if ((salesYearMonth - 1) % 100 === 0) {//beginning of year, reduce the year
          salesYearMonth = Number(`${Number(salesYearMonth.toString().substring(0, 4)) - 1}12`);
        } else {
          salesYearMonth--;
        }
        applicableMonthsCode.push(salesYearMonth.toString());
        monthNames.push(month[Number(salesYearMonth.toString().substring(4, 6)) - 1]);
      }
      applicableMonthsCode = _.reverse(applicableMonthsCode);
      monthNames = _.reverse(monthNames);
      salesYearMonth = todayYearMonth;
      if (Number((todayYearMonth + 1).toString().substring(4, 6)) === 13) {//end of year, increase the year
        salesYearMonth = Number(`${Number(todayYearMonth.toString().substring(0, 4)) + 1}01`);
      } else {
        salesYearMonth++;
      }
      applicableMonthsCode.push(salesYearMonth.toString());
      monthNames.push(month[Number(salesYearMonth.toString().substring(4, 6)) - 1]);
    }
    return {
      monthYear: applicableMonthsCode,
      monthNames: monthNames
    }
  },

  formatDate(date) {
    let d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    return [day, month, year].join('/');
  },

  pgFormatDate(date) {
    /* Via http://stackoverflow.com/questions/3605214/javascript-add-leading-zeroes-to-date */
    function zeroPad(d) {
      return ("0" + d).slice(-2);
    }

    var parsed = new Date(date);
    if (typeof parsed === 'undefined' || parsed === null)
      return null;

    return parsed.getUTCFullYear() + '-' + zeroPad(parsed.getMonth() + 1) + '-' + zeroPad(parsed.getDate()) + ' ' + zeroPad(parsed.getHours()) + ':' + zeroPad(parsed.getMinutes()) + ':' + zeroPad(parsed.getSeconds());
  },

  generateSearchQuery(searchQuery: string) {
    logger.info(`inside generate search query method`);
    const match1 = searchQuery.match(/(\d+\.?\d*) ?gm/g);
    const match2 = searchQuery.match(/(\d+\.?\d*) ?g/g);
    const match3 = searchQuery.match(/(\d+\.?\d*) ?gram/g);
    const match4 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kg/g);
    const match5 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kilo/g);
    const match6 = searchQuery.match(/(\d+\.?\d*|[a-zA-Z]+|[0-9]\/[0-9]) ?kilogram/g);

    let value: any = '', type: number = 0;

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
    if (value.includes("/")) {
      const numberArr = value.split("/");
      evalResult = +numberArr[0]
      for (let i = 1; i < numberArr.length; i++) {
        if (+numberArr[i] === 0) {
          evalResult = +numberArr[0];
          break;
        }
        evalResult /= +numberArr[i];
      }
    }
    else
      intValue = isNaN(parseInt(value)) ? 0 : parseInt(value)
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
                queryString += (value + ':*');
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

  async generateUId(tableName: string, pk_column: string, prefix: any) {
    /**
     * @param tableName - table name for which uid is to be generated
     * @param pk_column - column name where uid is to be stored
     * @param prefix - prefix for the uid
     * @returns uid(string) - generated uid
     */
    let uid = '';
    let month = ((new Date()).getMonth()) + 1;
    let year = ((new Date()).getFullYear() + "").slice(2);
    const monthYear = month.toString().padStart(2, '0') + year.toString();
    try {
      const result = await utilModel.getLastRequestId(tableName, pk_column);
      if (result && result?.rowCount > 0) {
        const lastUid = result.rows[0][pk_column];
        const lastSerialNumber = Number(lastUid.toString().split('-')[2]);
        const serialNumber = (lastSerialNumber + 1).toString().padStart(5, '0');
        const lastUidMonth = Number(lastUid.toString().split('-')[1].slice(0, 2));
        if (lastUidMonth !== month) {
          uid = `${prefix}-${monthYear}-00001`;
        } else {
          uid = `${prefix}-${monthYear}-${serialNumber}`;
        }
      } else {
        uid = `${prefix}-${monthYear}-00001`;
      }
      return uid;
    } catch (error) {
      logger.error('Error in commonHelper -> generateUid ', error);
      return null;
    }
  },

  formatTime(data) {
    let d = new Date(data),
      hour = '' + d.getHours(),
      min = '' + d.getMinutes();
    const am_pm = (Number(hour) >= 12 ? ' PM' : ' AM');
    (Number(hour) > 12 ? hour = (Number(hour) - 12).toString() : hour = hour);
    (Number(hour) === 0 ? hour = '12' : hour = hour); // the hour '0' should be '12';
    (Number(hour) < 10 ? hour = '0' + hour : hour = hour);
    (Number(min) < 10 ? min = '0' + min : min = min);
    const time = [hour, min].join(':');
    const time_ampm = time + am_pm;
    return time_ampm;
  },

  encryptData(data) {
    const encryptedData =AES.encrypt(data, CryptoConfig.encryptionKey).toString();
    return encryptedData;
  },

  decryptData(data) {
      const decryptedData = AES.decrypt(data, CryptoConfig.encryptionKey).toString(enc.Utf8);
      return decryptedData;
  }, 

  formatDateToCustomString(date: Date): string {    
    const options: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };    
    const formattedDate = date.toLocaleDateString('en-GB', options).replace(/ /g, '-');    
    return `01-${formattedDate}`;
  },

  //converts database dates to IST
  getISTDateTime(date: string | null = null): Moment {
    const ist_date = (date) ? moment(date).tz('Asia/Kolkata')
                            : moment().tz('Asia/Kolkata');
    return ist_date;
  },


};

export default Helper;