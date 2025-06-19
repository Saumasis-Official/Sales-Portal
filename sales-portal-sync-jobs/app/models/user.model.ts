import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import commonHelper from '../helper/index';
export const UserModel = {
    async getUserDetails(login_id: string) {
        logger.info('inside UserModel -> getUserDetails');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `SELECT
                    u.id,u.name,u.mobile,u.email,
                    d.tse_code,d.market,d.channel_code,d.area_code,d.city,d.postal_code,d.liquidation,d.enable_pdp, d.ao_enable, d.reg_enable, d.ro_enable, d.bo_enable,
                    r.description AS region, r.code AS region_code, c.description AS customer_group, c.name AS customer_group_code, g.description AS group5, g.name AS group5_name, g.id as group5_id
                    FROM
                    user_profile u
                    INNER JOIN
                    distributor_master d
                    ON
                    d.profile_id = u.id
                    LEFT JOIN
                    region_master r
                    ON
                    d.region_id = r.id
                    LEFT JOIN
                    customer_group_master c
                    ON
                    d.group_id = c.id
                    LEFT JOIN
                    group5_master g
                    ON
                    d.group5_id = g.id
                    WHERE
                    u.id='${login_id}'`;
            client = await conn.getReadClient();
            let { rows } = await client.query(sqlStatement);
            if (rows?.length > 0) {
                return rows[0];
            }
            logger.error('Error in UerModel -> getUserDetails: Result is null');
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> getUserDetails', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async getSalesDetails(login_id: string) {
        logger.info('inside UserModel -> getSalesDetails');
        let client: PoolClient | null = null;
        try {
            const fetchSalesDetailsStatement = `SELECT d.distributor_id, d.sales_org, d.distribution_channel, d.division, d.line_of_business,d.reference_date,d.pdp_day, p.name AS plant_name, p.description AS plant_description, d.division_description AS division_description 
                   FROM distributor_plants as d 
                   INNER JOIN plant_master as p ON p.id = d.plant_id where distributor_id='${login_id}'`;
            client = await conn.getReadClient();
            const { rows } = await client.query(fetchSalesDetailsStatement);
            if (rows.length > 0) return rows;
            logger.error('Error in UserModel -> getSalesDetails: Result is null');
            return null;
        } catch (error) {
            logger.errror('Caught error in UserModel -> getSalesDetails', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async fetchSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchSalesHierarchyDetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = commonHelper.tseUpperHierarchyQueryByCode(tseCode);
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0) return rows;
            logger.error('Error in UserModel -> fetchSalesHierarchyDetails: Result is null');
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async fetchASMSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchASMSalesHierarchyDetails');
        let client: PoolClient | null = null;
        try {
            const fetchSalesHierarchyDetailsStatement = `SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id ,roles::_varchar FROM sales_hierarchy_details WHERE STRING_TO_ARRAY(code, ',') && ARRAY['${tseCode.slice(0, 4)}'] AND deleted = false`;
            client = await conn.getReadClient();
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0) return rows;
            logger.error('Error in UserModel -> fetchASMSalesHierarchyDetails: Result is null');
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchASMSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async fetchDBCodesUnderUser(user_id: string) {
        logger.info('inside UserModel -> fetchDBCodesUnderUser');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                            WITH tse AS (
                                WITH RECURSIVE hierarchy AS
                                        (SELECT user_id, code, manager_id , 1 AS lvl
                                            FROM sales_hierarchy_details 
                                            WHERE user_id = $1
                                            AND deleted = false 
                                            UNION 
                                            SELECT s.user_id,  s.code, s.manager_id , h.lvl+1 AS lvl
                                            FROM sales_hierarchy_details s 
                                            INNER JOIN hierarchy h ON h.user_id = s.manager_id) 
                                SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) AS tse_codes FROM hierarchy
                            )
                            SELECT array_agg(distinct dm.profile_id) AS db_codes
                            FROM distributor_master dm
                            WHERE dm.tse_code IN (SELECT tse_codes FROM tse) AND dm.deleted = false AND dm.status = 'ACTIVE';
                            `;
            client = await conn.getReadClient();
            const { rows } = await client.query(sqlStatement, [user_id]);
            if (rows?.length > 0) return rows[0];
            logger.error('inside UserModel -> fetchDBCodesUnderUser, Error: Result is null');
            return null;
        } catch (error) {
            logger.error('inside UserModel -> fetchDBCodesUnderUser, Error: ', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async getInvalidateSessionStatus(loginId: string, uuid: string) {
        logger.info('inside UserModel -> getInvalidateSessionStatus');
        let client: PoolClient | null = null;
        let sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [loginId, uuid]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in AuthModel -> getInvalidateSessionStatus: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getAppLevelSettings(search: string | null) {
        logger.info('inside UserModel -> getAppLevelSettings, param : search= ', search);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            let searchQuery = search ? `WHERE key ILIKE '%${search}%'` : '';
            let sqlStatement = `SELECT key, value, updated_by, description, updated_on
                        FROM app_level_settings ${searchQuery}`;
            const { rows } = await client.query(sqlStatement);
            return rows || [];
        } catch (error) {
            logger.error(`inside OrderModel -> getAppLevelSettings, Error : `, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async adminDetailsStatement(email: string) {
        logger.info(`inside model AdminModel.adminDetailsStatement`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${email}') AND deleted=false AND status='ACTIVE'`;
            const rows = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            logger.error(`error in AdminModel.adminDetailsStatement: `, error);

            return null;
        } finally {
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
        } finally {
            client?.release();
        }
    },

    async validateDistributorAdminMapping(distributorId: string, role: string, code: string = '') {
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
            switch (role) {
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
