import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import { utilModel } from './utilModel';

export const RushOrderModel = {
    async fetchOrderRequests(queryParams: {
                                type: string, 
                                status: string | null,
                                dbList: string[] | null,
                                region: string[] | null,
                                area: string[] | null, 
                                search: string | null,
                                startDate: string | null,
                                endDate: string | null,
                                limit: number | null,
                                offset: number | null,
                            }) 
    {
        logger.info("inside RushOrderModel -> fetchOrderRequests, queryParams: " + JSON.stringify(queryParams));
        
        let client: PoolClient| null = null;
        try {
            const { type, status, dbList, region, area, search, startDate, endDate, limit, offset } = queryParams;
            if(!type){
                logger.info("inside RushOrderModel -> fetchOrderRequests, order_type is null");
                throw new Error("Order type cannot be null or empty.");
            }
            const typeStatement = type === 'ALL' ? '' : ` AND odr.type = '${type}'`;
            const statusStatement = (!status || status === 'ALL') ? '' : ` AND odr.status = '${status}'`;
            const dbListStatement = (!dbList || dbList.length === 0) ? '' : ` AND odr.distributor_id IN ('${dbList.join("','")}')`;
            const regionStatement = (!region || region.length === 0) ? '' : ` AND gm.description IN ('${region.join("','")}')`;
            const areaStatement = (!area || area.length === 0) ? '' : ` AND dm.area_code IN ('${area.join("','")}')`;
            const searchStatement = (!search || search === '') ? '' : ` AND (odr.distributor_id ILIKE '%${search}%'
                                                            OR up.name ILIKE '%${search}%'
                                                            OR odr.po_number ILIKE '%${search}%'
                                                            OR odr.so_number ILIKE '%${search}%'
                                                            OR odr.amount ILIKE '%${search}%')`;
            const startDateStatement = (!startDate) ? '' : ` AND odr.requested_on::date >= '${new Date(startDate).toISOString()}'`;
            const endDateStatement = (!endDate) ? '' : ` AND odr.requested_on::date <= '${new Date(endDate).toISOString()}'`;
            
            const sqlStatement = `
                    WITH db_max_pdp as (
                        SELECT
                            dp.distributor_id,
                            jsonb_agg( DISTINCT dp.pdp_day) AS max_pdp_day
                        FROM
                            distributor_plants dp
                        WHERE
                            LENGTH(dp.pdp_day) = (SELECT MAX(LENGTH(dp2.pdp_day))FROM distributor_plants dp2 WHERE dp2.distributor_id = dp.distributor_id AND dp2.distribution_channel = '10')
                            AND dp.pdp_day IS NOT NULL
                            AND dp.distribution_channel = '10'
                        GROUP BY
                            dp.distributor_id
                    )
                    SELECT odr.id
                        ,odr.distributor_id
                        ,COALESCE(up.name,'-') AS distributor_name
                        ,gm.description AS region
	                    ,dm.area_code
                        ,odr.po_number
                        ,odr.so_number
                        ,odr.amount
                        ,odr.status
                        ,odr.type
                        ,odr.reason
                        ,odr.comments
                        ,odr.requested_on
                        ,(case when COALESCE(odr.requested_by, '') NOT ILIKE  'DISTRIBUTOR%' then (COALESCE(sdr.first_name,'') || ' ' || COALESCE(sdr.last_name,'')) else COALESCE(up.name,'-') end) AS requested_by
                        ,(case when COALESCE(odr.requested_by, '') NOT ILIKE  'DISTRIBUTOR%' then COALESCE(sdr.email,'-') else COALESCE(up.email,'-') end) AS requested_by_email
                        ,odr.responded_on
                        ,case when odr.responded_by IS NOT NULL then ARRAY_AGG(COALESCE(sdr2.first_name,'') || ' ' || COALESCE(sdr2.last_name,'')) else NULL end AS responded_by
                        ,case when odr.responded_by IS NOT NULL then ARRAY_AGG(COALESCE(sdr2.email,'-')) else NULL end AS responded_by_email
                        ,dmp.max_pdp_day
                    FROM order_approval_requests odr
                    INNER JOIN user_profile up ON (odr.distributor_id = up.id)
                    INNER JOIN distributor_master dm ON (odr.distributor_id = dm.profile_id AND dm.area_code IS NOT NULL)
                    INNER JOIN group5_master gm ON (dm.group5_id = gm.id AND gm.description IS NOT NULL)
                    LEFT JOIN sales_hierarchy_details sdr ON (COALESCE(odr.requested_by, '') NOT ILIKE  'DISTRIBUTOR%' AND sdr.user_id = SPLIT_PART(odr.requested_by,'#',1))
                    LEFT JOIN 
                        LATERAL unnest(odr.responded_by) AS res_by(user_id) ON true
                    LEFT JOIN 
                        sales_hierarchy_details sdr2 ON sdr2.user_id = SPLIT_PART(res_by.user_id,'#',1)
                    LEFT JOIN db_max_pdp dmp on dmp.distributor_id = odr.distributor_id
                    WHERE odr.po_number IS NOT NULL ${typeStatement} ${regionStatement} ${areaStatement} ${dbListStatement} ${statusStatement} ${searchStatement} ${startDateStatement} ${endDateStatement} 
                    GROUP BY odr.id
                        ,odr.distributor_id
                        ,up.name
                        ,gm.description
                        ,dm.area_code
                        ,odr.po_number
                        ,odr.so_number
                        ,odr.amount
                        ,odr.status
                        ,odr.type
                        ,odr.reason
                        ,odr.comments
                        ,odr.requested_on
                        ,sdr.first_name
                        ,sdr.last_name
                        ,sdr.email
                        ,up.email
                        ,odr.responded_on
                        ,dmp.max_pdp_day
                    ORDER BY odr.requested_on DESC;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if(result?.rowCount){
                const selectedRows = (limit !=null && offset !=null)? result.rows.slice(+offset, +offset + +limit) : result.rows;
                return { rows: selectedRows, rowCount: selectedRows.length, totalCount: result.rowCount };
            }
            return { rows: [], rowCount: 0, totalCount: 0 };
        } catch (error) {
            logger.error("inside RushOrderModel -> fetchOrderRequests, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
          }
    },

    async fetchApprovalCount(user_id: string) 
    {
        logger.info("inside RushOrderModel -> fetchApprovalCount, email: "+ user_id);

        let client: PoolClient| null = null;
        try {
        
        const sqlStatement = `
                SELECT count(oar.id)
                FROM order_approval_requests oar
                WHERE EXTRACT(MONTH FROM oar.responded_on) = EXTRACT(MONTH FROM current_date)
                    AND EXTRACT(YEAR FROM oar.responded_on) = EXTRACT(YEAR FROM current_date)
                    AND oar.status = 'APPROVED'
                    AND oar.responded_by ILIKE '${user_id}%';
                `;
        client = await conn.getReadClient();
        const result = await client.query(sqlStatement);
        if(result?.rowCount){
            return result.rows[0];
        }
        return null;
        } catch (error) {
            logger.error("inside RushOrderModel -> fetchApprovalCount, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
            }
    },

    async setExpired() 
    {
        logger.info("inside RushOrderModel -> setExpired: ");

        let client: PoolClient| null = null;
        try {
            const ro_expriry = await utilModel.getAppSettings(['RO_EXPIRY_WINDOW']);
            const ro_expriry_2 = await utilModel.getAppSettings(['RO_EXPIRY_WINDOW_2']);
            if(ro_expriry?.length && ro_expriry_2?.length){
                const expiry_hours = +(ro_expriry[0]?.value);
                const expiry_hours_2 = +(ro_expriry_2[0]?.value);
                let sqlStatement = `
                    WITH response AS (
                        SELECT
                            DISTINCT ON (oar.po_number) po_number,
                            EXTRACT(EPOCH FROM (now()-oar.requested_on))/3600 AS request_age,
                            (
                            SELECT 
                                EXTRACT(EPOCH FROM (now()-v))/3600
                            FROM unnest(oar.responded_on) 
                            WITH ORDINALITY AS t (v, o) 
                            ORDER BY o DESC 
                            LIMIT 1
                            ) AS last_response_age,
                            COALESCE (array_length(oar.responded_on, 1), 0) AS number_of_response 
                        FROM
                            order_approval_requests oar
                        WHERE
                            oar.status = 'PENDING' AND oar.type = 'RUSH'
                        ),
                    expired_requests AS (
                        SELECT
                            r.po_number,
                            CASE
                            WHEN r.last_response_age IS NULL THEN r.request_age > t.expiry_windows[number_of_response + 1]
                            WHEN r.last_response_age IS NOT NULL THEN r.last_response_age > t.expiry_windows[number_of_response + 1] 
                            END AS is_expired
                        FROM response r
                        CROSS JOIN (VALUES (ARRAY[${expiry_hours},${expiry_hours_2}])) AS t(expiry_windows)),
                    update_requests AS (
                        UPDATE order_approval_requests oar
                        SET status='EXPIRED', so_number= 'NA', amount= 'NA'
                        FROM expired_requests er
                        WHERE oar.po_number = er.po_number AND er.is_expired = TRUE
                        RETURNING oar.po_number)
                    UPDATE orders o
                    SET updated_on= now(), deleted= true , so_number = 'NA' , so_value = 'NA' 
                    FROM update_requests ur
                    WHERE o.po_number = ur.po_number
                    RETURNING o.po_number;`;
                client = await conn.getWriteClient();
                const result = await client.query(sqlStatement);
                const pos_expired = result?.rows.map((row: any) => row.po_number).join(',');
                logger.info("inside RushOrderModel -> setExpired, pos_expired: "+ pos_expired);
                return pos_expired;
            }
            logger.info("inside RushOrderModel -> setExpired, rush order expiry windows not found");
            return null;
        } catch (error) {
            logger.error("inside RushOrderModel -> setExpired, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
          }
    },

    async insertOrderRequest(po_number: string, requestId: string, reason: string, comments: string | undefined) {
        logger.info(`inside RushOrderModel -> insertOrderRequest, po_number: ${po_number}`);
        let client: PoolClient | null = null;
        const comment_data = comments ?? '';
        const sqlStatement = `
        INSERT
            INTO
            order_approval_requests (
                distributor_id,
                po_number,
                "type",
                requested_by,
                request_number,
                amount,
                reason,
                comments
            )
        SELECT
            distributor_id ,
            po_number ,
            order_type,
            COALESCE (created_by, 'DISTRIBUTOR') || '#' || COALESCE (created_by_user_group, 'DB') AS created_by,
            $2 AS request_number,
            (order_data -> 'OrderAmount')::jsonb #>> '{}' AS amount,
            $3 AS reason,
            $4 AS comments
        FROM
            orders
        WHERE
            po_number = $1
        ON
            CONFLICT (po_number) DO
        UPDATE
        SET
            distributor_id = EXCLUDED.distributor_id,
            "type" = EXCLUDED."type",
            requested_by = EXCLUDED.requested_by,
            requested_on = now(),
            amount = EXCLUDED.amount,
            reason = EXCLUDED.reason,
            comments = EXCLUDED.comments
        RETURNING distributor_id, amount;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [po_number, requestId, reason, comment_data]);
            return result?.rows[0] ?? null;
        } catch (error) {
            logger.error("inside RushOrderModel -> insertOrderRequest, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
            }
    },

    
    async fetchRORequest(po_number: string) {
        logger.info('inside RushOrderModel -> fetchRORequest, po_number: '+ po_number);
        let client: PoolClient | null = null;
        try {
          client = await conn.getReadClient();
          const sqlStatement = `SELECT * FROM order_approval_requests WHERE po_number = $1;`;
          const result = await client.query(sqlStatement, [po_number]);

          return result?.rows[0] ?? {};
    
        } catch (error) {
          logger.error('inside RushOrderModel -> fetchRORequest, Error: ', error);
          return {};
        } finally {
          client?.release();
        }
      },
    async updateOrderRequest(queryParams: {
                                        distributor_id: string,
                                        po_number: string,
                                        so_number: string | null,
                                        so_amount: string | null,
                                        status: string,
                                        responded_by: string,
                                        role: string[],
                                        reject_comments?: string,
                                    }) 
    {
        logger.info(`inside RushOrderModel -> updateOrderRequest, queryParams: ${queryParams}`);
        let client: PoolClient | null = null;
        try {
            const { distributor_id, po_number, so_number, so_amount, status, responded_by, role, reject_comments } = queryParams;
            const so_num = so_number ? so_number : 'NA';
            const so_amt = so_amount ? so_amount : 'NA';
            const responded = responded_by+'#'+role.join(',');
            const sqlStatement = `
                    UPDATE order_approval_requests
                    SET  so_number= $3
                        ,amount= $4
                        ,status= $5::order_approval_status
                        ,responded_on= COALESCE(responded_on, ARRAY[]::timestamptz[]) || ARRAY[now()]
                        ,responded_by= COALESCE(responded_by, ARRAY[]::varchar[]) || ARRAY[$6]
                        ,response_comment = $7
                    WHERE distributor_id= $1 AND po_number= $2 
                        AND status = 'PENDING'::order_approval_status;
                            `;
            client = await conn.getWriteClient();
            let result;
            if(status === 'PENDING'){
                const query = `
                    UPDATE order_approval_requests
                    SET  responded_on= COALESCE(responded_on, ARRAY[]::timestamptz[]) || ARRAY[now()]
                        ,responded_by= COALESCE(responded_by, ARRAY[]::varchar[]) || ARRAY[$3]
                    WHERE distributor_id= $1 AND po_number= $2 
                    AND status = 'PENDING'::order_approval_status;`;
                result = await client.query(query,[distributor_id,po_number,responded]);
            }else{
                result = await client.query(sqlStatement, [distributor_id, po_number, so_num, so_amt, status, responded, reject_comments]);
            }
            
            if(result?.rowCount){
                if(status === 'REJECTED'){
                    const sqlStatement = `UPDATE orders
                                        SET updated_on= now(), deleted= true , so_number = 'NA' , so_value = 'NA' 
                                        WHERE distributor_id = $1 AND po_number = $2;`;
                    const result = await client.query(sqlStatement,[distributor_id,po_number]);
                }
                
                return true;
            }
            return false;
        } catch (error) {
            logger.error("inside RushOrderModel -> updateOrderRequest, Error: ", error);
            return false;
        } finally {
            if (client != null)
                client.release();
            }
    },

    async fetchOrderRequestByPO(poNumber: string) 
    {
        logger.info("inside RushOrderModel -> fetchOrderRequestByPO, poNumber: "+ poNumber);

        let client: PoolClient| null = null;
        try {
        
        const sqlStatement = `
                SELECT oar.id
                    ,oar.request_number
                    ,oar.distributor_id
                    ,oar.po_number
                    ,oar.so_number
                    ,oar.amount
                    ,oar.status
                    ,oar.type
                    ,oar.requested_on
                    ,oar.requested_by
                    ,oar.reason
                    ,oar.comments
                    ,oar.response_comment
                    ,oar.responded_on
                    ,oar.responded_by
                    ,case when oar.responded_by IS NOT NULL then ARRAY_AGG(COALESCE(sdr.email,'-')) else NULL end AS responded_by_email
                FROM order_approval_requests oar
                LEFT JOIN 
                    LATERAL unnest(oar.responded_by) AS res_by(user_id) ON true
                LEFT JOIN 
                    sales_hierarchy_details sdr ON sdr.user_id = SPLIT_PART(res_by.user_id,'#',1)
                WHERE po_number = $1
                GROUP BY oar.id
                    ,oar.request_number
                    ,oar.distributor_id
                    ,oar.po_number
                    ,oar.so_number
                    ,oar.amount
                    ,oar.status
                    ,oar.type
                    ,oar.requested_on
                    ,oar.requested_by
                    ,oar.reason
                    ,oar.comments
                    ,oar.response_comment
                    ,oar.responded_on
                    ,oar.responded_by;
                `;
        client = await conn.getReadClient();
        const result = await client.query(sqlStatement,[poNumber]);
        if(result?.rowCount){
            return result.rows[0];
        }
        return null;
        } catch (error) {
            logger.error("inside RushOrderModel -> fetchOrderRequestByPO, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
            }
    },

    async updateOrderRequestFromOrders(po_number: string, user_id: string, role: string[]){
        logger.info("inside RushOrderModel -> updateOrderRequestFromOrders, po_number: "+ po_number);
        let client: PoolClient | null = null;
        try {
            const responded_by = user_id+'#'+role.join(',');
            const sqlStatement = `
                            UPDATE order_approval_requests AS oar
                            SET 
                                so_number = o.so_number,
                                amount = o.so_value,
                                status = 'APPROVED'::"order_approval_status",
                                responded_on= COALESCE(responded_on, ARRAY[]::timestamptz[]) || ARRAY[now()],
                                responded_by= COALESCE(responded_by, ARRAY[]::varchar[]) || ARRAY[$2]
                            FROM orders AS o 
                            WHERE o.po_number = $1 AND o.po_number_index = 1 AND o.so_value IS NOT NULL AND oar.po_number = $1 AND oar.status = 'PENDING'::"order_approval_status"
                            RETURNING o.so_value;`;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [po_number, responded_by]);
            if(result?.rowCount){
                return result.rows[0].so_value;
            }
            return false;
        } catch (error) {
            logger.error("inside RushOrderModel -> updateOrderRequestFromOrders, Error: ", error);
            return false;
        } finally {
            if (client != null)
                client.release();
            }
    },

    async fetchOrderRequestReasons(type:string) {
        logger.info('inside RushOrderModel -> fetchOrderRequestReasons: '+ type);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT src."label", src.description
                                FROM service_request_categories src
                                WHERE src."type" = $1 AND src.status  = 'ACTIVE';`;
            const result = await client.query(sqlStatement,[type]);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('inside RushOrderModel -> fetchOrderRequestReasons, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchPendingRequests() 
    {
        logger.info("inside RushOrderModel -> fetchPendingRequests: ");

        let client: PoolClient| null = null;
        try {
            const ro_expriry = await utilModel.getAppSettings(['RO_EXPIRY_WINDOW']);
            const ro_expriry_2 = await utilModel.getAppSettings(['RO_EXPIRY_WINDOW_2']);
            if(ro_expriry?.length && ro_expriry_2?.length){
                const expiry_hours = +(ro_expriry[0]?.value);
                const expiry_hours_2 = +(ro_expriry_2[0]?.value);
                let sqlStatement = `
                    WITH response AS (
                        SELECT
                            DISTINCT ON (oar.po_number) po_number,
                            EXTRACT(EPOCH FROM (now()-oar.requested_on))/3600 AS request_age,
                            (
                            SELECT 
                                EXTRACT(EPOCH FROM (now()-v))/3600
                            FROM unnest(oar.responded_on) 
                            WITH ORDINALITY AS t (v, o) 
                            ORDER BY o DESC 
                            LIMIT 1
                            ) AS last_response_age,
                            COALESCE (array_length(oar.responded_on, 1), 0) AS number_of_response 
                        FROM
                            order_approval_requests oar
                        WHERE
                            oar.status = 'PENDING' AND oar.type = 'RUSH'
                        )
                    ,expired_requests AS (
                        SELECT
                            r.po_number,
                            CASE
                            WHEN r.last_response_age IS NULL THEN r.request_age > t.expiry_windows[number_of_response + 1]
                            WHEN r.last_response_age IS NOT NULL THEN r.last_response_age > t.expiry_windows[number_of_response + 1] 
                            END AS is_expired
                        FROM response r
                        CROSS JOIN (VALUES (ARRAY[${expiry_hours},${expiry_hours_2}])) AS t(expiry_windows)
                    )
                    SELECT oar.request_number
                        ,oar.po_number 
                        ,oar.distributor_id 
                        ,up."name" AS distributor_name
                        ,gm.description AS region_id
                        ,dm.area_code
                        ,oar.requested_on AS created_on
                        ,oar.amount
                        ,gm.rsm_code
                        ,shd.email AS rsm_email
                        ,CASE WHEN shd.email IS NOT NULL THEN shd.first_name || ' ' || shd.last_name
                         ELSE ''
                         END AS rsm_name
                        ,gm.cluster_code
                        ,shd2.email AS cluster_email
                        ,CASE WHEN shd2.email IS NOT NULL THEN shd2.first_name || ' ' || shd2.last_name 
                         ELSE ''
                         END AS cluster_name
                        ,CASE WHEN oar.responded_by IS NULL OR ARRAY_LENGTH(oar.responded_by,1) = 0 THEN 'PENDING WITH APPROVER 1'
                        ELSE 'PENDING WITH APPROVER 2' 
                        END AS status 
                    FROM order_approval_requests oar
                    INNER JOIN expired_requests er ON (er.is_expired = FALSE AND oar.po_number  = er.po_number)
                    INNER JOIN distributor_master dm ON (oar.distributor_id = dm.id)
                    INNER JOIN user_profile up ON (dm.id = up.id)
                    INNER JOIN group5_master gm ON (gm.id = dm.group5_id)
                    LEFT JOIN sales_hierarchy_details shd ON (shd.deleted = FALSE AND shd.status = 'ACTIVE' AND gm.rsm_code = shd.code)
                    LEFT JOIN sales_hierarchy_details shd2 ON (shd2.deleted = FALSE AND shd2.status = 'ACTIVE' AND gm.cluster_code = shd2.code)
                    WHERE oar.status::text = 'PENDING' ;
                `;
                client = await conn.getWriteClient();
                const result = await client.query(sqlStatement);
                
                return result?.rows ?? [];
            }
            logger.info("inside RushOrderModel -> fetchPendingRequests, rush order expiry windows not found");
            return null;
        } catch (error) {
            logger.error("inside RushOrderModel -> fetchPendingRequests, Error: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
          }
    },

};