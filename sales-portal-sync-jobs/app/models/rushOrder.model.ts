import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import { UtilModel } from './UtilModel';

export const RushOrderModel = {

    async setExpired() 
    {
        logger.info("inside  SyncJob-> RushOrderModel -> setExpired: ");

        let client: PoolClient| null = null;
        try {
            const ro_expriry = await UtilModel.getAppSettings(['RO_EXPIRY_WINDOW']);
            const ro_expriry_2 = await UtilModel.getAppSettings(['RO_EXPIRY_WINDOW_2']);
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

  
};