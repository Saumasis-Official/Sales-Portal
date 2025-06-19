import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import S3Helper from '../helper/ConnectToS3Bucket';
import { roles } from '../constants/persona';
import { SuccessMessage } from '../constants/successMessage';

interface SingleQueryParams {
    risk_credit: string;
    amount_percentage: string;
    base_limit: string;
    customer_group: number;
    type: string;
}

interface ApproverConfig {
    category: string;
    approver_2: {
        email: string;
        header: string;
    };
    approver_3: {
        header: string;
        sub_category: Array<{
            header: string;
            email: string;
        }>;
    };
}
interface UpdatedRecord {
    category: string;
    finance_emails: string;
    sales_emails: string;
}

interface ApproverUpdateResponse {
    status: string;
    result: {
        // updatedRecords: UpdatedRecord[];
        updatedCategoryCount: number;
        updated_by: string;
    };
}

export const UserModel = {
    async fetchCreditExtentionRequests(queryParams: {
        type: string;
        status: string | null;
        customer_group: string[] | null;
        search: string | null;
        limit: number | null;
        offset: number | null;
        user_id: string;
        rolesArr: string[];
        from_date: string | null;
        to_date: string | null;
        responded: string | null;
    }) {
        logger.info('inside UserModel -> fetchCreditExtentionRequests, queryParams: ' + JSON.stringify(queryParams));

        let client: PoolClient | null = null;
        try {
            const { type, status, search, limit, offset, customer_group, user_id, rolesArr } = queryParams;

            if (!type) {
                logger.info('inside UserModel -> fetchCreditExtentionRequests, type is null');
                throw new Error('Type cannot be null or empty.');
            }

            let whereClause = '1=1';
            const queryParamsArray: string[] = []; // Array for parameters
            let paramIndex = 1; // Index for parameters

            if (type !== 'ALL') {
                whereClause += ` AND tr.type = $${paramIndex}`;
                queryParamsArray.push(type);
                paramIndex++;
            }

            if (status && status !== 'ALL') {
                whereClause += ` AND tr.status = $${paramIndex}`;
                queryParamsArray.push(status);
                paramIndex++;
            }

            if (search) {
                //OR tr."childid" ILIKE $${paramIndex}         (To be used for exclusive)
                whereClause += ` AND (tr.transaction_id ILIKE $${paramIndex}
                          OR (cm.payer_name ILIKE $${paramIndex} 
                          OR tr.payercode ILIKE $${paramIndex}) 
                          OR (COALESCE(sh.first_name, '') || ' ' || COALESCE(sh.last_name, '')) ILIKE $${paramIndex} )`;
                queryParamsArray.push(`%${search}%`);
                paramIndex++;
            }

            if (customer_group && customer_group.length > 0) {
                const groupPlaceholders = customer_group.map((_, index) => `$${paramIndex + index}`).join(',');
                whereClause += ` AND cm.customer_group IN (${groupPlaceholders})`;
                queryParamsArray.push(...customer_group);
                paramIndex += customer_group.length;
            }

            let dateFilter = '';
            if (queryParams.from_date && queryParams.to_date) {
                const adjustedToDateString = queryParams.to_date + ' 23:59:59';
                if (queryParams.responded === 'True') {
                    dateFilter = ` AND (
             $${paramIndex} <= (SELECT MAX(responded_date) FROM unnest(tr.responded_on) AS responded_date) 
             AND $${paramIndex + 1} >=  (SELECT MAX(responded_date) FROM unnest(tr.responded_on) AS responded_date)
          )`;
                } else {
                    dateFilter = ` AND tr.expirydate BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                }
                queryParamsArray.push(queryParams.from_date);
                queryParamsArray.push(adjustedToDateString);
                paramIndex += 2;
            }
            whereClause += dateFilter;

            // if (queryParams.responded === "True") {
            //     whereClause += ` AND tr.responded_by IS NOT NULL`;
            // }

            if (rolesArr.includes(roles.KAMS) || rolesArr.includes(roles.NKAMS)) {
                whereClause += ` AND SPLIT_PART(tr.requested_by, '#', 1) = $${paramIndex}`;
                queryParamsArray.push(user_id);
                paramIndex++;
            }

            const sqlStatement = `
                SELECT 
                tr.transaction_id,
                tr.childid,
                tr.status,
                tr.expirydate,
                tr.baselimit,
                tr.amount_requested,
                tr.customercode,
                tr.payercode,
                (COALESCE(sh.first_name, '') || ' ' || COALESCE(sh.last_name, '')) as requested_by,
                tr.requested_on,
                tr.responded_on,
                res_by.responded_by,
                tr.reason,
                tr.type,
                tr.payer_name,
                cm.customer_group
            FROM 
                credit.transactions tr
            INNER JOIN 
                mt_ecom_payer_code_mapping cm ON cm.payer_code = tr.payercode 
            LEFT JOIN 
                user_profile up ON (tr.requested_by = up.id)
            LEFT JOIN 
                sales_hierarchy_details sh ON (COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' AND sh.user_id = SPLIT_PART(tr.requested_by, '#', 1))
            LEFT JOIN 
                LATERAL (
                    SELECT 
                        ARRAY_AGG(COALESCE(sh2.first_name, '') || ' ' || COALESCE(sh2.last_name, '') ORDER BY idx) AS responded_by
                    FROM (
                        SELECT 
                            res_by.user_id,
                            ROW_NUMBER() OVER () AS idx
                        FROM 
                            unnest(tr.responded_by) AS res_by(user_id)
                    ) res_by
                    LEFT JOIN 
                        sales_hierarchy_details sh2 ON sh2.user_id = SPLIT_PART(res_by.user_id, '#', 1)
                ) res_by ON true
            WHERE ${whereClause}
            GROUP BY 
                tr.transaction_id, tr.childid, tr.status, tr.expirydate, tr.baselimit, tr.amount_requested, tr.customercode,
                tr.payercode, tr.requested_by, tr.requested_on, tr.responded_on, 
                res_by.responded_by, tr.reason, tr.type,
                up.name, sh.first_name, sh.last_name, 
                cm.customer_group,tr.payer_name, tr.id 
            ORDER BY tr.id DESC; `;

            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, queryParamsArray);
            const customerGroups = `SELECT 
                me.customer_group,
                COUNT(DISTINCT me.payer_code) as payer_count,
                array_agg(DISTINCT me.payer_code) as payer_codes
            FROM public.mt_ecom_payer_code_mapping me
            INNER JOIN credit.transactions tr ON tr.payercode = me.payer_code
            WHERE me.customer_group IS NOT NULL 
            AND me.customer_group != ''
            ${rolesArr.includes(roles.KAMS) || rolesArr.includes(roles.NKAMS) ? `AND SPLIT_PART(tr.requested_by, '#', 1) = $1` : ''}
            GROUP BY me.customer_group
            ORDER BY me.customer_group`;

            const customerGroupParams: string[] = [];
            if (rolesArr.includes(roles.KAMS) || rolesArr.includes(roles.NKAMS)) {
                customerGroupParams.push(user_id);
            }
            const customerGroupsResult = await client.query(customerGroups, customerGroupParams);
            const uniqueCustomerGroups = [...new Set(customerGroupsResult.rows.map((row) => row.customer_group))];

            if (result?.rowCount) {
                const selectedRows = limit != null && offset != null ? result.rows.slice(+offset, +offset + +limit) : result.rows;
                return {
                    rows: selectedRows,
                    rowCount: selectedRows.length,
                    totalCount: result.rowCount,
                    customerGroups: uniqueCustomerGroups,
                };
            }
            return { rows: [], rowCount: 0, totalCount: 0, customerGroups: uniqueCustomerGroups };
        } catch (error) {
            logger.error('inside UserModel -> fetchCreditExtentionRequests, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchRequestedDetailsById(transaction_id: string) {
        logger.info('inside UserModel -> fetchRequestedDetailsById, transactionId: ' + transaction_id);

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `WITH unnested_responded_by AS (
                SELECT
                    tr.transaction_id,
                    tr.childid,
                    COALESCE(sh2.first_name, '') || ' ' || COALESCE(sh2.last_name, '') AS responded_by,
                    Lower(COALESCE(sh2.email, '-')) AS responded_by_email,
                    res_by.rn
                FROM credit.transactions tr
                LEFT JOIN LATERAL (
                    SELECT user_id, ROW_NUMBER() OVER () AS rn
                    FROM unnest(tr.responded_by) AS res_by(user_id)
                ) AS res_by ON true
                LEFT JOIN sales_hierarchy_details sh2 ON sh2.user_id = SPLIT_PART(res_by.user_id, '#', 1)
                WHERE sh2.user_id IS NOT NULL
            ),
            responded_by_distinct AS (
                SELECT DISTINCT
                    transaction_id,
                    childid,
                    responded_by,
                    responded_by_email,
                    rn
                FROM unnested_responded_by
            ),
            responded_by_cte AS (
                SELECT
                    transaction_id,
                    childid,
                    ARRAY_AGG(responded_by ORDER BY rn) AS responded_by,
                    ARRAY_AGG(responded_by_email ORDER BY rn) AS responded_by_email
                FROM responded_by_distinct
                GROUP BY transaction_id, childid
            )
            SELECT DISTINCT
                tr.transaction_id,
                tr.baselimit,
                tr.expirydate,
                tr.payercode,
                tr.customercode,
                tr.amount_requested,
                tr.childid,
                tr.status,
                tr.type,
                ARRAY[
                    COALESCE(tr.approver1_remarks, ''),
                    COALESCE(tr.approver2_remarks, ''),
                    COALESCE(tr.approver3_remarks, '')
                ] AS approvers_remarks,
                ah2.approver_details,
                tr.requested_on,
                tr.payer_name,
                mep.customer_group,
                cgm.description as customer_group_description,
                (CASE 
                    WHEN COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' 
                    THEN (COALESCE(sdr.first_name, '') || ' ' || COALESCE(sdr.last_name, '')) 
                    ELSE COALESCE(up.name, '-') 
                END) AS requested_by,
                tr.reason,
                tr.responded_on,
                UPPER(tr.filename) AS filename,
                tr.file_link,
                (SELECT ARRAY_AGG(shd.first_name || ' ' || shd.last_name ORDER BY sub.rn)
                FROM (
                    SELECT
                        split_part(unnested_approver_details, '#', 1) AS user_id,
                        row_number() OVER () AS rn
                    FROM credit.audit_history ah2, unnest(ah2.approver_details) AS unnested_approver_details
                    WHERE ah2.request_id = tr.transaction_id AND
                          ah2.id = (SELECT max(ah3.id) FROM credit.audit_history ah3 WHERE ah3.request_id = tr.transaction_id)
                ) AS sub
                JOIN sales_hierarchy_details shd ON shd.user_id = sub.user_id
                ) AS approver_full_names,
                rbc.responded_by,
                rbc.responded_by_email
            FROM 
                credit.transactions tr
            LEFT JOIN 
                mt_ecom_payer_code_mapping mep ON (mep.payer_code = tr.payercode)
            LEFT JOIN 
                user_profile up ON (tr.requested_by = up.id)
            LEFT JOIN 
                sales_hierarchy_details sdr ON (COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' AND sdr.user_id = SPLIT_PART(tr.requested_by, '#', 1))
            LEFT JOIN 
                credit.audit_history ah2 ON (tr.transaction_id = ah2.request_id)
            LEFT JOIN 
                responded_by_cte rbc ON rbc.transaction_id = tr.transaction_id AND rbc.childid = tr.childid
             INNER JOIN customer_group_master cgm ON cgm.name = mep.customer_group
            WHERE 
                tr.transaction_id = $1 AND 
                ah2.id = (SELECT max(ah3.id) FROM credit.audit_history ah3 WHERE ah3.request_id = tr.transaction_id)
            ORDER BY 
                tr.childid ASC;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [transaction_id]);
            if (result?.rows) {
                const row = result.rows[0];
                const customerGroup = row.customer_group;
                const fileLink = row.file_link;
                if (fileLink !== '') {
                    const s3Response = (await S3Helper.checkIfEmailExists(fileLink, 'upload')) || {};
                    row.file_link = s3Response['downloadUrl'] || '';
                    return { result: result?.rows, customerGroup };
                } else {
                    return { result: result?.rows, customerGroup };
                }
            }
            return null;
        } catch (error) {
            logger.error('inside UserModel -> fetchRequestedDetailsById, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getInvalidateSessionStatus(loginId: string, uuid: string) {
        logger.info('inside UserModel -> getInvalidateSessionStatus');
        let client: PoolClient | null = null;
        const sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [loginId, uuid]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in userModel -> getInvalidateSessionStatus: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDistributorDetails(distributorId: string) {
        logger.info('inside UserModel -> fetchDistributorDetails');
        let client: PoolClient | null = null;
        const sqlStatement = `select *, roles::_varchar from sales_hierarchy_details where user_id=$1 and deleted=false and status='ACTIVE'`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distributorId]);
            return result;
        } catch (error) {
            logger.error('inside UserModel -> fetchDistributorDetails, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getApprovalDetails(approver_email: string) {
        logger.info('inside UserModel -> getApprovalDetails');
        let client: PoolClient | null = null;
        const sqlStatement = `select *, roles::_varchar from sales_hierarchy_details where email ILIKE $1 AND deleted=false AND status='ACTIVE'`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [approver_email]);
            return result;
        } catch (error) {
            logger.error('inside UserModel -> getApprovalDetails, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async insertCreditExtensionRequest(
        requested_by: string,
        roles: string[],
        customer_Code: string,
        base_limit: string,
        expiry_date: string,
        credit_extension: string,
        payer_code: string,
        remarks: string,
        uid: string,
        childUid: string,
        approver1: string,
        approver2: string,
        approver3: string,
        data: {
            file_name: string;
            link: string | null | undefined;
        },
        approverId: string[],
        payer_name: string,
    ) {
        logger.info('inside UserModel -> insertCreditExtensionRequest');
        let client: PoolClient | null = null;
        const transactionStatement = `
        INSERT INTO credit.transactions (
            requested_by, 
            customercode, 
            baselimit, 
            expirydate, 
            amount_requested, 
            payercode, 
            reason, 
            transaction_id,
            childid,
            status,
            type,
            filename,
            file_link,
            payer_name
        ) VALUES (
            $1||'#'||$2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14,$15
        )
      RETURNING *;
     `;

        try {
            client = await conn.getWriteClient();

            const result = await client.query(transactionStatement, [
                requested_by,
                roles,
                customer_Code,
                base_limit,
                expiry_date,
                credit_extension,
                payer_code,
                remarks,
                uid,
                childUid,
                'PENDING',
                'REQUESTED',
                data.file_name,
                data.link || '',
                payer_name,
            ]);

            return result.rows[0];
        } catch (error) {
            console.error(`Error in UserModel.insertCreditExtentionRequest: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async insertAuditTrail(requested_by: string, uid: string, remarks: string, childUid: string, status: string, type: string) {
        logger.info('inside UserModel -> insertAuditTrail');
        let client: PoolClient | null = null;
        const auditTrailStatement = ` 
    insert into credit.audit_trail(updated_by,request_id,comments,status,type,childid)values($1,$2,$3,$4,$5,$6)
    RETURNING *;
    `;

        try {
            client = await conn.getWriteClient();
            const result = await client.query(auditTrailStatement, [requested_by, uid, remarks, status, type, childUid]);
            return result.rows[0];
        } catch (error) {
            console.error(`Error in UserModel.insertAuditTrail: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async insertAuditHistory(
        requested_by: string,
        customer_Code: string,
        base_limit: string,
        expiry_date: string,
        credit_extension: string,
        uid: string,
        childUid: string,
        approver1: string,
        approver2: string,
        approver3: string,
        approverId: string[],
    ) {
        logger.info('inside UserModel -> insertAuditHistory');
        let client: PoolClient | null = null;
        const approverIds = approverId;
        const approverData = [`${approverIds[0]}#${approver1}`, `${approverIds[1]}#${approver2}`, `${approverIds[2]}#${approver3}`];
        const auditHistoryStatement = `
    insert into credit.audit_history(user_id,request_id,approver_details,customer_code,base_limit,expiry_date,amount_requested, childid) values ($1,$2,$3,$4,$5,$6,$7, $8)
     RETURNING *;
    `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(auditHistoryStatement, [requested_by, uid, approverData, customer_Code, base_limit, expiry_date, credit_extension, childUid]);
            return result.rows[0];
        } catch (error) {
            console.error(`Error in UserModel.insertAuditHistory: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async insertGTAuditHistory(
        requested_by: string,
        amount: number,
        uid: string,
        childUid: string,
        approver1: string,
        approver2: string,
        approverId: string[],
        start_date: string,
        end_date: string,
        party_code: string,
        base_limit: string,
    ) {
        logger.info('inside UserModel -> insertAuditHistory');
        let client: PoolClient | null = null;
        const approverIds = approverId;
        const approverData = [`${approverIds[0]}#${approver1}`, `${approverIds[1]}#${approver2}`];
        const auditHistoryStatement = `
    insert into credit.audit_history(user_id,request_id,approver_details,customer_code,amount_requested,childid,gt_start_date,gt_end_date,base_limit) values ($1,$2,$3,$4,$5,$6,$7, $8,$9)
     RETURNING *;
    `;
        try {
            client = await conn.getWriteClient();
            const [startDate, start_month, start_year] = start_date?.split('/');
            const [endDate, end_month, end_year] = end_date?.split('/');
            const formattedStartDate = `${start_year}-${start_month}-${startDate}`;
            const formattedEndDate = `${end_year}-${end_month}-${endDate}`;
            const result = await client.query(auditHistoryStatement, [
                requested_by,
                uid,
                approverData,
                party_code,
                amount,
                childUid,
                formattedStartDate,
                formattedEndDate,
                base_limit,
            ]);
            return result.rows[0];
        } catch (error) {
            console.error(`Error in UserModel.insertAuditHistory: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getAuditHistorydetails(transaction_id: string) {
        logger.info('inside UserModel -> getAuditHistorydetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT ah.approver_details FROM credit.audit_history ah WHERE ah.request_id = $1 AND ah.id = ( SELECT MAX(id) FROM credit.audit_history WHERE request_id = $1)`;
            const result = await client.query(sqlStatement, [transaction_id]);
            return result.rows;
        } catch (error) {
            logger.error(`Error in UserModel -> :getAuditHistorydetails `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getRespondedByFromTransactionDetail(transaction_id: string, childid: string) {
        logger.info('inside UserModel -> getRespondedByFromTransactionDetail');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select * from credit.transactions t  where transaction_id = $1 and childid= $2`;
            const result = await client.query(sqlStatement, [transaction_id, childid]);
            return result?.rows[0];
        } catch (error) {
            logger.error(`Error in UserModel -> :getRespondedByFromTransactionDetail `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getAuditTrailDetails(transaction_id: string, childid: string, status: string) {
        logger.info('inside UserModel -> getAuditTrailDetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `SELECT * FROM credit.audit_trail WHERE status = $1 AND request_id = $2 AND childid=$3 order by id desc limit 1;`;
            const result = await client.query(sqlStatement, [status, transaction_id, childid]);
            return result?.rows;
        } catch (error) {
            logger.error(`Error in UserModel -> :getAuditTrailDetails `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async checkTransactionStatus(transaction_id: string, childid: string, status: string) {
        logger.info('inside UserModel -> checkTransactionStatus');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select * from credit.transactions t  where transaction_id =$1 and childid=$2 and status=$3`;
            const result = await client.query(sqlStatement, [transaction_id, childid, status]);
            return result.rows[0];
        } catch (error) {
            logger.error(`Error in UserModel -> :checkTransactionStatus `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async checkCustomerGroup(transaction_id: string) {
        logger.info('inside UserModel -> checkCustomerGroup');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `select distinct t.payercode,cm.customer_group,t.transaction_id  from credit.transactions t left join mt_ecom_payer_code_mapping cm ON cm.payer_code = t.payercode where transaction_id = $1`;
            const result = await client.query(sqlStatement, [transaction_id]);
            return result?.rows[0]?.customer_group;
        } catch (error) {
            logger.error(`Error in UserModel -> :checkCustomerGroup `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async updateRequestApprover(
        updateData: {
            transaction_id: string;
            approver_remarks: string;
            amount_requested: number;
            baselimit: number;
            customer_Code: string;
            expirydate: string;
            status: string;
            payer_name: string;
            approver1: string;
            approver2: string;
            approver3: string;
            login_id: string;
            childid: string;
        },
        approver_type: string,
    ) {
        logger.info('inside UserModel -> updateRequestApprover');
        const { transaction_id, approver_remarks, amount_requested, baselimit, customer_Code, expirydate, status, approver1, approver2, approver3, login_id, childid } = updateData;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let approver = '';
            if (approver_type === 'APPROVER1') {
                approver = approver1;
            } else if (approver_type === 'APPROVER2') {
                approver = approver2;
            } else if (approver_type === 'APPROVER3') {
                approver = approver3;
            }
            if (status === 'APPROVED') {
                let sqlStatement = `
                UPDATE credit.transactions 
                SET 
                    responded_by = CASE
                       WHEN array_length(responded_by, 1) IS NULL THEN ARRAY[$1]
                       ELSE array_append(responded_by, $1)
                    END,
                    baselimit = $2, 
                    amount_requested = $3,
                    expirydate = $4,
                    responded_on = CASE
                    WHEN array_length(responded_on, 1) IS NULL THEN ARRAY[now()::timestamp]
                    ELSE array_append(responded_on, now()::timestamp)
                END
             
            `;

                if (approver_type === 'APPROVER1') {
                    sqlStatement += `, approver1_remarks = $6 `;
                } else if (approver_type === 'APPROVER2') {
                    sqlStatement += `, approver2_remarks = $6 `;
                } else if (approver_type === 'APPROVER3') {
                    sqlStatement += `, approver3_remarks = $6 `;
                }

                if (approver_type === 'APPROVER3') {
                    sqlStatement += `, status = 'APPROVED' `;
                }
                sqlStatement += `
            WHERE 
                transaction_id = $5 and
                childid = $7
            RETURNING requested_by
        `;
                const values = [approver, baselimit, amount_requested, expirydate, transaction_id, approver_remarks, childid];
                const result = await client.query(sqlStatement, values);
                logger.info(`inside UserModel -> updateRequestApprover, Updated Transaction Table, ${status}`);
                // //chilid data should change
                const audit_trail = `
                INSERT INTO credit.audit_trail(updated_by, request_id, comments, status, type,childid)
                VALUES ($1, $2, $3, $4, $5,$6)
            `;
                const audit_trail_values = [login_id, transaction_id, approver_remarks, status, approver_type, childid];
                await client.query(audit_trail, audit_trail_values);

                logger.info(`inside UserModel -> updateRequestApprover, Updated Audit Trail Table, ${status}`);

                const auditHistoryStatement = `
                INSERT INTO credit.audit_history(user_id, request_id, approver_details, customer_code, base_limit, expiry_date, amount_requested,childid)
                VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
            `;
                await client.query(auditHistoryStatement, [
                    login_id,
                    transaction_id,
                    [approver1, approver2, approver3],
                    customer_Code,
                    baselimit,
                    expirydate,
                    amount_requested,
                    childid,
                ]);

                logger.info(`inside UserModel -> updateRequestApprover, Updated Audit history Table, ${status}`);
                return {
                    transaction: result.rowCount,
                };
            } else if (status === 'REJECTED') {
                let sqlStatement = `
                UPDATE credit.transactions 
                SET 
                     responded_by = CASE
                       WHEN array_length(responded_by, 1) IS NULL THEN ARRAY[$1]
                       ELSE array_append(responded_by, $1)
                    END,
                        responded_on = CASE
                    WHEN array_length(responded_on, 1) IS NULL THEN ARRAY[now()::timestamp]
                    ELSE array_append(responded_on, now()::timestamp)
                END,
                status=$4
            `;
                if (approver_type === 'APPROVER1') {
                    sqlStatement += `, approver1_remarks = $3 `;
                } else if (approver_type === 'APPROVER2') {
                    sqlStatement += `, approver2_remarks = $3 `;
                } else if (approver_type === 'APPROVER3') {
                    sqlStatement += `, approver3_remarks = $3 `;
                }

                sqlStatement += `
                    WHERE
                    transaction_id = $2 AND
                    childid = $5
                    RETURNING requested_by
                `;

                const values = [approver, transaction_id, approver_remarks, status, childid];
                const result = await client.query(sqlStatement, values);
                logger.info(`inside UserModel -> updateRequestApprover, Updated Transaction Table, ${status}`);
                //chilid
                const audit_trail = `
                INSERT INTO credit.audit_trail(updated_by, request_id, comments, status, type,childid)
                VALUES ($1, $2, $3, $4, $5,$6)
            `;
                const audit_trail_values = [login_id, transaction_id, approver_remarks, status, approver_type, childid];
                await client.query(audit_trail, audit_trail_values);
                logger.info(`inside UserModel -> updateRequestApprover, Updated audit trail Table, ${status}`);
                return {
                    transaction: result.rowCount,
                };
            } else {
                return null;
            }
        } catch (error) {
            logger.error(`Error in UserModel -> updateRequestApprover: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getClApproverFinance() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getClApproverFinance');
            client = await conn.getReadClient();
            const role = 'CL_PRIMARY_APPROVER';
            const sqlStatement = `SELECT user_id, first_name, last_name, email 
            FROM sales_hierarchy_details shr WHERE 
                $1 = ANY(shr.roles)
                AND shr.deleted = false
                and shr.status = 'ACTIVE' `;
            const result = await client.query(sqlStatement, [role]);
            const rowCount = result.rowCount;
            return {
                rows: result.rows,
                rowCount,
            };
        } catch (error) {
            logger.error(`Error in UserModel -> getClApproverFinance: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getClApproverSales() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getClApproverSales');
            client = await conn.getReadClient();
            const role = 'CL_SECONDARY_APPROVER';
            const sqlStatement = `SELECT user_id, first_name || ' ' || last_name AS full_name, email 
            FROM sales_hierarchy_details shr WHERE 
                $1 = ANY(shr.roles)
                AND shr.deleted = false
                and shr.status = 'ACTIVE' `;
            const result = await client.query(sqlStatement, [role]);
            const rowCountMT = result.rowCount;

            const roleGT1 = 'GT_PRIMARY_APPROVER';
            const sqlStatementGT1 = `SELECT user_id, first_name || ' ' || last_name AS full_name, email 
            FROM sales_hierarchy_details shr WHERE 
                $1 = ANY(shr.roles)
                AND shr.deleted = false
                and shr.status = 'ACTIVE' `;
            const resultGT1 = await client.query(sqlStatementGT1, [roleGT1]);
            const rowCountGT1 = resultGT1.rowCount;
            const roleGT2 = 'GT_SECONDARY_APPROVER';
            const sqlStatementGT = `SELECT user_id, first_name || ' ' || last_name AS full_name, email 
            FROM sales_hierarchy_details shr WHERE 
                $1 = ANY(shr.roles)
                AND shr.deleted = false
                and shr.status = 'ACTIVE' `;
            const resultGT2 = await client.query(sqlStatementGT, [roleGT2]);

            const rowCountGT2 = resultGT2.rowCount;
            return {
                rows: result.rows,
                GTFirst: resultGT1.rows,
                GTSecond: resultGT2.rows,
                rowCountMT,
                rowCountGT1,
                rowCountGT2,
            };
        } catch (error) {
            logger.error(`Error in UserModel -> getClApproverSales: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async updateSalesEmails(client: PoolClient, param: ApproverConfig, login_id: string) {
        try {
            // For each subcategory in the approver_3 array
            for (const subCat of param.approver_3.sub_category) {
                await client.query(
                    `UPDATE credit.cl_approver_configuration 
                     SET sales_emails = $1, updated_by = $2 
                     WHERE category = $3 
                     AND header_id IN (
                         SELECT id 
                         FROM credit.cl_approver_level_details 
                         WHERE header_name = $4
                     )`,
                    [subCat.email, login_id, param.category, subCat.header],
                );

                logger.info('Inside UpdateSalesEmails -> Updating sales email:', {
                    category: param.category,
                    header: subCat.header,
                    email: subCat.email,
                });
            }
        } catch (error) {
            console.error('Error updating sales emails:', error);
            throw error;
        }
    },

    async updateFinanceEmails(client: PoolClient, param: ApproverConfig, login_id: string) {
        if (param.approver_2.email) {
            await client.query(
                `UPDATE credit.cl_approver_configuration 
                 SET finance_emails = $1, updated_by = $2 
                 WHERE category = $3`,
                [param.approver_2.email, login_id, param.category],
            );

            logger.info('Inside UpdateFinanceEmails -> Updating finance email:', {
                category: param.category,
                email: param.approver_2.email,
            });
        }
    },
    async insertApproverDetails(queryParams: ApproverConfig[], login_id: string): Promise<ApproverUpdateResponse> {
        logger.info('inside UserModel -> insertApproverDetails');
        let client: PoolClient | null = null;
        const updatedData: UpdatedRecord[] = [];
        try {
            client = await conn.getWriteClient();
            for (const param of queryParams) {
                await this.updateSalesEmails(client, param, login_id);
                await this.updateFinanceEmails(client, param, login_id);

                const updatedConfig = await client.query(
                    `SELECT category, finance_emails, sales_emails 
                     FROM credit.cl_approver_configuration 
                     WHERE category = $1`,
                    [param.category],
                );

                updatedData.push(updatedConfig.rows[0]);
            }
            return {
                status: SuccessMessage.INSERT_APPROVER_DETAILS,
                result: {
                    // updatedRecords: updatedData,
                    updatedCategoryCount: updatedData.length,
                    updated_by: login_id,
                },
            };
        } catch (error) {
            logger.error('Error in UserModel -> insertApproverDetails:', error);
            throw new Error('Failed to insert approver details');
        } finally {
            if (client) {
                client.release();
            }
        }
    },

    async getApproverDetails() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getApproverDetails');
            client = await conn.getReadClient();
            const sqlStatement = `WITH header_ids AS (
                SELECT array_agg(id) as valid_ids
                FROM credit.cl_approver_level_details 
                WHERE id > 2                                -- Get all subcategory header IDs
            ),
            categories AS (
                SELECT DISTINCT category
                FROM credit.cl_approver_configuration
            ),
            approvers AS (
                SELECT 
                    ac.category,
                    al_finance.header_name as finance_header,
                    al_sales.header_name as sales_header,
                    ac.finance_emails,
                    JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                            'email', ac.sales_emails,
                            'header', al_sub.header_name,
                            'customer_group', ac.customer_group
                        )
                        ORDER BY al_sub.id
                    ) as sub_category
                FROM credit.cl_approver_configuration ac
                LEFT JOIN credit.cl_approver_level_details al_finance ON al_finance.id = 1
                LEFT JOIN credit.cl_approver_level_details al_sales ON al_sales.id = 2
                LEFT JOIN credit.cl_approver_level_details al_sub ON al_sub.id = ac.header_id
               
                WHERE EXISTS (
                    SELECT 1 FROM header_ids 
                    WHERE ac.header_id = ANY(valid_ids)
                )
                GROUP BY 
                    ac.category, 
                    ac.finance_emails,
                    al_finance.header_name,
                    al_sales.header_name
            )
            SELECT 
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'category', a.category,
                        'approver_2', JSONB_BUILD_OBJECT(
                            'header', a.finance_header,
                            'email', a.finance_emails
                        ),
                        'approver_3', JSONB_BUILD_OBJECT(
                            'header', a.sales_header,
                            'sub_category', a.sub_category
                        )
                    )
                    ORDER BY 
                        CASE WHEN a.category LIKE '%Default%' THEN 2 ELSE 1 END,
                        a.category
                ) as data
            FROM approvers a;`;
            const result = await client.query(sqlStatement);
            return result.rows[0].data;
        } catch (error) {
            logger.error(`Error in UserModel -> getApproverDetails: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getRiskCategory() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getRiskCategory');
            client = await conn.getReadClient();
            const sqlStatement = `SELECT * FROM credit.cl_risk_category`;
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error(`Error in UserModel -> getRiskCategory: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async fetchExclusiveApproversDetails(queryParams) {
        logger.info('inside UserModel -> fetchApproversDetails');
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();

            const categoryStatement = ` SELECT 
                CASE
                    WHEN $1 = 'B' AND CAST($2 AS NUMERIC) <= 15 THEN (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'First')
                    WHEN $1 = 'B' AND CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'Second')
                    WHEN $1 = 'B' AND CAST($2 AS NUMERIC) > 30 THEN (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'Third')
                    WHEN $1 = 'C' AND CAST($2 AS NUMERIC) <= 15 THEN (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'First')
                    WHEN $1 = 'C' AND CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'Second')
                    WHEN $1 = 'C' AND CAST($2 AS NUMERIC) > 30 THEN (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'Third')
                    WHEN $1 = 'D' AND CAST($2 AS NUMERIC) <= 15 THEN (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'First')
                    WHEN $1 = 'D' AND CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'Second')
                    WHEN $1 = 'D' AND CAST($2 AS NUMERIC) > 30 THEN (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'Third')
                    ELSE (SELECT category FROM credit.cl_approver_configuration WHERE category LIKE '%Default%' LIMIT 1)
                END as approver_category
                FROM credit.cl_risk_category
                LIMIT 1;      
        `;
            const sqlStatement1 = `SELECT 
        cac.finance_emails,
        cac.sales_emails,
        (SELECT CONCAT(first_name, ' ', last_name) 
        FROM sales_hierarchy_details shd 
        WHERE LOWER(shd.email) = LOWER(cac.finance_emails) 
        AND shd.deleted = false 
        AND shd.status = 'ACTIVE'
        LIMIT 1) as finance_name,
        (SELECT CONCAT(first_name, ' ', last_name) 
        FROM sales_hierarchy_details shd 
        WHERE LOWER(shd.email) = LOWER(cac.sales_emails)
        AND shd.deleted = false 
        AND shd.status = 'ACTIVE'
        LIMIT 1) as sales_name
      FROM credit.cl_approver_configuration cac
      WHERE category = $1 
      AND customer_group @> ARRAY[$2]::integer[];  
        `;

            if (queryParams[0]?.category) {
                const customerGroup = queryParams[0]?.customerGroup;
                const category = queryParams[0]?.category;
                const result = await client.query(sqlStatement1, [category, customerGroup]);
                return result.rows;
            } else {
                const percentNum = queryParams[0]?.extensionrequiredpercentage;
                const riskFactor = queryParams[0]?.riskFactor;
                const result = await client.query(categoryStatement, [riskFactor, percentNum]);

                const response = await client.query(sqlStatement1, [result.rows[0]?.approver_category, queryParams[0]?.customerGroup]);
                return response.rows;
            }
        } catch (error) {
            logger.error('Error in UserModel -> fetchApproversDetails');
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async fetchApproversDetails(queryParams) {
        logger.info('inside UserModel -> fetchApproversDetails');
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const categoryStatement = `       
                SELECT 
                CASE 
                    WHEN CAST($3 AS NUMERIC) < 1 OR $1 NOT IN ('B', 'C', 'D') THEN
                    (SELECT category 
                    FROM credit.cl_approver_configuration 
                    WHERE category LIKE '%Default%' 
                    LIMIT 1)
                    ELSE
                    CASE 
                        WHEN $1 = 'B' THEN
                        CASE 
                            WHEN CAST($2 AS NUMERIC) <= 15 THEN (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'First')
                            WHEN CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'Second')
                            ELSE (SELECT low_credit_risk_b FROM credit.cl_risk_category WHERE risk_code = 'Third')
                        END
                        WHEN $1 = 'C' THEN
                        CASE 
                            WHEN CAST($2 AS NUMERIC) <= 15 THEN (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'First')
                            WHEN CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'Second')
                            ELSE (SELECT medium_credit_risk_c FROM credit.cl_risk_category WHERE risk_code = 'Third')
                        END
                        WHEN $1 = 'D' THEN
                        CASE 
                            WHEN CAST($2 AS NUMERIC) <= 15 THEN (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'First')
                            WHEN CAST($2 AS NUMERIC) > 15 AND CAST($2 AS NUMERIC) <= 30 THEN (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'Second')
                            ELSE (SELECT high_credit_risk_d FROM credit.cl_risk_category WHERE risk_code = 'Third')
                        END
                    END
                END as approver_category
                FROM credit.cl_risk_category
                LIMIT 1;`;

            const sqlStatement1 = `SELECT 
        cac.finance_emails,
        cac.sales_emails,
        (SELECT CONCAT(first_name, ' ', last_name) 
        FROM sales_hierarchy_details shd 
        WHERE LOWER(shd.email) = LOWER(cac.finance_emails) 
        AND shd.deleted = false 
        AND shd.status = 'ACTIVE'
        LIMIT 1) as finance_name,
        (SELECT CONCAT(first_name, ' ', last_name) 
        FROM sales_hierarchy_details shd 
        WHERE LOWER(shd.email) = LOWER(cac.sales_emails)
        AND shd.deleted = false 
        AND shd.status = 'ACTIVE'
        LIMIT 1) as sales_name
      FROM credit.cl_approver_configuration cac
      WHERE category = $1 
      AND customer_group @> ARRAY[$2]::integer[];  
      `;
            // Handle single record
            const singleParam = queryParams as SingleQueryParams;
            const baseLimit = parseInt(singleParam.base_limit);
            const percent = singleParam.amount_percentage;

            const approverClass = await client.query(categoryStatement, [singleParam.risk_credit, percent, baseLimit]);
            // Get approver details
            const approver = approverClass?.rows || [];

            // Query for approver emails and names
            const values1 = [approver[0]?.approver_category, (queryParams as SingleQueryParams).customer_group];
            const approverDetails = await client.query(sqlStatement1, values1);
            return approverDetails?.rows;
        } catch (error) {
            logger.error('Error in UserModel -> fetchApproversDetails');
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async accountBaseLimitCheck() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> accountBaseLimitCheck');
            client = await conn.getReadClient();
            const sqlStatement = `SELECT * 
                    FROM credit.cl_account_master 
                    ORDER BY updated_on DESC 
                    LIMIT 1;`;
            const result = await client.query(sqlStatement);
            return result.rows[0] ? result.rows[0] : [];
        } catch (error) {
            logger.error(`Error in UserModel -> accountBaseLimitCheck: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async addApproverConfig(queryParams, user_id) {
        logger.info('inside UserModel -> addApproverConfig');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();

            // First insert header name and get header ID
            const insertSalesCodes = `INSERT INTO credit.cl_approver_level_details (header_name) 
                                     VALUES ($1) RETURNING id;`;
            const salesCodesResult = await client.query(insertSalesCodes, [queryParams.sales_codes]);
            const headerId = salesCodesResult.rows[0].id;
            // Insert into the main table with the header_id
            let result;
            for (const category of queryParams.category) {
                const checkQuery = `SELECT finance_emails FROM credit.cl_approver_configuration 
                                  WHERE category = $1 LIMIT 1`;
                const existingFinanceResult = await client.query(checkQuery, [category]);
                const existingFinanceEmail = existingFinanceResult.rows[0]?.finance_emails;

                const sqlStatement = `INSERT INTO credit.cl_approver_configuration 
                    (category, header_id, finance_emails, sales_emails, customer_group, updated_by, updated_on) 
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
                    RETURNING *;`;

                result = await client.query(sqlStatement, [
                    category,
                    headerId,
                    existingFinanceEmail, // Use existing email as The second approver (UP3) will stay the same as per the current configuration
                    queryParams.sales_emails,
                    queryParams.customer_group,
                    user_id,
                ]);

                logger.info('Added approver configuration:', {
                    category,
                    financeEmail: existingFinanceEmail,
                    salesEmail: queryParams.sales_emails,
                });
            }
            return result.rows[0];
        } catch (error) {
            logger.error('Error in UserModel -> addApproverConfig:', error);
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    },
    async getOnePayerCodeDetailsFromTransaction(payer_code: string) {
        logger.info('inside UserModel -> getOnePayerCodeDetailsFromTransaction');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `select* from credit.transactions t where t.payercode = $1 AND status = 'APPROVED' AND expiry_type='NA';`;
            const result = await client.query(sqlStatement, [payer_code]);
            return result.rows;
        } catch (error) {
            logger.error('Error in Usermodel -> getOnePayerCodeDetailsFromTransaction: ', error);
        } finally {
            client?.release();
        }
    },
    async getCategoryList() {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const query = `
              SELECT ARRAY_AGG(category) as categories
            FROM (
                SELECT DISTINCT category 
                FROM credit.cl_approver_configuration
                ORDER BY category
            ) as subquery;
            `;
            const result = await client.query(query);
            return result?.rows[0].categories || [];
        } catch (error) {
            logger.error(`Error in UserModel -> getCategoryList: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getUnmappedCustomerGroups() {
        logger.info('inside UserModel -> getUnmappedCustomerGroups');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const groupsQuery = `
            WITH payer_groups AS (
                SELECT DISTINCT customer_group::integer as group_id
                FROM mt_ecom_payer_code_mapping
                WHERE customer_group IS NOT NULL 
                AND customer_group != ''
            ),
            config_groups AS (
                SELECT DISTINCT unnest(customer_group)::integer as group_id
                FROM credit.cl_approver_configuration
            )
            SELECT pg.group_id
            FROM payer_groups pg
            LEFT JOIN config_groups cg ON pg.group_id = cg.group_id
            WHERE cg.group_id IS NULL
            ORDER BY pg.group_id;
        `;
            const headerQuery = `
            SELECT header_name 
            FROM credit.cl_approver_level_details 
            WHERE id > 2
            ORDER BY id;
        `;

            const [groupsResult, headerResult] = await Promise.all([client.query(groupsQuery), client.query(headerQuery)]);

            return {
                unmappedGroups: groupsResult.rows.map((row) => row.group_id),
                headerNames: headerResult.rows.map((row) => row.header_name),
            };
        } catch (error) {
            logger.error(`Error in UserModel -> getUnmappedCustomerGroups: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async insertCreditExtensionGTRequest(insertData: {
        transaction_id: string;
        child_id: string;
        requestedBy: string;
        action_type: string;
        roles: string;
        cluster_code: string;
        partyCode: string;
        partyName: string;
        amount: number;
        startDate: string;
        endDate: string;
        file_name: string;
        file_link: string;
        remarks: string;
        base_limit: string;
    }) {
        const {
            transaction_id,
            child_id,
            cluster_code,
            requestedBy,
            roles,
            partyCode,
            partyName,
            amount,
            startDate,
            endDate,
            action_type,
            file_name,
            file_link,
            remarks,
            base_limit,
        } = insertData;
        console.log(insertData);
        logger.info('inside UserModel -> insertCreditExtensionGTRequest');
        let client: PoolClient | null = null;
        const [start_date, start_month, start_year] = startDate?.split('/');
        const [end_date, end_month, end_year] = endDate?.split('/');
        const formattedStartDate = `${start_year}-${start_month}-${start_date}`;
        const formattedEndDate = `${end_year}-${end_month}-${end_date}`;
        const transactionStatement = `
        INSERT INTO credit.gt_transactions (
            transaction_id, 
            child_id, 
            region, 
            requested_by,
            distributor_code,
            distributor_name,
            status,
            amount,
            start_date,
            end_date,
            file_action_type,
            file_name,
            file_link,
            requestor_remarks,
            base_limit
        ) VALUES (
            $1,$2, $3,  $4||'#'||$5, $6, $7, $8, $9, $10, $11, $12, $13,$14,$15,$16
        )
      RETURNING transaction_id;
     `;

        try {
            client = await conn.getWriteClient();
            const result = await client.query(transactionStatement, [
                transaction_id,
                child_id,
                cluster_code,
                requestedBy,
                roles,
                partyCode,
                partyName,
                'PENDING',
                amount,
                formattedStartDate,
                formattedEndDate,
                action_type,
                file_name,
                file_link,
                remarks,
                base_limit,
            ]);
            logger.info(`Party Code: ${partyCode}, Transaction_id:${transaction_id}, childId:${child_id} `)
            return result;
        } catch (error) {
            console.error(`Error in UserModel.insertCreditExtensionGTRequest: ${error.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    },
    async fetchGTCreditExtentionRequests(queryParams: {
        type: string;
        status: string | null;
        region: string[] | null;
        search: string | null;
        limit: number | null;
        offset: number | null;
        user_id: string;
        rolesArr: string[];
        action_type: string | null;
        requestedBySearch: string | null;
        email: string;
    }) {
        logger.info('inside UserModel -> fetchGTCreditExtentionRequests, queryParams: ' + JSON.stringify(queryParams));

        let client: PoolClient | null = null;
        try {
            const { status, search, limit, offset, region, user_id, rolesArr, action_type, requestedBySearch, email } = queryParams;

            let whereClause = '1=1';
            const queryParamsArray: Array<string | string[]> = []; // Array for parameters
            let paramIndex = 1; // Index for parameters

            if (status && status !== 'ALL') {
                whereClause += ` AND tr.status = $${paramIndex}`;
                queryParamsArray.push(status);
                paramIndex++;
            }
            if (action_type && action_type !== 'ALL') {
                whereClause += ` AND tr.file_action_type = $${paramIndex}`;
                queryParamsArray.push(action_type);
                paramIndex++;
            }

            if (search) {
                whereClause += ` AND (tr.transaction_id ILIKE $${paramIndex} OR tr.distributor_code ILIKE $${paramIndex} OR tr.distributor_name ILIKE $${paramIndex} OR ((COALESCE(sh.first_name, '') || ' ' || COALESCE(sh.last_name, '')) ILIKE $${paramIndex} )) `;
                queryParamsArray.push(`%${search}%`);
                paramIndex++;
            }
            if (requestedBySearch) {
                whereClause += ` AND (COALESCE(sh.first_name,'')|| ' ' ||COALESCE(Sh.last_name,'')) ILIKE $${paramIndex}  OR up.name ILIKE $${paramIndex} `;
                queryParamsArray.push(`%${requestedBySearch}%`);
                paramIndex++;
            }

            if (region && region.length > 0) {
                const groupPlaceholders = region.map((_, index) => `$${paramIndex + index}`).join(',');
                whereClause += ` AND  tr.region IN (${groupPlaceholders})`;
                queryParamsArray.push(...region);
                paramIndex += region.length;
            }

            if (rolesArr.includes(roles.RCM) || rolesArr.includes(roles.HOF)) {
                whereClause += ` AND SPLIT_PART(tr.requested_by, '#', 1) = $${paramIndex}`;
                queryParamsArray.push(user_id);
                paramIndex++;
            }
            if (rolesArr.includes(roles.GT_PRIMARY_APPROVER) || rolesArr.includes(roles.GT_SECONDARY_APPROVER)) {
                whereClause += ` AND (ad1.user_id = $${paramIndex} OR ad2.user_id = $${paramIndex})`;
                queryParamsArray.push(user_id);
                paramIndex++;
            }

            let requestorClustersSQL;
            let adminClustersSQL;
            let clusters: string[] = [];
            client = await conn.getReadClient();
            if (rolesArr.includes(roles.RCM) || rolesArr.includes(roles.HOF)) {
                requestorClustersSQL = `select array_agg(cgrm.cluster_code) as cluster_code from credit.cl_gt_requestor_mapping cgrm where cgrm.user_id = $1 AND cgrm.cluster_code IS NOT NULL`;
                const requestorClusters: any = await client.query(requestorClustersSQL, [user_id]);
                clusters = requestorClusters?.rows[0].cluster_code.flat(2) || [];
            } else if (
                rolesArr.includes(roles.SUPPORT) ||
                rolesArr.includes(roles.SUPER_ADMIN) ||
                rolesArr.includes(roles.GT_PRIMARY_APPROVER) ||
                rolesArr.includes(roles.GT_SECONDARY_APPROVER)
            ) {
                adminClustersSQL = `select array_agg(distinct gm.cluster_code) as cluster_code  from public.group5_master gm where gm.cluster_code IS NOT NULL `;
                const adminClusters = await client.query(adminClustersSQL);
                clusters = adminClusters?.rows[0].cluster_code || [];
            }
            logger.info('inside UserModel -> fetchGTCreditExtentionRequests, clusters: ', clusters);

            const sqlStatement = `
with
last_audit_history as (
select request_id, max(id) as max_id from credit.audit_history ah
group by request_id
),
approver_details AS (
    select
    ah.request_id ,
    SPLIT_PART(item, '#', 1) AS user_id,
    position as row_num
    from credit.audit_history ah
    inner join last_audit_history lah on lah.max_id = ah.id and lah.request_id = ah.request_id
    cross join unnest(ah.approver_details) with ordinality as t(item, position)
)
SELECT
     tr.transaction_id,
    tr.status,
    tr.start_date::text,
    tr.end_date::text,
    tr.amount,
    tr.distributor_code,
    UPPER(tr.distributor_name) AS distributor_name,
    (COALESCE(sh.first_name, '') || ' ' || COALESCE(sh.last_name, '')) as requested_by,
    tr.requested_on,
    tr.responded_on,
    res_by.responded_by
FROM
    credit.gt_transactions tr
LEFT JOIN
    user_profile up ON (tr.requested_by = up.id)
LEFT JOIN
    sales_hierarchy_details sh ON (COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' AND sh.user_id = SPLIT_PART(tr.requested_by, '#', 1))
LEFT JOIN
    LATERAL (
        SELECT
            ARRAY_AGG(COALESCE(sh2.first_name, '') || ' ' || COALESCE(sh2.last_name, '') ORDER BY idx) AS responded_by
        FROM (
            SELECT
                res_by.user_id,
                ROW_NUMBER() OVER () AS idx
            FROM
                unnest(tr.responded_by) AS res_by(user_id)
        ) res_by
        LEFT JOIN
            sales_hierarchy_details sh2 ON sh2.user_id = SPLIT_PART(res_by.user_id, '#', 1)
    ) res_by ON true
LEFT JOIN
    credit.audit_history ah ON ah.request_id = tr.transaction_id
LEFT JOIN
    approver_details ad1 ON ad1.request_id = tr.transaction_id AND ad1.row_num = 1
LEFT JOIN
    sales_hierarchy_details approver_1 ON approver_1.user_id = ad1.user_id
LEFT JOIN
    approver_details ad2 ON ad2.request_id = tr.transaction_id AND ad2.row_num = 2
LEFT JOIN
    sales_hierarchy_details approver_2 ON approver_2.user_id = ad2.user_id
WHERE ${whereClause} AND tr.region= ANY($${paramIndex})
GROUP BY
    tr.transaction_id, tr.child_id, tr.status, tr.amount, tr.requested_by, tr.requested_on, tr.responded_on,
    res_by.responded_by, tr.region, tr.distributor_code, tr.file_action_type,tr.distributor_name,
    up.name, sh.first_name, sh.last_name,
    tr.id
ORDER BY tr.id DESC`;

            queryParamsArray.push(clusters);
            paramIndex++;

            const result = await client.query(sqlStatement, queryParamsArray);

            if (result?.rowCount) {
                const selectedRows = limit != null && offset != null ? result.rows.slice(+offset, +offset + +limit) : result.rows;
                return {
                    rows: selectedRows,
                    rowCount: selectedRows.length,
                    totalCount: result.rowCount,
                    regions: clusters,
                };
            }
            return { rows: [], rowCount: 0, totalCount: 0, regions: clusters || [] };
        } catch (error) {
            logger.error('inside UserModel -> fetchGTCreditExtentionRequests, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchGTRequestedDetailsById(transaction_id: string) {
        logger.info('inside UserModel -> fetchRequestedDetailsById, transactionId: ' + transaction_id);
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `WITH unnested_responded_by AS (
                SELECT
                    tr.transaction_id,
                    tr.child_id,
                    COALESCE(sh2.first_name, '') || ' ' || COALESCE(sh2.last_name, '') AS responded_by,
                    Lower(COALESCE(sh2.email, '-')) AS responded_by_email,
                    res_by.rn
                FROM credit.gt_transactions tr
                LEFT JOIN LATERAL (
                    SELECT user_id, ROW_NUMBER() OVER () AS rn
                    FROM unnest(tr.responded_by) AS res_by(user_id)
                ) AS res_by ON true
                LEFT JOIN sales_hierarchy_details sh2 ON sh2.user_id = SPLIT_PART(res_by.user_id, '#', 1)
                WHERE sh2.user_id IS NOT NULL
            ),
            responded_by_distinct AS (
                SELECT DISTINCT
                    transaction_id,
                    child_id,
                    responded_by,
                    responded_by_email,
                    rn
                FROM unnested_responded_by
            ),
            responded_by_cte AS (
                SELECT
                    transaction_id,
                    child_id,
                    ARRAY_AGG(responded_by ORDER BY rn) AS responded_by,
                    ARRAY_AGG(responded_by_email ORDER BY rn) AS responded_by_email
                FROM responded_by_distinct
                GROUP BY transaction_id, child_id
            )
            SELECT DISTINCT
                tr.transaction_id,
                tr.amount,
                tr.child_id,
                tr.status,
                ah2.approver_details,
                tr.requested_on,
                tr.file_action_type,
                tr.distributor_code ,
                UPPER(tr.distributor_name) AS distributor_name,
                tr.start_date::text AS start_date,
                tr.end_date::text AS end_date,
                tr.approvers_remarks,
                tr.base_limit,
                tr.requestor_remarks,
                (CASE 
                    WHEN COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' 
                    THEN (COALESCE(sdr.first_name, '') || ' ' || COALESCE(sdr.last_name, '')) 
                    ELSE COALESCE(up.name, '-') 
                END) AS requested_by,
                tr.responded_on,
                UPPER(tr.file_name) AS filename,
                tr.file_link,
                (SELECT ARRAY_AGG(shd.first_name || ' ' || shd.last_name ORDER BY sub.rn)
                FROM (
                    SELECT
                        split_part(unnested_approver_details, '#', 1) AS user_id,
                        row_number() OVER () AS rn
                    FROM credit.audit_history ah2, unnest(ah2.approver_details) AS unnested_approver_details
                    WHERE ah2.request_id = tr.transaction_id AND
                          ah2.id = (SELECT max(ah3.id) FROM credit.audit_history ah3 WHERE ah3.request_id = tr.transaction_id)
                ) AS sub
                JOIN sales_hierarchy_details shd ON shd.user_id = sub.user_id
                ) AS approver_full_names,
                rbc.responded_by,
                rbc.responded_by_email
            FROM 
                credit.gt_transactions tr
            LEFT JOIN 
                user_profile up ON (tr.requested_by = up.id)
            LEFT JOIN 
                sales_hierarchy_details sdr ON (COALESCE(tr.requested_by, '') NOT ILIKE 'DISTRIBUTOR%' AND sdr.user_id = SPLIT_PART(tr.requested_by, '#', 1))
            LEFT JOIN 
                credit.audit_history ah2 ON (tr.transaction_id = ah2.request_id)
            LEFT JOIN 
                responded_by_cte rbc ON rbc.transaction_id = tr.transaction_id AND rbc.child_id = tr.child_id
            WHERE 
                tr.transaction_id = $1 AND 
                ah2.id = (SELECT max(ah3.id) FROM credit.audit_history ah3 WHERE ah3.request_id = tr.transaction_id)    
            ORDER BY 
                tr.child_id ASC`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [transaction_id]);
            if (result?.rows) {
                return { result: result?.rows };
            }
            return null;
        } catch (error) {
            logger.error('inside UserModel -> fetchRequestedDetailsById, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getBaseLimit(partyCode: string) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside UserModel -> getBaseLimit');
            client = await conn.getReadClient();
            const sqlStatement = `select dbls.base_limit from credit.distributor_base_limit_sync dbls where party_code =$1`;
            const result = await client.query(sqlStatement, [partyCode]);
            return result.rows[0];
        } catch (error) {
            logger.error(`Error in UserModel -> getBaseLimit: `, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
};
