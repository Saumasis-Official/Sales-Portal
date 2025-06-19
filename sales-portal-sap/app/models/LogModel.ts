/**
 * @file log model
 * @description defines log model methods
*/
import pool from '../lib/postgresql';
import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import commonHelper from '../helper';
import { AutoClosureLogs } from '../interface/autoClosureInterfaces';
import { AutoClosureAuditTables } from '../../enum/autoClosureAuditTables';

const conn = PostgresqlConnection.getInstance();
export const LogModel = {

    async insertSyncLog(type: string, result: string, data: { upsertCount: number, deleteCount: number } | null = null, distributorId: string | null = null, error: string | null = null, S3FileName: string | null = null, isCronJob: boolean = false) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            // logger.info(`inserting sync log`);
            let insertLogStatement =
                "INSERT INTO sync_logs(type, run_at, result, upsert_count, delete_count, distributor_id, error_log, success_at, filename,is_cron_job) VALUES('" + type + "',CURRENT_TIMESTAMP,'" + result + "'";
            if (result === 'SUCCESS' && data && !isNaN(data.upsertCount) && !isNaN(data.deleteCount)) {
                // logger.info(`if - success result case`);
                insertLogStatement += "," + data.upsertCount + "," + data.deleteCount;
            } else {
                // logger.info(`else - success result case`);
                insertLogStatement += "," + null + "," + null;
            }
            if (distributorId) {
                // logger.info(`if - distributor id`);
                insertLogStatement += "," + distributorId;
            } else {
                // logger.info(`else - distributor id`);
                insertLogStatement += "," + null;
            }
            if (error) {
                // logger.info(`if error`);
                insertLogStatement += `,'${commonHelper.singleQuoteEscape(error)}'`;
                insertLogStatement += "," + null;
            } else {
                // logger.info(`else if not error`);
                insertLogStatement += "," + null;
                insertLogStatement += "," + 'CURRENT_TIMESTAMP';
            }
            if (S3FileName) {
                // logger.info(`if - S3FileName`);
                insertLogStatement += `,'${S3FileName}'`;
            } else {
                // logger.info(`else - S3FileName`);
                insertLogStatement += "," + null;
            }
            insertLogStatement += `,'${isCronJob}')`;
            if (type === 'SO') {
                // logger.info(`if type is SO`);
                insertLogStatement += " ON CONFLICT (distributor_id) DO UPDATE SET run_at = EXCLUDED.run_at, result = EXCLUDED.result, upsert_count = EXCLUDED.upsert_count, delete_count = EXCLUDED.delete_count";
            }
            logger.info(`SYNC LOG SQL STATEMENT: ${insertLogStatement}`);
            const insertLogResponse = await client.query(insertLogStatement);
            // logger.info(`Successfully created sync log`);
            return insertLogResponse;
        } catch (error) {
            logger.info(`error in LogModel.insertSyncLog`, error);

            return null;
        }
        finally {
            client?.release();
        }
    },

    async checkSyncLog(distributorId: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const checkSyncLogSqlStatement = `SELECT COUNT(*) FROM sync_logs WHERE type='SO' AND result='SUCCESS' AND distributor_id = '${distributorId}'`;
            const checkSyncLogResponse = await client.query(checkSyncLogSqlStatement);
            return checkSyncLogResponse;
        } catch (error) {
            logger.info(`error in UtilModel.checkSyncLog`, error);


            return null;
        }
        finally {
            client?.release();
        }
    },

    async insertCreditCrunchNotificationLog(distributorId: string, poNumber: string, to: string[]) {
        logger.info('Inside LogModel -> insertCreditCrunchNotificationLog');
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            let email_to = to.toString();
            const sqlStatement = `INSERT INTO credit_crunch_notifications_log
                                         (distributor_id, po_number, email_to)
                                  VALUES ($1, $2, $3);`;
            const response = await client.query(sqlStatement, [distributorId, poNumber, email_to]);
            if (response.rowCount === 0) {
                logger.info('Inside LogModel -> insertCreditCrunchNotificationLog,Error: Unable to insert data');
                return false;
            }
            else return true;
        } catch (e) {
            logger.error('Inside LogModel -> insertCreditCrunchNotificationLog,Error: ', e);
            return false;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, cc?: string[] | string, bcc?: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null
    ) {
        logger.info("inside LogModel -> insertEmailLogs");
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `INSERT INTO email_logs (type, status, recipients, reference, email_data, error_logs, subject) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
            const response = await client.query(sqlStatement, [type, status, JSON.stringify(recipients), reference, email_data, error, subject]);
            return response?.rowCount;
        } catch (error) {
            logger.error("Error in LogModel -> insertEmailLogs", error);
            return false;
        } finally {
            client?.release();
        }
    },

    async upsertAutoClosureLogs(auditId: string, tableName: AutoClosureAuditTables, data: AutoClosureLogs) {
        logger.info(`inside LogModel -> upsertAutoClosureLogs TableName: ${tableName}, AuditId: ${auditId}`);
        let client: PoolClient | null = null;
        const columns: string[] = [];
        try {
            if (!auditId) {
                return null;
            }
            for (const key in data) {
                if (data[key] !== null) {
                    columns.push(`${key} = '${data[key]}'`);
                }
            }
            const sqlStatement = `
            UPDATE audit.${tableName} set
            ${columns.join(" ,")}
            WHERE audit_id = '${auditId}'
            `;
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response?.rowCount;
        } catch (error) {
            logger.error("CAUGHT: Error in LogModel -> upsertAutoClosureLogs", error);
            return null;
        } finally {
            client?.release();
        }
    },

};

