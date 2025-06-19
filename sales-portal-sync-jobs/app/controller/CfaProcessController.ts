import { Request, Response } from 'express';
import logger from '../lib/logger';
import { CfaProcessService } from '../service/CfaProcessService';
class CfaProcessController {
  static async getCfaProcessLogs(req: Request, res: Response) {
    const { queryParams } = req.body;

    logger.info('inside SyncJob-> CfaProcessController -> getCfaProcessLogs');
    try {
      const logs = await CfaProcessService.getCfaProcessLogs(queryParams);
      if (logs) {
        logger.info(`inside CfaProcessController -> getCfaProcessLogs, success`);
        res.status(200).json({ success: true, data: logs });
      } else {
        logger.info(`inside CfaProcessController -> getCfaProcessLogs, No logs found`);
        res.status(204).json({ success: false, message: 'No logs found' });
      }
    } catch (error) {
      logger.error('Error in CfaProcessController -> getCfaProcessLogs', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export default CfaProcessController;
