import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import Email from '../helper/email';
import Template from '../helper/responseTemplate';
import commonHelper from '../helper';
import { SapService } from '../service/sap.service';
import { UserService } from '../service/user.service';
import { AdminService } from '../service/admin.service';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';

class UpdateEmailMobileController {
  static async updateEmailMobile(req: any) {
   

    try {
      logger.info('Update Email and Mobile Update:');
      const { type, updateValue } = req.body;
      const login_id = req.params.login_id;

      const updateResponse = await UtilityFunctions.updateEmailMobile(
        type,
        updateValue,
        login_id,
      );

      if (updateResponse.status === 200) {
        logger.info('Successfully Updated Mobile or Email:');
        return Template.success(
          updateResponse.data,
          'Successfully Updated Mobile or Email',
        );
      } else {
        logger.info(
          'Successfully Updated Mobile or Email',
          updateResponse.data,
        );
        return Template.error(
          'Technical Error',
          'There is some issue occurred while updating Mobile or Email',
          updateResponse.data,
        );
      }
    } catch (error) {
      logger.error('Error in Update Email and Mobile: ', error);
      return Template.error(
        'Technical Error',
        'Mobile or Email is not updated successfully',
      );
    }
  }

  static async updateEmailMobileFE(req: any, res: any) {
    try {
      logger.info('Update Email and Mobile Update:');
      const { id } = req.params;
      const decryptedData = id.replace('Por21Ld', '/');
      let login_id = commonHelper
        .decrypt(decryptedData)
        .replace(/"/g, "'");

      let checkOtpDistributirExistOrNot: any =
        await SapService.userIdExistOrNotOtpTable(login_id);
      if (
        checkOtpDistributirExistOrNot &&
        checkOtpDistributirExistOrNot.rowCount
      ) {
        const updateResponse =
          await UtilityFunctions.updateEmailMobile(
            'email',
            checkOtpDistributirExistOrNot.rows[0].email,
            login_id.replace(/\'/g, ''),
          );
        if (updateResponse.status === 200) {
          logger.info('Successfully Updated Mobile or Email:');
          res.json(
            Template.success(
              updateResponse.data,
              'Successfully Updated Mobile or Email',
            ),
          );
        } else {
          logger.info(
            'Failed Updated Mobile or Email',
            updateResponse.data,
          );
          res
            .status(400)
            .json(
              Template.error(
                'Technical Error',
                'There is some issue occurred while updating Mobile or Email',
                updateResponse.data,
              ),
            );
          return { success: false, data: updateResponse.data };
        }
      } else {
        return res.json(Template.errorMessage('Invalid Link'));
      }
    } catch (error) {
      logger.error('Error in Update Email and Mobile: ', error);
      res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            'Mobile or Email is not updated successfully',
          ),
        );
    }
  }

  static async updateDistributorContact(req: any, res: any) {
    logger.info(
      'inside UpdateEmailMobileController.updateDistributorContact',
    );
    try {
      const { mobile_number, remark } = req.body;
      const { distributor_id } = req.params;
      const updatedBy = req.user;

      if (updatedBy.roles === 'SUPPORT') {
        return res
          .status(403)
          .json(
            Template.error(
              'Unauthorized',
              ErrorMessage.PERMISSION_ISSUE,
            ),
          );
      }
      // removed duplicate check for SOPE-58
      /*const checkMobileNumberExist: any = await UserService.mobileNumberexistOrNot(mobile_number);
      if (checkMobileNumberExist && checkMobileNumberExist.rowCount) {
          logger.info('check if mobile id alreay exits', checkMobileNumberExist.rowCount);
          return res.status(200).json(Template.errorMessage(ErrorMessage.MOBILE_NUMBER_ALREADY_EXIST))
      }*/

      let request = {
        params: { login_id: distributor_id },
        body: {
          type: 'sms',
          updateValue: mobile_number,
        },
      };

      let checkSapEmailUpdate: any =
        await UpdateEmailMobileController.updateEmailMobile(request);
      
      if (checkSapEmailUpdate.success) {
        let emailStatus = false,
          smsStatus = false;
        let getAlert: any = await UserService.getAlert(
          distributor_id,
        );
        logger.info('updateDistributorContact getAlert', getAlert);

        if (getAlert && getAlert.length > 0) {
          emailStatus = getAlert[0].email_tse_asm;
          smsStatus = getAlert[0].sms_tse_asm;
        }
        let adminData = await SapService.getTseAsmAdminDetails(
          distributor_id,
        );
        logger.info('updateDistributorContact adminData', adminData);
        let otpData = [];
        if (adminData) {
          otpData = [adminData.tse, adminData.asm];
          otpData = otpData.flat();
        }
        let updatedData: any = await UserService.updateMobileEmail(
          'mobile',
          mobile_number,
          distributor_id,
          otpData,
          emailStatus,
          smsStatus,
          updatedBy,
        );
        if (updatedData) {
          await AdminService.updateContactDetailsHistory(
            distributor_id,
            {
              contact_detail_changes: {
                update_mobile: mobile_number,
              },
              changed_by: updatedBy.user_id,
              remark: remark,
            },
          );
          return res
            .status(200)
            .json(
              Template.successMessage(
                SuccessMessage.MOBILE_NUMBER_UPDATED_SUCCESSFULLY,
              ),
            );
        }
      }
      return res
        .status(200)
        .json(Template.errorMessage(ErrorMessage.MOBILE_NOT_UPDATED));
    } catch (error) {
      logger.error(
        'Error in UpdateEmailMobileController.updateDistributorContact: ',
        error,
      );
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.MOBILE_NOT_UPDATED));
    }
  }

  static async updateDistributorEmail(req: any, res: any) {
    logger.info(
      'inside UpdateEmailMobileController.updateDistributorEmail',
    );
    try {
      const { email, remark } = req.body;
      const { distributor_id } = req.params;
      const updatedBy = req.user;

      if (updatedBy.roles === 'SUPPORT') {
        return res
          .status(403)
          .json(
            Template.error(
              'Unauthorized',
              ErrorMessage.PERMISSION_ISSUE,
            ),
          );
      }

      /*const checkEmailExist: any = await UserService.emailIdexistOrNot(email);
      if (checkEmailExist && checkEmailExist.rowCount) {
          logger.info('check if email id alreay exits', checkEmailExist.rowCount);
          return res.status(200).json(Template.errorMessage(ErrorMessage.EMAIL_ID_ALREADY_EXIST))
      }*/

      let request = {
        params: { login_id: distributor_id },
        body: {
          type: 'email',
          updateValue: email,
        },
      };

      let checkSapEmailUpdate: any =
        await UpdateEmailMobileController.updateEmailMobile(request);

      // let checkSapEmailUpdate: any = await axiosApi.postApiUpdateEmailMobile(commonHelper.beUrl(process.env.NODE_ENV), 'email', email, distributor_id);
      if (checkSapEmailUpdate.success) {
        let emailStatus = false,
          smsStatus = false;
        let getAlert: any = await UserService.getAlert(
          distributor_id,
        );
        logger.info('updateDistributorEmail getAlert', getAlert);

        if (getAlert && getAlert.length > 0) {
          emailStatus = getAlert[0].email_tse_asm;
          smsStatus = getAlert[0].sms_tse_asm;
        }
        let adminData = await SapService.getTseAsmAdminDetails(
          distributor_id,
        );
        logger.info('updateDistributorEmail adminData', adminData);
        let otpData = [];
        if (adminData) {
          otpData = [adminData.tse, adminData.asm];
          otpData = otpData.flat();
        }
        let updatedData: any = await UserService.updateEmail(
          email,
          distributor_id,
          otpData,
          emailStatus,
          smsStatus,
          updatedBy,
        );
        logger.info(
          'updateDistributorEmail updatedData',
          updatedData,
        );

        if (updatedData) {
          await AdminService.updateContactDetailsHistory(
            distributor_id,
            {
              contact_detail_changes: {
                update_email: email,
              },
              changed_by: updatedBy.user_id,
              remark: remark,
            },
          );

          return res
            .status(200)
            .json(
              Template.successMessage(
                SuccessMessage.EMAIL_ID_UPDATED_SUCCESSFULLY,
              ),
            );
        }
      }

      return res
        .status(200)
        .json(Template.errorMessage(ErrorMessage.EMAIL_NOT_UPDATED));
    } catch (error) {
      logger.error(
        'Error in AdminController.updateDistributorEmail: ',
        error,
      );
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.EMAIL_NOT_UPDATED));
    }
  }

  static async sendOtpMailMobile(req, res) {
    logger.info('inside UpdateEmailMobileController-> sendOtpMailMobile');
   try {

        const { type, updateValue, remark } = req.body;
        const login_id = req.user.login_id;
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
            logger.info('Sent link to email', updateValue);
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
  logger.info('inside UpdateEmailMobileController-> updateVerifyMobileOTP');
  try {
      const { otp, remark } = req.body;
      const login_id = req.user.login_id;
      let checkOtpExistOrNot: any = await UserService.otpExistOrNot(otp, login_id)
       if (checkOtpExistOrNot && checkOtpExistOrNot.rowCount && checkOtpExistOrNot.rows[0].otp_code == otp && checkOtpExistOrNot.rows[0].mobile_number) {
          logger.info('if otp is valid ', checkOtpExistOrNot);

          let request = {
            params: { login_id: login_id.replace(/\'/g, "") },
            body: {
              type: 'sms',
              updateValue: checkOtpExistOrNot.rows[0].mobile_number,
            }
            
          }; 
          let checkSapEmailUpdate: any = await UpdateEmailMobileController.updateEmailMobile(request);
         
          // let checkSapEmailUpdate: any = await axiosApi.postApiUpdateEmailMobile(commenHelper.beUrl(process.env.NODE_ENV), 'sms', checkOtpExistOrNot.rows[0].mobile_number, login_id.replace(/\'/g, ""))
          if (checkSapEmailUpdate.success) {
              let emailStatus = false
              let smsStatus = false
              let getAlert: any = await UserService.getAlert(login_id)
              logger.info('Update mobile Verify getAlert', getAlert)

              if (getAlert && getAlert.length > 0) {
                  emailStatus = getAlert[0].email_tse_asm;
                  smsStatus = getAlert[0].sms_tse_asm;
              }
            let adminData = await SapService.getTseAsmAdminDetails(login_id)
              logger.info('Update mobile Verify adminData', adminData)
              let otpData = []
              if (adminData) {
                  otpData = [adminData.tse, adminData.asm];
                  otpData = otpData.flat();
              }
              let updatedData: any = await UserService.updateMobileEmail('mobile', checkOtpExistOrNot.rows[0].mobile_number, login_id, otpData, emailStatus, smsStatus);
              if (updatedData) {
                  await AdminService.updateContactDetailsHistory(login_id, {
                      contact_detail_changes: {
                          update_mobile: checkOtpExistOrNot.rows[0].mobile_number
                      },
                      changed_by: login_id,
                      remark: remark
                  });
                  return res.status(200).json(Template.successMessage(SuccessMessage.MOBILE_NUMBER_UPDATED_SUCCESSFULLY));
              }
              return res.json(Template.successMessage(SuccessMessage.MOBILE_NUMBER_UPDATED_SUCCESSFULLY));
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
      let login_id = commonHelper.decrypt(finalValue).replace(/"/g, "");
      let checkOtpDistributirExistOrNot: any = await UserService.userIdExistOrNotOtpTable(login_id)
      if (checkOtpDistributirExistOrNot && checkOtpDistributirExistOrNot.rowCount && checkOtpDistributirExistOrNot.rows[0].email !== null) {
          logger.info('if Link is valid ', checkOtpDistributirExistOrNot);

          let request = {
            params: { login_id: login_id },
            body: {
              type: 'email',
              updateValue: checkOtpDistributirExistOrNot.rows[0].email,
            },
          };
    
          let checkSapEmailUpdate: any = await UpdateEmailMobileController.updateEmailMobile(request);

        //  let checkSapEmailUpdate: any = await axiosApi.postApiUpdateEmailMobile(commenHelper.beUrl(process.env.NODE_ENV), 'email', checkOtpDistributirExistOrNot.rows[0].email, login_id)

          if (checkSapEmailUpdate.success) {
              let emailStatus = false
              let smsStatus = false
              let getAlert: any = await UserService.getAlert(login_id)
              logger.info('Update mobile Verify getAlert', getAlert)

              if (getAlert && getAlert.length > 0) {
                  emailStatus = getAlert[0].email_tse_asm;
                  smsStatus = getAlert[0].sms_tse_asm;
              }
            let adminData = await SapService.getTseAsmAdminDetails(login_id)
              logger.info('Update mobile Verify adminData', adminData)
              let otpData = []
              if (adminData) {
                  otpData = [adminData.tse, adminData.asm];
                  otpData = otpData.flat();
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
                  return res.status(200).json(Template.successMessage(SuccessMessage.EMAIL_ID_UPDATED_SUCCESSFULLY));
              }
              return res.json(Template.successMessage(SuccessMessage.EMAIL_ID_UPDATED_SUCCESSFULLY));
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

}

export default UpdateEmailMobileController;
