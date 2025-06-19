/**
 * @file log.service
 * @description defines log service methods
*/
import { LogModel } from "../models/LogModel";
import logger from "../lib/logger";
import Email from "../helper/email";

export const LogService = {

    async insertSyncLog(type: string, result: string, data: { upsertCount: number, deleteCount: number } | null = null, distributorId: string | null = null, error: string | null = null, S3FileName: string | null = null, isCronJob: boolean = false) {
        return await LogModel.insertSyncLog(type, result, data, distributorId, error, S3FileName, isCronJob);
    },

    async checkSyncLog(distributorId: string) {
        const checkSyncLogResponse = await LogModel.checkSyncLog(distributorId);
        if (checkSyncLogResponse && checkSyncLogResponse.rows && checkSyncLogResponse.rows.length && parseInt(checkSyncLogResponse.rows[0].count) > 0) {
            return true;
        }
        return false;
    },

    async sendCreditCrunchNotification(data: any) {
        try {
            logger.info(`Inside LogService -> sendCreditCrunchNotification`);

            const emailResponse = await Email.credit_crunch_notification(data);
            if (emailResponse) {
                return await LogModel.insertCreditCrunchNotificationLog(data.distributorId, data.po_number, data.email);
            }
            return false;
        } catch (error) {
            logger.error(`Inside LogService -> sendCreditCrunchNotification, Error: `, error);
            return false;
        }
    },

    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, cc?: string[] | string, bcc?: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null
    ) {
        return await LogModel.insertEmailLogs(type, status,subject, recipients, reference, email_data, error);
    },

};

