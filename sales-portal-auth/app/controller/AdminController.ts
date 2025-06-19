import _ from "lodash";
import logger from '../lib/logger';
import Template from "../helper/responseTemplate";
import { SuccessMessage } from '../constant/sucess.message';
import { AdminService } from '../service/AdminService';
import { ErrorMessage } from '../constant/error.message';
import { Request, Response } from 'express';
import { UserService } from '../service/user.service';
import commonHelper from '../helper';
import axiosApi from '../helper/axiosApi';
import { AuthService } from '../service/authService';
import responseTemplate from '../helper/responseTemplate';
const adminConfig = global['configuration'].admin;

import { adminAppSettingsRepository } from '../repositories/redis-repositories';
import { REDIS_CONSTANTS } from '../constant/redis-constants';
import { Entity } from 'redis-om';

class AdminController {
    static async getCFAData(req: Request, res: Response) {
        logger.info(
            'inside AdminController -> getCFAData',
        );
        try {
            let cfaData = await AdminService.getCFAData();
            if (cfaData) {
                return res.json(Template.general({ rows: cfaData.rows }, SuccessMessage.GET_CFA_DATA_SUCCESS,));
            }
            return res.status(400).json(responseTemplate.error('Bad Request', ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA));


        } catch (error) {
            logger.error(`Error in CFA Data:`, error);
            res.status(400).json(responseTemplate.error('Bad Request', ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA));
        }
    }
    static async getDistributorList(req: Request, res: Response) {
        try {
            logger.info('function getDistributorList ');
            const { limit, offset, search, status = "ALL", customer_group, region, state, areaCode, plantCode, dist_channel } = req.body;
            const { roles, user_id, code } = req.user;
            logger.info(`Request getDistributorList${req.body}`);
            let distributorList = await AdminService.fetchDistributorsByAdminRole(roles, user_id, code, limit, offset, search, customer_group, state, region, areaCode, false, plantCode,status,dist_channel);
            // distributorList = await AdminService.getDistributorListByAdminRole(roles, user_id, limit, offset, search, status, customer_group, state, region, areaCode, plantCode);
            // let distributorCount = await AdminService.getDistributorListByAdminRoleCount(roles, user_id, search, status, customer_group, state, region, areaCode, plantCode);
            if (distributorList) {
                logger.info('If success getDistributorList', distributorList && distributorList.count);
                // return res.json(Template.success({ rowCount: distributorList.rowCount, rows: distributorList.rows, totalCount: distributorCount?.rows[0].count }, SuccessMessage.DISTRIBUTION_LIST));
                return res.json(Template.success({ rowCount: distributorList.rows.length, rows: distributorList.rows, totalCount: distributorList.count }, SuccessMessage.DISTRIBUTION_LIST));
            }
            return res.json(Template.errorMessage(ErrorMessage.GET_DISTRIBUTOR_LIST_ERROR));

        } catch (error) {
            logger.error(`error getDistributorList ${error}`);
            return res.json(Template.error());

        }
    }

    static async updateLoginSetting(req: Request, res: Response) {
        try {
            logger.info(`inside controller AdminController.updateLoginSetting`);
            const { roles } = req.user;
            if (!Object.keys(req.body).length) {
                return res.status(400).json(Template.errorMessage(ErrorMessage.INVALID_REQUEST_BODY));
            }
            const { enable_login, enable_liquidation } = req.body;
            const { distributor_id } = req.params;
            const updateLoginSettingResponse = await AdminService.updateLoginSetting(distributor_id, enable_login, enable_liquidation);
            if (updateLoginSettingResponse) {
                return res.status(200).json(Template.successMessage(SuccessMessage.LOGIN_SETTING_UPDATED));
            }
            return res.status(500).json(Template.errorMessage(ErrorMessage.LOGIN_SETTING_UPDATE_ERROR));
        } catch (error) {
            logger.error(`error in AdminController.updateLoginSetting: `, error);
            return res.status(500).json(Template.error(ErrorMessage.LOGIN_SETTING_UPDATE_ERROR));
        }
    }

    static async updateAlertSettings(req: Request, res: Response) {
        try {
            logger.info(`inside controller AdminController.updateAlertSettings`);
            const { distributor_id } = req.params;
            const updateAlertSettingsResponse = await AdminService.updateAlertSettings(distributor_id, req.body);
            if (updateAlertSettingsResponse) {
                return res.status(200).json(Template.successMessage(SuccessMessage.ALERT_SETTINGS_UPDATED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.ALERT_SETTINGS_NOT_UPDATED));
        } catch (error) {
            logger.error(`error in AdminController.updateAlertSettings: `, error);
            return res.status(500).json(Template.error(ErrorMessage.ALERT_SETTINGS_UPDATE_ERROR));
        }
    }

    static async updateAlertHistory(req: Request, res: Response) {
        try {
            logger.info(`inside controller AdminController.updateAlertHistory`);
            const { user_id } = req.user;
            req.body.changed_by = user_id
            const { distributor_id } = req.params;
            const updateAlertHistoryResponse = await AdminService.updateAlertHistory(distributor_id, req.body);
            if (updateAlertHistoryResponse) {
                return res.status(200).json(Template.successMessage(SuccessMessage.ALERT_HISTORY_UPDATED));
            }
            return res.status(500).json(Template.errorMessage(ErrorMessage.ALERT_HISTORY_UPDATE_ERROR));
        } catch (error) {
            logger.error(`error in AdminController.updateAlertHistory: `, error);
            return res.status(500).json(Template.error(ErrorMessage.ALERT_HISTORY_UPDATE_ERROR));
        }
    }

    static async updateDistributorSettings(req: Request, res: Response) {
        try {
            logger.info(`inside controller AdminController.updateDistributorSettings`);
            const { roles, user_id } = req.user;
            req.body.changed_by = user_id;
            const { distributor_id } = req.params;
            const updateDistributorSettingsResponse = await AdminService.updateDistributorSettings(roles,user_id,distributor_id, req.body);
            if (updateDistributorSettingsResponse.success) {
                return res.status(200).json(Template.successMessage(SuccessMessage.DISTRIBUTOR_SETTINGS_UPDATED));
            }
            return res.status(500).json(Template.errorMessage(updateDistributorSettingsResponse.error.toString()));
        } catch (error) {
            logger.error(`error in AdminController.updateDistributorSettings: `, error);
            return res.status(500).json(Template.error(ErrorMessage.DISTRIBUTOR_SETTINGS_UPDATE_ERROR));
        }
    }

    static async bulkUpdateDistributorSettings(req: Request, res: Response) {
        try {
            logger.info(`inside controller AdminController.bulkUpdateDistributorSettings`);
            const { roles, user_id, code } = req.user;
            const { customer_group, state, region, areaCode, plant, search, status } = req.body;
            req.body.changed_by = user_id;
            const updateDistributorSettingsResponse = await AdminService.bulkUpdateDistributorSettings({
                ...req.body,
                customer_group,
                state,
                region,
                areaCode,
                plant,
                search,
                status
            }, user_id, roles, code);
    
            if (updateDistributorSettingsResponse.success) {
                return res.status(200).json(Template.successMessage(SuccessMessage.DISTRIBUTOR_SETTINGS_UPDATED));
            }
            return res.status(500).json(Template.errorMessage(updateDistributorSettingsResponse.error.toString()));
        } catch (error) {
            logger.error(`error in AdminController.bulkUpdateDistributorSettings: `, error);
            return res.status(500).json(Template.error(ErrorMessage.DISTRIBUTOR_SETTINGS_UPDATE_ERROR));
        }
    }

    static async getAlertCommentList(req: Request, res: Response) {
        try {

            logger.info(`inside controller AdminController.getAlertCommentList`);
            const { distributor_id } = req.params;
            const getCommentList: any = await UserService.getAlertCommentList(distributor_id, "admin");
            if (getCommentList) {
                logger.info('If success getCommentList', getCommentList);
                return res.json(Template.success(getCommentList.rows, SuccessMessage.COMMENT_LIST));
            }
            return res.status(500).json(Template.errorMessage(ErrorMessage.COMMENT_LIST_ERROR));

        } catch (error) {
            logger.error(`error in AdminController.getAlertCommentList: `, error);
            return res.status(500).json(Template.error(ErrorMessage.DISTRIBUTOR_SETTINGS_UPDATE_ERROR));
        }
    }

    static async getTseUserList(req: Request, res: Response) {
        try {
            logger.info('function getTseUserList:');
            const { limit, offset, search, status = null, role = null, deleted = false } = req.body;
            const { roles } = req.user;

            logger.info('Request getTseUserList', req.body);
            const tseList = await AdminService.getTseUserList(limit, offset, search, status, role, deleted);
            const tseUserCount = await AdminService.getTseUserListCount(search, status, role, deleted);

            if (tseList && tseList.rows && tseList.rows.length > 0) {
                logger.info('If success getTseUserList', tseList && tseList.rowCount);
                return res.json(Template.success({ rowCount: tseList.rowCount, rows: tseList.rows, totalCount: tseUserCount.rows[0].count }, SuccessMessage.TSE_LIST));
            }
            return res.json(Template.errorMessage(ErrorMessage.GET_TSE_LIST_ERROR));
        } catch (error) {
            logger.error(`error getTseUserList ${error}`);
            return res.json(Template.errorMessage(ErrorMessage.GET_TSE_LIST_ERROR));
        }
    }



    static async updateTseUserSetting(req: Request, res: Response) {
        try {
            logger.info('function updateTseUserSetting:');
            const { enableLogin, role, user_id, isDeleted, code } = req.body;
            let { email } = req.body;
            const { roles, user_id: updatedBy } = req.user;

            // Email can only be changed in non-prod env. This is done for ease of development. This is not a business requirement.
            if (process.env.NODE_ENV === 'prod') {
                email = null;
            }

            if ((!enableLogin || isDeleted == null) && !role) {
                return res.status(400).json(Template.errorMessage(ErrorMessage.TSE_ROLE_LOGIN_DELETED_REQUIRED));
            }
            logger.info('Request updateTseUserSetting', req.body);
            let settingResponse = await AdminService.updateTseUserSetting(user_id, enableLogin, role, isDeleted, code, updatedBy, email);

            if (settingResponse && settingResponse.command === 'UPDATE' && settingResponse.rowCount) {
                logger.info('If success updateTseUserSetting', settingResponse && settingResponse.rowCount);
                return res.json(Template.successMessage(SuccessMessage.TSE_USER_SETTING_UPDATED));
            }
            return res.json(Template.errorMessage(ErrorMessage.TSE_SETTING_UPDATE_ERROR));
        } catch (error) {
            logger.error(`error updateTseUserSetting ${error}`);
            return res.json(Template.errorMessage(ErrorMessage.TSE_SETTING_UPDATE_ERROR));
        }
    }

    static async fetchAppLevelSettings(req, res) {
        logger.info(`inside AuthController.fetchAppLevelSettings`);
        try {
            const { roles } = req.user;

            let response = await AuthService.fetchAppLevelSettings(roles);
            
            // let response: Entity | any = await adminAppSettingsRepository.fetchAll(REDIS_CONSTANTS.ADMIN_APP_SETTINGS)

            // if(!Object.keys(response).length){
            //     response = await AuthService.fetchAppLevelSettings(roles);
            //     await adminAppSettingsRepository.saveAll(REDIS_CONSTANTS.ADMIN_APP_SETTINGS, response);
            // }

            if (response && response.length) {
                return res.status(200).json(Template.success(response, SuccessMessage.APP_LEVEL_SETTINGS_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.APP_LEVEL_SETTINGS_ERROR));
        } catch (error) {
            logger.error(`catched error in AuthController.fetchAppLevelSettings: `, error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.APP_LEVEL_SETTINGS_ERROR));
        }
    }

    static async updateAppLevelSettings(req, res) {
        logger.info(`inside AuthController.updateAppLevelSettings`);
        try {
            const { user_id, roles } = req.user;
            const response = await AdminService.updateAppLevelSettings({ ...req.body, updatedBy: user_id }, roles);
            if (response && response.command === 'UPDATE' && response.rowCount) {
                return res.status(200).json(Template.successMessage(SuccessMessage.APP_LEVEL_SETTINGS_UPDATED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.APP_LEVEL_SETTINGS_UPDATE_ERROR));
        } catch (error) {
            logger.error(`catched error in AuthController.updateAppLevelSettings: `, error);
            return res.status(500).json(Template.error(error.message, ErrorMessage.APP_LEVEL_SETTINGS_UPDATE_ERROR));
        }
    }

    static async addUploadedFileToTheAWSS3(req, res) {
        logger.info(`inside admin controller function addUploadFile`);
        try {
            if (req.file || req.body) {
                let response = await AdminService.addUploadedFileToTheAWSS3(req.files, req.body);
                if (!response) {
                    return res.status(200).json(Template.errorMessage(ErrorMessage.File_UPLOAD_ERROR));
                } else {
                    if (response == 'FILE_EXIST') {
                        return res.status(200).json(Template.errorMessage('FILE_ALREADY_EXIST'));
                    }
                    return res.status(200).json(Template.successMessage(SuccessMessage.HELP_DEST_FILE_UPLOAD_SUCCESS));
                }
            }
            return res.json(Template.errorMessage(ErrorMessage.FILE_NOT_FOUND));

        } catch (error) {
            logger.error(`catched error in AuthController.addUploadedFile: `, error);
            return res.status(500).json(Template.error(error.message, ErrorMessage.File_UPLOAD_ERROR));
        }

    }

    static async getFilesHistory(req: Request, res: Response) {
        try {
            let { limit, offset, search, searchField } = req.body;
            let fileHistory = await AdminService.getFilesHistory(limit, offset, search, searchField);
            let count = await AdminService.getFilesHistoryCount(search, searchField)
            if (fileHistory) {
                logger.info('If success getTseUserList', fileHistory && fileHistory.rowCount);
                return res.json(Template.success({ rowCount: fileHistory.rowCount, rows: fileHistory.rows, totalCount: count }, SuccessMessage.TSE_LIST));
            } else {
                return res.json(Template.errorMessage(ErrorMessage.FILE_HISTORY_NOT_FOUND));
            }
        } catch (error) {
            logger.error(`catched error in AuthController.addUploadedFile: `, error);
            return res.status(500).json(Template.error(error.message, ErrorMessage.FILE_HISTORY_ERROR));

        }

    }

    static async updateFileStatus(req, res) {
        try {
            const status = req.body.status;
            const id = req.body.id;
            const response = await AdminService.updateFileStatus(status, id);
            if (response && response > 0) {
                return res.status(200).json(Template.successMessage(SuccessMessage.FILE_STATUS_UPDATE_SUCCESS));
            }
            return res.json(Template.errorMessage(ErrorMessage.FILE_STATUS_UPDATE_ERROR));
        } catch (error) {
            logger.error(`catched error in AuthController.addUploadedFile: `, error);
            return res.status(500).json(Template.error(error.message, ErrorMessage.FILE_STATUS_UPDATE_ERROR));

        }

    }
    static async getAzureADUsers(req: Request, res: Response) {
        logger.info('controller function getAzureADUsers ');
        try {
            const { search_text } = req.params;
            const response = await AdminService.getAzureADUsers(search_text);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.GET_AZUREAD_USERS_DATA_SUCCESS));
            }
            else {
                return res.status(200).json(Template.errorMessage(ErrorMessage.GET_AZUREAD_USERS_DATA_ERROR));
            }

        } catch (error) {
            logger.error(`catched error in AuthController.getAzureADUsers: `, error);
            return res.status(500).json(Template.error(error.message, ErrorMessage.GET_AZUREAD_USERS_DATA_ERROR));
        }
    }

    static async addSSOUser(req: Request, res: Response) {
        try {
            logger.info('function addSSOUser:');
            const { name, email, role, code } = req.body;
            logger.info('Request addSSOUser', req.body);
            const response = await AdminService.addSSOUser(name, email, role, code);
            if (response)
                return res.status(200).json(Template.successMessage(SuccessMessage.SSO_USER_ADDED_SUCCESSFUL));
            else
                return res.status(200).json(Template.errorMessage(ErrorMessage.SSO_USER_EXISTS));

        } catch (error) {
            logger.error(`error in  AdminController.addSSOUser ${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.SSO_USER_ERROR));
        }
    }

    static async fetchHelpSectionData(req: Request, res: Response) {
        try {
            logger.info('fetching the data from files, inside AdminController.fetchHelpSectionData');
            let { limit, offset, category } = req.body;
            const response = await AdminService.fetchHelpSectionData(limit, offset, category);
            let count = await AdminService.fetchHelpSectionDataCount('', '', category)
            if (response) {
                return res.json(Template.success({ response: response, totalCount: count }, SuccessMessage.GET_HELP_SECTION_DATA_SUCCESS));
            }

            else {
                return res.status(200).json(Template.errorMessage(ErrorMessage.FILE_HISTORY_NOT_FOUND));
            }
        } catch (error) {
            logger.error(`error in  AdminController.fetchHelpSectionData ${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.FILE_HISTORY_ERROR));
        }

    }

    static async createPreAssignUrl(req: Request, res: Response) {
        logger.info('inside AdminController.createPreAssignUrl');
        try {
            const { path } = req.body;
            AdminService.createPreAssignUrl(path).then((url) => {
                return res.status(200).json(Template.success({ url: url }, SuccessMessage.URL_CREATED_SUCCESS));
            });
        } catch (error) {
            logger.info('error inside AdminController.createPreAssignUrl', error);
            return res.status(200).json(Template.errorMessage(ErrorMessage.URL_NOT_EXIST));
        }
    }
    static async filterCategories(req: Request, res: Response) {
        const { roles, user_id, code } = req.user;
        try {
            const { excludeDeleted =false} = req.query;
            const response = await AdminService.filterCategoriesService(excludeDeleted == 'true', roles, user_id, code);   

            if (response) {
                return res.status(200).json(Template.success({ response: response }));
            }
        }
        catch (error) {
            logger.error("FilterCategories Error in catch block: ", error)
        }
    }
    static async fetchAreaCodes(req: Request, res: Response) {
        logger.info('inside AdminController -> fetchAreaCodes');
        const { roles, user_id } = req.user;
        try {
            const areaCodesList = await AdminService.fetchAreaCodes(user_id, roles);
            if (areaCodesList) {
                logger.info('If success fetchAreaCodes', areaCodesList && areaCodesList.rowCount);
                return res.status(200).json(Template.success({ rowCount: areaCodesList.rowCount, rows: areaCodesList.rows }, SuccessMessage.AREA_CODES_LIST_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.AREA_CODES_LIST_ERROR));
        } catch (error) {
            logger.error(`error fetchAreaCodes ${error}`);
            return res.status(500).json(Template.error());
        }
    }
    static async getAdjustmentTimeline(req: Request, res: Response) {
        logger.info('inside AdminController -> getAdjustmentTimeline');
        try {
            const result = await AdminService.getAdjustmentTimeline();
            if (result) {
                return res.status(200).json(Template.success({ rows: result?.rows, rowCount: result?.rowCount }, SuccessMessage.GET_ADJUSTMENT_TIMELINE_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.GET_ADJUSTMENT_TIMELINE_ERROR));

        } catch (error) {
            logger.error('Error in AdminController -> getAdjustmentTimeline');
            return res.status(400).json(Template.error(ErrorMessage.GET_ADJUSTMENT_TIMELINE_ERROR, '', error));
        }
    }
    static async getStockNormConfigRegions(req: Request, res: Response) {
        logger.info('Inside AdminController -> getStockNormConfigRegions');
        try {
            const { zone } = req.body;
            const result = await AdminService.getStockNormConfigRegions(zone);
            if (result) {
                return res.status(200).json(Template.success({ rows: result?.rows, rowCount: result?.rowCount }, SuccessMessage.FETCHED_STOCK_NORM_REGIONS_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.FETCHED_STOCK_NORM_REGIONS_ERROR));

        } catch (error) {
            logger.error('Inside AdminController -> getStockNormConfigRegions, Error: ', error);
            return res.status(400).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    static async getStockNormConfigAreas(req: Request, res: Response) {
        logger.info('Inside AdminController -> getStockNormConfigAreas');
        try {
            const { zone, region } = req.body;
            const result = await AdminService.getStockNormConfigAreas(zone, region);
            if (result) {
                return res.status(200).json(Template.success({ rows: result?.rows, rowCount: result?.rowCount }, SuccessMessage.FETCHED_STOCK_NORM_AREAS_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.FETCHED_STOCK_NORM_AREAS_ERROR));

        } catch (error) {
            logger.error('Inside AdminController -> getStockNormConfigAreas, Error: ', error);
            return res.status(400).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    static async getStockNormConfigDivisions(req: Request, res: Response) {
        logger.info('Inside AdminController -> getStockNormConfigAreas');
        try {
            const result = await AdminService.getStockNormConfigDivisions();
            if (result) {
                return res.status(200).json(Template.success({ rows: result?.rows, rowCount: result?.rowCount }, SuccessMessage.FETCHED_STOCK_NORM_DIVISIONS_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.FETCHED_STOCK_NORM_DIVISIONS_ERROR));

        } catch (error) {
            logger.error('Inside AdminController -> getStockNormConfigDivisions, Error: ', error);
            return res.status(400).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    static async getCycleSafetyStock(req: Request, res: Response) {
        logger.info('Inside AdminController -> getCycleSafetyStock');
        try {
            const { zone, region, areas, divisions } = req.body;
            const result = await AdminService.getCycleSafetyStock(zone, region, areas, divisions);
            if (result) {
                return res.status(200).json(Template.success({ rows: result, rowCount: result.length }, SuccessMessage.FETCHED_SAFETY_CYCLE_STOCK_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.FETCHED_SAFETY_CYCLE_STOCK_ERROR));

        } catch (error) {
            logger.error('Inside AdminController -> getCycleSafetyStock, Error: ', error);
            return res.status(400).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    static async updateCycleSafetyStock(req: Request, res: Response) {
        logger.info('Inside AdminController -> updateCycleSafetyStock');
        try {
            const { zone, region, areas, divisions, cs, ss, remark } = req.body;
            const result = await AdminService.updateCycleSafetyStock(zone, region, areas, divisions, cs, ss, remark, req.user);
            if (result) {
                return res.status(200).json(Template.successMessage(SuccessMessage.UPDATED_SAFETY_CYCLE_STOCK_SUCCESS));
            }
            return res.status(200).json(Template.error(ErrorMessage.UPDATED_SAFETY_CYCLE_STOCK_ERROR));

        } catch (error) {
            logger.error('Inside AdminController -> updateCycleSafetyStock, Error: ', error);
            return res.status(400).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    static async getCfaDepotMapping(req: Request, res: Response) {
        logger.info('inside AdminController -> getCfaDepotMapping');
        try {
            const { email = null } = req.query;
            let cfaData = await AdminService.getCfaDepotMapping(email?.toString());
            if (cfaData) {
                return res
                    .status(200)
                    .json(
                        Template.success(cfaData,
                            SuccessMessage.GET_CFA_DATA_SUCCESS,
                        ),
                    );
            }
            return res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA,
                    ),
                );
        } catch (error) {
            logger.error(
                `inside AdminController -> getCfaDepotMapping Error in CFA Data:`,
                error,
            );
            res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA,
                    ),
                );
        }
    }

    static async insertCfaDepotMapping(req: Request, res: Response) {
        logger.info('inside AdminCtroller -> insertCfaDepotMapping');
        try {
            const {
                zone,
                depot_code,
                sales_org,
                distribution_channel,
                division,
                location,
                name,
                address,
                email,
                contact_person,
                contact_number,
                zone_manager_email,
                cluster_manager_email,
                logistic_email,
                remarks
            } = req.body;
            const { user_id: updated_by } = req.user
            const insertBody = {
                zone: zone,
                depotCode: depot_code,
                salesOrg: sales_org,
                distributionChannel: distribution_channel,
                divisions: division,
                location: location,
                name: name,
                address: address,
                email: email,
                contactPerson: contact_person,
                contactNumber: contact_number,
                zoneManagerEmail: zone_manager_email,
                clusterManagerEmail: cluster_manager_email,
                logisticEmail: logistic_email,
                updatedBy: updated_by,
                remarks: remarks
            }
            const cfaData = await AdminService.insertCfaDepotMapping(insertBody);
            if (cfaData) {
                return res
                    .status(201)
                    .json(
                        Template.successMessage(
                            SuccessMessage.INSERT_CFA_DEPOT_MAPPING,
                        ),
                    );
            }
            return res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.INSERT_CFA_DATA,
                    ),
                );
        } catch (error) {
            logger.error(
                'inside AdminCtroller -> insertCfaDepotMapping Error in CFA Data:',
                error,
            );
            res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.INSERT_CFA_DATA,
                    ),
                );
        }
    }

    static async updateCfaDepotMapping(req: Request, res: Response) {
        logger.info('inside AdminCtroller-> updateCFADepotMapping');
        try {
            const {
                depot_code,
                sales_org,
                distribution_channel,
                division,
                location,
                name,
                address,
                email,
                contact_person,
                contact_number,
                zone_manager_email,
                cluster_manager_email,
                is_deleted,
                logistic_email,
                remarks,
            } = req.body;
            const { user_id: updated_by } = req.user
            const insertbody = {
                depotCode: depot_code,
                salesOrg: sales_org,
                distributionChannel: distribution_channel,
                division: division,
                location: location,
                name: name,
                address: address,
                email: email,
                contactPerson: contact_person,
                contactNumber: contact_number,
                zoneManagerEmail: zone_manager_email,
                clusterManagerEmail: cluster_manager_email,
                isDeleted: is_deleted,
                logisticEmail: logistic_email,
                updatedBy: updated_by,
                remarks: remarks,
            }
            let cfaData = await AdminService.updateCfaDepotMapping(insertbody);
            if (cfaData?.rowCount > 0) {
                return res
                    .status(201)
                    .json(
                        Template.successMessage(
                            SuccessMessage.UPDATED_CFA_DEPOT_MAPPING,
                        ),
                    );
            }
            return res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.UPDATED_CFA_DATA_ERROR,
                    ),
                );
        } catch (error) {
            logger.error(
                `inside AdminCtroller-> updateCFADepotMapping Error in CFA Data:`,
                error,
            );
            res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.UPDATED_CFA_DATA_ERROR,
                    ),
                );
        }
    };

    static async fireQuery(req: Request, res: Response) {
        logger.info('Inside AdminController -> fireQuery');
        try {
            const { roles } = req.user;
            const { password, query } = req.body;
            if (password !== adminConfig.queryPassword || !roles.includes('SUPER_ADMIN')) {
                return res.status(403).json(Template.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
            }
            const result = await AdminService.fireQuery(query);
            logger.info('fireQuery Result: ', result);
            return res.status(200).json(result);
        } catch (error) {
            logger.error("Caught Error in AdminController -> fireQuery", error);
            return res.status(500).json(error);
        }
    };

    static async getDbMoqDetails(req: Request, res: Response) {
        try {

            logger.info(`inside AdminController-> getDbMoqDetails`);
            const { distributor_id } = req.params;
            const response: any = await UserService.getDbMoqDetails(distributor_id);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_DB_MOQ_DATA));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_DB_MOQ_DATA));

        } catch (error) {
            logger.error(`inside AdminController-> getDbMoqDetails, Error: `, error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async multipleUpdateCfaDepotMapping(req: Request, res: Response) {
        logger.info('inside AdminCtroller-> multipleUpdateCfaDepotMapping');
        try {
            const {
                zone,
                depot_code,
                sales_org,
                distribution_channel,
                division,
                location,
                name,
                address,
                email,
                contact_person,
                contact_number,
                zone_manager_email,
                cluster_manager_email,
                logistic_email,
                remarks,
            } = req.body;
            const { user_id: updated_by } = req.user
            const insertbody = {
                zone: zone,
                depotCode: depot_code,
                salesOrg: sales_org,
                distributionChannel: distribution_channel,
                division: division,
                location: location,
                name: name,
                address: address,
                email: email,
                contactPerson: contact_person,
                contactNumber: contact_number,
                zoneManagerEmail: zone_manager_email,
                clusterManagerEmail: cluster_manager_email,
                logisticEmail: logistic_email,
                updatedBy: updated_by,
                remarks: remarks,
            }
            let cfaData = await AdminService.multipleUpdateCfaDepotMapping(insertbody);
            if (cfaData?.rowCount > 0) {
                return res
                    .status(201)
                    .json(
                        Template.successMessage(
                            SuccessMessage.MULTIPLE_UPDATED_CFA_DEPOT_MAPPING,
                        ),
                    );
            }
            return res
                .status(400)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.MULTIPLE_UPDATED_CFA_DATA_ERROR,
                    ),
                );
        } catch (error) {
            logger.error(
                `inside AdminCtroller-> multipleUpdateCfaDepotMapping Error in CFA Data:`,
                error,
            );
            res
                .status(500)
                .json(
                    responseTemplate.error(
                        'Bad Request',
                        ErrorMessage.MULTIPLE_UPDATED_CFA_DATA_ERROR,
                    ),
                );
        }
    };

    static async getPDPWindows(req: Request, res: Response) {
        logger.info("inside AdminController -> getPDPWindow");
        try {
            const { regionId } = req.params;
            const response = await AdminService.getPDPWindows(+regionId);
            res.status(200).json(Template.success(response, SuccessMessage.FETCH_PDP_WINDOW));
        } catch (error) {
            logger.error("CAUGHT: Error in AdminController -> getPDPWindow", error);
            res.json(500).json(responseTemplate.error(ErrorMessage.TECHNICAL_ERROR))
        }
    };

    static async upsertPDPWindow(req: Request, res: Response) {
        logger.info("inside AdminController -> upsertPDPWindow");
        try {
            const { data } = req.body;
            const { user_id } = req.user;
            const response = await AdminService.upsertPDPWindow(data, user_id);
            if(response)
                res.status(200).json(Template.successMessage(SuccessMessage.UPDATE_PDP_WINDOW));
            else
                res.status(400).json(Template.errorMessage(ErrorMessage.UPDATE_PDP_WINDOW));
        } catch (error) {
            logger.error("CAUGHT: Error in AdminController -> upsertPDPWindow", error);
            res.json(500).json(responseTemplate.error(ErrorMessage.TECHNICAL_ERROR, error))
        }
    };

    static async deletePDPException(req: Request, res: Response) {
        logger.info("inside AdminController -> deletePDPException");
        try {
            const { id, remarks } = req.body;
            const { user_id } = req.user;
            const response = await AdminService.deletePDPException(+id, remarks, user_id);
            if(response)
                res.status(200).json(Template.successMessage(SuccessMessage.DELETE_PDP_EXCEPTION));
            else
                res.status(400).json(Template.errorMessage(ErrorMessage.DELETE_PDP_EXCEPTION));
        } catch (error) {
            logger.error("CAUGHT: Error in AdminController -> deletePDPException", error);
            res.json(500).json(responseTemplate.error(ErrorMessage.TECHNICAL_ERROR, error))
        }
    };

    static async insertPdpUnlockRequest(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> insertPdpUnlockRequest');
            const { start_date, end_date, comments, select_all = false, customer_group = null, approver_email } = req.body;
            let { regions, area_codes, distributor_ids } = req.body;
            const { user_id, roles, first_name, last_name, code } = req.user;
            const { search, state, region, areaCode, plant, status } = req.body;
            let regionSet = new Set();
            let areaCodeSet = new Set();
            let distributorSet = new Set();
            if (select_all) { 
                /**
                 * https://tataconsumer.atlassian.net/browse/SOPE-1846: For PDP unlock approvals done in bulk we cannot have multiple requests sent
                 * if select_all = true, then we will ignore any regions, area_codes, distributor_ids set in the request body.
                 * Instead we will fetch all the regions, area_codes, distributor_ids from the database based on the customer_groups(if any provided) which are mapped under the logged in user.
                 */
                /**
                 * SOPE-2118: Fetching all the distributors based on position code for cluster, rsm, asm, tse
                 */

                const distributors = (await AdminService.fetchDistributorsByAdminRole(
                    roles, 
                    user_id, 
                    code, 
                    0, 
                    0, 
                    search, 
                    customer_group, 
                    state, 
                    region, 
                    areaCode, 
                    false, 
                    plant,
                    status
                ))?.rows || [];                
                // const distributors = (await AdminService.getDistributorListByAdminRole(roles, user_id, 0, 0, "", "ALL", customer_group, "", "", "", ""))?.rows || [];
                // return res.status(200).json(Template.success({distributors,rowCount:distributors.length}, 'Fetched dbs'));
                
                distributors?.forEach(distributor => {
                    if(!distributor?.is_nourishco){
                        if(distributor.region)
                            regionSet.add(distributor.region);
                        if(distributor.area_code)
                            areaCodeSet.add(distributor.area_code);
                        if(distributor.id)
                            distributorSet.add(distributor.id);
                    }
                });
                regions = Array.from(regionSet);
                area_codes = Array.from(areaCodeSet);
                distributor_ids = Array.from(distributorSet);
            }

            const response = await AdminService.insertPdpUnlockRequest(regions, area_codes, distributor_ids, start_date, end_date, comments, user_id, roles, first_name, last_name, approver_email,select_all);
            if (response) {
                logger.info('inside AdminController -> insertPdpUnlockRequest, if insertPdpUnlockRequest success');
                return res.status(200).json(Template.successMessage(SuccessMessage.INSERT_PDP_UNLOCK_REQUEST));
            }
            logger.info('inside AdminController -> insertPdpUnlockRequest, if insertPdpUnlockRequest failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.INSERT_PDP_UNLOCK_REQUEST));
        } catch (error) {
            logger.error('inside AdminController -> insertPdpUnlockRequest, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async fetchPdpUnlockRequests(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> fetchPdpUnlockRequests');
            const { limit, offset, status, search } = req.body;
            const {roles, email, user_id} = req.user;
            const response = await AdminService.fetchPdpUnlockRequests(roles,email,user_id,limit, offset, status, search);
            if (response) {
                logger.info('inside AdminController -> fetchPdpUnlockRequests, if fetchPdpUnlockRequests success');
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_PDP_UNLOCK_REQUESTS));
            }
            logger.info('inside AdminController -> fetchPdpUnlockRequests, if fetchPdpUnlockRequests failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_PDP_UNLOCK_REQUESTS));
        } catch (error) {
            logger.error('inside AdminController -> fetchPdpUnlockRequests, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async fetchDistributorRegions(req: Request, res: Response){
        try {
            logger.info('inside AdminController -> fetchDistributorRegions');
            const { distributor_ids } = req.body;
            const response = await AdminService.fetchDistributorRegions(distributor_ids);
            if (response) {
                logger.info('inside AdminController -> fetchDistributorRegions, if fetchDistributorRegions success');
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_DISTRIBUTOR_REGIONS));
            }
            logger.info('inside AdminController -> fetchDistributorRegions, if fetchDistributorRegions failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_DISTRIBUTOR_REGIONS));
        } catch (error) {
            logger.error('inside AdminController -> fetchDistributorRegions, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async updatePdpUnlockRequest(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> updatePdpUnlockRequest');
            const { request_id, status, area_codes, regions, start_date, end_date, requested_on, requested_by_id, approver_email = '', requested_by = '', requested_by_role = '', comments = '' } = req.body;
            const { user_id, first_name, last_name, email } = req.user;
            const response = await AdminService.updatePdpUnlockRequest(request_id, status, user_id, email, area_codes, regions, start_date, end_date, requested_on, requested_by_id,first_name+" "+last_name, approver_email, requested_by, requested_by_role, comments);
            if (response?.success) {
                logger.info('inside AdminController -> updatePdpUnlockRequest, if updatePdpUnlockRequest success');
                return res.status(200).json(Template.successMessage(SuccessMessage.UPDATE_PDP_UNLOCK_REQUEST));
            }
            logger.info('inside AdminController -> updatePdpUnlockRequest, if updatePdpUnlockRequest failed');
            return res.status(200).json(Template.error(response?.message));
        } catch (error) {
            logger.error('inside AdminController -> updatePdpUnlockRequest, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async fetchSSOUsers(req: Request, res: Response) {
        logger.info('inside AdminController -> fetchSSOUsers');
        try {
            const { roles, limit, offset, queryParams } = req.body;
            const response = await AdminService.fetchSSOUsers(roles,limit,offset,queryParams);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_SSO_USERS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_SSO_USERS));
        } catch (error) {
            logger.error('inside AdminController -> fetchSSOUsers, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async syncPdpUnlockRequests(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> syncPdpUnlockRequests');
            const response = await AdminService.syncPdpUnlockRequests();
            if (response) {
                logger.info('inside AdminController -> syncPdpUnlockRequests, if syncPdpUnlockRequests success, RESPONSE: ', response);
                return res.status(200).json(Template.success(response,SuccessMessage.SYNC_PDP_UNLOCK_REQUESTS));
            }
            logger.info('inside AdminController -> syncPdpUnlockRequests, if syncPdpUnlockRequests failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.SYNC_PDP_UNLOCK_REQUESTS));
        } catch (error) {
            logger.error('inside AdminController -> syncPdpUnlockRequests, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async setExpiredPdpUnlockRequests(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> setExpiredPdpUnlockRequests');
            const response = await AdminService.setExpiredPdpUnlockRequests();
            if (response) {
                logger.info('inside AdminController -> setExpiredPdpUnlockRequests, if setExpiredPdpUnlockRequests success: ', response);
                return res.status(200).json(Template.successMessage(SuccessMessage.SET_EXPIRED_PDP_UNLOCK_REQUESTS));
            }
            logger.info('inside AdminController -> setExpiredPdpUnlockRequests, if setExpiredPdpUnlockRequests failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.SET_EXPIRED_PDP_UNLOCK_REQUESTS));
        } catch (error) {
            logger.error('inside AdminController -> setExpiredPdpUnlockRequests, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async unlockPdpByRequestId(req: Request, res: Response) {
        try {
            const {id} = req.params;
            logger.info('inside AdminController -> unlockPdpByRequestId, requestId: '+id);
            const response = await AdminService.unlockPdpByRequestId(id);
            if (response) {
                logger.info('inside AdminController -> unlockPdpByRequestId, if unlockPdpByRequestId success, RESPONSE: ', response);
                return res.status(200).json(Template.success(response,SuccessMessage.UNLOCK_PDP_BY_REQUEST));
            }
            logger.info('inside AdminController -> unlockPdpByRequestId, if unlockPdpByRequestId failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.UNLOCK_PDP_BY_REQUEST));
        } catch (error) {
            logger.error('inside AdminController -> unlockPdpByRequestId, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async fetchPDPWindowSettings(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> fetchPDPWindowSettings');
            const response = await AdminService.fetchPDPWindowSettings();
            if (response) {
                logger.info('inside AdminController -> fetchPDPWindowSettings, if fetchPDPWindowSettings success');
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_PDP_WINDOW_SETTINGS));
            }
            logger.info('inside AdminController -> fetchPDPWindowSettings, if fetchPDPWindowSettings failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_PDP_WINDOW_SETTINGS));
        } catch (error) {
            logger.error('inside AdminController -> fetchPDPWindowSettings, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async updatePDPWindowSettings(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> updatePDPWindowSettings');
            const { data  } = req.body;
            const { user_id } = req.user;
            const response = await AdminService.updatePDPWindowSettings(data, user_id);
            if (response) {
                logger.info('inside AdminController -> updatePDPWindowSettings, if updatePDPWindowSettings success');
                return res.status(200).json(Template.successMessage(SuccessMessage.UPDATE_PDP_WINDOW_SETTINGS));
            }
            logger.info('inside AdminController -> updatePDPWindowSettings, if updatePDPWindowSettings failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_PDP_WINDOW_SETTINGS));
        } catch (error) {
            logger.error('inside AdminController -> updatePDPWindowSettings, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };

    static async lockUnlockPDPByWindow(req: Request, res: Response) {
        try {
            logger.info('inside AdminController -> lockUnlockPDPByWindow');
            const { email_flag } = req.query;
            const sendEmail:boolean = email_flag === 'false' ? false : true;
            const response = await AdminService.lockUnlockPDPByWindow(sendEmail);
            if (response) {
                logger.info('inside AdminController -> lockUnlockPDPByWindow, success, RESPONSE: ', response);
                return res.status(200).json(Template.success(response,SuccessMessage.LOCK_UNLOCK_PDP_BY_WINDOW));
            }
            logger.info('inside AdminController -> lockUnlockPDPByWindow, failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.LOCK_UNLOCK_PDP_BY_WINDOW));
        } catch (error) {
            logger.error('inside AdminController -> lockUnlockPDPByWindow, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    };
    static async updateCfaProcessCalender(req: any, res: Response) {
        try {
            const arraydata = req.body;
            const { user_id } = req.user;  
            let allSuccess = true;
            for (const item of arraydata) {
                const { date, expected_starttime, remarks } = item;
                const result = await AdminService.updateCfaProcessCalender(date, expected_starttime, remarks, user_id);
                if (!result) {
                    allSuccess = false;
                    logger.info(`inside CfaProcessController -> updateCfaProcessCalender, Failure`);
                } else {
                    logger.info('inside CfaProcessController -> updateCfaProcessCalender, success');
                }
            }

            if (allSuccess) {
                return res.status(200).json(Template.successMessage(SuccessMessage.UPDATE_CFA_CALENDER_DATA));
            } else {
                return res.status(204).json(Template.errorMessage(ErrorMessage.UPDATE_CFA_CALENDER_DATA));
            }
        } catch (error) {
            console.error(`Error in updateCfaProcessCalender: ${error.message}`);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }
    
    static async getCfaProcessCalender(req: Request, res: Response) {
        try {
            const result = await AdminService.getCfaProcessCalender();
            if (result) {
                logger.info('inside CfaProcessController -> getCfaProcessCalender, success');
                return res.status(200).json(Template.success(result ,SuccessMessage.FETCH_CFA_CALENDER_DATA));
            } 
            logger.info(`inside CfaProcessController -> getCfaProcessCalender, Failure`);
            return res.status(204).json(Template.errorMessage(ErrorMessage.FETCH_CFA_CALENDER_DATA));
            
        } catch (error) {
            console.error(`Error in getCfaProcessCalender: ${error.message}`);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }

    static async updateMultiplePdpUnlockRequests(req: Request, res: Response) {
        try {
            const { data = []} = req.body;
            const { user_id, first_name, last_name, email } = req.user;
            logger.info('inside AdminController -> updateMultiplePdpUnlockRequests');
            if(data.length === 0){
                logger.info('inside AdminController -> updateMultiplePdpUnlockRequests, empty request array');
                return res.status(500).json(Template.errorMessage('Empty request array'));
            }
            const response = await AdminService.updateMultiplePdpUnlockRequests(data, user_id, email, first_name+" "+last_name);
            if (response?.length > 0) {
                logger.info('inside AdminController -> updateMultiplePdpUnlockRequests, if updateMultiplePdpUnlockRequests success');
                return res.status(200).json(Template.success(response, SuccessMessage.UPDATE_PDP_UNLOCK_REQUEST));
            }
            logger.info('inside AdminController -> updateMultiplePdpUnlockRequests, if updateMultiplePdpUnlockRequests failed');
            return res.status(200).json(Template.error(ErrorMessage.UPDATE_PDP_UNLOCK_REQUEST));
        } catch (error) {
            logger.error('inside AdminController -> updateMultiplePdpUnlockRequests, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.TECHNICAL_ERROR));
        }
    }

    static async insertApprovedPDPUnlockRequest(req: Request, res: Response){
        logger.info('inside AdminController -> insertApprovedPDPUnlockRequest');
        try{
            const { plant_codes = [], start_date, end_date, comments, customer_groups= [], dist_channels= [], regions= [], area_codes= [], states= [] } = req.body;
            const { user_id, roles } = req.user;
            const response = await AdminService.insertApprovedPDPUnlockRequest(customer_groups, dist_channels, regions, area_codes, states, plant_codes, start_date, end_date, comments, user_id, roles);
            if (response) {
                logger.info('inside AdminController -> insertApprovedPDPUnlockRequest, if insertApprovedPDPUnlockRequest success');
                return res.status(200).json(Template.success(response,SuccessMessage.INSERT_APPROVED_PDP_UNLOCK_REQUEST));
            }
            logger.info('inside AdminController -> insertApprovedPDPUnlockRequest, if insertApprovedPDPUnlockRequest failed');
            return res.status(200).json(Template.errorMessage(ErrorMessage.INSERT_APPROVED_PDP_UNLOCK_REQUEST));
        }catch(error){
            logger.error('inside AdminController -> insertApprovedPDPUnlockRequest, Error: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    }
}

export default AdminController;
