import { Request, Response } from 'express';
import logger from '../lib/logger';
import Template from '../helper/responseTemplate';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';
import ArsArchiveService from '../service/archive.service';

const ArsArchiveController = {
    async syncArsRelatedTables(req: Request, res: Response) {
        logger.info('inside ArsArchiveController -> syncArsRelatedTables');
        try {
            await ArsArchiveService.syncArsRelatedTables();
            await ArsArchiveService.archiveArsTables();
            await ArsArchiveService.reindexArsTables();
            return res.status(200).send(Template.successMessage(SuccessMessage.ARCHIVE_SYNC_SUCCESS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveController -> syncArsRelatedTables', error);
            return res.status(500).send(Template.errorResponse(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getFilesInS3(req: Request, res: Response) {
        logger.info('inside ArsArchiveController -> filesInS3');
        try {
            const { bucket, folder } = req.body;
            const files = await ArsArchiveService.getFilesInS3(bucket, folder);
            return res.status(200).send(Template.success(files, SuccessMessage.FETCH_SUCCESS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveController -> filesInS3', error);
            return res.status(500).send(Template.errorResponse(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async deleteFilesInS3(req: Request, res: Response) {
        logger.info('inside ArsArchiveController -> deleteFilesInS3');
        try {
            const { bucket, filepaths } = req.body;
            const files = await ArsArchiveService.deleteFilesInS3(bucket, filepaths);
            return res.status(200).send(Template.success(files, 'deleted files successfully'));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveController -> deleteFilesInS3', error);
            return res.status(500).send(Template.errorResponse(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
};

export default ArsArchiveController;
