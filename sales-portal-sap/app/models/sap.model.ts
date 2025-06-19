/**
 * @file user.model
 * @description defines user model methods
 */
import commonHelperModel from '../models/helper.model';
import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { roles } from '../constant/persona';
const conn = PostgresqlConnection.getInstance();
export const SapModel = {
    /**
     * returns data
     * @param login_id - where condition
     */
    async userIdExistOrNotOtpTable(login_id: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT *  
            FROM otp 
            WHERE  distributor_id = ${login_id} AND email IS NOT NULL ORDER BY id DESC `;

            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    /**
     * returns data
     * @param otp - where condition
     * @param login_id - where condition
     */
    async checkOtpExistOrNot(otp: string, login_id: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
        SELECT *  
        FROM otp 
        WHERE 
         distributor_id = '${login_id}' AND mobile_number IS NOT NULL ORDER BY id DESC`;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    async getTseAsmAdminDetails(userId) {
        let client: PoolClient | null = null;

        logger.info(`get TSE and ASM details in sap.model.ts in Models`);
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT 
                u.id,u.name,u.mobile,u.email,d.tse_code,d.market,r.description AS region
                FROM 
                user_profile u
            INNER JOIN 
                distributor_master d
            ON 
                d.profile_id = u.id 
             INNER JOIN 
                distributor_plants p
            ON 
                p.distributor_id = u.id 
            LEFT JOIN
                region_master r
            ON
                d.region_id = r.id
            WHERE
                u.id='${userId}'`;

            let { rows } = await client.query(sqlStatement);
            const resultSet = rows[0];
            const tseCode = resultSet.tse_code ? resultSet.tse_code : null;
            delete resultSet.tse_code;

            if (tseCode) {
                const salesHierarchyDetails = await UserService.fetchSalesHierarchyDetails(tseCode);
                resultSet['tse'] = salesHierarchyDetails['TSE'];
                resultSet['tse']?.forEach((tse) => {
                    Object.assign(tse, {
                        distributor_id: userId,
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : '',
                    });
                });
                resultSet['asm'] = salesHierarchyDetails['ASM'];
                resultSet['asm']?.forEach((asm) => {
                    Object.assign(asm, {
                        distributor_id: userId,
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : '',
                    });
                });
            } else {
                resultSet['tse'] = null;
            }

            return resultSet;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    /**
     * returns data
     * @param distId - where condition
     * @param login_id - where condition
     */
    async soNumberWithDistributorId(soNumber: string, distId: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
        SELECT id  
        FROM orders 
        WHERE  distributor_id = '${distId}' AND so_number = '${soNumber}' `;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    /**
     * returns data
     * @param deliveryNumber - where condition
     * @param login_id - where condition
     */
    async getOrderByDeliveryNumber(deliveryNumber, login_id) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT id  
            FROM orders 
            WHERE  delivery_no = '{${deliveryNumber}}' AND distributor_id = '${login_id}' `;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },
    /**
     * returns data
     * @param invoiceNumber - where condition
     * @param login_id - where condition
     */
    async getOrderByInvoiceNumber(invoiceNumber, login_id) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
        SELECT id  
        FROM orders 
        WHERE  invoice_no = '{${invoiceNumber}}' AND distributor_id = '${login_id}' `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },
    /**
     * returns data
     * @param key - where condition
     */
    async getAppLevelSettingsByKeys(keys: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `Select key, value FROM app_level_settings WHERE key IN (${keys}) `;
            const res = await client.query(sqlStatement);

            return res;
        } catch (error) {
            logger.info('Error in getAppLevelSettingsByKeys: ', error);
            return null;
        } finally {
            client?.release();
        }
    },
    /**
     * returns data
     * @param login_id - where condition
     */
    async getPDPDayReferenceDateByDistributorId(login_id) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT pdp_day,reference_date FROM distributor_plants WHERE distributor_id = '${login_id}' `;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },
    async PlantCodeUpdateReques(pc_number: any, data, dbCode: any, user: any, dbName: any, comment: any) {
        logger.info('inside sap model of plant code update');
        let client: PoolClient | null = null;

        const tseCode = user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code;
        try {
            client = await conn.getWriteClient();
            const status = user.roles === 'LOGISTIC_OFFICER' ? 'APPROVED' : 'PENDING';
            const date = new Date();

            let queryParam = [
                pc_number,
                data.sales_org,
                data.division,
                data.distribution_channel,
                data.plant_name,
                tseCode,
                dbName,
                dbCode,
                comment,
                'Update_Plant',
                status,
                `${user.first_name} ${user.last_name} ${user.user_id}`,
                date.toISOString(),
                data.previous_sales_details,
            ];
            const sqlStatement = `INSERT INTO plant_code_update_request(pc_number, salesorg, division, distribution_channel, plant_code,code , distributor_name,distributor_code,comments, requested_type, status, created_by, created_on, previous_salesdetails)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`;

            // const sqlStatement = `INSERT INTO plant_code_update_request(pc_number, salesorg, division, distribution_channel, plant_code,code , distributor_name,distributor_code,comments, requested_type, status, created_by, created_on, previous_salesdetails)
            // VALUES('${pc_number}','${data.sales_org}','${data.division}','${data.distribution_channel}','${data.plant_name}','${tseCode}','${dbName}','${dbCode}','${comment}','Update_Plant','${status}','${user.first_name} ${user.last_name} ${user.user_id}','${date.toISOString()}', '${data.previous_sales_details}')`
            // const rows = await client.query(sqlStatement);

            const rows = await client.query(sqlStatement, queryParam);
            logger.info('response from query', rows);

            return rows;
        } catch (error) {
            logger.error('error: ', error);

            throw error;
        } finally {
            client?.release();
        }
    },

    async updatePlantCodeByLogisticOfficer(pc_number: any, data, dbCode: any, user: any, dbName: any, comment: any) {
        let client: PoolClient | null = null;

        let tseCode = user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code;
        if (user.roles === 'LOGISTIC_OFFICER') tseCode = 'LOGISTIC_OFFICER';
        else if (user.roles === 'ZONAL_OFFICER') tseCode = 'ZONAL_OFFICER';

        try {
            client = await conn.getWriteClient();
            const status = user.roles === 'LOGISTIC_OFFICER' || 'ZONAL_OFFICER' ? 'APPROVED' : 'PENDING';
            const date = new Date();
            let logistic_response = '';

            let queryParam = [
                pc_number,
                data.sales_org,
                data.division,
                data.distribution_channel,
                data.plant_name,
                tseCode,
                dbName,
                dbCode,
                comment,
                comment,
                'Update_Plant',
                status,
                `${user.first_name} ${user.last_name} ${user.user_id}`,
                `${user.first_name} ${user.last_name}`,
                date.toISOString(),
                date.toISOString(),
                data.previous_sales_details,
            ];
            const sqlStatement = `INSERT INTO plant_code_update_request(pc_number, salesorg, division, distribution_channel, plant_code,code , distributor_name,distributor_code,comments, logistic_response, requested_type, status, created_by, update_by, created_on, update_on, previous_salesdetails)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`;
            const rows = await client.query(sqlStatement, queryParam);
            logger.info('response from query', rows);
            return rows;
        } catch (error) {
            logger.error('error: ', error);

            throw error;
        } finally {
            client?.release();
        }
    },

    async logisticOfficerResponse(data: any, user: any) {
        let client: PoolClient | null = null;
        logger.info('inside sap model of plant code update');

        try {
            client = await conn.getWriteClient();
            const date = new Date();
            const sqlStatement = `UPDATE plant_code_update_request
        SET logistic_response='${data.response}', status='${data.status}',  update_by='${user.first_name} ${user.last_name}', update_on='${date.toISOString()}'
        WHERE pc_number='${data.pc_number}'`;
            const rows = await client.query(sqlStatement);
            logger.info('response from query', rows);

            return rows;
        } catch (error) {
            logger.error('Error in logistic officer response', error);
            throw error;
        } finally {
            client?.release();
        }
    },

    async pdpUpdateRequest(pdp_req_no: string, data: any, dbCode: string, user: any, dbName: string, comment: string) {
        let client: PoolClient | null = null;
        logger.info('inside sap.model -> pdpUpdateRequest');

        try {
            client = await conn.getWriteClient();
            const date = new Date();
            const tseCode = user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code;
            let status = 'PENDING';
            type Update_by = string | null;
            type Update_on = string | null;
            let update_by: Update_by = '';
            let update_on: Update_on = '';
            let response_comments = comment;

            // let ref_current = (data.ref_date_current) ? new Date(data.ref_date_current).toISOString(): null;
            // let ref_requested = (data.ref_date_requested) ? new Date(data.ref_date_requested).toISOString(): null;

            if (user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER') {
                status = 'APPROVED';

                update_by = `${user.first_name} ${user.last_name}-${user.email}`;
                update_on = date.toISOString();
            }

            let columnName = [
                'pdp_update_req_no',
                'distributor_name',
                'distributor_code',
                'sales_org',
                'division',
                'dist_channel',
                'plant_code',
                'pdp_current',
                'pdp_requested',
                'ref_date_current',
                'ref_date_requested',
                'tse_code',
                'request_comments',
                'response_comments',
                'status',
                'created_by',
                'updated_by',
                'created_on',
                'update_on',
            ];

            let queryParam = [
                pdp_req_no,
                dbName,
                dbCode,
                data.sales_org,
                data.division,
                data.distribution_channel,
                data.plant_code,
                data.pdp_current === '' ? data.pdp_requested : data.pdp_current,
                data.pdp_requested,
                data.ref_date_current,
                data.ref_date_requested,
                tseCode,
                comment,
                response_comments,
                status,
                `${user.first_name} ${user.last_name}-${user.email}`,
                update_by,
                date.toISOString(),
                update_on,
            ];

            if (!(user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER')) {
                columnName = columnName.filter((item) => item != 'update_on' && item != 'updated_by');
                queryParam = queryParam.filter((item) => item != update_on && item != update_by);
            }

            const pdpRequestInsertQuery =
                data.ref_date_current && data.ref_date_requested
                    ? `INSERT INTO pdp_update_request(${columnName.join(',')})
                                VALUES(${
                                    user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER'
                                        ? new Array(19)
                                              .fill(0)
                                              .map((item, index) => `$${index + 1}`)
                                              .join(',')
                                        : new Array(17)
                                              .fill(0)
                                              .map((item, index) => `$${index + 1}`)
                                              .join(',')
                                })
                                RETURNING pdp_requested, ref_date_requested, distributor_code, sales_org, dist_channel, division
                                `
                    : `INSERT INTO pdp_update_request(${columnName.join(',')})
                                VALUES(${
                                    user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER'
                                        ? new Array(19)
                                              .fill(0)
                                              .map((item, index) => `$${index + 1}`)
                                              .join(',')
                                        : new Array(17)
                                              .fill(0)
                                              .map((item, index) => `$${index + 1}`)
                                              .join(',')
                                })
                                RETURNING pdp_requested, ref_date_requested, distributor_code, sales_org, dist_channel, division
                                `;

            const response = await client.query(pdpRequestInsertQuery, queryParam);

            logger.info('response.rowCount from pdp_update_request_query ', response);

            let resp = response.rows[0];

            if ((resp && status === 'APPROVED' && user.roles === 'LOGISTIC_OFFICER') || user.roles === 'ZONAL_OFFICER') {
                let sqlStatement = `UPDATE distributor_plants
                SET reference_date='${resp?.ref_date_requested}', 
                pdp_day='${resp?.pdp_requested}'
                WHERE distributor_id = '${resp?.distributor_code}'
                AND sales_org = '${resp?.sales_org}'
                AND distribution_channel = '${resp?.dist_channel}'
                AND division = '${resp?.division}';`;

                await client.query(sqlStatement);
            }

            return response.rowCount;
        } catch (error) {
            logger.error('Error in sap.model -> pdpUpdateRequest, ', error);
            return 0;
        } finally {
            client?.release();
        }
    },

    async getPDPUpdateRequests(user: any, payload: any) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            let sqlStatement = '';
            let statusCondition = payload.status && payload.status !== 'ALL' ? ` AND status= '${payload.status}'` : '';
            let searchConditions = payload.search
                ? ` AND (pur.pdp_update_req_no ILIKE '%${payload.search}%' OR 
                                          pur.distributor_name ILIKE '%${payload.search}%' OR 
                                          pur.distributor_code ILIKE '%${payload.search}%' OR 
                                          pur.plant_code ILIKE '%${payload.search}%')`
                : '';
            let limitOffset = ` ORDER BY pur.created_on DESC LIMIT ${payload.limit} OFFSET ${payload.offset}`;

            if (
                user.roles === 'TSE' ||
                user.roles === 'ASM' ||
                user.roles === 'SUPER_ADMIN' ||
                user.roles === 'SUPPORT' ||
                user.roles === 'DIST_ADMIN' ||
                user.roles === 'RSM' ||
                user.roles === 'CLUSTER_MANAGER' ||
                user.roles === 'PORTAL_OPERATIONS'
            ) {
                sqlStatement = 'SELECT * FROM pdp_update_request AS pur WHERE pur.pdp_update_req_no IS NOT NULL ';
                let whereCondition =
                    user.roles === 'TSE' ? ` AND pur.tse_code= '${user.code}'` : user.roles === 'ASM' ? ` AND pur.tse_code ILIKE ANY(ARRAY['${user.code.substring(0, 5)}%'])` : '';
                if (user.roles === 'DIST_ADMIN' || user.roles === 'RSM' || user.roles === 'CLUSTER_MANAGER') {
                    whereCondition = ` AND STRING_TO_ARRAY(pur.tse_code,',') && ARRAY${commonHelperModel.tseHierarchyQueryByCode(user.code)} `;
                }
                sqlStatement += whereCondition;
            } else if (user.roles === 'ZONAL_OFFICER' || user.roles === 'LOGISTIC_OFFICER') {
                let zonalQuery =
                    user.roles === 'ZONAL_OFFICER'
                        ? `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                                  WHERE zone_manager_email ILIKE '%${user.email}%'
                                  OR cluster_manager_email ILIKE '%${user.email}%'
                                  AND is_deleted = 'false'`
                        : `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                                  WHERE logistic_email ILIKE '%${user.email}%'
                                  AND is_deleted = 'false'`;
                sqlStatement = `SELECT pur.pdp_update_req_no,
                                    pur.distributor_name,
                                    pur.pdp_update_req_no,
                                    pur.distributor_code,
                                    pur.sales_org,
                                    pur.division,
                                    pur.dist_channel,
                                    pur.plant_code,
                                    pur.pdp_current,
                                    pur.pdp_requested,
                                    pur.ref_date_current,
                                    pur.ref_date_requested,
                                    pur.tse_code,
                                    pur.request_comments,
                                    pur.response_comments,
                                    pur.status,
                                    pur.created_by,
                                    pur.updated_by,
                                    pur.created_on,
                                    pur.update_on  	   
                                FROM pdp_update_request AS pur
                                INNER JOIN ( ${zonalQuery} ) AS cfa ON
                                pur.sales_org = cfa.sales_org AND
                                pur.division = cfa.division AND
                                pur.dist_channel = cfa.distribution_channel AND
                                pur.plant_code = cfa.depot_code
                                WHERE pur.pdp_update_req_no IS NOT NULL `;
            }

            sqlStatement += statusCondition;
            sqlStatement += searchConditions;
            sqlStatement += limitOffset;
            logger.info('Inside sap.model -> getPDPUpdateRequests ,  Query = ' + sqlStatement);

            const res = await client.query(sqlStatement);
            logger.info('Inside sap.model -> getPDPUpdateRequests ,  Response = \n', res.rowCount);

            return res.rows;
        } catch (error) {
            logger.error('Inside sap.model -> getPDPUpdateRequests ,  Error = \n', error);

            return null;
        } finally {
            client?.release();
        }
    },
    async getPDPUpdateRequestsCount(user: any, payload: any) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = '';
            let statusCondition = payload.status !== 'ALL' ? ` AND status= '${payload.status}'` : '';
            let searchConditions =
                payload.search && payload.search !== ''
                    ? ` AND (pur.pdp_update_req_no ILIKE '%${payload.search}%' OR 
                                          pur.distributor_name ILIKE '%${payload.search}%' OR 
                                          pur.distributor_code ILIKE '%${payload.search}%' OR 
                                          pur.plant_code ILIKE '%${payload.search}%')`
                    : '';

            if (
                user.roles === 'TSE' ||
                user.roles === 'ASM' ||
                user.roles === 'SUPER_ADMIN' ||
                user.roles === 'SUPPORT' ||
                user.roles === 'DIST_ADMIN' ||
                user.roles === 'RSM' ||
                user.roles === 'CLUSTER_MANAGER' ||
                user.roles === 'PORTAL_OPERATIONS'
            ) {
                sqlStatement = 'SELECT COUNT(pur.pdp_update_req_no) FROM pdp_update_request AS pur WHERE pur.pdp_update_req_no IS NOT NULL ';
                let whereCondition = user.roles === 'TSE' ? ` AND pur.tse_code= '${user.code}'` : user.roles === 'ASM' ? ` AND pur.tse_code ILIKE '${user.code}%'` : '';
                if (user.roles === 'DIST_ADMIN' || user.roles === 'RSM' || user.roles === 'CLUSTER_MANAGER') {
                    whereCondition = ` AND STRING_TO_ARRAY(pur.tse_code,',') && ARRAY${commonHelperModel.tseHierarchyQueryByCode(user.code)} `;
                }
                sqlStatement += whereCondition;
            } else if (user.roles === 'ZONAL_OFFICER' || user.roles === 'LOGISTIC_OFFICER') {
                let zonalQuery =
                    user.roles === 'ZONAL_OFFICER'
                        ? `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                                  WHERE zone_manager_email ILIKE '%${user.email}%'
                                  OR cluster_manager_email ILIKE '%${user.email}%'
                                  AND is_deleted = 'false'`
                        : `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                                  WHERE logistic_email ILIKE '%${user.email}%'
                                  AND is_deleted = 'false'`;
                sqlStatement = `SELECT COUNT(pur.pdp_update_req_no) FROM pdp_update_request AS pur
                                INNER JOIN ( ${zonalQuery} ) AS cfa ON
                                pur.sales_org = cfa.sales_org AND
                                pur.division = cfa.division AND
                                pur.dist_channel = cfa.distribution_channel AND
                                pur.plant_code = cfa.depot_code
                                WHERE pur.pdp_update_req_no IS NOT NULL `;
            }

            sqlStatement += statusCondition;
            sqlStatement += searchConditions;

            logger.info('Inside sap.model -> getPDPUpdateRequestsCount ,  Query = ' + sqlStatement);
            const res = await client.query(sqlStatement);
            logger.info('Inside sap.model -> getPDPUpdateRequestsCount ,  Response = \n', res.rows);

            return res.rows[0].count;
        } catch (error) {
            logger.error('Inside sap.model -> getPDPUpdateRequestsCount ,  Error = \n', error);

            return null;
        } finally {
            client?.release();
        }
    },

    async pdpUpdateRequestResponse(data: any, user: any) {
        let client: PoolClient | null = null;
        logger.info('Inside sap.model -> pdpUpdateRequestResponse ');

        try {
            client = await conn.getWriteClient();
            const date = new Date();
            let sqlStatement = `UPDATE pdp_update_request
        SET response_comments='${data.response}', status='${data.status}',  updated_by= '${user.first_name} ${user.last_name}-${user.email}', update_on='${date.toISOString()}'
        WHERE pdp_update_req_no='${data.pdpNo}' 
        RETURNING pdp_requested, ref_date_requested, distributor_code, sales_org, dist_channel, division;`;
            const res = await client.query(sqlStatement);
            logger.info('Inside sap.model -> pdpUpdateRequestResponse , Response.rowcount = ', res.rowCount);

            if (res && data.status === 'APPROVED') {
                sqlStatement = `UPDATE distributor_plants
                SET reference_date='${res.rows[0]?.ref_date_requested}', 
                pdp_day='${res.rows[0]?.pdp_requested}'
                WHERE distributor_id = '${res.rows[0]?.distributor_code}'
                AND sales_org = '${res.rows[0]?.sales_org}'
                AND distribution_channel = '${res.rows[0]?.dist_channel}'
                AND division = '${res.rows[0]?.division}';`;

                const response = await client.query(sqlStatement);
            }

            return res.rowCount;
        } catch (error) {
            logger.error('Inside sap.model -> pdpUpdateRequestResponse ,  Error = \n', error);
            return 0;
        } finally {
            client?.release();
        }
    },

    async getZonalEmail(plant_code: string, sales_org: string, distribution_channel: string, division: string) {
        let client: PoolClient | null = null;
        logger.info('inside sap.model -> getZonalEmail');

        try {
            client = await conn.getReadClient();
            const zonalQuery = `SELECT zone_manager_email, cluster_manager_email, logistic_email FROM cfa_depot_mapping 
                               WHERE depot_code= '${plant_code}' AND sales_org= ${Number(sales_org)} AND distribution_channel= ${Number(distribution_channel)} AND division= ${Number(division)}`;

            logger.info('inside sap.model -> getZonalEmail, Query= ' + zonalQuery);
            const zonalResponse = await client.query(zonalQuery);
            logger.info('inside sap.model -> getZonalEmail, Response= ' + zonalResponse);

            let zonal_emails = [];
            let cluster_emails = [];
            let logistic_emails = [];

            if (zonalResponse.rows.length) {
                zonal_emails = zonalResponse.rows[0]['zone_manager_email'].split(',').map((e: string) => e.trim().toLowerCase());
                cluster_emails = zonalResponse.rows[0]['cluster_manager_email'].split(',').map((e: string) => e.trim().toLowerCase());
                logistic_emails = zonalResponse.rows[0]['logistic_email'].split(',').map((e: string) => e.trim().toLowerCase());
            }

            return { zonal_emails, cluster_emails, logistic_emails };
        } catch (error) {
            logger.error('Error in sap.model -> getZonalEmail, ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getSSODetailById(id: string) {
        let client: PoolClient | null = null;
        logger.info('Inside sap.model-> getSSODetailById');
        id = id.trim();
        let user_details = { first_name: '', last_name: '', email: '', code: '', roles: '' };

        try {
            client = await conn.getReadClient();
            const query = `SELECT first_name, last_name, email, code, roles::_varchar FROM sales_hierarchy_details WHERE user_id= '${id}'`;
            const response = await client.query(query);

            if (response.rows.length) {
                user_details = response.rows[0];
            }
            return user_details;
        } catch (error) {
            logger.error('Error in sap.model -> getSSODetailById, ', error);
            return user_details;
        } finally {
            client?.release();
        }
    },

    async depotCodeMapping(data: any, depotCode: any, roleArr: any, email: any) {
        let client: PoolClient | null = null;
        let { division, distributionChannel, sales_org } = data;

        let columnName;
        if (roleArr.includes(roles.LOGISTIC_OFFICER)) {
            columnName = 'logistic_email';
        } else if (roleArr.includes(roles.ZONAL_OFFICER)) {
            columnName = 'zone_manager_email';
        }
        try {
            client = await conn.getReadClient();
            let sqlStatement = `
            select distribution_channel,
            depot_code,
            division,
            sales_org
            from cfa_depot_mapping 
            where depot_code = '${depotCode}'
            and sales_org = '${sales_org}'
            and distribution_channel = '${distributionChannel}'
            and division = '${division}'
            and ${columnName} like '%${email.toLowerCase()}%'
          
            `;
            let response = await client.query(sqlStatement);
            if (response.rows.length) {
                return response.rows[0];
            }
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    async getSSODetailByEmail(email: string) {
        let client: PoolClient | null = null;
        logger.info('Inside sap.model-> getSSODetailByEmail');
        email = email.trim();
        let user_details = { first_name: '', last_name: '', user_id: '', code: '', roles: '' };

        try {
            client = await conn.getReadClient();
            const query = `SELECT first_name, last_name, user_id, code, roles::_varchar FROM sales_hierarchy_details WHERE email ILIKE '${email}' AND deleted= false AND status = 'ACTIVE'`;
            const response = await client.query(query);

            if (response.rows.length) {
                user_details = response.rows[0];
            }
            return user_details;
        } catch (error) {
            logger.error('Error in sap.model -> getSSODetailByEmail, Error = ', error);
            return user_details;
        } finally {
            client?.release();
        }
    },

    async getASMDetailByCode(code: string) {
        let client: PoolClient | null = null;
        logger.info('Inside sap.model-> getASMDetailByCode');
        let user_details = { first_name: '', last_name: '', email: '' };

        try {
            client = await conn.getReadClient();
            const query = `SELECT first_name, last_name, email FROM sales_hierarchy_details WHERE user_id = 
                          (SELECT manager_id FROM sales_hierarchy_details WHERE code = '${code}' AND deleted = false)
                          AND deleted = false`;
            const response = await client.query(query);

            if (response.rows.length) {
                user_details = response.rows[0];
            }
            return user_details;
        } catch (error) {
            logger.error('Error in sap.model -> getASMDetailByCode, ', error);
            return user_details;
        } finally {
            client?.release();
        }
    },
    async getTseDetails(db: any) {
        let client: PoolClient | null = null;
        try {
            let sqlStatement = `
            select
       tse_code,
       profile_id,
       shd.email as tse_email,
       shd2.email as asm_email,
       up.email as db_email_id
   from
       distributor_master dm
   inner join sales_hierarchy_details shd on
       (shd.code ilike dm.tse_code
           and shd.deleted = 'false'
           and shd.status = 'ACTIVE')
           left join sales_hierarchy_details shd2 on
       (shd.manager_id = shd2.user_id
           and shd2.deleted = 'false'
           and shd2.status = 'ACTIVE')
           inner  join user_profile up on up.id= dm.profile_id 
           where
       dm.id = '${db}'
         `;
            client = await conn.getReadClient();
            const response = await client.query(sqlStatement);

            if (response.rows.length) {
                return response.rows;
            }
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    orderQuery: {
        async checkPoNumberWithDistId(PoNumber, login_id) {
            let client: PoolClient | null = null;

            try {
                client = await conn.getReadClient();
                const checkPoNumberWithDistId = `Select * FROM orders 
            WHERE po_number='${PoNumber}' 
            AND distributor_id = '${login_id}'  `;
                const checkPoNumberWithDistIdResult = await client.query(checkPoNumberWithDistId);
                return checkPoNumberWithDistIdResult;
            } catch (error) {
                logger.error('CAUGHT: Error in utilModel -> checkPoNumberWithDistId: ', error);
                throw error;
            } finally {
                client?.release();
            }
        },

        async updateOrdersStatement(soNumber, soValue, product_type, poNumber, login_id, roles, user_id, po_index = 1) {
            let client: PoolClient | null = null;

            try {
                client = await conn.getWriteClient();
                let updateOrdersStatement = `
                UPDATE 
                  orders 
                SET 
                  so_number = '${soNumber}', updated_on = now(), so_date = CURRENT_TIMESTAMP, so_value = '${soValue}', status = 'ORDER PLACED', product_type = '${
                      product_type ? product_type.toUpperCase() : 'UNIVERSAL'
                  }'`;
                if (roles) {
                    updateOrdersStatement += `, created_by = '${user_id}', created_by_user_group = '${roles}'`;
                } else {
                    updateOrdersStatement += `, created_by_user_group = 'SELF'`;
                }
                updateOrdersStatement += ` WHERE po_number = '${poNumber}' AND po_number_index = ${po_index} `;

                const updateOrdersResult = await client.query(updateOrdersStatement);
                return updateOrdersResult;
            } catch (error) {
                logger.error('CAUGHT: Error in utilModel -> updateOrdersStatement: ', error);
            } finally {
                client?.release();
            }
        },
        async getNotificationPreference(login_id) {
            let client: PoolClient | null = null;
            try {
                client = await conn.getReadClient();
                const selectUserNotification = `Select * FROM notification_preferences WHERE user_profile_id='${login_id}' `;
                const selectUserNotificationResult = await client.query(selectUserNotification);
                return selectUserNotificationResult;
            } catch (error) {
                logger.error('CAUGHT: Error in utilModel -> updateOrdersStatement: ', error);
            } finally {
                client?.release();
            }
        },

        fetchPoDetails: {
            async fetchPODetailsPackTypeSqlStatement(materials) {
                let client: PoolClient | null = null;

                try {
                    client = await conn.getReadClient();
                    let fetchPODetailsPackTypeSqlStatement = `
                SELECT 
                    pak_type
                FROM 
                    material_master
                    WHERE 
                    code IN ('${materials}')`;
                    return await client.query(fetchPODetailsPackTypeSqlStatement);
                } catch (error) {
                    logger.error('CAUGHT: Error in utilModel -> updateOrdersStatement: ', error);
                } finally {
                    client?.release();
                }
            },
        },
    },

    async generatePurchaseOrderNo(payload) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const insertStatement = `
                        INSERT INTO 
                        orders (distributor_id,po_period,po_number,so_number,order_data,cart_number,created_by,created_by_user_group,status,order_type,po_number_index) 
                        VALUES 
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id, po_number, po_number_index;
                `;
            const insertResult = await client.query(insertStatement, [
                payload.distributor_id,
                payload.po_period,
                payload.po_number,
                payload.so_number,
                payload.order_data,
                payload.cart_number,
                payload.created_by,
                payload.created_by_user_group,
                payload.status,
                payload.order_type,
                payload.po_index,
            ]);

            return insertResult;
        } catch (error) {
            throw error;
        } finally {
            client?.release();
        }
    },

    async getGenerateOrderHistory(order, distributorId) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            let ordersStatement = '';
            if (Array.isArray(order)) {
                for (let item of order) {
                    if (ordersStatement) {
                        ordersStatement += ', ';
                    }
                    ordersStatement += '(' + item.material_code + ",'" + distributorId + "')";
                }
            } else {
                ordersStatement += '(' + order.material_code + ",'" + distributorId + "')";
            }
            const insertStatement =
                `
        INSERT INTO order_history_recommendation (material_code, distributor_code) 
        VALUES ` + ordersStatement;
            return await client.query(insertStatement);
        } catch (error) {
        } finally {
            client?.release();
        }
    },

    async fetchCartsCountTodayQuery(distributorId) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const fetchCartsCountTodayStatement = `
            SELECT COUNT(id) FROM orders WHERE distributor_id = '${distributorId}' AND status = 'DRAFT' AND created_on::date = CURRENT_DATE`;
            return await client.query(fetchCartsCountTodayStatement);
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> checkPoNumberWithDistId: ', error);
            return error;
        } finally {
            client?.release();
        }
    },

    async fetchPrioritizationByDistributorId(distCode: string) {
        logger.info('inside SkuRuleConfigurationsModel -> fetchPrioritizationByArea');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            jsonb_object_agg(code, priority) AS psku_priority
        FROM
            prioritization p
        INNER JOIN material_master mm ON
            mm.brand_variant = p.brand_variant
        WHERE
            p.area_code = (
            SELECT
                area_code
            FROM
                distributor_master dm
            WHERE
                id = $1
            )
            AND mm.status = 'ACTIVE'
            AND mm.deleted = FALSE
        GROUP BY
            p.area_code;
    `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distCode]);
            return result?.rows[0]?.psku_priority ?? null;
        } catch (error) {
            logger.error('CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchPrioritizationByArea: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async deletePurchaseOrder(po_number: string) {
        logger.info('inside sap.model -> deletePurchaseOrder, po_number: ', po_number);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const deleteStatement = `DELETE FROM orders WHERE po_number = '${po_number}'`;
            const result = await client.query(deleteStatement);
            logger.info('inside sap.model -> deletePurchaseOrder, rows_deletd: ', result?.rowCount);
            return result?.rowCount;
        } catch (error) {
            logger.error('inside sap.model -> deletePurchaseOrder, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async fetchSapHolidayList(year: string | undefined, code: string | undefined, state: string | undefined) {
        logger.info('inside sapModel -> fetchSapHolidayList, year: ' + year + ', code: ' + code + ', state: ' + state);
        let client: PoolClient | null = null;

        try {
            const stateQuery = state ? `AND sh.state_description ILIKE '%${state}%'` : '';
            const codeQuery = code ? `AND sh.state_code = '${code}'` : '';
            const yearQuery = year ? `AND sh.year = '${year}'` : '';
            const sqlStatement = `
                SELECT sh.key, sh.year, sh.state_code, sh.state_description AS state, holiday_date, sh.plant, sh.plant_description
                FROM sap_holidays AS sh
                WHERE sh.state_code IS NOT NULL ${stateQuery} ${codeQuery} ${yearQuery}
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('inside sapModel -> fetchSapHolidayList, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateHolidaySync(data) {
        logger.info('Inside SapModel -> updateHolidaySync');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement =
                "INSERT INTO sap_holidays(year, state_code, state_description, holiday_date, plant, plant_description) SELECT year, state_code, state_description, holiday_date, plant, plant_description  FROM json_populate_recordset (NULL::sap_holidays, '" +
                data +
                "') ON CONFLICT (year, state_code, state_description, holiday_date) DO Nothing";

            const response = await client.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error('Inside SapModel -> updateHolidaySync, Error:', error);
            return false;
        } finally {
            if (client) {
                client.release();
            }
        }
    },

    async getOrderDetails(po_number: string, po_index: number = 1) {
        logger.info('inside sap.model -> getOrderDetails, po_number: ' + po_number);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const selectStatement = `
                SELECT user_profile.name, user_profile.email, user_profile.mobile, orders.order_data, orders.so_date, orders.so_value, orders.distributor_id
                FROM user_profile INNER JOIN orders 
                ON user_profile.id = orders.distributor_id
                WHERE po_number = $1 and po_number_index = $2;`;
            const result = await client.query(selectStatement, [po_number, po_index]);
            return result?.rows[0] ?? null;
        } catch (error) {
            logger.error('inside sap.model -> getOrderDetails, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getPDPWindows(regionId: number) {
        logger.info(`inside SapModel -> getPDPWindows: regionId: ${regionId}`);
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
            threshold_frequency
            FROM
            public.pdp_windows
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
            logger.error('CAUGHT: Error in SapModel -> getPDPWindows: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async isPoUnderOrderSubmissionProcessing(poNumber: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                INSERT INTO po_processing_for_order_submission (po_number) values ($1);
                `;
            const response = await client.query(sqlStatement, [poNumber]);
            logger.info('inside SapModel -> isPoUnderOrderSubmissionProcessing, Response: ', response);
            // If the rowCount is 0, it means the PO is already under processing
            // If the rowCount is 1, it means the PO was successfully inserted into the processing table. Continue order processing.
            return !!!response?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SapModel -> isPoUnderOrderSubmissionProcessing, Error: ', error);
            return true; // If there is an error, we assume the PO is under processing
        } finally {
            client?.release();
        }
    },

    async removePoFromOrderSubmissionProcessing(poNumber: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                DELETE FROM po_processing_for_order_submission WHERE po_number = $1;
                `;
            await client.query(sqlStatement, [poNumber]);
            return true; // Return true if the deletion was successful
        } catch (error) {
            logger.error('CAUGHT: Error in sap.model -> removePoFromOrderSubmissionProcessing, Error: ', error);
            return false; // If there is an error, we assume the removal failed
        } finally {
            client?.release();
        }
    },
};
