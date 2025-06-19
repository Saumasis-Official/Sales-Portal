/**
 * @file user.model
 * @description defines user model methods
*/

import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { cli } from 'winston/lib/winston/config';
const conn  = PostgresqlConnection.getInstance();
export const SapModel = {

    /**
     * returns data
     * @param login_id - where condition
    */

    async getAppLevelSettingsByKeys(keys: string) {
        let client : PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `Select key, value FROM app_level_settings WHERE key IN (${keys}) `;
            const res = await client.query(sqlStatement);
            
            return res;
        } catch (error) {
           
            logger.info('Error in getAppLevelSettingsByKeys: ', error);
            return null;
        }
        finally {
            client?.release();
        }
    },


}

