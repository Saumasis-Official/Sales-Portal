import { Router, Request, Response } from 'express';
import expressJoiValidator from 'express-joi-validator';
import validAdminTokenMiddleware from '../middleware/adminMiddleware';
import expressJoi from '../lib/requestValidator';
import CreditLimitController from '../controller/CreditLimitController';
import WarehouseController from '../controller/WarehouseController';
import SalesOrderController from '../controller/SalesOrderController';
import sapController from '../controller/SapController';
import logger from '../lib/logger';
import Template from '../helper/responseTemplate';
import ReOrderController from '../controller/ReOrderController';
import { ErrorMessage } from '../constant/error.message';
import ErrorReportingController from '../controller/ErrorReportingController';
import UtilController from '../controller/UtilController';
import MdmDataController from '../controller/MdmDataController';
import UpdateEmailMobileController from '../controller/UpdateEmailMobileController';
import multer from 'multer';
import ClearTaxController from '../controller/ClearTaxController';
import authorizer from '../middleware/authorizer';
import _ from 'lodash';
import { roles } from '../constant/persona';

const upload = multer({ dest: 'uploadedFileStore/' });

export class AdminRouter {
  router: Router;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
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
      const response = await sapController.validateOrder(req);
      if (response.success) {
        logger.info(`Order validation response:`, response);
        res
          .status(200)
          .json(
            Template.success(
              response.orderData,
              'Order validation response',
            ),
          );
      } else {
        logger.info(
          `Order not validated with failure response:`,
          response,
        );
        res
          .status(200)
          .json(
            Template.error(
              'Technical Error',
              'Order not validated with failure response',
              response.orderData,
            ),
          );
      }
    } catch (err) {
      logger.error(`Technical Error in order validation :`, err);
      res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            'Order is not validated',
            err,
          ),
        );
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
      const response = await sapController.createOrder(req);
      if (response.success) {
        logger.info(
          `Order created successfully with response:`,
          response.orderData,
        );
        res
          .status(200)
          .json(
            Template.success(
              response.orderData,
              'Order is created successfully',
            ),
          );
      } else if (response.result === 'INVALID_PONUMBER') {
        logger.info(`Order creation failed due to invalid PO`);
        res
          .status(401)
          .json(
            Template.error('Technical Error', 'Invalid Po Number'),
          );
        // } else if (response.result === 'ENABLE_PDP_RESTRICTION_NOT_FOUND') {
        //   logger.info(`Order creation failed due to ENABLE_PDP_RESTRICTION not found in app_level_settings`);
        //   res.status(400).json(
        //     Template.error("Technical Error", ErrorMessage.ENABLE_PDP_RESTRICTION_NOT_FOUND)
        //   )
      } else if (response.result === 'DISTRIBUTOR_NOT_FOUND') {
        logger.info(
          `Order creation failed due to distributor not found`,
        );
        res
          .status(400)
          .json(
            Template.error(
              'Technical Error',
              ErrorMessage.DISTRIBUTOR_NOT_FOUND,
            ),
          );
      } else if (response.result === 'INVALID_DAY_TO_PLACE_ORDER') {
        logger.info(
          `Order creation failed due to invalid day to place order`,
        );
        res
          .status(401)
          .json(
            Template.error(
              'Technical Error',
              ErrorMessage.INVALID_DAY_TO_PLACE_ORDER,
            ),
          );
      } else {
        logger.info(
          `Order creation failed with response:`,
          response.orderData,
        );
        res
          .status(200)
          .json(
            Template.error(
              'Technical Error',
              'Some issue occurred while creating the order',
              response.orderData,
            ),
          );
      }
    } catch (err) {
      logger.error(`Technical error in order creation :`, err);
      res
        .status(401)
        .json(
          Template.error(
            'Technical Error',
            'Order is not created successfully',
          ),
        );
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
      if (
        !_.intersection(req['user'].roles, [
          roles.SUPER_ADMIN,
          roles.SUPPORT,
          roles.DIST_ADMIN,
          roles.ASM,
          roles.TSE,
          roles.OPERATIONS,
          roles.RSM,
          roles.CLUSTER_MANAGER,
          roles.PORTAL_OPERATIONS,
          roles.CALL_CENTRE_OPERATIONS,
        ]).length
      ) {
        return res
          .status(403)
          .json(
            Template.error(
              'Unauthorized',
              ErrorMessage.PERMISSION_ISSUE,
            ),
          );
      }
      const response = await ReOrderController.getReOrderDetails(req);
      if (response.success) {
        logger.info(
          'Re-order details successfully with response:',
          response.data,
        );
        res
          .status(200)
          .json(
            Template.success(
              response.data,
              'Successfully fetched re-order details',
            ),
          );
      } else {
        logger.info(
          'Some issue occurred while fetching the re-order details',
          response.data,
        );
        res
          .status(400)
          .json(
            Template.error(
              'Technical Error',
              'Some issue occurred while fetching the re-order',
              response.data,
            ),
          );
      }
    } catch (err) {
      logger.error(
        `Technical Error while fetching re-order details :`,
        err,
      );
      res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            'Re-order details is not fetched',
          ),
        );
    }
  }

  /**
   * Take each handler, and attach to one of the Express.Router's
   * endpoints.
   */
  init() {
    this.router.get(
      '/credit-limit/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      CreditLimitController.getCreditLimitDetails,
    );
    this.router.get(
      '/warehouse-details/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      WarehouseController.fetchWarehouseDetails,
    );
    this.router.get(
      '/warehouse-details-dist-channel/:distributor_id/:dist_channel/:division_str',
      validAdminTokenMiddleware.validateToken,
      WarehouseController.fetchWarehouseDetailsOnDistChannel,
    );
    this.router.post(
      '/so-details/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.salesOrderPayload),
      SalesOrderController.fetchSODetails,
    );
    this.router.post(
      '/sales-order-delivery/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.salesOrderDeliveryPayload),
      SalesOrderController.getSalesOrderDelivery,
    );
    this.router.post(
      '/sales-order-invoice/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.salesOrderInvoicePayload),
      SalesOrderController.getSalesOrderInvoice,
    );
    this.router.post(
      '/multiple-so-details/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.multipleSalesPayload),
      SalesOrderController.multipleSalesDetails,
    );
    this.router.post(
      '/validate-order/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      authorizer.validateOrder,
      expressJoiValidator(expressJoi.validateOrderPayload),
      this.validateOrder,
    );
    this.router.post(
      '/create-order/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      authorizer.createOrder,
      expressJoiValidator(expressJoi.createOrderPayload),
      this.createOrder,
    );
    this.router.get(
      '/re-order/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      this.getReOrderDetails,
    );

    this.router.post(
      '/service-request-category',
      validAdminTokenMiddleware.validateToken,
      authorizer.adminTeamWriteAccess,
      expressJoiValidator(
        expressJoi.addServiceRequestCategoryPayload,
      ),
      ErrorReportingController.addServiceRequestCategory,
    );
    this.router.put(
      '/service-request-category/:category_id',
      validAdminTokenMiddleware.validateToken,
      authorizer.adminTeamWriteAccess,
      expressJoiValidator(
        expressJoi.modifyServiceRequestCategoryPayload,
      ),
      ErrorReportingController.modifyServiceRequestCategory,
    );

    this.router.post(
      '/create-users',
      validAdminTokenMiddleware.validateToken,
      authorizer.adminTeamWriteAccess,
      expressJoiValidator(expressJoi.addUsersPayload),
      UtilController.addUsers,
    );
    this.router.post(
      '/report-portal-error/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.reportErrorPayload),
      ErrorReportingController.reportPortalError,
    );
    this.router.post(
      '/create-mapping-requests',
      validAdminTokenMiddleware.validateToken,
      authorizer.addMappingRequests,
      expressJoiValidator(expressJoi.createMappingRequestPayload),
      UtilController.addMappingRequests,
    );
    this.router.post(
      '/get-mapping-requests',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.listMappingRequestPayload),
      UtilController.getMappingRequestList,
    );
    this.router.put(
      '/update-mapping-requests/:mapping_request_id',
      validAdminTokenMiddleware.validateToken,
      authorizer.updateMappingRequest,
      expressJoiValidator(expressJoi.updateMappingRequestPayload),
      UtilController.updateMappingRequest,
    );
    this.router.get(
      '/get-liquidation-materials',
      validAdminTokenMiddleware.validateToken,
      sapController.getLiquidationMaterials,
    );
    this.router.get(
      '/tse-list',
      validAdminTokenMiddleware.validateToken,
      authorizer.getTseList,
      UtilController.getTseList,
    );
    this.router.get(
      '/get-distributor-code',
      validAdminTokenMiddleware.validateToken,
      UtilController.getDistributor,
    );
    this.router.post(
      '/report-portal-error-cfa',
      validAdminTokenMiddleware.validateToken,
      ErrorReportingController.reportCFAPortalError,
    );
    this.router.get(
      '/service-request-category/:type',
      ErrorReportingController.fetchServiceRequestCategories,
    );
    this.router.put(
      '/update-distributor-mobile/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.updateDistributorMobile),
      UpdateEmailMobileController.updateDistributorContact,
    );
    this.router.put(
      '/update-distributor-email/:distributor_id',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.updateDistributorEmail),
      UpdateEmailMobileController.updateDistributorEmail,
    );
    this.router.post(
      '/plant-code-update-request',
      validAdminTokenMiddleware.validateToken,
      sapController.PlantCodeUpateRequest,
    );
    this.router.post(
      '/get-plant-code-update-request',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.listDepotCodePayload),
      UtilController.getPlantUpdateRequest,
    );
    this.router.post(
      '/logistic-Officer-Response',
      validAdminTokenMiddleware.validateToken,
      sapController.logisticOfficerResponse,
    );
    this.router.post(
      '/sap-material-list',
      validAdminTokenMiddleware.validateToken,
      sapController.getSapMaterialList,
    );
    this.router.post(
      '/pdp-update-request',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.pdpUpdate),
      sapController.pdpUpdateRequest,
    );
    this.router.post(
      '/get-pdp-update-requests',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.getPDPUpdateRequests),
      sapController.getPDPUpdateRequests,
    );
    this.router.post(
      '/pdp-update-response',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.pdpUpdateRequestResponse),
      sapController.pdpUpdateRequestResponse,
    );
    this.router.get(
      '/customer-group-list',
      validAdminTokenMiddleware.validateToken,
      UtilController.getCustomerGroupDetails,
    );
    this.router.post(
      '/update-distributor-plant-code',
      validAdminTokenMiddleware.validateToken,
      sapController.getUpdatedController,
    );
    this.router.post(
      '/depot-code-mapping-details',
      validAdminTokenMiddleware.validateToken,
      sapController.depotCodeMapping,
    );
    this.router.post(
      '/download-mdm-data',
      MdmDataController.downloadMdmData,
    );
    this.router.post(
      '/get-mdm-data',
      validAdminTokenMiddleware.validateToken,
      MdmDataController.getMdmData,
    );
    this.router.put(
      '/mdm-filed-level-save',
      validAdminTokenMiddleware.validateToken,
      MdmDataController.feildLevelSave,
    );
    this.router.post(
      '/upload-mdm-data',
      validAdminTokenMiddleware.validateToken,
      upload.array('file', 12),
      MdmDataController.uploadMdmData,
    );
    this.router.get(
      '/all-mdm-customers',
      validAdminTokenMiddleware.validateToken,
      MdmDataController.getAllCustomers,
    );
    this.router.get(
      '/mdm-notifications',
      MdmDataController.getMdmNotification,
    );
    this.router.post(
      '/insert-reserved-credit',
      validAdminTokenMiddleware.validateToken,
      expressJoiValidator(expressJoi.insertReservedCredit),
      CreditLimitController.insertReservedCredit,
    );
    this.router.post(
      '/add-update-sku',
      validAdminTokenMiddleware.validateToken,
      MdmDataController.createOrUpdateMdmData,
    );
    this.router.post(
      '/cleartax-gstpan',
      ClearTaxController.getGstPan,
    );
    this.router.post(
      '/sap-holiday-sync',
      validAdminTokenMiddleware.validateToken,
      sapController.updateHolidaySync,
    );
    this.router.post(
      '/validate-order2',
      validAdminTokenMiddleware.validateToken,
      authorizer.validateOrder,
      sapController.validateOrder2,
    );
    this.router.post(
      '/create-order2',
      validAdminTokenMiddleware.validateToken,
      authorizer.createOrder,
      expressJoiValidator(expressJoi.createOrder2),
      sapController.createOrder2,
    );
  }
}

// Create the Router, and export its configured Express.Router
const adminRouter = new AdminRouter();
adminRouter.init();

export default adminRouter.router;
