import express from "express";
const router = express.Router();
import { Router } from "express";
import UtilController from "../controller/UtilController";
import WarehouseController from "../controller/WarehouseController";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import sapController from "../controller/SapController";
import logger from "../lib/logger";
import Template from "../helper/responseTemplate";
import ErrorReportingController from "../controller/ErrorReportingController";
import CreditLimitController from "../controller/CreditLimitController";
import commonHelper from "../helper";

import { PoolClient } from "pg";
import PostgresqlConnection from "../lib/postgresqlConnection";
const conn = new PostgresqlConnection();

import AutoOrderController from "../controller/aos.controller";

export class DefaultRouter {
  router: Router;
  aorController: AutoOrderController;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
    this.aorController = new AutoOrderController();
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
            current_date: commonHelper.formatDate(new Date()),
            current_time: commonHelper.formatTime(new Date()),
          }
        };
        res.status(200).json({ success: true, date_time, message: `Sap is up and running with PostgresSql(VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️` });
      }
      else
        res.status(500).json({ success: false, message: 'Sap service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨' });
    } catch (error) {
      res.status(500).json({ success: false, error: error, message: 'Sap service is down...💀💀💀💀💀💀💀' });
    } finally {
      clientRead?.release();
      clientWrite?.release();
    }
  };

  public async validateOrder(req: express.Request, res: express.Response) {
    try {
      const response = await sapController.validateOrder(req);
      if (response.success) {
        logger.info(`Order validation response:`, response);
        res.status(200).json(
          Template.success(response.orderData, "Order validation response")
        )
      } else {
        logger.info(`Order not validated with failure response:`, response);
        res.status(200).json(
          Template.error("Technical Error", "Order not validated with failure response", response.orderData)
        )
      }
    } catch (err) {
      logger.error(`Technical Error in order validation :`, err);
      res.status(500).json(
        Template.error("Technical Error", "Order is not validated", err)
      )
    }
  };

  public async createOrder(req: express.Request, res: express.Response) {
    try {
      const response = await sapController.createOrder(req);
      if (response.success) {
        logger.info(`Order creation response:`, response);
        res.status(200).json(
          Template.success(response.orderData, "Order creation response")
        )
      } else {
        logger.info(`Order not created with failure response:`, response);
        res.status(200).json(
          Template.error("Technical Error", "Order not created with failure response", response.orderData)
        )
      }
    } catch (err) {
      logger.error(`Technical Error in order creation :`, err);
      res.status(500).json(
        Template.error("Technical Error", "Order is not created", err)
      )
    }
  }

  init() {
    this.router.get("/hc-index", this.rootPage);
    this.router.get('/util/so-sync/:distributor_id', UtilController.openSOSync);
    this.router.get('/util/product-sync', UtilController.productSync);
    this.router.get('/util/distributor-sync', UtilController.distributorSync);
    this.router.get('/util/sales-hierarchy-sync', UtilController.salesHierarchySync);
    this.router.post('/fetch-sap-response', UtilController.fetchSapResponse);
    this.router.get('/util/distributor-inventory-sync', UtilController.mapProductsToDistributors);
    this.router.get('/warehouse-details-dist-channel/:distributor_id/:dist_channel/:division_str', WarehouseController.fetchWarehouseDetailsOnDistChannel);
    this.router.post("/validate-order/:distributor_id", expressJoiValidator(expressJoi.validateOrderPayload), this.validateOrder);
    this.router.post("/create-order/:distributor_id", expressJoiValidator(expressJoi.createOrderPayload), this.createOrder);
    this.router.post('/report-portal-error/:distributor_id', expressJoiValidator(expressJoi.reportErrorPayload), ErrorReportingController.reportPortalError);
    this.router.get('/util/mdm-sync', UtilController.mapProductsToMDMData);
    this.router.post('/send-credit-crunch-notification', expressJoiValidator(expressJoi.creditCrunchNotificationPayload), CreditLimitController.sendCreditCrunchNotification);
    this.router.post('/get-sap-holidays', expressJoiValidator(expressJoi.getSapHolidayList), sapController.fetchSapHolidayList);
    this.router.get('/util/rorSync', UtilController.rorSync);
    this.router.post("/aos-order-submit", this.aorController.aosOrderSubmit)
    this.router.get("/auto-closure-sync", UtilController.syncAutoClosure)
    this.router.post('/validate-order2', sapController.validateOrder2);
    this.router.post('/create-order2',expressJoiValidator(expressJoi.createOrder2),sapController.createOrder2);
  }
}


// Create the Router, and export its configured Express.Router
const defaultRouter = new DefaultRouter();
defaultRouter.init();

export default defaultRouter.router;
