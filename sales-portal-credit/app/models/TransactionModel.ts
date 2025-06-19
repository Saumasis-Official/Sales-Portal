/**
 * @file transaction model
 * @description defines transaction model methods
*/
import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

export const TransactionModel = {

    async beginTransaction(syncType: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            logger.info(`Begin ${syncType} sync transaction...`);
            const beginTransactionStatement = `BEGIN`;
            const beginTransactionResponse = await client.query(beginTransactionStatement);
            return beginTransactionResponse;
        } catch (error) {
            logger.info(`error in TransactionModel.beginTransaction`, error);

            return null;
        }
        finally {
            client?.release();
        }
    },

    async commitTransaction(syncType: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            logger.info(`Commit ${syncType} sync transaction...`);
            const commitTransactionStatement = `COMMIT`;
            const commitTransactionResponse = await client.query(commitTransactionStatement);

            return commitTransactionResponse;
        } catch (error) {
            logger.info(`error in TransactionModel.commitTransaction`, error);

            return null;
        }
        finally {
            client?.release();
        }
    },

    async rollbackTransaction(syncType: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            logger.info(`Rollback ${syncType} sync transaction...`);
            const rollbackTransactionStatement = `ROLLBACK`;
            const rollbackTransactionResponse = await client.query(rollbackTransactionStatement);

            return rollbackTransactionResponse;
        } catch (error) {
            logger.info(`error in TransactionModel.rollbackTransaction`, error);

            return null;
        }
        finally {
            client?.release();
        }
    },

};

