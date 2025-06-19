import axios, { AxiosResponse } from 'axios';
import { DeliveryCodeEmail } from '../interface/invoiceOtpCommunication';
import { SmsPayload } from '../interface/smsPayloadInterface';
import logger from '../lib/logger';
import helpers from '../helper/index';
import { LogService } from '../service/LogService';

const smsConfig = global['configuration'].sms;

function isProduction() {
    return process.env.NODE_ENV === 'prod';
}

function formatMobileNumber() {
    return '91' + smsConfig.smsTestingMobileNumber;
}

const SMS = {
    async send_sms_axios(payload: SmsPayload) {
        const config = {
            method: 'post',
            url: smsConfig.apiUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            auth: smsConfig.auth,
            data: JSON.stringify(payload),
        };
        try {
            const response: AxiosResponse = await axios(config);

            const { status, statusText, data } = response;
            if (status == 202) {
                return {
                    status,
                    message: statusText,
                    data,
                    success: true,
                };
            } else {
                return {
                    message: 'Not Accepted',
                    data: null,
                    success: false,
                };
            }
        } catch (error) {
            logger.error('CAUGHT: Error in SMS -> send_sms_axios', error);
            return { success: false };
        }
    },
    async deliveryCode(payload: DeliveryCodeEmail) {
        const message = `Dear ${payload.distributor_name} ${payload.distributor_code} Delivery code for the Invoice ${payload.invoice_number} is ${payload.delivery_code}. Please share this code with delivery agent. TCPL`;

        const smsPayload: SmsPayload = {
            from: smsConfig.from,
            to: isProduction() ? helpers.modifyMobileNumber(payload.mobile) : formatMobileNumber(),
            msg: message,
        };
        const auditData = {
            ...payload,
            ...smsPayload
        }
        if (!payload.mobile) {
            LogService.insertSMSLogs('DELIVERY_CODE', 'FAIL', { mobile: payload.mobile }, payload.invoice_number, auditData, 'Mobile number is not available');
            return;
        }
        try {
            const response = await this.send_sms_axios(smsPayload);
            if (response?.success) {
                LogService.insertSMSLogs('DELIVERY_CODE', 'SUCCESS', { mobile: payload.mobile }, payload.invoice_number, auditData, null);
            } else {
                LogService.insertSMSLogs('DELIVERY_CODE', 'FAIL', { mobile: payload.mobile }, payload.invoice_number, auditData, response);
            }
        } catch (error) {
            LogService.insertSMSLogs('DELIVERY_CODE', 'FAIL', { mobile: payload.mobile }, payload.invoice_number, auditData, error);
        }
    },
};

export default SMS;
