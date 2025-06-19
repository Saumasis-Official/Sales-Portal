require('dotenv').config();
declare function require(name: string);
const jwt = require('jsonwebtoken');
import { AES, enc } from 'crypto-js';
import { Request, Response } from 'express';
import moment from 'moment';
import helper from '../helper/bcrypt';
import mailEvents from '../events/notification';
import otpEvents from '../helper/otp';
import logger from '../lib/logger';
import pool from '../lib/postgresql';
import responseTemplate from '../helper/responseTemplate';
import { EXPIRE_TIME, MAX_FAILED_ATTEMPT_COUNT, FAILED_ATTEMPT_TIME_LIMIT_MINUTE } from '../constant';
import Template from '../helper/responseTemplate';
import { AuthService } from '../service/authService';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import { response } from 'express';
import { AuthModel } from '../models/authModel';
import redisConnector from '../lib/redis-connector';
import { appSettingsRepository } from '../repositories/redis-repositories';
import { REDIS_CONSTANTS } from '../constant/redis-constants';
import { Entity } from 'redis-om';
import HelperIndex from '../helper';
const otpConfig = global['configuration'].otp;
// const saltRounds = 10;

class authController {
    static async getMaintenanceStatus(req, res) {
        try {
            logger.info('inside get maintenance status', req.body);
            const response = await AuthService.getMaintenanceStatus();
            return res.status(200).json(response?.rows);
        } catch (error) {
            logger.error('Error in getting maintenance status:', error);
            return res.status(500).json(Template.error('Error in fetching maintenance status'));
        }
    }

    static async addNewMaintenanceStatus(req, res) {
        try {
            if (!req.user) {
                return res.json(Template.errorMessage(ErrorMessage.UNAUTHORIZED));
            }
            const { user_id, first_name, last_name, roles } = req.user;
            logger.info('inside start maintenance', req.body);
            let userName = first_name + ' ' + last_name;
            const response = await AuthService.addnewmaintenance(req.body, user_id, userName);
            return res.status(200).json(response);
        } catch (err) {
            logger.error('Error in starting maintenance:', err);
            res.status(500).json(Template.error('Technical Error', 'There is some issue occurred while starting maintenance.'));
        }
    }

    static async updateMaintenanceStatus(req, res) {
        const { user_id, first_name, last_name, roles } = req.user;
        logger.info('inside start maintenance', req.body);
        try {
            let userName = first_name + ' ' + last_name;
            const response = await AuthService.updateMaintenance(req.body, user_id, userName);
            return res.status(200).json(response);
        } catch (err) {
            logger.error('Error Updating Maintenace status', err);
            res.status(500).json(Template.error('Technical Error', 'There is some issue occurred while Updating maintenance status.'));
        }
    }

    static async checkOtpGenerationLimit(distributorId: string, type: string) {
        try {
            logger.info('AuthController.checkOtpGenerationLimit controller', +distributorId);
            const { rows } = await AuthService.getRetryOTPCount(distributorId, type);
            if (rows && rows.length) {
                logger.info('inside AuthController -> checkOtpGenerationLimit -> rows', { rows: rows, distributorId: distributorId, type: type });
                const retryCountLimit = otpConfig.retryCountLimit ? parseInt(otpConfig.retryCountLimit) : 5;
                const retryIntervalLimit = otpConfig.retryIntervalLimit ? parseInt(otpConfig.retryIntervalLimit) : 60;
                if (rows[0].retry_count && rows[0].retry_time && parseInt(rows[0].retry_count) >= retryCountLimit) {
                    const retryTime = moment(rows[0].retry_time);
                    const now = moment();
                    const diff = now.diff(retryTime, 'minutes');
                    if (diff >= retryIntervalLimit) {
                        await AuthService.updateOTPRetry(distributorId, type);
                    } else {
                        const retryTimeLeft = retryTime.add(retryIntervalLimit, 'minutes').diff(now, 'minutes') + 1;
                        return { success: false, retryTimeLeft };
                    }
                }
            }
        } catch (error) {
            logger.error(`Error in AuthController.checkOtpGenerationLimit: DB: ${distributorId} `, error);
        }
        return { success: true };
    }

    static async checkInvalidOtpEnteredLimit(distributorId: string, type: string) {
        try {
            logger.info('AuthController.checkInvalidOtpEnteredLimit controller');
            const { rows } = await AuthService.getInvalidCount(distributorId, type);
            if (rows && rows.length) {
                const invalidCountLimit = otpConfig.invalidCountLimit ? parseInt(otpConfig.invalidCountLimit) : 5;
                const invalidIntervalLimit = otpConfig.invalidIntervalLimit ? parseInt(otpConfig.invalidIntervalLimit) : 60;
                if (rows[0].invalid_count && rows[0].invalid_time && parseInt(rows[0].invalid_count) >= invalidCountLimit) {
                    const invalidTime = moment(rows[0].invalid_time);
                    const now = moment();
                    const diff = now.diff(invalidTime, 'minutes');
                    if (diff >= invalidIntervalLimit) {
                        await AuthService.updateOTPRetry(distributorId, type);
                    } else {
                        const retryTimeLeft = invalidTime.add(invalidIntervalLimit, 'minutes').diff(now, 'minutes') + 1;
                        return { success: false, retryTimeLeft };
                    }
                }
            }
        } catch (error) {
            logger.error(`Error in AuthController.checkInvalidOtpEnteredLimit: `, error);
        }
        return { success: true };
    }

    static async generateOtp(id: any) {
        try {
            logger.info(`Generate Otp controller: DB: ${id}`);
            await AuthModel.expireOTP(id);
        } catch (error) {
            logger.error(`Error in Generate OTP: `, error);
        }
        return HelperIndex.otp();
    }

    static async sendAndSaveOtp(otpData: { login_id: any; name: any; mobile: any; otp: any }) {
        try {
            logger.info('Send OTP Controller', otpData);
            // logic to send otp to registered mobile number and update the expiredAt & reference in otp table
            const otpEventResponse = await otpEvents.send_otp(otpData);
            if (otpEventResponse.status == 202) {
                logger.info('If OTP send save the otp into db', otpData);
                const referenceCode = otpEventResponse.data.id;
                const result = await AuthModel.sendAndSaveOTP(otpData.login_id, otpData.mobile, otpData.otp, referenceCode);
                if (result) {
                    logger.info('If success (otp update in db) return true', otpData);
                    return { success: true };
                } else {
                    logger.info('else fail (otp update in db) return false', otpData);
                    return { success: false };
                }
            } else {
                logger.info('else case (otp send failed) return false', otpData);
                return { success: false };
            }
        } catch (error) {
            logger.error(`Error in send OTP: DB: ${otpData.login_id}`, error);
            return { success: false };
        }
    }

    static async verifyOtp(otpData: { id: any; otp: any }) {
        try {
            logger.info('Verify OTP Controller');
            otpData.id = otpData.id.replace(/^0+/, '');
            const otp = parseInt(otpData.otp);
            const { rows } = await AuthModel.getOTPId(otpData.id, otp);
            const responseData = rows[0];
            if (responseData) {
                logger.info('If OTP is verified return success true');
                await AuthModel.resetInvalidOTPCount(otpData.id);
                return { success: true };
            } else {
                logger.info('else OTP not verified return success false');
                await AuthModel.updateInvalidOTPCount(otpData.id);
                return { success: false };
            }
        } catch (error) {
            logger.error(`Error in Verify OTP:`, error);
            return { success: false };
        }
    }

    static async getUserById(data: any) {
        try {
            logger.info('Get user details by Id Controller');
            const { id, req, res } = data;
            const { user } = req;

            if (user && user.id !== id) {
                return Template.errorMessage(ErrorMessage.UNAUTHORIZED);
            }

            const { rows } = await AuthModel.getUserProfileDetails(id);
            const userData = rows[0];

            if (userData) {
                logger.info('If user details found return user details' + id);
                return {
                    success: true,
                    msg: 'User data found',
                    userData,
                };
            } else {
                logger.info('If user details not found return user fails' + id);
                return {
                    success: false,
                    msg: 'User does not exist in system',
                    userData: null,
                };
            }
        } catch (error) {
            logger.error(`Error in Get User By Id: ${data.id}`, error);

            return {
                success: false,
                msg: 'Technical Error',
                userData: null,
            };
        }
    }

    static async getUserByDistributorId(id, cb) {
        try {
            logger.info('Get user by distributaion by Id');

            const { rows } = await AuthModel.getUserProfileDetails(id);
            if (rows) {
                logger.info('If data found return data');
                cb(null, rows[0]);
            } else {
                logger.info('If data not found return false');
                cb('User does not exist in system', null);
            }
        } catch (error) {
            logger.error(`Error in Get User by distribution id:`, error);
            cb('Technical Error', null);
        }
    }

    static async validateUser(req, res) {
        const UUID = req.headers['x-correlation-id'];
        const { body } = req;
        const { login_id } = body;
        let failedAttemptCount = 0;
        const failedAttemptLimit = MAX_FAILED_ATTEMPT_COUNT;
        try {
            logger.info('Validate user controller');
            const userData: any = await AuthService.getUserById(login_id);
            if (userData && userData.length) {
                logger.info('Check login Id exist');

                if (userData[0].status === 'INACTIVE') {
                    logger.info(`If user is inactive - ${login_id}`);
                    return res.status(401).json(Template.errorMessage(ErrorMessage.USER_INACTIVE));
                }

                const buildTokenPayload = {
                    id: userData[0].id,
                    name: userData[0].name,
                    email: userData[0].email,
                    type: userData[0].type,
                };
                const bytes = AES.decrypt(body.password, 'qwerty987secret');
                const decryptedPassword = bytes.toString(enc.Utf8);

                const flag = helper.comparePassword(decryptedPassword, userData[0].password);
                const responseData = await AuthService.getLastFailedAttemptCount(login_id);
                if (responseData?.length) {
                    const timeLimitInMillis = FAILED_ATTEMPT_TIME_LIMIT_MINUTE * 60 * 1000;
                    const lastFailureTime = responseData[responseData.length - 1]['failed_attempt_time'] ?? timeLimitInMillis + 1;
                    const failureTimeDifference = Date.now() - new Date(lastFailureTime).getTime();
                    const totalFailureAttempts = responseData[responseData.length - 1]['failed_attempts_count'];
                    if (totalFailureAttempts % failedAttemptLimit === 0 && failureTimeDifference <= timeLimitInMillis) {
                        return res.status(401).json(Template.timeLimitExceeded(ErrorMessage.LIMIT_EXCEEDED, totalFailureAttempts, lastFailureTime));
                    }
                }
                failedAttemptCount = responseData.length && responseData[responseData.length - 1].failed_attempts_count;
                if (flag) {
                    failedAttemptCount = 0;
                    await AuthService.insertSession({
                        failedAttemptCount,
                        login_id,
                        UUID,
                    });
                    logger.info('If password match return true');
                    jwt.sign(helper.buildUserToken(buildTokenPayload), process.env.SECRET_KEY, { expiresIn: EXPIRE_TIME }, (tokError, token) => {
                        return res.status(200).json({
                            success: true,
                            message: SuccessMessage.LOGIN,
                            token,
                        });
                    });
                } else {
                    failedAttemptCount++;
                    const sessionData = await AuthService.insertSession({
                        failedAttemptCount,
                        login_id,
                        UUID,
                    });
                    logger.info('If password does not match');
                    return res.status(401).json(Template.userdoesNotExist(ErrorMessage.INVALID_CREDS, failedAttemptCount, sessionData.rows[0]?.failed_attempt_time));
                }
            } else {
                logger.info('If Login Id does not match');
                return res.status(403).json(Template.userdoesNotExist(ErrorMessage.NOT_FOUND_BY_ID));
            }
        } catch (error) {
            failedAttemptCount++;
            await AuthService.insertSession({
                failedAttemptCount,
                login_id,
                UUID,
            });
            logger.error(`Error in login:`, error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR, ErrorMessage.LOGIN_ERROR));
        }
    }

    static async resetPassword(login_id, new_password, callback) {
        try {
            logger.info('Reset Password controller');
            login_id = login_id.replace(/^0+/, '');
            // just generate password and send new password on mail
            const { rows } = await AuthModel.getUserProfileById(login_id);

            const userData = rows;
            if (userData) {
                logger.info('If login Id exist');
                let password = HelperIndex.generateRandomNumber().toString(36).slice(2);
                if (new_password && new_password != null && new_password != '') {
                    const bytes = AES.decrypt(new_password, 'qwerty987secret');
                    password = bytes.toString(enc.Utf8);
                }
                const hash = helper.generateSaltValue(password);
                const { rows } = await AuthModel.setPassword(hash, login_id);
                const userData = rows && rows[0];
                if (!userData || userData.length === 0) {
                    logger.info('Error occurred while updating record');
                    callback('Error occurred while updating record');
                } else {
                    logger.info('Send the mail');
                    mailEvents.emit('forgotPassword', userData, password);
                    callback(null, 'done');
                }
            } else {
                logger.info('User does not exist in system with this distributor id');
                callback('User does not exist in system with this distributor id');
            }
        } catch (error) {
            logger.error(`Error in Reset Password:`, error);
            callback('Technical Error');
        }
    }

    static async refreshToken(req, res, cb) {
        try {
            logger.info('Refresh Token controller');
            // validate token here is its valid here
            const token = req.headers.authorization;
            if (token) {
                logger.info('If token exist');
                jwt.verify(token, process.env.SECRET_KEY, (err, data) => {
                    if (err) {
                        logger.info('If token expired or invalid');
                        res.status(403).json(responseTemplate.commonAuthUserDataError());
                    } else {
                        logger.info('generate and return New token');
                        const buildTokenPayload = {
                            id: data.login_id,
                            name: data.name,
                            type: data.type,
                        };
                        jwt.sign(helper.buildUserToken(buildTokenPayload), process.env.SECRET_KEY, { expiresIn: EXPIRE_TIME }, (tokError, token) => {
                            cb(null, token);
                        });
                    }
                });
            } else {
                logger.info('if token not found');
                res.status(403).json(responseTemplate.tokenRequiredAuthError());
            }
        } catch (error) {
            logger.error(`Error in Refresh Token:`, error);
            res.status(500).json(responseTemplate.error('Technical Error', 'There may some error occurred in user validation'));
        }
    }

    static async changePassword(req, res) {
        try {
            logger.info('Change Password controller', req);
            const { body, user } = req;
            const login_id = user.id;
            const { current_password, new_password } = body;

            // generate random string
            let decryptedPassword = HelperIndex.generateRandomNumber().toString(36).slice(2);

            if (current_password && current_password !== null && current_password !== '') {
                const bytes = AES.decrypt(current_password, 'qwerty987secret');
                decryptedPassword = bytes.toString(enc.Utf8);
            }

            const userData = await AuthService.getUserById(login_id);

            // check if current_password match with stored password
            const flag = helper.comparePassword(decryptedPassword, userData[0].password);

            if (flag) {
                logger.info('If login Id exist in DB');
                let decryptedNewPassword = HelperIndex.generateRandomNumber().toString(36).slice(2);
                if (new_password && new_password !== null && new_password !== '') {
                    const bytes = AES.decrypt(new_password, 'qwerty987secret');
                    decryptedNewPassword = bytes.toString(enc.Utf8);
                }

                if (decryptedPassword === decryptedNewPassword) {
                    logger.error(`${ErrorMessage.SAME_PASSWORD}`);
                    return res.status(400).json(Template.errorMessage(ErrorMessage.SAME_PASSWORD));
                } else {
                    const hash = helper.generateSaltValue(decryptedNewPassword);
                    const updatedRows = await AuthService.updatePassword({
                        hash,
                        login_id,
                    });

                    if (!updatedRows && updatedRows.length === 0) {
                        logger.error(`${ErrorMessage.PASS_NOT_UPDATED}`);
                        return res.status(400).json(Template.errorMessage(ErrorMessage.PASS_NOT_UPDATED));
                    } else {
                        logger.info(`${SuccessMessage.PASS_UPDATED}`);
                        return res.json(Template.successMessage(SuccessMessage.PASS_UPDATED));
                    }
                }
            } else {
                logger.error(`${ErrorMessage.INCORRECT_PASSWORD}`);
                return res.status(400).json(Template.errorMessage(ErrorMessage.INCORRECT_PASSWORD));
            }
        } catch (error) {
            logger.error(`Error in change Password:`, error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR, ErrorMessage.CHANGE_PASSWORD_ERROR));
        }
    }

    static async getSessionLogs(req, res) {
        try {
            const { body } = req;
            const { from, to, type, login_id = '', search } = body;
            logger.info(`Session logs controller with date range from ${from} to ${to}`);

            const sessionLogs = await AuthService.getSessionLogs({
                type,
                from,
                to,
                login_id,
                search,
            });
            logger.info(`Session logs in Auth Controller: ${JSON.stringify(sessionLogs)}`);

            if (sessionLogs && sessionLogs.length > 0) {
                const fetchedCount = await AuthService.getTotalSessionLogsCount({
                    type,
                    from,
                    to,
                    login_id,
                    search,
                });

                const totalCount = fetchedCount && fetchedCount[0] && fetchedCount[0].count ? fetchedCount[0].count : 0;
                logger.info(`${SuccessMessage.FETCHED_SESSIONS}`);
                return res.json(Template.success({ totalCount, result: sessionLogs }, SuccessMessage.FETCHED_SESSIONS));
            } else {
                logger.error(`No session logs found`);
                return res.json(Template.successMessage(sessionLogs));
            }
        } catch (error) {
            logger.error(`Error in session logs:`, error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR, ErrorMessage.SESSIONS_ERROR));
        }
    }

    static async logout(req, res) {
        try {
            const { user } = req;
            let login_id = user.id;
            logger.info('Logout controller');

            const UUID = req.headers['x-correlation-id'];

            const result = await AuthService.insertSession({
                login_id,
                UUID,
            });

            if (result.rowCount === 1) {
                logger.info(SuccessMessage.LOGOUT);
                return res.json(Template.successMessage(SuccessMessage.LOGOUT));
            } else {
                logger.error(ErrorMessage.LOGOUT_ERROR_INSERT);
                return res.status(400).json(Template.errorMessage(ErrorMessage.LOGOUT_ERROR_INSERT));
            }
        } catch (error) {
            logger.error(`Error in logout:`, error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR, ErrorMessage.LOGOUT_ERROR_INSERT));
        }
    }

    static async getSSOUserDetail(req, res) {
        try {
            const { emailId } = req.params;
            logger.info('SSO user detail controller');
            const responseData = await AuthService.getSSOUserDetail(emailId);

            if (responseData && responseData.length > 0) {
                logger.info(SuccessMessage.SSO_USER_DETAILS);
                return res.json(Template.success(responseData, SuccessMessage.SSO_USER_DETAILS));
            } else {
                logger.error(ErrorMessage.NO_ACCESS);
                return res.json(Template.error(responseData, ErrorMessage.NO_ACCESS));
            }
        } catch (error) {
            logger.error('Error in SSO user details:', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR, ErrorMessage.SSO_DETAILS_ERROR));
        }
    }

    static async fetchAppLevelSettings(req, res) {
        logger.info(`inside AuthController.fetchAppLevelSettings`);
        try {
            let response = await AuthService.fetchAppLevelSettings();

            // let response: Entity | any = await appSettingsRepository.fetchAll(REDIS_CONSTANTS.APP_SETTINGS)

            // if (!Object.keys(response).length) {
            //   response = await AuthService.fetchAppLevelSettings();
            //   await appSettingsRepository.saveAll(REDIS_CONSTANTS.APP_SETTINGS, response)
            // }

            if (response && response) {
                return res.status(200).json(Template.success(response, SuccessMessage.APP_LEVEL_SETTINGS_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.APP_LEVEL_SETTINGS_ERROR));
        } catch (error) {
            logger.error(`catched error in AuthController.fetchAppLevelSettings: `, error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.APP_LEVEL_SETTINGS_ERROR));
        }
    }

    static async getActiveSessionReport(req: Request, res: Response) {
        logger.info('inside AuthController -> getActiveSessionReport');
        try {
            const { toDate, fromDate } = req.body;
            const response = await AuthService.getActiveSessionReport(toDate, fromDate);
            return res.status(200).json(Template.success(response, SuccessMessage.ACTIVE_SESSION_REPORT_FETCHED));
        } catch (error) {
            logger.error('CAUGHT: Error in AuthController -> getActiveSessionReport: ', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.TECHNICAL_ERROR));
        }
    }

    static async invalidateSession(req: Request, res: Response) {
        logger.info('inside AuthController -> invalidateSession');
        try {
            let data = {};
            data['UUID'] = req.body?.correlationId;
            data['login_id'] = req.body?.userId;
            data['role'] = req.body?.role;
            const result = await AuthService.insertSession(data);

            if (result.rowCount === 1) {
                logger.info(`${SuccessMessage.USER_INVALIDATE}`);
                return res.json(Template.successMessage(SuccessMessage.USER_INVALIDATE));
            } else {
                logger.error(`${ErrorMessage.INVALIDATION_ERROR}`);
                return res.status(400).json(Template.errorMessage(ErrorMessage.INVALIDATION_ERROR));
            }
        } catch (error) {
            logger.error('CAUGHT: Error in AuthController -> invalidateSession: ', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INVALIDATION_ERROR));
        }
    }

    static async insertAdminSession(req: Request, res: Response) {
        logger.info('Inside AuthController -> insertAdminSession');
        const data = {};
        try {
            data['login_id'] = req.body?.loginId;
            data['UUID'] = req.body?.correlationId;
            data['role'] = req['user']['roles'];
            data['failedAttemptCount'] = 0;
            const result = await AuthService.insertSession(data);

            if (result && result.rowCount === 1) {
                logger.info(`${SuccessMessage.INSERT_SESSION_LOG}`);
                return res.json(Template.successMessage(SuccessMessage.INSERT_SESSION_LOG));
            } else {
                logger.error(`${ErrorMessage.INSERT_SESSION_LOG_ERROR}`);
                return res.status(400).json(Template.errorMessage(ErrorMessage.INSERT_SESSION_LOG_ERROR));
            }
        } catch (error) {
            logger.error('CAUGHT: Error in AuthController -> insertAdminSession: ', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INSERT_SESSION_LOG_ERROR));
        }
    }

    static async invalidateOtherSessions(req: Request, res: Response) {
        logger.info('Inside AuthController -> invalidateOtherSessions');
        try {
            const { toDate, fromDate, sessionId, loginId } = req.body;
            const user_id = loginId || req['user']['email'];
            const response = await AuthService.invalidateOtherSessions(toDate, fromDate, sessionId, user_id);
            if (response !== null) {
                return res.status(200).json(Template.successMessage(SuccessMessage.INVALIDATE_OTHER_SESSIONS));
            }
            return res.status(500).json(Template.errorMessage(ErrorMessage.INVALIDATE_OTHER_SESSIONS));
        } catch (error) {
            logger.error('CAUGHT: Error in AuthController -> invalidateOtherSessions: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    }
}

export default authController;
