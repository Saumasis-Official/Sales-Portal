import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import AllocationAudit from '../interfaces/allocationAudit';

const conn = PostgresqlConnection.getInstance();

export const AuditModel = {
    async upsertAosLogs(data) {
        let client: PoolClient | null = null;
        try {
            const columns: string[] = [];
            const values: string[] = [];
            const exclusion: string[] = [];
            columns.push('distributor_code');
            values.push(`'${data.distributor_code}'`);
            columns.push('order_date');
            values.push('current_date');
            exclusion.push('updated_on = now()');

            columns.push('errors');
            if (data.errors) {
                values.push(`'${data.errors.replace(/'/g, "''")}'`);
            } else {
                values.push('NULL');
            }
            exclusion.push('errors = EXCLUDED.errors');

            if (data.soq_calculations) {
                columns.push('soq_calculations');
                values.push(`'${JSON.stringify(data.soq_calculations)}'`);
                exclusion.push('soq_calculations = EXCLUDED.soq_calculations');
            }

            const columnsStr = columns.join(', ');
            const valuesStr = values.join(', ');
            const exclusionStr = exclusion.join(', ');

            const query = `
                INSERT INTO audit.aos_workflow (${columnsStr})
                VALUES (${valuesStr})
                ON CONFLICT (distributor_code, order_date) DO UPDATE
                    SET ${exclusionStr}
            `;
            client = await conn.getWriteClient();
            await client.query(query);
            logger.info(`AOS log upsert done ${data.distributor_code}`, columns);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in AuditModel -> upsertAosLogs', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async upsertForecastDistributionLogs(
        data: AllocationAudit[],
    ) {
        logger.info('Inside AuditModel->upsertForecastDistributionLogs');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sql = ` 
                INSERT INTO audit.forecast_distribution_logs_audit (area_code, psku, applicable_month, payload, created_on, error_log, query)
                SELECT area_code, psku, applicable_month, payload, NOW(), error_log, query
                FROM jsonb_populate_recordset(NULL::audit.forecast_distribution_logs_audit, $1::jsonb)
            `;
            client.query(sql, [JSON.stringify(data)]);
        } catch (error) {
            logger.error('CAUGHT : Error in AuditModel->upsertForecastDistributionLogs: ', error);
        } finally {
            client?.release();
        }
    },
};
