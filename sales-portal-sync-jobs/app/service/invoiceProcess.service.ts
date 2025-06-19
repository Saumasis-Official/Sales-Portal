import logger from '../lib/logger';
import { DeliveryCodeCommunication, DeliveryCodeEmail } from '../interface/invoiceOtpCommunication';
import InvoiceProcessModel from '../models/invoiceProcess.model';
import Emails from '../helper/email';
import SMS from '../helper/sms';

const InvoiceProcessService = {
    async deliveryCodeCommunication(payload: DeliveryCodeCommunication[]): Promise<boolean> {
        /**
         * 1. Receive the invoice OTP details from Mule
         * 2. Fetch the distributor email and mobile number from the distributor code
         * 3. Send the OTP to the distributor via email and SMS
         */
        logger.info('inside InvoiceProcessService -> deliveryCodeCommunication', payload);
        try {
            const distributorCodeSet = new Set<string>();
            const invoiceSet = new Set<string>();
            if (!payload?.length) {
                logger.error('inside InvoiceProcessService -> deliveryCodeCommunication: payload is empty');
                return false;
            }
            payload?.forEach((data) => {
                distributorCodeSet.add(data.distributor_code);
                // distributorCodeSet.add(data.ship_to);
                invoiceSet.add(data.invoice_number);
            });
            const distributorDetails = await InvoiceProcessModel.getDistributorDetailsForDeliveryCodeCommunication(Array.from(distributorCodeSet));
            const invoiceDeliveryStatus = await InvoiceProcessModel.checkEmailSmsDeliveryStatus(Array.from(invoiceSet));
            const distributorDetailsMap = {};
            const invoiceDeliveryStatusMap = {};
            distributorDetails?.forEach((data) => {
                distributorDetailsMap[data.distributor_code] = data;
            });
            invoiceDeliveryStatus?.forEach((data) => {
                invoiceDeliveryStatusMap[data.invoice] = data;
            });
            payload?.forEach((data) => {
                const distributorDetails = distributorDetailsMap[data.distributor_code];
                // const shipToDetails = distributorDetailsMap[data.ship_to];
                const emailSmsStatus = invoiceDeliveryStatusMap[data.invoice_number];
                if (distributorDetails) {
                    const emailPayload: DeliveryCodeEmail = {
                        distributor_code: data.distributor_code,
                        distributor_name: distributorDetails?.distributor_name,
                        invoice_number: data.invoice_number?.replace('/^0+/', ''), // Remove leading zeros
                        delivery_code: data.otp?.split('-')[1],
                        email: distributorDetails?.email,
                        mobile: distributorDetails?.mobile,
                    };
                    const isDeliveryCodeEmailEnable = distributorDetails?.delivery_code_email_enable;
                    const isDeliveryCodeSMSEnable = distributorDetails?.delivery_code_sms_enable;
                    if (isDeliveryCodeEmailEnable && (!emailSmsStatus || !emailSmsStatus?.email_sent)) Emails.sendDeliveryCodeEmail(emailPayload);
                    if (isDeliveryCodeSMSEnable && (!emailSmsStatus || !emailSmsStatus?.sms_sent)) SMS.deliveryCode(emailPayload);
                }
            });
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in InvoiceProcessService -> deliveryCodeCommunication', error);
            return false;
        }
    },
    async deliveryCodeReport(
        roles: string[],
        email:string,
        queryParams: {
            search: string | null;
            limit: number | null;
            offset: number | null;
        }
    ) {
        logger.info('inside invoiceProcessService -> deliveryCodeReport');
        const response = await InvoiceProcessModel.deliveryCodeReport(roles,email, queryParams);
        return response;

    },
    async enableSmsEmailFlagBasedOnPlants() {
        logger.info('inside UtilService -> enableSmsEmailFlagBasedOnPlants');
        const enableSmsEmailResponse = await InvoiceProcessModel.enableSmsEmailFlagBasedOnPlants();
        if (enableSmsEmailResponse === null) {
            logger.error(`Failed to enable SMS and Email flags for new distributors`);
            return false;
        } else {
            logger.info(`Enabled SMS and Email for new distributors response, count: ${enableSmsEmailResponse}`);
            return true;
        }
    },
};

export default InvoiceProcessService;
