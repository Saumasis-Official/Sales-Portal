import logger from '../lib/logger';
import XLSX from 'xlsx';
import fs from 'fs';
import 'dotenv/config';
const env = process.env.NODE_ENV;
import _ from 'lodash';
import crypto from 'crypto';
import path from 'path';

const commonHelper = {
    // encrypt(data) {
    //   if (!data) return null;
    //   return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    // },
    // decrypt(data) {
    //   if (!data) return null;
    //   const bytes = CryptoJS.AES.decrypt(data, secretKey);
    //   return bytes.toString(CryptoJS.enc.Utf8);
    // },
    isCircular(data) {
        try {
            JSON.stringify(data);
        } catch (e) {
            logger.error('Error in Helper/index -> isCircular: ', e);
            return true;
        }
        return false;
    },
    isJsonObject(data) {
        try {
            JSON.stringify(data);
        } catch (e) {
            logger.error('Error in Helper/index -> isJsonObject: ', e);
            return false;
        }
        return true;
    },

    feUrl() {
        return process.env.FE_URL;
    },
    ssSihCgs() {
        return process.env.SS_SIH_EMAIL_CGS;
    },

    singleQuoteEscape(data: string) {
        /**
         * takes in string with single quotes and escapes them by adding another single quote in front of it
         */
        if (!data) return data;
        const escapedData = data?.replace(/'/g, "''");
        return escapedData;
    },

    urlDivString(divisionArr: any) {
        try {
            const arr = [...divisionArr];
            let urlDivString = '';
            if (arr && arr.length > 0) {
                for (let a = 0; a < arr.length; a++) {
                    urlDivString += `Division eq '${arr[a]}' `;
                    if (a < arr.length - 1) {
                        urlDivString += 'or ';
                    }
                }
            } else {
                urlDivString = "Division eq '10'";
            }
            return urlDivString;
        } catch (error) {
            logger.error('Error in Helper/index: ', error);
            return '';
        }
    },

    convertTextFileToJSON(data: string) {
        const cells = data.split('\n').map(function (el) {
            return el.split(',');
        });
        const headings = cells?.shift().map((item) => {
            return item.replace(new RegExp('[^A-Z_]+'), '');
        });
        const json = cells.map(function (el) {
            const obj = {};
            for (let i = 0, l = el.length; i < l; i++) {
                obj[headings[i]] = el[i] === '' || isNaN(Number(el[i])) ? el[i] : +el[i];
            }
            return obj;
        });
        return json;
    },

    applicableMonth(index = '') {
        /**
         * index = '' => current month
         * index = 'next' => next month
         * index = 'next-next' => next to next month
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
        const excelData = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        /**Save the csv file to disk */
        const today = new Date();
        prevDate && today.setDate(today.getDate() - 1);
        const currentDate = today.toLocaleDateString('en-GB').split('/').join('-');
        //to know from which environment the report is generated
        if (env === 'dev' || env === 'qa') filename = `${filename}_${env}_${currentDate}.xlsx`;
        else filename = `${filename}_${currentDate}.xlsx`;
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

    createCsvFile(data: object[], filename: string): { fileName: string; filePath: string } | null {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            XLSX.writeFile(workbook, filename, { bookType: 'csv' });
            return { fileName: filename, filePath: filename };
        } catch (error) {
            logger.error('Error in helper -> index -> createCsvFile:', error);
            return null;
        }
    },

    convertExcelToJson(file: any, skipFileDeletion: boolean | null = false): any | null {
        const fileUploaded = file;
        const jsonData = {};
        if (fileUploaded) {
            try {
                if (
                    !(
                        fileUploaded.originalname.endsWith('.xls') ||
                        fileUploaded.originalname.endsWith('.xlsx') ||
                        fileUploaded.originalname.endsWith('.xlsb') ||
                        fileUploaded.originalname.endsWith('.csv')
                    )
                ) {
                    throw new Error('Invalid file type');
                }
                // Validate the file path to prevent path manipulation
                if (!fileUploaded.path || fileUploaded.path.includes('..') || path.isAbsolute(fileUploaded.path)) {
                    logger.error('Invalid file path');
                    return null;
                }
                const buffer = fs.readFileSync(fileUploaded.path);
                const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) || [];
                    jsonData[sheetName] = data;
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
        for (const d of snDaysArray) {
            if (d === 1) arr = arr2;
            const q = arr[d - 1] ? arr[d - 1] : 0;
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
    generateRandomNumber() {
        const buffer = crypto.randomBytes(8); // 8 bytes = 64 bits
        const randomNumber = buffer.readBigUInt64BE(0); // Read 8 bytes as an unsigned integer
        return randomNumber; //returns a random number within range 0 to 4,294,967,295.
    },
    salesOrg(salesOrg: any) {
        try {
            const arr = [...salesOrg];
            let urlSalesOrgString = '';
            if (arr && arr.length > 0) {
                for (let a = 0; a < arr.length; a++) {
                    urlSalesOrgString += `Sales_Org eq '${arr[a]}' `;
                    if (a < arr.length - 1) {
                        urlSalesOrgString += 'or ';
                    }
                }
            } else {
                urlSalesOrgString = "Sales_Org eq '1010'";
            }
            return urlSalesOrgString;
        } catch (error) {
            logger.error('Error in Helper/index: ', error);
            return '';
        }
    },

    modifyMobileNumber(mobileNumber) {
        if (!mobileNumber) return null;
        mobileNumber = mobileNumber.toString();
        if (mobileNumber.length < 10) return mobileNumber;
        return '91' + mobileNumber.slice(-10);
    },
};

export default commonHelper;
