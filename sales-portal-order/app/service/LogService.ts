/**
 * @file log.service
 * @description defines log service methods
*/
import { LogModel } from "../models/LogModel";

export const LogService = {

    async insertSyncLog(type: string, result: string, data: { upsertCount: number, deleteCount: number } | null = null, distributorId: string | null = null, error: string | null = null, isCronJob: boolean = false) {
        return await LogModel.insertSyncLog(type, result, data, distributorId, error, isCronJob);
    },

    async checkSyncLog(distributorId: string) {
        const checkSyncLogResponse = await LogModel.checkSyncLog(distributorId);
        if (checkSyncLogResponse && checkSyncLogResponse.rows && checkSyncLogResponse.rows.length && parseInt(checkSyncLogResponse.rows[0].count) > 0) {
            return true;
        }
        return false;
    },

    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, cc?: string[] | string, bcc?: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null,
        created_by: string | null | undefined = null,
    ) {
        return await LogModel.insertEmailLogs(type, status, subject, recipients, reference, email_data, error, created_by);
    },

};

