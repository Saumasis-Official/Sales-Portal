import { PoolClient } from "pg";
import PostgresqlConnenction from '../lib/postgresqlConnection'
import logger from "../lib/logger";
import _ from "lodash";
import {roles, pegasus} from "../constants/persona";

const conn = PostgresqlConnenction.getInstance();

export const AdminModel = {
    async adminDetailsStatement(email: string) {
        logger.info(`inside model AdminModel.adminDetailsStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${email}') AND deleted=false AND status='ACTIVE'`
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error(`error in AdminModel.adminDetailsStatement: `, error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async validateSuperAdminStatement(distributorId: string) {
        logger.info(`inside model AdminModel.validateSuperAdminStatement`);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT id FROM distributor_master 
            WHERE id = '${distributorId}' AND deleted = false`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.validateSuperAdminStatement: `, error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async validateDistributorAdminMapping(distributorId: string, role: string[], code: string = '') {
        logger.info('inside AdminModel -> validateDistributorAdminMapping, distributorId: ' + distributorId + ' ,role: ' + role);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
              SELECT dm.tse_code, dm.area_code, gm.rsm_code, gm.cluster_code 
              FROM distributor_master dm 
              INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
              WHERE dm.id = $1;`;
            const result = (await client.query(sqlStatement, [distributorId])).rows || [];
            if (!result.length) {
                logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: User is not mapped to given distributorId');
                return false;
            }
            const { tse_code, area_code, rsm_code, cluster_code } = result[0];
            let isMapped = false;
            role.forEach(r => {
                if ([roles.DIST_ADMIN, roles.ASM, roles.TSE, roles.CFA, roles.RSM, roles.CLUSTER_MANAGER].includes(r)) {
                    switch (r) {
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
                }
            })
            return isMapped;
        } catch (error) {
            logger.error('inside AdminModel -> validateDistributorAdminMapping, Error: ', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async fetchAreaCodes(userId: string, role: string[], code: string) {
        logger.info('inside AdminModel -> fetchAreaCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            if (!role || _.intersection(role, [...pegasus.ADMIN, ...pegasus.LOGISTICS]).length) {
                logger.info('inside AdminModel -> fetchAreaCodes, role: ' + role);
                const sqlStatement = `SELECT distinct ac.code AS code, gm.description AS region
                                    FROM area_codes ac 
                                    INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                                    WHERE ac.code IS NOT NULL
                                        AND ac.group5_id IS NOT NULL
                                        AND ars_applicable = TRUE
                                    ORDER BY gm.description, ac.code;`;
                const areaCodes = await client.query(sqlStatement);
                return areaCodes.rows;
            } else if (_.intersection(role, [...pegasus.SALES]).length) {
                let query = '';
                let area_codes: string = '';
                logger.info('inside AdminModel -> fetchAreaCodes, role: ' + role);
                role.forEach(role => { 
                    switch (role) {
                        case 'TSE':
                            area_codes = code ? code.split(',').map((c: string) => `'${c.substring(0, 4)}'`).join(',') : '';
                            query = `SELECT DISTINCT ON (ac.code) ac.code AS code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE ac.code IN (${area_codes}) and ars_applicable = TRUE;`;
                            break;
                        case 'ASM':
                            area_codes = code ? code.split(',').map((c: string) => `'${c}'`).join(',') : '';
                            query = `SELECT DISTINCT ON (ac.code) ac.code AS code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE ac.code IN (${area_codes}) AND ars_applicable = TRUE;`;
                            break;
                        case 'RSM':
                            query = `SELECT DISTINCT ON (ac.code) ac.code AS code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE gm.rsm_code = '${code}' AND ars_applicable = TRUE;`;
                            break;
                        case 'CLUSTER_MANAGER':
                            query = `SELECT DISTINCT ON (ac.code) ac.code AS code, gm.description AS region
                            FROM area_codes ac
                            INNER JOIN group5_master gm ON (ac.group5_id = gm.id)
                            WHERE gm.cluster_code = '${code}' AND ars_applicable = TRUE;`;
                            break;
                        default:
                            break;
                    }
                })
                if (query) {
                    const areaCodes = await client.query(query);
                    return areaCodes.rows;
                }
                return [];
            } else if (role.includes(roles.SHOPPER_MARKETING)) {
                logger.info('inside AdminModel -> fetchAreaCodes, role: ' + role);
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
                const areaCodes = await client.query(sqlStatement, [userId]);
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
}