/**
 * @file log model
 * @description defines log model methods
*/
import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

export const LogModel = {

    async insertEmailLogs(
        type: string,
        status: string,
        subject: string,
        recipients: { to: string[] | string, from: string },
        reference: string | null = null,
        email_data: any = null,
        error: any = null,
        created_by: string | null | undefined = null,
    ) {
        logger.info("inside UserModel -> insertEmailLogs");
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const createdBy = created_by ? created_by : 'SYSTEM_GENERATED';
            const sqlStatement = `INSERT INTO email_logs (type, status, recipients, reference, email_data, error_logs, subject, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
            const response = await client.query(sqlStatement, [type, status, JSON.stringify(recipients), reference, email_data, error, subject, createdBy]);
            return response?.rowCount;
        } catch (error) {
            logger.error("Error in UserModel -> insertEmailLogs", error);
            return false;
        } finally {
            client?.release();
        }
    },

    
  async save_req_res(sapResponse, childid){
    let client: PoolClient | null = null;
    try {
       //   Updating MT Requests only if status == 'APPROVED' by APPROVER3
        logger.info(`Inside LogModel -> save_req_res -> MT Credit Extention Request/Response`);
          client = await conn.getWriteClient();
          await client.query('BEGIN');
          const transactionQuery = `UPDATE credit.transactions SET sap_response = $1 WHERE childid = $2`;
          const updateAuditTrail = `Update credit.audit_trail SET sap_response = $1 WHERE childid = $2 AND status = 'APPROVED' AND type = 'APPROVER3'`;
          const values = [sapResponse, childid];
          // Execute both updates
          const [transactionResult, auditResult] = await Promise.all([
          client.query(transactionQuery, values),
          client.query(updateAuditTrail, values)
        ]);
    // Commit transaction
    await client.query('COMMIT');
    return {
        transactionUpdated: transactionResult.rowCount,
        auditUpdated: auditResult.rowCount
    };
    } 
    catch (error) {
      if (client) await client.query('ROLLBACK');
      logger.error(`Error in LogModel -> save_req_res: `, error);
      throw error;
    } finally {
      if (client != null) {
        client.release();
      }
    }
  }

};

