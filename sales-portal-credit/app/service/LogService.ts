/**
 * @file log.service
 * @description defines log service methods
*/
import { LogModel } from "../models/LogModel";
import logger from '../lib/logger';

export const LogService = {
    
    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null,
        created_by: string | null | undefined = null,
    ) {
        logger.info("inside LogService -> insertEmailLogs");
        return await LogModel.insertEmailLogs(type, status, subject, recipients, reference, email_data, error, created_by);
    },
    async save_req_res(data: any, transaction_id: string) {
        logger.info(`Inside LogService -> save_req_res ->Credit Extention Request/Response`);
        return await LogModel.save_req_res(data, transaction_id);
    }

};

