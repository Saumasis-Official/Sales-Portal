import { PoolClient } from "pg";
import logger from "../lib/logger";
import PostgresqlConnection from "../lib/postgresqlConnection";

const conn = PostgresqlConnection.getInstance();

export const LogModel = {
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
};