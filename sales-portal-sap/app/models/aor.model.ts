import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import commonHelper from '../helper';
import AosLogsDto from '../dto/AosLogsDto';

const conn = PostgresqlConnection.getInstance();

const AutoOrderModel = {
    async updateAosLogs(log: AosLogsDto) {
        logger.info(`inside AutoOrderModel -> updateAosLogs: distributor: ${log.distributor_code}`);
        let client: PoolClient | null = null;
        const column_values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        try {
            if (log.sap_validation_payload_1) {
                column_values.push(`sap_validation_payload_1 = $${paramIndex++}`);
                params.push(JSON.stringify(log.sap_validation_payload_1).replace(/'/g, "''").replace(/%/g, "%%"));
            }
            if (log.sap_validation_payload_2) {
                column_values.push(`sap_validation_payload_2 = $${paramIndex++}`);
                params.push(JSON.stringify(log.sap_validation_payload_2).replace(/'/g, "''").replace(/%/g, "%%"));
            }
            if (log.sap_submit_payload) {
                column_values.push(`sap_submit_payload = $${paramIndex++}`);
                params.push(JSON.stringify(log.sap_submit_payload).replace(/'/g, "''").replace(/%/g, "%%"));
            }
            if (log.sap_submit_response) {
                column_values.push(`sap_submit_response = $${paramIndex++}`);
                params.push(JSON.stringify(log.sap_submit_response).replace(/'/g, "''").replace(/%/g, "%%"));
            }
            if (log.errors) {
                column_values.push(`errors = $${paramIndex++}`);
                params.push(log.errors);
            }
            params.push(log.distributor_code); // Add distributor_code as the last parameter

            const sqlStatement = `
                UPDATE audit.aos_workflow SET
                    updated_on = now(),
                    ${column_values.join(", ")}
                WHERE id = (
                    SELECT id
                    FROM audit.aos_workflow
                    WHERE distributor_code = $${paramIndex} 
                        AND order_date = current_date
                )
            `;

            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, params);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AutoOrderModel -> updateAosLogs", error);
            return null;
        } finally {
            client?.release();
        }
    }

}

export default AutoOrderModel;