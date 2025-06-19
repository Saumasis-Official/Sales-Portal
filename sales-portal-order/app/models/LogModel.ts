/**
 * @file log model
 * @description defines log model methods
*/
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';

export const LogModel = {

    async insertSyncLog(type: string, result: string, data: { upsertCount: number, deleteCount: number } | null = null, distributorId: string | null = null, error: string | null = null, isCronJob: boolean = false) {
        let client: PoolClient| null = null;
        try {
            logger.info(`inserting sync log`);
            let insertLogStatement =
                "INSERT INTO sync_logs(type, run_at, result, upsert_count, delete_count, distributor_id, error_log,is_cron_job) VALUES('" + type + "',CURRENT_TIMESTAMP,'" + result + "'";
            if (result === 'SUCCESS' && data && !isNaN(data.upsertCount) && !isNaN(data.deleteCount)) {
                logger.info(`if - success result case`);
                insertLogStatement += "," + data.upsertCount + "," + data.deleteCount;
            } else {
                logger.info(`else - success result case`);
                insertLogStatement += "," + null + "," + null;
            }
            if (distributorId) {
                logger.info(`if - distributor id`);
                insertLogStatement += "," + distributorId;
            } else {
                logger.info(`else - distributor id`);
                insertLogStatement += "," + null;
            }
            if (error) {
                logger.info(`if error`);
                insertLogStatement += `,'${error}'`;
            } else {
                logger.info(`else if not error`);
                insertLogStatement += "," + null;
            }
            insertLogStatement += "," + isCronJob + ")";
            if (type === 'SO') {
                logger.info(`if type is SO`);
                insertLogStatement += " ON CONFLICT (distributor_id) DO UPDATE SET run_at = EXCLUDED.run_at, result = EXCLUDED.result, upsert_count = EXCLUDED.upsert_count, delete_count = EXCLUDED.delete_count";
            }
            logger.info(`SYNC LOG SQL STATEMENT: ${insertLogStatement}`);
            client = await conn.getWriteClient();
            const insertLogResponse = await client.query(insertLogStatement);
            logger.info(`Successfully created sync log`);
            return insertLogResponse;
        } catch (error) {
            logger.info(`error in LogModel.insertSyncLog`, error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async checkSyncLog(distributorId: string) {
        let client: PoolClient| null = null;
        try {
            const checkSyncLogSqlStatement = `SELECT COUNT(*) FROM sync_logs WHERE type='SO' AND result='SUCCESS' AND distributor_id = '${distributorId}'`;
            client = await conn.getReadClient();
            const checkSyncLogResponse = await client.query(checkSyncLogSqlStatement);
            return checkSyncLogResponse;
        } catch (error) {
            logger.info(`error in UtilModel.checkSyncLog`, error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, cc?: string[] | string, bcc?: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null,
        created_by: string | null | undefined = null,
    ) {
        logger.info("inside LogModel -> insertEmailLogs");
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const createdBy = created_by ? created_by : 'SYSTEM_GENERATED';
            const sqlStatement = `INSERT INTO email_logs (type, status, recipients, reference, email_data, error_logs, subject, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
            const response = await client.query(sqlStatement, [type, status, JSON.stringify(recipients), reference, email_data, error, subject, createdBy]);
            return response?.rowCount;
        } catch (error) {
            logger.error("Error in LogModel -> insertEmailLogs", error);
            return false;
        } finally {
            client?.release();
        }
    },

};

