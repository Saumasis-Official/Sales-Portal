/**
 * @file admin.model
 * @description defines admin model methods
*/

import logger from '../lib/logger';
import commonHelper from '../helper/index';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import _ from 'lodash';
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
    async validateDistAdminOrTseStatement(adminId: string, distributorId: string) {
        logger.info(`inside model AdminModel.validateAdminStatement`);
        let client: PoolClient| null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement =
                `SELECT id FROM distributor_master WHERE id = '${distributorId}' AND deleted IS false AND tse_code IN ${commonHelper.tseHierarchyQuery(adminId)}`;
            const { rows } = await client.query(sqlStatement);
            if(!rows[0]){
                sqlStatement =
                    `SELECT id FROM distributor_master WHERE id = '${distributorId}' AND deleted IS false AND area_code IN ${commonHelper.asmHierarchyQuery(adminId)}`;
                const { rows } = await client.query(sqlStatement);
                
                return rows;
            }
            else
                return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateAdminStatement: `, error);
            return null;
        }finally{
            if (client != null)
                client.release();
        }
    },
    async validateTseAdminStatement(adminCode: string, distributorId: string) {
        logger.info(`inside model AdminModel.validateTseAdminStatement`);
        let client: PoolClient| null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE tse_code = '${adminCode}' AND id = '${distributorId}' 
            AND deleted = false`;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateTseAdminStatement: `, error);
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

    async validateDistributorAdminMapping(distributorId: string, role: string[], code: string = ''){
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
          const roleDbMappingConditions = {
            'ASM': () => code.split(',').includes(area_code),
            'RSM': () => code === rsm_code,
            'TSE': () => code.split(',').includes(tse_code),
            'CLUSTER_MANAGER': () => code === cluster_code,
          }
          isMapped = role.some(r => roleDbMappingConditions[r] ? roleDbMappingConditions[r]() : true);
          return isMapped;
        } catch (error) {
          logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: ', error);
          return false;
        } finally {
          client?.release();
        }
    },
    

    async fetchAreaCodes(userId: string, role: string[], code:string) {
        logger.info('inside AdminModel -> fetchAreaCodes');
        let client: PoolClient | null = null;
        try {
          client = await conn.getReadClient();
            if (!role || _.intersection(role, ['SUPER_ADMIN', 'SUPPORT', 'CFA', 'LOGISTIC_OFFICER', 'ZONAL_OFFICER', 'PORTAL_OPERATIONS','CUSTOMER_SERVICE']).length>0) {
            logger.info('inside AdminModel -> fetchAreaCodes, role: '+ role);
            const sqlStatement = `SELECT ac.code AS area_code, gm.description AS region
                                    FROM area_codes ac 
                                    INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                                    WHERE ac.code IS NOT NULL
                                        AND ac.group5_id IS NOT NULL
                                    ORDER BY gm.description, ac.code;`;
            const areaCodes = await client.query(sqlStatement);
            return areaCodes.rows;
            } else if (_.intersection(role, ['DIST_ADMIN', 'ASM', 'RSM', 'CLUSTER_MANAGER', 'TSE']).length>0) {
            let query = '';
            let area_codes:string = '';
            logger.info('inside AdminModel -> fetchAreaCodes, role: '+ role);
            const roleBasedQuery = {
                'TSE': ()=> {
                    area_codes = code ? code.split(',').map((c: string) => `'${c.substring(0, 4)}'`).join(',') : '';
                    return `SELECT DISTINCT ON (ac.code) ac.code AS area_code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE ac.code IN (${area_codes});`;
                },
                'ASM': ()=> {
                    area_codes = code ? code.split(',').map((c: string) => `'${c}'`).join(',') : '';
                    return `SELECT DISTINCT ON (ac.code) ac.code AS area_code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE ac.code IN (${area_codes});`   
                },
                'RSM': ()=> {
                    return `SELECT DISTINCT ON (ac.code) ac.code AS area_code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE gm.rsm_code = '${code}';`
                },
                'CLUSTER_MANAGER': () => {
                    return `SELECT DISTINCT ON (ac.code) ac.code AS area_code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE gm.cluster_code = '${code}';`   
                }
            }
            role.some(r=>{
                if (roleBasedQuery[r]) {
                    query = roleBasedQuery[r]();
                    return true;
                }
                return false;
            })
            if(query){
                const areaCodes = await client.query(query);
                return areaCodes.rows;
            }
            return [];
          } else if (role.includes('SHOPPER_MARKETING')){
            logger.info('inside AdminModel -> fetchAreaCodes, role: '+ role);
            const sqlStatement = `WITH base_query AS (
                                        SELECT DISTINCT ON (ac.code) ac.code AS area_code, gm.description AS region
                                        FROM group5_master gm 
                                        INNER JOIN area_codes ac ON (ac.group5_id = gm.id)
                                        WHERE gm.description IN (
                                            SELECT unnest(string_to_array(shd.code, ',')) AS codes
                                            FROM sales_hierarchy_details shd 
                                            WHERE user_id = $1
                                        )
                                    )
                                    SELECT bq.area_code, bq.region
                                    FROM base_query bq
                                    UNION ALL
                                    SELECT DISTINCT ac.code, gm.description
                                    FROM area_codes ac
                                    INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                                    WHERE NOT EXISTS (SELECT 1 FROM base_query)
                                    ORDER BY region, area_code;`;
            const areaCodes = await client.query(sqlStatement,[userId]);
            return areaCodes.rows;
          }
          return [];
        } catch (error) {
          logger.error('Error in AdminModel -> fetchAreaCodes: ', error);
          return [];
        } finally {
          client?.release();
        }
    },
};
