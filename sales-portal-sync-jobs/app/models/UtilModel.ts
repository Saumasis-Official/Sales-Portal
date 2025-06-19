/**
 * @file util model
 * @description defines util model methods
 */

import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { LogService } from '../service/LogService';
import UtilityFunctions from '../helper/utilityFunctions';

const conn = PostgresqlConnection.getInstance();
export const UtilModel = {
    async getOrderData(so_number) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const orderDataQuery = `Select order_data,ror_mail_flag,distributor_id,po_number FROM orders 
            WHERE so_number = '${so_number}' `;
            const OrderData = await client.query(orderDataQuery);
            return OrderData;
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> getOrderData: ', error);
        } finally {
            client?.release();
        }
    },
    async insertBulkRorData(order_data) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let orderDataQuery =
                "UPDATE orders SET updated_on = now(), order_data = temp.order_data FROM (SELECT so_number, so_value, order_data FROM json_populate_recordset (NULL::orders, '" +
                order_data +
                "')) AS temp WHERE orders.so_number = temp.so_number";
            const OrderData = await client.query(orderDataQuery);
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> insertRorData: ', error);
        } finally {
            client?.release();
        }
    },
    async rorSync(days = 1) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let today = new Date();
            let yesterday = new Date(today);
            yesterday.setDate(today.getDate() - days);
            let formattedDate = yesterday.toISOString().slice(0, 10);
            let orderDataQuery = `SELECT sub.distributor_id, json_object_agg(sub.key, order_data) as order_data, up.name, up.email as dbEmail, shd.email as tseEmail
                            FROM (
                              SELECT distributor_id, so_number || '#' || ror_mail_flag as key, order_data
                              FROM orders
                              WHERE Date(created_on) > '${formattedDate}'
                            ) sub
                            INNER JOIN (
                              SELECT dm.id as distributor_id, up.name, up.email
                              FROM distributor_master dm 
                              INNER JOIN user_profile up on dm.profile_id = up.id 
                            ) up ON sub.distributor_id = up.distributor_id
                            INNER JOIN (
                              SELECT shd.email, shd.code
                              FROM sales_hierarchy_details shd 
                              WHERE shd.deleted = 'false' and shd.status = 'ACTIVE'
                            ) shd ON shd.code = (SELECT tse_code FROM distributor_master WHERE id = sub.distributor_id)
                            GROUP BY sub.distributor_id, up.name, up.email, shd.email`;
            const OrderData = await client.query(orderDataQuery);
            return OrderData;
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> rorSync: ', error);
        } finally {
            client?.release();
        }
    },

    async getDBandTSEEmails(distributor_id) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let dbEmails = `select up.name,up.email as dbEmail from distributor_master dm inner join user_profile up on dm.profile_id = up.id 
        where dm.id = $1`;
            const dbEmailsData = await client.query(dbEmails, [distributor_id]);
            let tseEmails = `select shd.email as tseEmail from sales_hierarchy_details shd where shd.code = (select tse_code from distributor_master where id = $1) and shd.deleted = 'false' and shd.status = 'ACTIVE'`;
            const tseEmailsData = await client.query(tseEmails, [distributor_id]);
            let mailData = [];
            mailData.push(dbEmailsData.rows[0].dbemail);
            tseEmailsData.rows.forEach((element) => {
                mailData.push(element.tseemail);
            });
            let data = {
                email: mailData,
                name: dbEmailsData.rows[0].name,
            };
            return data;
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> getDBandTSEEmails: ', error);
        } finally {
            client?.release();
        }
    },
    async updateRorMailFlag(so_number) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let orderDataQuery = 'Update orders set ror_mail_flag = true where so_number = $1';
            const OrderData = await client.query(orderDataQuery, [so_number]);
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> updateRorMailFlag: ', error);
        } finally {
            client?.release();
        }
    },
    async upsertRegions(regions: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const upsertRegionsStatement =
                "INSERT INTO staging.region_master_staging(code, description) SELECT code, description FROM json_populate_recordset (NULL::staging.region_master_staging, '" +
                regions +
                "') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING *";

            const upsertRegionsResponse = await client.query(upsertRegionsStatement);

            return upsertRegionsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertRegions`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to region master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertCustomerGroups(groups: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const upsertCustomerGroupsStatement =
                "INSERT INTO staging.customer_group_master_staging(name, description) SELECT name, description FROM json_populate_recordset (NULL::staging.customer_group_master_staging, '" +
                groups +
                "') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *";

            const upsertCustomerGroupsResponse = await client.query(upsertCustomerGroupsStatement);

            return upsertCustomerGroupsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertCustomerGroups`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to customer group master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertPlants(plants: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            plants = plants.replace("'", '');
            const upsertPlantsStatement =
                "INSERT INTO staging.plant_master_staging(name, description) SELECT name, description FROM json_populate_recordset (NULL::staging.plant_master_staging, '" +
                plants +
                "') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *";

            const upsertPlantsResponse = await client.query(upsertPlantsStatement);

            return upsertPlantsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertPlants`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to plant master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertGroup5s(group5s: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const upsertGroup5sStatement =
                "INSERT INTO staging.group5_master_staging(name, description) SELECT name, description FROM json_populate_recordset (NULL::staging.group5_master_staging, '" +
                group5s +
                "') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *";

            const upsertGroup5sResponse = await client.query(upsertGroup5sStatement);

            return upsertGroup5sResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertGroup5s`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to group5 master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertProfiles(profiles: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const upsertProfilesStatement =
                "INSERT INTO staging.user_profile_staging(id, name, email, mobile, type) SELECT id, name, email, mobile, type FROM json_populate_recordset (NULL::staging.user_profile_staging, '" +
                profiles +
                "') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, mobile = EXCLUDED.mobile, type = EXCLUDED.type RETURNING *";

            const upsertProfilesResponse = await client.query(upsertProfilesStatement);

            return upsertProfilesResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertProfiles`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to profile master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertDistributors(distributors: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const upsertDistributorsStatement =
                "INSERT INTO staging.distributor_master_staging(id, profile_id, city, postal_code, region_id, group_id, group5_id, tse_code, market, area_code, channel_code, grn_type, payer_code, payer_name, nach_type) SELECT id, profile_id, city, postal_code, region_id, group_id, group5_id, tse_code, market, area_code, channel_code, grn_type, payer_code, payer_name, nach_type FROM json_populate_recordset (NULL::staging.distributor_master_staging, '" +
                distributors +
                "') ON CONFLICT (id) DO UPDATE SET city = EXCLUDED.city, postal_code = EXCLUDED.postal_code, region_id = EXCLUDED.region_id, group_id = EXCLUDED.group_id, group5_id = EXCLUDED.group5_id, tse_code = EXCLUDED.tse_code, market = EXCLUDED.market, area_code = EXCLUDED.area_code, channel_code = EXCLUDED.channel_code,grn_type = EXCLUDED.grn_type, payer_code = EXCLUDED.payer_code, payer_name = EXCLUDED.payer_name,nach_type = EXCLUDED.nach_type, deleted = false";

            const upsertDistributorsResponse = await client.query(upsertDistributorsStatement);

            return upsertDistributorsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertDistributors`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to distributor master staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },
    async upsertCFADepotMapping(data) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let sqlStatement = `INSERT INTO staging.cfa_depot_mapping_staging (
        zone,
        depot_code,
        sales_org,
        distribution_channel,
        division,
        email,
        name,
        contact_person,
        group5_id
      )
      SELECT
      zone,
        depot_code,
        sales_org,
        distribution_channel,
        division,
        COALESCE(email, 'PORTAL_MANAGED'),
        COALESCE(name, 'PORTAL_MANAGED'),
        COALESCE(contact_person, 'PORTAL_MANAGED'),
        group5_id
      FROM
      json_populate_recordset(
        NULL:: staging.cfa_depot_mapping_staging,
        '${data}'
      ) 
    ON CONFLICT DO NOTHING`;
            const cfaDepotData = await client.query(sqlStatement);
            return cfaDepotData;
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> upsertCFADepotMapping:', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async setDistLiquidationFlag() {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const setLiquidationFlagStatement = `UPDATE staging.distributor_master_staging SET liquidation = true 
                    WHERE liquidation = false AND status = 'ACTIVE' AND deleted = false;`;
            const setLiquidationFlagResponse = await client.query(setLiquidationFlagStatement);

            return setLiquidationFlagResponse ? setLiquidationFlagResponse.rows : false;
        } catch (error) {
            logger.info(`error in UtilModel.setDistLiquidationFlag`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async setDistPDPFlag() {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const setPdpFlagStatement = `UPDATE staging.distributor_master_staging SET enable_pdp = true
                WHERE deleted = false 
                    AND status = 'ACTIVE' 
                    AND group_id != 4 
                    AND enable_pdp = false 
                    AND tse_code NOT LIKE '%LT%' 
                    AND created_on > (CURRENT_DATE -1);`;
            const setPdpFlagResponse = await client.query(setPdpFlagStatement);

            return setPdpFlagResponse ? setPdpFlagResponse.rows : false;
        } catch (error) {
            logger.info(`error in UtilModel.setDistPDPFlag`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertDistributorPlants(distributorsWithPlants: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            //const upsertDistributorPlantsStatement = "INSERT INTO distributor_plants(distributor_id, plant_id) SELECT distributor_id, plant_id FROM json_populate_recordset (NULL::distributor_plants, '" + distributorsWithPlants + "') ON CONFLICT ON CONSTRAINT distributor_plants_ukey DO NOTHING";
            const deletetDistributorPlantsStatement = 'DELETE FROM staging.distributor_plants_staging';
            const deleteDistributorPlantsResponse = await client.query(deletetDistributorPlantsStatement);

            const upsertDistributorPlantsStatement =
                "INSERT INTO staging.distributor_plants_staging(distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business, reference_date, pdp_day, division_description) SELECT distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business, reference_date, pdp_day, division_description FROM json_populate_recordset (NULL::staging.distributor_plants_staging, '" +
                distributorsWithPlants +
                "') ON CONFLICT ON CONSTRAINT distributor_plants_staging_ukey DO NOTHING";

            const upsertDistributorPlantsResponse = await client.query(upsertDistributorPlantsStatement);

            return upsertDistributorPlantsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertDistributorPlants`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to distributor-plants_staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertMOQDbMapping(distributorsPlantsMOQ: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const upsertMOQDbMappingStatement = `BEGIN;
  
                                                  INSERT INTO moq_db_mapping (db_id, plant_id)
                                                                  SELECT db_id ,plant_id 
                                                                  FROM json_populate_recordset (NULL::moq_db_mapping, '${distributorsPlantsMOQ}')
                                                  ON CONFLICT ON CONSTRAINT db_plant_ukey DO NOTHING;
                                                  
                                                  DELETE FROM moq_db_mapping
                                                          WHERE key NOT IN 
                                                          (
                                                              WITH data AS (SELECT db_id ,plant_id 
                                                                          FROM json_populate_recordset (NULL::moq_db_mapping, '${distributorsPlantsMOQ}'))
                                                              SELECT mdm.key
                                                              FROM moq_db_mapping AS mdm
                                                              INNER JOIN data AS d
                                                              ON (mdm.db_id = d.db_id AND mdm.plant_id = d.plant_id)
                                                          );
                                                          
                                                  COMMIT;`;
            const upsertMOQDbMappingResponse = await client.query(upsertMOQDbMappingStatement);

            return upsertMOQDbMappingResponse;
        } catch (error) {
            logger.info(`Inside UtilModel.upsertMOQDbMapping, Error: `, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in upserting to moq_db_mapping: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },
    async fetchDistributors() {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const fetchDistributorsStatement = 'SELECT * FROM distributor_master WHERE deleted = false';
            const fetchDistributorsResponse = await client.query(fetchDistributorsStatement);

            return fetchDistributorsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.fetchDistributors`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in fetching distributors from distributor master: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async removeDistributors(deletedCodes: string[]) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const removeDistributorsStatement = 'UPDATE distributor_master SET deleted = true WHERE id IN (' + deletedCodes.toString() + ')';
            const removeDistributorsResponse = await client.query(removeDistributorsStatement);

            return removeDistributorsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.removeDistributors`, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in soft deleting in distributor master: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async upsertSalesHierarchyDetails(salesHierarchyDetails: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const upsertSalesHierarchyDetailsStatement =
                'INSERT INTO staging.sales_hierarchy_details_staging(user_id, first_name, last_name, email, mobile_number, manager_id, code, roles) ' +
                'SELECT user_id, first_name, last_name, email, mobile_number, manager_id, code, roles ' +
                "FROM json_populate_recordset (NULL::staging.sales_hierarchy_details_staging, '" +
                salesHierarchyDetails +
                "') ON CONFLICT (user_id) DO UPDATE SET " +
                'first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, ' +
                'mobile_number = EXCLUDED.mobile_number, manager_id = EXCLUDED.manager_id, code = EXCLUDED.code, ' +
                'roles = EXCLUDED.roles, deleted = false';
            const upsertSalesHierarchyDetailsResponse = await client.query(upsertSalesHierarchyDetailsStatement);

            return upsertSalesHierarchyDetailsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.upsertSalesHierarchyDetails`, error);
            LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, `Error in upserting in sales hierarchy details staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async fetchSalesHierarchyDetails() {
        let client: PoolClient | null = null;

        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = 'SELECT user_id FROM sales_hierarchy_details WHERE deleted = false';
            const fetchSalesHierarchyDetailsResponse = await client.query(fetchSalesHierarchyDetailsStatement);

            return fetchSalesHierarchyDetailsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.fetchSalesHierarchyDetails`, error);
            LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, `Error in fetching sales hierarchy users from sales hierarchy details: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async removeSalesHierarchyDetails(deletedUserIds: string[]) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const removeSalesHierarchyDetailsStatement =
                'UPDATE sales_hierarchy_details SET deleted = true WHERE user_id IN (' + deletedUserIds.toString() + ") AND manager_id != 'PORTAL_MANAGED'";
            const removeSalesHierarchyDetailsResponse = await client.query(removeSalesHierarchyDetailsStatement);

            return removeSalesHierarchyDetailsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.removeSalesHierarchyDetails`, error);
            LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, `Error in soft deleting in sales hierarchy details: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async insertMaterials(materials: any) {
        let client: PoolClient | null = null;
        client = await conn.getWriteClient();
        try {
            const insertMaterialsStatement = `
      INSERT
        INTO
        staging.material_master_staging(
            code,
            description,
            sales_unit,
            pak_type,
            product_hierarchy_code,
            buom_to_cs,
            pak_to_cs,
            brand,
            brand_desc,
            brand_variant,
            brand_variant_desc,
            ton_to_suom,
            buom,
            global_brand,
            global_brand_desc,
            variant,
            variant_desc,
            product,
            product_desc,
            category,
            category_desc
        )
      SELECT
          code,
          description,
          sales_unit,
          pak_type,
          product_hierarchy_code,
          buom_to_cs,
          pak_to_cs,
          brand,
          brand_desc,
          brand_variant,
          brand_variant_desc,
          ton_to_suom,
          buom,
          global_brand,
          global_brand_desc,
          variant,
          variant_desc,
          product,
          product_desc,
          category,
          category_desc
      FROM
          json_populate_recordset (
              NULL::staging.material_master_staging,
              '${materials}'
          ) ON
          CONFLICT (code) DO
      UPDATE
      SET
          description = EXCLUDED.description,
          sales_unit = EXCLUDED.sales_unit,
          pak_type = EXCLUDED.pak_type,
          product_hierarchy_code = EXCLUDED.product_hierarchy_code,
          buom_to_cs = EXCLUDED.buom_to_cs,
          pak_to_cs = EXCLUDED.pak_to_cs,
          brand = EXCLUDED.brand,
          brand_desc = EXCLUDED.brand_desc,
          brand_variant = EXCLUDED.brand_variant,
          brand_variant_desc = EXCLUDED.brand_variant_desc,
          ton_to_suom = EXCLUDED.ton_to_suom,
          buom = EXCLUDED.buom,
          global_brand = EXCLUDED.global_brand,
          global_brand_desc = EXCLUDED.global_brand_desc,
          variant = EXCLUDED.variant ,
          variant_desc = EXCLUDED.variant_desc,
          product = EXCLUDED.product,
          product_desc = EXCLUDED.product_desc,
          category = EXCLUDED.category,
          category_desc = EXCLUDED.category_desc,
          deleted = FALSE  
      `;
            const insertMaterialsResponse = await client.query(insertMaterialsStatement);

            return insertMaterialsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.insertMaterials`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async insertMaterialSalesData(materialSalesData: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const deletetMaterialSalesDataStatement = 'DELETE FROM staging.material_sales_details_staging';
            const deletetMaterialSalesDataResponse = await client.query(deletetMaterialSalesDataStatement);

            const insertMaterialSalesDataStatement =
                "INSERT INTO staging.material_sales_details_staging(material_code, sales_org, distribution_channel, division, line_of_business, unit_of_measurement, conversion_factor) SELECT material_code, sales_org, distribution_channel, division, line_of_business, unit_of_measurement, conversion_factor FROM json_populate_recordset (NULL::staging.material_sales_details_staging, '" +
                materialSalesData +
                "')";

            const insertMaterialSalesDataResponse = await client.query(insertMaterialSalesDataStatement);

            return insertMaterialSalesDataResponse;
        } catch (error) {
            logger.info(`error in UtilModel.insertMaterialSalesData`, error);
            LogService.insertSyncLog('Material', 'FAIL', null, null, `Error in inserting to materialSalesData_staging: ${error}`);

            return null;
        } finally {
            client?.release();
        }
    },

    async updateSearchTextField() {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            await client.query(
                "UPDATE material_master SET textsearchable_index_col = to_tsvector(coalesce(description) || ' ' || coalesce(tags->>'regional_brand_tags','') || ' ' || coalesce(tags->>'pack_measure_tags','') || ' ' || coalesce(tags->>'general_tags','') || ' ' || coalesce(tags->>'pack_type_tags',''))",
            );
        } catch (error) {
            logger.info(`error in UtilModel.updateSearchTextField`, error);
        } finally {
            client?.release();
        }
    },

    async fetchMaterials() {
        let client: PoolClient | null = null;
        client = await conn.getReadClient();
        try {
            const fetchMaterialsStatement = 'SELECT * FROM material_master WHERE deleted = false';
            const fetchMaterialsResponse = await client.query(fetchMaterialsStatement);

            return fetchMaterialsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.fetchMaterials`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async removeMaterials(deletedCodes: string[]) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const removeMaterialsStatement = 'UPDATE material_master SET deleted = true WHERE code IN (' + deletedCodes.toString() + ')';
            const removeMaterialsResponse = await client.query(removeMaterialsStatement);

            return removeMaterialsResponse;
        } catch (error) {
            logger.info(`error in UtilModel.removeMaterials`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async mapProductsToDistributors(productToAreasMapping: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const deactivateProductsStatement =
                "UPDATE material_master set status = 'INACTIVE', start_date = NULL, appl_area_channel = NULL  FROM (SELECT code FROM json_populate_recordset (NULL::material_master, '" +
                productToAreasMapping +
                "')) AS temp WHERE material_master.code != temp.code";
            await client.query(deactivateProductsStatement);
            const productToAreasMappingStatement =
                "UPDATE material_master SET appl_area_channel = temp.appl_area_channel, status = 'ACTIVE', start_date = temp.start_date FROM (SELECT code, appl_area_channel, start_date FROM json_populate_recordset (NULL::material_master, '" +
                productToAreasMapping +
                "')) AS temp WHERE material_master.code = temp.code";
            const productToAreasMappingResponse = await client.query(productToAreasMappingStatement);

            if (productToAreasMappingResponse && productToAreasMappingResponse.command === 'UPDATE') {
                return productToAreasMappingResponse.rowCount;
            }
            return false;
        } catch (error) {
            logger.info(`error in UtilModel.insertMaterials`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async getAppLevelConfigurations() {
        let client: PoolClient | null = null;
        logger.info('Inside UtilModel-> getAppLevelConfigurations');

        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT key, value FROM app_level_settings`;
            return await client.query(sqlStatement);
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> getAppLevelConfigurations: ', error);
        } finally {
            client?.release();
        }
    },

    async updateOpenSO(soDetails: string, distributorId: string) {
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const updateOpenSOStatement =
                "UPDATE orders SET updated_on = now(), so_value = temp.so_value, delivery_no = temp.delivery_no, invoice_no = temp.invoice_no, status = temp.status FROM (SELECT so_number, so_value, delivery_no, invoice_no, status FROM json_populate_recordset (NULL::orders, '" +
                soDetails +
                "')) AS temp WHERE orders.distributor_id = '" +
                distributorId +
                "' AND orders.so_number = temp.so_number RETURNING orders.so_number, orders.order_data";
            logger.info(`update open so sql statement: ${updateOpenSOStatement}`);
            const updateOpenSOResponse = await client.query(updateOpenSOStatement);

            return updateOpenSOResponse;
        } catch (error) {
            logger.info(`error in UtilModel.updateOpenSO`, error);

            return null;
        } finally {
            client?.release();
        }
    },

    async insertRorData(order_data, so_number) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let orderDataQuery = 'Update orders set order_data = $1 where so_number = $2';
            const OrderData = await client.query(orderDataQuery, [order_data, so_number]);
        } catch (error) {
            logger.error('CAUGHT: Error in utilModel -> insertRorData: ', error);
        } finally {
            client?.release();
        }
    },

    async getAppSettings(keys: string[] | null = null) {
        let client: PoolClient | null = null;
        let sqlStatement = `SELECT key, value FROM app_level_settings`;
        keys && (sqlStatement += ` WHERE key IN ('${keys.join("', '")}')`);
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rows) return result.rows;
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in UtilModel.getAppSettings ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async runDbSyncProc(uuid: string) {
        logger.info('Inside UtilModel-> RunDbSyncProc');
        let client: PoolClient | null = null;

        try {
            const runDbSyncProcStatement = `CALL public.distributor_sync_proc('${uuid}')`;
            client = await conn.getWriteClient();
            const res = await client.query(runDbSyncProcStatement);
            return res;
        } catch (error) {
            logger.error('CAUGHT : Error in UtilModel -> RunDbSyncProc', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async runMaterialSyncProc(uuid: string) {
        logger.info('Inside UtilModel-> runMaterialSyncProc');
        let client: PoolClient | null = null;

        try {
            const runMaterialSyncProcStatement = `CALL public.material_sync_proc('${uuid}')`;
            client = await conn.getWriteClient();
            const res = await client.query(runMaterialSyncProcStatement);
            return res;
        } catch (error) {
            logger.error('CAUGHT : Error in UtilModel -> runMaterialSyncProc', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async runSalesHierarchySyncProc(uuid: string) {
        logger.info('Inside UtilModel-> runSalesHierarchySyncProc');
        let client: PoolClient | null = null;

        try {
            const runSHSyncProcStatement = `CALL public.sales_hierarchy_sync_proc('${uuid}')`;
            client = await conn.getWriteClient();
            const res = await client.query(runSHSyncProcStatement);
            return res;
        } catch (error) {
            logger.error('CAUGHT : Error in UtilModel -> runSalesHierarchySyncProc', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncProcedureStatus(uuid: string, syncType: string) {
        logger.info('Inside UtilModel-> syncProcedureStatus');
        let client: PoolClient | null = null;

        try {
            const sqlStatement = `SELECT result FROM sync_logs where sync_uuid = '${uuid}'`;
            client = await conn.getWriteClient();
            const res = await client.query(sqlStatement);
            return res.rows ? res.rows : null;
        } catch (error) {
            logger.error(`CAUGHT : Error in UtilModel -> syncProcedureStatus : FAILED to get ${syncType} procedure status :${error}`);
            return null;
        } finally {
            client?.release();
        }
    },
    async unlockNewDbsInPDPUnlockRequestWindow() {
        logger.info('Inside UtilModel-> unlockNewDbsInPDPUnlockRequestWindow');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            WITH dbs_unlocked AS (
            UPDATE public.distributor_master 
            SET enable_pdp = FALSE 
              ,pdp_unlock_id = du.request_id
            FROM (
              WITH pdp_requests AS (
                SELECT pur.request_id, pur.area_codes, pur.regions, pur.requested_by, pur.comments
                FROM pdp_unlock_request pur
                WHERE select_all = TRUE
                  AND pur.status = 'APPROVED'
                  AND current_date  BETWEEN pur.start_date::date AND pur.end_date::date
                ORDER BY pur.request_id
              ),
              new_distributors AS (
                SELECT dm.id
                  ,dm.tse_code
                  ,dm.area_code
                  ,gm.description AS region
                FROM distributor_master dm
                JOIN group5_master gm ON (dm.group5_id = gm.id)
                WHERE dm.created_on::date = current_date
              ),
              dbs_to_unlock AS (
                SELECT DISTINCT ON (nd.id) nd.id AS db_code , pr.request_id AS request_id, pr.requested_by, pr.comments
                FROM new_distributors nd
                INNER JOIN pdp_requests pr ON (nd.area_code = ANY(pr.area_codes))
              )
              SELECT db_code, request_id, requested_by, comments
              FROM dbs_to_unlock 
            ) AS du
            WHERE id = du.db_code AND enable_pdp = TRUE
            RETURNING id, du.request_id, du.requested_by, du.comments
          )
          INSERT INTO pdp_lock_audit_trail(distributor_id, status, updated_by, request_id, "comments")
            SELECT dul.id AS distributor_id, FALSE AS status, dul.requested_by AS updated_by, dul.request_id, dul.comments
            FROM dbs_unlocked AS dul
          ON CONFLICT DO NOTHING; 
      `;
            const res = await client.query(sqlStatement);
            return res?.rowCount;
        } catch (error) {
            logger.error('CAUGHT : Error in UtilModel -> unlockNewDbsInPDPUnlockRequestWindow', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async enableROandBOforNewDbs() {
        logger.info('Inside UtilModel-> enableROandBOforNewDbs');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            UPDATE public.distributor_master 
            SET ro_enable = du.ro_enable
              ,bo_enable = du.bo_enable
            FROM (
              WITH plant_config AS (	
                SELECT pm."name" AS plant , bool_or(dm.ro_enable) AS is_ro , bool_or(dm.bo_enable) AS is_bo
                FROM public.distributor_plants dp
                JOIN public.plant_master pm ON (dp.plant_id = pm.id)
                JOIN public.distributor_master dm ON (dp.distributor_id = dm.id and dm.created_on::date != current_date and dm.deleted = false and dm.status = 'ACTIVE')
                GROUP BY 1
              ),
              active_dbs AS (
                SELECT dm.id AS db_code, pm."name" AS plant
                FROM public.distributor_master dm
                JOIN public.distributor_plants dp ON (dm.id = dp.distributor_id AND dp.distribution_channel  = 10)
                JOIN public.plant_master pm ON (dp.plant_id = pm.id)
                WHERE dm.deleted = false and dm.status = 'ACTIVE'
                GROUP BY 1, 2
              )
              SELECT ad.db_code, bool_or(pc.is_ro) AS ro_enable, bool_or(pc.is_bo) AS bo_enable
              FROM active_dbs ad  
              JOIN plant_config pc ON (ad.plant = pc.plant)
              GROUP BY 1
            ) AS du
            WHERE id = du.db_code
            RETURNING id;
      `;
            const res = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> enableROandBOforNewDbs, dbs_updated: ' + res.rows.map((item) => item.id).toString());
            return res?.rowCount;
        } catch (error) {
            logger.error('Inside UtilModel-> enableROandBOforNewDbs, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async disableNourishcoDbsPDP() {
        logger.info('Inside UtilModel-> disableNourishcoDbsPDP');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            UPDATE public.distributor_master 
            SET enable_pdp = FALSE 
            WHERE deleted = FALSE 
              AND status = 'ACTIVE' 
              AND enable_pdp = TRUE 
              AND id IN (
                SELECT DISTINCT dp.distributor_id
                FROM public.distributor_plants dp
                WHERE dp.distribution_channel = 90
              )
            RETURNING id;
      `;
            const res = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> disableNourishcoDbsPDP, dbs_updated: ' + res.rows.map((item) => item.id).toString());
            return res?.rowCount;
        } catch (error) {
            logger.error('Inside UtilModel-> disableNourishcoDbsPDP, Error: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncCustomerCodes() {
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sql = `
        SELECT user_id, payer_code
        FROM kams_customer_mapping
        WHERE is_deleted = 'FALSE' 
        AND payer_code IS NOT NULL
      `;
            const res = await client.query(sql);
            const rows = res.rows;
            const userCustomerCodes: { [key: string]: string[] } = {};

            // Fetch customer codes by joining mt_ecom_payer_code_mapping with payer_codes
            for (const row of rows) {
                const { user_id, payer_code: payerCodeList } = row;
                if (Array.isArray(payerCodeList) && payerCodeList.length > 0 && payerCodeList[0] !== null) {
                    const payerCodes = payerCodeList[0]
                        .filter((payerCodeDict) => typeof payerCodeDict === 'object' && 'payer_code' in payerCodeDict)
                        .map((payerCodeDict) => payerCodeDict.payer_code);

                    if (payerCodes.length > 0) {
                        const customerCodeSql = `
              SELECT customer_code
              FROM mt_ecom_payer_code_mapping
              WHERE payer_code = any($1)
            `;
                        const customerCodeRes = await client.query(customerCodeSql, [payerCodes]);
                        const customerCodes = customerCodeRes.rows.map((row) => row.customer_code);
                        userCustomerCodes[user_id] = customerCodes;
                    }
                }
            }

            // Replace customer codes in kams_customer_mapping table based on user_id
            for (const [userId, customerCodes] of Object.entries(userCustomerCodes)) {
                const customerCodesArray = `{${customerCodes.join(',')}}`;
                const updateSql = `
          UPDATE kams_customer_mapping
          SET customer_code = $1
          WHERE user_id = $2
        `;
                await client.query(updateSql, [customerCodesArray, userId]);
            }

            // Log success in sync_logs
            LogService.insertSyncLog('KAMS_CUSTOMER_CODE_SYNC', 'SUCCESS', null, null, 'Customer code sync successful');

            return { message: 'Customer code sync successful' };
        } catch (error) {
            logger.error('Exception in syncCustomerCodes', error);

            // Log failure in sync_logs
            LogService.insertSyncLog('KAMS_CUSTOMER_CODE_SYNC', 'FAIL', null, null, `Customer code sync failed: ${error.message}`);

            return { message: 'Customer code sync failed' };
        } finally {
            client?.release();
        }
    },

    async fetchDistributorEmails(isEmpty: boolean = false) {
        logger.info('Inside UtilModel-> fetchDistributorEmails, isEmpty: ' + isEmpty);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const emptyCondition = isEmpty ? ` AND (up.email = 'noreply.pegasus@tataconsumer.com' OR up.email IS NULL) ` : '';
            const sqlStatement = `SELECT dm.id , up."name" , dm.tse_code 
                            FROM public.distributor_master dm 
                            INNER JOIN public.user_profile up ON (DM.id = up.id)
                            WHERE dm.deleted = FALSE 
                              AND dm.status = 'ACTIVE' 
	                            AND dm.tse_code IS NOT NULL
                            ${emptyCondition};`;
            const dbResponse = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> fetchDistributorEmails, dbCount: ' + dbResponse.rowCount);
            return dbResponse.rows;
        } catch (error) {
            logger.info(`error in UtilModel.fetchDistributorEmails`, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async setEmptyDistributorEmail(id: string, tseCode: string) {
        logger.info('Inside UtilModel-> setEmptyDistributorEmail, id: ' + id + ' ,tseCode: ' + tseCode);
        if (!id || !tseCode) {
            logger.error('Inside UtilModel-> setEmptyDistributorEmail, Error: Invalid distrbutor_id or tseCode');
            return false;
        }
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let tseCodeHierarchyQuery = UtilityFunctions.tseUpperHierarchyQueryByCode(tseCode);
            if (!tseCodeHierarchyQuery) {
                logger.error("Inside UtilModel-> setEmptyDistributorEmail, Error: Couldn't fetch tseCodeHierarchyQuery");
                return false;
            }
            tseCodeHierarchyQuery += ` LIMIT 1`;

            const sqlStatement = `
        WITH hierarchyDetails AS (
            ${tseCodeHierarchyQuery}
        )
        UPDATE public.user_profile
        SET email = hd.email
        FROM hierarchyDetails hd
        WHERE user_profile.id = $1;
      `;
            const res = await client.query(sqlStatement, [id]);
            return res.rowCount ? true : false;
        } catch (error) {
            logger.error('Inside UtilModel-> setEmptyDistributorEmail, Error: ', error);
            return false;
        } finally {
            client?.release();
        }
    },
    async fetchCustomerCodes() {
        logger.info('Inside UtilModel-> fetchCustomerCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT DISTINCT customer_code FROM mt_ecom_payer_code_mapping where customer_group IN ('14','16')`;
            const response = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> fetchCustomerCodes, dbCount: ' + response.rowCount);
            return response.rows;
        } catch (error) {
            logger.info(`error in UtilModel.fetchCustomerCodes`, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async soSyncData({ headerData, itemData }) {
        let client = null;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            // First insert headers and get their IDs
            const headerResult = await client.query(
                `
                INSERT INTO mt_ecom_header_table 
                (customer, customer_code, delivery_date, po_created_date, po_number, so_created_date, so_number, status)
                SELECT 
                    customer, 
                    customer_code, 
                    delivery_date::date, 
                    po_created_date::date, 
                    po_number, 
                    so_created_date::date, 
                    so_number, 
                    status
                FROM json_populate_recordset(null::mt_ecom_header_table, $1)
                ON CONFLICT (po_number) 
                DO UPDATE SET 
                    updated_on = NOW()
                RETURNING id, po_number`,
                [JSON.stringify(headerData)],
            );
            const headerMapping = {};
            headerResult.rows.forEach((row) => {
                headerMapping[row.po_number] = row.id;
            });
            const itemDataWithHeaderId = itemData.flatMap((items) => {
                // Handle array of arrays by flattening
                return items.map((item) => {
                    const matchingHeader = headerData.find((header) => header.so_number === item.sales_order);
                    return {
                        ...item,
                        po_id: matchingHeader ? headerMapping[matchingHeader.po_number] : null,
                    };
                });
            });
            const validItems = itemDataWithHeaderId.filter((item) => item.po_id !== null);
            await client.query(
                `
                      INSERT INTO mt_ecom_item_table 
                      (allocated_qty, caselot, customer_product_id, item_number, message, mrp,
                      plant_code, plant_name, po_id, po_item_description, psku_code, psku_description,
                      response_item_number, sales_order, sales_unit, so_qty, system_sku_code, system_sku_description,
                      target_qty, uom)
                      SELECT 
                          allocated_qty,
                          caselot,
                          customer_product_id,
                          item_number,
                          message,
                          mrp,
                          plant_code,
                          plant_name,
                          po_id,
                          po_item_description,
                          psku_code,
                          psku_description,
                          response_item_number,
                          sales_order,
                          sales_unit,
                          so_qty,
                          system_sku_code,
                          system_sku_description,
                          target_qty,
                          uom
                      FROM json_populate_recordset(null::mt_ecom_item_table, $1)
                      ON CONFLICT (po_id, item_number) 
                      DO UPDATE SET 
                          allocated_qty = EXCLUDED.allocated_qty,
                          message = EXCLUDED.message,
                          updated_on = NOW()`,
                [JSON.stringify(validItems)],
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in soSyncData: ', error);
            return false;
        } finally {
            client?.release();
        }
    },
    async getConfigurationValue(key: string) {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT * FROM public.app_level_settings WHERE key = '${key}' `;
            const response = await client.query(sqlStatement);

            return response?.rows[0]?.value;
        } catch (error) {
            logger.error('Exception in getAppLevelSettings:', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async previousProcessCalender() {
        logger.info('inside UtilModel -> previousProcessCalender');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `INSERT INTO infra.previous_process_calender (id, "date", expected_starttime, last_updated_by, updated_on,full_date)
                SELECT id, "date", expected_starttime, last_updated_by, updated_on,full_date FROM infra.process_calender  WHERE full_date IS NOT NULL ON CONFLICT (full_date) DO NOTHING;`;

            const sqlUpdatefullDate = `
                UPDATE infra.process_calender
                SET full_date = CASE
                WHEN date <= EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day') 
                THEN TO_DATE(TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-' || LPAD(date::TEXT, 2, '0'), 'YYYY-MM-DD'
                 )
                 ELSE NULL
                 END
                 WHERE date BETWEEN 1 AND 31;
                 `;
            const result = await client.query(sqlStatement);
            await client.query(sqlUpdatefullDate);

            return result?.rowCount;
        } catch (error) {
            logger.error(`Error in UtilModel -> :previousProcessCalender`, error);
            throw error;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async fetchExclusionCustomerCodes() {
        logger.info('Inside UtilModel-> fetchExclusionCustomerCodes');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT customer_code FROM public.mt_ecom_exclusion_customer_codes`;
            const response = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> fetchExclusionCustomerCodes, dbCount: ' + response.rowCount);
            return response.rows;
        } catch (error) {
            logger.info(`error in UtilModel.fetchExclusionCustomerCodes`, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getAllNourishcoPSKUAreaCombinations() {
        logger.info('inside UtilModel -> getAllNourishcoPSKUAreaCombinations');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH nco_areas AS (
            SELECT
                DISTINCT dm.area_code
            FROM
                distributor_master dm
            INNER JOIN distributor_plants dp ON
                dp.distributor_id = dm.id
            WHERE
                dm.deleted = FALSE
                AND dm.area_code IS NOT NULL
                AND dp.distribution_channel = 90
        ),
        nco_materials AS (
            SELECT
                DISTINCT mm.code,
                mm.description
            FROM
                material_master mm
            INNER JOIN material_sales_details msd ON
                msd.material_code = mm.code
            WHERE
                mm.deleted = FALSE
                AND msd.distribution_channel = 90
        )
        SELECT
            *
        FROM
            nco_areas ,
            nco_materials;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in UtilModel -> getAllNourishcoPSKUAreaCombinations: ', error);
            return null;
        } finally {
            client?.release();
        }
    },
    
    async getRoleByCode() {
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();

            const sqlStatement = `
            with codes as (
            select
                distinct
                dm.tse_code,
                dm.area_code,
                gm.rsm_code,
                gm.cluster_code
            from
                distributor_master dm
            inner join group5_master gm on gm.id = dm.group5_id
            where
                dm.deleted = false and gm.status = 'ACTIVE'
            )
            select  distinct tse_code as code, 'TSE' as role from codes union all  
            select distinct area_code as code, 'ASM' as role from codes union all
            select distinct rsm_code as code, 'RSM' as role from codes union all 
            select distinct cluster_code as code, 'CLUSTER_MANAGER' from codes;
            `;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Error in UtilModel.getRoleByCode:', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncPDDUnlockWindowRegions(){
        logger.info('Inside UtilModel-> syncPDDUnlockWindowRegions');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                INSERT INTO public.pdp_unlock_window(group5_id, start_date, end_date, updated_by)
                SELECT gm.id AS group5_id, 25 AS start_date, 1 AS end_date, 'SYSTEM_GENERATED' AS updated_by
                FROM group5_master gm
                ON CONFLICT(group5_id) DO NOTHING;
            `;
            const res = await client.query(sqlStatement);
            logger.info('Inside UtilModel-> syncPDDUnlockWindowRegions, regions inserted: ' + res.rowCount);
            return res?.rowCount;
        } catch (error) {
            logger.error('Inside UtilModel-> syncPDDUnlockWindowRegions, Error:', error);
            return null;
        } finally {
            client?.release();
        }
    }


};
