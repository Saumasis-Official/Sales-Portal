import express from 'express';
import { Router } from 'express';
import Helper from '../helper';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import utilController from '../controller/utilController';
import validAdminTokenMiddleware from '../middleware/adminMiddleware';

import multer from 'multer';

const conn = new PostgresqlConnection();

// Add multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
}).single('file');

export class DefaultRouter {
    router: Router;

    /**
     * Initialize the Router
     */
    constructor() {
        this.router = Router();
    }

    public async rootPage(req: express.Request, res: express.Response) {
        let clientRead: PoolClient | null = null;
        let clientWrite: PoolClient | null = null;
        try {
            clientRead = await conn.getReadClient();
            clientWrite = await conn.getWriteClient();
            const readResult = await clientRead.query(`SELECT version()`);
            const writeResult = await clientWrite.query(`SELECT version()`);
            if (readResult?.rows?.length && writeResult?.rows?.length) {
                const serverTime = await clientRead.query(`
         SELECT 
          NOW()::DATE::TEXT AS current_date, 
          NOW()::TIME::TEXT AS current_time, 
          EXTRACT(TIMEZONE FROM NOW()) AS timezone_offset_seconds,
          NOW() AS time_stamp;
        `);
                const date_time = {
                    server_time: {
                        current_date: serverTime.rows[0].current_date,
                        current_time: serverTime.rows[0].current_time,
                        timezone_offset_seconds: serverTime.rows[0].timezone_offset_seconds,
                        time_stamp: serverTime.rows[0].time_stamp,
                    },
                    service_time: {
                        current_date: Helper.formatDate(new Date()),
                        current_time: Helper.formatTime(new Date()),
                    },
                };
                res.status(200).json({
                    success: true,
                    date_time,
                    message: `Credit Service is up and running with PostgresSql(VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️`,
                });
            } else
                res.status(500).json({
                    success: false,
                    message: 'Credit Service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨',
                });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error,
                message: 'Credit service is down...💀💀💀💀💀💀💀',
            });
        } finally {
            clientRead?.release();
            clientWrite?.release();
        }
    }

    init() {
        this.router.get('/hc-index', this.rootPage);
        this.router.get('/base-limit-job', utilController.runBaseLimitJob);
        this.router.post('/util/update-credit-limit', upload, validAdminTokenMiddleware.validateToken, utilController.validateAndProcessFile);
        this.router.get('/revert-base-limit', utilController.revertBaseLimit);
        this.router.post('/util/gt-update-request', validAdminTokenMiddleware.validateToken, utilController.updateGTRequestApprover);
        this.router.post('/util/get-gt-excel-data', validAdminTokenMiddleware.validateToken, utilController.gtDownloadExcel);
        this.router.post('/util/get-gt-approvers', validAdminTokenMiddleware.validateToken, utilController.getGtApprovers);
        this.router.get('/gt-base-limit-job',utilController.runGTBaseLimitJob);
        this.router.post('/gt-start-transaction', utilController.gtStartTransactionCron);
        this.router.post('/gt-end-transaction', utilController.gtEndTransactionCron);
    }
}

// Create the Router, and export its configured Express.Router
const defaultRouter = new DefaultRouter();
defaultRouter.init();

export default defaultRouter.router;
