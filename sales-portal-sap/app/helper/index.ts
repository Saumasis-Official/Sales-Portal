import CryptoJS from 'crypto-js';
import logger from '../lib/logger';
import pool from '../lib/postgresql';
import XLSX from 'xlsx';
import fs from 'fs';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import csvParser from 'csv-parser';
import crypto from 'crypto';
const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const conn = PostgresqlConnection.getInstance();
const secretKey = '10';
const commonHelper = {
    numberWithCommas(x) {
        if (!x) return null;
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    modifyMobileNumber(mobileNumber) {
        if (!mobileNumber) return null;
        mobileNumber = mobileNumber.toString();
        return '91' + mobileNumber?.slice(-10);
    },
    encrypt(data) {
        if (!data) return null;
        return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    },
    decrypt(data) {
        if (!data) return null;
        const bytes = CryptoJS.AES.decrypt(data, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    },
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

    // it returns IST timestamp if server timezone is UTC, else it returns server timestamp
    getISTDateTime(): Date {
        const today = new Date();
        if (serverTimezone === 'UTC') today.setMinutes(today.getMinutes() + 330); // Add 5 hours 30 minutes for IST
        logger.info('inside getISTDateTime: today: ', { today, serverTimezone });
        return today;
    },

    convertExcelDateToJsDate(date) {
        if (!date) return null;
        const utcDays = Math.floor(date - 25569);
        return new Date(utcDays * 86400000);
    },
    convertTextFileToJSON(data: string) {
        const cells = data.split('\n').map(function (el) {
            return el.split(',');
        });
        const headings = cells.shift().map((item) => {
            return item.replace(new RegExp('[^A-Z_]+'), '');
        });
        const json = cells.map(function (el) {
            const obj = {};
            for (let i = 0, l = el.length; i < l; i++) {
                obj[headings[i]] = isNaN(Number(el[i])) ? el[i] : +el[i];
            }
            return obj;
        });
        return json;
    },
    checkPDPDay: (pdpDay: string, referenceDate: any, weeklyOrderWindow: number, fortnightlyOrderWindow: number, orderPlacementTime: number, weeklyOff: string) => {
        // todo: mandatory holiday cases left
        if (!pdpDay || !weeklyOrderWindow || !fortnightlyOrderWindow || !orderPlacementTime || !weeklyOff) return false;
        const date = new Date();
        const today = date.getDay();

        const dayOfWeek = (day: string) => {
            return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].indexOf(day);
        };

        // if (weeklyOff !== 'NONE' && today === dayOfWeek(weeklyOff)) return false; // if today is weekly off

        const now = date.getHours();
        const pdpType = pdpDay[0] + pdpDay[1];
        pdpDay = pdpDay.slice(2);
        if ((pdpType !== 'WE' && pdpType !== 'FN') || !pdpDay) return false;

        const getWeekOfYear = (date) => {
            const oneJan = new Date(date.getFullYear(), 0, 1);
            const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
            const result = Math.ceil(((oneJan.getDay() === 0 ? 7 : oneJan.getDay()) + numberOfDays) / 7);
            return result;
        };

        if (pdpType === 'FN') {
            if (!referenceDate) {
                logger.error(`Reference date is not available for this distributor and pdp day case is fortnight`);
                return false;
            }
            referenceDate = new Date(referenceDate);
            const referenceWeek = getWeekOfYear(referenceDate);
            const thisWeek = getWeekOfYear(date);
            if (Math.abs(thisWeek - referenceWeek) % 2 !== 0) {
                if (!((pdpDay.includes('MO') && (today === 5 || today === 6)) || (pdpDay.includes('TU') && today === 6))) {
                    return false;
                }
            } else {
                if ((pdpDay.includes('MO') && (today === 5 || today === 6)) || (pdpDay.includes('TU') && today === 6)) {
                    return false;
                }
                if (referenceDate.getFullYear() === date.getFullYear() && referenceDate.getMonth() === date.getMonth() && thisWeek === referenceWeek) {
                    return false;
                }
            }
        }

        let orderPlacementBandwidth = null,
            orderPlacementWindow = null;
        if (pdpType === 'WE') {
            orderPlacementWindow = weeklyOrderWindow;
        } else {
            orderPlacementWindow = fortnightlyOrderWindow;
        }
        orderPlacementBandwidth = Math.floor((orderPlacementTime + orderPlacementWindow) / 24);
        if ((orderPlacementTime + orderPlacementWindow) % 24 === 0) orderPlacementBandwidth--;

        let allowedToOrder = false;
        const days = {
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
            SU: 0,
        };

        const checkOrderAllowed = (day: number) => {
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
        };

        for (let day of Object.keys(days)) {
            if (pdpDay.includes(day)) {
                checkOrderAllowed(days[day]);
                if (allowedToOrder) return true;
            }
        }

        return allowedToOrder;
    },

    beUrl(envirement) {
        return process.env.API_BASE_PATH;
    },

    feUrl(envirement) {
        return process.env.FE_URL;
    },

    otp() {
        const random = commonHelper.generateRandomNumber();
        return +random.toString().padStart(6, '0').substring(0, 6);
    },
    async generateUId(tableName: string, pk_column: string, prefix: any) {
        let client: PoolClient | null = null;
        let uid = '';
        let month = new Date().getMonth() + 1;
        let year = (new Date().getFullYear() + '').slice(2);
        const monthYear = month.toString().padStart(2, '0') + year.toString();
        client = await conn.getWriteClient();
        try {
            const sqlStatement = `SELECT ${pk_column} FROM ${tableName} ORDER BY id DESC LIMIT 1`;
            const result = await client.query(sqlStatement);

            if (result?.rowCount > 0) {
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
        } finally {
            client?.release();
        }
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

    convertExcelToJson(files: any[]) {
        const fileUploaded = files[0];
        let jsonData = {};
        if (fileUploaded) {
            try {
                const buffer = fs.readFileSync(fileUploaded.path);
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = XLSX.utils.sheet_to_json(worksheet);
            } catch (error) {
                logger.error('CAUGHT: Error in commonHelper -> convertExcelToJson: ', error);
            } finally {
                fs.unlink(fileUploaded.path, (err) => {
                    if (err) {
                        logger.error('Error in commonHelper -> convertExcelToJson ->  deleting file: ', err);
                    }
                });
            }
        }
        return jsonData;
    },
    async csvReader(file) {
        return new Promise((resolve, reject) => {
            const results: any = [];
            try {
                const requiredColumns = ['year', 'state_code', 'state_description', 'holiday_date'];
                fs.createReadStream(file[0].path)
                    .pipe(csvParser())
                    .on('data', (data) => {
                        if (requiredColumns.every((column) => Object.keys(data).includes(column))) {
                            const row: any = {
                                holiday_date: data['holiday_date'],
                                state_code: data['state_code'],
                                state_description: data['state_description'],
                                year: data['year'],
                            };

                            results.push(row);
                        } else {
                            reject(new Error('Missing required columns in the CSV file.'));
                        }
                    })
                    .on('end', () => {
                        resolve(JSON.stringify(results));
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
            } catch (e) {
                console.error(e);
            }
        });
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

    singleQuoteEscape(data: string) {
        /**
         * takes in string with single quotes and escapes them by adding another single quote in front of it
         */
        if (!data) return data;
        const escapedData = data?.replace(/'/g, "''");
        return escapedData;
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
    getDDMMFormat(date: any) {
        let mm = date.getMonth() + 1; // Months start at 0!
        let dd = date.getDate();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        return `${dd}${mm}`;
    },
};

export default commonHelper;
