import express from "express";
const jwt = require("jsonwebtoken");

import AuthController from "../controller/AuthController";
import ProfileController from "../controller/ProfileController";

// seralize user Object
const url = global['configuration'].url;
// import LocaleRoute from "./provider/Locale";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";

import Template from "../helper/responseTemplate";
// import  template from '../helper/responseTemplate';
const boom = require("express-boom");
import { Router } from "express";
// import helper from '../helper/bcrypt';
import ValidAuthTokenMiddleware from '../middleware/authMiddleware';
import logger from "../lib/logger";
import commonHelper from "../helper";
import { ErrorMessage } from '../constant/error.message';
import authController from "../controller/AuthController";
import AdminController from "../controller/AdminController";
import { AutoClosureController } from "../controller/autoClosure.controller";
import authorizer from "../middleware/authorizer";

export class AuthRouter {
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
  public validate(req: express.Request, res: express.Response) {
    delete req.user.hasPassword
    delete req.user.pdp_day
    delete req.user.region_id
    delete req.user.group_id
    delete req.user.market
    res.status(200).json({
      message: 'validated succsessfully',
      success: true,
      user: req.user
    });
  }

  /**
 * @api {POST} /reset-password update password sent in Mail
 * @apiName resetPassword
 * @apiGroup Auth
 * @apiSuccess {String} code HTTP status code from API.
 * @apiSuccess {String} message Message from API.
 */
  public async resetPassword(req: express.Request, res: express.Response) {
    try {
      const { login_id, otp, password } = req.body;
      req.body.login_id = login_id.replace(/^0+/, '');
      const checkInvalidOtpLimitResponse = await AuthController.checkInvalidOtpEnteredLimit(login_id, 'RESET_PASS');
      if (!checkInvalidOtpLimitResponse.success) {
        return res.status(200).json(Template.errorMessage(
          `${ErrorMessage.OTP_VERIFICATION_LIMIT_EXCEEDED_ERROR} ${checkInvalidOtpLimitResponse.retryTimeLeft} ${(checkInvalidOtpLimitResponse.retryTimeLeft === 1) ? 'min' : 'mins'}.`
        ));
      }
      const verifyOtpResponse = await AuthController.verifyOtp({ id: login_id, otp });
      if (verifyOtpResponse && verifyOtpResponse.success) {
        logger.info(`OTP is verified for distributor id: ${login_id}`);
        AuthController.resetPassword(login_id, password, (error, success) => {
          if (error) {
            return res.status(200).json(Template.error('Error occurred while changing the password', error));
          } else {
            return res.status(200).json(Template.successMessage('Password has been changed successfully.'));
          }
        });
      } else {
        return res.status(200).json(Template.error(
          "Please enter correct OTP",
          "OTP is either invalid or expired. Please try again with correct OTP."
        ));
      }
    } catch (error) {
      logger.error(`Error in resetPassword: ${error}`);
      return res.status(500).json(Template.error(
        'Technical Error',
        'There may be error occurred while reset the password'
      ));
    }
  };


  /**
 * @api {POST} /generate-otp  :: Used to generate the OTP for the registered user
 * @apiName generateOtp
 * @apiGroup Auth
 * @apiSuccess {String} code HTTP status code from API.
 * @apiSuccess {String} message Message from API.
 */
  public async generateOtp(req: express.Request, res: express.Response) {
    try {
      const { login_id } = req.body;
      logger.info("inside AuthRoutes -> generateOtp -> login_id" + login_id);
      const checkOtpLimitResponse = await AuthController.checkOtpGenerationLimit(login_id, 'RESET_PASS');
      if (!checkOtpLimitResponse.success) {
        return res.status(200).json(Template.errorMessage(
          `${ErrorMessage.OTP_GENERATION_LIMIT_EXCEEDED_ERROR} ${checkOtpLimitResponse.retryTimeLeft} ${(checkOtpLimitResponse.retryTimeLeft === 1) ? 'min' : 'mins'}.`
        ));
      }
      const response = await AuthController.getUserById({ id: login_id, req, res });
      if (response.success && response.userData.mobile !== null && response.userData.mobile !== '') {
        const otp = await AuthController.generateOtp(login_id);
        let mobile = response.userData.mobile;
        const otpSentResult = await AuthController.sendAndSaveOtp({
          login_id,
          name: response.userData.name,
          mobile: commonHelper.modifyMobileNumber(mobile),
          otp: otp
        });
        if (otpSentResult.success) {
          if (mobile && mobile != "") {
            mobile = mobile.replace(/.(?=.{4,}$)/g, 'X').substring(mobile.length - 10);
          }
          res.status(200).json(Template.success(
            { mobile },
            'OTP sent successfully'
          ));
        } else {
          res.status(500).json(Template.error(
            'Technical issue',
            'Error occurred while generating otp'
          ));
        }
      } else if (response.success && !response.userData.mobile) {
        res.status(400).json(Template.mobiledoesNotExist());
      } else {
        res.status(400).json(Template.error('Please provide valid distributor id', 'Please provide valid distributor id'));
      }
    } catch (error) {
      logger.error(`Error in generateOtp: ${error}`);
      res.status(500).json(Template.error(
        'Technical issue',
        'Error occurred while sending otp'
      ));
    }
  }

  /**
 * @api {POST} /fetch/user/:code
 * @apiName verifyOtp
 * @apiGroup Auth
 * @apiSuccess {String} code HTTP status code from API.
 * @apiSuccess {String} message Message from API.
 */
  public async fetchUser(req: express.Request, res: express.Response) {
    try {
      const { id } = req.params;
      const response = await AuthController.getUserById({ id, req, res });

      if (response.success) {
        res.status(200).json(Template.success(response.userData, "User data fetched successfully"));
      } else {
        if (response.message === ErrorMessage.UNAUTHORIZED) {
          res.status(401).json(Template.errorMessage(ErrorMessage.UNAUTHORIZED));
        } else {
          res.status(400).json(Template.error(
            "Technical Error",
            "User data not found"
          ));
        }
      }
    } catch (error) {
      logger.error(`Error in fetchUser: ${error}`);
      res.status(500).json(Template.error(
        'Technical issue',
        'There may be error occurred while fetching the user data'
      ));
    }

  }

  /**
* @api {POST} /validate-distributor-id/:code
* @apiName validate-distributor-id
* @apiGroup Auth
* @apiSuccess {Boolean} true/false.
*/
  public async validateDistributorId(req: express.Request, res: express.Response) {
    try {
      const { id } = req.params;

      const response = await AuthController.getUserById({ id, req, res });
      if (response.success) {
        let mobileNumber = response.userData.mobile;
        if (mobileNumber && mobileNumber !== "") {
          mobileNumber = mobileNumber.replace(/.(?=.{4,}$)/g, 'X').substring(mobileNumber.length - 10);
          response.userData.mobile = mobileNumber;
          res.status(200).json(Template.success({ mobile: response.userData.mobile }, "Distributor id is valid"));
        } else {
          res.status(400).json(Template.mobiledoesNotExist());
        }
      } else {
        res.status(400).json(Template.error(
          "Technical Error",
          "Distributor id is not valid"
        ));
      }
    } catch (error) {
      logger.error(`Error in validateDistributor: ${error}`);
      res.status(500).json(Template.error(
        'Technical issue',
        'There may be error occurred while validating distributor id'
      ));
    }

  }

  public refresh(req: express.Request, res: express.Response) {

    try {
      AuthController.refreshToken(req, res, (err, token) => {
        if (err) {
          return res.status(200).json(Template.userdoesNotExist(err));
        } else {
          return res.status(200).json({
            success: true,
            message: "Token generated.",
            token
          });
        }
      });
    } catch (error) {
      return res.status(500).json(Template.error('Technical Error', 'There may be error occurred while login'));
    }
  }

  /**
   * Take each handler, and attach to one of the Express.Router's
   * endpoints.
   */
  init() {
    this.router.get("/maintenance-status", AuthController.getMaintenanceStatus);
    this.router.post("/login", expressJoiValidator(expressJoi.loginUser), AuthController.validateUser);
    this.router.get("/validate", ValidAuthTokenMiddleware.validateToken, this.validate);
    this.router.get("/user/fetch/:id", ValidAuthTokenMiddleware.validateToken, this.fetchUser);
    this.router.get("/validate-distributor-id/:id", this.validateDistributorId);
    this.router.post("/reset-password", expressJoiValidator(expressJoi.resetPassword), this.resetPassword);
    this.router.post("/generate-otp", expressJoiValidator(expressJoi.generateOtp), this.generateOtp);
    this.router.get("/refresh-token", this.refresh);
    this.router.post("/update-alert", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateAlert), ProfileController.updateAlert);
    this.router.get("/get-alert/:id", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getAlert), ProfileController.getAlert);
    this.router.put("/change-password", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.changePassword), AuthController.changePassword);
    this.router.get("/cfa-data", ValidAuthTokenMiddleware.validateToken, AdminController.getCFAData);
    this.router.post("/sessions", authorizer.getSessionLogs, expressJoiValidator(expressJoi.sessions), AuthController.getSessionLogs);
    this.router.post("/logout", ValidAuthTokenMiddleware.validateToken, AuthController.logout);
    this.router.get("/sso-details/:emailId",AuthController.getSSOUserDetail);
    this.router.get('/app-level-configuration', AuthController.fetchAppLevelSettings);
    this.router.get("/alert-comment-list/:distributor_id", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.alertCommentList), ProfileController.getAlertCommentList);
    this.router.get("/pdp-window/:regionId", ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getPDPWindows), AdminController.getPDPWindows);
    this.router.post('/fetch-auto-closure-gt', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchAutoClosureGT), AutoClosureController.fetchAutoClosureGT);
    this.router.post('/invalidate-other-sessions', ValidAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.invalidateOtherSessions), AuthController.invalidateOtherSessions);

  }
}

// Create the HeroRouter, and export its configured Express.Router
const authRoutes = new AuthRouter();
authRoutes.init();

export default authRoutes.router;