import logger from "../lib/logger";
import { PoolClient } from "pg";
import PostgresqlConnection from "../lib/postgresqlConnection";

const conn = PostgresqlConnection.getInstance();

export const BulkOrderModel = {
    async getBulkOrderMoqMappingData(area: string | null | undefined, search: string | null | undefined, role: string[], email: string, limit: number, offset: number) {
        logger.info('inside ArsModel -> getMoqMappingData');
        let emailQuery: string = '';
        let client: PoolClient | null = null;
        const roleBasedEmailQuery = {
            'CFA': `WHERE email ILIKE '%${email}%'`,
            'LOGISTIC_OFFICER': `WHERE logistic_email ILIKE '%${email}%'`,
            'ZONAL_OFFICER': `WHERE zone_manager_email ILIKE '%${email}%' OR cluster_manager_email ILIKE '%${email}%'`,
        }
        emailQuery = roleBasedEmailQuery[role.find(r => roleBasedEmailQuery[r]) ?? ''] ?? '';
        let limitQuery: string = (limit !== null && offset !== null) ? `LIMIT ${limit} OFFSET ${offset}` : '';
        let areaQuery: string = (area && area.toUpperCase() !== 'ALL') ? `AND dm.area_code = '${area}'` : '';
        let searchQuery: string = (search && search?.length > 2) ? `AND (dm.profile_id ILIKE '${search}%'
                                                                        OR up.name ILIKE '%${search}%'
                                                                        OR pm.name ILIKE '${search}%')` : '';
        const sqlStatement = `WITH plant_locations AS (SELECT DISTINCT ON (depot_code)
                                                            depot_code
                                                            ,location
                                                    FROM cfa_depot_mapping
                                                    ${emailQuery})
                                    ,audit_trail AS (SELECT DISTINCT ON (bulk_moq_key) bulk_moq_key
                                                            ,current_moq
                                                            ,modified_by
                                                            ,modified_on
                                                    FROM bulk_order_audit_trail
                                                    ORDER BY bulk_moq_key, modified_on DESC)	  
                            SELECT dm.area_code
                                    ,mdm.db_id
                                    ,dm.profile_id AS db_code
                                    ,up.name AS db_name
                                    ,dm.city AS db_location
                                    ,mdm.plant_id
                                    ,pm.name AS plant_code
                                    ,COALESCE(pl.location,'') AS plant_location
                                    ,COALESCE(mat.current_moq,mdm.current_moq) AS moq
                                    ,COALESCE(mat.modified_by, 'PORTAL_MANAGED') AS modified_by
                                    ,COALESCE(mat.modified_on, '2023-08-08 15:08:53.369146+05:30') AS modified_on
                            FROM bulk_order_moq_db_mapping AS mdm
                            LEFT JOIN distributor_master AS dm
                            ON (mdm.db_id = dm.id)
                            LEFT JOIN user_profile AS up
                            ON (mdm.db_id = up.id)
                            LEFT JOIN plant_master AS pm
                            ON (mdm.plant_id = pm.id)
                            INNER JOIN plant_locations AS pl
                            ON (pm.name = pl.depot_code)
                            LEFT JOIN audit_trail AS mat
                            ON (mdm.key = mat.bulk_moq_key)
                            WHERE dm.area_code IS NOT NULL 
                            AND up.name IS NOT NULL
                            ${areaQuery}
                            ${searchQuery}
                            ORDER BY dm.profile_id, pm.name
                            ${limitQuery};`;


        client = await conn.getReadClient();

        try {
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Inside ArsModel -> getMoqMappingData, Error: ', error);
            return null;

        } finally {
            client.release();
        }
    },

    async getBulkOrderMoqMappingDataCount(area: string | null | undefined, search: string | null | undefined, role: string[], email: string) {
        logger.info('inside ArsModel -> getMoqMappingDataCount');
        let emailQuery: string = '';
        let client: PoolClient | null = null;
        const roleBasedEmailQuery = {
            'CFA': `WHERE email ILIKE '%${email}%'`,
            'LOGISTIC_OFFICER': `WHERE logistic_email ILIKE '%${email}%'`,
            'ZONAL_OFFICER': `WHERE zone_manager_email ILIKE '%${email}%' OR cluster_manager_email ILIKE '%${email}%'`,
        };
        emailQuery = roleBasedEmailQuery[role.find(r => roleBasedEmailQuery[r]) ?? ''] ?? '';
        let areaQuery: string = (area && area.toUpperCase() !== 'ALL') ? `AND dm.area_code = '${area}'` : '';
        let searchQuery: string = (search && search?.length > 2) ? `AND (dm.profile_id ILIKE '${search}%'
                                                                        OR up.name ILIKE '%${search}%'
                                                                        OR pm.name ILIKE '${search}%')` : '';
        const sqlStatement = `WITH plant_locations AS (SELECT DISTINCT ON (depot_code)
                                                            depot_code
                                                            ,location
                                                    FROM cfa_depot_mapping
                                                    ${emailQuery})
                                    ,audit_trail AS (SELECT DISTINCT ON (bulk_moq_key) bulk_moq_key
                                                            ,current_moq
                                                            ,modified_by
                                                            ,modified_on
                                                    FROM bulk_order_audit_trail
                                                    ORDER BY bulk_moq_key, modified_on DESC)	  
                            SELECT COUNT(*) AS count
                            FROM bulk_order_moq_db_mapping AS mdm
                            LEFT JOIN distributor_master AS dm
                            ON (mdm.db_id = dm.id)
                            LEFT JOIN user_profile AS up
                            ON (mdm.db_id = up.id)
                            LEFT JOIN plant_master AS pm
                            ON (mdm.plant_id = pm.id)
                            INNER JOIN plant_locations AS pl
                            ON (pm.name = pl.depot_code)
                            LEFT JOIN audit_trail AS mat
                            ON (mdm.key = mat.bulk_moq_key)
                            WHERE dm.area_code IS NOT NULL 
                            AND up.name IS NOT NULL
                            ${areaQuery}
                            ${searchQuery}
                            AND up.name IS NOT NULL;`;
        client = await conn.getReadClient();
        try {
            const result = await client.query(sqlStatement);

            return result?.rows ? result.rows[0].count : 0;
        } catch (error) {
            logger.error('Inside ArsModel -> getMoqMappingDataCount, Error: ', error);
            return null;

        } finally {
            client.release();
        }
    },

    async BulkOrderupdateMoq(dbId: string, plantId: number, moq: number, user: any) {
        logger.info('inside ArsModel -> updateMoq');
        let client: PoolClient | null = null;

        const sqlStatement = `BEGIN;

                            UPDATE bulk_order_moq_db_mapping
                            SET current_moq= ${moq}
                            WHERE db_id ='${dbId}' AND plant_id = ${plantId};
                                
                            INSERT INTO bulk_order_audit_trail(bulk_moq_key, current_moq, modified_by)
                            VALUES ((SELECT key
                                    FROM bulk_order_moq_db_mapping
                                    WHERE db_id ='${dbId}' AND plant_id = ${plantId}), ${moq}, '${user.first_name} ${user.last_name} ${user.user_id}');
                                    
                            COMMIT;`;
        client = await conn.getWriteClient();
        try {
            const result = await client.query(sqlStatement);
            if (result[1]['rowCount'] === 1 && result[2]['rowCount'] === 1)
                return true;
            else
                return false;
        } catch (error) {
            logger.error('Inside ArsModel -> updateMoq, Error: ', error);
            return false;

        } finally {
            client.release();
        }
    },

    async getMappingAreaZone(email, columnName) {
        let client: PoolClient | null = null;
        client = await conn.getReadClient();
        let sqlStatement

        try {
            if (columnName != null) {
                sqlStatement = `select  distinct(gm.id) as regions_id
                                from cfa_depot_mapping cdm
                                inner join group5_master gm 
                                on (cdm.group5_id=gm.id)
                                where  cdm.${columnName} ilike '%${email}%' `;
            } else {
                sqlStatement = `select  distinct(gm.id) as regions_id
            from cfa_depot_mapping cdm
            inner join group5_master gm 
            on (cdm.group5_id=gm.id)`;
            }
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error(
                'Inside ArsModel -> getDistributorMoq, Error: ',
                error,
            );
            return null;
        } finally {
            client?.release();
        }
    },


    async boMassUpdate(data, user) {
        let region_id = data.region_id.join("','");
        let area = data.area.join("','");
        let quantity = data.quantity;



        let client: PoolClient | null = null;
        let sqlStatement = `
                begin;
                update bulk_order_moq_db_mapping
                set current_moq = ${quantity}
                where db_id in (select dm.id  from 
                distributor_master dm 
                where dm.group5_id in('${region_id}') 
                and dm.area_code in ('${area}'));

                insert into bulk_order_audit_trail  (bulk_moq_key, current_moq, modified_by)
                select key as bulk_moq_key , current_moq as current_moq , '${user.first_name} ${user.last_name} ${user.user_id}' as modified_by
                from bulk_order_moq_db_mapping  
                where db_id in (select dm.id  from 
                distributor_master dm 
                where dm.group5_id in('${region_id}') 
                and dm.area_code in ('${area}'));
                commit;
`
        try {
            let result: any;
            client = await conn.getWriteClient();

            result = await client.query(sqlStatement);

            if (result[1]['rowCount'] > 0 && result[2]['rowCount'] > 0) {

                return true;
            }
            else
                return false;


            //    return result.rows;


        } catch (error) {
            logger.error(
                'Inside ArsModel -> getDistributorMoq, Error: ',
                error,
            );
            return null;
        } finally {
            client?.release();
        }

    },

    async getBoDistributorMoq(dbCode: string, plantCodes: string) {
        logger.info('inside ArsModel -> getBoDistributorMoq');

        let db = dbCode.split(' ')[0];
        let plant = plantCodes.split(' ')[0];

        let client: PoolClient | null = null;
        try {

            const sqlStatement = `WITH plant_details AS (SELECT id, name FROM plant_master
                                                        WHERE name IN ('${plant}'))
                                SELECT 
                                pl.name AS plant_code
                                ,COALESCE(mdm.current_moq,0) moq
                                FROM bulk_order_moq_db_mapping mdm
                                RIGHT JOIN plant_details pl ON (mdm.plant_id = pl.id)
                                WHERE mdm.db_id = (SELECT DISTINCT id FROM distributor_master
                                                WHERE profile_id = '${db}');`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);

            if (result?.rowCount > 0)
                return result.rows;
            else
                return null;
        } catch (error) {
            logger.error('Inside ArsModel -> getDistributorMoq, Error: ', error);
            return null;

        } finally {
            if (client)
                client.release();
        }
    },
}