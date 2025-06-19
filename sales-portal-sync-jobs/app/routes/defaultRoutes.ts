import express from 'express';
const router = express.Router();
import { Router } from 'express';
import UtilController from '../controller/UtilController';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import RushOrderController from '../controller/rushOrder.Controller';
import InvoiceProcessController from '../controller/invoiceProcess.controller';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator';
import bearerAuthAuthentication from '../middleware/bearerAuthAuthentication';
const conn = new PostgresqlConnection();

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
            if (readResult?.rows?.length && writeResult?.rows?.length)
                res.status(200).json({
                    success: true,
                    message: `Sync Jobs is up and running with PostgresSql(VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️`,
                });
            else res.status(500).json({ success: false, message: 'Sync Jobs service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨' });
        } catch (error) {
            res.status(500).json({ success: false, error: error, message: 'Sync Jobs service is down...💀💀💀💀💀💀💀' });
        } finally {
            clientRead?.release();
            clientWrite?.release();
        }
    }

    init() {
        this.router.get('/hc-index', this.rootPage);
        this.router.get('/util/rorSync', UtilController.rorSync);
        this.router.get('/util/distributor-sync', UtilController.distributorSync);
        this.router.get('/util/sales-hierarchy-sync', UtilController.salesHierarchySync);
        this.router.get('/util/product-sync', UtilController.productSync);
        this.router.get('/util/distributor-inventory-sync', UtilController.mapProductsToDistributors);
        this.router.get('/util/so-sync/:distributor_id', UtilController.openSOSync);
        this.router.get('/util/previous-process-calender', UtilController.previousProcessCalender);

        /** UNAUTHENTICATED ROUTES */
        this.router.put('/set-expired', RushOrderController.setExpired);
        this.router.post(
            '/invoice-otp-communications',
            bearerAuthAuthentication.validateToken,
            expressJoiValidator(expressJoi.invoiceOtpCommunication),
            InvoiceProcessController.deliveryCodeCommunication,
        ); //API to be called by Mule
        this.router.get('/mt-ecom-so-sync', UtilController.mtEcomSOSync);
    }
}

// Create the Router, and export its configured Express.Router
const defaultRouter = new DefaultRouter();
defaultRouter.init();

export default defaultRouter.router;
