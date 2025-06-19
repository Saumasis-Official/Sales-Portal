import express from 'express';
const router = express.Router();
import { Router } from 'express';
import CfaProcessController from '../controller/CfaProcessController';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import UtilController from '../controller/UtilController';
const conn = new PostgresqlConnection();
import multer from 'multer';
const upload = multer({ dest: 'excelUploads/' });
import bearerAuthAuthentication from '../middleware/bearerAuthAuthentication';
import InvoiceProcessController from '../controller/invoiceProcess.controller';
import validation from '../middleware/adminMiddleware';

export class AdminRouter {
    router: Router;

    /**
     * Initialize the Router
     */
    constructor() {
        this.router = Router();
    }

    init() {
        this.router.post('/get-cfa-process-logs', CfaProcessController.getCfaProcessLogs);
        this.router.post('/nourishco-planning-sync', upload.single('file'), UtilController.nourishcoPlanningSync);
        this.router.get('/download-nourishco-planning-sync', UtilController.downloadNourishcoForecastFile);
        this.router.post('/delivery-code-reports', validation.validateToken, InvoiceProcessController.deliveryCodeReport);
    }
}

// Create the Router, and export its configured Express.Router
const adminRouter = new AdminRouter();
adminRouter.init();

export default adminRouter.router;
