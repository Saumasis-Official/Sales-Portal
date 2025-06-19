import { Router } from "express";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import UpdateEmailMobileController from "../controller/UpdateEmailMobileController";
import validAuthTokenMiddleware from '../middleware/authMiddleware';
import CreditLimitController from "../controller/CreditLimitController";

export class AuthRoutes{
    router: Router;
    constructor(){
        this.router=Router();
    }
    init(){
        this.router.post("/send-otp-mail-mobile", validAuthTokenMiddleware.validateToken,expressJoiValidator(expressJoi.sendOtpMailMobile),  UpdateEmailMobileController.sendOtpMailMobile);
        this.router.post("/verify-mobile", validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.verifyMobile), UpdateEmailMobileController.updateVerifyMobileOTP);    
        this.router.get("/verify-email/:id", expressJoiValidator(expressJoi.verifyEmail), UpdateEmailMobileController.updateVerifyEmailLink);
        this.router.post("/insert-reserved-credit", validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.insertReservedCredit), CreditLimitController.insertReservedCredit);
    }
}

const authRouter=new AuthRoutes()
authRouter.init();
export default authRouter.router;