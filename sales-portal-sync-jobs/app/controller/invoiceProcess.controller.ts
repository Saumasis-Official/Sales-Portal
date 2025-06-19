import { request, response } from 'express';
import logger from "../lib/logger";
import Template from "../helper/responseTemplate";
import InvoiceProcessService from '../service/invoiceProcess.service';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';

const InvoiceProcessController = {
    async deliveryCodeCommunication(req, res) {
        logger.info("inside InvoiceProcessController -> deliveryCodeCommunication");
        const payload = req.body;
        InvoiceProcessService.deliveryCodeCommunication(payload);
        return res.status(200).json(Template.successMessage("Invoice OTP Communication data received."));
    },
    async deliveryCodeReport(req, res) {
        logger.info('inside invoiceProcessController -> deliveryCodeReport');
        try {
            const { queryParams } = req.body;
            const { roles,email } =req.user

            const result = await InvoiceProcessService.deliveryCodeReport(roles, email, queryParams,);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DELIVERY_CODE_REPORT_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.DELIVERY_CODE_REPORT_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in invoiceProcessController -> deliveryCodeReport', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));

        }
    }
};

export default InvoiceProcessController;