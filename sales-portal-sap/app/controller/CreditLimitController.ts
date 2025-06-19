import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import Template from "../helper/responseTemplate";
import { LogService } from '../service/LogService';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import { UserService } from '../service/user.service';
import { Request, Response } from 'express';

class CreditLimitController {

    static async getCreditLimitDetails(req: any, res: any) {
        try {
            logger.info(`Fetching credit limit details with request params:`);
            const { distributor_id } = req.params;
            const distributorId = req.user.login_id;
            if (distributor_id !== distributorId) {
                return res.status(403).json(Template.error('Unauthorized', 'Invalid distributor Id'));
            }
            const creditResponse = await UtilityFunctions.sendToSapCreditLimit(distributor_id);
            const reservedCredit = await UserService.fetchReservedCredit(distributor_id);
            const secondPromiseTimeFlag= await UserService.getPromiseTimeFlag(distributor_id);
            const timeFlag = secondPromiseTimeFlag[0].consent_exists_today;

            if (creditResponse.status == 200) {
                creditResponse.data['reserved_credit'] = reservedCredit;
                creditResponse.data['promise_consent_day_flag'] = timeFlag;
                logger.info('Successfully fetched credit limit details with response:');
                res.status(200).json(
                    Template.success(creditResponse.data, "Successfully fetched credit limit details")
                );
                return { success: true, data: creditResponse.data };
            } else {
                logger.info('Failed to Fetch credit limit Details with response:', creditResponse);
                res.status(500).json(
                    Template.error("Technical Error", "There is some issue occurred while fetching the credit limit", creditResponse.data)
                );
            }
        } catch (error) {
            logger.error('Error in fetching credit limit:', error);
            res.status(500).json(
                Template.error("Technical Error", "Credit limit is not fetched successfully")
            )
        }
    }

    static async sendCreditCrunchNotification(req: any, res: any) {
        try {
            logger.info(`Inside CreditLimitController -> sendCreditCrunchNotification`);
            const response = await LogService.sendCreditCrunchNotification(req.body);
            if (response) {
                logger.info('Successfully sent and saved credit crunch notification');
                return res.status(200).json(Template.successMessage(SuccessMessage.CREDIT_CRUNCH_NOTIFICATION));
            } else {
                logger.info('Failed to send and save credit crunch notification');
                return res.status(422).json(Template.errorMessage(ErrorMessage.CREDIT_CRUNCH_NOTIFICATION));
            }
        } catch (error) {
            logger.error('Inside CreditLimitController -> sendCreditCrunchNotification, Error: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    }

    static async insertReservedCredit(req: Request, res: Response) {
        logger.info("Inside CreditLimitController -> insertReservedCredit");
        try {
            const { user_id, login_id } = req['user'];
            const { distributor_id, amount } = req.body;
            const result = await UserService.insertReservedCredit(distributor_id ?? login_id, +amount, user_id ?? login_id);
            if (result) {
                logger.info("Successfully inserted reserved credit");
                UserService.sendInsertReservedCreditNotification(distributor_id ?? login_id, amount, user_id ?? login_id);
                return res.status(201).json(Template.successMessage(SuccessMessage.RESERVED_CREDIT_INSERTED));
            } else {
                logger.info("Failed to insert reserved credit");
                return res.status(422).json(Template.errorMessage(ErrorMessage.RESERVED_CREDIT_INSERTED));
            }

        } catch (error) {
            logger.error("Error in CreditLimitController -> insertReservedCredit", error);
            return res.status(500).json(Template.internalServerError());
        }
    }

}

export default CreditLimitController;