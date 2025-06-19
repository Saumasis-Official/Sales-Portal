import CryptoJS from 'crypto-js';
import logger from '../lib/logger';
import crypto from 'crypto';
const secretKey = 'qwerty987secret'
const commonHelper = {

    otp() {
        const random = commonHelper.generateRandomNumber();
        return random % 900000 + 100000;
    },
    encrypt(data) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    },
    decrypt(data) {
        const bytes = CryptoJS.AES.decrypt(data, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    },
    feUrl(envirement) {
        return process.env.FE_URL
    },
    modifyMobileNumber(mobileNumber) {
        if (!mobileNumber) return null;
        mobileNumber = mobileNumber.toString();
        if (mobileNumber.length < 10) return mobileNumber;
        return ('91' + mobileNumber.slice(-10));
    },
    beUrl(envirement) {
        return process.env.API_BASE_PATH
    },
    createUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = commonHelper.generateRandomNumber();
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    changeDateTimeInIST(time) {
        let dateUTC = new Date(time).getTime();
        let dateIST = new Date(dateUTC);
        //date shifting for IST timezone (+5 hours and 30 minutes)
        dateIST.setHours(dateIST.getHours() + 5);
        dateIST.setMinutes(dateIST.getMinutes() + 30);
        return dateIST;
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
    // tseHierarchyQuery(adminId: any) {
    //     return `(WITH RECURSIVE hierarchy AS
    //         (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
    //             FROM sales_hierarchy_details 
    //             WHERE user_id = '${adminId}' 
    //             AND deleted = false 
    //             UNION 
    //             SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id 
    //             FROM sales_hierarchy_details s 
    //             INNER JOIN hierarchy h ON h.user_id = s.manager_id) 
    //         SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)`;
    // },
    tseHierarchyQuery(adminId: any) {
        return `(WITH RECURSIVE hierarchy AS
            (SELECT user_id, code, manager_id 
                FROM sales_hierarchy_details 
                WHERE user_id = '${adminId}' 
                AND deleted = false 
                UNION 
                SELECT s.user_id,  s.code, s.manager_id 
                FROM sales_hierarchy_details s 
                INNER JOIN hierarchy h ON h.user_id = s.manager_id) 
            SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)`;
    },
    tseUpperHierarchyQueryByCode(tseCode: any) {
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
    },
    asmHierarchyQuery(adminId: any) {
        return `
            (WITH RECURSIVE hierarchy AS
            (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
            FROM sales_hierarchy_details WHERE user_id = '${adminId}' 
            AND deleted = false ) SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)
            `;
    },
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
            SELECT DISTINCT LEFT(UNNEST(STRING_TO_ARRAY(code, ',')),4) as area_code
            FROM hierarchy
            WHERE 'ASM' = ANY(roles)
            ORDER BY area_code)`;
    },
    operationsHierarchyQuery(adminId: string) {
        return `
        select
            id
        from
            group5_master gm
        where
            description in(
            select
                unnest(string_to_array(code,','))
            from
                sales_hierarchy_details shd
            where
                user_id = '${adminId}')`;
    },
    /**
     * @param index 
     * @returns string
     * This method is a copy from order microservice, hence it should be kept in sync with the same.
     */
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
    generateDumpingDate(applicableMonths: string[]): string {
        const dateArr: string[] = [];
        for (const applicableMonth of applicableMonths) {
            const date = new Date(+applicableMonth.substring(0, 4), +(applicableMonth.substring(4, 6)) - 1);
            date.setMonth(date.getMonth() - 1)
            const str: string = `${date.getFullYear()}-${(1 + date.getMonth()).toString().padStart(2, '0')}`;
            dateArr.push(str);
        }
        return dateArr.join('|');
    },

    generateForecastMonthDate(applicableMonths: string[]): string {
        const dateArr: string[] = [];
        for (const applicableMonth of applicableMonths) {
            const newDate = new Date(+(applicableMonth.substring(0, 4)), +(applicableMonth.substring(4, 6)) - 1);
            const forecastMonth = newDate.toLocaleDateString('default', { month: "short" });
            dateArr.push(forecastMonth);
        }
        return dateArr.join('|');
    },

    validateTCPLEmail(email: string): boolean {
        const regex = /^[a-zA-Z0-9._%+-]+@tataconsumer.com$/;
        return regex.test(email);
    },
    /**
     * Function to format the date to readable string
     * @param date : postgresql timestamp string
     * @returns string
     * Copy from client microservice, hence it should be kept in sync with the same.
     */
    formatDate(date): string {
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
    /**
     * Function to convert timestamp to readable string
     * @param data : postgresql timestamp string
     * @returns string
     * Copy from client microservice, hence it should be kept in sync with the same.
     */
    formatTime(data): string{
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
    generateRandomNumber() {
        const buffer = crypto.randomBytes(4); // 4 bytes = 32 bits
        const randomNumber = buffer.readUInt32BE(0);
        return randomNumber; //returns a random number within range 0 to 4,294,967,295.
    }
};

export default commonHelper;


