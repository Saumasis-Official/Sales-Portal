import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import { AdminService } from '../service/AdminService';
import Template from "../helper/responseTemplate";
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import commenHelper from '../helper'
import axiosApi from '../helper/axiosApi'
class ProfileController {

    static async updateAlert(req, res) {
        logger.info('Update Alert controller');
        try {
            let { cloumn_name, login_id } = req.body
            const { user } = req;

            if (user && user.id !== login_id) {

                return res.json(Template.errorMessage(ErrorMessage.UNAUTHORIZED));
            }
            let updatedData: any = await UserService.updateAlert(cloumn_name, login_id)
            if (updatedData) {
                logger.info('If Updated the alert');
                return res.json(Template.successMessage(SuccessMessage.ALERT_UPDATED));
            }

        } catch (error) {
            logger.error('Update alert', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.UPDATE_ALERTS_ERROR));
        }

    }
    static async getAlert(req, res) {
        logger.info('Get Alert controller');
        try {
            const { id } = req.params;
            const { user } = req;

            if (user && user.id !== id) {
                return res.json(Template.errorMessage(ErrorMessage.UNAUTHORIZED));
            }
            let updatedData: any = await UserService.getAlert(id)
            if (updatedData && updatedData.length > 0) {
                logger.info('If data found');
                return res.json(Template.success(updatedData[0], SuccessMessage.GET_ALERT));
            } else {
                UserService.insertNotificationPrefrenceTable(id)
                logger.info('If data not found');
                return res.json(Template.success(updatedData[0], SuccessMessage.ALERT_INSERTED));
            }

        } catch (error) {
            logger.error('Get Alert Deatils', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.GET_ALERTS_ERROR));
        }

    }

    static async insertToNotificationTable(req, res) {
        logger.info('Get insertToNotificationTable');
        try {
            const { id } = req.params;

            let updatedData: any = await UserService.insertIntoNotificationTable()
            if (updatedData) {
                return res.json(Template.successMessage(SuccessMessage.DATA_UPDATED));

            }
        } catch (error) {
            logger.error('insert Into notification table', error);
            return { success: false }
        }

    }

    static async sendOtpMailMobile(req, res) {
        logger.info('update Mail Sms Otp');
        try {

            const { type, updateValue, remark } = req.body;
            const login_id = req.user.id;
            const name = req.user.name;
            if (type === 'sms') {
                //removed duplicate check for SOPE-58
                //logger.info('Sent otp to mobile number', updateValue);
                // let checkMobileNumberExist: any = await UserService.mobileNumberexistOrNot(updateValue);
                // if (checkMobileNumberExist && checkMobileNumberExist.rowCount) {
                //     logger.info('check if mobile id alreay exits', checkMobileNumberExist);
                //     return res.json(Template.errorMessage(ErrorMessage.MOBILE_NUMBER_ALREADY_EXIST))
                // }
            } else if (type === 'email') {
                logger.info('Sent link to mobile number', updateValue);
                let checkEmailExist: any = await UserService.emailIdexistOrNot(updateValue);
                if (checkEmailExist && checkEmailExist.rowCount) {
                    logger.info('check if email id alreay exits', checkEmailExist);
                    return res.json(Template.errorMessage(ErrorMessage.EMAIL_ID_ALREADY_EXIST))
                }
            }
            let otpData: any = await UserService.sendOtpMailMobile(type, updateValue, login_id, name, remark)
            if (otpData) {
                logger.info('if successfully send otp or link', updateValue);
                let message = ''
                if (type === 'sms') {
                    message = SuccessMessage.OTP_SEND_SUCESSFULLY
                } else {
                    message = SuccessMessage.MAIL_SENT
                }
                return res.json(Template.successMessage(message));
            }

        } catch (error) {
            logger.error('Send Opt mail and mobile', error);
            return { success: false }
        }

    }

    static async updateVerifyMobileOTP(req, res) {
        logger.info('Update Verify mobile otp');
        try {
            const { otp, remark } = req.body;
            const login_id = req.user.id;
            let checkOtpExistOrNot: any = await UserService.otpExistOrNot(otp, login_id)

            if (checkOtpExistOrNot && checkOtpExistOrNot.rowCount && checkOtpExistOrNot.rows[0].otp_code == otp && checkOtpExistOrNot.rows[0].mobile_number !== null) {
                logger.info('if otp is valid ', checkOtpExistOrNot);

                let checkSapEmailUpdate: any = await axiosApi.postApiUpdateEmailMobile(commenHelper.beUrl(process.env.NODE_ENV), 'sms', checkOtpExistOrNot.rows[0].mobile_number, login_id.replace(/\'/g, ""))
                if (checkSapEmailUpdate.data.success) {
                    let emailStatus = false
                    let smsStatus = false
                    let getAlert: any = await UserService.getAlert(login_id)
                    logger.info('Update mobile Verify getAlert', getAlert)

                    if (getAlert && getAlert.length > 0) {
                        emailStatus = getAlert[0].email_tse_asm;
                        smsStatus = getAlert[0].sms_tse_asm;
                    }
                    let adminData = await UserService.getTseAsmAdminDetails(login_id)
                    logger.info('Update mobile Verify adminData', adminData)
                    let otpData = []
                    if (adminData) {
                        otpData = [adminData.tse, adminData.asm]
                    }
                    let updatedData: any = await UserService.updateMobileEmail('mobile', checkOtpExistOrNot.rows[0].mobile_number, login_id, otpData, emailStatus, smsStatus)
                    if (updatedData) {
                        await AdminService.updateContactDetailsHistory(login_id, {
                            contact_detail_changes: {
                                update_mobile: checkOtpExistOrNot.rows[0].mobile_number
                            },
                            changed_by: login_id,
                            remark: remark
                        });
                        return res.status(200).json(Template.successMessage(SuccessMessage.MOBILE_NUMBER_UPDATED_SUCESSFULLY));
                    }
                    return res.json(Template.successMessage(SuccessMessage.MOBILE_NUMBER_UPDATED_SUCESSFULLY));
                } else {
                    return res.json(Template.errorMessage(ErrorMessage.MOBILE_NOT_UPDATED));
                }

            } else {
                logger.info('if otp is invalid ', checkOtpExistOrNot);
                return res.json(Template.errorMessage(ErrorMessage.INVALID_OTP));
            }
        } catch (error) {
            logger.error('Update Verify mobile otp', error);
            return { success: false }
        }

    }

    static async updateVerifyEmailLink(req, res) {
        logger.info('Update Verify Email Id Link');
        try {
            const { id } = req.params;
            const { remark } = req.query;
            let arr = id.split('');
            let finalValue = ''
            for (var i = 0; i < arr.length; i++) {
                finalValue = finalValue + arr[i].replace('*', '/');
            }
            let login_id = commenHelper.decrypt(finalValue).replace(/"/g, "");
            let checkOtpDistributirExistOrNot: any = await UserService.userIdExistOrNotOtpTable(login_id)
            if (checkOtpDistributirExistOrNot && checkOtpDistributirExistOrNot.rowCount && checkOtpDistributirExistOrNot.rows[0].email !== null) {
                logger.info('if Link is valid ', checkOtpDistributirExistOrNot);
                let checkSapEmailUpdate: any = await axiosApi.postApiUpdateEmailMobile(commenHelper.beUrl(process.env.NODE_ENV), 'email', checkOtpDistributirExistOrNot.rows[0].email, login_id)

                if (checkSapEmailUpdate.data.success) {
                    let emailStatus = false
                    let smsStatus = false
                    let getAlert: any = await UserService.getAlert(login_id)
                    logger.info('Update mobile Verify getAlert', getAlert)

                    if (getAlert && getAlert.length > 0) {
                        emailStatus = getAlert[0].email_tse_asm;
                        smsStatus = getAlert[0].sms_tse_asm;
                    }
                    let adminData = await UserService.getTseAsmAdminDetails(login_id)
                    logger.info('Update mobile Verify adminData', adminData)
                    let otpData = []
                    if (adminData) {
                        otpData = [adminData.tse, adminData.asm]
                    }
                    let updatedData: any = await UserService.updateEmail(checkOtpDistributirExistOrNot.rows[0].email, login_id, otpData, emailStatus, smsStatus)
                    if (updatedData) {
                        await AdminService.updateContactDetailsHistory(login_id, {
                            contact_detail_changes: {
                                update_email: checkOtpDistributirExistOrNot.rows[0].email
                            },
                            changed_by: login_id,
                            remark: remark
                        });
                        return res.status(200).json(Template.successMessage(SuccessMessage.MOBILE_NUMBER_UPDATED_SUCESSFULLY));
                    }
                    return res.json(Template.successMessage(SuccessMessage.EMAIL_ID_UPDATED_SUCESSFULLY));
                } else {
                    return res.json(Template.errorMessage(ErrorMessage.EMAIL_NOT_UPDATED));
                }
            } else {
                logger.info('if Link is invalid ', checkOtpDistributirExistOrNot);
                return res.json(Template.errorMessage(ErrorMessage.INVALID_LINK));
            }
        } catch (error) {
            logger.error('Update Verify Email Id Link', error);
            return { success: false }
        }

    }

    static async getAlertCommentList(req, res) {
        try {
            logger.info(`inside controller ProfileController.getAlertCommentList`);
            const { distributor_id } = req.params;
            const { type } = req.query;
            let alert_setting_changes_type = "";
            if (type == 'email') {
                alert_setting_changes_type = 'update_email';
            }
            else if (type == 'mobile') {
                alert_setting_changes_type = 'update_mobile';
            }
            const getCommentList: any = await UserService.getAlertCommentList(distributor_id, "distributor", alert_setting_changes_type);
            if (getCommentList) {
                logger.info('If success getCommentList', getCommentList);
                return res.json(Template.success(getCommentList.rows, SuccessMessage.COMMENT_LIST));
            }
            return res.status(500).json(Template.errorMessage(ErrorMessage.COMMENT_LIST_ERROR));

        } catch (error) {
            logger.error(`error in ProfileController.getAlertCommentList: `, error);
            return res.status(500).json(Template.error(ErrorMessage.DISTRIBUTOR_SETTINGS_UPDATE_ERROR));
        }
    }

}

export default ProfileController;
