import express, { Router } from "express";
import validAuthTokenMiddleware from '../middleware/authMiddleware';

import MaterialController from '../controller/materialController';
const materialController = new MaterialController();

import WareHouseController from '../controller/wareHouseController';
const wareHouseController = new WareHouseController();

import UserController from '../controller/userController';
const userController = new UserController();

import OrderController from "../controller/orderController";
import logger from "../lib/logger";
import { ServiceDeliveryRequestController } from "../controller/serviceDeliveryRequestController";
const orderController = new OrderController();

import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";

export class OrderRouter {
  router: Router;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
  }

  public rootPage(req: express.Request, res: express.Response) {
    res.status(200).json({ success: true, message: 'App is up and running with PostgresSql + node .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️' });
  };

  /**
   * @api {POST} /get_materials/:searchQuery update password sent in Mail
   * @apiName getMaterials
   * @apiGroup get_materials
   * @apiSuccess {String} code HTTP status code from API
   * @apiSuccess {Object} message Message from API
  */
  public getMaterials(req: express.Request, res: express.Response) {
    try {
      materialController.getMaterials(req, res);
    } catch (error) {
      logger.info(`Error in material:`, error);
    }
  };

  /**
   * 
   */
  public getWarehouseDetails(req: express.Request, res: express.Response) {
    try {
      wareHouseController.getWarehouseDetails(req, res);
    } catch (error) {
      logger.info(`Error in warehouse:`, error);
    }
  };

  /**
  * 
  */
  public getProfileDetails(req: express.Request, res: express.Response) {
    try {
      userController.getUserDetails(req, res);
    } catch (error) {
      logger.info(`Error in user details:`, error);
    }
  };

  /**
   * 
   */
  public getOrders(req: express.Request, res: express.Response) {
    try {
      orderController.fetchOrders(req, res);
    } catch (error) {
      logger.info(`Error in fetch orders:`, error);
    }
  };

  /**
   * 
   */
  public getPoDetails(req: express.Request, res: express.Response) {
    try {
      orderController.fetchPODetails(req, res);
    } catch (error) {
      logger.info(`Error in fetch po details:`, error);
    }
  };

  public removeDraft(req: express.Request, res: express.Response) {
    try {
      orderController.removeDraft(req, res);
    } catch (error) {
      logger.info(`Error in removing draft: `, error);
    }
  };

  init() {
    this.router.get("/", this.rootPage);
    this.router.get("/materials", validAuthTokenMiddleware.validateToken, this.getMaterials);
    this.router.get("/distributor/profile", validAuthTokenMiddleware.validateToken, this.getProfileDetails);
    this.router.get("/orders", validAuthTokenMiddleware.validateToken, this.getOrders);
    this.router.get("/po-details/:po_number/:distributor_id", validAuthTokenMiddleware.validateToken, this.getPoDetails);
    this.router.delete("/remove-draft/:po_number", validAuthTokenMiddleware.validateToken, this.removeDraft);
    this.router.delete('/remove-expired-carts', validAuthTokenMiddleware.validateToken, orderController.removeExpiredCarts);
    this.router.post('/service-delivery-request', validAuthTokenMiddleware.validateToken, ServiceDeliveryRequestController.addSDRequest);
    this.router.post("/promised-credit", orderController.savePromisedCredit);
    this.router.post('/get-upcoming-pdp-days/:distributor_id', orderController.getDistributorUpcomingPDPDays);
  }
}


// Create the Router, and export its configured Express.Router
const orderRouter = new OrderRouter();
orderRouter.init();

export default orderRouter.router;
