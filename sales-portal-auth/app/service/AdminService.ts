/**
 * @file admin.service
 * @description defines admin service methods
 */

import { ErrorMessage } from '../constant/error.message';
import logger from '../lib/logger';
import { AdminModel } from '../models/AdminModel';
import { AuthService } from './authService';
import commonHelper from '../helper/index';
import Email from '../helper/email';
import axios from 'axios';
import azureAD from '../helper/azureAD';
import { AuthModel } from '../models/authModel';
import { UserService } from './user.service';
import { appSettingsRepository, distributorListRepository } from '../repositories/redis-repositories';
import { REDIS_CONSTANTS } from '../constant/redis-constants';
import { roles } from '../constant/persona';

export const AdminService = {
    async updateLoginSetting(
        role: string,
        user_id: string,
        distributorId: string,
        enableLogin: boolean | undefined = false,
        enableLiquidation: boolean | undefined = false,
        enable_pdp: boolean | undefined = false,
        enable_ao: boolean | undefined = false,
        enable_reg: boolean | undefined = false,
        enable_ro: boolean | undefined = false,
        enable_bo: boolean | undefined = false,
        enable_aos: boolean | undefined = false,
        enable_noc: boolean | undefined = false,
        enable_delivery_code_email: boolean | undefined = false,
        enable_delivery_code_sms: boolean | undefined = false,
        remarks: string | null = '',
    ) {
        const updateLoginSettingResponse = await AdminModel.updateLoginSetting(
            role,
            user_id,
            distributorId,
            enableLogin,
            enableLiquidation,
            enable_pdp,
            enable_ao,
            enable_reg,
            enable_ro,
            enable_bo,
            enable_aos,
            enable_noc,
            enable_delivery_code_email,
            enable_delivery_code_sms,
            remarks || '',
        );
        return updateLoginSettingResponse && updateLoginSettingResponse.command === 'UPDATE' && updateLoginSettingResponse.rowCount > 0;
    },

    async bulkUpdateLoginSetting(
        user_id: string,
        role: string[],
        distributorIds: Array<string>,
        enableLogin: boolean | undefined = false,
        enableLiquidation: boolean | undefined = false,
        enable_pdp: boolean | undefined = false,
        enable_ao: boolean | undefined = false,
        enable_reg: boolean | undefined = false,
        enable_ro: boolean | undefined = false,
        enable_bo: boolean | undefined = false,
        enable_aos: boolean | undefined,
        enable_noc: boolean | undefined = false,
        enable_delivery_code_email: boolean | undefined = false,
        enable_delivery_code_sms: boolean | undefined = false,
        remarks: string | null = '',
    ) {
        const updateLoginSettingResponse = await AdminModel.bulkUpdateLoginSetting(
            user_id,
            role,
            distributorIds,
            enableLogin,
            enableLiquidation,
            enable_pdp,
            enable_ao,
            enable_reg,
            enable_ro,
            enable_bo,
            enable_aos,
            enable_noc,
            enable_delivery_code_email,
            enable_delivery_code_sms,
            remarks || '',
        );
        return updateLoginSettingResponse && updateLoginSettingResponse.command === 'UPDATE' && updateLoginSettingResponse.rowCount > 0;
    },

    async updateAlertSettings(
        distributorId: string,
        alertPreferences: {
            enable_po_so_sms: boolean | undefined;
            enable_po_so_email: boolean | undefined;
            enable_invoice_sync_sms: boolean | undefined;
            enable_invoice_sync_email: boolean | undefined;
            email_tse_asm: boolean | undefined;
            sms_tse_asm: boolean | undefined;
        },
    ) {
        const {
            enable_po_so_sms = null,
            enable_po_so_email = null,
            enable_invoice_sync_sms = null,
            enable_invoice_sync_email = null,
            email_tse_asm = null,
            sms_tse_asm = null,
        } = alertPreferences;
        const updateAlertSettingsResponse = await AdminModel.updateAlertSettings(
            distributorId,
            enable_po_so_sms,
            enable_po_so_email,
            enable_invoice_sync_sms,
            enable_invoice_sync_email,
            email_tse_asm,
            sms_tse_asm,
        );
        return updateAlertSettingsResponse && updateAlertSettingsResponse.command === 'INSERT' && updateAlertSettingsResponse.rowCount > 0;
    },

    async bulkUpdateAlertSettings(
        distributorIds: Array<string>,
        alertPreferences: {
            enable_po_so_sms: boolean | undefined;
            enable_po_so_email: boolean | undefined;
            enable_invoice_sync_sms: boolean | undefined;
            enable_invoice_sync_email: boolean | undefined;
            email_tse_asm: boolean | undefined;
            sms_tse_asm: boolean | undefined;
        },
    ) {
        const {
            enable_po_so_sms = null,
            enable_po_so_email = null,
            enable_invoice_sync_sms = null,
            enable_invoice_sync_email = null,
            email_tse_asm = null,
            sms_tse_asm = null,
        } = alertPreferences;
        const updateAlertSettingsResponse = await AdminModel.bulkUpdateAlertSettings(
            distributorIds,
            enable_po_so_sms,
            enable_po_so_email,
            enable_invoice_sync_sms,
            enable_invoice_sync_email,
            email_tse_asm,
            sms_tse_asm,
        );
        return updateAlertSettingsResponse && updateAlertSettingsResponse.command === 'INSERT' && updateAlertSettingsResponse.rowCount > 0;
    },

    async updateAlertHistory(
        distributorId: string,
        data: {
            alert_setting_changes: {
                enable_po_so_sms: boolean | undefined;
                enable_po_so_email: boolean | undefined;
                enable_invoice_sync_sms: boolean | undefined;
                enable_invoice_sync_email: boolean | undefined;
                enable_login: boolean | undefined;
                email_tse_asm: boolean | undefined;
                sms_tse_asm: boolean | undefined;
                enable_liquidation: boolean | undefined;
                enable_pdp: boolean | undefined;
                enable_ao: boolean | undefined;
                enable_reg: boolean | undefined;
                enable_ro: boolean | undefined;
                enable_bo: boolean | undefined;
                enable_noc: boolean | undefined;
            };
            remarks: string;
            changed_by: string;
        },
    ) {
        const { alert_setting_changes = null, remarks = null, changed_by = null } = data;
        const updateAlertHistoryResponse = await AdminModel.updateAlertHistory(distributorId, alert_setting_changes, remarks, changed_by);
        return updateAlertHistoryResponse && updateAlertHistoryResponse.command === 'INSERT' && updateAlertHistoryResponse.rowCount > 0;
    },

    async bulkUpdateAlertHistory(
        distributorIds: Array<string>,
        data: {
            alert_setting_changes: {
                enable_po_so_sms: boolean | undefined;
                enable_po_so_email: boolean | undefined;
                enable_invoice_sync_sms: boolean | undefined;
                enable_invoice_sync_email: boolean | undefined;
                enable_login: boolean | undefined;
                email_tse_asm: boolean | undefined;
                sms_tse_asm: boolean | undefined;
                enable_liquidation: boolean | undefined;
                enable_pdp: boolean | undefined;
                enable_ao: boolean | undefined;
                enable_reg: boolean | undefined;
                enable_ro: boolean | undefined;
                enable_bo: boolean | undefined;
                enable_noc: boolean | undefined;
            };
            remarks: string;
            changed_by: string;
        },
    ) {
        const { alert_setting_changes = null, remarks = null, changed_by = null } = data;
        const updateAlertHistoryResponse = await AdminModel.bulkUpdateAlertHistory(distributorIds, alert_setting_changes, remarks, changed_by);
        return updateAlertHistoryResponse && updateAlertHistoryResponse.command === 'INSERT' && updateAlertHistoryResponse.rowCount > 0;
    },

    async updateDistributorSettings(
        role: string,
        user_id: string,
        distributorId: string,
        data: {
            enable_po_so_sms: boolean | undefined;
            enable_po_so_email: boolean | undefined;
            enable_invoice_sync_sms: boolean | undefined;
            enable_invoice_sync_email: boolean | undefined;
            enable_login: boolean | undefined;
            sms_tse_asm: boolean | undefined;
            email_tse_asm: boolean | undefined;
            remarks: string;
            changed_by: string;
            enable_liquidation: boolean | undefined;
            enable_pdp: boolean | undefined;
            enable_ao: boolean | undefined;
            enable_reg: boolean | undefined;
            enable_ro: boolean | undefined;
            enable_bo: boolean | undefined;
            enable_aos: boolean | undefined;
            enable_noc: boolean | undefined;
            enable_delivery_code_sms: boolean | undefined;
            enable_delivery_code_email: boolean | undefined;
        },
    ) {
        const {
            enable_po_so_sms = null,
            enable_po_so_email = null,
            enable_invoice_sync_sms = null,
            enable_invoice_sync_email = null,
            enable_login = null,
            email_tse_asm = null,
            sms_tse_asm = null,
            remarks = '',
            changed_by = null,
            enable_liquidation = null,
            enable_pdp = null,
            enable_ao = null,
            enable_reg = null,
            enable_ro = null,
            enable_bo = null,
            enable_aos = null,
            enable_noc = null,
            enable_delivery_code_sms = null,
            enable_delivery_code_email = null,
        } = data;

        let error: string[] = [],
            settingChanges: any = {},
            updateLoginSettingResponse: boolean | null = null,
            updateAlertSettingsResponse: boolean | null = null,
            updateAlertHistoryResponse: boolean | null = null;
        if (
            typeof enable_po_so_sms === 'boolean' ||
            typeof enable_po_so_email === 'boolean' ||
            typeof enable_invoice_sync_sms === 'boolean' ||
            typeof enable_invoice_sync_email === 'boolean' ||
            typeof email_tse_asm === 'boolean' ||
            typeof sms_tse_asm === 'boolean'
        ) {
            if (typeof enable_po_so_sms === 'boolean') {
                settingChanges['enable_po_so_sms'] = enable_po_so_sms;
            }
            if (typeof enable_po_so_email === 'boolean') {
                settingChanges['enable_po_so_email'] = enable_po_so_email;
            }
            if (typeof enable_invoice_sync_sms === 'boolean') {
                settingChanges['enable_invoice_sync_sms'] = enable_invoice_sync_sms;
            }
            if (typeof enable_invoice_sync_email === 'boolean') {
                settingChanges['enable_invoice_sync_email'] = enable_invoice_sync_email;
            }
            if (typeof email_tse_asm === 'boolean') {
                settingChanges['email_tse_asm'] = email_tse_asm;
            }
            if (typeof sms_tse_asm === 'boolean') {
                settingChanges['sms_tse_asm'] = sms_tse_asm;
            }
            updateAlertSettingsResponse = await AdminService.updateAlertSettings(distributorId, settingChanges);
            if (!updateAlertSettingsResponse) error.push(ErrorMessage.ALERT_SETTINGS_UPDATE_ERROR);
        }

        if (
            typeof enable_login === 'boolean' ||
            typeof enable_liquidation === 'boolean' ||
            typeof enable_pdp === 'boolean' ||
            typeof enable_ao === 'boolean' ||
            typeof enable_reg === 'boolean' ||
            typeof enable_ro === 'boolean' ||
            typeof enable_bo === 'boolean' ||
            typeof enable_noc === 'boolean' ||
            typeof enable_aos == 'boolean' ||
            typeof enable_delivery_code_sms == 'boolean' ||
            typeof enable_delivery_code_email == 'boolean'
        ) {
            if (typeof enable_login === 'boolean') {
                settingChanges['enable_login'] = enable_login;
            }
            if (typeof enable_liquidation === 'boolean') {
                settingChanges['enable_liquidation'] = enable_liquidation;
            }
            if (typeof enable_pdp === 'boolean') {
                settingChanges['enable_pdp'] = enable_pdp;
            }
            if (typeof enable_ao === 'boolean') {
                settingChanges['enable_ao'] = enable_ao;
            }
            if (typeof enable_reg === 'boolean') {
                settingChanges['enable_reg'] = enable_reg;
            }
            if (typeof enable_ro === 'boolean') {
                settingChanges['enable_ro'] = enable_ro;
            }
            if (typeof enable_bo === 'boolean') {
                settingChanges['enable_bo'] = enable_bo;
            }
            if (typeof enable_aos == 'boolean') {
                settingChanges['enable_aos'] = enable_aos;
            }
            if (typeof enable_noc === 'boolean') {
                settingChanges['enable_noc'] = enable_noc;
            }
            if (typeof enable_delivery_code_sms == 'boolean') {
                settingChanges['enable_delivery_code_sms'] = enable_delivery_code_sms;
            }
            if (typeof enable_delivery_code_email == 'boolean') {
                settingChanges['enable_delivery_code_email'] = enable_delivery_code_email;
            }
            updateLoginSettingResponse = await AdminService.updateLoginSetting(
                role,
                user_id,
                distributorId,
                enable_login,
                enable_liquidation,
                enable_pdp,
                enable_ao,
                enable_reg,
                enable_ro,
                enable_bo,
                enable_aos,
                enable_noc,
                enable_delivery_code_email,
                enable_delivery_code_sms,
                remarks,
            );
            if (!updateLoginSettingResponse) error.push(ErrorMessage.LOGIN_SETTING_UPDATE_ERROR);
        }

        updateAlertHistoryResponse = await AdminService.updateAlertHistory(distributorId, {
            alert_setting_changes: settingChanges,
            remarks,
            changed_by,
        });
        if (!updateAlertHistoryResponse) error.push(ErrorMessage.ALERT_HISTORY_UPDATE_ERROR);

        if (
            (updateLoginSettingResponse === true || updateLoginSettingResponse === null) &&
            (updateAlertSettingsResponse === true || updateAlertSettingsResponse === null) &&
            updateAlertHistoryResponse
        ) {
            return { success: true };
        }
        return { success: false, error };
    },

    async bulkUpdateDistributorSettings(
        data: {
            enable_po_so_sms: boolean | undefined;
            enable_po_so_email: boolean | undefined;
            enable_invoice_sync_sms: boolean | undefined;
            enable_invoice_sync_email: boolean | undefined;
            enable_login: boolean | undefined;
            sms_tse_asm: boolean | undefined;
            email_tse_asm: boolean | undefined;
            remarks: string;
            changed_by: string;
            enable_liquidation: boolean | undefined;
            enable_pdp: boolean | undefined;
            enable_ao: boolean | undefined;
            enable_reg: boolean | undefined;
            distributor_ids: Array<string>;
            enable_ro: boolean | undefined;
            enable_bo: boolean | undefined;
            enable_aos: boolean | undefined;
            enable_noc: boolean | undefined;
            customer_group?: string[];
            state?: string[];
            region?: string[];
            areaCode?: string[];
            plant?: string[];
            search?: string | '';
            status?: string[];
            enable_delivery_code_sms: boolean | undefined;
            enable_delivery_code_email: boolean | undefined;
        },
        user_id: string,
        role: string[],
        code: string,
    ) {
        const {
            enable_po_so_sms = null,
            enable_po_so_email = null,
            enable_invoice_sync_sms = null,
            enable_invoice_sync_email = null,
            enable_login = null,
            email_tse_asm = null,
            sms_tse_asm = null,
            remarks = '',
            changed_by = null,
            enable_liquidation = null,
            enable_pdp = null,
            enable_ao = null,
            enable_reg = null,
            distributor_ids,
            enable_ro = null,
            enable_bo = null,
            enable_noc = null,
            customer_group = null,
            state = null,
            region = null,
            areaCode = null,
            plant = null,
            search = '',
            status = null,
            enable_aos = null,
            enable_delivery_code_sms = null,
            enable_delivery_code_email = null,
        } = data;

        let error: string[] = [],
            settingChanges: any = {},
            updateLoginSettingResponse: boolean | null = null,
            updateAlertSettingsResponse: boolean | null = null,
            updateAlertHistoryResponse: boolean | null = null;

        // Fetch distributors based on admin role and filters
        const distributors = await this.fetchDistributorsByAdminRole(
            role,
            user_id,
            code,
            0,
            0,
            search !== '' ? search : undefined,
            customer_group ? customer_group : [],
            state ? state : [],
            region ? region : [],
            areaCode ? areaCode : [],
            false,
            plant ? plant : [],
            status ? status : ['ACTIVE'],
        );
        const distributorIdsToUpdate = distributors?.rows?.map((distributor) => distributor.id);
        if (
            typeof enable_po_so_sms === 'boolean' ||
            typeof enable_po_so_email === 'boolean' ||
            typeof enable_invoice_sync_sms === 'boolean' ||
            typeof enable_invoice_sync_email === 'boolean' ||
            typeof email_tse_asm === 'boolean' ||
            typeof sms_tse_asm === 'boolean'
        ) {
            if (typeof enable_po_so_sms === 'boolean') {
                settingChanges['enable_po_so_sms'] = enable_po_so_sms;
            }
            if (typeof enable_po_so_email === 'boolean') {
                settingChanges['enable_po_so_email'] = enable_po_so_email;
            }
            if (typeof enable_invoice_sync_sms === 'boolean') {
                settingChanges['enable_invoice_sync_sms'] = enable_invoice_sync_sms;
            }
            if (typeof enable_invoice_sync_email === 'boolean') {
                settingChanges['enable_invoice_sync_email'] = enable_invoice_sync_email;
            }
            if (typeof email_tse_asm === 'boolean') {
                settingChanges['email_tse_asm'] = email_tse_asm;
            }
            if (typeof sms_tse_asm === 'boolean') {
                settingChanges['sms_tse_asm'] = sms_tse_asm;
            }
            updateAlertSettingsResponse = await AdminService.bulkUpdateAlertSettings(distributorIdsToUpdate, settingChanges);
            if (!updateAlertSettingsResponse) error.push(ErrorMessage.ALERT_SETTINGS_UPDATE_ERROR);
        }
        if (
            typeof enable_login === 'boolean' ||
            typeof enable_liquidation === 'boolean' ||
            typeof enable_pdp === 'boolean' ||
            typeof enable_ao === 'boolean' ||
            typeof enable_reg === 'boolean' ||
            typeof enable_ro === 'boolean' ||
            typeof enable_bo === 'boolean' ||
            typeof enable_aos === 'boolean' ||
            typeof enable_noc === 'boolean' ||
            typeof enable_delivery_code_email === 'boolean' ||
            typeof enable_delivery_code_sms === 'boolean'
        ) {
            if (typeof enable_login === 'boolean') {
                settingChanges['enable_login'] = enable_login;
            }
            if (typeof enable_liquidation === 'boolean') {
                settingChanges['enable_liquidation'] = enable_liquidation;
            }
            if (typeof enable_pdp === 'boolean') {
                settingChanges['enable_pdp'] = enable_pdp;
            }
            if (typeof enable_ao === 'boolean') {
                settingChanges['enable_ao'] = enable_ao;
            }
            if (typeof enable_reg === 'boolean') {
                settingChanges['enable_reg'] = enable_reg;
            }
            if (typeof enable_ro === 'boolean') {
                settingChanges['enable_ro'] = enable_ro;
            }
            if (typeof enable_bo === 'boolean') {
                settingChanges['enable_bo'] = enable_bo;
            }
            if (typeof enable_aos === 'boolean') {
                settingChanges['enable_aos'] = enable_aos;
            }
            if (typeof enable_noc === 'boolean') {
                settingChanges['enable_noc'] = enable_noc;
            }
            if (typeof enable_delivery_code_sms == 'boolean') {
                settingChanges['enable_delivery_code_sms'] = enable_delivery_code_sms;
            }
            if (typeof enable_delivery_code_email == 'boolean') {
                settingChanges['enable_delivery_code_email'] = enable_delivery_code_email;
            }
            updateLoginSettingResponse = await AdminService.bulkUpdateLoginSetting(
                user_id,
                role,
                distributorIdsToUpdate,
                enable_login,
                enable_liquidation,
                enable_pdp,
                enable_ao,
                enable_reg,
                enable_ro,
                enable_bo,
                enable_aos,
                enable_noc,
                enable_delivery_code_email,
                enable_delivery_code_sms,
                remarks,
            );
            if (!updateLoginSettingResponse) error.push(ErrorMessage.LOGIN_SETTING_UPDATE_ERROR);
        }

        updateAlertHistoryResponse = await AdminService.bulkUpdateAlertHistory(distributorIdsToUpdate, {
            alert_setting_changes: settingChanges,
            remarks,
            changed_by,
        });
        if (!updateAlertHistoryResponse) error.push(ErrorMessage.ALERT_HISTORY_UPDATE_ERROR);
        if (
            (updateLoginSettingResponse === true || updateLoginSettingResponse === null) &&
            (updateAlertSettingsResponse === true || updateAlertSettingsResponse === null) &&
            updateAlertHistoryResponse
        ) {
            return { success: true };
        }
        return { success: false, error };
    },

    /**
     * @param tseCode
     * @param limit
     * @param offset
     * @param search
     */
    async getDistributorListByAdminRole(
        roles: string,
        userId: string,
        limit: number,
        offset: number,
        search: string,
        status: string,
        customer_group: string,
        state: string,
        region: string,
        area_code: string,
        plant_code: string | undefined,
    ) {
        return await AdminModel.getDistributorListByAdminRole(roles, userId, limit, offset, search, status, customer_group, state, region, area_code, plant_code);
    },

    /**
     * @param tseCode
     */
    async getDistributorListByAdminRoleCount(
        roles: string,
        userId: string,
        search: string,
        status: string,
        customer_group: string,
        state: string,
        region: string,
        area_code: string,
        plant_code: string | undefined,
    ) {
        return await AdminModel.getDistributorListByAdminRoleCount(roles, userId, search, status, customer_group, state, region, area_code, plant_code);
    },
    /**
     * @param email
     */
    async adminDetailsStatement(email: string) {
        return await AdminModel.adminDetailsStatement(email);
    },
    /**
     * @param adminId
     * @param distributorId
     */
    async validateDistAdminOrTseStatement(adminId: string, distributorId: string) {
        return await AdminModel.validateDistAdminOrTseStatement(adminId, distributorId);
    },
    /**
     * @param adminCode
     * @param distributorId
     */
    async validateTseAdminStatement(adminCode: string, distributorId: string) {
        return await AdminModel.validateTseAdminStatement(adminCode, distributorId);
    },
    /**
     * @param distributorId
     */
    async validateSuperAdminStatement(distributorId: string) {
        return await AdminModel.validateSuperAdminStatement(distributorId);
    },

    async updateContactDetailsHistory(
        distributorId: string,
        data: {
            contact_detail_changes: {
                update_mobile?: string;
                update_email?: string;
            };
            changed_by: string;
            remark: string;
        },
    ) {
        const { contact_detail_changes = null, changed_by = null, remark = 'PORTAL_MANAGED' } = data;
        const updateContactDetailsHistoryResponse = await AdminModel.updateContactDetailsHistory(distributorId, contact_detail_changes, changed_by, remark);
        return updateContactDetailsHistoryResponse && updateContactDetailsHistoryResponse.command === 'INSERT' && updateContactDetailsHistoryResponse.rowCount > 0;
    },

    /**
     * @param limit
     * @param offset
     * @param search
     */
    async getTseUserList(limit: number, offset: number, search: string, status: string, role: string, deleted: boolean) {
        const response: any = await AdminModel.getTseUserList(limit, offset, search, status, role, deleted);
        response.rows.forEach((item) => {
            item.user_name = `${item.first_name} ${item.last_name}`;
            delete item.first_name;
            delete item.last_name;
        });
        return response;
    },

    async updateTseUserSetting(user_id: string, enableLogin: string, role: string[], isDeleted: boolean, code: string, updatedBy: string, email: string | null = null) {
        await AdminModel.updateKamsRoles(user_id, enableLogin, role, isDeleted, code, updatedBy);
        return await AdminModel.updateTseUserSetting(user_id, enableLogin, role, isDeleted, code, email);
    },
    async getTseUserListCount(search: string, status: string, role: string, deleted: boolean) {
        return await AdminModel.getTseUserListCount(search, status, role, deleted);
    },

    async updateAppLevelSettings(
        appLevelSettingChanges: {
            app_level_configuration: [
                {
                    key: string;
                    value: string;
                    remarks: string;
                },
            ];
            updatedBy: string;
        },
        roles: string[],
    ) {
        const appLevelSettings = await AuthService.fetchAppLevelSettings(roles);
        let appLevelSettingsMap = {};
        for (let appLevelSetting of appLevelSettings) {
            appLevelSettingsMap[appLevelSetting.key] = appLevelSetting;
        }
        for (let appLevelSetting of appLevelSettingChanges.app_level_configuration) {
            const key = appLevelSetting.key;
            if (!appLevelSettingsMap[key]) {
                throw new Error(key + ' ' + ErrorMessage.APP_LEVEL_INVALID_CONFIG);
            } else {
                if (key === 'PDP_REQUEST_CGS_ENABLE') {
                    await AdminModel.enableCustomerGroupPdp(appLevelSetting.value, 'pdp_update_enabled');
                } else if (key === 'PDP_UNLOCK_WINDOW_CGS') {
                    await AdminModel.enableCustomerGroupPdp(appLevelSetting.value, 'pdp_unlock_enabled');
                } else if (key === 'ENABLE_PDP_RESTRICTION') {
                    await AdminModel.insertPDPAuditTrail(
                        [],
                        appLevelSetting.value === 'YES' ? true : false,
                        `${appLevelSettingChanges.updatedBy}#${roles}`,
                        'Global PDP Switch updated, reason: ' + appLevelSetting.remarks,
                    );
                } else if (key === 'CFA_SURVEY_CGS_ENABLE') {
                    const values = appLevelSetting.value.split(',');
                    for (const value of values) {
                        if (!appLevelSettingsMap[key].allowed_values.includes(value.trim())) {
                            throw new Error(`'${value}' value for '${key}' key is invalid. Allowed values are ${appLevelSettingsMap[key].allowed_values.toString()}`);
                        }
                    }
                } else if (
                    appLevelSettingsMap[key].allowed_values &&
                    !appLevelSettingsMap[key].allowed_values.includes(appLevelSetting.value) &&
                    key !== 'PDP_REQUEST_CGS_ENABLE' &&
                    key !== 'PDP_UNLOCK_WINDOW_CGS'
                ) {
                    throw new Error(`'${appLevelSetting.value}' value for '${key}' key is invalid. Allowed values are ${appLevelSettingsMap[key].allowed_values.toString()}`);
                } else if (appLevelSetting.remarks.trim().length < 5) {
                    throw new Error(`Remarks for '${key}' key should be atleast 10 characters.`);
                }
            }
        }

        // Delete Redis Cache After update so that when get request is called it fetches the latest data
        // appSettingsRepository.removeById(REDIS_CONSTANTS.APP_SETTINGS);

        const response = await AdminModel.updateAppLevelSettings(appLevelSettingChanges);
        return response;
    },
    async getCFAData() {
        logger.info('inside AdminService -> getCFAData');

        return await AdminModel.getCFAData();
    },

    async addUploadedFileToTheAWSS3(file, data) {
        logger.info('inside AdminService -> addUploadedFileToTheAWSS3');
        return await AdminModel.addUploadedFileToTheAWSS3(file, data);
    },

    async getFilesHistoryCount(search: string, searchField: string) {
        logger.info('inside AdminService -> getFilesHistoryCount');
        return await AdminModel.getFilesHistoryCount(search, searchField);
    },

    async getFilesHistory(limit: number, offset: number, search: string, searchField: string) {
        logger.info('inside AdminService -> getFilesHistory');
        return await AdminModel.getFilesHistory(limit, offset, search, searchField);
    },

    async updateFileStatus(status, id) {
        logger.info('inside AdminService -> getFilesHistory');
        return await AdminModel.updateFileStatus(status, id);
    },
    async getAzureADUsers(search_text: string) {
        logger.info('service function getAzureADUsers ');
        let userList = [];

        try {
            const emailSearchResponse = await axios.get(azureAD.getEmailSearchUrl(search_text), await azureAD.getApiHeader());

            if (emailSearchResponse.data && emailSearchResponse.data.value) {
                let ul = [...emailSearchResponse.data.value];
                userList = ul
                    .filter((user) => {
                        const mail = user.mail?.toLowerCase() ?? '';
                        return mail.endsWith('tataconsumer.com');
                    })
                    .map((user) => {
                        return { name: user.displayName, email: user.mail };
                    });
            }

            return userList;
        } catch (error) {
            logger.error('error while fetching user details from Azure AD ', error);
            return false;
        }
    },

    async addSSOUser(name: string, email: string, role: string[], code: string | null) {
        logger.info('inside AdminService -> addSSOUser');
        return await AdminModel.addSSOUser(name, email, role, code);
    },

    async fetchHelpSectionData(limit, offset, category) {
        logger.info('inside AdminService -> fetchHelpSectionData');
        return await AdminModel.fetchHelpSectionData(limit, offset, category);
    },
    async fetchHelpSectionDataCount(search, searchField, category) {
        logger.info('inside AdminService -> fetchHelpSectionData');
        return await AdminModel.fetchHelpSectionDataCount(search, searchField, category);
    },
    async createPreAssignUrl(path) {
        logger.info('inside AdminService -> createPreAssignUrl');
        return await AdminModel.createPreAssignUrl(path);
    },
    async filterCategoriesService(excludeDeleted: boolean, userRole: string[], userCode: string, code: string | null) {
        logger.info('inside AdminService -> FilterCategoriesModel');
        return await AdminModel.filterCategoriesModel(excludeDeleted, userRole, userCode, code);
    },
    async fetchAreaCodes(userId: string, role: string[]) {
        logger.info('inside AdminService -> fetchAreaCodes');
        return await AdminModel.fetchAreaCodes(userId, role);
    },

    async getAdjustmentTimeline() {
        logger.info('inside AdminModel -> getAdjustmentTimeline');
        return await AdminModel.getAdjustmentTimeline();
    },

    async getStockNormConfigRegions(zone: string) {
        logger.info('inside AdminModel -> getStockNormConfigRegions');
        return await AdminModel.getStockNormConfigRegions(zone);
    },

    async getStockNormConfigAreas(zone: string, region: string) {
        logger.info('inside AdminModel -> getStockNormConfigAreas');
        return await AdminModel.getStockNormConfigAreas(zone, region);
    },

    async getStockNormConfigDivisions() {
        logger.info('inside AdminModel -> getStockNormConfigDivisions');
        return await AdminModel.getStockNormConfigDivisions();
    },

    async getCycleSafetyStock(zone: string, region: string, areas: string[], divisions: string[]) {
        logger.info('inside AdminModel -> getCycleSafetyStock');
        return await AdminModel.getCycleSafetyStock(zone, region, areas, divisions);
    },

    async updateCycleSafetyStock(zone: string, region: string, areas: string[], divisions: string[], cs: number, ss: number, remark: string, user: any) {
        logger.info('inside AdminModel -> updateCycleSafetyStock');
        return await AdminModel.updateCycleSafetyStock(zone, region, areas, divisions, cs, ss, remark, user);
    },
    async getCfaDepotMapping(email: string | null = null) {
        logger.info('inside AdminService ->getCfaDepotMapping');

        return await AdminModel.getCfaDepotMapping(email);
    },
    async insertCfaDepotMapping(insertBody: {
        zone: string;
        depotCode: string;
        salesOrg: number;
        distributionChannel: number;
        divisions?: number[];
        location: string;
        name: string;
        address: string;
        email: string;
        contactPerson: string;
        contactNumber: string;
        zoneManagerEmail: string;
        clusterManagerEmail: string;
        logisticEmail: string;
        updatedBy: string;
        remarks: string;
    }) {
        logger.info('inside AdminServices->insertCfaDepotMapping');
        let i = 0;
        let rowStatus: boolean = true;
        const divisionArray: number[] = insertBody?.divisions;
        delete insertBody.divisions;
        const insertParams = JSON.parse(JSON.stringify(insertBody));
        for (i = 0; i <= divisionArray?.length - 1; i++) {
            const division = divisionArray[i];
            Object.assign(insertParams, { division: division });
            try {
                const res = await AdminModel.insertCfaDepotMapping(insertParams);
                if (res?.rowCount <= 0) {
                    rowStatus = false;
                }
            } catch (error) {
                logger.error('inside AdminCtroller -> insertCfaDepotMapping Error in CFA Data:', error);
                rowStatus = false;
            }
        }
        return rowStatus;
    },

    async updateCfaDepotMapping(insertbody: {
        depotCode: string;
        salesOrg: number;
        distributionChannel: number;
        division: number;
        location: string;
        name: string;
        address: string;
        email: string;
        contactPerson: string;
        contactNumber: string;
        zoneManagerEmail: string;
        clusterManagerEmail: string;
        isDeleted: boolean;
        logisticEmail: string;
        updatedBy: string;
        remarks: string;
    }) {
        return await AdminModel.updateCfaDepotMapping(insertbody);
    },

    async fireQuery(sqlStatement: string) {
        logger.info('inside ArsService -> fireQuery');
        return await AdminModel.fireQuery(sqlStatement);
    },

    async multipleUpdateCfaDepotMapping(insertbody: {
        zone: string[] | null;
        depotCode: string[] | null;
        salesOrg: number;
        distributionChannel: number;
        division: number[];
        location: string;
        name: string;
        address: string;
        email: string;
        contactPerson: string;
        contactNumber: string;
        zoneManagerEmail: string;
        clusterManagerEmail: string;
        logisticEmail: string;
        updatedBy: string;
        remarks: string;
    }) {
        return await AdminModel.multipleUpdateCfaDepotMapping(insertbody);
    },

    async getPDPWindows(regionId: number) {
        logger.info('inside AdminService -> getPDPWindows');
        return await AdminModel.getPDPWindows(regionId);
    },

    async upsertPDPWindow(data: any, userId: string) {
        logger.info('inside AdminService -> upsertPDPWindow');
        if (data.id) {
            return await AdminModel.updatePDPWindow(data, userId);
        } else {
            return await AdminModel.insertPDPWindow(data, userId);
        }
    },

    async deletePDPException(id: number, remarks: string, userId: string) {
        logger.info('inside AdminService -> deletePDPException');
        return await AdminModel.deletePDPException(id, remarks, userId);
    },

    async insertPdpUnlockRequest(
        regions: string[],
        areaCodes: string[],
        distributorIds: string[],
        startDate: string,
        endDate: string,
        comments: string,
        userId: string,
        role: string[],
        firstName: string,
        lastName: string,
        approver_email: string,
        selectAll: boolean,
    ) {
        logger.info('inside AdminService -> insertPdpUnlockRequest');

        try {
            const result = await AdminModel.insertPdpUnlockRequest(regions, areaCodes, distributorIds, startDate, endDate, comments, userId, role, selectAll);

            if (result) {
                const fullName = `${firstName} ${lastName}`;
                const message = `${role} - ${fullName} has raised a PDP unlock request.`;
                const emailData = { name: fullName, approver_email, areaCodes, startDate, endDate, comments, role, regions, req_id: result, message };
                AdminService.sendPdpUnlockRequestEmail(emailData);
            }

            return result;
        } catch (error) {
            logger.error('Error processing PDP unlock request:', error);
            throw error;
        }
    },
    async fetchPdpUnlockRequests(role: string[], email: string, userId: string, limit: number, offset: number, status: string = 'ALL', search: string = '') {
        logger.info('inside AdminService -> fetchPdpUnlockRequests');
        // return await AdminModel.fetchPdpUnlockRequests(limit, offset, status, search);
        return await AdminModel.getPdpUnlockRequests(role, email, userId, limit, offset, status, search);
    },

    async fetchDistributorRegions(distributor_ids: string[]) {
        logger.info('inside AdminService -> fetchDistributorRegions');
        return await AdminModel.fetchDistributorRegions(distributor_ids);
    },

    async updatePdpUnlockRequest(
        requestId: string,
        status: string | undefined,
        userId: string,
        email: string,
        areaCodes: string[],
        regions: string[],
        start_date: string,
        end_date: string,
        requested_on: string,
        requested_by_id: string,
        userName: string,
        approver_email: string,
        requested_by: string,
        requested_by_role: string[],
        comments: string,
    ) {
        logger.info('inside AdminService -> updatePdpUnlockRequest');

        //Calling the function to check and expire the PDP unlock requests
        await AdminModel.setExpiredPDPUnlockRequests();

        // Making all logical checks here at service layer
        const pdpUnlockRequestData = await AdminModel.checkPDPUnlockRequestExist(requestId);
        if (!pdpUnlockRequestData.exist) {
            logger.error(`${requestId} - PDP unlock request does not exist`);
            return { success: false, message: 'PDP unlock request does not exist' };
        }

        if (pdpUnlockRequestData.data?.status !== 'PENDING') {
            logger.error(`${requestId} - PDP unlock request has already been processed or expired`);
            return { success: false, message: 'PDP unlock request has already been processed or expired' };
        }

        const pdp_approvers = (await AuthModel.fetchAppLevelSettings()).find((setting) => setting.key === 'PDP_APPROVERS')?.value?.split(',') || [];
        const email_index = pdp_approvers.findIndex((approver) => approver.toLowerCase() === email.toLowerCase());
        if (email_index === -1) {
            logger.error(`${requestId} - Unauthorized to approve PDP unlock request`);
            return { success: false, message: 'Unauthorized to approve PDP unlock request' };
        }

        const firstApproverDetails = await AdminModel.getPdpApproverDetails(pdp_approvers[0]);
        if (!firstApproverDetails) {
            logger.error(` ${requestId} - First approver not found`);
            return { success: false, message: 'First approver not found' };
        }

        if (email_index > 0) {
            if (!pdpUnlockRequestData.data?.responded_by || !pdpUnlockRequestData.data?.responded_by.includes(firstApproverDetails.user_id)) {
                logger.error(` ${requestId} - Previous approver has not responded`);
                return { success: false, message: 'Previous approver has not responded' };
            }
        }

        if (pdpUnlockRequestData.data?.responded_by && pdpUnlockRequestData.data?.responded_by.includes(userId)) {
            logger.error(`${requestId} - User(${userId}) has already responded to this request`);
            return { success: false, message: 'You have already responded to this request' };
        }

        const result = await AdminModel.updatePDPUnlockRequest(requestId, status, userId, email);
        if (result?.success) {
            /*
         - Finds the SSO User detail by role and filters the user who has created the request
         - Finds the hierarchy from the request creator's area code
         - If the request creator is a TSE, its email will be pushed along with the email of ASM and CM (Cluster Manager)
         - If the request creator is an ASM, all ASMs belonging to the same Area Code along with the CM will be pushed to recipient array
        */
            if (!status) {
                let email_data = {
                    name: requested_by,
                    approver_email: approver_email,
                    req_id: requestId,
                    areaCodes: areaCodes,
                    startDate: start_date,
                    endDate: end_date,
                    comments: comments,
                    role: requested_by_role,
                    regions: regions,
                    message: `${userName} has approved the request for PDP unlock.`,
                };
                AdminService.sendPdpUnlockRequestEmail(email_data);
            }
            const areaRegion = regions.join(',') + ' / ' + areaCodes.join(',');
            const requestedByID = requested_by_id?.split('#')[0] ?? '';
            const requestedByRole: string[] = (requested_by_id?.split('#')[1] ?? '').split(',') ?? [];
            const recipientArr: string[] = [];
            const ssoUsers = await AdminModel.fetchSSOUsers(requestedByRole);
            const requestUserData = ssoUsers?.find((item) => item.user_id === requestedByID) || null;
            if (requestUserData === null) {
                logger.error(`inside AdminService -> updatePdpUnlockRequest, ${requestId} - Request creator not found / soft-deleted, hence unable to send email notification`);
                return result;
            }

            if (requestedByRole.includes(roles.CLUSTER_MANAGER) || requestedByRole.includes(roles.SUPER_ADMIN)) {
                requestUserData ? recipientArr.push(requestUserData['email']) : '';
            } else if (requestedByRole.includes(roles.TSE) || requestedByRole.includes(roles.ASM)) {
                const hierarchyDetail = (await UserService.fetchSalesHierarchyDetails(requestUserData?.['code'])) ?? {};
                if (requestedByRole.includes(roles.TSE)) {
                    recipientArr.push(requestUserData['email']);
                }
                Object.keys(hierarchyDetail).forEach((role) => {
                    if (role.includes(roles.ASM) || role.includes(roles.CLUSTER_MANAGER)) {
                        hierarchyDetail[role].forEach((item) => recipientArr.push(item.email));
                    }
                });
            }
            Email.sendPdpUnlockStatusEmail(areaRegion, requested_on, start_date, end_date, status, userName, recipientArr, requestId);
        }
        return result;
    },

    async fetchSSOUsers(roles: string[], limit: number, offset: number, queryParams: { emails: string[] } = { emails: [] }) {
        logger.info('inside AdminService -> fetchSSOUsers');
        return await AdminModel.fetchSSOUsers(roles, limit, offset, queryParams);
    },

    async syncPdpUnlockRequests() {
        logger.info('inside AdminService -> syncPdpUnlockRequests');
        /* SOPE-2893: lock sync is run before unlock sync to handle the situation where 
            a distributor is locked and unlocked by two different requests on the same date
            eg: a db has unlock request -> 19/10/2024-23/10/2024 and has another request ->
            24/10/2024-30/10/2024. In this case the db should be locked first as per the first
            request on 24th and then unlocked on the same date as per the next request which 
            basically extends its PDP unlock period. */
        const pdpLockResponse = await AdminModel.lockDistributorPDP();
        const preapprovedPdpLockResponse = await AdminModel.lockDistributorPDPPreapporved();
        const pdpUnlockResponse = await AdminModel.unlockDistributorPDP();
        const preapprovedPdpUnlockResponse = await AdminModel.unlockDistributorPDPPreapporved();
        const setExpiredResponse = await AdminModel.setExpiredPDPUnlockRequests();
        // if (pdpUnlockResponse?.pdpOff.request_ids) AdminService.sendApprovedPDPUnlockRequestEmail(pdpUnlockResponse?.pdpOff.request_ids);
        if (preapprovedPdpUnlockResponse?.pdpOff.request_ids) AdminService.sendApprovedPDPUnlockRequestEmail(preapprovedPdpUnlockResponse?.pdpOff.request_ids);
        const lockedDbs: string[] = [];
        const unlockedDbs: string[] = [];
        if(pdpLockResponse?.pdpOn.updated_distributor_ids) {
            pdpLockResponse?.pdpOn.updated_distributor_ids.forEach((item) => {
                lockedDbs.push(item);
            });
        }
        if(preapprovedPdpLockResponse?.pdpOn.updated_distributor_ids) {
            preapprovedPdpLockResponse?.pdpOn.updated_distributor_ids.forEach((item) => {
                lockedDbs.push(item);
            });
        }
        
        if (pdpUnlockResponse?.pdpOff?.updated_distributor_ids){
            pdpUnlockResponse?.pdpOff?.updated_distributor_ids.forEach((item) => {
                unlockedDbs.push(item);
            });
        }
        if(preapprovedPdpUnlockResponse?.pdpOff?.updated_distributor_ids){
            preapprovedPdpUnlockResponse?.pdpOff?.updated_distributor_ids.forEach((item) => {
                unlockedDbs.push(item);
            });
        }
        
        return { distributors_locked: lockedDbs, distributors_unlocked: unlockedDbs, ...setExpiredResponse };
    },

    async setExpiredPdpUnlockRequests() {
        logger.info('inside AdminService -> setExpiredPdpUnlockRequests');
        return await AdminModel.setExpiredPDPUnlockRequests();
    },

    async sendPdpUnlockRequestEmail(emailData: {
        name: string;
        approver_email: string;
        req_id: string;
        areaCodes: string[];
        startDate: string;
        endDate: string;
        comments: string;
        role: string[];
        regions: string[];
        message: string;
    }) {
        logger.info('inside AdminService -> sendPdpUnlockRequestEmail');

        const { name, approver_email, req_id, areaCodes, startDate, endDate, comments, role, regions, message } = emailData;

        if (!approver_email || !startDate || !endDate || !req_id || !name || !role || !regions || !areaCodes) {
            logger.info('Cannot send email notification for PDP unlock request. Missing required data.');
            return false;
        }
        const start_date = commonHelper.formatDate(startDate);
        const end_date = commonHelper.formatDate(endDate);
        const approverDetails = await AdminModel.fetchSSOUsers([], 0, 0, { emails: [approver_email] });
        const approverData = approverDetails
            ? approverDetails.map((user) => {
                  return { first_name: user.first_name, last_name: user.last_name, email: user.email };
              })
            : [];

        const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

        let email_data = {
            request_id: req_id,
            area: areaCodes.join(', '),
            startDate: start_date,
            endDate: end_date,
            requestedDate: currentDate,
            comment: comments,
            fullName: name,
            Role: role,
            Region: regions.join(', '),
            message: message,
        };
        await Email.sendPDPRequestEmail(email_data, approverData);
        logger.info('Email notification sent for PDP unlock request.');
        return true;
    },

    async fetchDistributorsByAdminRole(
        roles: string[],
        userId: string,
        code: string | null,
        limit: number = 0,
        offset: number = 0,
        search: string = '',
        customer_groups_desc: string[] = [],
        states: string[] = [],
        regions: string[] = [],
        area_codes: string[] = [],
        isDeleted: boolean = false,
        plants: string[] = [],
        status: string = 'ACTIVE',
        distChannel: number[] | undefined = undefined,
    ) {
        logger.info('inside AdminService -> fetchDistributorsByAdminRole');
        const response = await AdminModel.fetchDistributorsByAdminRole(
            roles,
            userId,
            code,
            limit,
            offset,
            search,
            customer_groups_desc,
            states,
            regions,
            area_codes,
            isDeleted,
            plants,
            status,
            distChannel,
        );
        return response;
    },

    async validateDistributorAdminMapping(distributorId: string, role: string[], code: string = '') {
        logger.info('inside AdminService -> validateDistributorAdminMapping');
        const response = await AdminModel.validateDistributorAdminMapping(distributorId, role, code);
        return response;
    },

    async unlockPdpByRequestId(request_id: string) {
        logger.info('inside AdminService -> syncPdpUnlockRequests');
        const pdpUnlockResponse = await AdminModel.unlockDistributorPDP(request_id);
        return pdpUnlockResponse;
    },

    async fetchPDPWindowSettings() {
        logger.info('inside AdminService -> fetchPDPWindowSettings');
        return await AdminModel.fetchPDPWindowSettings();
    },

    async updatePDPWindowSettings(data: { region_id: number; start_date: number; end_date: number; comments: string }[], userId: string) {
        logger.info('inside AdminService -> updatePDPWindowSettings');
        try {
            for (let d of data) {
                const { region_id, start_date, end_date, comments } = d;
                await AdminModel.updatePDPWindowSettings(region_id, start_date, end_date, comments, userId);
            }
            return true;
        } catch (error) {
            logger.error('Error updating PDP window settings:', error);
            return false;
        }
    },

    async lockUnlockPDPByWindow(sendEmail: boolean) {
        logger.info('inside AdminService -> lockUnlockPDPByWindow');
        try {
            const windowSettings = (await AdminModel.fetchPDPWindowSettings()) || [];
            const date_options = { timeZone: 'Asia/Kolkata' };
            const istDateString = new Date().toLocaleString('en-US', date_options);
            const date = new Date(istDateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // Months are zero-based, so we add 1
            const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the current month
            const currentDate = date.getDate(); //current day of the month
            const responseObj = {};
            const errorEmailObj: any = { tableData: [] };

            //Fetching RSM and Cluster emails for sending email notification
            const rsm_clusters_data = (await AdminModel.fetchRSMsAndClusters()) || [];
            const emailSet: Set<string> = new Set();
            for (let data of rsm_clusters_data) {
                data.emails.forEach((email: string) => emailSet.add(email));
            }
            const emailArr: string[] = Array.from(emailSet);
            const ccoUsers = await AdminModel.getTseUserList(1000,0,'','enabled','CALL_CENTRE_OPERATIONS',false);
            const ccoEmails =  ccoUsers?.rows?.map((user) => user.email) ?? [];

            //unlocking global PDP in monthend and locking in monthstart
            const appSettings = await AuthModel.fetchAppLevelSettings();
            const globalPDP = appSettings.find((setting) => setting.key === 'ENABLE_PDP_RESTRICTION')?.value;
            let minStartDate = null;
            let minEndDate = null;
            for (let window of windowSettings) {
                const { start_date, end_date } = window;
                if (!minStartDate || start_date < minStartDate) minStartDate = start_date;
                if (!minEndDate || end_date < minEndDate) minEndDate = end_date;
            }

            if (currentDate === minStartDate && globalPDP === 'YES') {
                const unlockGlobalPDPResponse = await AdminModel.updateAppLevelSettings({
                    app_level_configuration: [{ key: 'ENABLE_PDP_RESTRICTION', value: 'NO', remarks: 'Monthend PDP unlock' }],
                    updatedBy: 'SYSTEM',
                });
                if (unlockGlobalPDPResponse) {
                    await AdminModel.insertPDPAuditTrail([], false, `SYSTEM_GENERATED`, 'Monthend Global PDP unlock');
                    logger.info('inside AdminService -> lockUnlockPDPByWindow, sending monthend unlock emails to: ', emailArr);
                    if (sendEmail) Email.pdpWindowUnlockEmail({ emails: emailArr, cc: ccoEmails });
                }
            }
            if (currentDate === minEndDate && globalPDP === 'NO') {
                const lockGlobalPDPResponse = await AdminModel.updateAppLevelSettings({
                    app_level_configuration: [{ key: 'ENABLE_PDP_RESTRICTION', value: 'YES', remarks: 'Monthstart PDP lock' }],
                    updatedBy: 'SYSTEM',
                });
                if (lockGlobalPDPResponse) await AdminModel.insertPDPAuditTrail([], true, `SYSTEM_GENERATED`, 'Monthstart Global PDP lock');
            }

            for (let window of windowSettings) {
                const { group5_id, start_date, end_date, region_name } = window;
                let locked_dbs = 0;
                let unlocked_dbs = 0;
                let lock_err = '';
                let unlock_err = '';

                if (currentDate >= start_date || (start_date > daysInMonth && currentDate === daysInMonth)) {
                    const response = await AdminModel.unlockDistributorPDPByRegion(group5_id);
                    unlocked_dbs = response.count;
                    unlock_err = response.err;
                } else if (currentDate === end_date || (end_date > daysInMonth && currentDate === daysInMonth)) {
                    const response = await AdminModel.lockDistributorPDPByRegion(group5_id);
                    locked_dbs = response.count;
                    lock_err = response.err;
                }

                if (unlock_err) {
                    logger.error(`Region ${region_name} - Error unlocking PDP: ${unlock_err}`);
                    errorEmailObj.tableData.push({ region: region_name, type: 'MONTHEND_SYSTEM_UNLOCK', error: unlock_err });
                } else if (lock_err) {
                    logger.error(`Region ${region_name} - Error locking PDP: ${lock_err}`);
                    errorEmailObj.tableData.push({ region: region_name, type: 'MONTHEND_SYSTEM_LOCK', error: lock_err });
                } else {
                    logger.info(`Region ${region_name} - Unlocked: ${unlocked_dbs}, Locked: ${locked_dbs}`);
                }

                responseObj[region_name] = { locked_dbs, unlocked_dbs };
            }

            if (errorEmailObj.tableData.length > 0) {
                logger.info('inside AdminService -> lockUnlockPDPByWindow, sending error email for: ', errorEmailObj);
                Email.pdpUnlockWindowSyncError(errorEmailObj);
            }
            return responseObj;
        } catch (error) {
            logger.error('Error locking/unlocking PDP by window:', error);
            const emailObj = { tableData: [{ region: 'ALL', type: 'MONTHEND_SYSTEM_LOCK/UNLOCK', error: error }] };
            Email.pdpUnlockWindowSyncError(emailObj);
            return false;
        }
    },

    async updateCfaProcessCalender(date: number, expected_starttime: string, remarks: string, updatedBy: string) {
        logger.info('Inside CfaProcessService -> updateCfaProcessCalender');
        const response = await AdminModel.updateCfaProcessCalender(date, expected_starttime, remarks, updatedBy);
        return response;
    },

    async getCfaProcessCalender() {
        logger.info('Inside CfaProcessService -> getCfaProcessCalender');
        const response = await AdminModel.getCfaProcessCalender();
        return response;
    },

    async updatePdpUnlockRequest2(requestId: string, status: string | undefined, userId: string, email: string, userName: string) {
        logger.info('inside AdminService -> updatePdpUnlockRequest2');

        //Calling the function to check and expire the PDP unlock requests
        try {
            await AdminModel.setExpiredPDPUnlockRequests();
        } catch (error) {
            logger.error('inside AdminService -> updatePdpUnlockRequest2, failed to set expired due to error: ', error);
        }

        let request_data: any | null = null;
        let next_approver_email = '';
        // Making all logical checks here at service layer
        try {
            const pdpUnlockRequestData = await AdminModel.checkPDPUnlockRequestExist(requestId);
            if (!pdpUnlockRequestData || !pdpUnlockRequestData.exist) {
                logger.error(`${requestId} - PDP unlock request does not exist`);
                return { success: false, message: 'PDP unlock request does not exist' };
            }

            if (pdpUnlockRequestData.data?.status === 'EXPIRED') {
                logger.error(`${requestId} - PDP unlock request has already expired`);
                return { success: false, message: 'PDP unlock request has already expired' };
            }

            if (pdpUnlockRequestData.data?.status === 'APPROVED') {
                logger.error(`${requestId} - PDP unlock request has already been approved`);
                return { success: false, message: 'PDP unlock request has already been approved' };
            }

            if (pdpUnlockRequestData.data?.status === 'REJECTED') {
                logger.error(`${requestId} - PDP unlock request has already been rejected`);
                return { success: false, message: 'PDP unlock request has already been rejected' };
            }

            request_data = pdpUnlockRequestData.data;

            const pdp_approvers = (await AuthModel.fetchAppLevelSettings()).find((setting) => setting.key === 'PDP_APPROVERS')?.value?.split(',') || [];
            const email_index = pdp_approvers.findIndex((approver) => approver.toLowerCase() === email.toLowerCase());

            if (email_index === -1) {
                logger.error(`${requestId} - Unauthorized to approve PDP unlock request`);
                return { success: false, message: 'Unauthorized to approve PDP unlock request' };
            }

            if (pdpUnlockRequestData.data?.responded_by && pdpUnlockRequestData.data?.responded_by.includes(userId)) {
                logger.error(`${requestId} - User(${userId}) has already responded to this request`);
                return { success: false, message: 'You have already responded to this request' };
            }

            const firstApproverDetails = await AdminModel.getPdpApproverDetails(pdp_approvers[0]);
            if (!firstApproverDetails) {
                logger.error(` ${requestId} - First approver not found`);
                return { success: false, message: 'First approver not found' };
            }

            if (email_index > 0) {
                if (!pdpUnlockRequestData.data?.responded_by || !pdpUnlockRequestData.data?.responded_by.includes(firstApproverDetails.user_id)) {
                    logger.error(` ${requestId} - Previous approver has not responded`);
                    return { success: false, message: 'Previous approver has not responded' };
                }
            }

            next_approver_email = pdp_approvers[email_index + 1] || '';
        } catch (error) {
            logger.error('inside AdminService -> updatePdpUnlockRequest2, failed to validate PDP unlock request due to error: ', error);
            return { success: false, message: 'Failed to validate PDP unlock request' };
        }

        if (!request_data) {
            logger.error('inside AdminService -> updatePdpUnlockRequest2, request data not found');
            return { success: false, message: 'Request data not found' };
        }

        const result = await AdminModel.updatePDPUnlockRequest(requestId, status, userId, email);
        if (!result) {
            logger.error('inside AdminService -> updatePdpUnlockRequest2, failed to update PDP unlock request');
            return { success: false, message: 'Failed to update PDP unlock request' };
        }
        if (result?.success) {
            try {
                /*
            - Finds the SSO User detail by role and filters the user who has created the request
            - Finds the hierarchy from the request creator's area code
            - If the request creator is a TSE, its email will be pushed along with the email of ASM and CM (Cluster Manager)
            - If the request creator is an ASM, all ASMs belonging to the same Area Code along with the CM will be pushed to recipient array
            */
                const start_date = commonHelper.formatDate(request_data?.start_date);
                const end_date = commonHelper.formatDate(request_data?.end_date);
                const requested_on = commonHelper.formatDate(request_data?.requested_on);
                const areaRegion = request_data?.regions.join(',') + ' / ' + request_data?.areaCodes.join(',');
                const requestedByID = request_data?.requested_by?.split('#')[0] ?? '';
                const requestedByRole = request_data?.requested_by?.split('#')[1] ?? '';
                const recipientArr: string[] = [];
                const ssoUsers = await AdminModel.fetchSSOUsers([requestedByRole]);
                const requestUserData = ssoUsers?.find((item) => item.user_id === requestedByID) || null;
                if (requestUserData === null) {
                    logger.error(`inside AdminService -> updatePdpUnlockRequest, ${requestId} - Request creator not found / soft-deleted, hence unable to send email notification`);
                    return result;
                }
                if (!status || status === 'PENDING') {
                    let email_data = {
                        name: requestUserData?.first_name + ' ' + requestUserData?.last_name,
                        approver_email: next_approver_email,
                        req_id: requestId,
                        areaCodes: request_data?.areaCodes,
                        startDate: request_data?.start_date,
                        endDate: request_data?.end_date,
                        comments: request_data?.comments,
                        role: request_data?.requested_by.split('#')[1],
                        regions: request_data?.regions,
                        message: `${userName} has approved the request for PDP unlock.`,
                    };
                    AdminService.sendPdpUnlockRequestEmail(email_data);
                }

                if (requestedByRole === 'CLUSTER_MANAGER' || requestedByRole === 'SUPER_ADMIN' || requestedByRole === 'CUSTOMER_SERVICE') {
                    requestUserData ? recipientArr.push(requestUserData['email']) : '';
                } else if (requestedByRole === 'TSE' || requestedByRole === 'ASM') {
                    const hierarchyDetail = (await UserService.fetchSalesHierarchyDetails(requestUserData?.['code'])) ?? {};
                    if (requestedByRole === 'TSE') {
                        recipientArr.push(requestUserData['email']);
                    }
                    Object.keys(hierarchyDetail).forEach((role) => {
                        if (role === 'ASM' || role === 'CLUSTER_MANAGER') {
                            hierarchyDetail[role].forEach((item) => recipientArr.push(item.email));
                        }
                    });
                }
                Email.sendPdpUnlockStatusEmail(areaRegion, requested_on, start_date, end_date, status, userName, recipientArr, requestId);
            } catch (error) {
                logger.error('inside AdminService -> updatePdpUnlockRequest2, failed to send email notification due to error: ', error);
            }
        }
        return result;
    },

    async updateMultiplePdpUnlockRequests(data: { request_id: string; status: string | undefined }[], userId: string, email: string, userName: string) {
        logger.info('inside AdminService -> updateMultiplePdpUnlockRequests');
        let response: {
            request_id: string;
            success: boolean;
            message: string;
        }[] = [];
        for (let d of data) {
            const { request_id, status } = d;
            const result = await AdminService.updatePdpUnlockRequest2(request_id, status, userId, email, userName);
            response.push({ ...result, request_id });
        }
        return response;
    },

    async insertApprovedPDPUnlockRequest(customer_groups: string[], dist_channels: string[], regions: string[], area_codes: string[], states: string[], plants: string[], startDate: string, endDate: string, comments: string, userId: string, role: string[]) {
        logger.info('inside AdminService -> insertApprovedPDPUnlockRequest');
        try {
            const result = await AdminModel.insertApprovedPDPUnlockRequest2(customer_groups, dist_channels, regions, area_codes, states, plants, startDate, endDate, comments, userId, role);
            return result;
        } catch (error) {
            logger.error('inside AdminService -> insertApprovedPDPUnlockRequest, Error:', error);
            return null;
        }
    },

    async sendApprovedPDPUnlockRequestEmail(requestIds: string[]) {
        logger.info('inside AdminService -> sendApprovedPDPUnlockRequestEmail');
        try {
            const requests = await AdminModel.fetchPDPUnlockRequestsById(requestIds, true);
            const ccoUsers = await AdminModel.getTseUserList(1000,0,'','enabled','CALL_CENTRE_OPERATIONS',false);
            if (!requests) {
                logger.error('inside AdminService -> sendApprovedPDPUnlockRequestEmail, No requests found');
                return false;
            }
            if (requests.length === 0) {
                logger.info('inside AdminService -> sendApprovedPDPUnlockRequestEmail, No preapproved requests found');
                return true;
            }
            const ccoEmails =  ccoUsers?.rows?.map((user) => user.email) ?? [];

            for (let request of requests) {
                const { request_id, filters = {}, start_date, end_date, comments, distributor_codes } = request;
                const sd = commonHelper.formatDate(start_date);
                const ed = commonHelper.formatDate(end_date);
                const rsmClusterDetails = await AdminModel.fetchRSMClusterByDistributorIds(distributor_codes);
                if(rsmClusterDetails?.length){
                    let filterData = ``;
                    for(const key in filters) {
                        if (filters[key].length) {
                            filterData += ` ${key}: ${filters[key].join(',')} `;
                        } 
                    }
                    
                    
                    const emailData = { filterData, startDate: sd, endDate: ed, comments,  request_id,};
                    const emailSet = new Set<string>();
                    let filteredUserDetails: any[] = [];
                    rsmClusterDetails.forEach(item => {
                        if(emailSet.has(item.email)) return;
                        emailSet.add(item.email);
                        filteredUserDetails.push(item);
                    });
                    if(ccoEmails.length > 0) {
                        filteredUserDetails.push({
                            email : ccoEmails,
                            first_name : 'CCO',
                            last_name : 'Team',
                            role : 'CALL_CENTRE_OPERATIONS',
                        })
                    }
                    
                    Email.sendPreapprovedPDPUnlockRequestEmail(emailData,filteredUserDetails);
                }
            }

            return true;
        } catch (error) {
            logger.error('inside AdminService -> sendApprovedPDPUnlockRequestEmail, Error:', error);
            return false;
        }
    },
};