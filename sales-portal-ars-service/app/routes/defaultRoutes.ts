import express, {Router} from 'express'
import { ArsController } from '../controller/arsController';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator'
import Helper from '../helper';
import { UserController } from '../controller/user.controller';

import { PoolClient } from "pg";
import PostgresqlConnection from "../lib/postgresqlConnection";
const conn = new PostgresqlConnection();

export class DefaultRoutes{
    router: Router;
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
                    }
                };
                res.status(200).json({ success: true, date_time, message: `ARS service is up and running with PostgresSql(VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️` });
            }
            else
                res.status(500).json({ success: false, message: 'ARS service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨' });
        } catch (error) {
            res.status(500).json({ success: false, error: error, message: 'ARS service is down...💀💀💀💀💀💀💀' });
        } finally {
            clientRead?.release();
            clientWrite?.release();
        }
    };
    
    init() {
        this.router.get("/hc-index", this.rootPage);
        this.router.post("/ars-auto-submit-soq",expressJoiValidator(expressJoi.arsAutoSubmit), ArsController.arsAutoSubmit);
        this.router.post('/automated-ars-validation', ArsController.automatedArsValidation);
        this.router.get('/automated-dlp-run', ArsController.automatedArsValidation); // Alias for automated ARS validation, to be used by EventBridge
        this.router.post('/distributor-moq', expressJoiValidator(expressJoi.distributorMoq), ArsController.getDistributorMoq);
        this.router.get('/sync-stock-norm', expressJoiValidator(expressJoi.syncStockNorm), ArsController.syncStockNorm);
        this.router.post('/test-fetch-forecast-for-dist', expressJoiValidator(expressJoi.testFetchForecastForDist), ArsController.testFetchSuggestedMaterials);
        this.router.get('/sync-quantity-norm', ArsController.quantityNormSync);
        this.router.get('/sn-ss-check-sync', ArsController.sihSsEmailCheck);
        this.router.get('/ars-tentative-orders', ArsController.arsTentativeOrder);
        this.router.post('/allocation-from-staging', ArsController.allocationFromStaging)
        this.router.get('/distributor-profile/:distributorCode', UserController.fetchDistributorDetails);
    }
}

const defaultRouter = new DefaultRoutes();
defaultRouter.init();
export default defaultRouter.router;