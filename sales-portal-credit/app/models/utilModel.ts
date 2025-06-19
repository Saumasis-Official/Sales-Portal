/**
 * @file util model
 * @description defines util model methods
 */
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import { GT_ACTION_TYPE } from '../constants/constants';

interface GTStartAuditParams {
    transaction_id: string;
    child_id: string;
    payerCode: string;
    creditLimit: string;
    amount: string;
    userId?: string; //  default as "SYSTEM"
    sapResponse: {
        status: string;
        data: any;
    };
}
export const utilModel = {
    async getLastRequestId(tableName: string, pk_column: string) {
        let client: PoolClient | null = null;
        const sqlStatement = `SELECT ${pk_column} FROM ${tableName} ORDER BY id DESC LIMIT 1`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error('CAUGHT: Error in UtilModel.getLastRequestId ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async userMappingList(userId: string) {
        logger.info('inside UtilModel -> userMappingList');
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                    WITH json_data AS (
            SELECT user_id, json_array_elements_text(unnest(payer_code)::json) AS json_element
            FROM kams_customer_mapping
        ),
        payer_codes AS (
            SELECT
                user_id,
                (json_element::json)->>'payer_code' AS payer_code,
                (json_element::json)->>'credit_limit' AS credit_limit
            FROM json_data
            WHERE (json_element::json)->>'credit_limit' = 'true'
        ),
        latest_transactions AS (
            SELECT
                t1.payercode,
                t1.baselimit,
                CASE 
                    WHEN t1.expiry_type = 'NA' THEN t1.amount_requested 
                    ELSE NULL 
                END as amount_requested,
                CASE 
                    WHEN t1.expiry_type = 'NA' THEN t1.expirydate 
                    ELSE NULL 
                END as expirydate,
                t1.status,
                t1.expiry_type,
                t1.requested_by,
                CASE 
                    WHEN t1.expiry_type = 'NA' THEN 
                        ROUND((CAST(t1.amount_requested AS numeric) / CAST(t1.baselimit AS numeric)) * 100, 2)
                    ELSE NULL 
                END AS extensionpercentage
            FROM credit.transactions t1
            INNER JOIN (
                SELECT payercode, MAX(id) AS max_id
                FROM credit.transactions
                WHERE status = 'APPROVED'
                GROUP BY payercode
            ) t2 ON t1.payercode = t2.payercode AND t1.id = t2.max_id
        )
        SELECT
            pc.user_id,
            t2.first_name,
            t2.email,
            t2.last_name,
            pc.payer_code,
            pc.credit_limit,
            o.customer_code,
            o.customer_group,
            cgm.description as customer_group_description,
            o.payer_name,
            o.customer_name,
            o.sap_base_limit as "mt_ecom_baseLimit",
            o.risk_class,
            lt.baselimit as "previous_baseLimit",
            lt.amount_requested,
            lt.expirydate,
            lt.extensionpercentage,
            lt.requested_by
        FROM payer_codes pc
        JOIN mt_ecom_payer_code_mapping o ON o.payer_code = pc.payer_code
        JOIN sales_hierarchy_details t2 ON t2.user_id = pc.user_id
        LEFT JOIN latest_transactions lt ON lt.payercode = pc.payer_code
        INNER JOIN customer_group_master cgm ON cgm.name = o.customer_group
        WHERE t2.user_id = $1 
        AND t2.deleted IS FALSE 
        AND t2.status = 'ACTIVE' 
        AND o.is_deleted IS FALSE;
        `;

            const result = await client.query(sqlStatement, [userId]);
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> userMappingList: ', error);
        } finally {
            client?.release();
        }
    },

    async getCustomerGroups() {
        logger.info('inside UtilModel -> getCustomerGroups');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const query = `WITH mt_customer_groups AS (
                SELECT UNNEST(string_to_array(value, ',')) as customer_group
                FROM public.app_level_settings
                WHERE key = 'MT_CREDIT_CG'
            )
            SELECT DISTINCT 
                mepcm.customer_group ,
                cgm.description 
            FROM public.mt_ecom_payer_code_mapping mepcm 
            INNER JOIN mt_customer_groups mcg 
                ON TRIM(mcg.customer_group) = mepcm.customer_group
            inner join public.customer_group_master cgm 
            	on cgm."name" = mepcm.customer_group 
            WHERE 
                mepcm.customer_group IS NOT NULL 
                AND mepcm.customer_group != ''
                AND mepcm.is_deleted IS FALSE
            ORDER BY 
                mepcm.customer_group ASC;
                `;
            const result = await client.query(query);
            return {
                rowCount: result.rowCount,
                rows: result.rows.map((row) => ({
                    customer_group : row.customer_group, 
                    description : row.description}))
            };
        } catch (error) {
            logger.error('Error in UtilModel -> getCustomerGroups: ', error);
        } finally {
            client?.release();
        }
    },

    async getAccountList(data: { customer_group: string | null; limit: number | null; offset: number | null; type: string | null; search: string | null }) {
        logger.info('inside UtilModel -> getAccountList');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const downloadAll = data.type === 'Download';
            const baseQuery= `WITH customer_groups AS (
                SELECT UNNEST(string_to_array(value, ',')) as customer_group
                FROM public.app_level_settings
                WHERE key = 'MT_CREDIT_CG'
            ) ` 
            
            const queryParams: (string | number)[] = [];
            let whereClause = '';

            if (data.customer_group) {
                whereClause = 'WHERE mepcm.customer_group = $1  AND mepcm.is_deleted IS FALSE';
                queryParams.push(data.customer_group);
            } else {
                whereClause = `WHERE mepcm.customer_group IN (
                    SELECT TRIM(customer_group) FROM customer_groups
                ) AND mepcm.is_deleted IS FALSE`;
            }

            let countStatement = baseQuery +`
      SELECT COUNT(*)
      FROM (
        SELECT DISTINCT mepcm.payer_code, mepcm.payer_name, mepcm.base_limit
        FROM public.mt_ecom_payer_code_mapping mepcm
        ${whereClause}
      ) AS subquery
    `;

            let selectStatement = baseQuery + `
    SELECT DISTINCT
      mepcm.payer_code,
      mepcm.payer_name,
      mepcm.base_limit,
      mepcm.sap_base_limit,
      at.comments as remarks,
      at.updated_on,
      at.updated_by,
      t.status,
      t.baselimit,
      CASE 
        WHEN t.expiry_type = 'NA' THEN t.expirydate 
        ELSE NULL 
      END as expirydate,
      CASE 
        WHEN t.expiry_type = 'NA' THEN t.amount_requested 
        ELSE NULL 
      END as amount_requested,
      sh.first_name || ' ' || sh.last_name AS full_name,
      CASE 
        WHEN t.expiry_type = 'NA' THEN 
          ROUND((CAST(NULLIF(t.amount_requested, '') AS numeric) / CAST(NULLIF(t.baselimit, '') AS numeric)) * 100, 2)
        ELSE NULL 
      END AS percentage_base_limit,
      CASE 
        WHEN t.expiry_type = 'NA' THEN 
          (CAST(NULLIF(mepcm.base_limit, '') AS numeric) + CAST(NULLIF(t.amount_requested, '') AS numeric))
        ELSE NULL 
      END AS total_base_limit
    FROM public.mt_ecom_payer_code_mapping mepcm
    LEFT JOIN (
        SELECT at1.*
        FROM credit.audit_trail at1
        INNER JOIN (
            SELECT request_id, MAX(id) as max_id
            FROM credit.audit_trail
            GROUP BY request_id
        ) at2 ON at1.request_id = at2.request_id AND at1.id = at2.max_id
    ) at ON mepcm.payer_code = at.request_id
    LEFT JOIN sales_hierarchy_details sh ON split_part(at.updated_by, '#', 1) = sh.user_id AND sh.deleted = false
    LEFT JOIN (
        SELECT t1.*
        FROM credit.transactions t1
        INNER JOIN (
            SELECT payercode, MAX(id) as max_id
            FROM credit.transactions
            WHERE status = 'APPROVED' 
            GROUP BY payercode
        ) t2 ON t1.payercode = t2.payercode AND t1.id = t2.max_id
        WHERE t1.status = 'APPROVED'   
    ) t ON mepcm.payer_code = t.payercode
    ${whereClause}
    `;

            let paramIndex = queryParams.length + 1;

            if (!downloadAll) {
                if (data.search) {
                    const searchClause = `
            ${whereClause ? 'AND' : 'WHERE'} (mepcm.payer_code ILIKE $${paramIndex} OR mepcm.payer_name ILIKE $${paramIndex})  AND mepcm.is_deleted IS FALSE
          `;
                    countStatement = countStatement.replace(') AS subquery', `${searchClause}) AS subquery`);
                    selectStatement += searchClause;
                    queryParams.push(`%${data.search}%`);
                    paramIndex++;
                }
            }
            const countResult = await client.query(countStatement, queryParams);
            const totalCount = parseInt(countResult.rows[0].count, 10);

            if (!downloadAll && data.limit != null && data.offset != null) {
                const paramIndex = queryParams.length + 1;
                selectStatement += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                queryParams.push(data.limit, data.offset);
            }

            const result = await client.query(selectStatement, queryParams);

            if (result?.rowCount) {
                return {
                    totalCount: totalCount,
                    rowCount: result.rows.length,
                    rows: result.rows,
                };
            }

            return { totalCount: 0, rowCount: 0, rows: [] };
        } catch (error) {
            logger.error('Error in UtilModel -> getAccountList: ', error);
        } finally {
            client?.release();
        }
    },

    async getAllPayerCodes() {
        logger.info('inside UtilModel -> getAllPayerCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `WITH mt_customer_groups AS (
                SELECT TRIM(UNNEST(string_to_array(value, ','))) as customer_group
                FROM public.app_level_settings
                WHERE key = 'MT_CREDIT_CG'
            )
            SELECT DISTINCT 
                mepcm.payer_code,
                mepcm.base_limit,
                mepcm.sap_base_limit,
                mepcm.payer_name
            FROM public.mt_ecom_payer_code_mapping mepcm 
            INNER JOIN mt_customer_groups mcg 
                ON mcg.customer_group = mepcm.customer_group
            ORDER BY 
                mepcm.payer_code ASC`;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getAllPayerCodes: ', error);
        } finally {
            client?.release();
        }
    },

    async runBaseLimitJob(payerCode: string, creditLimit: string, riskClass: string) {
        logger.info('inside UtilModel -> runBaseLimitJob');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE mt_ecom_payer_code_mapping SET base_limit = $1, risk_class =$2, sap_base_limit= $1 WHERE payer_code = $3`;
            const result = await client.query(sqlStatement, [creditLimit, riskClass, payerCode]);
            logger.info(`Base limit updated successfully for ${payerCode} with creditlimit as ${creditLimit}, risk class as ${riskClass}`);
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> runBaseLimitJob: ', error);
        } finally {
            client?.release();
        }
    },

    async insertBaseLimitToAuditTrail(queryParams: { payerCode: string; creditLimit: string; remarks: string; userId: string; roles: string; sapResponse: { status: string } }) {
        logger.info('inside UtilModel -> insertBaseLimitToAuditTrail');
        let client: PoolClient | null = null;
        const { payerCode, creditLimit, remarks, userId, roles, sapResponse } = queryParams;
        try {
            client = await conn.getWriteClient();
            const auditTrailStatement = `insert into credit.audit_trail(updated_by, request_id, comments,type, childid,sap_response)values($1||'#'||$2, $3, $4, $5,$6,$7)
      RETURNING *;
    `;
            const result = await client.query(auditTrailStatement, [userId, roles, payerCode, remarks, 'MASTER_UPLOAD', creditLimit, sapResponse]);
            logger.info('Base limit inserted to audit trail successfully');
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> insertBaseLimitToAuditTrail: ', error);
        } finally {
            client?.release();
        }
    },
    async getPayerCodeGroup(payerCode: string) {
        logger.info('inside UtilModel -> getPayerCodeGroup');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = ` select customer_group from public.mt_ecom_payer_code_mapping where payer_code = $1`;
            const result = await client.query(sqlStatement, [payerCode]);
            logger.info(`Customer code for ${payerCode} successfully fetched`);
            return result?.rows[0].customer_group;
        } catch (error) {
            logger.error('Error in UtilModel -> getPayerCodeGroup ', error);
        } finally {
            client?.release();
        }
    },
    async getAllTransactions() {
        logger.info('inside UtilModel -> getAllTransactions');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *
        FROM credit.transactions t
            WHERE t.status = 'APPROVED'
        AND expiry_type='NA'
            AND t.expirydate < CURRENT_TIMESTAMP
           AT TIME ZONE 'UTC'
            ORDER BY t.expirydate DESC`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error(`Error in UtilModel -> :getAllTransactions `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async updateTransactionTable(transaction_id: string, childid: string, expiry_type: string) {
        logger.info('inside UtilModel -> updateTransactionTable');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE credit.transactions SET expiry_type=$3 where transaction_id = $1 and childid = $2`;
            const result = await client.query(sqlStatement, [transaction_id, childid, expiry_type]);
            return result?.rows;
        } catch (error) {
            logger.error(`Error in UtilModal -> :updateTransactionTable `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async insertAccountMaster(filename: string, updated_by: string, uid: string) {
        logger.info('inside UtilModel -> insertAccountMaster');
        let client: PoolClient | null = null;
        const accountMasterStatement = ` 
    insert into credit.cl_account_master(job_complete,filename,updated_by,file_id)values($1,$2,$3,$4)
    `;

        try {
            logger.info('inside UtilModel -> insertAccountMaster');
            client = await conn.getWriteClient();
            const result = await client.query(accountMasterStatement, [false, filename, updated_by, uid]);
            return result.rows[0];
        } catch (error) {
            console.error(`Error in UtilModel.insertAccountMaster: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },
    async updateAccountMaster(filename: string, updated_by: string) {
        logger.info('inside UtilModel -> updateAccountMaster');
        let client: PoolClient | null = null;
        const accountMasterStatement = ` 
    update credit.cl_account_master SET job_complete = $1,updated_by = $2,updated_on = NOW() where filename = $3
    `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(accountMasterStatement, [true, updated_by, filename]);
            return result.rows[0];
        } catch (error) {
            console.error(`Error in UtilModall.updateAccountMaster: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },
    async getAllTransactionsForMasterUpload() {
        logger.info('inside UtilModel -> getAllTransactionsForMasterUpload');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *
        FROM credit.transactions t
            WHERE t.status = 'APPROVED'`;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error(`Error in UtilModel -> :getAllTransactionsForMasterUpload `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async saveSapBaseLimit(creditLimit: string, payerCode: string) {
        logger.info('inside UtilModel -> saveSapBaseLimit');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE mt_ecom_payer_code_mapping SET sap_base_limit= $1 WHERE payer_code = $2`;
            const result = await client.query(sqlStatement, [creditLimit, payerCode]);
            logger.info(`SAP Base limit updated successfully for ${payerCode} with sap_base_limit as ${creditLimit}`);
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> saveSapBaseLimit: ', error);
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getMtClReport(user_id: string, roles: string[]) {
        logger.info('inside UtilModel -> getMtClReport');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const params: any[] = [];
            let whereClause = '1=1';

            if (roles.includes('KAMS') || roles.includes('NKAMS')) {
                whereClause += ` AND SPLIT_PART(t.requested_by, '#', 1) = $1`;
                params.push(user_id);
            }
            const sqlStatement = `WITH split_requestor AS (
                SELECT user_id, first_name, last_name
                FROM sales_hierarchy_details
                WHERE deleted = false
            ),
            split_responders AS (
                SELECT DISTINCT
                    t.transaction_id,
                    CASE 
                        WHEN t.responded_by IS NULL THEN NULL
                        ELSE array_agg(DISTINCT shd.first_name || ' ' || shd.last_name) 
                    END as responder_names,
                    MAX(t.responded_on) as responded_on
                FROM credit.transactions t
                LEFT JOIN LATERAL UNNEST(t.responded_by) as resp_email ON true
                LEFT JOIN sales_hierarchy_details shd 
                    ON split_part(resp_email, '#', 1) = shd.user_id 
                    AND shd.deleted = false
                GROUP BY t.transaction_id, t.responded_by
            )
            SELECT DISTINCT ON (t.childid) 
                t.transaction_id,
                t.childid,
                t.payercode,
                t.payer_name,
                t.expirydate,
                t.amount_requested,
                t.baselimit,
                cm.customer_group,
                t.requested_on,
                COALESCE(sr.first_name || ' ' || sr.last_name, 
                    split_part(t.requested_by, '#', 2)) as requestor_name,
                CASE 
                    WHEN t.responded_by IS NULL THEN NULL
                    ELSE COALESCE(sp.responder_names, ARRAY[]::text[])
                END as responder_names,
                sp.responded_on,
                t.status
            FROM credit.transactions t
            INNER JOIN mt_ecom_payer_code_mapping cm 
                ON cm.payer_code = t.payercode 
            LEFT JOIN split_requestor sr 
                ON split_part(t.requested_by, '#', 1) = sr.user_id
            LEFT JOIN split_responders sp 
                ON t.transaction_id = sp.transaction_id
            WHERE ${whereClause}
            ORDER BY t.childid, t.requested_on DESC`;
            const result = await client.query(sqlStatement, params);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getMtClReport: ', error);
        } finally {
            client?.release();
        }
    },
    async addGTApprovers(queryParams, user_id) {
        logger.info('inside UtilModel -> addGTApprovers');
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');

            if (Array.isArray(queryParams) && queryParams.length > 0) {
                const results = await Promise.all(
                    queryParams.map(async (param) => {
                        const updateStatement = `
                        UPDATE credit.cl_gt_approver_config 
                        SET primary_approver = $1, 
                            secondary_approver = $2,
                            updated_on = CURRENT_TIMESTAMP,
                            updated_by = $4
                        WHERE cluster_code = $3
                        RETURNING *;`;

                        const result = await client.query(updateStatement, [param.primaryapprover, param.secondaryapprover, param.clustercode, user_id]);
                        return result.rows[0];
                    }),
                );
                await client.query('COMMIT');
                logger.info('inside UtilModel -> addGTApprovers -> Updated records');
                return {
                    success: true,
                    updatedData: results,
                };
            } else if (queryParams && typeof queryParams === 'object') {
                // Handle insert
                const insertStatement = `
                    INSERT INTO credit.cl_gt_approver_config 
                    (cluster_code, primary_approver, secondary_approver, cluster_detail, updated_by, updated_on) 
                    VALUES ($1, $2, $3, $4::jsonb, $5, CURRENT_TIMESTAMP) 
                    RETURNING *;`;

                const insertedData = await client.query(insertStatement, [
                    queryParams.cluster,
                    queryParams.gt_primary,
                    queryParams.gt_secondary,
                    queryParams.cluster_detail,
                    user_id,
                ]);
                await client.query('COMMIT');
                logger.info('inside UtilModel -> addGTApprovers-> Inserted Records');
                return {
                    success: true,
                    insertedData: insertedData.rows[0],
                };
            }
        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            logger.error('Error in UtilModel -> addGTApprovers: ', error);
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    },
    async getCluster() {
        logger.info('inside UtilModel -> getCluster');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT distinct(gm.cluster_code) 
                    FROM public.group5_master gm
                    LEFT JOIN credit.cl_gt_approver_config cgac 
                        ON gm.cluster_code  = cgac.cluster_code 
                    WHERE cgac.id IS NULL and gm.cluster_code is not null`;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getCluster: ', error);
        } finally {
            client?.release();
        }
    },
    async getGTApproverDetails() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getGTApproverDetails');
            client = await conn.getReadClient();
            const sqlStatement = `select * from credit.cl_gt_approver_config cgac`;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error(`Error in UserModel -> getGTApproverDetails: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getRespondedByFromGTTransaction(transaction_id: string, child_id: string) {
        logger.info('inside UtilModel -> getRespondedByFromGTTransaction');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select * from credit.gt_transactions t  where transaction_id = $1 and child_id= $2`;
            const result = await client.query(sqlStatement, [transaction_id, child_id]);
            return result?.rows[0];
        } catch (error) {
            logger.error(`Error in UtilModal -> getRespondedByFromGTTransaction `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async updateGTRequestApprover(
        updateData: {
            transaction_id: string;
            status: string;
            approver1: string;
            approver2: string;
            login_id: string;
            child_id: string;
            amount: number;
            distributor_code: string;
            start_date: Date;
            end_date: Date;
            approvers_remarks: string;
            base_limit: string;
        },
        approver_type: string,
    ) {
        logger.info('inside UtilModel -> updateGTRequestApprover');
        const { transaction_id, status, approver1, approver2, login_id, child_id, amount, distributor_code, start_date, end_date, approvers_remarks,base_limit } = updateData;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let approvers = '';
            let remarksKey = '';
            let approver = '';
            if (approver_type === 'APPROVER1') {
                approver = approver1;
                remarksKey = '{approver1_remarks}';
            } else if (approver_type === 'APPROVER2') {
                approver = approver2;
                remarksKey = '{approver2_remarks}';
            }
            if (status === 'APPROVED') {
                let sqlStatement = `
                UPDATE credit.gt_transactions 
                SET 
                    responded_by = CASE
                       WHEN array_length(responded_by, 1) IS NULL THEN ARRAY[$1]
                       ELSE array_append(responded_by, $1)
                    END,
                    responded_on = CASE
                    WHEN array_length(responded_on, 1) IS NULL THEN ARRAY[now()::timestamp]
                    ELSE array_append(responded_on, now()::timestamp)
                END,
                approvers_remarks = jsonb_set(
                    COALESCE(approvers_remarks, '{}'::jsonb),
                    $4,
                    $5::jsonb
                )
             
            `;
                if (approver_type === 'APPROVER2') {
                    sqlStatement += `, status = 'APPROVED' `;
                }
                sqlStatement += `
            WHERE 
                transaction_id = $2 and
                child_id = $3
            RETURNING requested_by
        `;
                const values = [approver, transaction_id, child_id, remarksKey, JSON.stringify(approvers_remarks)];
                const result = await client.query(sqlStatement, values);
                logger.info(`inside UtilModel -> updateGTRequestApprover, Updated GT Transaction Table, ${status}`);
                // //chilid data should change
                const audit_trail = `
                INSERT INTO credit.audit_trail(updated_by, request_id,status, type,childid)
                VALUES ($1, $2, $3, $4, $5)
            `;
                const audit_trail_values = [login_id, transaction_id, status, approver_type, child_id];
                await client.query(audit_trail, audit_trail_values);

                logger.info(`inside UtilModel -> updateGTRequestApprover, Updated Audit Trail Table, ${status}`);

                const auditHistoryStatement = `
    insert into credit.audit_history(user_id,request_id,approver_details,customer_code,base_limit,childid,gt_start_date,gt_end_date,amount_requested) values ($1,$2,$3,$4,$5,$6,$7, $8,$9);
    `;
                await client.query(auditHistoryStatement, [login_id, transaction_id, [approver1, approver2], distributor_code, base_limit, child_id, start_date, end_date,amount]);

                logger.info(`inside UtilModel -> updateGTRequestApprover, Updated Audit history Table, ${status}`);
                return {
                    transaction: result.rows[0],
                };
            } else if (status === 'REJECTED') {
                const sqlStatement = `
                UPDATE credit.gt_transactions 
                SET 
                     responded_by = CASE
                       WHEN array_length(responded_by, 1) IS NULL THEN ARRAY[$1]
                       ELSE array_append(responded_by, $1)
                    END,
                        responded_on = CASE
                    WHEN array_length(responded_on, 1) IS NULL THEN ARRAY[now()::timestamp]
                    ELSE array_append(responded_on, now()::timestamp)
                END,
                status=$4,
                 approvers_remarks = jsonb_set(
                    COALESCE(approvers_remarks, '{}'::jsonb),
                    $5,
                    $6::jsonb
                )
                WHERE
                transaction_id = $2 and
                child_id = $3
                RETURNING requested_by
            `;

                const values = [approver, transaction_id, child_id, status, remarksKey, JSON.stringify(approvers_remarks)];
                const result = await client.query(sqlStatement, values);
                logger.info(`inside UtilModel -> updateGTRequestApprover, GT Transaction Table, ${status}`);
                const audit_trail = `
                INSERT INTO credit.audit_trail(updated_by, request_id,status, type,childid)
                VALUES ($1, $2, $3, $4, $5)
            `;
                const audit_trail_values = [login_id, transaction_id, status, approver_type, child_id];
                await client.query(audit_trail, audit_trail_values);

                logger.info(`inside UtilModel -> updateGTRequestApprover, Updated Audit Trail Table, ${status}`);
                return {
                    transaction: result.rows[0],
                };
            } else {
                return null;
            }
        } catch (error) {
            logger.error(`Error in UtilModel -> updateGTRequestApprover: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getGtApprovers(queryParams: { cluster: string }) {
        logger.info('inside UtilModel -> getGtApprovers');
        let client: PoolClient | null = null;
        const { cluster } = queryParams;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `WITH filtered_sales_hierarchy AS (
    SELECT email, first_name, last_name
    FROM public.sales_hierarchy_details
    WHERE deleted = false AND status = 'ACTIVE'
)
SELECT 
    cgac.primary_approver,
    cgac.secondary_approver,
    sh1.first_name || ' ' || sh1.last_name AS primary_full_name,
    sh2.first_name || ' ' || sh2.last_name AS secondary_full_name
FROM 
    credit.cl_gt_approver_config cgac
INNER JOIN 
    filtered_sales_hierarchy sh1 ON cgac.primary_approver = sh1.email
INNER JOIN 
    filtered_sales_hierarchy sh2 ON cgac.secondary_approver = sh2.email
WHERE 
    cgac.cluster_code = $1;
    `;
            const result = await client.query(sqlStatement, [cluster]);
            return result?.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getGtApprovers: ', error);
        } finally {
            client?.release();
        }
    },
    async getGtRequestorDetails(user_id: string) {
        logger.info('inside UtilModel -> getGtRequestorDetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `WITH user_details AS (
                SELECT 
                    shd.user_id,
                    shd.first_name || ' ' || shd.last_name as full_name,
                    shd.email
                FROM sales_hierarchy_details shd
                WHERE shd.deleted = false AND shd.status = 'ACTIVE'
            ),
            expanded_clusters AS (
                SELECT 
                    cgrm.id,
                    unnest(cgrm.cluster_code) as cluster_code,
                    cgrm.user_id,
                    cgrm.customer_group,
                    cgrm.updated_by,
                    cgrm.updated_on,
                    ud.full_name,
                    ud.email
                FROM credit.cl_gt_requestor_mapping cgrm
                JOIN user_details ud ON cgrm.user_id = ud.user_id
            )
            SELECT 
                id,
                ARRAY[cluster_code] as cluster_code,
                user_id,
                customer_group,
                full_name,
                email,
                updated_by,
                updated_on
            FROM expanded_clusters
            ORDER BY id ASC; `;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getGtRequestorDetails: ', error);
        } finally {
            client?.release();
        }
    },
    async fetchGtAddRequestor(user_id: string) {
        logger.info('inside UtilModel -> fetchGtAddRequestor');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const roles = ['HOF', 'RCM'];
            const emailsQuery = {
                text: `SELECT email 
                      FROM sales_hierarchy_details sh 
                      WHERE roles && $1::_roles_type 
                      AND sh.status = 'ACTIVE' 
                      AND sh.deleted = false`,
                values: [roles],
            };
            const clusterQuery = `SELECT  distinct(gm.cluster_code) 
                    FROM public.group5_master gm
                   WHERE gm.cluster_code is not null
                   `;

            const [emailsResult, clusterResult] = await Promise.all([client.query(emailsQuery), client.query(clusterQuery)]);

            return {
                emails: emailsResult.rows,
                clusters: clusterResult.rows,
            };
        } catch (error) {
            logger.error('Error in UtilModel -> fetchGtAddRequestor: ', error);
        } finally {
            client?.release();
        }
    },

    async addGtRequestor(queryParams: { cluster: string; email: string; user_id: string }) {
        logger.info('inside UtilModel -> addGtRequestor');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const { cluster, email, user_id } = queryParams;
            const searchEmail = `select user_id from sales_hierarchy_details where email = $1 and deleted = false and status = 'ACTIVE' `;
            const searchEmailResult = await client.query(searchEmail, [email]);
            if (searchEmailResult.rowCount === 0) {
                return { message: 'Email not found in sales_hierarchy_details' };
            }
            const emailId = searchEmailResult.rows[0].user_id;
            // Check if user already exists in requestor mapping
            const checkExisting = `SELECT id, cluster_code FROM credit.cl_gt_requestor_mapping WHERE user_id = $1`;
            const existingResult = await client.query(checkExisting, [emailId]);

            if (existingResult.rowCount && existingResult.rowCount > 0) {
                // Update existing record
                const updateStatement = `
                  UPDATE credit.cl_gt_requestor_mapping 
                  SET cluster_code = array_cat(cluster_code, $1::varchar[]),
                  updated_by = $2,
                      updated_on = NOW()
                  WHERE user_id = $3 
                  RETURNING *`;
                const result = await client.query(updateStatement, [[cluster], user_id, emailId]);
                return result.rows[0];
            } else {
                const sqlStatement = `INSERT INTO credit.cl_gt_requestor_mapping (cluster_code, user_id, updated_by) 
        VALUES ($1::varchar[], $2, $3) RETURNING *`;
                const result = await client.query(sqlStatement, [[cluster], emailId, user_id]);
                return result.rows[0];
            }
        } catch (error) {
            logger.error('Error in UtilModel -> addGtRequestor: ', error);
        } finally {
            client?.release();
        }
    },

    async getRequestorClusters(user_id: string) {
        logger.info('inside UtilModel -> getRegions');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select cgrm.cluster_code from credit.cl_gt_requestor_mapping cgrm  where user_id =$1`;
            const result = await client.query(sqlStatement, [user_id]);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getRegions: ', error);
        } finally {
            client?.release();
        }
    },

    async getGTExcelData(clusterCode: string, action_type: string) {
        logger.info('inside UtilModel -> getGTExcelData');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            //  This CTE gets customer groups from app_level_settings and splits them into rows
            let sqlStatement = `WITH gt_customer_groups AS (
                SELECT UNNEST(string_to_array(value, ',')) as customer_group
                FROM public.app_level_settings
                WHERE key = 'GT_CREDIT_CG'
            )
            SELECT DISTINCT
                gm.name AS group5_name,
                dls.party_code,
                dls.party_name,
                gm.cluster_code,
                dm.nach_type,
                dls.base_limit
            FROM
                public.group5_master gm
            INNER JOIN
                public.distributor_master dm ON gm.id = dm.group5_id
            INNER JOIN
                public.user_profile up ON dm.profile_id = up.id
            INNER JOIN
                public.customer_group_master cgm ON dm.group_id = cgm.id
            INNER JOIN
                gt_customer_groups gcg ON TRIM(gcg.customer_group) = cgm.name
            join
            credit.distributor_base_limit_sync dls on dls.party_code  = dm.profile_id
            WHERE
                gm.cluster_code = $1
                AND dm.deleted = false
                AND dm.status = 'ACTIVE'
                `;
            if (action_type === GT_ACTION_TYPE.BASE_LIMIT_UPLOAD || action_type === GT_ACTION_TYPE.BASE_LIMIT_REMOVAL) {
                sqlStatement += `and dm.nach_type = 'TRUE'`;
            } else if (action_type === GT_ACTION_TYPE.ADDITIONAL_LIMIT_REMOVAL || action_type === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD) {
                sqlStatement += `and dm.nach_type = 'FALSE'`;
            }
            sqlStatement += `ORDER BY 
                gm.name;`;

            const result = await client.query(sqlStatement, [clusterCode]);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> : getGTExcelData', error);
        } finally {
            client?.release();
        }
    },
    async getCustomerGroupForSettings(user_id: string) {
        logger.info('inside UtilModel -> getCustomerGroupForSettings');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select distinct(name) from distributor_master dm 
                join customer_group_master cgm on
                cgm.id =dm.group_id
                where dm.deleted = false
                `;
            const result = await client.query(sqlStatement);
            return result.rows.map((row) => row.name);
        } catch (error) {
            logger.error('Error in UtilModel -> getCustomerGroupForSettings: ', error);
        } finally {
            client?.release();
        }
    },
    async fetchAllDistributorCodes() {
        logger.info('inside UtilModel -> fetchAllDistributorCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `WITH gt_customer_groups AS (
                SELECT UNNEST(string_to_array(value, ',')) as customer_group
                FROM public.app_level_settings 
                WHERE key = 'GT_CREDIT_CG'
            )
            SELECT DISTINCT
                dbl.party_code,
                dbl.base_limit,
                dbl.party_name
            FROM 
                credit.distributor_base_limit_sync dbl
            LEFT JOIN 
                public.distributor_master dm ON dbl.party_code = dm.profile_id
            LEFT JOIN 
                public.customer_group_master cgm ON dm.group_id = cgm.id
            INNER JOIN
                gt_customer_groups gcg ON TRIM(gcg.customer_group) = cgm.name
            WHERE 
                dm.deleted = false 
                AND dm.status = 'ACTIVE'
            ORDER BY 
                dbl.party_code`;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> fetchAllDistributorCodes: ', error);
        } finally {
            client?.release();
        }
    },
    async runGtBaseLimitJob(creditLimit: string, db_code: string) {
        logger.info('inside UtilModel -> runGtBaseLimitJob');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE credit.distributor_base_limit_sync SET base_limit = $1 WHERE party_code = $2`;
            const result = await client.query(sqlStatement, [creditLimit, db_code]);
            logger.info(`GT Base limit updated successfully for ${db_code} with creditlimit as ${creditLimit}`);
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> runGtBaseLimitJob: ', error);
        } finally {
            client?.release();
        }
    },
    async getGtStartDate(start_date: string) {
        logger.info('inside UtilModel -> getGtStartDate-> fetching Records with start date');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `WITH ValidRecords AS (
            SELECT 
                gt.distributor_code,
                gt.child_id,
                gt.amount,
                gt.transaction_id,
                gt.base_limit,
                gt.requested_on,
                DATE(gt.start_date) as start_date,
                gt.requested_on as latest_request,                  -- Using requested_on directly
                ROW_NUMBER() OVER (
                    PARTITION BY gt.distributor_code 
                    ORDER BY gt.requested_on DESC NULLS LAST        -- Sort by requested_on
                ) as rn
            FROM 
                credit.gt_transactions gt
            LEFT JOIN 
                credit.audit_trail at2 
                ON at2.childid = gt.child_id 
                AND at2.status = 'GT_ONGOING'
            WHERE 
                gt.status = 'APPROVED'
                AND at2.childid IS NULL
                AND DATE(gt.start_date) = $1::DATE
        )
        SELECT 
            distributor_code,
            child_id,
            amount,
            transaction_id,
            base_limit,
            requested_on,
            start_date,
            latest_request
        FROM ValidRecords
        WHERE rn = 1
        ORDER BY latest_request DESC NULLS LAST;
                        `;
            const result = await client.query(sqlStatement, [start_date]);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getGtStartDate: ', error);
        } finally {
            client?.release();
        }
    },
    async updateGtDistributorRecord(distributor_code: String, creditLimit: String) {
        logger.info('inside UtilModel -> runBaseLimitJob');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE credit.distributor_base_limit_sync SET base_limit = $1, updated_on = NOW() WHERE party_code = $2`;
            const result = await client.query(sqlStatement, [creditLimit, distributor_code]);
            logger.info(`Base limit updated successfully for ${distributor_code} with credit limit as ${creditLimit}`);
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> runBaseLimitJob: ', error);
        } finally {
            client?.release();
        }
    },
    async insertGTStartEventAudit(queryParams: GTStartAuditParams) {
        logger.info('inside UtilModel -> insertGTAuditTrail');
        let client: PoolClient | null = null;
        const { transaction_id, child_id, payerCode, creditLimit, amount, sapResponse, userId = 'SYSTEM' } = queryParams;
        try {
            client = await conn.getWriteClient();
            const auditMessage = `DB Code: ${payerCode} Credit limit updated from ${creditLimit} to ${amount} for GT Transaction(Start)`;
            const auditTrailStatement = `insert into credit.audit_trail(updated_by, request_id, type, childid, comments, sap_response, status)values($1,$2, $3, $4, $5, $6, $7)
                RETURNING *; `;
            const result = await client.query(auditTrailStatement, [userId, transaction_id, 'GT_START_CRON', child_id, auditMessage, sapResponse, 'GT_ONGOING']);
            logger.info('GT Base limit inserted to audit trail successfully');
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> insertGTAuditTrail: ', error);
        } finally {
            client?.release();
        }
    },
    async getGtEndDate(end_date: string) {
        logger.info('inside UtilModel -> getGtEndDate-> fetching Records with start date');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `with audit_latest as (
                select 
                    at2.childid
                from 
                    credit.audit_trail at2 
                where 
                    at2.status = 'GT_ONGOING' and 
                    at2.updated_on = (select max(at3.updated_on) from credit.audit_trail at3 where at3.childid = at2.childid)
                group by at2.childid 
            )
            SELECT DISTINCT ON (gt.child_id)
                gt.distributor_code,
                gt.child_id,
                gt.amount,
                gt.transaction_id,
                gt.base_limit,
                DATE(gt.end_date) as end_date
            FROM 
                credit.gt_transactions gt
            INNER JOIN 
                audit_latest al
                ON al.childid = gt.child_id 
            WHERE 
                DATE(gt.end_date) = COALESCE($1::DATE, (CURRENT_DATE - INTERVAL '1 day')::DATE)
            ORDER BY 
                gt.child_id, 
                gt.end_date desc`;
            const result = await client.query(sqlStatement, [end_date]);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getGtStartDate: ', error);
        } finally {
            client?.release();
        }
    },
    async insertGTEndEventAudit(queryParams: {
        transaction_id: string;
        child_id: string;
        payerCode: string;
        creditLimit: string;
        amount: string;
        sapResponse: { status: string; data: any };
    }) {
        logger.info('inside UtilModel -> insertGTEndEventAudit');
        let client: PoolClient | null = null;
        const { transaction_id, child_id, payerCode, creditLimit, amount, sapResponse } = queryParams;
        try {
            client = await conn.getWriteClient();
            const auditMessage = `DB Code: ${payerCode} Credit limit reversed from ${creditLimit} to ${amount} for GT Transaction(End)`;
            const auditTrailStatement = `Insert into credit.audit_trail(updated_by, request_id, type, childid, comments, sap_response, status)values($1,$2, $3, $4, $5, $6, $7)
                RETURNING *; `;
            const result = await client.query(auditTrailStatement, ['SYSTEM', transaction_id, 'GT_END_CRON', child_id, auditMessage, sapResponse, 'GT_COMPLETED']);
            logger.info('GT Base limit inserted to audit trail successfully');
            return result;
        } catch (error) {
            logger.error('Error in UtilModel -> insertGTEndEventAudit: ', error);
        } finally {
            client?.release();
        }
    },
    async getGtClReport(user_id: string, roles: string[]) {
        logger.info('inside UtilModel -> getGtClReport');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const params: any[] = [];
            let whereClause = '1=1';

            if (roles.includes('HOF') || roles.includes('RCM')) {
                whereClause += ` AND SPLIT_PART(t.requested_by, '#', 1) = $1`;
                params.push(user_id);
            }
            const sqlStatement = `WITH split_requestor AS (
                SELECT user_id, first_name, last_name
                FROM sales_hierarchy_details
                WHERE deleted = false
            ),
            split_responders AS (
                SELECT DISTINCT
                    t.transaction_id,
                    t.child_id,
                    CASE 
                        WHEN t.responded_by IS NULL THEN NULL
                        ELSE array_agg(DISTINCT shd.first_name || ' ' || shd.last_name) 
                    END as responder_names,
                    MAX(t.responded_on) as responded_on
                    FROM credit.gt_transactions t
                LEFT JOIN LATERAL UNNEST(t.responded_by) as resp_email ON true
                LEFT JOIN sales_hierarchy_details shd 
                    ON split_part(resp_email::text, '#', 1) = shd.user_id 
                    AND shd.deleted = false
                GROUP BY t.transaction_id, t.child_id, t.responded_by
            )
            SELECT DISTINCT ON (t.child_id)
                t.distributor_code,
                t.distributor_name,
                t.region,
                t.file_action_type,
                t.transaction_id,
                t.child_id,
                t.amount,
                t.base_limit,
                t.start_date::text,
                t.end_date::text,
                t.requested_on as date_of_upload,
                COALESCE(sr.first_name || ' ' || sr.last_name, 
                    split_part(t.requested_by, '#', 2)) as requestor_name,
                CASE 
                    WHEN t.responded_by IS NULL THEN NULL
                    ELSE sp.responder_names
                END as approved_by,
                sp.responded_on as approved_on,
                t.status
            FROM credit.gt_transactions t
            INNER JOIN credit.distributor_base_limit_sync cm 
                ON cm.party_code = t.distributor_code  
            LEFT JOIN split_requestor sr 
                ON split_part(t.requested_by, '#', 1) = sr.user_id
            LEFT JOIN split_responders sp 
                ON t.transaction_id = sp.transaction_id 
                AND t.child_id = sp.child_id  -- Added child_id join condition
             WHERE ${whereClause}
            ORDER BY t.child_id, t.requested_on DESC;`;
            const result = await client.query(sqlStatement, params);
            return result.rows;
        } catch (error) {
            logger.error('Error in UtilModel -> getGtClReport: ', error);
        } finally {
            client?.release();
        }
    },
};
