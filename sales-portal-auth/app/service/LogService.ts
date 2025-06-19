import { LogModel } from '../models/LogModel';
export const LogService = {
    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, cc?: string[] | string, bcc?: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null
    ) {
        return await LogModel.insertEmailLogs(type, status, subject, recipients, reference, email_data, error);
    },
};