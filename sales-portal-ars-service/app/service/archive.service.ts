import logger from '../lib/logger';
import ArsArchiveModel from '../model/archive.model';
import Helper from '../helper';
import ConnectToS3Bucket from '../helper/ConnectToS3Bucket';
const ArsArchiveService = {
    async syncArsRelatedTables() {
        logger.info('Inside UtilService-> syncARSRelatedTables');
        try {
            await Promise.all([ArsArchiveModel.syncAreaCodeTable(), ArsArchiveModel.syncArsToleranceTable(), ArsArchiveModel.syncArsGlobalFlag()]);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveService -> syncArsRelatedTables, Error = ', error);
            return false;
        }
    },
    async archiveArsTables() {
        logger.info('inside ArsArchiveService -> archiveArsTables');
        try {
            const currentMonth: string = Helper.applicableMonth();
            const today = new Date();
            const archiveMonth = today.setMonth(today.getMonth() - 2);
            const archiveMonthString = `${new Date(archiveMonth).toISOString().slice(0, 7)}-01`;
            await Promise.all([
                ArsArchiveModel.archiveStockNormConfig(+currentMonth),
                ArsArchiveModel.archiveForecastDistribution(+currentMonth),
                ArsArchiveModel.archiveMonthlySales(archiveMonthString),
                // ArsArchiveModel.archiveSalesAllocation(archiveMonthString),//TODO: need to check the functionality
                ArsArchiveModel.archiveForecastConfigurations(+currentMonth),
            ]);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveService -> archiveArsTables, Error = ', error);
            return false;
        }
    },
    async reindexArsTables() {
        logger.info('inside ArsArchiveService -> reindexArsTables');
        try {
            await ArsArchiveModel.reindexArsRelatedTables();
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveService -> reindexArsTables, Error = ', error);
            return false;
        }
    },

    async getFilesInS3(bucket: string, folder: string) {
        logger.info('inside ArsArchiveService -> getFilesInS3');
        try {
            const files = await ConnectToS3Bucket.listFilesInS3(bucket, folder);
            const fileNames: string[] =
                files?.map((file) => {
                    const fileName = file?.Key || '';
                    return fileName;
                }) ?? [];
            return { files, fileNames };
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveService -> getFilesInS3, Error = ', error);
            return false;
        }
    },

    async deleteFilesInS3(bucket: string, filepaths: string[]) {
        logger.info('inside ArsArchiveService -> deleteFilesInS3');
        try {
            const deletedFiles = await ConnectToS3Bucket.deleteFilesInS3(bucket, filepaths);
            return deletedFiles;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveService -> deleteFilesInS3, Error = ', error);
            return false;
        }
    },
};

export default ArsArchiveService;
