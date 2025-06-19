import logger from '../lib/logger';
import { CfaProcessModel } from '../models/CfaProcessModel';

export const CfaProcessService = {
  async getCfaProcessLogs(queryParams: { start_date: string; channel: string[] }) {
    const { start_date, channel } = queryParams;
    logger.info('Inside CfaProcessService -> getCfaProcessLogs');
    const response = await CfaProcessModel.getCfaProcessLogs(start_date, channel);
    return response;
  },
};
