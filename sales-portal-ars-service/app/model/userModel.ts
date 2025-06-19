import logger from "../lib/logger";
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection'
import Helper from "../helper";

const conn = PostgresqlConnection.getInstance();

export const UserModel = {
    async getInvalidateSessionStatus(loginId: string, uuid: string) {
        logger.info("inside UserModel -> getInvalidateSessionStatus");
        let client: PoolClient | null = null;
        let sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [loginId, uuid])
            return result?.rows;
        }
        catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getInvalidateSessionStatus: ", error);
            return null;
        }
        finally {
            client?.release();
        }
    },

    async getAppLevelSettings(search: string | null) {
        logger.info(`inside OrderModel -> getAppLevelSettings, param : search= ${search}`);
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            let searchQuery = (search) ? `WHERE key ILIKE '%${search}%'` : '';
            let sqlStatement = `SELECT key, value, updated_by, description, updated_on
                        FROM app_level_settings ${searchQuery}`;
            const { rows } = await client.query(sqlStatement);
            return rows || [];
        } catch (error) {
            logger.error(
                `inside OrderModel -> getAppLevelSettings, Error : `,
                error,
            );
            return null;
        } finally {
            if (client != null)
                client.release();
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
                tseDetails.push({ "code": dbDetails.tse_code });
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
                asmDetails.push({ "code": dbDetails.area_code });
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
                rsmDetails.push({ "code": dbDetails.rsm_code });
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
                clusterDetails.push({ "code": dbDetails.cluster_code });
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
            salesDetails.forEach((salesDetail: any) => {
                if(salesDetail.distribution_channel === 90){
                    isNourishco = true;
                }
            });
            dbDetails['is_nourishco'] = isNourishco;

            return dbDetails;
        } catch (error) {
            logger.error('inside UserModel -> fetchDistributorDetails, Error: ', error);
            return null;
        } finally {
            if (client)
                client.release();
        }
    },

    async getMaterialsList(distributorId, queryParams) {
        let client: PoolClient | null = null;
        logger.info(`inside orderModel -> getMaterialsList, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`);

        try {
            client = await conn.getReadClient();
            let searchQuery = '';
            if (queryParams && queryParams.search_query && typeof queryParams.search_query === 'string') {
                logger.info(`if case, search query: ${queryParams.search_query}, so converting search query to ts_query`);
                searchQuery = Helper.generateSearchQuery(queryParams.search_query);
            }
            let sqlStatement = '';

            if (searchQuery != null && searchQuery.length > 0) {
                logger.info(`if case, search query exists`);
                //SKUs marked in Rule Configuration should not appear in search options of PO page

                const fetchChannelAreaForDistributorStatement = `
            SELECT
            channel_code, area_code, cgm.name as customer_group_name
            FROM distributor_master dm
            INNER JOIN customer_group_master cgm ON cgm.id = dm.group_id
            WHERE dm.id = '${distributorId}'`;
                const { rows } = await client.query(fetchChannelAreaForDistributorStatement);

                const ruleConfigStatement: string = `
                left join sku_rule_configurations src on
                    (src.sku_code = mm.code
                    and src.area_code = '${rows[0]?.area_code}'
                    and src.deleted = false
                    and src.tse_code = tt.tse_code
                    )`;
                const ruleConfigWhereStatement: string =
                    ` and ( src.included_cg ->> '${rows[0]?.customer_group_name}' = TRUE::text
                  or src.included_cg is null)`;

                sqlStatement = `
          WITH tse_tbl as (
            select id, tse_code from distributor_master dm where dm.id = '${distributorId}'
          )
          SELECT
                mm.code, mm.description, mm.sales_unit, mm.pak_code, mm.pak_type, mm.appl_area_channel, mm.ton_to_suom AS ton_to_cv,
                ms.sales_org,ms.distribution_channel,ms.division,ms.line_of_business, ms.unit_of_measurement, ms.conversion_factor,
                TS_RANK_CD(mm.textsearchable_index_col, (TO_TSQUERY('${searchQuery}')), 1) AS score,
                CASE WHEN oh.distributor_code IS NOT NULL THEN
                    TS_RANK_CD(mm.textsearchable_index_col, (TO_TSQUERY('${searchQuery}')), 2) * oh.count
                ELSE
                    0
                END AS computed_score
                FROM material_master mm
                LEFT JOIN (SELECT material_code, count(material_code), distributor_code FROM order_history_recommendation 
                WHERE distributor_code = '${distributorId}' GROUP BY material_code, distributor_code) as oh 
                ON mm.code = oh.material_code 
                INNER JOIN tse_tbl as tt on tt.id = '${distributorId}'
                LEFT JOIN material_sales_details as ms 
                ON mm.code = ms.material_code
                ${ruleConfigStatement} 
                WHERE mm.textsearchable_index_col @@ TO_TSQUERY('${searchQuery}') 
                ${ruleConfigWhereStatement}
                 AND (( mm.deleted = false AND mm.status = 'ACTIVE'
                `;

                if (queryParams?.distributor_wise_search === 'true') {
                    if (rows && rows[0] && rows[0].channel_code && rows[0].area_code) {
                        sqlStatement += ` AND
            ('{"area": "${rows[0].area_code}", "channel": "${rows[0].channel_code}"}'::jsonb = ANY(mm.appl_area_channel)) AND mm.start_date <= CURRENT_TIMESTAMP`;
                    }
                }
                if (queryParams?.self_lifting === 'true') {
                    sqlStatement += ` AND ms.distribution_channel = '40'`;
                }
                else {
                    sqlStatement += ` AND ms.distribution_channel = '10'`;
                }
                const non_forecasted = `)OR mm.code = (
                                SELECT
                                  psku
                                FROM
                                  non_forecasted_sku nfs
                                WHERE
                                  nfs.psku = mm.code AND
                                  nfs.area_code = '${rows[0].area_code}'
                                  AND nfs.tse_code = tt.tse_code
                                  AND ( nfs.included_cg_db->>'${rows[0]?.customer_group_name}' = TRUE::text
                                    OR '${distributorId}' = ANY(select jsonb_array_elements_text(elem) from (
                                      SELECT
                                        CASE
                                          WHEN jsonb_typeof(nfs.included_cg_db->'${rows[0]?.customer_group_name}') = 'array' then nfs.included_cg_db->'${rows[0]?.customer_group_name}'
                                          ELSE '[]'::jsonb  END AS elem
                                      ) as json_data
                                  ) 
                                  ) 
                                  AND nfs.deleted = false
                              ) )`

                sqlStatement += non_forecasted;
                sqlStatement += ` ORDER BY computed_score DESC, mm.created_on DESC, score DESC`;
            } else {
                logger.info(`else case, search query does not exist`);
                sqlStatement = `
            select
                distinct
                code,
                description,
                sales_unit,
                pak_code,
                pak_type,
                appl_area_channel,
                mm.ton_to_suom AS ton_to_cv,
                msd.division 
            from
                material_master mm
            right outer join material_sales_details msd on 
                msd.material_code = mm.code`;
            }
            let { rows } = await client.query(sqlStatement);

            let searchedMaterials: any[] = [];
            if (rows?.length) {
                let mL = rows.map(o => { return { ...o, stock_in_transit: "", stock_in_hand: "", open_order: "" } })
                searchedMaterials = mL ? mL : [];
            }

            logger.info(`return success with data`);
            return searchedMaterials;
        } catch (error) {
            logger.error("CAUGHT: Error in materialController -> getMaterialsList: ", error);
            return null;
        }
        finally {
            if (client != null)
                client.release();
        }
    },

    async fetchSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchSalesHierarchyDetails');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = Helper.tseUpperHierarchyQueryByCode(tseCode);
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0)
                return rows;
            logger.error(`Error in UserModel -> fetchSalesHierarchyDetails: ${tseCode}: Result is null`);
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client)
                client.release();
        }
    },

    async fetchAreaZones() {
        logger.info('Inside OrderModel -> fetchAreaZones');
        let client: PoolClient | null = null;

        try {
            const sqlStatement = `SELECT DISTINCT ON (dm.area_code) dm.area_code, gm.description zone
                            FROM distributor_master dm
                            INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                            WHERE dm.area_code IS NOT NULL
                            ORDER BY dm.area_code;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Inside OrderModel -> fetchAreaZones, Error: ', error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async getPDPWindows(regionId: number) {
        logger.info(`inside utilModel -> getPDPWindows: regionId: ${regionId}`);
        //(zone_id = null and threshold_frequency = -1) -> this combination is for the global pdp window
        const sqlStatement = `
        SELECT
        id,
        zone_id,
        pdp_type,
        order_window_su,
        order_placement_end_time_su,
        order_window_mo,
        order_placement_end_time_mo,
        order_window_tu,
        order_placement_end_time_tu,
        order_window_we,
        order_placement_end_time_we,
        order_window_th,
        order_placement_end_time_th,
        order_window_fr,
        order_placement_end_time_fr,
        order_window_sa,
        order_placement_end_time_sa,
        threshold_frequency
        FROM
        public.pdp_windows
        WHERE
        zone_id = $1
        or ( zone_id is null and threshold_frequency = -1 );
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [regionId]);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT: Error in utilModel -> getPDPWindows: ", error);
            return null;
        } finally {
            client?.release();
        }
    },
}