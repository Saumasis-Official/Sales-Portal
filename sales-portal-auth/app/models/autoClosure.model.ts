import logger from '../lib/logger';
import { PoolClient } from 'pg';
import { CUSTOMER_GROUPS_FOR_ARS } from '../constant';
import { AutoClosureReportFilter } from '../interface/autoClosureReportFilter';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

export const AutoClosureModel = {
    async fetchAutoClosureGT(orderType: string, limit: number = 10, offset: number = 0) {
        logger.info('inside AutoClosureModel -> fetchAutoClosureGT');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            acg.id,
            acg.order_type,
            acg.customer_group,
            cgm.description AS customer_group_description,
            acg.short_close,
            acg.updated_by AS user_id,
            acg.updated_on,
            acg.remarks,
            shd.first_name,
            shd.last_name
        FROM
            auto_closure_gt acg
        INNER JOIN customer_group_master cgm ON
            cgm."name" = acg.customer_group
        LEFT JOIN sales_hierarchy_details shd ON
            shd.user_id = acg.updated_by
        WHERE
            acg.order_type = $1
            AND acg.deleted = false
            ${orderType == 'ARS' ? `AND acg.customer_group IN ('${CUSTOMER_GROUPS_FOR_ARS.join("' , '")}')` : ''}
            order by acg.customer_group
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [orderType]);
            if (result?.rowCount) {
                let data = result.rows;
                if (limit) {
                    data = result?.rows?.slice(offset, offset + limit);
                }
                return {
                    data: data,
                    total: result.rowCount,
                };
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchAutoClosureGT', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateAutoClosureGT(
        data: {
            id: string;
            short_close: number | null;
            remarks: string;
        }[],
        user_id: string,
    ) {
        /**
         * There is a trigger on auto_closure_gt table which will keep audit of all the changes(before UPDATE, before DELETE)
         * Combination of id and revision_id will be unique, so we can use this to track the changes in audit table.
         */

        logger.info('inside AutoClosureModel -> updateAutoClosureGT');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH updated AS (
            SELECT
                id,
                short_close,
                remarks
            FROM
                jsonb_populate_recordset(
                    NULL::auto_closure_gt,
                    $1
                )
        )
        UPDATE
            auto_closure_gt
        SET
            short_close = updated.short_close,
            remarks = updated.remarks,
            updated_by = $2,
            updated_on = now(),
            revision_id = gen_random_uuid()
        FROM
            updated
        WHERE
            auto_closure_gt.id = updated.id;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data), user_id]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> updateAutoClosureGT', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async multiUpdateAutoClosureGT(orderType: string, shortClose: number | null, remarks: string, userId: string) {
        logger.info('inside AutoClosureModel -> multiUpdateAutoClosureGT');
        let client: PoolClient | null = null;
        const sqlStatement = `
        UPDATE
            public.auto_closure_gt
        SET
            short_close = $1,
            remarks = $2 ,
            updated_by = $3,
            updated_on = now(),
            revision_id = gen_random_uuid()
        WHERE
            order_type = $4
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [shortClose, remarks, userId, orderType]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> multiUpdateAutoClosureGT', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAutoClosureMTEcomSingleGrn(customerGroup: string, limit: number | null, offset: number | null, search: string | null) {
        /**
         * CUSTOMER_GROUP: 14= MT, 16= ECOM
         */
        logger.info('inside AutoClosureModel -> fetchAutoClosureMTEcomSingleGrn');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH single_grn_payer_code AS (
            SELECT
                pcm.payer_code
            FROM
                public.mt_ecom_payer_code_mapping pcm
            JOIN public.mt_ecom_customer_type ctm ON
                pcm.customer_code = ctm.customer_code
            WHERE
                pcm.customer_group = '${customerGroup}'
            GROUP BY
                pcm.payer_code
            HAVING
                COUNT(*) = SUM(CASE WHEN ctm.customer_type = 'Single GRN' THEN 1 ELSE 0 END)
        )
        SELECT
            acme.id,
            acme.revision_id,
            acme.payer_code AS single_grn_code,
            acme.customer_type,
            acme.short_close,
            acme.po_validity,
            acme.remarks,
            acme.deleted,
            acme.updated_by,
            acme.updated_on,
            shd.first_name,
            shd.last_name
        FROM
            public.auto_closure_mt_ecom acme
        INNER JOIN single_grn_payer_code sgpc ON
            sgpc.payer_code = acme.payer_code
        LEFT JOIN sales_hierarchy_details shd ON
            shd.user_id = acme.updated_by
        WHERE
            acme.customer_type = 'SINGLE_GRN'
            AND acme.deleted = FALSE
            ${search ? `AND acme.payer_code ILIKE '%${search}%'` : ''}
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount) {
                let data = result.rows;
                if (limit) {
                    data = result?.rows?.slice(offset, offset + limit);
                }
                return {
                    data: data,
                    total: result.rowCount,
                };
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchAutoClosureMTEcomSingleGrn', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAutoClosureMTEcomSingleGrnCustomerDetails(payerCode: string) {
        logger.info('inside AutoClosureModel -> fetchAutoClosureMTEcomSingleGrnCustomerDetails');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            customer_code,
            customer_name,
            payer_code,
            payer_name
        FROM
            mt_ecom_payer_code_mapping mepcm
        WHERE
            mepcm.payer_code = $1;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [payerCode]);
            if (result?.rowCount) {
                return result.rows;
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchAutoClosureMTEcomSingleGrnCustomerDetails', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchMultiGrnConsolidatedData(customerGroup: string) {
        logger.info('inside AutoClosureModel -> fetchMultiGrnConsolidatedData');
        let client: PoolClient | null = null;
        /**
         * There is a condition where one payer code can be associated with multiple customer groups.
         * In such cases, we need to consider the majority customer group for that payer code.
         * For example, if a payer code 'X' is associated with 5 customer group 14 and 3 customer group 16,
         * then payer code 'X' will be considered as customer group 14.
         */
        const sqlStatement = `
        WITH multi_grn_payer_code AS (
            SELECT
                pcm.payer_code,
                pcm.customer_group,
                COUNT(*) AS group_count,
                ROW_NUMBER() OVER (PARTITION BY pcm.payer_code ORDER BY COUNT(*) DESC) AS rn
            FROM
                public.mt_ecom_payer_code_mapping pcm
            GROUP BY
                pcm.payer_code,
                pcm.customer_group
        ),
        majority_customer_group AS (
            SELECT
                payer_code,
                customer_group
            FROM
                multi_grn_payer_code
            WHERE
                rn = 1
        )
        SELECT
            array_agg(acme.id) AS ids,
            acme.short_close,
            acme.po_validity,
            acme.remarks,
            (array_agg(DISTINCT acme.updated_by))[1] AS updated_by,
            (array_agg(DISTINCT acme.updated_on))[1] AS updated_on
        FROM public.auto_closure_mt_ecom acme
        INNER JOIN majority_customer_group mgpc ON mgpc.payer_code = acme.payer_code
        WHERE
            acme.customer_type = 'MULTI_GRN'
            AND acme.deleted = FALSE
            AND mgpc.customer_group = '${customerGroup}'
        GROUP BY
            acme.short_close,
            acme.po_validity,
            acme.remarks;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchMultiGrnConsolidatedData', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchMultiGrnCustomerDetails(customerGroup: string) {
        logger.info('inside AutoClosureModel -> fetchMultiGrnCustomerDetails');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH multi_grn_payer_code AS (
            SELECT
                pcm.payer_code
            FROM
                public.mt_ecom_payer_code_mapping pcm
            JOIN public.mt_ecom_customer_type ctm ON
                pcm.customer_code = ctm.customer_code
            WHERE
                pcm.customer_group = '${customerGroup}'
            GROUP BY
                pcm.payer_code
            HAVING
                COUNT(*) != SUM(CASE WHEN ctm.customer_type = 'Single GRN' THEN 1 ELSE 0 END)
        )
        SELECT
            mepcm.customer_code,
            mepcm.customer_name,
            mepcm.payer_code,
            mepcm.payer_name
        FROM
            mt_ecom_payer_code_mapping mepcm
        INNER JOIN multi_grn_payer_code mgpc ON
            mgpc.payer_code = mepcm.payer_code
            ORDER BY  mepcm.payer_code, mepcm.customer_code`;

        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchMultiGrnCustomerDetails', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateSingleGrn(
        data: {
            id: string;
            short_close: number | null;
            po_validity: number | null;
            remarks: string;
        }[],
        user_id: string,
    ) {
        logger.info('inside AutoClosureModel -> updateSingleGrn');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH updated AS (
            SELECT
                id,
                short_close,
                po_validity,
                remarks
            FROM
                jsonb_populate_recordset(
                    NULL::auto_closure_mt_ecom,
                    $1
                )
        )
        UPDATE
            auto_closure_mt_ecom
        SET
            short_close = updated.short_close,
            po_validity = updated.po_validity,
            remarks = updated.remarks,
            updated_by = $2,
            updated_on = now(),
            revision_id = gen_random_uuid()
        FROM
            updated
        WHERE
            auto_closure_mt_ecom.id = updated.id;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data), user_id]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> updateSingleGrn', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateMultiGrn(
        data: {
            ids: string[];
            short_close: number | null;
            po_validity: number | null;
            remarks: string;
        },
        user_id: string,
    ) {
        logger.info('inside AutoClosureModel -> updateMultiGrn');
        let client: PoolClient | null = null;
        try {
            const currentTimestamp = new Date().toISOString(); // To ensure that all the records are updated at the same time
            const sqlStatement = `
            UPDATE
                auto_closure_mt_ecom
            SET
                short_close = $1,
                po_validity = $2,
                remarks = $3,
                updated_by = $4,
                updated_on = $5,
                revision_id = gen_random_uuid()
            WHERE
                id IN ('${data?.ids.join("', '")}');
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [data.short_close, data.po_validity, data.remarks, user_id, currentTimestamp]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> updateMultiGrn', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async autoClosureReportGT(filters: AutoClosureReportFilter) {
        logger.info('inside AutoClosureModel -> autoClosureReport');
        let client: PoolClient | null = null;
        try {
            let sqlStatement = `
        SELECT
            so_number AS sales_order,
            po_number,
            db_code,
            customer_group,
            order_date,
            sales_order_type,
            rdd,
            so_validity,
            order_type,
            so_sent_to_sap,
            overall_status,
            job_run AS job_run_date,
            string_agg(
            DISTINCT
            CASE
                WHEN material IS NOT NULL AND material != ''
                THEN CONCAT(TRIM(LEADING '0' FROM material), ': ', sap_message)
                ELSE sap_message
            END,
            '; '
        ) AS sap_message
        FROM
            audit.auto_closure_gt_so_audit_report
            $$WHERE_CONDITIONS$$
        GROUP BY
            so_number,
            po_number,
            db_code,
            customer_group,
            order_date,
            sales_order_type,
            rdd,
            so_validity,
            order_type,
            so_sent_to_sap,
            overall_status,
            job_run
        ORDER BY order_date DESC
        `;

            const conditions: string[] = [];

            if (filters.upload_so && !filters.so_numbers?.length) return { paginatedRows: [], totalCount: 0 };
            if (filters.so_numbers?.length) {
                conditions.push(`so_number IN ('${filters.so_numbers.join("', '")}')`);
            }
            if (filters.order_types?.length) {
                conditions.push(`order_type IN ('${filters.order_types.join("', '")}')`);
            }
            if (filters.sales_order_types?.length) {
                conditions.push(`sales_order_type IN ('${filters.sales_order_types.join("', '")}')`);
            }
            if (filters.search) {
                conditions.push(`(so_number ILIKE '%${filters.search}%' OR po_number ILIKE '%${filters.search}%')`);
            }
            if (filters.order_date_range?.length === 2) {
                conditions.push(`order_date BETWEEN '${filters.order_date_range[0]}' AND '${filters.order_date_range[1]}'`);
            }

            sqlStatement =
                conditions.length > 0 ? sqlStatement.replace('$$WHERE_CONDITIONS$$', `WHERE ${conditions.join(' AND ')}`) : sqlStatement.replace('$$WHERE_CONDITIONS$$', '');

            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            const limit = filters?.limit || 10;
            const offset = filters?.offset || 0;
            const rows = result?.rows || [];
            const totalCount = rows.length;
            const paginatedRows = rows.splice(offset, limit);
            return { paginatedRows, totalCount };
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> autoClosureReport', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAutoClosureMtEcomConfig(limit: number, offset: number) {
        logger.info('inside AutoClosureModel -> fetchAutoClosureMtEcomConfig');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT
                    acmc.id,
                    acmc.customer_group,
                    acmc.short_close_single_grn,
                    acmc.short_close_multi_grn,
                    acmc.remarks,
                    acmc.updated_by,
                    acmc.updated_on,
                    acmc.created_on,
                    acmc.deleted,
                    acmc.revision_id,
                    COALESCE(shd.first_name,'') || ' ' || COALESCE(shd.last_name,'')  AS updated_by_user_name,
                    cgm.description as customer_group_desc,
                    COUNT(*) OVER() AS total_count
                FROM
                    public.auto_closure_mt_ecom_config acmc
                INNER JOIN customer_group_master cgm ON acmc.customer_group = cgm.name
                LEFT JOIN sales_hierarchy_details shd ON acmc.updated_by = shd.user_id
                WHERE 
                    acmc.deleted = FALSE
                ORDER BY acmc.customer_group ASC
                LIMIT ${limit}
                OFFSET ${offset}
            `;
            const result = await client.query(sqlStatement);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> fetchAutoClosureMtEcomConfig', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateAutoClosureMtEcomConfig(payload, userId) {
        logger.info('inside AutoClosureModel -> updateAutoClosureMtEcomConfig');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                UPDATE auto_closure_mt_ecom_config AS target
                SET
                    short_close_single_grn = data.short_close_single_grn,
                    short_close_multi_grn = data.short_close_multi_grn,
                    remarks = data.remarks,
                    updated_on = now(),
                    updated_by = '${userId}'
                FROM
                    jsonb_populate_recordset(NULL::auto_closure_mt_ecom_config, $1) AS data
                WHERE
                    data.id = target.id;
            `;
            const result = await client.query(sqlStatement, [JSON.stringify(payload)]);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel -> updateAutoClosureMtEcomConfig', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateAutoClosureMtEcomMultiUpdate(shortCloseSingleGrn: number | null, shortCloseMultiGrn: number | null, shortCloseRemarks: string, userId: string) {
        logger.info('Inside AutoClosureModel->updateAutoClosureMtEcomMultiUpdate');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                UPDATE
                    auto_closure_mt_ecom_config
                SET
                    short_close_single_grn = $1,
                    short_close_multi_grn = $2,
                    remarks = $3,
                    updated_by = $4,
                    updated_on = now(),
                    revision_id = gen_random_uuid()
            `;
            const result = await client.query(sqlStatement, [shortCloseSingleGrn, shortCloseMultiGrn, shortCloseRemarks, userId]);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel->updateAutoClosureMtEcomMultiUpdate', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async autoClosureReportMT(filter: AutoClosureReportFilter) {
        logger.info('Inside AutoClosureModel -> autoClosureReportMT');
        let client: PoolClient | null = null;
        const whereConditions: string[] = [];
        try {
            client = await conn.getReadClient();
            if (filter.upload_so && !filter.so_numbers?.length) {
                return [];
            }
            if (filter.so_numbers?.length) whereConditions.push(`acmr.so_number IN ('${filter.so_numbers.join("','")}') `);
            if (filter.order_date_range?.length)
                whereConditions.push(`acmr.order_date::date BETWEEN '${filter.order_date_range[0]}'::date AND  '${filter.order_date_range[1]}'::date`);
            if (filter.search)
                whereConditions.push(`acmr.so_number ILIKE '%${filter.search}%' OR acmr.po_number ILIKE '%${filter.search}%' OR acmr.invoice ILIKE '%${filter.search}%'`);
            if (filter.sales_order_types?.length) whereConditions.push(`acmr.sales_order_type IN ('${filter.sales_order_types.join("','")}')`);
            if (filter.customer_groups?.length) whereConditions.push(`acmr.customer_group IN ('${filter.customer_groups.join("','")}')`);
            let sqlStatement = `
                WITH report as (
                    SELECT
                        acmr.so_number AS sales_order,
                        acmr.po_number,
                        acmr.invoice,
                        acmr.invoice_date,
                        acmr.db_code,
                        acmr.customer_type,
                        acmr.customer_group,
                        acmr.order_date,
                        acmr.sales_order_type,
                        acmr.so_validity,
                        acmr.so_sent_to_sap,
                        acmr.overall_status,
                        acmr.job_run::date job_run_date,
                        string_agg(
                            DISTINCT
                            CASE
                                WHEN acmr.material IS NOT NULL AND acmr.material != ''
                                THEN CONCAT(TRIM(LEADING '0' FROM acmr.material), ': ', acmr.sap_message)
                                ELSE sap_message
                            END,
                            '; '
                        ) AS sap_message
                    FROM
                        audit.auto_closure_mt_so_audit_report acmr
                    INNER JOIN
                        audit.auto_closure_mt_ecom_so_audit acmea
                        ON acmea.audit_id = acmr.audit_id
                    ${
                        whereConditions.length
                            ? `WHERE
                        ${whereConditions.join(' AND ')}`
                            : ''
                    }
                    GROUP BY
                        acmr.so_number,
                        acmr.po_number,
                        acmr.invoice,
                        acmr.invoice_date,
                        acmr.db_code,
                        acmr.customer_type,
                        acmr.customer_group,
                        acmr.order_date,
                        acmr.sales_order_type,
                        acmr.so_validity,
                        acmr.so_sent_to_sap,
                        acmr.overall_status,
                        acmr.job_run
                )
                SELECT *, COUNT(*) OVER() as total_rows 
                FROM 
                    report
                ORDER BY order_date DESC
                ${filter.limit ? `LIMIT ${filter.limit}` : ''}
                ${filter.offset ? `OFFSET ${filter.offset}` : ''}
            `;
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureModel->autoClosureReportMT', error);
            return null;
        } finally {
            client?.release();
        }
    },
};
