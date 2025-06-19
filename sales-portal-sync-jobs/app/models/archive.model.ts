import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';

const conn = PostgresqlConnection.getInstance();

const ArchiveModel = {
    async reindexEmailSmsLogTable() {
        logger.info('inside ArchiveModel -> reindexEmailSmsLogTable');
        let client: PoolClient | null = null;
        const sqlStatement = `
            REINDEX TABLE email_logs;
            REINDEX TABLE audit.sms_logs;
        `;
        try {
            client = await conn.getWriteClient();
            const response = await client?.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArchiveModel -> reindexEmailSmsLogTable, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async reindexAutoClosureRelatedTables() {
        logger.info('inside ArsArchiveModel -> reindexAutoClosureRelatedTables');
        let client: PoolClient | null = null;
        const sqlStatement = `
    REINDEX TABLE audit.auto_closure_gt_so_audit_report;
    `;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> reindexAutoClosureRelatedTables, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async autoClosureReportTableCleanup() {
        /**
         * Till the SO# si sent to SAP, the material will be empty.
         * But once the SO# is sent to SAP, we will get the materials in response.
         * Then the previous records with the same SO# and empty material should be deleted.
         */
        logger.info('inside ArsArchiveModel -> autoClosureReportTableCleanup');
        let client: PoolClient | null = null;
        const sqlStatement = `
    WITH ranked_records AS (
        SELECT
            id,
            so_number,
            material,
            updated_on,
            so_sent_to_sap,
            ROW_NUMBER() OVER (PARTITION BY so_number ORDER BY updated_on DESC) AS row_num
        FROM
            audit.auto_closure_gt_so_audit_report
    ),
    material_present AS (
        SELECT
            so_number
        FROM
            audit.auto_closure_gt_so_audit_report
        WHERE
            material IS NOT NULL
        GROUP BY
            so_number
    )
    DELETE FROM audit.auto_closure_gt_so_audit_report
    WHERE
        id IN (
            SELECT
                r.id
            FROM
                ranked_records r
            JOIN
                material_present mp ON r.so_number = mp.so_number
            WHERE
                r.material IS NULL
                and r.so_sent_to_sap = FALSE
                AND r.row_num > 1
        );
    `;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> autoClosureReportTableCleanup, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async autoClosureMtReportTableCleanup() {
        logger.info('inside ArsArchiveModel -> autoClosureMtReportTableCleanup');
        let client: PoolClient | null = null;
        const sqlStatement = `
            WITH ranked_records AS (
                SELECT
                    id,
                    so_number,
                    material,
                    updated_on,
                    so_sent_to_sap,
                    ROW_NUMBER() OVER (PARTITION BY so_number ORDER BY updated_on DESC) AS row_num
                FROM
                    audit.auto_closure_mt_so_audit_report
            ),
            material_present AS (
                SELECT
                    so_number
                FROM
                    audit.auto_closure_mt_so_audit_report
                WHERE
                    material IS NOT NULL
                GROUP BY
                    so_number
            )
            DELETE FROM audit.auto_closure_mt_so_audit_report
            WHERE
                id IN (
                    SELECT
                        r.id
                    FROM
                        ranked_records r
                    JOIN
                        material_present mp ON r.so_number = mp.so_number
                    WHERE
                        r.material IS NULL
                        and r.so_sent_to_sap = FALSE
                        AND r.row_num > 1
                );
        `;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> autoClosureMtReportTableCleanup, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },
};
export default ArchiveModel;
