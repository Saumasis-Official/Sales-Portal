/**
 * @file admin.model
 * @description defines admin model methods
*/

import pool from '../lib/postgresql';
import logger from '../lib/logger';
import commonHelperModel from '../models/helper.model';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';

const conn  = PostgresqlConnection.getInstance();
export const AdminModel = {

    async getGlobalEmailConfig() {
        logger.info('Inside AdminModel -> getGlobalEmailConfig');
       
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select als.key, als.value from app_level_settings als where als.key = 'ENABLE_NOTIFICATIONS'`;
            const response = await client.query(sqlStatement);
            return response?.rows[0]?.value;
        } catch (e) {
            logger.error('error in get notifications config query', e);
            return null;
        }finally{
            if (client != null) {
                client.release();
            }
        }
   },
   
    async adminDetailsStatement(email: string) {
        logger.info(`inside model AdminModel.adminDetailsStatement`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${email}') AND deleted=false AND status='ACTIVE'`
            const rows = await client.query(sqlStatement);
          
            return rows
        } catch (error) {
            logger.error(`error in AdminModel.adminDetailsStatement: `, error);
      
            return null;
        }
        finally {
            client?.release();
        }
    },
    async validateDistAdminOrTseStatement(adminId: string, distributorId: string) {
        
        logger.info(`inside model AdminModel.validateAdminStatement`);
       
        let client: PoolClient | null = null;

         try {
            client = await conn.getReadClient();
            let sqlStatement =
                `SELECT id FROM distributor_master WHERE id = '${distributorId}' AND deleted IS false AND tse_code IN ${commonHelperModel.tseHierarchyQuery(adminId)}`;
            const { rows } = await client.query(sqlStatement);
            if(!rows[0]){
                let sqlStatement =
                `SELECT id FROM distributor_master WHERE id = '${distributorId}' AND deleted IS false AND area_code IN ${commonHelperModel.asmHierarchyQuery(adminId)}`;
                const { rows } = await client.query(sqlStatement);
          
            return rows;
            }else{
            return rows;}
        } catch (error) {
            logger.error(`error in AdminModel.validateAdminStatement: `, error);
            
            return null;
        }
        finally {
            client?.release();
        }
    },
    async validateTseAdminStatement(adminCode: string, distributorId: string) {
        logger.info(`inside model AdminModel.validateTseAdminStatement`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE tse_code = '${adminCode}' AND id = '${distributorId}' 
            AND deleted = false`;
            const rows = await client.query(sqlStatement);
          
            return rows
        } catch (error) {
            logger.error(`error in AdminModel.validateTseAdminStatement: `, error);
           return null;
        }
        finally {
            client?.release();
        }
    },
    async validateSuperAdminStatement(distributorId: string) {
        let client: PoolClient | null = null;
        logger.info(`inside model AdminModel.validateSuperAdminStatement`);
           client = await conn.getReadClient();
        try {
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE id = '${distributorId}' AND deleted = false`;
            const rows = await client.query(sqlStatement);
            
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateSuperAdminStatement: `, error);
         
            return null;
        }
        finally {
            client?.release();
        }
    },
    
   

    

   

    async updateContactDetailsHistory(distributorId: string,
        contactDetailChanges:
            {
                update_mobile?: string,
                update_email?: string
            },
        changedBy: string,
        remark: string
    ) {
        let client: PoolClient | null = null;
        logger.info(`inside model AdminModel.updateContactDetailsHistory`);
        client = await conn.getWriteClient();
        logger.info(`distributor id: ${distributorId}, changed by: ${changedBy}`);
        try {
            const updateContactDetailsHistoryStatement = `INSERT INTO alert_history(alert_setting_changes, remarks, distributor_id, changed_by) VALUES('${JSON.stringify(contactDetailChanges)}', '${remark}', '${distributorId}', '${changedBy}')`;
            const updateContactDetailsHistoryResponse = await client.query(updateContactDetailsHistoryStatement);
            return updateContactDetailsHistoryResponse;
        } catch (error) {
            logger.error(`error in AdminModel.updateContactDetailsHistory: `, error);
           
            return null;
        }
        finally {
            client?.release();
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
      }
};
