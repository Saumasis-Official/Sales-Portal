import axios, { AxiosResponse } from 'axios';
declare function require(name: string);
const otpConfig = global['configuration'].otp;
import OtpConfig from '../config/otp';
import logger from '../lib/logger';
import commonHelper from '../helper';

function isProduction() {
    return process.env.NODE_ENV === 'prod';
}

function formatMobileNumber() {
    return '91' + otpConfig.smsTestingMobileNumber;
}

const Otp = {
    async send_otp(otpData: { id: any, mobile: any, otp: any }) {

        const messageData = JSON.stringify({
            "from": `${OtpConfig.global.from}`,
            "to": isProduction() ? `${otpData.mobile}` : formatMobileNumber(),
            "msg": `${OtpConfig.global.message.replace(/##OTP##/g, otpData.otp)}`
        });

        const config = {
            method: 'post',
            url: otpConfig.apiUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            auth: otpConfig.auth,
            data: messageData
        };

        const response: AxiosResponse = await axios(config);

        logger.info('SMS Api response', response);
        const { status, statusText, data } = response;
        if (status == 202) {
            return {
                status,
                message: statusText,
                data
            }
        } else {
            return {
                message: "Not Accepted",
                data: null
            }
        }
    },
    async creat_order_message(otpData) {
        const { mobile, distributorName, distributorCode, poNumber, soRefrence, soDate, amount } = otpData;
        if (!mobile) {
            return null;
        }
        const messageData = JSON.stringify({
            "from": `${OtpConfig.global.from}`,
            "to": isProduction() ? `${mobile}` : formatMobileNumber(),
            "msg": `Dear ${distributorName}(${distributorCode}) Purchase Order # ${poNumber} SO # ${soRefrence} created on Date ${soDate} with tentative amount Rs ${amount}. TCPL`
        });

        this.send_otp_axios(messageData)
    },
    async tse_admin_order_creation(otpData) {
        const { mobile_number, distributorId, poNumber, amount } = otpData;
        if (!mobile_number) {
            return null;
        }
        const messageData = JSON.stringify({
            "from": `${OtpConfig.global.from}`,
            "to": isProduction() ? `${mobile_number}` : formatMobileNumber(),
            "msg": `Hello, Distributor ${distributorId} has created a new Purchase Order ${poNumber} of tentative amount Rs ${amount}. Please login to the TCPL Portal - Tata Consumer Products Limited`
        });

        this.send_otp_axios(messageData)
    },
    async send_otp_axios(messageData) {
        try {
            const config = {
                method: 'post',
                url: otpConfig.apiUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                auth: otpConfig.auth,
                data: messageData
            };
            const response: AxiosResponse = await axios(config);
            logger.info('sms Response', response)
            const { status, statusText, data } = response;
            if (status == 202) {
                return {
                    status,
                    message: statusText,
                    data
                }
            } else {
                return {
                    message: "Not Accepted",
                    data: null
                }
            }
        } catch (error) {
            logger.error(`error in send otp axios method`, error);
            return { success: false };
        }
    },

    async send_sms_tse_admin_update_email_mobile(otpData, updatedBy: { first_name: string, last_name: string, email: string } = null) {
        if (!otpData) return;
        const { mobile_number, distributor_id } = otpData;
        if (!mobile_number) return;
        const messageData = JSON.stringify({
            "from": `${OtpConfig.global.from}`,
            "to": isProduction() ? `${commonHelper.modifyMobileNumber(mobile_number)}` : formatMobileNumber(),
            "msg": updatedBy ? `Hello, contact details for Distributor ${distributor_id} have been updated. Please login to the TCPL Purchase Order Portal for further details - Tata Consumer Products Limited`
                : `Hello, Distributor ${distributor_id} has updated their contact details. Please login to the TCPL Purchase Order Portal for further details - Tata Consumer Products Limited`
        });
        this.send_otp_axios(messageData);
    },

    async send_update_otp(otpData) {
        if (!otpData) return;
        const { mobile_number, distributor_id, otp_code, name } = otpData

        const messageData = JSON.stringify({
            "from": `${OtpConfig.global.from}`,
            "to": isProduction() ? `${commonHelper.modifyMobileNumber(mobile_number)}` : formatMobileNumber(),
            "msg": `Dear ${name}, use OTP ${otp_code} to verify and update your mobile number. ~ TCPL`
        });
        this.send_otp_axios(messageData)
    },

};
export default Otp;
