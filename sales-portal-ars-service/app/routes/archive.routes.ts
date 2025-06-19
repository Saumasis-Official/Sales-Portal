import { Router } from 'express';
import ArsArchiveController from '../controller/archive.controller';

class ArchiveRoutes {
    router: Router;
    constructor() {
        this.router = Router();
    }

    init() {
        this.router.get('/sync-ars-related-tables', ArsArchiveController.syncArsRelatedTables);
        this.router.post('/files-in-s3', ArsArchiveController.getFilesInS3);
        this.router.delete('/delete-files-in-s3', ArsArchiveController.deleteFilesInS3);
    }
}

const archiveRouter = new ArchiveRoutes();
archiveRouter.init();
export default archiveRouter.router;
