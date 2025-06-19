import logger from '../lib/logger';
import AosLogsDto from '../dto/AosLogsDto';
import AutoOrderModel from '../models/aor.model';

const AutoOrderService = {
    async updateAosLogs(log: AosLogsDto) {
        logger.info("inside AutoOrderService -> updateAosLogs")
        return await AutoOrderModel.updateAosLogs(log)
    },
}

export default AutoOrderService;