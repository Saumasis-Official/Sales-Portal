import { UserModel } from '../models/user.model';
import logger from '../lib/logger';
import otpEvents from '../helper/otp';
import Email from '../helper/email';
import commenHelper from '../helper';

export const UserService = {
  async getAlert(user_id: any) {
    logger.info('inside UserService->getAlert');
    try {
      return await UserModel.getAlert(user_id);
    } catch (error) {
      logger.error('UserService->getAlert :', error);
      return null;
    }
  },

  async getTseAsmAdminDetails(userId: string) {
    logger.info('inside UserService->getTseAsmAdminDetails');
    try {
      return await UserModel.getTseAsmAdminDetails(userId);
    } catch (error) {
      logger.error('UserService->getAlert :', error);
      return null;
    }
  },

  async updateEmail(
    set_value: any,
    where_value: any,
    otpData: any,
    emailStatus: boolean,
    smsStatus: boolean,
    updatedBy: {
      first_name: string;
      last_name: string;
      email: string;
    } | null = null,
  ) {
    const updateEmailResponse = await UserModel.updateEmail(
      set_value,
      where_value,
    );
    if (
      updateEmailResponse &&
      updateEmailResponse.command === 'UPDATE'
    ) {
      logger.info('otp data: ', otpData);
      const distributorMobile =
        otpData && otpData[0] && otpData[0]['user_mobile_number']
          ? otpData[0]['user_mobile_number']
          : '';
      if (updatedBy)
        otpEvents.send_sms_tse_admin_update_email_mobile(
          {
            mobile_number: distributorMobile,
            distributor_id: where_value,
          },
          updatedBy,
        );
      if (smsStatus) {
        otpData &&
          otpData.length > 0 &&
          otpData.forEach((element) => {
            otpEvents.send_sms_tse_admin_update_email_mobile(
              element,
              updatedBy,
            );
          });
      }

      if (updatedBy)
        Email.send_email_tse_admin_update_email_mobile(
          set_value,
          where_value,
          set_value,
          distributorMobile,
          updatedBy,
        );
      if (emailStatus) {
        let arrayEmail =
          otpData &&
          otpData.length > 0 &&
          otpData.map((a) => a && a.email);
        arrayEmail &&
          arrayEmail.length > 0 &&
          Email.send_email_tse_admin_update_email_mobile(
            arrayEmail,
            where_value,
            set_value,
            distributorMobile,
            updatedBy,
          );
      }
      return true;
    }
    return false;
  },


  async updateMobileEmail(
    cloumn_name: string,
    set_value: any,
    where_value: any,
    otpData: any,
    emailStatus: boolean,
    smsStatus: boolean,
    updatedBy: {
      first_name: string;
      last_name: string;
      email: string;
    } | null = null,
  ) {
    const updateMobileResponse = await UserModel.updateMobileEmail(
      cloumn_name,
      set_value,
      where_value,
    );
    if (
      updateMobileResponse &&
      updateMobileResponse.command === 'UPDATE'
    ) {
      logger.info('otp data: ', otpData);
      if (updatedBy) {
        otpEvents.send_sms_tse_admin_update_email_mobile(
          {
            mobile_number: set_value,
            distributor_id: where_value,
          },
          updatedBy,
        );
      }
      if (smsStatus) {
        otpData &&
          otpData.length > 0 &&
          otpData.forEach((element) => {
            otpEvents.send_sms_tse_admin_update_email_mobile(
              element,
              updatedBy,
            );
          });
      }
      const distributorEmail =
        otpData && otpData[0] && otpData[0]['user_email']
          ? otpData[0]['user_email']
          : '';
      if (updatedBy) {
        Email.send_email_tse_admin_update_email_mobile(
          distributorEmail,
          where_value,
          distributorEmail,
          set_value,
          updatedBy,
        );
      }
      if (emailStatus) {
        let arrayEmail =
          otpData &&
          otpData.length > 0 &&
          otpData.map((a) => a && a.email);
        arrayEmail &&
          arrayEmail.length > 0 &&
          Email.send_email_tse_admin_update_email_mobile(
            arrayEmail,
            where_value,
            distributorEmail,
            set_value,
            updatedBy,
          );
      }
      return true;
    }
    return false;
  },

  async emailIdexistOrNot(email: string) {

    return UserModel.emailidexistOrNot(email)
  },

  async sendOtpMailMobile(type: string, updateValue: string, login_id: string, name: string, remark: string) {
    let value
    if (type === 'sms') {
      value = {
        'distributor_id': login_id,
        'mobile_number': updateValue,
        'otp_code': commenHelper.otp(),
        'email': null,
        'name': name
      }
      otpEvents.send_update_otp(value)

    } else if (type === 'email') {

      value = {
        'distributor_id': login_id,
        'mobile_number': null,
        'otp_code': commenHelper.otp(),
        'email': updateValue,
        'name': name
      }

      let arr = commenHelper.encrypt(login_id).split('');
      let finalValue = ''
      for (var i = 0; i < arr.length; i++) {

        finalValue = finalValue + arr[i].replace('/', '*');
      }

      // const encryptedData = commenHelper.encrypt(login_id).replace(/\\/g, 'Por21Ld')
      Email.update_email(updateValue, finalValue, name, remark)
    }
    return await UserModel.insertEmailMobileOtp(value)
  },

  async otpExistOrNot(otp: string, login_id: string) {
    return await UserModel.checkOtpExistOrNot(otp, login_id)
  },

  async userIdExistOrNotOtpTable(login_id: string) {
    return UserModel.userIdExistOrNotOtpTable(login_id)
  },

  createSalesHierarchyObject(row) {
    return {
      user_id: row.user_id,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email || null,
      mobile_number: commenHelper.modifyMobileNumber(row.mobile_number) || null,
      code: row.code || '',
    };
  },

  async fetchSalesHierarchyDetails(tseCode: string): Promise<{}> {
    logger.info('inside UserService -> fetchSalesHierarchyDetails');
    const resultObj = {};
    try {
      const resultSet = await UserModel.fetchSalesHierarchyDetails(tseCode);
      resultSet?.forEach(row => {
        const userDetails = this.createSalesHierarchyObject(row);
        if (Object.keys(resultObj)?.includes(row.roles))
          resultObj[row.roles]?.push(userDetails);
        else
          resultObj[row.roles] = [userDetails];
      });

      /**
       * if TSE is not present, then create object TSE: {code : code}
       */
      !Object.keys(resultObj).includes('TSE') && Object.assign(resultObj, { TSE: [{ code: tseCode }] });

      /**
        * if by manager-id mapping, ASM details is not fetched, then trying to fetch ASM details based on the area-code(first four characters of TSE code)
        * if still no ASM record is found then create object ASM: {code : code}
        */
      if (!Object.keys(resultObj).includes('ASM')) {
        // const asmDetails = await UserModel.fetchASMSalesHierarchyDetails(tseCode);
        // resultObj['ASM'] = asmDetails || [{ code: tseCode.slice(0, 4) }];

        // SOPE - 2104, IF ASM is not present it implies tse with the given tsecode is not present, hence we use the first 4 charactes (asm_code), 
        // to fetch all the hierarchy above the TSE
        const area_code = tseCode?.slice(0, 4);
        const asmAndAboveResult = await UserModel.fetchSalesHierarchyDetails(area_code);

        asmAndAboveResult?.forEach(row => {
            const userDetails = this.createSalesHierarchyObject(row);
            if (Object.keys(resultObj)?.includes(row.roles))
                resultObj[row.roles]?.push(userDetails);
            else
                resultObj[row.roles] = [userDetails];
        });
      };
      return resultObj;
    } catch (error) {
      logger.error('CAUGHT ERROR in UserService -> fetchSalesHierarchyDetails', error);
      return {};
    }
  },
  async fetchReservedCredit(distributorId: string) {
    logger.info('inside UserService -> fetchReservedCredit');
    try {
      const resultSet = await UserModel.fetchReservedCredit(distributorId);
      return resultSet;
    } catch (error) {
      logger.error('CAUGHT ERROR in UserService -> fetchReserveCredit', error);
      return null;
    }
  },

  async insertReservedCredit(dbCode: string, reserveAmount: number, createdBy: string) {
    logger.info('inside UserService -> insertReservedCredit');
    try {
      return await UserModel.insertReservedCredit(dbCode, reserveAmount, createdBy);
    } catch (error) {
      logger.error('CAUGHT ERROR in UserService -> insertReserveCredit', error);
      return null;
    }
  },

  async sendInsertReservedCreditNotification(dbCode: string, reserveAmount: number, createdBy: string) {
    logger.info('inside UserService -> sendInsertReservedCreditNotification');
    try {
      const result = await UserModel.fetchDistributorDetails(dbCode);
      if (!result) return null;
      const resultSet = await UserService.fetchSalesHierarchyDetails(result?.tse_code)
      const tseEmailArr = resultSet['TSE']?.map((a: any) => a?.email);
      const data: {
        to: string | string[],
        cc: string | string[],
        db_name: string,
        db_code: string,
        reserved_amount: string | number,
        reserved_date: string,
      } = {
        to: result?.email,
        cc: tseEmailArr,
        db_name: result?.name,
        db_code: dbCode,
        reserved_amount: reserveAmount,
        reserved_date: `${commenHelper.formatDate(new Date())} ${commenHelper.formatTime(new Date())}`,
      };
      Email.reserved_credit_notification(data)
      return true;
    } catch (error) {
      logger.error('CAUGHT ERROR in UserService -> sendInsertReservedCreditNotification', error);
      return null;
    }
  },
  async getSessionInvalidateStatus(loginId:string,uuid:string){
    return await UserModel.getInvalidateSessionStatus(loginId,uuid)
  },
  async getPromiseTimeFlag(distributor_id: string) {
    return await UserModel.getPromiseTimeFlag(distributor_id);
  },

  async fetchDistributorProfile(distributor_id: string) {
    logger.info('inside UserService -> fetchDistributorProfile');
    return await UserModel.fetchDistributorProfile(distributor_id);
  }
};
