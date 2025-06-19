import logger from '../lib/logger';
require('dotenv').config();
const env = process.env.NODE_ENV;
import _ from 'lodash';
import { utilModel } from '../models/utilModel';
const CryptoConfig = global['configuration'].crypto;
import { AES, enc } from 'crypto-js';
import XLSX from 'xlsx';
import fs from 'fs';
import moment from 'moment';

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
          WHERE roles = 'ASM'
        ) 
        ORDER BY ac.code)`;
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

    async generateUId(tableName: string, pk_column: string, prefix: any) {
        /**
         * @param tableName - table name for which uid is to be generated
         * @param pk_column - column name where uid is to be stored
         * @param prefix - prefix for the uid
         * @returns uid(string) - generated uid
         */
        let uid = '';
        let month = new Date().getMonth() + 1;
        let year = (new Date().getFullYear() + '').slice(2);
        const monthYear = month.toString().padStart(2, '0') + year.toString();
        try {
            const result: any = await utilModel.getLastRequestId(tableName, pk_column);
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
    async generateChildId(tableName: string, ck_column: string, parentUid: any) {
        try {
            if (parentUid) {
                const result: any = await utilModel.getLastRequestId(tableName, ck_column);
                let childId;
                if (result && result?.rowCount > 0) {
                    const lastChildId = result.rows[0][ck_column];
                    const lastUidPart = lastChildId.toString().split('-').slice(0, 3).join('-');
                    if (lastUidPart === parentUid) {
                        const lastSerialNumber = Number(lastChildId.toString().split('-')[3]);
                        const serialNumber = (lastSerialNumber + 1).toString().padStart(4, '0');
                        childId = `${parentUid}-${serialNumber}`;
                    } else {
                        childId = `${parentUid}-0001`;
                    }
                } else {
                    childId = `${parentUid}-0001`;
                }
                return childId;
            } else {
                return null;
            }
        } catch (error) {
            logger.error('Error in commonHelper -> generateChildId ', error);
            return null;
        }
    },
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
    parseTimestampArray(timestamps: any): Date[] {
        if (!timestamps) return [];
        try {
            if (Array.isArray(timestamps)) {
                return timestamps
                    .map((ts) => {
                        const date = new Date(ts);
                        return isNaN(date.getTime()) ? null : date;
                    })
                    .filter((d): d is Date => d !== null);
            }
            if (typeof timestamps === 'string') {
                const timestampArray = timestamps.replace(/[{"}]/g, '').split(',').filter(Boolean);

                return timestampArray
                    .map((ts) => {
                        const date = new Date(ts);
                        return isNaN(date.getTime()) ? null : date;
                    })
                    .filter((d): d is Date => d !== null);
            }
            return [];
        } catch (error) {
            logger.error('Error parsing timestamp array:', error);
            logger.debug('Raw timestamps value:', timestamps);
            return [];
        }
    },
    formatExcelDate(excelDate: any): string {
        if (typeof excelDate === 'number') {
            const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
            return jsDate.toISOString().split('T')[0];
        } else if (typeof excelDate === 'string') {
            const parsedDate = new Date(excelDate);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
            }
        }
        throw new Error(`Invalid date format: ${excelDate}`);
    },
    convertExcelToJson(file: any, skipFileDeletion: boolean | null = false): any | null {
        const fileUploaded = file;
        let jsonData = {};
        if (fileUploaded) {
            try {
                const buffer = fileUploaded.buffer;
                const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' }) || [];
                    const normalize = (str: string) => str.trim().replace(/\s+/g, ' '); 
                    const dataWithLowercaseKeys = data.map((row: any) =>
                        Object.keys(row).reduce((newRow, key) => {
                            newRow[normalize(key.toLowerCase())] = row[key];
                            return newRow;
                        }, {})
                    );
                    jsonData = dataWithLowercaseKeys; 
                }
                return jsonData;
            } catch (error) {
                logger.error('CAUGHT: Error in Helper -> convertExcelToJson: ', error);
                return null;
            } finally {
                !skipFileDeletion &&
                    fs.unlink(fileUploaded.path, (err) => {
                        if (err) {
                            logger.error('Error in Helper -> convertExcelToJson ->  deleting file: ', err);
                        }
                    });
            }
        }
        return null;
    },
    formatedDate(date, format = 'YYYY-MM-DD') {
        if (!date) return null;
        return moment(date, format).format('DD-MMM-YYYY');
    },
};

export default Helper;
