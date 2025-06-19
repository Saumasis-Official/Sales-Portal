import logger from "../lib/logger";
import { PoolClient } from "pg";
import PostgresqlConnection from '../lib/postgresqlConnection';
import { roles, pegasus } from '../../app/constant/persona';
import _ from 'lodash';

const conn = PostgresqlConnection.getInstance();
const InvoiceProcessModel = {
    async getDistributorDetailsForDeliveryCodeCommunication(distributorCodes: string[]) {
        logger.info("inside InvoiceProcessModel -> getDistributorDetailsForDeliveryCodeCommunication");
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            SELECT
                up.id as distributor_code,
                up.name AS distributor_name,
                up.mobile,
                up.email,
                dm.delivery_code_email_enable,
                dm.delivery_code_sms_enable
            FROM
                user_profile up
            INNER JOIN distributor_master dm ON dm.id =  up.id 
            WHERE
                up.id IN ('${distributorCodes.join("' , '")}')
            `;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT: Error in InvoiceProcessModel -> getDistributorDetailsForDeliveryCodeCommunication: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async checkEmailSmsDeliveryStatus(invoices: string[]) { 
        logger.info("inside InvoiceProcessModel -> checkEmailSmsDeliveryStatus");
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
            WITH sms AS (
                SELECT
                    sl.reference AS sms_invoice
                FROM
                    audit.sms_logs sl
                WHERE
                    sl."type" = 'DELIVERY_CODE'
                    AND sl.status = 'SUCCESS'
                    AND sl.reference IN ('${invoices.join("' , '")}')
            ),
            email AS (
                SELECT
                    el.reference AS email_invoice
                FROM
                    public.email_logs el
                WHERE
                    el."type" = 'DELIVERY_CODE'
                    AND el.status = 'SUCCESS'
                    AND el.reference IN('${invoices.join("' , '")}')
            )
            SELECT
                COALESCE(
                    email.email_invoice,
                    sms.sms_invoice
                ) AS invoice,
                email.email_invoice IS NOT NULL AS email_sent,
                sms.sms_invoice IS NOT NULL AS sms_sent
            FROM
                email
            FULL OUTER JOIN sms ON
                email.email_invoice = sms.sms_invoice;
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT: Error in InvoiceProcessModel -> checkEmailSmsDeliveryStatus: ", error);
            throw error;
        } finally {
            client?.release();
        }
    },
    async deliveryCodeReport(
        roles: string[],
        email:string,
        queryParams: {
            search: string | null;
            limit: number | null;
            offset: number | null;
        }
    ) {
        logger.info('inside invoiceProcessModel -> deliveryCodeReport, queryParams: ' + JSON.stringify(queryParams));
        const client: PoolClient | null = await conn.getWriteClient();
        try {
            const { search, limit, offset } = queryParams
            let whereClause = '';
            const queryParamsArray: string[] = [];
            let paramIndex = 1;

            const logistictsSQl = `
                SELECT
                    distinct
                    dm.id
                FROM
                    distributor_master dm
                INNER JOIN distributor_plants dp ON
                    dm.id = dp.distributor_id
                INNER JOIN plant_master pm ON
                    pm.id = dp.plant_id
                    AND pm.status = 'ACTIVE'
                INNER JOIN (
                        SELECT
                            depot_code,
                            distribution_channel,
                            division
                        FROM
                            cfa_depot_mapping
                        WHERE
                            LOWER(email) ILIKE '${email}'
                            OR STRING_TO_ARRAY(LOWER(logistic_email), ',') && ARRAY['${email.toLowerCase()}']
                            OR STRING_TO_ARRAY(LOWER(zone_manager_email), ',') && ARRAY['${email.toLowerCase()}']
                            OR STRING_TO_ARRAY(LOWER(cluster_manager_email), ',') && ARRAY['${email.toLowerCase()}']
                            AND is_deleted = 'false'
                    ) AS cfa ON
                    cfa.depot_code = pm.name
                    AND cfa.distribution_channel = dp.distribution_channel
                    AND cfa.division = dp.division`

            const whereClauseArr: string[] = [];

            if (search) {
                whereClause = ` ( dm.area_code ILIKE $${paramIndex} OR 
                                  gm.description ILIKE $${paramIndex} OR 
                                  up.name ILIKE $${paramIndex} OR 
                                  cd.invoice ILIKE $${paramIndex} OR
                                  dm.id  ILIKE $${paramIndex}) `;
                whereClauseArr.push(whereClause);
                queryParamsArray.push(`%${search}%`);
                paramIndex++;
            }
            if (_.intersection(roles, [...pegasus.LOGISTICS]).length > 0) {
                whereClauseArr.push(` dm.id IN (${logistictsSQl}) `);
            }

            const sqlStatement = `
            WITH sms AS (
                SELECT
                    DISTINCT sl.reference AS invoice,
                    sl.recipients ->> 'mobile' AS mobile,
                    sl.sms_data ->> 'email' AS email,
                    sl.sms_data ->> 'distributor_code' AS distributor_code,
                    sl.status
                FROM
                    audit.sms_logs sl
                WHERE
                    sl."type" = 'DELIVERY_CODE'
            ),
            email AS (
                SELECT
                    DISTINCT el.reference AS invoice,
                    el.email_data ->> 'email' AS email,
                    el.email_data ->> 'mobile' AS mobile,
                    el.email_data ->> 'distributor_code' AS distributor_code,
                    el.status
                FROM
                    public.email_logs el
                WHERE
                    el.TYPE = 'DELIVERY_CODE'
            ),
            consolidated_data AS (
                SELECT
                    DISTINCT
                    COALESCE(s.invoice, e.invoice) AS invoice,
                    COALESCE(s.mobile, e.mobile) AS mobile,
                    COALESCE(s.email, e.email) AS email,
                    COALESCE(s.distributor_code, e.distributor_code) AS distributor_code,
                    COALESCE(s.status = 'SUCCESS', FALSE) AS sms_sent,
                    COALESCE(e.status = 'SUCCESS', FALSE) AS email_sent
                FROM
                    sms s
                FULL OUTER JOIN email e
                ON
                    s.invoice = e.invoice
            )
            SELECT
                gm.description AS region,
                dm.area_code,
                dm.id AS distributor_code,
                up.name,
                cd.invoice AS invoice_number,
                cd.email,
                cd.email_sent AS email_status,
                cd.mobile AS mobile_number,
                cd.sms_sent AS sms_status
            FROM
                consolidated_data cd
            INNER JOIN distributor_master dm ON
                dm.id = cd.distributor_code
            INNER JOIN group5_master gm ON
                gm.id = dm.group5_id
            INNER JOIN user_profile up ON
                up.id = dm.profile_id
            ${whereClauseArr?.length ? `WHERE ${whereClauseArr.join(" and ") }` : ''}
            `;

            const result = await client.query(sqlStatement, queryParamsArray);
          
            if (result?.rowCount) {
                const selectedRows = limit != null && offset != null ? result.rows.slice(+offset, +offset + +limit) : result.rows;
                return {
                    rows: selectedRows,
                    rowCount: selectedRows.length,
                    totalCount: result.rowCount,
                };
            }
            return { rows: [], rowCount: 0, totalCount: 0 };
        }
        catch (error) {
            logger.info(`error in invoiceProcessModel.deliveryCodeReport`, error);
            return null;
        }
        finally {
            client?.release();
        }
    },
      async enableSmsEmailFlagBasedOnPlants() {
            /* https://tataconsumer.atlassian.net/browse/SOPE-5022
            On Distributor sync - > Enable delivery_code_email_enable &  delivery_code_sms_enable flags 
            only for new distributors
            for plants mentioned in app_level_settings  */
            logger.info('Inside UtilModel-> enableSmsEmailFlagBasedOnPlants');
            let client: PoolClient | null = null;
            try {
                client = await conn.getWriteClient();
                const sqlStatement = `WITH enabled_plants AS (
                SELECT unnest(string_to_array(value, ','))::text AS plant_code
                FROM app_level_settings
                WHERE key = 'ENABLE_PLANTS_FOR_DELIVERY_CODE'),
                plant_ids AS (
                SELECT id AS plant_id
                FROM plant_master
                WHERE name IN (SELECT plant_code FROM enabled_plants)),
                eligible_distributors AS (
                SELECT DISTINCT dm.id AS distributor_id
                FROM distributor_master dm
                JOIN distributor_plants dp ON dm.id = dp.distributor_id
                WHERE dp.plant_id IN (SELECT plant_id FROM plant_ids)
                    AND dm.deleted = false
                    AND dm.status = 'ACTIVE'
                    AND dm.created_on::date = current_date
                )
                UPDATE distributor_master dm
                SET 
                delivery_code_sms_enable = true,
                delivery_code_email_enable = true
                FROM eligible_distributors ed
                WHERE dm.id = ed.distributor_id
                RETURNING dm.id;
                `;
                const res = await client.query(sqlStatement);
                logger.info('Inside UtilModel-> enableSmsEmailFlagBasedOnPlants, dbs_updated: ' + res.rows.map((item) => item.id).toString());
                return res?.rowCount;
            } catch (error) {
                logger.error('Inside UtilModel-> enableSmsEmailFlagBasedOnPlants, Error: ', error);
                return null;
            } finally {
                client?.release();
            }
        },

};

export default InvoiceProcessModel;