/**
 * @file admin.model
 * @description defines admin model methods
 */

import logger from '../lib/logger';
import _ from 'lodash';
import * as fs from 'fs';
import FileUploadToS3Bucket from '../helper/FileUploadToS3Bucket';
import helper from '../helper/index';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { AuthModel } from './authModel';
import configuration from '../config/environments/dev';
import { CUSTOMER_GROUPS_FOR_ORDERING, EXCLUSION_GROUP } from '../constant';
import { roles, pegasus } from '../constant/persona';
import moment from 'moment';
import { AdminService } from '../service/AdminService';
const conn = PostgresqlConnection.getInstance();

export const AdminModel = {
    async getGlobalEmailConfig() {
        //need to check with logger
        let client: any = null;

        try {
            client = await conn.getWriteClient();
            logger.info('inside get notifications config ');
            const sqlStatement = `select als.key, als.value from app_level_settings als where als.key = 'ENABLE_NOTIFICATIONS'`;
            const respose = await client.query(sqlStatement);
            return respose;
        } catch (e) {
            logger.error('error in get notifications config query', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getCFAData() {
        logger.info('inside AdminModel->getCFAData');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT cf.id,cf.zone,cf.depot_code,cf.sales_org,cf.distribution_channel,
            cf.division,cf.location,cf.name,cf.address,cf.email,cf.contact_person,cf.contact_number,
            cf.zone_manager_email,cf.cluster_manager_email FROM cfa_depot_mapping as cf
            `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error('error in AdminModel->getCFAData', error);
        } finally {
            client?.release();
        }
    },
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
        remarks: string = '',
    ) {
        logger.info(`inside model AdminModel.updateLoginSetting`);
        let client: PoolClient | null = null;
        const status = typeof enableLogin === 'boolean' && (enableLogin ? 'ACTIVE' : 'INACTIVE');
        const isLiqPresent = typeof enableLiquidation === 'boolean' && (enableLiquidation ? 'YES' : 'NO');
        const isPDPPresent = typeof enable_pdp === 'boolean' && (enable_pdp ? 'YES' : 'NO');
        const isAOPresent = typeof enable_ao === 'boolean' && (enable_ao ? 'YES' : 'NO');
        const isRegPresent = typeof enable_reg === 'boolean' && (enable_reg ? 'YES' : 'NO');
        const isROPresent = typeof enable_ro === 'boolean' && (enable_ro ? 'YES' : 'NO');
        const isBOPresent = typeof enable_bo === 'boolean' && (enable_bo ? 'YES' : 'NO');
        const isAosPresent = typeof enable_aos === 'boolean' && (enable_aos ? 'YES' : 'NO');
        const isNOCPresent = typeof enable_noc === 'boolean' && (enable_noc ? 'YES' : 'NO');
        const isDeliveryCodeEmailPresent = typeof enable_delivery_code_email === 'boolean' && (enable_delivery_code_email ? 'YES' : 'NO');
        logger.info(`distributor id: ${distributorId}, status: ${status}, isLiqPresent: ${isLiqPresent}`);
        try {
            client = await conn.getWriteClient();
            let updateLoginSettingStatement = `UPDATE distributor_master SET`;
            if (status) updateLoginSettingStatement += ` status = '${status}'`;
            if (typeof enableLiquidation === 'boolean') updateLoginSettingStatement += `${status ? ',' : ''} liquidation = ${enableLiquidation}`;
            if (typeof enable_pdp === 'boolean') updateLoginSettingStatement += `${status ? ',' : isLiqPresent ? ',' : ''} enable_pdp = ${enable_pdp} `;
            if (typeof enable_ao === 'boolean') updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent ? ',' : ''} ao_enable = ${enable_ao} `;
            if (typeof enable_reg === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent ? ',' : ''} reg_enable = ${enable_reg} `;
            if (typeof enable_ro === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent ? ',' : ''} ro_enable = ${enable_ro} `;
            if (typeof enable_bo === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent ? ',' : ''} bo_enable = ${enable_bo} `;
            if (typeof enable_aos === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent ? ',' : ''} aos_enable = ${enable_aos}`;
            if (typeof enable_noc === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent ? ',' : ''} noc_enable = ${enable_noc} `;
            if (typeof enable_delivery_code_email === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent || isNOCPresent ? ',' : ''} delivery_code_email_enable = ${enable_delivery_code_email} `;
            if (typeof enable_delivery_code_sms === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent || isNOCPresent || isDeliveryCodeEmailPresent ? ',' : ''} delivery_code_sms_enable = ${enable_delivery_code_sms} `;
            updateLoginSettingStatement += ` WHERE id = '${distributorId}' AND deleted = false`;
            const updateLoginSettingResponse = await client.query(updateLoginSettingStatement);
            if (isPDPPresent) {
                const pdpAuditTrailStatement = `
              INSERT INTO pdp_lock_audit_trail(distributor_id, status, updated_by, updated_on, comments)
              VALUES (${distributorId}, ${enable_pdp}, '${user_id}#${role}', now(), '${remarks}');
        `;
                const auditTrailResponse = await client.query(pdpAuditTrailStatement);
                if (auditTrailResponse.rowCount) logger.info('inside AdminModel->bulkUpdateLoginSetting, PDP Lock Audit Trail Updated Successfully, by user: ' + user_id);
                else logger.error('inside AdminModel->bulkUpdateLoginSetting, Failed to update PDP Lock Audit Trail');
            }
            return updateLoginSettingResponse;
        } catch (error) {
            logger.error(`error in AdminModel.updateLoginSetting: `, error);
            return null;
        } finally {
            client?.release();
        }
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
        remarks: string = '',
    ) {
        logger.info(`inside AdminModel->bulkUpdateLoginSetting, distributorIds: ${distributorIds}`);
        let client: PoolClient | null = null;
        const status = typeof enableLogin === 'boolean' && (enableLogin ? 'ACTIVE' : 'INACTIVE');
        const isLiqPresent = typeof enableLiquidation === 'boolean' && (enableLiquidation ? 'YES' : 'NO');
        const isPDPPresent = typeof enable_pdp === 'boolean' && (enable_pdp ? 'YES' : 'NO');
        const isAOPresent = typeof enable_ao === 'boolean' && (enable_ao ? 'YES' : 'NO');
        const isRegPresent = typeof enable_reg === 'boolean' && (enable_reg ? 'YES' : 'NO');
        const isROPresent = typeof enable_ro === 'boolean' && (enable_ro ? 'YES' : 'NO');
        const isBOPresent = typeof enable_bo === 'boolean' && (enable_bo ? 'YES' : 'NO');
        const isAosPresent = typeof enable_aos === 'boolean' && (enable_aos ? 'YES' : 'NO');
        const isNOCPresent = typeof enable_noc === 'boolean' && (enable_noc ? 'YES' : 'NO');
        const isDeliveryCodeEmailPresent = typeof enable_delivery_code_email === 'boolean' && (enable_delivery_code_email ? 'YES' : 'NO');
        logger.info(`distributor id: ${distributorIds}, status: ${status}, isLiqPresent: ${isLiqPresent}`);
        try {
            client = await conn.getWriteClient();
            let updateLoginSettingStatement = `UPDATE distributor_master SET`;
            if (status) updateLoginSettingStatement += ` status = '${status}'`;
            if (typeof enableLiquidation === 'boolean') updateLoginSettingStatement += `${status ? ',' : ''} liquidation = ${enableLiquidation}`;
            if (typeof enable_pdp === 'boolean') updateLoginSettingStatement += `${status ? ',' : isLiqPresent ? ',' : ''} enable_pdp = ${enable_pdp} `;
            if (typeof enable_ao === 'boolean') updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent ? ',' : ''} ao_enable = ${enable_ao} `;
            if (typeof enable_reg === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent ? ',' : ''} reg_enable = ${enable_reg} `;
            if (typeof enable_ro === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent ? ',' : ''} ro_enable = ${enable_ro} `;
            if (typeof enable_bo === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent ? ',' : ''} bo_enable = ${enable_bo} `;
            if (typeof enable_aos === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent ? ',' : ''} aos_enable =${enable_aos}`;
            if (typeof enable_noc === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent ? ',' : ''} noc_enable = ${enable_noc} `;
            if (typeof enable_delivery_code_email === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent || isNOCPresent ? ',' : ''} delivery_code_email_enable = ${enable_delivery_code_email} `;
            if (typeof enable_delivery_code_sms === 'boolean')
                updateLoginSettingStatement += `${status ? ',' : isLiqPresent || isPDPPresent || isAOPresent || isRegPresent || isROPresent || isBOPresent || isAosPresent || isNOCPresent || isDeliveryCodeEmailPresent ? ',' : ''} delivery_code_sms_enable = ${enable_delivery_code_sms} `;

            let distributorIdsStatement = '';

            let distCount = 0;
            distributorIds.forEach((distributorId) => {
                distributorIdsStatement += `'${distributorId}'`;
                distCount++;
                if (distCount < distributorIds.length) {
                    distributorIdsStatement = distributorIdsStatement + ', ';
                }
            });
            updateLoginSettingStatement += ` WHERE id in (` + distributorIdsStatement + `) AND deleted = false`;
            const updateLoginSettingResponse = await client.query(updateLoginSettingStatement);
            if (isPDPPresent) {
                const pdpAuditTrailStatement = `
              INSERT INTO pdp_lock_audit_trail(distributor_id, status, updated_by, updated_on, comments)
              SELECT id, ${enable_pdp}, '${user_id}#${role.join(',')}', now(), '${remarks}'
              FROM (VALUES ${distributorIds.map((id) => `(${id})`).join(', ')}) AS t(id);
        `;

                const auditTrailResponse = await client.query(pdpAuditTrailStatement);
                if (auditTrailResponse.rowCount) logger.info('inside AdminModel->bulkUpdateLoginSetting, PDP Lock Audit Trail Updated Successfully, by user: ' + user_id);
                else logger.error('inside AdminModel->bulkUpdateLoginSetting, Failed to update PDP Lock Audit Trail');
            }

            return updateLoginSettingResponse;
        } catch (error) {
            logger.error(`error in AdminModel.bulkUpdateLoginSetting: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

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
        logger.info(`inside model AdminModel.getDistributorListByAdminRole`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let query = `
            WITH pdp_unlock_requests AS (
                SELECT ppur.request_id , ppur.start_date , ppur.end_date 
                FROM preapproved_pdp_unlock_request ppur
                UNION 
                SELECT pur.request_id , pur.start_date , pur.end_date 
                FROM pdp_unlock_request pur
            )
            SELECT DISTINCT up.id, up.name, up.mobile, up.email, dm.area_code, dm.city, dm.status, dm.postal_code, dm.liquidation as enable_liquidation, dm.enable_pdp, dm.ao_enable as enable_ao , dm.reg_enable as enable_reg , dm.ro_enable as enable_ro , dm.bo_enable as enable_bo , dm.noc_enable as enable_noc, rm.description as state, np.po_so_sms, dm.tse_code, gm.description as region, cgm.description, pur.start_date as pdp_unlock_start, pur.end_date as pdp_unlock_end, 
            CASE WHEN np.po_so_sms IS NULL THEN false
                ELSE np.po_so_sms
                END AS enable_po_so_sms,
            CASE WHEN np.po_so_email IS NULL THEN false
                ELSE np.po_so_email
                END AS enable_po_so_email,
            CASE WHEN np.invoice_details_sync_sms IS NULL THEN false
                ELSE np.invoice_details_sync_sms
                END AS enable_invoice_sync_sms,
            CASE WHEN np.invoice_details_sync_email IS NULL THEN false
                ELSE np.invoice_details_sync_email
                END AS enable_invoice_sync_email,
            CASE WHEN np.sms_tse_asm IS NULL THEN false
                ELSE np.sms_tse_asm
                END AS sms_tse_asm,
            CASE WHEN np.email_tse_asm IS NULL THEN false
                ELSE np.email_tse_asm
                END AS email_tse_asm,
            CASE WHEN dm.status = 'ACTIVE' THEN true
                ELSE false
                END AS enable_login
            FROM user_profile up 
            LEFT JOIN distributor_master dm ON up.id = dm.profile_id 
            LEFT JOIN distributor_plants dp ON (dm.id = dp.distributor_id)
	          LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
            LEFT JOIN region_master rm ON dm.region_id = rm.id 
            LEFT JOIN notification_preferences np ON np.user_profile_id = up.id 
            LEFT JOIN group5_master gm ON gm.id = dm.group5_id
            LEFT JOIN customer_group_master cgm ON cgm.id = dm.group_id
            LEFT JOIN pdp_unlock_requests pur ON (dm.pdp_unlock_id IS NOT NULL AND pur.request_id = dm.pdp_unlock_id)`;

            let whereCondition = ` WHERE(up.name ILIKE '%${search}%'
                            OR up.id ILIKE '%${search}%'
                            OR up.mobile ILIKE '%${search}%'
                            OR rm.description ILIKE '%${search}%' 
                            OR gm.description ILIKE '%${search}%'
                            OR cgm.description ILIKE '%${search}%'
                            OR dm.tse_code ILIKE '%${search}%')`;

            let limitOffset = ` ORDER BY id LIMIT ${limit} OFFSET ${offset} `;

            let sqlStatement = query;
            let recursiveSalesHierarchyQuery;
            if (roles === 'DIST_ADMIN' || roles === 'TSE' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                recursiveSalesHierarchyQuery = ` dm.tse_code IN ${helper.tseHierarchyQuery(userId)} `;
            } else if (roles === 'ASM') {
                recursiveSalesHierarchyQuery = ` dm.area_code IN ${helper.asmHierarchyQuery(userId)}`;
            } else if (roles === 'OPERATIONS') {
                recursiveSalesHierarchyQuery = ` dm.group5_id IN ( ${helper.operationsHierarchyQuery(userId)} ) `;
            }
            if (userId) {
                if (search) {
                    sqlStatement += whereCondition;
                    if (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'TSE' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                        sqlStatement += ` AND ${recursiveSalesHierarchyQuery} `;
                    }
                } else {
                    if (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'TSE' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                        sqlStatement += ` WHERE ${recursiveSalesHierarchyQuery} `;
                    }
                }
            }

            if (customer_group === undefined || customer_group === null || customer_group === '') {
                customer_group = '';
            }
            if (region === undefined || region === null || region === '') {
                region = '';
            }
            if (state === undefined || state === null || state === '') {
                state = '';
            }
            if (area_code === undefined || area_code === null || area_code === '') {
                area_code = '';
            }

            if ((customer_group || region || state || area_code) && !search && (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'CALL_CENTRE_OPERATIONS'|| roles === 'CUSTOMER_SERVICE')) {
                sqlStatement += ` WHERE cgm.description ILIKE '%${customer_group}%'
                          AND gm.description ILIKE '%${region}%'
                          AND dm.area_code ILIKE '%${area_code}%'
                          AND rm.description ILIKE '%${state}%' `;
            } else if (
                (customer_group || region || state || area_code) &&
                !search &&
                (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER')
            ) {
                sqlStatement += ` AND cgm.description ILIKE '%${customer_group}%'
                          AND gm.description ILIKE '%${region}%'
                          AND dm.area_code ILIKE '%${area_code}%'
                          AND rm.description ILIKE '%${state}%'`;
            }

            if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                !(search || customer_group || region || state || area_code) &&
                status !== 'DELETED'
            ) {
                sqlStatement += ` WHERE dm.deleted = false `;
            } else if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                !(search || customer_group || region || state || area_code) &&
                status === 'DELETED'
            ) {
                sqlStatement += ` WHERE dm.deleted = true `;
            } else if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                (search || customer_group || region || state || area_code) &&
                status === 'DELETED'
            ) {
                sqlStatement += ` AND dm.deleted = true `;
            } else if (roles === 'OPERATIONS' && status === 'DELETED') {
                sqlStatement += ` AND dm.deleted = true `;
            } else {
                sqlStatement += ` AND dm.deleted = false `;
            }
            if (
                roles === 'SUPER_ADMIN' ||
                roles === 'SUPPORT' ||
                roles === 'DIST_ADMIN' ||
                roles === 'ASM' ||
                roles === 'TSE' ||
                roles === 'OPERATIONS' ||
                roles === 'RSM' ||
                roles === 'CLUSTER_MANAGER' ||
                roles === 'PORTAL_OPERATIONS' ||
                roles === 'CALL_CENTRE_OPERATIONS' || 
                roles === 'CUSTOMER_SERVICE'
            ) {
                if (status && status !== 'ALL' && status !== 'DELETED') {
                    sqlStatement += ` AND dm.status = '${status}'`;
                }
            }
            sqlStatement += ` AND cgm.name NOT IN ('${EXCLUSION_GROUP.join("' , '")}')`;
            if (plant_code) {
                sqlStatement += ` AND pm.name = '${plant_code}' `;
            }
            if (limit !== 0) sqlStatement += limitOffset;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.getDistributorListByAdminRole: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

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
        logger.info(`inside model AdminModel.getDistributorListByAdminRoleCount`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let query = `
            SELECT COUNT(DISTINCT up.id)
            FROM user_profile up 
            LEFT JOIN distributor_master dm ON up.id = dm.profile_id 
            LEFT JOIN distributor_plants dp ON (dm.id = dp.distributor_id)
	          LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
            LEFT JOIN region_master rm ON dm.region_id = rm.id 
            LEFT JOIN notification_preferences np ON np.user_profile_id = up.id
            LEFT JOIN group5_master gm ON gm.id = dm.group5_id
            LEFT JOIN customer_group_master cgm ON cgm.id = dm.group_id`;

            let whereCondition = ` WHERE(up.name ILIKE '%${search}%'
      OR up.id ILIKE '%${search}%'
      OR up.mobile ILIKE '%${search}%'
      OR rm.description ILIKE '%${search}%' 
      OR gm.description ILIKE '%${search}%'
      OR cgm.description ILIKE '%${search}%'
      OR dm.tse_code ILIKE '%${search}%') `;

            let sqlStatement = query;
            let recursiveSalesHierarchyQuery;
            if (roles === 'DIST_ADMIN' || roles === 'TSE' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                recursiveSalesHierarchyQuery = ` dm.tse_code IN ${helper.tseHierarchyQuery(userId)} `;
            } else if (roles === 'ASM') {
                recursiveSalesHierarchyQuery = ` dm.area_code IN ${helper.asmHierarchyQuery(userId)}`;
            } else if (roles === 'OPERATIONS') {
                recursiveSalesHierarchyQuery = ` dm.group5_id IN ( ${helper.operationsHierarchyQuery(userId)} )`;
            }
            if (userId) {
                if (search) {
                    sqlStatement += whereCondition;
                    if (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'TSE' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                        sqlStatement += ` AND ${recursiveSalesHierarchyQuery} `;
                    }
                } else {
                    if (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'TSE' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
                        sqlStatement += ` WHERE ${recursiveSalesHierarchyQuery} `;
                    }
                }
            }

            if (customer_group === undefined || customer_group === null || customer_group === '') {
                customer_group = '';
            }
            if (region === undefined || region === null || region === '') {
                region = '';
            }
            if (state === undefined || state === null || state === '') {
                state = '';
            }
            if (area_code === undefined || area_code === null || area_code === '') {
                area_code = '';
            }

            if (
                (customer_group || region || state || area_code) &&
                !search &&
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE')
            ) {
                sqlStatement += ` WHERE cgm.description ILIKE '%${customer_group}%'
                          AND gm.description ILIKE '%${region}%'
                          AND dm.area_code ILIKE '%${area_code}%'
                          AND rm.description ILIKE '%${state}%'`;
            } else if (
                (customer_group || region || state || area_code) &&
                !search &&
                (roles === 'DIST_ADMIN' || roles === 'ASM' || roles === 'OPERATIONS' || roles === 'RSM' || roles === 'CLUSTER_MANAGER')
            ) {
                sqlStatement += ` AND cgm.description ILIKE '%${customer_group}%'
                          AND gm.description ILIKE '%${region}%'
                          AND dm.area_code ILIKE '%${area_code}%'
                          AND rm.description ILIKE '%${state}%'`;
            }

            if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                !(search || customer_group || region || state || area_code) &&
                status !== 'DELETED'
            ) {
                sqlStatement += ` WHERE dm.deleted = false `;
            } else if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                !(search || customer_group || region || state || area_code) &&
                status === 'DELETED'
            ) {
                sqlStatement += ` WHERE dm.deleted = true `;
            } else if (
                (roles === 'SUPER_ADMIN' || roles === 'SUPPORT' || roles === 'PORTAL_OPERATIONS' || roles === 'CALL_CENTRE_OPERATIONS' || roles === 'CUSTOMER_SERVICE') &&
                (search || customer_group || region || state || area_code) &&
                status === 'DELETED'
            ) {
                sqlStatement += ` AND dm.deleted = true `;
            } else if (roles === 'OPERATIONS' && status === 'DELETED') {
                sqlStatement += ` AND dm.deleted = true `;
            } else {
                sqlStatement += ` AND dm.deleted = false `;
            }
            if (
                roles === 'SUPER_ADMIN' ||
                roles === 'SUPPORT' ||
                roles === 'DIST_ADMIN' ||
                roles === 'TSE' ||
                roles === 'ASM' ||
                roles === 'OPERATIONS' ||
                roles === 'RSM' ||
                roles === 'CLUSTER_MANAGER' ||
                roles === 'PORTAL_OPERATIONS' ||
                roles === 'CALL_CENTRE_OPERATIONS' ||
                roles === 'CUSTOMER_SERVICE'
            ) {
                if (status && status !== 'ALL' && status !== 'DELETED') {
                    sqlStatement += ` AND dm.status = '${status}'`;
                }
            }
            sqlStatement += " AND cgm.name NOT IN('16', '42', '19', '21', '41') ";
            if (plant_code) {
                sqlStatement += ` AND pm.name = '${plant_code}' `;
            }
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.getDistributorListByAdminRoleCount: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateAlertSettings(
        distributorId: string,
        enablePoSoSms: boolean | null = null,
        enablePoSoEmail: boolean | null = null,
        enableInvoiceSyncSms: boolean | null = null,
        enableInvoiceSyncEmail: boolean | null = null,
        emailTseAsm: boolean | null = null,
        smsTseAsm: boolean | null = null,
    ) {
        logger.info(`inside model AdminModel.updateAlertSettings`);
        let client: PoolClient | null = null;
        logger.info(`distributor id: ${distributorId} `);
        try {
            client = await conn.getWriteClient();
            if (
                enablePoSoSms === null &&
                enablePoSoEmail === null &&
                enableInvoiceSyncSms === null &&
                enableInvoiceSyncEmail === null &&
                emailTseAsm === null &&
                smsTseAsm === null
            ) {
                return null;
            }

            let upsertAlertSettingsStatement = `INSERT INTO notification_preferences(po_so_sms, po_so_email, invoice_details_sync_sms, invoice_details_sync_email, email_tse_asm, sms_tse_asm, user_profile_id) VALUES(${!!enablePoSoSms}, ${!!enablePoSoEmail},${!!enableInvoiceSyncSms},${!!enableInvoiceSyncEmail},${!!emailTseAsm},${!!smsTseAsm}, '${distributorId}') ON CONFLICT(user_profile_id) DO UPDATE SET `;
            let updateConditionsStatement = '';
            if (typeof enablePoSoSms === 'boolean') {
                updateConditionsStatement += `po_so_sms = EXCLUDED.po_so_sms`;
            }
            if (typeof enablePoSoEmail === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `po_so_email = EXCLUDED.po_so_email`;
            }
            if (typeof enableInvoiceSyncSms === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `invoice_details_sync_sms = EXCLUDED.invoice_details_sync_sms`;
            }
            if (typeof enableInvoiceSyncEmail === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `invoice_details_sync_email = EXCLUDED.invoice_details_sync_email`;
            }
            if (typeof emailTseAsm === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `email_tse_asm = EXCLUDED.email_tse_asm`;
            }
            if (typeof smsTseAsm === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `sms_tse_asm = EXCLUDED.sms_tse_asm`;
            }
            upsertAlertSettingsStatement += `${updateConditionsStatement} `;
            const updateAlertSettingsResponse = await client.query(upsertAlertSettingsStatement);
            return updateAlertSettingsResponse;
        } catch (error) {
            logger.error(`error in AdminModel.updateAlertSettings: `, error);
            throw new error();
        } finally {
            client?.release();
        }
    },

    async bulkUpdateAlertSettings(
        distributorIds: Array<string>,
        enablePoSoSms: boolean | null = null,
        enablePoSoEmail: boolean | null = null,
        enableInvoiceSyncSms: boolean | null = null,
        enableInvoiceSyncEmail: boolean | null = null,
        emailTseAsm: boolean | null = null,
        smsTseAsm: boolean | null = null,
    ) {
        logger.info(`inside model AdminModel.bulkUpdateAlertSettings`);
        let client: PoolClient | null = null;
        logger.info(`distributor id: ${distributorIds} `);
        try {
            client = await conn.getWriteClient();
            if (
                enablePoSoSms === null &&
                enablePoSoEmail === null &&
                enableInvoiceSyncSms === null &&
                enableInvoiceSyncEmail === null &&
                emailTseAsm === null &&
                smsTseAsm === null
            ) {
                return null;
            }
            let upsertAlertSettingsStatement = `INSERT INTO notification_preferences(po_so_sms, po_so_email, invoice_details_sync_sms, invoice_details_sync_email, email_tse_asm, sms_tse_asm, user_profile_id) VALUES `;
            let insertValues = '';
            let valuesCount = 0;
            distributorIds.forEach((distributorId) => {
                insertValues += `(${!!enablePoSoSms}, ${!!enablePoSoEmail},${!!enableInvoiceSyncSms},${!!enableInvoiceSyncEmail},${!!emailTseAsm},${!!smsTseAsm}, '${distributorId}')`;
                valuesCount++;
                if (valuesCount < distributorIds.length) {
                    insertValues = insertValues + ', ';
                }
            });
            upsertAlertSettingsStatement = upsertAlertSettingsStatement + insertValues + ` ON CONFLICT(user_profile_id) DO UPDATE SET `;
            let updateConditionsStatement = '';
            if (typeof enablePoSoSms === 'boolean') {
                updateConditionsStatement += `po_so_sms = EXCLUDED.po_so_sms`;
            }
            if (typeof enablePoSoEmail === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `po_so_email = EXCLUDED.po_so_email`;
            }
            if (typeof enableInvoiceSyncSms === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `invoice_details_sync_sms = EXCLUDED.invoice_details_sync_sms`;
            }
            if (typeof enableInvoiceSyncEmail === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `invoice_details_sync_email = EXCLUDED.invoice_details_sync_email`;
            }
            if (typeof emailTseAsm === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `email_tse_asm = EXCLUDED.email_tse_asm`;
            }
            if (typeof smsTseAsm === 'boolean') {
                if (updateConditionsStatement) updateConditionsStatement += `, `;
                updateConditionsStatement += `sms_tse_asm = EXCLUDED.sms_tse_asm`;
            }
            upsertAlertSettingsStatement += `${updateConditionsStatement} `;
            const updateAlertSettingsResponse = await client.query(upsertAlertSettingsStatement);
            return updateAlertSettingsResponse;
        } catch (error) {
            logger.error(`error in AdminModel.bulkUpdateAlertSettings: `, error);
            throw new error();
        } finally {
            client?.release();
        }
    },

    async updateAlertHistory(
        distributorId: string,
        alertSettingChanges: {
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
        },
        remarks: string,
        changedBy: string,
    ) {
        logger.info(`inside model AdminModel.updateAlertHistory`);
        let client: PoolClient | null = null;
        logger.info(`distributor id: ${distributorId}, remarks: ${remarks}, changed by: ${changedBy} `);
        try {
            client = await conn.getWriteClient();
            const updateAlertHistoryStatement = `INSERT INTO alert_history(alert_setting_changes, remarks, distributor_id, changed_by) VALUES('${JSON.stringify(alertSettingChanges)}', '${remarks}', '${distributorId}', '${changedBy}')`;
            const updateAlertHistoryResponse = await client.query(updateAlertHistoryStatement);
            return updateAlertHistoryResponse;
        } catch (error) {
            logger.error(`error in AdminModel.updateAlertHistory: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async bulkUpdateAlertHistory(
        distributorIds: Array<string>,
        alertSettingChanges: {
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
        },
        remarks: string,
        changedBy: string,
    ) {
        logger.info(`inside model AdminModel.bulkUpdateAlertHistory`);
        let client: PoolClient | null = null;
        logger.info(`distributor id: ${distributorIds}, remarks: ${remarks}, changed by: ${changedBy} `);
        try {
            client = await conn.getWriteClient();
            let updateAlertHistoryStatement = `INSERT INTO alert_history(alert_setting_changes, remarks, distributor_id, changed_by) VALUES `;

            let insertValues = '';
            let valuesCount = 0;
            distributorIds.forEach((distributorId) => {
                insertValues += `('${JSON.stringify(alertSettingChanges)}', '${remarks}', '${distributorId}', '${changedBy}')`;
                valuesCount++;
                if (valuesCount < distributorIds.length) {
                    insertValues = insertValues + ', ';
                }
            });

            updateAlertHistoryStatement += insertValues;
            const updateAlertHistoryResponse = await client.query(updateAlertHistoryStatement);
            return updateAlertHistoryResponse;
        } catch (error) {
            logger.error(`error in AdminModel.bulkUpdateAlertHistory: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async adminDetailsStatement(email: string) {
        logger.info(`inside model AdminModel.adminDetailsStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${email}') AND deleted = false AND status = 'ACTIVE'`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.adminDetailsStatement: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async validateDistAdminOrTseStatement(adminId: string, distributorId: string) {
        logger.info(`inside model AdminModel.validateAdminStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master WHERE id = '${distributorId}' AND deleted IS false AND tse_code IN ${helper.tseHierarchyQuery(adminId)}`;
            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateAdminStatement: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async validateTseAdminStatement(adminCode: string, distributorId: string) {
        logger.info(`inside model AdminModel.validateTseAdminStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE tse_code = '${adminCode}' AND id = '${distributorId}' 
            AND deleted = false`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateTseAdminStatement: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async validateSuperAdminStatement(distributorId: string) {
        logger.info(`inside model AdminModel.validateSuperAdminStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE id = '${distributorId}' AND deleted = false`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateSuperAdminStatement: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateContactDetailsHistory(
        distributorId: string,
        contactDetailChanges: {
            update_mobile?: string;
            update_email?: string;
        },
        changedBy: string,
        remark: string,
    ) {
        logger.info(`inside model AdminModel.updateContactDetailsHistory`);
        let client: PoolClient | null = null;
        logger.info(`distributor id: ${distributorId}, changed by: ${changedBy} `);
        try {
            client = await conn.getWriteClient();
            const updateContactDetailsHistoryStatement = `INSERT INTO alert_history(alert_setting_changes, remarks, distributor_id, changed_by) VALUES('${JSON.stringify(
                contactDetailChanges,
            )}', '${remark}', '${distributorId}', '${changedBy}')`;
            const updateContactDetailsHistoryResponse = await client.query(updateContactDetailsHistoryStatement);
            return updateContactDetailsHistoryResponse;
        } catch (error) {
            logger.error(`error in AdminModel.updateContactDetailsHistory: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getTseUserList(limit: number, offset: number, search: string, status: string, role: string, deleted: boolean) {
        logger.info(`inside model AdminModel.getTseUserList`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            // https://tataconsumer.atlassian.net/browse/SOPE-52*/
            let sqlStatement = `SELECT user_id, first_name, last_name, email, mobile_number, status, roles::_varchar, code, deleted, manager_id FROM sales_hierarchy_details WHERE email IS NOT null`;
            let limitOffset = ` ORDER BY user_id LIMIT ${limit} OFFSET ${offset} `;

            deleted ? (sqlStatement += ` AND deleted= true`) : null;

            let whereCondition = ` AND(CONCAT(first_name, ' ', last_name) ILIKE '%${search}%'
            OR email ILIKE '%${search}%'
            OR code ILIKE '%${search}%' 
            OR mobile_number ILIKE '%${search}%')`;

            if (search) {
                sqlStatement += whereCondition;
            }

            if (status) {
                let statusCondition = ``;
                if (status === 'enabled') {
                    statusCondition = ` AND status = 'ACTIVE'`;
                } else if (status === 'disabled') {
                    statusCondition = ` AND status = 'INACTIVE'`;
                }
                sqlStatement += statusCondition;
            }

            if (role && role !== '') {
                let roleCondition = ` AND '${role}' = ANY(roles)`;
                sqlStatement += roleCondition;
            }

            sqlStatement += limitOffset;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.getTseUserList: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async updateTseUserSetting(user_id: string, enableLogin: string, role: string[], isDeleted: boolean, code: string, email: string | null = null) {
        /* A trigger function has been created in the database that prevents adding multiple roles from a same team,
     in case there is a new role being added or a new team is being introduced, kindly include them in restrict_role_update() trigger function */
        logger.info(`inside model AdminModel.updateTseUserSetting`);

        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let sqlStatement = `UPDATE sales_hierarchy_details SET updated_on = CURRENT_TIMESTAMP`;
            const whereCondition = `WHERE user_id = '${user_id}'`;

            if (role) {
                sqlStatement += `, roles = '{${role}}' `;
            }

            if (code || code === '') {
                sqlStatement += `, code = '${code}' `;
            }

            if (enableLogin === 'ACTIVE') {
                sqlStatement += `, status = 'ACTIVE' `;
            } else if (enableLogin === 'INACTIVE') {
                sqlStatement += `, status = 'INACTIVE' `;
            }
            const centralRoles = [...pegasus.ADMIN, ...pegasus.MT_ECOM, ...pegasus.LOGISTICS, roles.OPERATIONS, roles.CALL_CENTRE_OPERATIONS];

            if (isDeleted) {
                if (_.intersection(role, centralRoles).length > 0) sqlStatement += `, deleted = true, manager_id = '' `;
                else sqlStatement += `, deleted = true `;
            } else {
                if (_.intersection(role, centralRoles).length > 0) sqlStatement += `, deleted = false, manager_id = 'PORTAL_MANAGED' `;
                else sqlStatement += `, deleted = false `;
            }

            if (email) {
                sqlStatement += `, email = '${email}' `;
            }

            sqlStatement += whereCondition;

            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error(`error in AdminModel.updateTseUserSetting: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async getTseUserListCount(search: string, status: string, role: string, deleted: boolean) {
        logger.info(`inside model AdminModel.getTseUserListCount`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT COUNT(user_id) FROM sales_hierarchy_details WHERE email IS NOT null`;

            deleted ? (sqlStatement += ` AND deleted= true`) : null;

            let whereCondition = ` AND(CONCAT(first_name, ' ', last_name) ILIKE '%${search}%'
            OR email ILIKE '%${search}%' 
            OR code ILIKE '%${search}%'
            OR mobile_number ILIKE '%${search}%')`;

            if (search) {
                sqlStatement += whereCondition;
            }

            if (status) {
                let statusCondition = ``;
                if (status === 'enabled') {
                    statusCondition = ` AND status = 'ACTIVE'`;
                } else if (status === 'disabled') {
                    statusCondition = ` AND status = 'INACTIVE'`;
                }
                sqlStatement += statusCondition;
            }

            if (role && role !== '') {
                let roleCondition = ` AND '${role}' = ANY(roles)`;
                sqlStatement += roleCondition;
            }

            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.getTseUserListCount: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateAppLevelSettings(appLevelSettingChanges: {
        app_level_configuration: [
            {
                key: string;
                value: string;
                remarks: string;
            },
        ];
        updatedBy: string;
    }) {
        logger.info(`inside authModel.updateAppLevelSettings`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let sqlStatement = `UPDATE app_level_settings `;
            let keys = '',
                valueQuery = '',
                remarksQuery = '';
            for (let appLevelSetting of appLevelSettingChanges.app_level_configuration) {
                valueQuery += `WHEN key = '${appLevelSetting.key}' then '${appLevelSetting.value}' `;
                remarksQuery += `WHEN key = '${appLevelSetting.key}' then '${appLevelSetting.remarks ? appLevelSetting.remarks : ''}' `;
                keys += (keys ? ',' : '') + `'${appLevelSetting.key}'`;
            }
            if (valueQuery) {
                sqlStatement += `SET value = (CASE ${valueQuery} END), remarks = (CASE ${remarksQuery} END)`;
            }
            sqlStatement += `, updated_by = '${appLevelSettingChanges.updatedBy}' WHERE key IN(${keys})`;
            const response = await client.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error(`error in authModel.updateAppLevelSettings: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async enableCustomerGroupPdp(cgString: string, columnName: string) {
        logger.info(`inside AdminModel -> enableCustomerGroupPdp`);
        let client: any = null;
        try {
            let cgArray = cgString.split(',');
            let inString = cgArray.reduce((a, b) => a + ',' + "'" + b + "'", '').substring(1);
            let sqlStatement = `UPDATE customer_group_master
                          SET  ${columnName}= CASE
                                                   WHEN name IN (${inString}) THEN true
                                                   ELSE false
                                                   END`;
            client = await conn.getWriteClient();
            let result = await client.query(sqlStatement);

            logger.info(`inside AdminModel -> enableCustomerGroupPdp, RowCount: `, result.rowCount);
            return result.rowCount;
        } catch (error) {
            logger.error(`inside AdminModel -> enableCustomerGroupPdp: Error: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async addSSOUser(name: string, email: string, role: string[], code: string | null = '') {
        /* A trigger function has been created in the database that prevents adding multiple roles from a same team,
      in case there is a new role being added or a new team is being introdoced, kindly include them in restrict_role_update() trigger function */
        logger.info(`inside model AdminModel.addSSOUser`);
        email = email.toLocaleLowerCase();
        let readClient: PoolClient | null = null;
        let writeClient: PoolClient | null = null;
        try {
            readClient = await conn.getReadClient();
            writeClient = await conn.getWriteClient();
            let sqlStatement = `SELECT email FROM public.sales_hierarchy_details WHERE email ILIKE '${email}'`;
            let result = await readClient.query(sqlStatement);
            logger.info('inside model AdminModel.addSSOUser, email search ,rowCount ' + result.rowCount);
            if (result.rowCount > 0) {
                return false;
            } else {
                let full_name = name.split(' ');
                let first_name = full_name[0];
                let last_name = full_name.length > 1 ? full_name[1] : '';
                let user_id = 'TCPL_' + (new Date().getTime() + '').substring(5);
                sqlStatement = `INSERT INTO public.sales_hierarchy_details(
                user_id, first_name, last_name, email, roles, status, manager_id, code)
                VALUES ('${user_id}','${first_name}', '${last_name}', '${email}', '{${role}}', 'ACTIVE' , 'PORTAL_MANAGED', '${code}');`;

                result = await writeClient.query(sqlStatement);
                if (result.rowCount === 1) {
                    if (role.includes('KAMS')) {
                        const addKams = await this.addKamsRoles(user_id, code?.split(','));
                        return addKams && true;
                    }
                    return true;
                } else return false;
            }
        } catch (error) {
            logger.error(`error in AdminModel.addSSOUser: `, error);
            return null;
        } finally {
            readClient?.release();
            writeClient?.release();
        }
    },

    async addUploadedFileToTheAWSS3(file, formData) {
        logger.info(`inside authModel.addUploadedFileToTheAWSS3`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            if (file && file.length && file.length > 0) {
                const sql = 'select file_name from files';
                const res = await client.query(sql);
                for (let i = 0; i < res.rows.length; i++) {
                    if (res.rows[i] && res.rows[i].file_name && res.rows[i].file_name.length) {
                        for (let j = 0; j < res.rows[i].file_name.length; j++) {
                            for (let k = 0; k < file.length; k++) {
                                if (res.rows[i].file_name[j] == file[k].originalname) {
                                    fs.readdir('uploadedFileStore/', (err, files) => {
                                        if (err) throw err;

                                        for (const file of files) {
                                            fs.unlinkSync('uploadedFileStore/' + file);
                                        }
                                    });
                                    return 'FILE_EXIST';
                                }
                            }
                        }
                    }
                }
                let fileName: any = [];
                let filePath: any = [];

                for (let i = 0; i < file.length; i++) {
                    fileName[i] = file[i].originalname;
                    filePath[i] = file[i].originalname;
                }

                if (formData.contactName == 'undefined' && formData.contact == 'undefined' && formData.email == 'undefined') {
                    const sqlStatement = `INSERT INTO files (title,file_name, description, category, file_path, status,uploaded_by)
                    VALUES ('${formData.title}','{${fileName}}', '${formData.description}', '${formData.category}', '{${filePath}}', 'ACTIVE','${formData.userName}');`;
                    const queryResponse = await client.query(sqlStatement);
                    if (queryResponse && queryResponse.rowCount > 0) {
                        return new Promise((resolve, reject) => {
                            for (let i = 0; i < file.length; i++) {
                                const path = 'uploadedFileStore/' + file[i].filename;
                                const data = fs.readFileSync(path);
                                const bucketName = process.env.BUCKET_NAME_S3;
                                const params = {
                                    Bucket: bucketName,
                                    Key: process.env.FOLDER_NAME_S3 + file[i].originalname,
                                    Body: data,
                                };
                                FileUploadToS3Bucket.uploadFileToS3(params, path)
                                    .then((data) => {
                                        resolve(data);
                                    })
                                    .catch(async (err) => {
                                        fs.unlink(path, (err) => {
                                            if (err) {
                                                logger.info(`fail to delete file form local`, err);
                                            } else {
                                                logger.info(`file deleted form local successfully`, err);
                                            }
                                        });
                                        const sql = `DELETE FROM files
                                    WHERE title='${formData.title}';`;
                                        const queryResponse = await client.query(sql);
                                        reject(err);
                                    });
                            }
                        });
                    }
                }
                const sqlStatement = `INSERT INTO files (title,file_name, description, category, file_path, status,uploaded_by, contact_name, contact_number, email)
            VALUES ('${formData.title}','{${fileName}}', '${formData.description}', '${formData.category}', '{${filePath}}', 'ACTIVE','${formData.userName}','${formData.contactName}','${formData.contact}','${formData.email}');`;

                const queryResponse = await client.query(sqlStatement);

                if (queryResponse && queryResponse.rowCount > 0) {
                    return new Promise((resolve, reject) => {
                        for (let i = 0; i < file.length; i++) {
                            const path = 'uploadedFileStore/' + file[i].filename;
                            const data = fs.readFileSync(path);
                            const bucketName = process.env.BUCKET_NAME_S3;
                            const params = {
                                Bucket: bucketName,
                                Key: process.env.FOLDER_NAME_S3 + file[i].originalname,
                                Body: data,
                            };
                            FileUploadToS3Bucket.uploadFileToS3(params, path)
                                .then((data) => {
                                    resolve(data);
                                })
                                .catch(async (err) => {
                                    fs.unlink(path, (err) => {
                                        if (err) {
                                            logger.info(`fail to delete file form local`, err);
                                        } else {
                                            logger.info(`file deleted form local successfully`, err);
                                        }
                                    });
                                    const sql = `DELETE FROM files
                                WHERE title='${formData.title}';`;
                                    const queryResponse = await client.query(sql);
                                    reject(err);
                                });
                        }
                    });
                }
            } else {
                const sqlStatement = `INSERT INTO files (title, description, category, status,uploaded_by, contact_name, contact_number, email)
            VALUES ('${formData.title}', '${formData.description}', '${formData.category}', 'ACTIVE','${formData.userName}','${formData.contactName}','${formData.contact}','${formData.email}');`;

                const queryResponse = await client.query(sqlStatement);
                return queryResponse;
            }
        } catch (error) {
            logger.error(`error in authModel.addUploadedFileToTheAWSS3: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getFilesHistoryCount(search: string, searchField: string) {
        logger.info(`inside authModel.getFilesHistoryCount`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT count(id) from files`;
            if (search && searchField) {
                let whereCondition = ` where (${searchField} ILIKE '%${search}%')`;
                sqlStatement += whereCondition;
            }
            const result = await client.query(sqlStatement);
            return result.rows[0].count;
        } catch (err) {
            logger.error(`error in authModel.getFilesHistoryCount: `, err);
            return null;
        } finally {
            client?.release();
        }
    },

    async getFilesHistory(limit: number, offset: number, search: string, searchField: string) {
        logger.info(`inside authModel.getFilesHistory`);

        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT * from files`;
            let limitOffset = ` ORDER BY uploaded_on DESC LIMIT ${limit} OFFSET ${offset} `;
            if (search && searchField) {
                let whereCondition = ` where (${searchField} ILIKE '%${search}%')`;
                sqlStatement += whereCondition;
            }
            sqlStatement += limitOffset;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (err) {
            logger.error(`error in authModel.getFilesHistoryCount: `, err);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateFileStatus(status, id) {
        logger.info(`inside authModel.updateFileStatus`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            let sqlStatement = `UPDATE files
            SET status= '${status}'
            WHERE id=${id}`;

            const rows = await client.query(sqlStatement);
            if (rows.rowCount) {
                return rows.rowCount;
            }
            return null;
        } catch (err) {
            logger.error(`error in authModel.updateFileStatus: `, err);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchHelpSectionData(limit, offset, category) {
        logger.info(`inside model AdminModel.fetchHelpSectionData`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `select * from files`;

            const whereCondition = ` where category = '${category}' and status='ACTIVE'`;
            let limitOffset = ` ORDER BY uploaded_on DESC LIMIT ${limit} OFFSET ${offset} `;
            sqlStatement += whereCondition;
            sqlStatement += limitOffset;
            const result = await client.query(sqlStatement);

            return result;
        } catch (error) {
            logger.error(`error in AdminModel.fetchHelpSectionData: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchHelpSectionDataCount(search, searchField, category) {
        logger.info(`inside model AdminModel.fetchHelpSectionData`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            let sqlStatement = `select count(id) from  files`;

            const whereCondition = ` where category = '${category}' and status='ACTIVE' `;
            sqlStatement += whereCondition;

            const result = await client.query(sqlStatement);
            return result.rows[0].count;
        } catch (error) {
            logger.error(`error in AdminModel.fetchHelpSectionData: `, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async createPreAssignUrl(path) {
        try {
            logger.info(`inside model AdminModel.createPreAssignUrl`);
            return new Promise(async (resolve, reject) => {
                FileUploadToS3Bucket.createPreAssignUrl(path)
                    .then((url) => {
                        resolve(url);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        } catch (err) {
            logger.info(`Error in admin model while creating preassign url`, err);
            return null;
        }
    },

    async filterCategoriesModel(excludeDeleted: boolean, roles: string[], userId: string, code: string | null) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            logger.info(`inside model AdminModel.FilterCategoriesModel`);
            const ruleConfig_query = `SELECT DISTINCT dm.area_code, rm.description as state, g5m.description as region, g5m.id as region_id, dm.tse_code, dp.distribution_channel`;
            const ruleConfigWhereCondition = excludeDeleted ? `AND (dm.deleted = FALSE OR dm.status = 'ACTIVE') ` : '';
            const distributorsResponse = (await this.fetchDistributorsByAdminRole(roles, userId, code)) ?? [];
            const uniqueDistributors = [...new Set(distributorsResponse?.rows?.map((item: any) => item.id))];
            const distributorCodeCondition: string = uniqueDistributors.length > 0 ? ` AND dm.id IN ('${uniqueDistributors.join("' , '")}')` : '';

            const customer_group_query = `
          SELECT DISTINCT cgm.description AS customer_group , dp.distribution_channel
          FROM customer_group_master cgm 
          INNER JOIN distributor_master dm ON dm.group_id = cgm.id
          INNER JOIN distributor_plants dp ON (dm.deleted = FALSE AND dm.status = 'ACTIVE' AND dm.id = dp.distributor_id) 
          WHERE cgm.description != 'null' 
          AND cgm.name IN ('${CUSTOMER_GROUPS_FOR_ORDERING.join("' , '")}')
          ${distributorCodeCondition}
          ORDER BY cgm.description
      `;
            const customerGroupResponse = await client.query(customer_group_query);

            const area_details_query = `
      ${
          excludeDeleted
              ? ruleConfig_query
              : `
        SELECT 
          DISTINCT
          dm.area_code,
          rm.description as state,
          g5m.description as region,
          g5m.id as region_id,
          cgm.description  as customer_groups,
          dp.distribution_channel,
          pm.name as plant_code,
          pm.description AS plant_name`
      }
      FROM distributor_master dm
      LEFT JOIN distributor_plants dp ON (dm.id = dp.distributor_id)
      LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
      LEFT JOIN region_master rm ON rm.id = dm.region_id
      LEFT JOIN group5_master g5m ON g5m.id = dm.group5_id
      INNER JOIN  customer_group_master cgm on cgm.id = dm.group_id  
      WHERE dm.area_code IS NOT null
      ${ruleConfigWhereCondition}
      AND dm.area_code != ''
      AND rm.description IS NOT null
      AND cgm.name in ('${CUSTOMER_GROUPS_FOR_ORDERING.join("' , '")}')
      AND g5m.description IS NOT null
      ${distributorCodeCondition}
      ORDER BY dm.area_code;
      `;

            const areaDetailsResponse = await client.query(area_details_query);

            let response = {
                customer_group_dist_channel: customerGroupResponse.rows || [],
                area_details: areaDetailsResponse?.rows || [],
            };

            return response !== null ? response : null;
        } catch (err) {
            logger.info(`Error in admin model function FilterCategoriesModel`, err);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAreaCodes(userId: string, role: string[]) {
        logger.info('inside AdminModel -> fetchAreaCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            if (_.intersection(role, [...pegasus.ADMIN, ...pegasus.PAN_INDIA_SALES, ...pegasus.LOGISTICS]).length) {
                const sqlStatement = `SELECT DISTINCT area_code FROM distributor_master WHERE area_code IS NOT NULL`;
                const areaCodes = await client.query(sqlStatement);
                return areaCodes;
            } else if (_.intersection(role, [roles.DIST_ADMIN, roles.ASM, roles.RSM, roles.CLUSTER_MANAGER]).length) {
                const areaCodes = await client.query(helper.areaCodeHierarchyQuery(userId));
                return areaCodes;
            }
        } catch (error) {
            logger.error('Error in AdminModel -> fetchAreaCodes: ', error);
        } finally {
            client?.release();
        }
    },

    async getAdjustmentTimeline() {
        logger.info('inside AdminModel -> getAdjustmentTimeline');
        const sqlStatement = `
    select
      key,
      value
    from
      app_level_settings
    where
      key in (
        'AO_METRO_ADJUSTMENT_ENABLE',
        'AO_METRO_ADJUSTMENT_START_DATE',
        'AO_METRO_ADJUSTMENT_END_DATE',
        'AO_NON_METRO_ADJUSTMENT_ENABLE',
        'AO_NON_METRO_ADJUSTMENT_START_DATE',
        'AO_NON_METRO_ADJUSTMENT_END_DATE',
        'AO_PRAGATI_ADJUSTMENT_ENABLE',
        'AO_PRAGATI_ADJUSTMENT_START_DATE',
        'AO_PRAGATI_ADJUSTMENT_END_DATE');`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result) {
                return result;
            }
            logger.error('Error in AdminModel -> getAdjustmentTimeline; Result is null');
            return null;
        } catch (error) {
            logger.error('Error in AdminModel -> getAdjustmentTimeline', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getStockNormConfigRegions(zone: string) {
        logger.info('Inside AdminModel -> getStockNormConfigRegions');
        const sqlStatement = `
                          SELECT DISTINCT 
                          g5m.description AS region
                          FROM stock_norm_configuration AS snc
                          INNER JOIN group5_master AS g5m
                          ON (snc.g5_id = g5m.id)
                          WHERE g5m.name ILIKE '${zone.charAt(0)}%' AND
                              snc.is_deleted = false;
                         `;
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result) {
                return result;
            }
            logger.error('Inside AdminModel -> getStockNormConfigRegions, Error: Result is null');
            return null;
        } catch (error) {
            logger.error('Inside AdminModel -> getStockNormConfigRegions, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getStockNormConfigAreas(zone: string, region: string) {
        logger.info('Inside AdminModel -> getStockNormConfigAreas');
        const regionQuery = region ? ` AND g5m.description ILIKE '%${region}%' ` : '';
        const sqlStatement = `
                            SELECT DISTINCT 
                                snc.area_code
                            FROM stock_norm_configuration AS snc
                            INNER JOIN group5_master AS g5m
                            ON (snc.g5_id = g5m.id)
                            WHERE g5m.name ILIKE '${zone.charAt(0)}%' AND
                                  snc.is_deleted = false ${regionQuery};
                         `;
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result) {
                return result;
            }
            logger.error('Inside AdminModel -> getStockNormConfigAreas, Error: Result is null');
            return null;
        } catch (error) {
            logger.error('Inside AdminModel -> getStockNormConfigAreas, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getStockNormConfigDivisions() {
        logger.info('Inside AdminModel -> getStockNormConfigDivisions');
        const sqlStatement = `
                          SELECT DISTINCT 
                          snc.division
                          FROM stock_norm_configuration AS snc 
                          WHERE snc.is_deleted = false;
                         `;
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result) {
                return result;
            }
            logger.error('Inside AdminModel -> getStockNormConfigDivisions, Error: Result is null');
            return null;
        } catch (error) {
            logger.error('Inside AdminModel -> getStockNormConfigDivisions, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getCycleSafetyStock(zone: string, region: string, areas: string[], divisions: string[]) {
        logger.info('Inside AdminModel -> getCycleSafetyStock');
        const regionQuery = region ? ` AND g5m.description ILIKE '%${region}%' ` : '';
        let areaQuery = '';
        let divisionQuery = '';
        if (areas && areas.length > 0) {
            let areaArray: string[] = areas.map((o) => `'${o}'`);
            areaQuery = ` AND area_code IN (${areaArray.toString()}) `;
        }
        if (divisions && divisions.length > 0) {
            let divisionArray: number[] = divisions.map((o) => +o);
            divisionQuery = ` AND division IN (${divisionArray.toString()}) `;
        }
        const sqlStatement = `
                           SELECT 
                              array_agg(DISTINCT cycle_stock) AS cycle_stock, 
                              array_agg(DISTINCT safety_stock)AS safety_stock, 
                              array_agg(DISTINCT remarks) AS remarks
                           FROM stock_norm_configuration
                           WHERE is_deleted = false 
                           AND g5_id IN ( SELECT DISTINCT 
                                                snc.g5_id
                                          FROM stock_norm_configuration AS snc
                                          INNER JOIN group5_master AS g5m
                                          ON (snc.g5_id = g5m.id)
                                          WHERE g5m.name ILIKE '${zone.charAt(0)}%' AND
                                              snc.is_deleted = false ${regionQuery}) 
                           ${areaQuery}
                           ${divisionQuery};
                         `;
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rows) {
                return result.rows;
            }
            logger.error('Inside AdminModel -> getCycleSafetyStock, Error: Result is null');
            return null;
        } catch (error) {
            logger.error('Inside AdminModel -> getCycleSafetyStock, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateCycleSafetyStock(zone: string, region: string, areas: string[], divisions: string[], cs: number, ss: number, remark: string, user: any) {
        logger.info('Inside AdminModel -> updateCycleSafetyStock');
        const regionQuery = region ? ` AND g5m.description ILIKE '%${region}%' ` : '';
        let areaQuery = '';
        let divisionQuery = '';
        if (areas && areas.length > 0) {
            let areaArray: string[] = areas.map((o) => `'${o}'`);
            areaQuery = ` AND area_code IN (${areaArray.toString()}) `;
        }
        if (divisions && divisions.length > 0) {
            let divisionArray: number[] = divisions.map((o) => +o);
            divisionQuery = ` AND division IN (${divisionArray.toString()}) `;
        }
        const sqlStatement = `
                          UPDATE stock_norm_configuration
                          SET cycle_stock= ${cs}, safety_stock= ${ss}, updated_by= '${user.user_id} - ${user.first_name} ${user.last_name}', remarks= '${remark}'
                           WHERE is_deleted = false 
                           AND g5_id IN ( SELECT DISTINCT 
                                                snc.g5_id
                                          FROM stock_norm_configuration AS snc
                                          INNER JOIN group5_master AS g5m
                                          ON (snc.g5_id = g5m.id)
                                          WHERE g5m.name ILIKE '${zone.charAt(0)}%' AND
                                              snc.is_deleted = false ${regionQuery}) 
                           ${areaQuery}
                           ${divisionQuery};
                         `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount) {
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Inside AdminModel -> updateCycleSafetyStock, Error: ', error);
            return false;
        } finally {
            client?.release();
        }
    },
    async getCfaDepotMapping(email: string | null) {
        logger.info('inside AdminModel->getCfaDepotMapping');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const whereCondition = email
                ? `where
            cf.email ilike '%${email}%'
            or cf.logistic_email ilike '%${email}%'
            or cf.zone_manager_email ilike '%${email}%'`
                : '';
            const sqlStatement = `
        SELECT cf.id,cf.zone,cf.depot_code,cf.sales_org,cf.distribution_channel, cf.group5_id as region_id,
        cf.division,cf.location,cf.name,cf.address,cf.email,cf.contact_person,cf.contact_number,
        cf.zone_manager_email,cf.logistic_email,cf.created_on,cf.updated_on,cf.cluster_manager_email,cf.is_deleted,updated_by,remarks FROM cfa_depot_mapping as cf
        ${whereCondition} ORDER BY cf.zone asc,cf.depot_code asc,cf.sales_org asc,cf.distribution_channel asc,
        cf.division asc
        `;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('error in AdminModel->getCfaDepoMapping', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertCfaDepotMapping(insertBody: {
        zone: string;
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
        logisticEmail: string;
        updatedBy: string;
        remarks: string;
    }) {
        logger.info('inside AdminModel->insertCfaDepotMapping');
        let readClient: PoolClient | null = null;
        let writeClient: PoolClient | null = null;
        try {
            readClient = await conn.getReadClient();
            writeClient = await conn.getWriteClient();
            const zoneIdStatement = 'select id from group5_master where description = $1';
            const insert = `INSERT INTO cfa_depot_mapping(zone, depot_code, sales_org, distribution_channel, division, location, name, address, email, contact_person, contact_number, zone_manager_email, cluster_manager_email, is_deleted, created_on, updated_on, logistic_email, updated_by, remarks, group5_id)VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false,'now()','now()',$14,$15,$16,$17)`;
            const zoneId = await readClient.query(zoneIdStatement, [insertBody.zone]);
            const rows = await writeClient.query(insert, [
                insertBody.zone,
                insertBody.depotCode,
                insertBody.salesOrg,
                insertBody.distributionChannel,
                insertBody.division,
                insertBody.location,
                insertBody.name,
                insertBody.address,
                insertBody.email,
                insertBody.contactPerson,
                insertBody.contactNumber,
                insertBody.zoneManagerEmail,
                insertBody.clusterManagerEmail,
                insertBody.logisticEmail,
                insertBody.updatedBy,
                insertBody.remarks,
                zoneId?.rows[0].id,
            ]);
            return rows;
        } catch (error) {
            logger.error('error in AdminModel->insertCfaDepotMapping', error);
            return null;
        } finally {
            readClient?.release();
            writeClient?.release();
        }
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
        logger.info('inside AdminModel->updatedCfaDepotMapping');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const update = ` UPDATE CFA_DEPOT_MAPPING
  SET LOCATION = $1,
  NAME = $2,
  ADDRESS = $3,
  EMAIL = $4,
  CONTACT_PERSON = $5,
  CONTACT_NUMBER = $6,
  ZONE_MANAGER_EMAIL = $7,
  CLUSTER_MANAGER_EMAIL = $8,
  LOGISTIC_EMAIL = $9,
  IS_DELETED = $16,
  UPDATED_ON=now(),
  UPDATED_BY=$10,
  REMARKS=$11
  WHERE DEPOT_CODE =$12 
  AND sales_org=$13 
  AND distribution_channel=$14 
  AND division=$15;`;
            const rows = await client.query(update, [
                insertbody.location,
                insertbody.name,
                insertbody.address,
                insertbody.email,
                insertbody.contactPerson,
                insertbody.contactNumber,
                insertbody.zoneManagerEmail,
                insertbody.clusterManagerEmail,
                insertbody.logisticEmail,
                insertbody.updatedBy,
                insertbody.remarks,
                insertbody.depotCode,
                insertbody.salesOrg,
                insertbody.distributionChannel,
                insertbody.division,
                insertbody.isDeleted,
            ]);
            return rows;
        } catch (error) {
            logger.error('error in AdminModel->updateCfaDepotMapping', error);
            return null;
        } finally {
            client?.release();
        }
    },

    /**
     *
     * @param sqlStatement
     * This method is to directly fire a query in the database.
     * To be used in EMERGENCY situation ONLY.
     */
    async fireQuery(sqlStatement: string) {
        logger.info('inside AdminModel -> fireQuery');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error('Caught Error in AdminModel -> fireQuery', error);
            return error.message;
        } finally {
            if (client) {
                client.release();
            }
        }
    },

    async multipleUpdateCfaDepotMapping(insertbody: {
        zone: string[] | null;
        depotCode: string[] | null;
        salesOrg: number | null;
        distributionChannel: number | null;
        division: number[] | null;
        location: string | null;
        name: string | null;
        address: string | null;
        email: string | null;
        contactPerson: string | null;
        contactNumber: string | null;
        zoneManagerEmail: string | null;
        clusterManagerEmail: string | null;
        logisticEmail: string | null;
        updatedBy: string | null;
        remarks: string | null;
    }) {
        let updateStatement = '';
        updateStatement += insertbody.salesOrg != 0 ? `sales_org = '${insertbody.salesOrg}',` : '';
        updateStatement += insertbody.distributionChannel != 0 ? `distribution_channel = '${insertbody.distributionChannel}',` : '';
        updateStatement += insertbody.location != '' ? `location = '${insertbody.location}',` : '';
        updateStatement += insertbody.name != '' ? `name = '${insertbody.name}',` : '';
        updateStatement += insertbody.address != '' ? `address = '${insertbody.address}',` : '';
        updateStatement += insertbody.email != '' ? `email = '${insertbody.email}',` : '';
        updateStatement += insertbody.contactPerson != '' ? `contact_person = '${insertbody.contactPerson}',` : '';
        updateStatement += insertbody.contactNumber != '' ? `contact_number = '${insertbody.contactNumber}',` : '';
        updateStatement += insertbody.zoneManagerEmail != '' ? `zone_manager_email = '${insertbody.zoneManagerEmail}',` : '';
        updateStatement += insertbody.clusterManagerEmail != '' ? `cluster_manager_email = '${insertbody.clusterManagerEmail}',` : '';
        updateStatement += insertbody.logisticEmail != '' ? `logistic_email = '${insertbody.logisticEmail}',` : '';
        updateStatement += insertbody.remarks ? `remarks = '${insertbody.remarks}',` : '';
        updateStatement += insertbody.updatedBy ? `updated_by = '${insertbody.updatedBy},'` : '';
        let whereStatement = '';
        if (insertbody.depotCode?.length > 0) {
            whereStatement += `depot_code IN ('${insertbody.depotCode.join("','")}')`;
        } else if (insertbody.zone?.length > 0) {
            whereStatement += `group5_id IN  (
        SELECT ID FROM GROUP5_MASTER WHERE DESCRIPTION IN ('${insertbody.zone.join("','")}'))`;
        }
        if (insertbody.division?.length > 0) {
            whereStatement += ` AND division IN (${insertbody.division.join(',')})`;
        }
        logger.info('inside AdminModel->multipleupdatedCfaDepotMapping');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const multipleUpdate = ` UPDATE CFA_DEPOT_MAPPING
        SET ${updateStatement}
        WHERE ${whereStatement};`;
            logger.info(`multipleUpdatedCfa updateStatement : ${updateStatement}`);
            logger.info(`multipleUpdatedCfa whereStatement : ${whereStatement}`);
            logger.info(`multipleUpdatedCfa sqlStatement : ${multipleUpdate}`);
            const result = await client.query(multipleUpdate);
            return result;
        } catch (error) {
            logger.error('error in AdminModel->multipleUpdateCfaDepotMapping', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async addKamsRoles(userId: string, customers: string[]) {
        logger.info('inside AdminModel -> addKamsRoles');
        const existingKamsCustomerStatement = `SELECT DISTINCT customer_name FROM mdm_material_data mmd WHERE mmd.is_deleted = FALSE`;
        const sqlStatement = `
    insert into kams_customer_mapping
      (user_id, customer_name)
    values 
      ($1, $2);`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const existingCustomers = await client.query(existingKamsCustomerStatement);
            if (existingCustomers && existingCustomers.rows) {
                const filteredCustomers = customers.filter((item) => existingCustomers.rows.includes(item));
                const result = await client.query(sqlStatement, [userId, filteredCustomers]);
                return result?.rowCount === 1;
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> addKamsRoles: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateKamsRoles(user_id: string, enableLogin: string, role: string[], isDeleted: boolean, code: string, updatedBy: string) {
        logger.info('inside AdminModel -> updateKamsRoles');
        const sqlStatement = `
      INSERT INTO kams_customer_mapping (user_id, customer_name, created_on, updated_on, is_deleted, updated_by)
  VALUES ($1, $2, now(), now(), $3, $4)
  ON CONFLICT (user_id) DO UPDATE
  SET
    customer_name = EXCLUDED.customer_name,
    updated_on = now(),
    updated_by = EXCLUDED.updated_by,
    is_deleted = EXCLUDED.is_deleted
  WHERE
    kams_customer_mapping.user_id = EXCLUDED.user_id;
`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [user_id, code.split(','), isDeleted || enableLogin === 'INACTIVE', updatedBy]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> updateKamsRoles: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getPDPWindows(regionId: number) {
        logger.info('inside AdminModel -> getPDPWindows');
        //(zone_id = null and threshold_frequency = -1) -> this combination is for the global pdp window
        const sqlStatement = `
    SELECT
      id,
      zone_id,
      pdp_type,
      order_window_su,
      order_placement_end_time_su,
      order_window_mo,
      order_placement_end_time_mo,
      order_window_tu,
      order_placement_end_time_tu,
      order_window_we,
      order_placement_end_time_we,
      order_window_th,
      order_placement_end_time_th,
      order_window_fr,
      order_placement_end_time_fr,
      order_window_sa,
      order_placement_end_time_sa,
      created_by,
      updated_by,
      remarks,
      pdp_windows.updated_on,
      threshold_frequency,
      first_name,
      last_name,
      user_id
    FROM
      public.pdp_windows
    LEFT JOIN
      public.sales_hierarchy_details shd
    ON
      shd.user_id = updated_by
    WHERE
      zone_id = $1
      or ( zone_id is null and threshold_frequency = -1 );
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [regionId]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> getPDPWindows: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updatePDPWindow(
        data: {
            id?: string;
            threshold_frequency?: number;
            order_window_su?: string;
            order_placement_end_time_su?: string;
            order_window_mo?: string;
            order_placement_end_time_mo?: string;
            order_window_tu?: string;
            order_placement_end_time_tu?: string;
            order_window_we?: string;
            order_placement_end_time_we?: string;
            order_window_th?: string;
            order_placement_end_time_th?: string;
            order_window_fr?: string;
            order_placement_end_time_fr?: string;
            order_window_sa?: string;
            order_placement_end_time_sa?: string;
            remarks: string;
        },
        userId: string,
    ) {
        /**
         * a trigger function has been created on the pdp_windows table to maintain audit-trail. "sales-portal-auth\migrations\1713770103832_pdp-window.js"
         * any change in columns should be maintained in the trigger function
         */
        logger.info('inside AdminModel -> updatePDPWindow');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const setStatements: string[] = [];
            for (const [key, value] of Object.entries(data)) {
                key !== 'id' && setStatements.push(`${key} = '${value}'`);
            }
            setStatements.push(`updated_by = '${userId}'`);
            setStatements.push(`updated_on = now()`);
            const sqlStatement = `
      UPDATE public.pdp_windows
      SET ${setStatements.join(', ')}
      WHERE id = $1;`;
            const result = await client.query(sqlStatement, [data.id]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> updatePDPWindow: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertPDPWindow(
        data: {
            zone_id: number;
            threshold_frequency: number;
            order_window_su: string;
            order_placement_end_time_su: string;
            order_window_mo: string;
            order_placement_end_time_mo: string;
            order_window_tu: string;
            order_placement_end_time_tu: string;
            order_window_we: string;
            order_placement_end_time_we: string;
            order_window_th: string;
            order_placement_end_time_th: string;
            order_window_fr: string;
            order_placement_end_time_fr: string;
            order_window_sa: string;
            order_placement_end_time_sa: string;
            remarks: string;
        },
        userId: string,
    ) {
        logger.info('inside AdminModel -> insertPDPWindow');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
      INSERT INTO public.pdp_windows
      ( zone_id, 
        threshold_frequency, 
        order_window_su, 
        order_placement_end_time_su, 
        order_window_mo, 
        order_placement_end_time_mo, 
        order_window_tu, 
        order_placement_end_time_tu,
        order_window_we,
        order_placement_end_time_we,
        order_window_th,
        order_placement_end_time_th,
        order_window_fr,
        order_placement_end_time_fr,
        order_window_sa,
        order_placement_end_time_sa,
        created_by,
        updated_by,
        remarks,
        updated_on,
        pdp_type
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17, $18, now(), 'WE');
      `;
            const result = await client.query(sqlStatement, [
                data.zone_id,
                data.threshold_frequency,
                data.order_window_su,
                data.order_placement_end_time_su,
                data.order_window_mo,
                data.order_placement_end_time_mo,
                data.order_window_tu,
                data.order_placement_end_time_tu,
                data.order_window_we,
                data.order_placement_end_time_we,
                data.order_window_th,
                data.order_placement_end_time_th,
                data.order_window_fr,
                data.order_placement_end_time_fr,
                data.order_window_sa,
                data.order_placement_end_time_sa,
                userId,
                data.remarks,
            ]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> insertPDPWindow: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async deletePDPException(idToDelete: number, remarks: string, userId: string) {
        logger.info('inside AdminModel -> deletePDPException');
        //within transaction the query first inserts record in the audit_trail table and then deletes the record from pdp_windows table.
        //in this case we not soft deleting records because historical data is already maintained in audit_trail table and also to keep the pdp_windows table clean.
        const sqlStatement = `
      BEGIN;
        INSERT INTO	audit_trail (table_name, reference_value, column_values)
        VALUES (
                'pdp_windows',
                ${idToDelete},
                jsonb_build_array(jsonb_build_object(
                    'remarks', '${remarks}',
                    'deleted_on', now(),
                    'deleted_by', '${userId}'
                ))
            )
        ON CONFLICT (table_name, reference_value) DO
        UPDATE
        SET
            column_values = audit_trail.column_values || excluded.column_values;

        DELETE FROM pdp_windows WHERE id = ${idToDelete};
      COMMIT;
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result[2]?.rowCount; // result[2] is result for DELETE statement
        } catch (error) {
            logger.error('CAUGHT: Error in AdminModel -> deletePDPException: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async generatePdpUnlockRequestId(isPreapporved: boolean = false) {
        logger.info('inside AdminModel -> generatePdpUnlockRequestId');
        let client: PoolClient | null = null;
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            const formattedMonth = ('0' + currentMonth).slice(-2); // Zero-padding if needed
            const formattedYear = currentYear.toString().slice(-2); // Take the last two digits of the year
            const MMYYFormat = formattedMonth + formattedYear;
            const initial = (isPreapporved) ? 'PPU' : 'PU'; 
            let id = `${initial}-${MMYYFormat}-`;
            client = await conn.getWriteClient();
            const sqlStatement = (isPreapporved) 
                ? `SELECT request_id FROM preapproved_pdp_unlock_request 
                   ORDER BY requested_on DESC LIMIT 1;`
                : `SELECT request_id FROM pdp_unlock_request 
                   ORDER BY requested_on DESC LIMIT 1;`;
            const result = await client.query(sqlStatement);
            if (result.rowCount) {
                const lastId = result.rows[0].request_id;
                const reqNo = lastId.split('-')[1] === MMYYFormat ? (parseInt(lastId.split('-')[2]) + 1).toString().padStart(6, '0') : '000001';
                id = id + reqNo;
            } else {
                id = id + '000001';
            }
            return id;
        } catch (error) {
            logger.error('inside AdminModel -> generatePdpUnlockRequestId, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
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
        selectAll: boolean,
    ) {
        logger.info(
            'inside AdminModel -> insertPdpUnlockRequest, areas: ' + JSON.stringify(areaCodes) + ' ,start_date: ' + startDate + ' ,end_date: ' + endDate + ' ,user_id: ' + userId,
        );
        let client: PoolClient | null = null;
        try {
            const requestId = await this.generatePdpUnlockRequestId();
            const user = userId + '#' + role.join(',');

            client = await conn.getWriteClient();
            const sqlStatement = `
          INSERT INTO pdp_unlock_request (request_id, area_codes, regions, distributor_codes, start_date, end_date, comments, requested_on, requested_by, select_all)
          VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8, $9);`;
            const result = await client.query(sqlStatement, [requestId, areaCodes, regions, distributorIds, startDate, endDate, comments, user, selectAll]);
            return result?.rowCount ? requestId : 0;
        } catch (error) {
            logger.error('inside AdminModel -> insertPdpUnlockRequest, Error: ', error);
            return 0;
        } finally {
            client?.release();
        }
    },

    async fetchPdpUnlockRequests(limit: number, offset: number, status: string = 'ALL', search: string = '') {
        logger.info('inside AdminModel -> fetchPdpUnlockRequests, status: ' + status + ' ,search: ' + search + ' ,limit: ' + limit + ' ,offset: ' + offset);
        let client: PoolClient | null = null;
        try {
            const limitStatement = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';
            const statusStatement = status === 'ALL' ? '' : ` AND pur.status = '${status}'`;
            const searchStatement = !search
                ? ''
                : ` AND (pur.request_id ILIKE '%${search}%' 
                                            OR  EXISTS (
                                                SELECT 1 
                                                FROM unnest(pur.area_codes) AS area_code 
                                                WHERE area_code ILIKE '%${search}%'
                                            )
                                            OR EXISTS (
                                                SELECT 1 
                                                FROM unnest(pur.regions) AS region 
                                                WHERE region ILIKE '%${search}%'
                                            )
                                            OR (COALESCE(shd_req.first_name, '') || ' ' || COALESCE(shd_req.last_name, '') ILIKE '%${search}%') 
                                          ) `;
            client = await conn.getReadClient();

            let sqlStatement = `
                WITH pdp_unlock_requests AS (
                    SELECT ppur.request_id
                        ,ppur.start_date
                        ,ppur.end_date 
                        ,ppur."comments" 
                        ,'APPROVED'::order_approval_status AS status
                        ,ppur.requested_on 
                        ,ppur.requested_by
                        ,ARRAY[ppur.requested_on ] AS responded_on
                        ,ARRAY['SYSTEM_GENERATED'] AS responded_by
                        ,array_agg(DISTINCT dm.id) AS distributor_codes
                        ,array_agg(DISTINCT dm.area_code) AS area_codes
                        ,array_agg(DISTINCT gm.description) AS regions 
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON (ppum.request_id = ppur.request_id)
                    INNER JOIN distributor_master dm ON (ppum.distributor_id = dm.id)
                    INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                    GROUP BY 1,2,3,4,5,6,7,8,9
                    UNION 
                    SELECT request_id,
                        start_date,
                        end_date,
                        comments,
                        status,
                        requested_on,
                        requested_by,
                        responded_on,
                        responded_by,
                        distributor_codes,
                        area_codes,
                        regions
                    FROM pdp_unlock_request
                )
                SELECT 
                    pur.request_id,
                    pur.area_codes,
                    pur.regions,
                    pur.distributor_codes,
                    pur.start_date,
                    pur.end_date,
                    pur.comments,
                    pur.status,
                    pur.requested_on,
                    pur.requested_by AS requested_by_id,
                    COALESCE(shd_req.first_name, '') || ' ' || COALESCE(shd_req.last_name, '') || '-' || SPLIT_PART(pur.requested_by, '#', 2) AS requested_by,
                    pur.responded_on,
                    CASE
                        WHEN pur.responded_by IS NULL THEN NULL
                        ELSE ARRAY_AGG(COALESCE(shd_res.first_name, '') || ' ' || COALESCE(shd_res.last_name, '') )
                    END AS responded_by,
                    CASE
                        WHEN pur.responded_by IS NULL THEN NULL
                        ELSE ARRAY_AGG(COALESCE(shd_res.email, ''))
                    END AS responded_by_emails,
                    pur.responded_by AS responded_by_ids
                FROM 
                    pdp_unlock_requests pur
                LEFT JOIN 
                    sales_hierarchy_details shd_req ON shd_req.user_id = SPLIT_PART(pur.requested_by, '#', 1)
                LEFT JOIN 
                    LATERAL unnest(pur.responded_by) AS res_by(user_id) ON true
                LEFT JOIN 
                    sales_hierarchy_details shd_res ON shd_res.user_id = res_by.user_id
                WHERE pur.request_id IS NOT NULL 
                    ${statusStatement} 
                    ${searchStatement}
                GROUP BY 
                    pur.request_id,
                    pur.area_codes,
                    pur.regions,
                    pur.distributor_codes,
                    pur.start_date,
                    pur.end_date,
                    pur.comments,
                    pur.status,
                    pur.requested_on,
                    pur.responded_on,
                    pur.responded_by,
                    shd_req.first_name,
                    shd_req.last_name
                ORDER BY pur.requested_on DESC ${limitStatement};`;

            const result = await client.query(sqlStatement);

            let countStatement = `
                WITH pdp_unlock_requests AS (
                    SELECT ppur.request_id
                        ,ppur.start_date
                        ,ppur.end_date 
                        ,ppur."comments" 
                        ,'APPROVED'::order_approval_status AS status
                        ,ppur.requested_on 
                        ,ppur.requested_by
                        ,ARRAY[ppur.requested_on ] AS responded_on
                        ,ARRAY['SYSTEM_GENERATED'] AS responded_by
                        ,array_agg(DISTINCT dm.id) AS distributor_codes
                        ,array_agg(DISTINCT dm.area_code) AS area_codes
                        ,array_agg(DISTINCT gm.description) AS regions 
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON (ppum.request_id = ppur.request_id)
                    INNER JOIN distributor_master dm ON (ppum.distributor_id = dm.id)
                    INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                    GROUP BY 1,2,3,4,5,6,7,8,9
                    UNION 
                    SELECT request_id,
                        start_date,
                        end_date,
                        comments,
                        status,
                        requested_on,
                        requested_by,
                        responded_on,
                        responded_by,
                        distributor_codes,
                        area_codes,
                        regions
                    FROM pdp_unlock_request
                )
                SELECT 
                    pur.request_id
                FROM 
                    pdp_unlock_requests pur
                LEFT JOIN 
                    sales_hierarchy_details shd_req ON shd_req.user_id = SPLIT_PART(pur.requested_by, '#', 1)
                LEFT JOIN 
                    LATERAL unnest(pur.responded_by) AS res_by(user_id) ON true
                LEFT JOIN 
                    sales_hierarchy_details shd_res ON shd_res.user_id = res_by.user_id
                WHERE pur.request_id IS NOT NULL 
                    ${statusStatement} 
                    ${searchStatement}
                GROUP BY 
                    pur.request_id,
                    pur.area_codes,
                    pur.regions,
                    pur.distributor_codes,
                    pur.start_date,
                    pur.end_date,
                    pur.comments,
                    pur.status,
                    pur.requested_on,
                    pur.responded_on,
                    pur.responded_by,
                    shd_req.first_name,
                    shd_req.last_name
                ORDER BY pur.requested_on DESC;`;
            const countResult = await client.query(countStatement);

            return {
                rows: result.rows,
                rowCount: result.rowCount,
                totalCount: countResult.rowCount,
            };
        } catch (error) {
            logger.error('inside AdminModel -> fetchPdpUnlockRequests, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDistributorRegions(distributor_ids: string[]) {
        logger.info('inside AdminModel -> fetchDistributorRegions');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const dbString = distributor_ids.map((id) => `'${id}'`).join(',');
            const sqlStatement = `
          SELECT DISTINCT dm.id AS distributor_id
              ,up."name" AS distributor_name
              ,gm.description AS region
              ,dm.area_code
              ,dm.city
              ,pm."name" AS plant
          FROM distributor_master dm 
          INNER JOIN user_profile up ON (dm.id = up.id)
          LEFT JOIN group5_master gm ON (dm.group5_id = gm.id)
          INNER JOIN distributor_plants dp ON (dp.distributor_id = dm.id)
          LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
          WHERE dm.id IN (${dbString});`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('inside AdminModel -> fetchDistributorRegions, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async checkPDPUnlockRequestExist(requestId: string, isPreapporved: boolean = false) {
        logger.info('inside AdminModel -> checkPDPUnlockRequestExist, requestId: ' + requestId);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = isPreapporved
            ? `SELECT * FROM preapproved_pdp_unlock_request WHERE request_id = $1;`
            :`SELECT * FROM pdp_unlock_request WHERE request_id = $1;`;
            const result = await client.query(sqlStatement, [requestId]);
            return result?.rowCount ? { exist: true, data: result.rows[0] } : { exist: false, data: null };
        } catch (error) {
            logger.error('inside AdminModel -> checkPDPUnlockRequestExist, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getPdpApproverDetails(email: string) {
        logger.info('inside AdminModel -> approverDetails, email: ' + email);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE email = $1;`;
            const result = await client.query(sqlStatement, [email]);
            return result?.rowCount ? result.rows[0] : null;
        } catch (error) {
            logger.error('inside AdminModel -> approverDetails, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updatePDPUnlockRequest(requestId: string, status: string = 'PENDING', userId: string, email: string) {
        logger.info('inside AdminModel -> updatePDPUnlockRequest, requestId: ' + requestId + ' ,status: ' + status + ' ,userId: ' + userId);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();

            const response = {
                success: true,
                message: status === 'REJECTED' ? 'Request rejected successfully.' : 'Request approved successfully.',
            };

            const sqlStatement = `
          UPDATE pdp_unlock_request
          SET
              responded_on = COALESCE(responded_on, ARRAY[]::timestamptz[]) || ARRAY[now()],
              responded_by = COALESCE(responded_by, ARRAY[]::varchar[]) || ARRAY[$2],
              status = $1::order_approval_status
          WHERE request_id = $3
          RETURNING start_date, end_date;`;
            const result = await client.query(sqlStatement, [status, userId, requestId]);
            if (result?.rows[0]?.start_date && status === 'APPROVED') {
                const startDate = moment(result.rows[0].start_date);
                const endDate = moment(result.rows[0].end_date);
                const currentDate = moment(new Date().toLocaleDateString());

                // Check if the startDate is smaller than equal to the currentDate and endDate is greater than equal to the currentDate, then unlock the PDP for the distributor
                if ((startDate.isSame(currentDate) || startDate.isBefore(currentDate)) && (endDate.isSame(currentDate) || endDate.isAfter(currentDate))) {
                    AdminModel.unlockDistributorPDP(requestId);
                }
            }

            if (!result?.rowCount) {
                response.success = false;
                response.message = 'Failed to update request. Please try again later.';
                return response;
            }

            return response;
        } catch (error) {
            logger.error('inside AdminModel -> updatePDPUnlockRequest, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchSSOUsers(roles: string[] = [], limit: number = 0, offset: number = 0, queryParams: { emails: string[] } = { emails: [] }) {
        logger.info('inside AdminModel -> fetchSSOUsers, roles: ' + roles.join(','));
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const { emails } = queryParams;
            const emailStatement = emails.length ? `AND email ILIKE ANY(array[${emails.map((e) => `'${e}'`)}])` : '';
            const rolesString = roles.length ? roles.map((role) => `'${role}'`).join(',') : '';
            const rolesStatement = rolesString ? ` AND roles && ARRAY[${rolesString}]::_roles_type` : '';
            const limitStatement = limit ? ` LIMIT ${limit} OFFSET ${offset}` : '';
            const sqlStatement = `
          SELECT user_id, first_name, last_name, email, mobile_number, manager_id, code, deleted, roles::_varchar
          FROM sales_hierarchy_details
          WHERE email  IS NOT NULL AND status = 'ACTIVE' AND deleted = false ${rolesStatement} ${emailStatement} ${limitStatement};`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('inside AdminModel -> fetchSSOUsers, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async unlockDistributorPDP(requestId: string = '') {
        logger.info('inside AdminModel -> unlockDistributorPDP');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const requestStatement = requestId
                ? `SELECT request_id, distributor_codes, requested_by, comments
                                  FROM pdp_unlock_request
                                  WHERE status = 'APPROVED' AND request_id = '${requestId}'
                                  ORDER BY requested_on ASC`
                : `SELECT request_id, distributor_codes, requested_by, comments
                                  FROM pdp_unlock_request
                                  WHERE status = 'APPROVED' AND start_date::date <= now()::date AND end_date::date >= now()::date
                                  ORDER BY requested_on ASC`;
            const pdpOffStatement = `
        WITH unlock_requests AS (
            ${requestStatement}
        ),
        updated_distributors AS (
            UPDATE distributor_master AS dm
            SET enable_pdp = false,
                pdp_unlock_id = ur.request_id
            FROM unlock_requests AS ur
            WHERE dm.id = ANY(ur.distributor_codes) AND dm.enable_pdp = true
            RETURNING dm.id, ur.request_id, ur.requested_by, ur.comments
        )
        INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id, comments)
        SELECT
            ud.id AS distributor_id,
            false AS status,
            ud.requested_by AS updated_by,
            now() AS updated_on,
            ud.request_id AS request_id,
            ud.comments AS comments
        FROM updated_distributors AS ud
        RETURNING distributor_id AS updated_distributor_id, request_id;
      `;
            const pdpOffResult = await client.query(pdpOffStatement);
            return {
                pdpOff: {
                    updated_distributor_ids: pdpOffResult?.rows.map((row) => row.updated_distributor_id),
                    request_ids: [...new Set(pdpOffResult?.rows.map((row) => row.request_id))] ?? [],
                },
            };
        } catch (error) {
            logger.error('inside AdminModel -> unlockDistributorPDP, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async lockDistributorPDP() {
        logger.info('inside AdminModel -> lockDistributorPDP');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const pdpOnStatement = `
        WITH unlock_requests AS (
            SELECT request_id, distributor_codes, requested_by, comments
            FROM pdp_unlock_request
            WHERE status = 'APPROVED' AND end_date::date = (now() - interval '1 day')::date
            ORDER BY requested_on ASC
        ),
        updated_distributors AS (
            UPDATE distributor_master AS dm
            SET enable_pdp = true,
                pdp_unlock_id = ur.request_id
            FROM unlock_requests AS ur
            WHERE dm.id = ANY(ur.distributor_codes) AND dm.enable_pdp = false
            RETURNING dm.id, ur.request_id, ur.requested_by, ur.comments
        )
        INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id, comments)
        SELECT
            ud.id AS distributor_id,
            true AS status,
            ud.requested_by AS updated_by,
            now() AS updated_on,
            ud.request_id AS request_id,
            ud.comments AS comments
        FROM updated_distributors AS ud
        RETURNING distributor_id AS updated_distributor_id;
      `;
            const pdpOnResult = await client.query(pdpOnStatement);
            return {
                pdpOn: {
                    updated_distributor_ids: pdpOnResult?.rows.map((row) => row.updated_distributor_id),
                },
            };
        } catch (error) {
            logger.error('inside AdminModel -> lockDistributorPDP, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async setExpiredPDPUnlockRequests() {
        logger.info('inside AdminModel -> setExpiredPDPUnlockRequests');
        let client: PoolClient | null = null;
        try {
            const pdp_expiry_1 = (await AuthModel.fetchAppLevelSettings()).find((setting) => setting.key === 'PDP_UNLOCK_EXPIRY_WINDOW')?.value;
            const pdp_expiry_2 = (await AuthModel.fetchAppLevelSettings()).find((setting) => setting.key === 'PDP_UNLOCK_EXPIRY_WINDOW_2')?.value;
            if (pdp_expiry_1 && pdp_expiry_2) {
                const expiry_hours_1 = parseInt(pdp_expiry_1);
                const expiry_hours_2 = parseInt(pdp_expiry_2);
                client = await conn.getWriteClient();
                const expiredSqlStatement = `
            WITH response AS (
              SELECT
                pur.request_id,
                EXTRACT(EPOCH FROM (now()-requested_on))/3600 AS request_age,
                (
                  SELECT 
                    EXTRACT(EPOCH FROM (now()-v))/3600
                  FROM unnest(pur.responded_on) 
                  WITH ORDINALITY AS t (v, o) 
                  ORDER BY o DESC 
                  LIMIT 1
                ) AS last_response_age,
                COALESCE (array_length(pur.responded_on, 1), 0) AS number_of_response 
              FROM
                pdp_unlock_request pur
              WHERE
                pur.status = 'PENDING'
            ),
            expired_request AS (
              SELECT
                request_id,
                CASE
                  WHEN last_response_age IS NULL THEN request_age > t.expiry_windows[number_of_response + 1]
                  WHEN last_response_age IS NOT NULL THEN last_response_age > t.expiry_windows[number_of_response + 1] 
                END AS is_expired
              FROM
                response r
              CROSS JOIN (
                VALUES (ARRAY[${expiry_hours_1},${expiry_hours_2}])
              ) AS t(expiry_windows)
            )
            UPDATE pdp_unlock_request pur
            SET status='EXPIRED'
            FROM expired_request er
            WHERE pur.request_id = er.request_id AND er.is_expired = TRUE
            RETURNING pur.request_id;
        `;
                const expiredResult = await client.query(expiredSqlStatement);
                return {
                    expired: {
                        expired_request_ids: expiredResult?.rows.map((row) => row.request_id) || [],
                    },
                };
            }
            return null;
        } catch (error) {
            logger.error('inside AdminModel -> setExpiredPDPUnlockRequests, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
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
        logger.info('inside AdminModel -> fetchDistributorsByAdminRole, roles: ' + roles + ' ,userId: ' + userId + ' ,code: ' + code);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let statusStatement = '';
            if (status === 'DELETED') {
                isDeleted = true;
            } else if (status === 'ACTIVE') {
                statusStatement = ` AND  dm.status = 'ACTIVE'`;
            } else if (status === 'INACTIVE') {
                statusStatement = ` AND  dm.status = 'INACTIVE'`;
            }
            const limitStatement = limit ? ` LIMIT ${limit} OFFSET ${offset}` : '';
            const searchStatement = search
                ? ` AND (dm.profile_id ILIKE '%${search}%' 
                                                OR up."name" ILIKE '%${search}%'
                                                OR up.mobile ILIKE '%${search}%'
                                                OR rm.description ILIKE '%${search}%'
                                                OR gm.description ILIKE '%${search}%'
                                                OR cgm.description ILIKE '%${search}%'
                                                OR dm.tse_code ILIKE '%${search}%')`
                : '';
            const customerGroupStatement = customer_groups_desc.length ? ` AND cgm.description IN (${customer_groups_desc.map((group) => `'${group}'`).join(',')})` : '';
            const stateStatement = states.length ? ` AND rm.description IN (${states.map((state) => `'${state}'`).join(',')})` : '';
            const regionStatement = regions.length ? ` AND gm.description IN (${regions.map((region) => `'${region}'`).join(',')})` : '';
            const areaCodeStatement = area_codes.length ? ` AND dm.area_code IN (${area_codes.map((area) => `'${area}'`).join(',')})` : '';
            const plantsStatement = plants.length ? ` AND pm."name" IN (${plants.map((plant) => `'${plant}'`).join(',')})` : '';
            const distChannelStatement = distChannel?.length ? ` AND dp.distribution_channel IN (${distChannel.join(',')})` : '';
            let roleStatement = '';
            roles.forEach((role) => {
                switch (role) {
                    case 'ASM':
                        roleStatement += ` AND string_to_array(dm.area_code,',') && string_to_array('${code}',',')`;
                        break;
                    case 'RSM':
                        roleStatement += ` AND gm.rsm_code = '${code}'`;
                        break;
                    case 'CLUSTER_MANAGER':
                        roleStatement += ` AND gm.cluster_code = '${code}'`;
                        break;
                    case 'TSE':
                        roleStatement += ` AND string_to_array(dm.tse_code,',') && string_to_array('${code}',',')`;
                        break;
                    default:
                        // No action needed for unrecognized roles
                        break;
                }
            });

            const sqlStatement = `
          SELECT DISTINCT dm.id
            ,dm.profile_id
            ,up."name" 
            ,up.email
            ,up.mobile
            ,dm.city
            ,cgm."name" AS customer_group
            ,gm.description AS region
            ,rm.description AS state
            ,dm.tse_code
            ,dm.area_code
            ,gm.rsm_code
            ,gm.cluster_code 
            ,dm.channel_code
            ,dm.postal_code
            ,dm.status
            ,COALESCE(dm.liquidation,false) AS enable_liquidation
            ,COALESCE(dm.enable_pdp,false) AS enable_pdp
            ,COALESCE(dm.ao_enable,false) AS enable_ao
            ,COALESCE(dm.reg_enable,false) AS enable_reg 
            ,COALESCE(dm.ro_enable,false) AS enable_ro 
            ,COALESCE(dm.bo_enable,false) AS enable_bo
            ,dm.aos_enable as enable_aos
            ,COALESCE(dm.noc_enable,false) AS enable_noc
            ,dm.pdp_unlock_id
            ,COALESCE(np.po_so_sms,false) AS enable_po_so_sms
            ,COALESCE(np.po_so_email,false) AS enable_po_so_email
            ,COALESCE(np.invoice_details_sync_sms,false) AS enable_invoice_sync_sms
            ,COALESCE(np.invoice_details_sync_email,false) AS enable_invoice_sync_email
            ,COALESCE(np.sms_tse_asm,false) AS sms_tse_asm
            ,COALESCE(np.email_tse_asm,false) AS email_tse_asm
            ,COALESCE(dm.delivery_code_email_enable,false) AS enable_delivery_code_email
            ,COALESCE(dm.delivery_code_sms_enable,false) AS enable_delivery_code_sms
            ,CASE WHEN ndb.distributor_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_nourishco
            ,CASE WHEN dm.status = 'ACTIVE' THEN true
                ELSE false
                END AS enable_login
          FROM distributor_master dm
          INNER JOIN user_profile up ON (dm.id = up.id)
          INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
          INNER JOIN region_master rm ON (dm.region_id = rm.id)
          INNER JOIN customer_group_master cgm ON (dm.group_id = cgm.id)
          LEFT JOIN notification_preferences np ON (np.user_profile_id = dm.id)
          LEFT JOIN distributor_plants dp ON (dm.id = dp.distributor_id)
          LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
          LEFT JOIN (
              SELECT DISTINCT dp2.distributor_id
              FROM public.distributor_plants dp2
              WHERE dp2.distribution_channel = 90
            ) AS ndb ON dm.id = ndb.distributor_id
          WHERE dm.deleted = ${isDeleted} 
            ${statusStatement}
            AND cgm.name NOT IN ('${EXCLUSION_GROUP.join("' , '")}')
            ${roleStatement}
            ${regionStatement} ${stateStatement}  ${areaCodeStatement}
            ${searchStatement} 
            ${customerGroupStatement} 
            ${plantsStatement}
            ${distChannelStatement}
            ORDER BY dm.id
            ${limitStatement}
            ;`;

            const countStatement = `
          SELECT COUNT(DISTINCT dm.id)
          FROM distributor_master dm
          INNER JOIN user_profile up ON (dm.id = up.id)
          INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
          INNER JOIN region_master rm ON (dm.region_id = rm.id)
          INNER JOIN customer_group_master cgm ON (dm.group_id = cgm.id)
          LEFT JOIN notification_preferences np ON (np.user_profile_id = dm.id)
          LEFT JOIN distributor_plants dp ON (dm.id = dp.distributor_id)
          LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
          WHERE dm.deleted = ${isDeleted} 
            ${statusStatement}
            AND cgm.name NOT IN ('${EXCLUSION_GROUP.join("' , '")}')
            ${roleStatement}
            ${regionStatement} ${stateStatement}  ${areaCodeStatement}
            ${searchStatement} 
            ${customerGroupStatement}
            ${plantsStatement}
            ${distChannelStatement};`;

            const result = await client.query(sqlStatement);
            const countResult = await client.query(countStatement);
            const response = {
                rows: result?.rows,
                count: countResult?.rows[0]?.count,
            };
            return response;
        } catch (error) {
            logger.error('inside AdminModel -> fetchDistributorsByAdminRole, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async validateDistributorAdminMapping(distributorId: string, role: string[], code: string = '') {
        logger.info('inside AdminModel -> validateDistributorAdminMapping, distributorId: ' + distributorId + ' ,role: ' + role);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
          SELECT dm.tse_code, dm.area_code, gm.rsm_code, gm.cluster_code 
          FROM distributor_master dm 
          INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
          WHERE dm.id = $1;`;
            const result = (await client.query(sqlStatement, [distributorId])).rows || [];
            if (!result.length) {
                logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: User is not mapped to given distributorId');
                return false;
            }
            const { tse_code, area_code, rsm_code, cluster_code } = result[0];
            let isMapped = false;
            role.forEach((r) => {
                if ([roles.DIST_ADMIN, roles.ASM, roles.TSE, roles.CFA, roles.LOGISTIC_OFFICER, roles.ZONAL_OFFICER, roles.RSM, roles.CLUSTER_MANAGER].includes(r)) {
                    switch (r) {
                        case 'ASM':
                            isMapped = code.split(',').includes(area_code);
                            break;
                        case 'RSM':
                            isMapped = code === rsm_code;
                            break;
                        case 'CLUSTER_MANAGER':
                            isMapped = code === cluster_code;
                            break;
                        case 'TSE':
                            isMapped = code.split(',').includes(tse_code);
                            break;
                        default:
                            isMapped = true;
                            break;
                    }
                }
            });
            return isMapped;
        } catch (error) {
            logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: ', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async insertPDPAuditTrail(dbList: any[] = [], isPDP: boolean, updated_by: string, comments: string = '') {
        logger.info('inside AdminModel -> insertPDPAuditTrail');
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            /* Using the below logic we can add a single entry in pdp audit trail passing null value to distributor_id column when  distributor list provided is empty 
         This implies pdp of all active distributors are locked/unlodked OR the state of global pdp switch is changed. Comments of the entry should clarify the reason.*/
            if (dbList.length === 0) {
                const indicator = isPDP ? 'APP_SETTINGS_LOCK' : 'APP_SETTINGS_UNLOCK';
                const sqlStatement = `
          INSERT INTO pdp_lock_audit_trail(distributor_id, status, updated_by, updated_on, request_id, comments)
          VALUES (null, ${isPDP}, '${updated_by}', now(), '${indicator}', '${comments}');
        `;
                const result = await client.query(sqlStatement);
                return result?.rowCount || false;
            }

            /* Using the below if we can add all the distributors in the pdp audit trail when the distributor list provided is empty*/
            // if(dbList.length === 0){
            //   const dbStatement = `SELECT id FROM distributor_master WHERE deleted = false AND status = 'ACTIVE';`;
            //   const dbResult = await client.query(dbStatement);
            //   dbList = dbResult.rows.map(row => row.id);
            // }
            const sqlStatement = `
                          INSERT INTO pdp_lock_audit_trail(distributor_id, status, updated_by, updated_on, comments)
                          SELECT id, ${isPDP}, '${updated_by}', now(), '${comments}'
                          FROM (VALUES ${dbList.map((id) => `('${id}')`).join(', ')}) AS t(id);
                          `;

            const result = await client.query(sqlStatement);
            return result?.rowCount || false;
        } catch (error) {
            logger.error('inside AdminModel -> insertPDPAuditTrail, Error: ', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getPdpUnlockRequests(role: string[], email: string, userId: string, limit: number, offset: number, status: string = 'ALL', search: string = '') {
        logger.info('inside AdminModel -> getPdpUnlockRequests, status: ' + status + ' ,search: ' + search + ' ,limit: ' + limit + ' ,offset: ' + offset);
        let client: PoolClient | null = null;
        try {
            const limitStatement = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';
            const requesterCondition =
                _.intersection(role, [roles.ASM, roles.TSE, roles.RSM, roles.CLUSTER_MANAGER]).length > 0 ? ` AND SPLIT_PART(pur.requested_by, '#', 1) = '${userId}' ` : '';
            const pdpRequestsStatement = `
                WITH pdp_unlock_requests AS (
                    SELECT ppur.request_id
                        ,ppur.start_date
                        ,ppur.end_date 
                        ,ppur."comments" 
                        ,'APPROVED'::order_approval_status AS status
                        ,ppur.requested_on 
                        ,ppur.requested_by
                        ,ARRAY[ppur.requested_on ] AS responded_on
                        ,ARRAY['SYSTEM_GENERATED'] AS responded_by
                        ,ARRAY(SELECT jsonb_array_elements_text(ppur.filters->'plants')) AS plant_codes
                        ,array_agg(DISTINCT dm.id) AS distributor_codes
                        ,array_agg(DISTINCT dm.area_code) AS area_codes
                        ,array_agg(DISTINCT gm.description) AS regions 
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON (ppum.request_id = ppur.request_id)
                    INNER JOIN distributor_master dm ON (ppum.distributor_id = dm.id)
                    INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                    GROUP BY 1,2,3,4,5,6,7,8,9,10
                    UNION 
                    SELECT request_id,
                        start_date,
                        end_date,
                        comments,
                        status,
                        requested_on,
                        requested_by,
                        responded_on,
                        responded_by,
                        plant_codes,
                        distributor_codes,
                        area_codes,
                        regions
                    FROM pdp_unlock_request )
            `;
            const logisticSelect =
                role.includes(roles.LOGISTIC_OFFICER) || role.includes(roles.ZONAL_OFFICER)
                    ? `
                ,distributors AS (
                          SELECT  DISTINCT dp.distributor_id
                          FROM distributor_plants dp
                          INNER JOIN plant_master pm ON (dp.plant_id  = pm.id)
                          INNER JOIN cfa_depot_mapping cdm ON (cdm.depot_code = pm."name") 
                          WHERE dp.distributor_id IS NOT NULL 
                            AND pm.name IS NOT NULL
                            AND (cdm.zone_manager_email ILIKE  '%${email}%' OR cdm.logistic_email ILIKE '%${email}%')
                )`
                    : '';
            const logisticWhere =
                role.includes('LOGISTIC_OFFICER') || role.includes('ZONAL_OFFICER')
                    ? `
                AND EXISTS (
                    SELECT 1
                    FROM unnest(pur.distributor_codes) AS dc
                    WHERE dc IN (SELECT distributor_id FROM distributors)
                )`
                    : '';
            let statusStatement = '';
            switch (status) {
                case 'PREAPPROVED':
                    statusStatement = ` AND 'SYSTEM_GENERATED' = ANY(pur.responded_by)`;
                    break;
                case 'ALL':
                    statusStatement = '';
                    break;
                default:
                    statusStatement = ` AND pur.status = '${status}'`;
            }
            const searchStatement = !search
                ? ''
                : ` AND (pur.request_id ILIKE '%${search}%' 
                                            OR  EXISTS (
                                                SELECT 1 
                                                FROM unnest(pur.area_codes) AS area_code 
                                                WHERE area_code ILIKE '%${search}%'
                                            )
                                            OR EXISTS (
                                                SELECT 1 
                                                FROM unnest(pur.regions) AS region 
                                                WHERE region ILIKE '%${search}%'
                                            )
                                            OR (COALESCE(shd_req.first_name, '') || ' ' || COALESCE(shd_req.last_name, '') ILIKE '%${search}%') 
                                          ) `;
            client = await conn.getReadClient();
            let sqlStatement = `${pdpRequestsStatement}
                            ${logisticSelect}
                            SELECT 
                              pur.request_id,
                              pur.area_codes,
                              pur.regions,
                              pur.distributor_codes,
                              pur.plant_codes,
                              pur.start_date,
                              pur.end_date,
                              pur.comments,
                              pur.status,
                              pur.requested_on,
                              pur.requested_by AS requested_by_id,
                              CASE WHEN shd_req.first_name IS NOT NULL THEN shd_req.first_name || ' ' || COALESCE(shd_req.last_name, '') || '-' || SPLIT_PART(pur.requested_by, '#', 2)
                                   ELSE 'SYSTEM_GENERATED' END AS requested_by,
                              pur.responded_on,
                              pur.responded_by AS responded_by_ids
                          FROM 
                              pdp_unlock_requests pur
                          LEFT JOIN 
                              sales_hierarchy_details shd_req ON shd_req.user_id = SPLIT_PART(pur.requested_by, '#', 1)
                          WHERE pur.request_id IS NOT NULL  
                              ${logisticWhere}
                              ${requesterCondition}
                              ${statusStatement} 
                              ${searchStatement}
                          GROUP BY 
                              pur.request_id,
                              pur.area_codes,
                              pur.regions,
                              pur.distributor_codes,
                              pur.plant_codes,
                              pur.start_date,
                              pur.end_date,
                              pur.comments,
                              pur.status,
                              pur.requested_on,
                              pur.requested_by,
                              pur.responded_on,
                              pur.responded_by,
                              shd_req.first_name,
                              shd_req.last_name
                          ORDER BY pur.requested_on DESC ${limitStatement};
            `;
                          
            
            const result = await client.query(sqlStatement);

            let countStatement = `${pdpRequestsStatement}
                          ${logisticSelect}
                          SELECT 
                            pur.request_id
                          FROM 
                              pdp_unlock_requests pur
                          LEFT JOIN 
                              sales_hierarchy_details shd_req ON shd_req.user_id = SPLIT_PART(pur.requested_by, '#', 1)
                          WHERE pur.request_id IS NOT NULL  
                              ${logisticWhere}
                              ${requesterCondition}
                              ${statusStatement} 
                              ${searchStatement}
                          GROUP BY 
                              pur.request_id,
                              pur.area_codes,
                              pur.regions,
                              pur.distributor_codes,
                              pur.start_date,
                              pur.end_date,
                              pur.comments,
                              pur.status,
                              pur.requested_on,
                              pur.requested_by,
                              pur.responded_on,
                              pur.responded_by,
                              shd_req.first_name,
                              shd_req.last_name
                          ORDER BY pur.requested_on DESC;`;

            const countResult = await client.query(countStatement);

            const respondedBy = Array.from(
                new Set(
                    result.rows
                        .filter((row) => row.responded_by_ids)
                        .map((row) => row.responded_by_ids)
                        .flat(),
                ),
            );
            const respondedByQuery = respondedBy.length
                ? `SELECT user_id, first_name, last_name, email 
                                FROM sales_hierarchy_details 
                                WHERE user_id IN (${respondedBy.map((id) => `'${id}'`).join(',')});`
                : '';
            const respondedByResult = await client.query(respondedByQuery);
            const respondedByMap = respondedByResult.rows.reduce((acc, row) => {
                acc[row.user_id] = row;
                return acc;
            }, {});
            result.rows.forEach((row) => {
                const respodedByEmails = row.responded_by_ids?.map((id) => respondedByMap[id]?.email || 'SYSTEM_GENERATED').filter((email) => email) || null;
                const respondedByNames =
                    row.responded_by_ids
                        ?.map((id) => (!respondedByMap[id]?.first_name ? 'SYSTEM_GENERATED' : respondedByMap[id]?.first_name + ' ' + respondedByMap[id]?.last_name))
                        .filter((name) => name) || null;
                row['responded_by_emails'] = respodedByEmails;
                row['responded_by'] = respondedByNames;
            });
            return {
                rows: result.rows,
                rowCount: result.rowCount,
                totalCount: countResult.rowCount,
            };
        } catch (error) {
            logger.error('inside AdminModel -> getPdpUnlockRequests, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchPDPWindowSettings() {
        logger.info('inside AdminModel -> fetchPDPWindowSettings');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT puw.id 
                ,puw.group5_id 
                ,gm.name AS region_code
                ,gm.description AS region_name
                ,puw.start_date 
                ,puw.end_date 
                ,puw.comments
                ,puw.updated_on 
                ,puw.updated_by AS updated_by_id
                ,COALESCE(shd.first_name,'') || ' ' || COALESCE(shd.last_name,'') AS updated_by
                ,COALESCE(shd.email,'') AS updated_by_email
            FROM pdp_unlock_window puw
            INNER JOIN group5_master gm ON puw.group5_id = gm.id
            LEFT JOIN sales_hierarchy_details shd ON puw.updated_by = shd.user_id
            ORDER BY gm.name;`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('inside AdminModel -> fetchPDPWindowSettings, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updatePDPWindowSettings(region_id: number, start_date: number, end_date: number, comments: string, userId: string) {
        logger.info('inside AdminModel -> updatePDPWindowSettings');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
          UPDATE pdp_unlock_window
          SET start_date=${start_date}, end_date=${end_date}, updated_by= $2, comments= $1
          WHERE group5_id= ${region_id}
          RETURNING group5_id;`;
            const result = await client.query(sqlStatement, [comments, userId]);
            return result?.rowCount;
        } catch (error) {
            logger.error('inside AdminModel -> updatePDPWindowSettings, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async unlockDistributorPDPByRegion(region_id: number) {
        logger.info('inside AdminModel -> unlockDistributorPDPByRegion');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            WITH dbs_to_update AS (
              SELECT dm.id
              FROM distributor_master dm
              INNER JOIN customer_group_master cgm ON (dm.group_id = cgm.id)
              LEFT JOIN (
                SELECT DISTINCT dp.distributor_id
                FROM public.distributor_plants dp
                WHERE dp.distribution_channel = 90
              ) AS ndb ON dm.id = ndb.distributor_id
              WHERE dm.deleted = FALSE 
                  AND dm.status = 'ACTIVE'
                  AND cgm.pdp_unlock_enabled = TRUE
                  AND dm.group5_id = $1
                  AND ndb.distributor_id IS NULL
                  AND dm.enable_pdp = TRUE
            ),unlocked_dbs AS (
                UPDATE  distributor_master 
              SET enable_pdp = FALSE 
              WHERE id IN (SELECT id FROM dbs_to_update)
              RETURNING id
            )
            INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id)
            SELECT
                ud.id AS distributor_id,
                FALSE AS status,
                'SYSTEM_GENERATED' AS updated_by,
                now() AS updated_on,
                'MONTHEND_SYSTEM_UNLOCK' AS request_id
            FROM unlocked_dbs AS ud
            RETURNING distributor_id AS unlocked_distributor_id;
          `;
            const result = await client.query(sqlStatement, [region_id]);
            return { count: result.rowCount || 0, err: '' };
        } catch (error) {
            logger.error('inside AdminModel -> unlockDistributorPDPByRegion, Error: ', error);
            return { count: -1, err: error.toString() };
        } finally {
            client?.release();
        }
    },

    async lockDistributorPDPByRegion(region_id: number) {
        logger.info('inside AdminModel -> lockDistributorPDPByRegion');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            WITH dbs_to_update AS (
              SELECT dm.id
              FROM distributor_master dm
              INNER JOIN customer_group_master cgm ON (dm.group_id = cgm.id)
              LEFT JOIN (
                SELECT DISTINCT dp.distributor_id
                FROM public.distributor_plants dp
                WHERE dp.distribution_channel = 90
              ) AS ndb ON dm.id = ndb.distributor_id
              WHERE dm.deleted = FALSE 
                  AND dm.status = 'ACTIVE'
                  AND cgm.pdp_unlock_enabled = TRUE
                  AND dm.group5_id = $1
                  AND ndb.distributor_id IS NULL
                  AND dm.enable_pdp = FALSE
            ),locked_dbs AS (
                UPDATE  distributor_master 
              SET enable_pdp = TRUE 
              WHERE id IN (SELECT id FROM dbs_to_update)
              RETURNING id
            )
            INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id)
            SELECT
                ld.id AS distributor_id,
                TRUE AS status,
                'SYSTEM_GENERATED' AS updated_by,
                now() AS updated_on,
                'MONTHSTART_SYSTEM_LOCK' AS request_id
            FROM locked_dbs AS ld
            RETURNING distributor_id AS locked_distributor_id;
          `;
            const result = await client.query(sqlStatement, [region_id]);
            return { count: result.rowCount || 0, err: '' };
        } catch (error) {
            logger.error('inside AdminModel -> lockDistributorPDPByRegion, Error: ', error);
            return { count: -1, err: error.toString() };
        } finally {
            client?.release();
        }
    },

    async fetchRSMsAndClusters() {
        logger.info('inside AdminModel -> fetchRSMsAndClusters');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT gm.id AS group5_id, array_agg(shd.email) AS emails , array_agg(shd.first_name || ' ' || shd.last_name) AS names
            FROM public.group5_master gm
            INNER JOIN sales_hierarchy_details shd ON ((shd.code = gm.rsm_code OR shd.code = gm.cluster_code) AND shd.deleted = FALSE AND shd.status = 'ACTIVE')
            WHERE gm.status  = 'ACTIVE' 
              AND gm.rsm_code IS NOT NULL 
              AND gm.cluster_code IS NOT NULL
              AND shd.email IS NOT NULL
            GROUP BY 1;`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('inside AdminModel -> fetchRSMsAndClusters, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateCfaProcessCalender(date: number, expected_starttime: string, remarks: string, updatedBy: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const updateQuery = `UPDATE infra.process_calender SET expected_starttime = $1, last_updated_by = $4, remarks=$3, updated_on=now()  WHERE date = $2`;
            const result = await client.query(updateQuery, [expected_starttime, date, remarks, updatedBy]);
            return result;
        } catch (error) {
            console.error(`Error in CfaProcessModel.updateCfaProcessCalender: ${error.message}`);
            return false;
        } finally {
            if (client) client.release();
        }
    },

    async getCfaProcessCalender() {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const query = `
      SELECT a.date, a.expected_starttime,  s.first_name, s.last_name, s.user_id,
      a.remarks  
      FROM infra.process_calender AS a LEFT JOIN sales_hierarchy_details AS s ON a.last_updated_by = s.user_id 
      ORDER BY a.date ASC`;
            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            console.error(`Error in CfaProcessModel.getCfaProcessCalender: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async insertApprovedPDPUnlockRequest(customer_groups: string[], dist_channels: string[], regions: string[], area_codes: string[], states: string[], plants: string[], startDate: string, endDate: string, comments: string, userId: string, role: string[]) {
        logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest, start_date: '  + startDate + ' ,end_date: ' + endDate);
        logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest, customer_groups: ' + customer_groups + ' ,dist_channels: ' + dist_channels + ' ,regions: ' + regions + ' ,area_codes: ' + area_codes + ' ,states: ' + states + ' ,plants: ' + plants);
        let client: PoolClient | null = null;
        try {
            const requestId = await this.generatePdpUnlockRequestId();
            const customerGroupString = customer_groups.length ? ` AND cgm.description IN (${customer_groups.map((group) => `'${group}'`).join(',')})` : '';
            const distChannelString = dist_channels.length ? ` AND dp.distribution_channel IN (${dist_channels.join(',')})` : '';
            const regionString = regions.length ? ` AND gm.description IN (${regions.map((region) => `'${region}'`).join(',')})` : '';
            const areaCodeString = area_codes.length ? ` AND dm.area_code IN (${area_codes.map((area) => `'${area}'`).join(',')})` : '';
            const stateString = states.length ? ` AND rm.description IN (${states.map((state) => `'${state}'`).join(',')})` : '';
            const plantString = plants.length ? ` AND pm."name" IN (${plants.map((plant) => `'${plant}'`).join(',')})` : '';
            const user = userId + '#' + role.join(',');

            client = await conn.getWriteClient();
            const sqlStatement = `
          WITH dbs AS (
          SELECT 
                'request' AS request
                ,array_agg(DISTINCT gm.description) AS regions
                ,array_agg(DISTINCT dm.area_code) AS area_codes
                ,array_agg(DISTINCT dm.id) AS dist_ids
                ,array_agg(DISTINCT pm."name") AS plant_codes
                ,array_agg(DISTINCT rm.description) AS states
                ,array_agg(DISTINCT dp.distribution_channel) AS distribution_channels
                ,array_agg(DISTINCT cgm."name") AS customer_groups
          FROM 
              distributor_master dm
          INNER JOIN 
              user_profile up ON (dm.id = up.id)
          INNER JOIN 
              group5_master gm ON (dm.group5_id = gm.id)
          INNER JOIN 
              region_master rm ON (dm.region_id = rm.id)
          INNER JOIN 
              customer_group_master cgm ON (dm.group_id = cgm.id)
          LEFT JOIN 
              notification_preferences np ON (np.user_profile_id = dm.id)
          LEFT JOIN 
              distributor_plants dp ON (dm.id = dp.distributor_id)
          LEFT JOIN 
              plant_master pm ON (pm.id = dp.plant_id)
          LEFT JOIN (
              SELECT DISTINCT dp2.distributor_id
              FROM public.distributor_plants dp2
              WHERE dp2.distribution_channel = 90
          ) AS ndb ON dm.id = ndb.distributor_id
          WHERE 
              dm.deleted = false
              AND dm.status = 'ACTIVE'
              AND cgm.name NOT IN ('${EXCLUSION_GROUP.join("' , '")}')  
              ${customerGroupString} ${distChannelString} ${regionString} ${areaCodeString} ${stateString} ${plantString}
          GROUP BY 1
      )
      INSERT INTO public.pdp_unlock_request(
          request_id, 
          area_codes, 
          regions, 
          distributor_codes, 
          start_date, 
          end_date, 
          comments, 
          status, 
          requested_on, 
          requested_by, 
          responded_on, 
          responded_by, 
          select_all,
          plant_codes,
          distribution_channels,
          customer_groups,
          states
      )
      SELECT 
          $1 AS request_id,
          array_agg(DISTINCT area_code) AS area_codes,
          array_agg(DISTINCT region) AS regions,
          array_agg(DISTINCT dist_id) AS distributor_codes,
          $2 AS start_date,
          $3 AS end_date,
          $4 AS comments,
          'APPROVED'::order_approval_status AS status,
          now() AS requested_on,
          $5 AS requested_by,
          array[now()] AS responded_on,
          array['SYSTEM_GENERATED'] AS responded_by,
          false AS select_all,
          array_agg(DISTINCT plant_code) AS plant_codes,
          array_agg(DISTINCT distribution_channel) AS distribution_channels,
          array_agg(DISTINCT customer_group) AS customer_groups,
          array_agg(DISTINCT state) AS states
      FROM 
          dbs AS ds,
          LATERAL unnest(ds.area_codes) AS area_code,
          LATERAL unnest(ds.regions) AS region,
          LATERAL unnest(ds.dist_ids) AS dist_id,
          LATERAL unnest(ds.plant_codes) AS plant_code,
          LATERAL unnest(ds.distribution_channels) AS distribution_channel,
          LATERAL unnest(ds.customer_groups) AS customer_group,
          LATERAL unnest(ds.states) AS state
      RETURNING request_id;`;
            const result = await client.query(sqlStatement, [requestId, startDate, endDate, comments, user]);
            const insertedId: string | null = result?.rows[0]?.request_id || null;
            if (insertedId) {
                logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest, insertedId: ' + insertedId);
                const sd = moment(startDate);
                const ed = moment(endDate);
                const currentDate = moment(new Date().toLocaleDateString());

                // Check if the startDate is smaller than equal to the currentDate and endDate is greater than equal to the currentDate, then unlock the PDP for the distributor
                if ((sd.isSame(currentDate) || sd.isBefore(currentDate)) && (ed.isSame(currentDate) || ed.isAfter(currentDate))) {
                    const pdpOffResponse = await AdminModel.unlockDistributorPDP(insertedId);
                    if (pdpOffResponse?.pdpOff?.request_ids?.length) {
                        AdminService.sendApprovedPDPUnlockRequestEmail([insertedId]);
                    }
                }
            } else {
                logger.error('inside AdminModel -> insertApprovedPDPUnlockRequest, Error: Unable to insert request');
            }
            return insertedId;
        } catch (error) {
            logger.error('inside AdminModel -> insertApprovedPDPUnlockRequest, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateDeliveryCodeSettings(distributorId: string, enable_delivery_code_sms: boolean, enable_delivery_code_email: boolean) {},

    async fetchPDPUnlockRequestsById(requestIds: string[], isPreapporved: boolean = false) {
        logger.info('inside AdminModel -> fetchPDPUnlockRequestsById, requestIds: ' + requestIds.join(', '));
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const requestIdsString = requestIds.map((id) => `'${id}'`).join(',');
            const sqlStatement = (isPreapporved)
            ? `
                SELECT ppur.request_id
                    ,ppur.start_date
                    ,ppur.end_date
                    ,ppur."comments"
                    ,ppur.requested_by
                    ,ppur.filters
                    ,array_agg(ppum.distributor_id) AS distributor_codes
                FROM public.preapproved_pdp_unlock_request ppur
                INNER JOIN preapproved_pdp_unlock_mapping ppum ON ppur.request_id = ppum.request_id
                WHERE ppur.request_id IN (${requestIdsString})
                GROUP BY ppur.request_id, ppur.start_date, ppur.end_date, ppur."comments", ppur.requested_by, ppur.filters;
            `
            :`
                SELECT *
                FROM pdp_unlock_request pur 
                WHERE pur.request_id IN (${requestIdsString})
            `;
            const result = await client.query(sqlStatement);

            return result.rows ?? [];
        } catch (error) {
            logger.error('inside AdminModel -> fetchPDPUnlockRequestsById, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchRSMClusterByDistributorIds(distributorIds: string[]) {
        logger.info('inside AdminModel -> fetchRSMClusterByDistributorIds, distributorIds: ' + distributorIds.join(', '));
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const distributorIdsString = distributorIds.map((id) => `'${id}'`).join(',');
            const sqlStatement = `
            WITH regions AS (SELECT DISTINCT gm.rsm_code, gm.cluster_code 
              FROM distributor_master dm
              INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
              WHERE dm.id IN (${distributorIdsString})
            )
            SELECT shd.first_name , shd.last_name , shd.email , shd.roles 
            FROM sales_hierarchy_details shd 
            INNER JOIN regions rs ON (rs.rsm_code = shd.code  OR rs.cluster_code = shd.code  )
            WHERE shd.status = 'ACTIVE' AND shd.deleted = FALSE;
          `;
            const result = await client.query(sqlStatement);

            return result.rows ?? [];
        } catch (error) {
            logger.error('inside AdminModel -> fetchRSMClusterByDistributorIds, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async lockDistributorPDPPreapporved() {
        logger.info('inside AdminModel -> lockDistributorPDPPreapporved');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const pdpOnStatement = `
                WITH lock_requests AS (
                    SELECT ppur.request_id, ppur.requested_by, ppur.comments, array_agg(ppum.distributor_id) AS distributor_codes
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON ppur.request_id = ppum.request_id
                    WHERE end_date::date = (now() - interval '1 day')::date
                    GROUP BY 1 ,2 ,3
                ),
                updated_distributors AS (
                    UPDATE distributor_master AS dm
                    SET enable_pdp = true,
                        pdp_unlock_id = ur.request_id
                    FROM lock_requests AS ur
                    WHERE dm.id = ANY(ur.distributor_codes) AND dm.enable_pdp = false
                    RETURNING dm.id, ur.request_id, ur.requested_by, ur.comments
                )
                INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id, comments)
                SELECT
                    ud.id AS distributor_id,
                    true AS status,
                    ud.requested_by AS updated_by,
                    now() AS updated_on,
                    ud.request_id AS request_id,
                    ud.comments AS comments
                FROM updated_distributors AS ud
                RETURNING distributor_id AS updated_distributor_id;
            `;
            const pdpOnResult = await client.query(pdpOnStatement);
            return {
                pdpOn: {
                    updated_distributor_ids: pdpOnResult?.rows.map((row) => row.updated_distributor_id),
                },
            };
        } catch (error) {
            logger.error('inside AdminModel -> lockDistributorPDPPreapporved, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async unlockDistributorPDPPreapporved(requestId: string = '') {
        logger.info('inside AdminModel -> unlockDistributorPDPPreapporved');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const requestStatement = requestId
                ? `SELECT ppur.request_id, ppur.requested_by, ppur.comments, array_agg(ppum.distributor_id) AS distributor_codes
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON ppur.request_id = ppum.request_id
                    WHERE ppur.request_id = '${requestId}'
                    GROUP BY 1 ,2 ,3`
                : `SELECT ppur.request_id, ppur.requested_by, ppur.comments, array_agg(ppum.distributor_id) AS distributor_codes
                    FROM preapproved_pdp_unlock_request ppur
                    INNER JOIN preapproved_pdp_unlock_mapping ppum ON ppur.request_id = ppum.request_id
                    WHERE ppur.start_date::date <= now()::date AND ppur.end_date::date >= now()::date
                    GROUP BY 1 ,2 ,3`;
            const pdpOffStatement = `
                WITH unlock_requests AS (
                    ${requestStatement}
                ),
                updated_distributors AS (
                    UPDATE distributor_master AS dm
                    SET enable_pdp = false,
                        pdp_unlock_id = ur.request_id
                    FROM unlock_requests AS ur
                    WHERE dm.id = ANY(ur.distributor_codes) AND dm.enable_pdp = true
                    RETURNING dm.id, ur.request_id, ur.requested_by, ur.comments
                )
                INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, updated_on, request_id, comments)
                SELECT
                    ud.id AS distributor_id,
                    false AS status,
                    ud.requested_by AS updated_by,
                    now() AS updated_on,
                    ud.request_id AS request_id,
                    ud.comments AS comments
                FROM updated_distributors AS ud
                RETURNING distributor_id AS updated_distributor_id, request_id;
            `;
            const pdpOffResult = await client.query(pdpOffStatement);
            return {
                pdpOff: {
                    updated_distributor_ids: pdpOffResult?.rows.map((row) => row.updated_distributor_id),
                    request_ids: [...new Set(pdpOffResult?.rows.map((row) => row.request_id))] ?? [],
                },
            };
        } catch (error) {
            logger.error('inside AdminModel -> unlockDistributorPDPPreapporved, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertApprovedPDPUnlockRequest2(customer_groups: string[], dist_channels: string[], regions: string[], area_codes: string[], states: string[], plants: string[], startDate: string, endDate: string, comments: string, userId: string, role: string[]) {
        logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest2, start_date: ' + startDate + ' ,end_date: ' + endDate);
        logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest2, customer_groups: ' + customer_groups + ' ,dist_channels: ' + dist_channels + ' ,regions: ' + regions + ' ,area_codes: ' + area_codes + ' ,states: ' + states + ' ,plants: ' + plants);
        let client: PoolClient | null = null;
        try {
            const requestId = await this.generatePdpUnlockRequestId(true);
            const customerGroupString = customer_groups.length ? ` AND cgm.description IN (${customer_groups.map((group) => `'${group}'`).join(',')})` : '';
            const distChannelString = dist_channels.length ? ` AND dp.distribution_channel IN (${dist_channels.join(',')})` : '';
            const regionString = regions.length ? ` AND gm.description IN (${regions.map((region) => `'${region}'`).join(',')})` : '';
            const areaCodeString = area_codes.length ? ` AND dm.area_code IN (${area_codes.map((area) => `'${area}'`).join(',')})` : '';
            const stateString = states.length ? ` AND rm.description IN (${states.map((state) => `'${state}'`).join(',')})` : '';
            const plantString = plants.length ? ` AND pm."name" IN (${plants.map((plant) => `'${plant}'`).join(',')})` : '';
            const user = userId + '#' + role.join(',');
            const filters = {
                customer_groups,
                dist_channels,
                regions,
                area_codes,
                states,
                plants,
            };
            const filtersJson = JSON.stringify(filters);
    
            client = await conn.getWriteClient();
    
            // Start transaction
            await client.query('BEGIN');
    
            // Insert into preapproved_pdp_unlock_request
            const insertRequestSql = `
                INSERT INTO public.preapproved_pdp_unlock_request
                    (request_id, start_date, end_date, "comments", filters, requested_on, requested_by)
                VALUES ($1, $2, $3, $4, $5, now(), $6)
            `;
            await client.query(insertRequestSql, [requestId, startDate, endDate, comments, filtersJson, user]);
    
            // Insert into preapproved_pdp_unlock_mapping
            const insertMappingSql = `
                INSERT INTO public.preapproved_pdp_unlock_mapping
                    (request_id, distributor_id)
                SELECT DISTINCT
                    $1 AS request_id,
                    dm.id AS distributor_id
                FROM 
                    distributor_master dm
                INNER JOIN 
                    user_profile up ON (dm.id = up.id)
                INNER JOIN 
                    group5_master gm ON (dm.group5_id = gm.id)
                INNER JOIN 
                    region_master rm ON (dm.region_id = rm.id)
                INNER JOIN 
                    customer_group_master cgm ON (dm.group_id = cgm.id)
                LEFT JOIN 
                    notification_preferences np ON (np.user_profile_id = dm.id)
                LEFT JOIN 
                    distributor_plants dp ON (dm.id = dp.distributor_id)
                LEFT JOIN 
                    plant_master pm ON (pm.id = dp.plant_id)
                LEFT JOIN (
                    SELECT DISTINCT dp2.distributor_id
                    FROM public.distributor_plants dp2
                    WHERE dp2.distribution_channel = 90
                ) AS ndb ON dm.id = ndb.distributor_id
                WHERE 
                    dm.deleted = false
                    AND dm.status = 'ACTIVE'
                    AND cgm.name NOT IN ('${EXCLUSION_GROUP.join("' , '")}')
                    ${customerGroupString} ${distChannelString} ${regionString} ${areaCodeString} ${stateString} ${plantString}
                RETURNING distributor_id;
            `;
            const requestInsertResult = await client.query(insertMappingSql, [requestId]);
    
            // Commit transaction
            await client.query('COMMIT');
    
            const requestInsertCount = requestInsertResult?.rowCount || 0;
            if (requestInsertCount) {
                logger.info('inside AdminModel -> insertApprovedPDPUnlockRequest2, insertedId: ' + requestId);
                const sd = moment(startDate);
                const ed = moment(endDate);
                const currentDate = moment(new Date().toLocaleDateString());
    
                // Check if the startDate is smaller than equal to the currentDate and endDate is greater than equal to the currentDate, then unlock the PDP for the distributor
                if ((sd.isSame(currentDate) || sd.isBefore(currentDate)) && (ed.isSame(currentDate) || ed.isAfter(currentDate))) {
                    const pdpOffResponse = await AdminModel.unlockDistributorPDPPreapporved(requestId);
                    if (pdpOffResponse?.pdpOff?.request_ids?.length) {
                        AdminService.sendApprovedPDPUnlockRequestEmail([requestId]);
                    }
                }
            } else {
                logger.error('inside AdminModel -> insertApprovedPDPUnlockRequest2, Error: Unable to insert request');
            }
            return requestId;
        } catch (error) {
            if (client) {
                await client.query('ROLLBACK'); // Rollback transaction on error
            }
            logger.error('inside AdminModel -> insertApprovedPDPUnlockRequest2, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    }
};