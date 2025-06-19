/**
 * @file user.service
 * @description defines user service methods
 */
import { AuthModel } from '../models/authModel';
import commenHelper from '../helper';
import logger from '../lib/logger';
// import { BearerStrategy } from 'passport-azure-ad';
// import passport from 'passport';
// import credsConfig from '../config/SSOCreds';

export const AuthService = {
  /**
   * @param login_id - where condition
   */
  async getMaintenanceStatus() {
    return await AuthModel.getMaintenanceStatus();
  },
  async addnewmaintenance(data: any, user_id: any, userName: any) {
    return await AuthModel.addNewMaintenanceStatus(
      data,
      user_id,
      userName,
    );
  },
  async updateMaintenance(data: any, user_id: any, userName: any) {
    return await AuthModel.updateMaintenanceStatus(
      data,
      user_id,
      userName,
    );
  },

  async getUserById(login_id: any) {
    return await AuthModel.getUserById(login_id);
  },

  async updatePassword({ hash, login_id }) {
    return AuthModel.updatePassword({ hash, login_id });
  },

  async getSessionLogs(data) {
    const sessionLogs = await AuthModel.getSessionLogs(data);
    const formattedLogs = sessionLogs.map((item) => {
      if (item.login_time && item.login_time !== null) {
        item.login_time = commenHelper.changeDateTimeInIST(
          item.login_time,
        );
      }
      if (item.logout_time && item.logout_time !== null) {
        item.logout_time = commenHelper.changeDateTimeInIST(
          item.logout_time,
        );
      }
      if (
        item.failed_attempt_time &&
        item.failed_attempt_time !== null
      ) {
        item.failed_attempt_time = commenHelper.changeDateTimeInIST(
          item.failed_attempt_time,
        );
      }
      return item;
    });

    return formattedLogs;
  },
  async getTotalSessionLogsCount(data) {
    return await AuthModel.getTotalSessionLogsCount(data);
  },
  async getLastFailedAttemptCount(login_id: any) {
    return await AuthModel.getLastFailedAttemptCount(login_id);
  },
  async insertSession(data) {
    return await AuthModel.insertSession(data);
  },
  async getSSOUserDetail(emailId) {
    return await AuthModel.getSSOUserDetail(emailId);
  },
  async fetchAppLevelSettings(roles?: string[] | undefined) {
    return await AuthModel.fetchAppLevelSettings(roles);
  },

  async getRetryOTPCount(distributorId: string, type: string) {
    return await AuthModel.getRetryOTPCount(distributorId, type);
  },

  async updateOTPRetry(distributorId: string, type: string) {
    return await AuthModel.updateOTPRetry(distributorId, type);
  },

  async getInvalidCount(distributorId: string, type: string) {
    return await AuthModel.getInvalidCount(distributorId, type);
  },

  async getActiveSessionReport(to: string, from: string) {
    return await AuthModel.getActiveSessionReport(to, from );
  },

  async getSessionInvalidateStatus(loginId:string,uuid:string){
    return await AuthModel.getInvalidateSessionStatus(loginId,uuid)
  },

  async invalidateOtherSessions(to_date:string,from_date:string,session_id:string,login_id:string){
    logger.info('inside AuthService -> invalidateOtherSessions');
    return await AuthModel.invalidateOtherSessions(to_date,from_date,session_id,login_id);
  },

};