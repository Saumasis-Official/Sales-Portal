import { Router } from "express";
import validAdminTokenMiddleware from '../middleware/adminMiddleware';
import validAuthTokenMiddleware from '../middleware/authMiddleware';

import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import RushOrderController from "../controller/rushOrder.controller";

export class RushOrderRouter {
  router: Router;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
  }


  init() {
    /** ADMIN VALIDATED ROUTES */
    this.router.post("/get-requests", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchRushOrders), RushOrderController.fetchRushOrderRequests);
    this.router.get("/get-approval-count", validAdminTokenMiddleware.validateToken, RushOrderController.fetchApprovalCount);
    this.router.post("/admin/send-request", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.insertOrderRequest), RushOrderController.insertOrderRequest);
    this.router.put("/update-request", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateRushOrderRequest), RushOrderController.updateOrderRequest);
    this.router.put("/update-request-approved", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateOrderRequestFromOrders), RushOrderController.updateOrderRequestFromOrders);
    this.router.post("/admin/send-approval-email", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.rushOrderEmailTrigger), RushOrderController.triggerApprovalEmail);
    this.router.put("/update-request2", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateRushOrderRequest2), RushOrderController.updateOrderRequest2);
    this.router.put("/update-multiple-requests", validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateMultipleRushOrderRequests), RushOrderController.updateMultipleOrderRequests);
    
    /** DB VALIDATED ROUTES */
    this.router.post("/send-request", validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.insertOrderRequest), RushOrderController.insertOrderRequest);

    /** UNAUTHENTICATED ROUTES */
    this.router.put("/set-expired",  RushOrderController.setExpired);
    this.router.get("/request-reasons", RushOrderController.fetchROReasons);
    this.router.post("/pending-ro-report", RushOrderController.sendPendingEmailsToRSMAndCluster);
    this.router.get("/ars-window-check/:distributor_id", RushOrderController.checkROEnabledByARSWindow);
  }

}


// Create the Router, and export its configured Express.Router
const rushOrderRouter = new RushOrderRouter();
rushOrderRouter.init();

export default rushOrderRouter.router;
