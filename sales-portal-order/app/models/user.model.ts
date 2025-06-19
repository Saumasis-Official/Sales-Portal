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
            const { rows } = await client.query(sqlStatement);
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
            logger.error(`Error in UserModel -> fetchSalesHierarchyDetails: ${tseCode}: Result is null`);
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
            const fetchSalesHierarchyDetailsStatement = `SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id ,roles FROM sales_hierarchy_details WHERE STRING_TO_ARRAY(code, ',') && ARRAY['${tseCode.slice(0, 4)}'] AND deleted = false`;
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
        const sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`;
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

    async fetchDistributorDetails(distributorId: string) {
        logger.info('inside UserModel -> fetchDistributorDetails');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    SELECT dm.id
                        ,up."name"
                        ,up.email
                        ,up.mobile
                        ,dm.city
                        ,dm.market
                        ,cgm.description  AS customer_group
                        ,cgm."name" AS customer_group_code
                        ,gm.description AS group5
                        ,gm."name" AS group5_name
                        ,dm.group5_id
                        ,rm.description AS region
                        ,rm.code AS region_code
                        ,dm.tse_code
                        ,dm.area_code
                        ,gm.rsm_code
                        ,gm.cluster_code
                        ,dm.postal_code
                        ,dm.channel_code
                        ,dm.liquidation
                        ,dm.enable_pdp
                        ,dm.ao_enable
                        ,dm.reg_enable
                        ,dm.ro_enable
                        ,dm.bo_enable
                        ,dm.noc_enable
                        ,dm.pdp_unlock_id
                    FROM distributor_master dm
                    INNER JOIN user_profile up ON (dm.id = up.id)
                    INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                    INNER JOIN region_master rm ON (dm.region_id = rm.id)
                    INNER JOIN customer_group_master cgm ON (dm.group_id = cgm.id)
                    WHERE dm.id = $1;`;
            client = await conn.getReadClient();
            const dbDetails = (await client.query(sqlStatement, [distributorId])).rows[0] || {};
            if (Object.keys(dbDetails).length === 0) {
                logger.error('Error in UserModel -> fetchDistributorDetails: Distributor not found');
                return null;
            }
            const tseQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code ILIKE '%${dbDetails.tse_code}%'
                        AND 'TSE' = ANY(roles);
                    `;
            const tseDetails = (await client.query(tseQuery)).rows;
            if (tseDetails.length == 0) {
                tseDetails.push({ code: dbDetails.tse_code });
            }
            delete dbDetails.tse_code;
            dbDetails['tse'] = tseDetails;

            const asmQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code ILIKE '%${dbDetails.area_code}%'
                        AND 'ASM' = ANY(roles);
                    `;
            const asmDetails = (await client.query(asmQuery)).rows;
            if (asmDetails.length == 0) {
                asmDetails.push({ code: dbDetails.area_code });
            }
            dbDetails['asm'] = asmDetails;

            const rsmQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code = $1
                        AND 'RSM' = ANY(roles);
                    `;
            const rsmDetails = (await client.query(rsmQuery, [dbDetails.rsm_code])).rows;
            if (rsmDetails.length == 0) {
                rsmDetails.push({ code: dbDetails.rsm_code });
            }
            delete dbDetails.rsm_code;
            dbDetails['rsm'] = rsmDetails;

            const clusterQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code = $1
                        AND 'CLUSTER_MANAGER' = ANY(roles);
                    `;
            const clusterDetails = (await client.query(clusterQuery, [dbDetails.cluster_code])).rows;
            if (clusterDetails.length == 0) {
                clusterDetails.push({ code: dbDetails.cluster_code });
            }
            delete dbDetails.cluster_code;
            dbDetails['cluster'] = clusterDetails;

            const salesQuery = `
                        SELECT DISTINCT ON (dp.distributor_id,dp.distribution_channel,dp.division) dp.distributor_id
                            ,dp.sales_org
                            ,dp.distribution_channel
                            ,dp.division
                            ,dp.line_of_business
                            ,dp.reference_date
                            ,dp.pdp_day
                            ,pm."name" AS plant_name
                            ,pm.description AS plant_description
                            ,dp.division_description
                        FROM distributor_plants dp
                        INNER JOIN plant_master pm ON (dp.plant_id = pm.id )
                        WHERE dp.distributor_id = $1;
                    `;
            const salesDetails = (await client.query(salesQuery, [distributorId])).rows;
            dbDetails['distributor_sales_details'] = salesDetails;
            // check if distributor is nourishco i.e distribution channel is 90
            let isNourishco = false;
            salesDetails.forEach((salesDetail) => {
                if (salesDetail.distribution_channel === 90) {
                    isNourishco = true;
                }
            });
            dbDetails['is_nourishco'] = isNourishco;

            return dbDetails;
        } catch (error) {
            logger.error('inside UserModel -> fetchDistributorDetails, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async beginTransaction(name: string) {
        let client: PoolClient | null = null;
        logger.info(`inside UserModel -> beginTransaction: Begin ${name} transaction...`);
        try {
            client = await conn.getWriteClient();
            const beginTransactionStatement = `BEGIN`;
            await client.query(beginTransactionStatement);
            return true;
        } catch (error) {
            logger.error(`inside UserModel -> beginTransaction, error: ` + error.toString());
            return false;
        } finally {
            client?.release();
        }
    },

    async rollbackTransaction(name: string) {
        let client: PoolClient | null = null;
        logger.info(`inside UserModel -> rollbackTransaction: Rollback ${name} transaction...`);
        try {
            client = await conn.getWriteClient();
            const rollbackTransactionStatement = `ROLLBACK`;
            await client.query(rollbackTransactionStatement);
            return true;
        } catch (error) {
            logger.info(`inside UserModel -> rollbackTransaction, Error: `, error);
            return false;
        } finally {
            client?.release();
        }
    },

    async commitTransaction(name: string) {
        let client: PoolClient | null = null;
        logger.info(`inside UserModel -> commitTransaction: Commit ${name} transaction...`);
        try {
            client = await conn.getWriteClient();
            const commitTransactionStatement = `COMMIT`;
            await client.query(commitTransactionStatement);
            return true;
        } catch (error) {
            logger.error(`inside UserModel -> commitTransaction, Error: `, error);
            return false;
        } finally {
            client?.release();
        }
    },

    async fetchPlantDetails() {
        logger.info('inside UserModel -> fetchPlantDetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select pm."name",pm.description from plant_master pm 
            where pm.status ='ACTIVE' AND (pm.name is not null and pm.name !='') order by pm."name" asc;`;

            const response = await client.query(sqlStatement);
            return { data: response.rows, rowCount: response.rowCount };
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchPlantDetails', error);
            throw error;
        } finally {
            if (client) client?.release();
        }
    },
};
