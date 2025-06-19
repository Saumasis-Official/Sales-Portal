/**
 * @file admin.model
 * @description defines admin model methods
*/

import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

export const AdminModel = {

    async getGlobalEmailConfig() {
        let client: PoolClient| null = null;

        try {
            client = await conn.getReadClient();
            logger.info('inside get notifications config ');
            const sqlStatement = `select als.key, als.value from app_level_settings als where als.key = 'ENABLE_NOTIFICATIONS'`;
            const response = await client.query(sqlStatement);
            return response?.rows[0]?.value;
        } catch (e) {
            logger.error('error in get notifications config query', e);
            return null;
        }finally{
            if (client != null)
                client.release();
        }
   },

    async adminDetailsStatement(email: string) {
        logger.info(`inside model AdminModel.adminDetailsStatement`);
        let client: PoolClient| null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${email}') AND deleted=false AND status='ACTIVE'`
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error(`error in AdminModel.adminDetailsStatement: `, error);
            return null;
        }finally{
            if (client != null)
                client.release();
        }
    },
  
    async validateSuperAdminStatement(distributorId: string) {
        logger.info(`inside model AdminModel.validateSuperAdminStatement`);
        let client: PoolClient| null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE id = '${distributorId}' AND deleted = false`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateSuperAdminStatement: `, error);
            return null;
        }finally{
            if (client != null)
                client.release();
        }
    },

    async validateDistributorAdminMapping(distributorId: string, role: string, code: string = ''){
        logger.info('inside AdminModel -> validateDistributorAdminMapping, distributorId: '+ distributorId+ ' ,role: '+ role);
        let client: PoolClient | null = null;
        try {
          client = await conn.getReadClient();
          const sqlStatement = `
              SELECT dm.tse_code, dm.area_code, gm.rsm_code, gm.cluster_code 
              FROM distributor_master dm 
              INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
              WHERE dm.id = $1;`;
          const result = (await client.query(sqlStatement,[distributorId])).rows || [];
          if(!result.length){
            logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: User is not mapped to given distributorId');
            return false;
          }
          const {tse_code, area_code, rsm_code, cluster_code} = result[0];
          let isMapped = false;
          switch(role){
            case 'ASM':
              isMapped = code.split(',').includes(area_code);
              break;
            case 'RSM':
              isMapped = code === rsm_code;
              break;
            case 'CLUSTER_MANAGER':
              isMapped = code === cluster_code;
              break;
            case 'TSE':
              isMapped = code.split(',').includes(tse_code);
              break;
            default:
              isMapped = true;
              break;
          }
          return isMapped;
        } catch (error) {
          logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: ', error);
          return false;
        } finally {
          client?.release();
        }
    },
};
