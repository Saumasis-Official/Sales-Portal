/**
 * @file admin.model
 * @description defines admin model methods
 */

import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
export const ErrorReportingModel = {
    async reportPortalError(portalErrorObj: {
        remarks: string | null;
        user_id: string;
        error_code: string;
        error_message: string | null;
        corr_id: string | null;
        error_info: object | null;
        category_id: number;
        created_by: string | null;
        created_by_user_group: string;
    }) {
        logger.info(`inside model ErrorReportingModel.reportPortalError`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const portalError = JSON.stringify(portalErrorObj);
            const reportPortalErrorSqlStatement = `INSERT INTO service_requests(remarks, user_id, error_code, error_message, corr_id, error_info, category_id, created_by, created_by_user_group) 
            SELECT remarks, user_id, error_code, error_message, corr_id, error_info, category_id, created_by, created_by_user_group FROM json_populate_record (NULL::service_requests, $1) RETURNING *`;
            const reportPortalErrorResponse = await client.query(reportPortalErrorSqlStatement, [portalError]);
            const res = reportPortalErrorResponse && reportPortalErrorResponse.rows && reportPortalErrorResponse.rows[0];
            if (res) {
                const getServiceRequestCategorySqlStatement = `SELECT label, description FROM service_request_categories WHERE id = ${res.category_id}`;
                const getServiceRequestCategoryResponse = await client.query(getServiceRequestCategorySqlStatement);
                if (getServiceRequestCategoryResponse && getServiceRequestCategoryResponse.rows && getServiceRequestCategoryResponse.rows[0]) {
                    res.category_label = getServiceRequestCategoryResponse.rows[0].label;
                    res.category_description = getServiceRequestCategoryResponse.rows[0].description;
                }
            }
            delete res.category_id;

            return reportPortalErrorResponse && reportPortalErrorResponse.command === 'INSERT' && reportPortalErrorResponse.rowCount && res;
        } catch (error) {
            logger.error(`error in ErrorReportingModel.reportPortalError: `, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async reportCFAPortalError(portalErrorObj: {
        remarks: string | null;
        error_code: string;
        error_message: string | null;
        corr_id: string | null;
        error_info: object | null;
        category_id: number;
        created_by: string | null;
        created_by_user_group: string[];
    }) {
        logger.info(`inside model ErrorReportingModel.reportCFAPortalError`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const portalError = JSON.stringify(portalErrorObj);
            const reportPortalErrorSqlStatement = `INSERT INTO service_requests(remarks, error_code, error_message, corr_id, error_info, category_id, created_by, created_by_user_group) 
            SELECT remarks, error_code, error_message, corr_id, error_info, category_id, created_by, created_by_user_group FROM json_populate_record (NULL::service_requests, '${portalError}') RETURNING *`;
            const reportPortalErrorResponse = await client.query(reportPortalErrorSqlStatement);
            const res = reportPortalErrorResponse && reportPortalErrorResponse.rows && reportPortalErrorResponse.rows[0];
            if (res) {
                const getServiceRequestCategorySqlStatement = `SELECT label, description FROM service_request_categories WHERE id = ${res.category_id}`;
                const getServiceRequestCategoryResponse = await client.query(getServiceRequestCategorySqlStatement);
                if (getServiceRequestCategoryResponse && getServiceRequestCategoryResponse.rows && getServiceRequestCategoryResponse.rows[0]) {
                    res.category_label = getServiceRequestCategoryResponse.rows[0].label;
                    res.category_description = getServiceRequestCategoryResponse.rows[0].description;
                }
            }
            delete res.category_id;

            return reportPortalErrorResponse && reportPortalErrorResponse.command === 'INSERT' && reportPortalErrorResponse.rowCount && res;
        } catch (error) {
            logger.error(`error in ErrorReportingModel.reportCFAPortalError: `, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async fetchServiceRequestCategories(type: string) {
        let client: PoolClient | null = null;
        logger.info(`inside model ErrorReportingModel.fetchServiceRequestCategories`);
        client = await conn.getReadClient();
        try {
            const fetchServiceRequestCategoriesSqlStatement = `SELECT id, label, description 
                                                               FROM service_request_categories
                                                               WHERE status = 'ACTIVE' AND type= '${type}'`;
            const fetchServiceRequestCategoriesResponse = await client.query(fetchServiceRequestCategoriesSqlStatement);

            return fetchServiceRequestCategoriesResponse;
        } catch (error) {
            logger.error(`error in ErrorReportingModel.fetchServiceRequestCategories: `, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async addServiceRequestCategory(label: string, description: string, createdBy: string, type: string) {
        logger.info(`inside model ErrorReportingModel.addServiceRequestCategory`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const addServiceRequestCategorySqlStatement = `INSERT INTO service_request_categories(label, description, created_by, type) 
            VALUES
            ('${label}', '${description}', '${createdBy}', '${type}')`;
            const addServiceRequestCategoryResponse = await client.query(addServiceRequestCategorySqlStatement);

            return addServiceRequestCategoryResponse;
        } catch (error) {
            logger.error(`error in ErrorReportingModel.addServiceRequestCategory: `, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async modifyServiceRequestCategory(
        categoryId: number,
        label: string | undefined,
        description: string | undefined,
        enable: boolean | undefined,
        updatedBy: string,
        type: string | undefined,
    ) {
        logger.info(`inside model ErrorReportingModel.modifyServiceRequestCategory`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            if (label === undefined && description === undefined && enable === undefined) {
                //empty body
                throw new Error('Request body should not be empty');
            }
            let modifyServiceRequestCategorySqlStatement = `UPDATE service_request_categories SET `;
            if (label) modifyServiceRequestCategorySqlStatement += `label = '${label}', `;
            if (description) modifyServiceRequestCategorySqlStatement += `description = '${description}', `;
            if (type) modifyServiceRequestCategorySqlStatement += `type = '${type}', `;
            if (typeof enable === 'boolean') modifyServiceRequestCategorySqlStatement += `status = '${enable ? 'ACTIVE' : 'INACTIVE'}', `;
            modifyServiceRequestCategorySqlStatement += `created_by = '${updatedBy}', updated_on = CURRENT_TIMESTAMP WHERE id = ${categoryId}`;

            const modifyServiceRequestCategoryResponse = await client.query(modifyServiceRequestCategorySqlStatement);

            return modifyServiceRequestCategoryResponse;
        } catch (error) {
            logger.error(`error in ErrorReportingModel.modifyServiceRequestCategory: `, error);

            return null;
        } finally {
            client?.release();
        }
    },
};
