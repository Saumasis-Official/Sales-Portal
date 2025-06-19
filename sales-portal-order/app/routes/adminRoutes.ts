import express, { Router } from "express";
import validAdminTokenMiddleware from '../middleware/adminMiddleware';

import MaterialController from '../controller/materialController';
const materialController = new MaterialController();

import UserController from '../controller/userController';
const userController = new UserController();

import OrderController from "../controller/orderController";
const orderController = new OrderController();

import utilController from "../controller/utilController";

import logger from "../lib/logger";
import ResponseTemplate from "../global/templates/response";
import { ErrorMessage } from "../constants/errorMessage";

import { ServiceDeliveryRequestController } from "../controller/serviceDeliveryRequestController";

import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import { SkuRuleConfigurationsController } from "../controller/skuRuleConfig.controller";

import RushOrderController from "../controller/rushOrder.controller";

import multer from 'multer';
import { BulkOrderController } from "../controller/bulkOrderController";
import authorizer from "../middleware/authorizer";
const upload = multer({dest:"excelUploads/"})

export class AdminRouter {
  router: Router;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
  }

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
    this.router.get("/materials/:distributor_id", validAdminTokenMiddleware.validateToken, this.getMaterials);
    this.router.get("/distributor/profile/:distributor_id", validAdminTokenMiddleware.validateToken, this.getProfileDetails);
    this.router.get("/orders/:distributor_id", validAdminTokenMiddleware.validateToken, this.getOrders);
    this.router.get("/po-details/:po_number/:distributor_id", validAdminTokenMiddleware.validateToken, this.getPoDetails);
    this.router.get("/sync-logs", validAdminTokenMiddleware.validateToken, utilController.getSyncLogs);
    this.router.get("/material-tags", validAdminTokenMiddleware.validateToken, utilController.getMaterialsTag);
    this.router.delete("/remove-draft/:po_number/:distributor_id", validAdminTokenMiddleware.validateToken, authorizer.adminTeamTSEAndAbove, this.removeDraft);
    this.router.post("/get-zone-wise-orders", validAdminTokenMiddleware.validateToken, orderController.getZoneWiseOrders);
    this.router.post("/get-zone-wise-orders-by-order-type", validAdminTokenMiddleware.validateToken, orderController.getZoneWiseOrdersByOrderType);
    this.router.post("/get-category-wise-reported-issues", validAdminTokenMiddleware.validateToken, orderController.getCategoryWiseReportedIssues);


    // Routes regarding Service Delivery Request:
    this.router.post("/sdr-list", validAdminTokenMiddleware.validateToken, ServiceDeliveryRequestController.getSDList);
    this.router.post("/sdr-report-data", validAdminTokenMiddleware.validateToken, ServiceDeliveryRequestController.sdrReport);
    this.router.post("/sd-response-report-data", validAdminTokenMiddleware.validateToken, ServiceDeliveryRequestController.sdResponseReport);
    this.router.post('/service-delivery-request', validAdminTokenMiddleware.validateToken, ServiceDeliveryRequestController.addSDRequest);
    this.router.put('/service-delivery-request', validAdminTokenMiddleware.validateToken, authorizer.updateSDRequest, ServiceDeliveryRequestController.updateSDRequest);
    this.router.get("/sdr-report", ServiceDeliveryRequestController.getSDReport);


    // Routes regarding SKU Rule Configurations:
    this.router.get("/customer-groups", validAdminTokenMiddleware.validateToken, SkuRuleConfigurationsController.getCustomerGroups);
    this.router.post("/sku-codes", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.skuCodes), SkuRuleConfigurationsController.getSKUCode);
    this.router.post("/sku-details", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.skuDetails), SkuRuleConfigurationsController.getSKUDetails);
    this.router.post("/save-rule-config", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.saveRuleConfig), SkuRuleConfigurationsController.upsertSkuRuleConfigurations);
    this.router.post("/fetch-rule-config", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchRuleConfig), SkuRuleConfigurationsController.getSkuRuleConfigurations);
    this.router.post("/fetch-non-forecasted-sku", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchNonForecastedSku), SkuRuleConfigurationsController.fetchNonForecastedPsku);
    this.router.post("/upsert-non-forecasted-sku", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.upsertNonForecastedSku), SkuRuleConfigurationsController.upsertNonForecastedPsku);
    this.router.get('/all-db-list', validAdminTokenMiddleware.validateToken, SkuRuleConfigurationsController.getDbList);
    this.router.post("/upsert-all-non-forecasted-sku", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.upsertAllNonForecastedSku), SkuRuleConfigurationsController.upsertAllNonForecastedPsku)
    this.router.post("/upsert-all-rule-configuration", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.upsertAllRuleConfigurations), SkuRuleConfigurationsController.upsertAllRuleConfiguration);
    this.router.post("/upsert-rule-configuration", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.upsertRuleConfiguration), SkuRuleConfigurationsController.upsertRuleConfiguration);


    this.router.get("/get-order-request/:po_number", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchOrderRequest), RushOrderController.fetchOrderRequestByPO);
    this.router.post('/brand-variant-combinations', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.brandVariantCombinations), SkuRuleConfigurationsController.fetchBrandAndBrandVariantCombinations);
    this.router.post("/brand-variant-details", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.brandVariantDetails), SkuRuleConfigurationsController.fetchBrandVariantDetails);
    this.router.post('/brand-variant-prioritization', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.brandVariantPrioritization), SkuRuleConfigurationsController.upsertBrandVariantPrioritization);
    this.router.post('/fetch-prioritization', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchPrioritization), SkuRuleConfigurationsController.fetchPrioritization);
  
  
    // Routes regarding Bulk Order:

    this.router.post("/bo-moq-mapping-data", validAdminTokenMiddleware.validateToken, authorizer.getBulkOrderMappingData, expressJoiValidator(expressJoi.getMoqDbMapping), BulkOrderController.getBulkMoqMappingData);
    this.router.post("/bo-update-moq", validAdminTokenMiddleware.validateToken,authorizer.bulkOrderupdateMoq, expressJoiValidator(expressJoi.updateMoq), BulkOrderController.BulkOrderupdateMoq);
    this.router.get("/bo-get-mapped-area-zone", validAdminTokenMiddleware.validateToken,authorizer.mappedAreaZones, BulkOrderController.getMappedAreaZone);
    this.router.post("/bo-mass-update-moq", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.massUpdateMoq), BulkOrderController.massUpdateMoq);
    this.router.post("/bo-get-moq", expressJoiValidator(expressJoi.getMoqQunatity), BulkOrderController.getBoDistributorMOQ);

    //Routes regarding Delivery Code Settings(Under App settings)
    this.router.get("/fetch-plant-details", validAdminTokenMiddleware.validateToken, userController.fetchPlantDetails);
  }

  }


// Create the Router, and export its configured Express.Router
const adminRouter = new AdminRouter();
adminRouter.init();

export default adminRouter.router;
