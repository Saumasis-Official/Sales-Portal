import SapController from "../controller/SapController";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import Template from "../helper/responseTemplate";
import { Router, Request, Response } from "express";
import ValidAuthTokenMiddleware from '../middleware/authMiddleware';
import ReOrderController from '../controller/ReOrderController';
import logger from '../lib/logger';
import CreditLimitController from "../controller/CreditLimitController";
import WarehouseController from "../controller/WarehouseController";
import SalesOrderController from "../controller/SalesOrderController";
import ErrorReportingController from "../controller/ErrorReportingController";
import { ErrorMessage } from '../constant/error.message';
import sapController from "../controller/SapController";

export class SapRouter {
  router: Router;

  /**
   * Initialize the Router
  */
  constructor() {
    this.router = Router();
    this.init();
  }

  /**
   * @api {POST} /validate :: Used for validate the user
   * @apiName validate
   * @apiGroup Auth
   * @apiSuccess {String} code HTTP status code from API.
   * @apiSuccess {String} message Message from API.
  */
  public validate(req: Request, res: Response) {
    res.status(200).json({
      message: 'validated successfully',
      success: true,
      user: req['user']
    });
  }

  /**
   * @api {POST} /validate-order
   * @apiName validateOrder
   * @apiGroup SAP
   * @apiSuccess {String} code HTTP status code from API.
   * @apiSuccess {String} message Message from API.
  */
  public async validateOrder(req: Request, res: Response) {
    try {
      const response = await SapController.validateOrder(req);
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
  }


  /**
   * @api {POST} /create-order
   * @apiName createOrder
   * @apiGroup SAP
   * @apiSuccess {String} code HTTP status code from API.
   * @apiSuccess {String} message Message from API.
  */
  public async createOrder(req: Request, res: Response) {
    try {
      const response = await SapController.createOrder(req);
      if (response.success) {
        logger.info(`Order created successfully with response:`, response.orderData);
        res.status(200).json(
          Template.success(response.orderData, "Order is created successfully")
        )
      } else if (response.result === 'INVALID_PONUMBER') {
        logger.info(`Order creation failed due to invalid PO`);
        res.status(401).json(
          Template.error("Technical Error", "Invalid Po Number")
        )
        // } else if (response.result === 'ENABLE_PDP_RESTRICTION_NOT_FOUND') {
        //   logger.info(`Order creation failed due to ENABLE_PDP_RESTRICTION not found in app_level_settings`);
        //   res.status(400).json(
        //     Template.error("Technical Error", ErrorMessage.ENABLE_PDP_RESTRICTION_NOT_FOUND)
        //   )
      } else if (response.result === 'DISTRIBUTOR_NOT_FOUND') {
        logger.info(`Order creation failed due to distributor not found`);
        res.status(400).json(
          Template.error("Technical Error", ErrorMessage.DISTRIBUTOR_NOT_FOUND)
        )
      } else if (response.result === 'INVALID_DAY_TO_PLACE_ORDER') {
        logger.info(`Order creation failed due to invalid day to place order`);
        res.status(401).json(
          Template.error("Technical Error", ErrorMessage.INVALID_DAY_TO_PLACE_ORDER)
        )
      }
      else {
        logger.info(`Order creation failed with response:`, response.orderData);
        res.status(200).json(
          Template.error("Technical Error", "Some issue occurred while creating the order", response.orderData)
        )
      }
    } catch (err) {
      logger.error(`Technical error in order creation :`, err);
      res.status(401).json(
        Template.error("Technical Error", "Order is not created successfully")
      )
    }
  }



  /**
   * @api {GET} /re-order
   * @apiName getReOrderDetails
   * @apiGroup SAP
   * @apiSuccess {String} code HTTP status code from API.
   * @apiSuccess {String} message Message from API.
  */
  public async getReOrderDetails(req: Request, res: Response) {
    try {
      const response = await ReOrderController.getReOrderDetails(req);
      if (response.success) {
        logger.info('Re-order details successfully with response:', response.data);
        res.status(200).json(
          Template.success(response.data, "Successfully fetched re-order details")
        )
      } else {
        logger.info('Some issue occurred while fetching the re-order details', response.data);
        res.status(400).json(
          Template.error("Technical Error", "Some issue occurred while fetching the re-order", response.data)
        );
      }
    } catch (err) {
      logger.error(`Technical Error while fetching re-order details :`, err);
      res.status(500).json(
        Template.error("Technical Error", "Re-order details is not fetched")
      )
    }
  }



  /**
   * Take each handler, and attach to one of the Express.Router's
   * endpoints.
   */
  init() {
    this.router.post("/validate-order", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.validateOrderPayload), this.validateOrder);
    this.router.get("/validate", ValidAuthTokenMiddleware.validateToken, this.validate);
    this.router.post("/create-order",ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.createOrderPayload), this.createOrder);
    this.router.get("/re-order", ValidAuthTokenMiddleware.validateToken, this.getReOrderDetails);
    this.router.get("/credit-limit/:distributor_id", ValidAuthTokenMiddleware.validateToken, CreditLimitController.getCreditLimitDetails);
    this.router.get('/warehouse-details', ValidAuthTokenMiddleware.validateToken, WarehouseController.fetchWarehouseDetails);
    this.router.get('/warehouse-details-dist-channel/:dist_channel/:division_str', ValidAuthTokenMiddleware.validateToken, WarehouseController.fetchWarehouseDetailsOnDistChannel);
    this.router.post('/so-details', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.salesOrderPayload), SalesOrderController.fetchSODetails);
    this.router.post('/multiple-so-details', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.multipleSalesPayload), SalesOrderController.multipleSalesDetails);
    this.router.post('/sales-order-delivery', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.salesOrderDeliveryPayload), SalesOrderController.getSalesOrderDelivery);
    this.router.post('/sales-order-invoice', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.salesOrderInvoicePayload), SalesOrderController.getSalesOrderInvoice);
    this.router.post('/report-portal-error', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.reportErrorPayload), ErrorReportingController.reportPortalError);
    this.router.post('/materials-bom-explode', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.materialsBOMExplodePayload), SapController.materialsBOMExplode);
    this.router.get("/service-request-category/:type", ErrorReportingController.fetchServiceRequestCategories);
    this.router.get("/get-liquidation-materials", ValidAuthTokenMiddleware.validateToken, SapController.getLiquidationMaterials);
    this.router.post('/mt-ecom-mrp-and-caselot-check', SapController.getMrpAndCaselotCheckDetails);
    this.router.post('/mt-ecom-so-creation', SapController.createSO);
    this.router.post('/mt-ecom-mrp-check2', SapController.getMrp2CheckDetails);
    this.router.post('/mt-ecom-get-so-details', SapController.getSODetails);
    this.router.get('/mt-ecom-get-amendment-details/:po_number', SapController.getAmendmentDetails);
    this.router.post('/mt-ecom-create-amendment', SapController.createAmendment);
    this.router.post("/create-order2",ValidAuthTokenMiddleware.validateToken,expressJoiValidator(expressJoi.createOrder2), sapController.createOrder2);

  }
}

// Create the HeroRouter, and export its configured Express.Router
const sapRoutes = new SapRouter();
sapRoutes.init();

export default sapRoutes.router;
