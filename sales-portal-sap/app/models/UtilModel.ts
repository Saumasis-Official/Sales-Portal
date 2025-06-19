/**
 * @file util model
 * @description defines util model methods
*/

import logger from '../lib/logger';
import _ from "lodash";
import { LogService } from '../service/LogService';
import helper from '../helper/index';
import commonHelperModel from '../models/helper.model';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { CUSTOMER_GROUPS_FOR_ORDERING } from '../constant/constants';
import { AutoClosureAuditTables } from '../../enum/autoClosureAuditTables';
import { roles, pegasus } from "../constant/persona";


const conn  = PostgresqlConnection.getInstance();
export const UtilModel = {
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
      `
      const insertMaterialsResponse = await client.query(insertMaterialsStatement);
     
      return insertMaterialsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.insertMaterials`, error);
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async insertMaterialSalesData(materialSalesData: string) {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getWriteClient();
      const deletetMaterialSalesDataStatement =
        'DELETE FROM staging.material_sales_details_staging';
      const deletetMaterialSalesDataResponse = await client.query(
        deletetMaterialSalesDataStatement,
      );

      const insertMaterialSalesDataStatement =
        "INSERT INTO staging.material_sales_details_staging(material_code, sales_org, distribution_channel, division, line_of_business, unit_of_measurement, conversion_factor) SELECT material_code, sales_org, distribution_channel, division, line_of_business, unit_of_measurement, conversion_factor FROM json_populate_recordset (NULL::staging.material_sales_details_staging, '" +
        materialSalesData +
        "')";

      const insertMaterialSalesDataResponse = await client.query(
        insertMaterialSalesDataStatement,
      );
    
      return insertMaterialSalesDataResponse;
    } catch (error) {
      logger.info(
        `error in UtilModel.insertMaterialSalesData`,
        error,
      );
      LogService.insertSyncLog(
        'Material',
        'FAIL',
        null,
        null,
        `Error in inserting to materialSalesData_staging: ${error}`,
      );
    
      return null;
    }
    finally {
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
    
    }
    finally {
      client?.release();
    }
  },

  async fetchMaterials() {
    let client: PoolClient | null = null;
    client = await conn.getReadClient();
    try {
      const fetchMaterialsStatement =
        'SELECT * FROM material_master WHERE deleted = false';
      const fetchMaterialsResponse = await client.query(
        fetchMaterialsStatement,
      );
     
      return fetchMaterialsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.fetchMaterials`, error);
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async removeMaterials(deletedCodes: string[]) {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getWriteClient();
      const removeMaterialsStatement =
        'UPDATE material_master SET deleted = true WHERE code IN (' +
        deletedCodes.toString() +
        ')';
      const removeMaterialsResponse = await client.query(
        removeMaterialsStatement,
      );
   
      return removeMaterialsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.removeMaterials`, error);
    
      return null;
    }
    finally {
      client?.release();
    }
  },

  async updateOpenSO(soDetails: string, distributorId: string) {
    let client: PoolClient | null = null;
   
    try {
      client = await conn.getWriteClient();
      const updateOpenSOStatement =
        "UPDATE orders SET updated_on = now(), so_value = temp.so_value, delivery_no = temp.delivery_no, invoice_no = temp.invoice_no, delivery_date_time=temp.delivery_date_time, invoice_date_time=temp.invoice_date_time, status = temp.status, eway_bill_number=temp.eway_bill_number, eway_bill_date_time=temp.eway_bill_date_time, rdd=temp.rdd  FROM (SELECT so_number, so_value, delivery_no, invoice_no, status, delivery_date_time, invoice_date_time, eway_bill_number, eway_bill_date_time, rdd  FROM json_populate_recordset (NULL::orders, '" +
        soDetails +
        "')) AS temp WHERE orders.distributor_id = '" +
        distributorId +
        "' AND orders.so_number = temp.so_number RETURNING orders.so_number, orders.order_data";
      logger.info(
        `update open so sql statement: ${updateOpenSOStatement}`,
      );
      const updateOpenSOResponse = await client.query(
        updateOpenSOStatement,
      );
    
      return updateOpenSOResponse;
    } catch (error) {
      logger.info(`error in UtilModel.updateOpenSO`, error);
     
      return null;
    }
    finally {
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

      const upsertRegionsResponse = await client.query(
        upsertRegionsStatement,
      );
     
      return upsertRegionsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertRegions`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to region master staging: ${error}`,
      );
     
      return null;
    }
    finally {
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

      const upsertCustomerGroupsResponse = await client.query(
        upsertCustomerGroupsStatement,
      );
     
      return upsertCustomerGroupsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertCustomerGroups`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to customer group master staging: ${error}`,
      );
    
      return null;
    }
    finally {
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

      const upsertPlantsResponse = await client.query(
        upsertPlantsStatement,
      );
     
      return upsertPlantsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertPlants`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to plant master staging: ${error}`,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async upsertGroup5s(group5s: string) {
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      const upsertGroup5sStatement =
        "INSERT INTO staging.group5_master_staging(name, description, rsm_code, cluster_code) SELECT name, description, rsm_code, cluster_code FROM json_populate_recordset (NULL::staging.group5_master_staging, '" +
        group5s +
        "') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *";

      const upsertGroup5sResponse = await client.query(
        upsertGroup5sStatement,
      );
     
      return upsertGroup5sResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertGroup5s`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to group5 master staging: ${error}`,
      );
      
      return null;
    }
    finally {
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

      const upsertProfilesResponse = await client.query(
        upsertProfilesStatement,
      );
     
      return upsertProfilesResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertProfiles`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to profile master staging: ${error}`,
      );
   
      return null;
    }
    finally {
      client?.release();
    }
  },

  async upsertDistributors(distributors: string) {

    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      const upsertDistributorsStatement =
        "INSERT INTO staging.distributor_master_staging(id, profile_id, city, postal_code, region_id, group_id, group5_id, tse_code, market, area_code, channel_code, grn_type) SELECT id, profile_id, city, postal_code, region_id, group_id, group5_id, tse_code, market, area_code, channel_code, grn_type FROM json_populate_recordset (NULL::staging.distributor_master_staging, '" +
        distributors +
        "') ON CONFLICT (id) DO UPDATE SET city = EXCLUDED.city, postal_code = EXCLUDED.postal_code, region_id = EXCLUDED.region_id, group_id = EXCLUDED.group_id, group5_id = EXCLUDED.group5_id, tse_code = EXCLUDED.tse_code, market = EXCLUDED.market, area_code = EXCLUDED.area_code, channel_code = EXCLUDED.channel_code, grn_type = EXCLUDED.grn_type, deleted = false";

      const upsertDistributorsResponse = await client.query(
        upsertDistributorsStatement,
      );
     
      return upsertDistributorsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.upsertDistributors`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to distributor master staging: ${error}`,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async setDistLiquidationFlag() {
    let client: PoolClient | null = null;
   
    try {
      client = await conn.getWriteClient();
      const setLiquidationFlagStatement = `UPDATE staging.distributor_master_staging SET liquidation = true 
                    WHERE liquidation = false AND status = 'ACTIVE' AND deleted = false;`;
      const setLiquidationFlagResponse = await client.query(
        setLiquidationFlagStatement,
      );

    
      return setLiquidationFlagResponse
        ? setLiquidationFlagResponse.rows
        : false;
    } catch (error) {
      logger.info(`error in UtilModel.setDistLiquidationFlag`, error);
    
      return null;
    }
    finally {
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
      const setPdpFlagResponse = await client.query(
        setPdpFlagStatement,
      );
     
      return setPdpFlagResponse ? setPdpFlagResponse.rows : false;
    } catch (error) {
      logger.info(`error in UtilModel.setDistPDPFlag`, error);
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async upsertDistributorPlants(distributorsWithPlants: string) {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getWriteClient();
      //const upsertDistributorPlantsStatement = "INSERT INTO distributor_plants(distributor_id, plant_id) SELECT distributor_id, plant_id FROM json_populate_recordset (NULL::distributor_plants, '" + distributorsWithPlants + "') ON CONFLICT ON CONSTRAINT distributor_plants_ukey DO NOTHING";
      const deletetDistributorPlantsStatement =
        'DELETE FROM staging.distributor_plants_staging';
      const deleteDistributorPlantsResponse = await client.query(
        deletetDistributorPlantsStatement,
      );
          
      const upsertDistributorPlantsStatement =
        "INSERT INTO staging.distributor_plants_staging(distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business, reference_date, pdp_day, division_description) SELECT distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business, reference_date, pdp_day, division_description FROM json_populate_recordset (NULL::staging.distributor_plants_staging, '" +
        distributorsWithPlants +
        "') ON CONFLICT ON CONSTRAINT distributor_plants_staging_ukey DO NOTHING";

      const upsertDistributorPlantsResponse = await client.query(
        upsertDistributorPlantsStatement,
      );
     
      return upsertDistributorPlantsResponse;
    } catch (error) {
      logger.info(
        `error in UtilModel.upsertDistributorPlants`,
        error,
      );
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to distributor-plants_staging: ${error}`,
      );
     
      return null;
    }
    finally {
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
      const upsertMOQDbMappingResponse = await client.query(
        upsertMOQDbMappingStatement,
      );
     
      return upsertMOQDbMappingResponse;
    } catch (error) {
      logger.info(
        `Inside UtilModel.upsertMOQDbMapping, Error: `,
        error,
      );
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in upserting to moq_db_mapping: ${error}`,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async fetchDistributors() {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getReadClient();
      const fetchDistributorsStatement =
        'SELECT * FROM distributor_master WHERE deleted = false';
      const fetchDistributorsResponse = await client.query(
        fetchDistributorsStatement,
      );
      
      return fetchDistributorsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.fetchDistributors`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in fetching distributors from distributor master: ${error}`,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async removeDistributors(deletedCodes: string[]) {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getWriteClient();
      const removeDistributorsStatement =
        'UPDATE distributor_master SET deleted = true WHERE id IN (' +
        deletedCodes.toString() +
        ')';
      const removeDistributorsResponse = await client.query(
        removeDistributorsStatement,
      );
      
      return removeDistributorsResponse;
    } catch (error) {
      logger.info(`error in UtilModel.removeDistributors`, error);
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `Error in soft deleting in distributor master: ${error}`,
      );
    
      return null;
    }
    finally {
      client?.release();
    }
  },

  async upsertSalesHierarchyDetails(salesHierarchyDetails: string) {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getWriteClient();
      const upsertSalesHierarchyDetailsStatement =
        "INSERT INTO staging.sales_hierarchy_details_staging(user_id, first_name, last_name, email, mobile_number, manager_id, code) SELECT user_id, first_name, last_name, email, mobile_number, manager_id, code FROM json_populate_recordset (NULL::staging.sales_hierarchy_details_staging, '" +
        salesHierarchyDetails +
        "') ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, mobile_number = EXCLUDED.mobile_number, manager_id = EXCLUDED.manager_id, code = EXCLUDED.code, deleted = false";
      const upsertSalesHierarchyDetailsResponse = await client.query(
        upsertSalesHierarchyDetailsStatement,
      );
    
      return upsertSalesHierarchyDetailsResponse;
    } catch (error) {
      logger.info(
        `error in UtilModel.upsertSalesHierarchyDetails`,
        error,
      );
      LogService.insertSyncLog(
        'SALES_HIER',
        'FAIL',
        null,
        null,
        `Error in upserting in sales hierarchy details staging: ${error}`,
      );
      
      return null;
    }
    finally {
      client?.release();
    }
  },

  async fetchSalesHierarchyDetails() {
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getReadClient();
      const fetchSalesHierarchyDetailsStatement =
        'SELECT user_id FROM sales_hierarchy_details WHERE deleted = false';
      const fetchSalesHierarchyDetailsResponse = await client.query(
        fetchSalesHierarchyDetailsStatement,
      );
     
      return fetchSalesHierarchyDetailsResponse;
    } catch (error) {
      logger.info(
        `error in UtilModel.fetchSalesHierarchyDetails`,
        error,
      );
      LogService.insertSyncLog(
        'SALES_HIER',
        'FAIL',
        null,
        null,
        `Error in fetching sales hierarchy users from sales hierarchy details: ${error}`,
      );
   
      return null;
    }
    finally {
      client?.release();
    }
  },

  async removeSalesHierarchyDetails(deletedUserIds: string[]) {
    let client: PoolClient | null = null;
   
    try {
      client = await conn.getWriteClient();
      const removeSalesHierarchyDetailsStatement =
        'UPDATE staging.sales_hierarchy_details_staging SET deleted = true WHERE user_id IN (' +
        deletedUserIds.toString() +
        ") AND manager_id != 'PORTAL_MANAGED'";
      const removeSalesHierarchyDetailsResponse = await client.query(
        removeSalesHierarchyDetailsStatement,
      );
     
      return removeSalesHierarchyDetailsResponse;
    } catch (error) {
      logger.info(
        `error in UtilModel.removeSalesHierarchyDetails`,
        error,
      );
      LogService.insertSyncLog(
        'SALES_HIER',
        'FAIL',
        null,
        null,
        `Error in soft deleting in sales hierarchy details: ${error}`,
      );
       
      return null;
    }
    finally {
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
      const productToAreasMappingResponse = await client.query(
        productToAreasMappingStatement,
      );
     
      if (
        productToAreasMappingResponse &&
        productToAreasMappingResponse.command === 'UPDATE'
      ) {
        return productToAreasMappingResponse.rowCount;
      }
      return false;
    } catch (error) {
      logger.info(`error in UtilModel.insertMaterials`, error);
      
      return null;
    }
    finally {
      client?.release();
    }
  },

  async addUsers(userList: any) {
    let client: PoolClient | null = null;
    logger.info(`inside model UtilModel.addUsers`);
    
    try {
      client = await conn.getWriteClient();
      const addUsersqlStatement =
        "INSERT INTO sales_hierarchy_details(user_id, first_name, last_name, email, mobile_number, manager_id, code, roles) SELECT user_id, first_name, last_name, email, mobile_number, manager_id, code, roles FROM json_populate_recordset(NULL:: sales_hierarchy_details, '" +
        userList +
        "')";
      const addUsersResponse = await client.query(
        addUsersqlStatement,
      );
     
      return addUsersResponse;
    } catch (error) {
      logger.error(`error in UtilModel.addUsers: `, error);
      
      return null;
    }
    finally {
      client?.release();
    }
  },

  async addMappingRequests(
    status: any,
    type: any,
    distributor_code: any,
    TSE_code: any,
    ASMRSM_code: any,
    submission_comments: string,
    createdBy: string,
  ) {
    let client: PoolClient | null = null;
    logger.info(`inside model UtilModel.addMappingRequests`);
    
    try {
      client = await conn.getWriteClient();
      const checkDBCodeQuery = `SELECT count(distinct profile_id) FROM distributor_master where profile_id='${distributor_code}' and deleted = 'false' and status = 'ACTIVE'`;
      const checkDBCode = await client.query(checkDBCodeQuery);
      const shNumber = await helper.generateUId(
        'mapping_requests',
        'sh_number',
        'SH',
      );
      
      if (shNumber && checkDBCode.rows[0].count == 1) {
        const addMappingRequestSqlStatement = `INSERT INTO mapping_requests(sh_number,status, type, distributor_code, TSE_code, ASMRSM_code, submission_comments, created_by) 
                    VALUES
                    ('${shNumber}','${status}', '${type}', '${distributor_code}', '${TSE_code}', '${ASMRSM_code}',${submission_comments ? `'${submission_comments}'` : null
          }, '${createdBy}')`;
        const addMappingRequestSqlStatementResponse =
          await client.query(addMappingRequestSqlStatement);
       
        return addMappingRequestSqlStatementResponse;
      } else {
        logger.error(
          `error in UtilModel.addMappingRequest: Distributor Code does not exist.`,
        );
      
        return null;
      }
    } catch (error) {
      logger.error(`error in UtilModel.addMappingRequest: `, error);
      
      return null;
    }
    finally {
      client?.release();
    }
  },

  async getMappingRequestListByAdminRole(
    rolesArr: string[],
    code: string,
    limit: number,
    offset: number,
    status: string,
    search: string,
  ) {
    logger.info(
      `inside model UtilModel.getMappingRequestListByAdminRole`,
    );
    let client: PoolClient | null = null;
   
    try {
      client = await conn.getReadClient();
      const requestTypeSearchSubQuery = ` (SELECT req_type::request_type
                FROM (SELECT unnest(enum_range(NULL::request_type))::text AS req_type) AS req_enum
                WHERE req_enum.req_type ILIKE '${search}%')`;
      let typeSearchCondition = ` OR mr.type = ${requestTypeSearchSubQuery}`;

      let searchConditions = ` (
                mr.distributor_code ILIKE '%${search}%' 
                OR up.name ILIKE '%${search}%' 
                OR mr.tse_code ILIKE '%${search}%' 
                OR shd.first_name ILIKE '%${search}%' 
                OR shd.last_name ILIKE '%${search}%'
                OR mr.sh_number ILIKE '%${search}%' 
                ${typeSearchCondition}`;

      let limitOffset = ` ORDER BY mr.status, mr.id DESC LIMIT ${limit} OFFSET ${offset} `;

      let sqlStatement = `
            SELECT DISTINCT ON (mr.status, mr.id)
            mr.id,
            mr.sh_number,
            mr.status,
            mr.type,
            mr.distributor_code,
            mr.tse_code,
            mr.asmrsm_code,
            mr.submission_comments,
            mr.comments,
            mr.created_by,
            mr.updated_by,
            mr.created_on,
            mr.updated_on,
            up.name AS db_name,
            dm.tse_code AS existing_tse_code,
            s_h_d.first_name AS existing_tse_first_name,
            s_h_d.last_name AS existing_tse_last_name,
            s_h_d.email AS existing_tse_email,
            shd.first_name AS tse_fname,
            shd.last_name AS tse_lname 
            FROM mapping_requests AS mr 
            INNER JOIN user_profile AS up ON mr.distributor_code = up.id
            INNER JOIN distributor_master AS dm ON dm.id = mr.distributor_code   
            INNER JOIN sales_hierarchy_details AS shd ON  STRING_TO_ARRAY(mr.tse_code, ',') && STRING_TO_ARRAY(shd.code,',')
            INNER JOIN sales_hierarchy_details AS s_h_d ON STRING_TO_ARRAY(s_h_d.code,',') && STRING_TO_ARRAY(dm.tse_code,',')
            WHERE shd.deleted = 'false'
            AND s_h_d.deleted = 'false'
            AND shd.status = 'ACTIVE'
            AND s_h_d.status = 'ACTIVE'`;

      if (rolesArr.includes(roles.TSE)) {
        sqlStatement += ` AND STRING_TO_ARRAY(mr.tse_code, ',')  && STRING_TO_ARRAY('${code}',',') `;
      } else if (rolesArr.includes(roles.ASM)) {
        sqlStatement += ` AND STRING_TO_ARRAY(mr.asmrsm_code, ',') && STRING_TO_ARRAY('${code}',',') `;
      } else if (_.intersection(rolesArr, [roles.DIST_ADMIN, roles.RSM, roles.CLUSTER_MANAGER]).length > 0) {
        sqlStatement += ` AND dm.tse_code IN ${commonHelperModel.tseHierarchyQueryByCode(
          code,
        )} `;
      }

      if (status) {
        sqlStatement += ` AND mr.status = '${status}'`;
      }
      if (search) {
        sqlStatement += ` AND ${searchConditions}`;
      }

      sqlStatement += limitOffset;
      const rows = await client.query(sqlStatement);
    
      return rows;
    } catch (error) {
      logger.error(
        `error in UtilModel.getMappingRequestListByAdminRole: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async getMappingRequestListByAdminRoleCount(
    rolesArr: string[],
    code: string,
    status: string,
    search: string,
  ) {
    logger.info(
      `inside model UtilModel.getMappingRequestListByAdminRoleCount`,
    );
    let client: PoolClient | null = null;
    try {
      client = await conn.getReadClient();
      let sqlStatement = `
            SELECT COUNT(DISTINCT mr.sh_number)
            FROM mapping_requests AS mr 
            INNER JOIN user_profile AS up ON mr.distributor_code = up.id
            INNER JOIN distributor_master AS dm ON dm.id = mr.distributor_code   
            INNER JOIN sales_hierarchy_details AS shd ON STRING_TO_ARRAY(mr.tse_code,',') && STRING_TO_ARRAY(shd.code,',')
            INNER JOIN sales_hierarchy_details AS s_h_d ON STRING_TO_ARRAY(s_h_d.code,',') && STRING_TO_ARRAY(dm.tse_code,',')
            WHERE shd.deleted = 'false'
            AND s_h_d.deleted = 'false'
            AND shd.status = 'ACTIVE'
            AND s_h_d.status = 'ACTIVE'`;

      const requestTypeSearchSubQuery = ` (SELECT req_type::request_type
                FROM (SELECT unnest(enum_range(NULL::request_type))::text AS req_type) AS req_enum
                WHERE req_enum.req_type ILIKE '${search}%')`;
      let typeSearchCondition = ` OR mr.type = ${requestTypeSearchSubQuery}`;

      let searchConditions = ` (
                mr.distributor_code ILIKE '%${search}%' 
                OR up.name ILIKE '%${search}%' 
                OR mr.tse_code ILIKE '%${search}%' 
                OR shd.first_name ILIKE '%${search}%' 
                OR shd.last_name ILIKE '%${search}%'
                OR mr.sh_number ILIKE '%${search}%' 
                ${typeSearchCondition}`;

      if (rolesArr.includes(roles.TSE)) {
        sqlStatement += ` AND STRING_TO_ARRAY(mr.tse_code, ',')  && STRING_TO_ARRAY('${code}',',') `;
      } else if (rolesArr.includes(roles.ASM)) {
        sqlStatement += ` AND STRING_TO_ARRAY(mr.asmrsm_code, ',') && STRING_TO_ARRAY('${code}',',') `;
      } else if (_.intersection(rolesArr, [roles.DIST_ADMIN, roles.RSM, roles.CLUSTER_MANAGER]).length > 0) {
        sqlStatement += ` AND dm.tse_code IN ${commonHelperModel.tseHierarchyQueryByCode(
          code,
        )} `;
      }

      if (status) {
        sqlStatement += ` AND mr.status = '${status}'`;
      }
      if (search) {
        sqlStatement += ` AND ${searchConditions}`;
      }

      const rows = await client.query(sqlStatement);
     
      return rows;
    } catch (error) {
      logger.error(
        `error in UtilModel.getMappingRequestListByAdminRoleCount: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async updateDistributor(
    distributor_code: any,
    TSE_code: any,
    type: any,
  ) {
    logger.info(`inside model UtilModel.updateDistributor`);
    let client: PoolClient | null = null;
   
    try {
      client = await conn.getWriteClient();
      let updateDistributorMasterSqlStatements = '';
      updateDistributorMasterSqlStatements = `UPDATE distributor_master SET tse_code = '${TSE_code}' WHERE  id = '${distributor_code}';`;
      const updateDistributorMasterResponse = await client.query(
        updateDistributorMasterSqlStatements,
      );
    
      return updateDistributorMasterResponse;
    } catch (error) {
      logger.error(`error in UtilModel.updateDistributor: `, error);
      
      return null;
    }
    finally {
      client?.release();
    }
  },

  async updateMappingRequest(
    mappingRequestId: number,
    status: any,
    comments: string,
    updatedBy: string,
  ) {
    logger.info(`inside model UtilModel.updateMappingRequests`);
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      let updateMappingRequestSqlStatement: string;
      updateMappingRequestSqlStatement = `UPDATE mapping_requests SET status = '${status}', updated_by = '${updatedBy}', comments ='${comments}',updated_on = CURRENT_TIMESTAMP  WHERE  id = '${mappingRequestId}' returning *;`;
      let updateMappingRequestResponse = await client.query(
        updateMappingRequestSqlStatement,
      );
     
      return updateMappingRequestResponse;
    } catch (error) {
      logger.error(
        `error in UtilModel.updateMappingRequest: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },
  async getTseList(userId: string) {
    let client: PoolClient | null = null;
    logger.info('inside UtilModel.getTseList');

   

    try {
      client = await conn.getReadClient();
      let sqlStatement = `SELECT shd.user_id, shd.code
          FROM sales_hierarchy_details shd
          WHERE shd.user_id IN (
            WITH RECURSIVE sales_hierarchy AS(
                SELECT shd.user_id,shd.code,shd.manager_id
                FROM sales_hierarchy_details shd
                WHERE shd.user_id='${userId}'
                AND shd.deleted=false
                UNION
                SELECT s.user_id, s.code,s.manager_id
                FROM sales_hierarchy_details s
                INNER JOIN sales_hierarchy h ON h.user_id=s.manager_id)
                SELECT DISTINCT user_id FROM sales_hierarchy)
          AND shd.roles='TSE'
          AND shd.status='ACTIVE';`;
      const result = client.query(sqlStatement);
     
      return result;
    } catch (error) {
      logger.error('error inside UtileModel.getTseList', error);
     
      return null;
    }
    finally {
      client?.release();
    }
  },
  async getDistributorUnderTse(
    roleArr: string[],
    code: string | any,
    email: string | any,
  ) {
    let client: PoolClient | null = null;
    logger.info(`inside model UtilModel.getDistributorUnderTse`);
    email = email.toLowerCase().toString();
   
    let asmCode = '';
    if (code != null) {
      let asmCodesArr: string[] = [];
      const codesArr = code.split(',');
      codesArr?.forEach((item: string) =>
        asmCodesArr.push(`'${item.substring(0, 4)}'`),
      );
      asmCode = `( ${asmCodesArr.join(',')} )`;
    }
    try {
      client = await conn.getReadClient();
      let columnName = '';
      if (roleArr.includes(roles.LOGISTIC_OFFICER)) {
        columnName = 'logistic_email';
      } else if (roleArr.includes(roles.ZONAL_OFFICER)) {
        columnName = 'zone_manager_email';
      }
      let sqlStatement = `SELECT dm.profile_id, dm.area_code, dm.tse_code, up.name, cgm.name as customer_group
            FROM distributor_master dm
            inner join user_profile up
            on up.id = dm.profile_id
            left join customer_group_master cgm on dm.group_id= cgm.id
            WHERE dm.deleted = 'false' 
            AND dm.status = 'ACTIVE'
            AND cgm.name NOT IN('16', '42', '19', '21', '41')`;

      let sqlStatementLogisticsAndZonalOfficer = `
            select distinct  gm.id as zone,dm.profile_id,up."name" ,dm.tse_code ,dm.area_code   ,cgm."name" as customer_group
            from cfa_depot_mapping cdm 
            inner join group5_master gm on gm.id  = cdm.group5_id 
            inner join  distributor_master dm on dm.group5_id  = gm.id  
            inner join  user_profile up on up.id = dm.profile_id 
            left  join  customer_group_master cgm on dm.group_id= cgm.id
            where  cdm.${columnName} like ('%${email}%')
            and dm.status = 'ACTIVE' 
            and dm.deleted =false 
            and cgm."name" not in('16','19','42','21','41')`;

      if (_.intersection(roleArr, [roles.TSE, roles.ASM]).length > 0) {
        sqlStatement += ` AND area_code IN ${asmCode} `;
        const rows = await client.query(sqlStatement);
       
        return rows;
      } else if (_.intersection(roleArr, [...pegasus.ADMIN]).length > 0) {
        const rows = await client.query(sqlStatement);
      
        return rows;
      } else if (_.intersection(roleArr, [roles.RSM, roles.DIST_ADMIN, roles.CLUSTER_MANAGER])) {
        sqlStatement += ` AND dm.tse_code IN ${commonHelperModel.tseHierarchyQueryByCode(
          code,
        )} `;
        const rows = await client.query(sqlStatement);
        
        return rows;
      } else if (_.intersection(roleArr, [roles.LOGISTIC_OFFICER, roles.ZONAL_OFFICER]).length > 0) {
        const rows = await client.query(
          sqlStatementLogisticsAndZonalOfficer,
        );
        return rows;
      } else {
        logger.error(`error in UtilModel.getDistributorUnderTSE:`);
      
        return null;
      }
    } catch (error) {
      logger.error(
        `error in UtilModel.getDistributorUnderTse: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },
  async getPlantUpdateRequestByAdminRole(
    roles,
    code,
    limit,
    offset,
    status,
    search,
    first_name,
    user_id,
    email,
  ) {
    let client: PoolClient | null = null;
    logger.info(
      `Inside model UtilModel.getPlantUpdateRequestByAdminRole`,
    );
    
    try {
      client = await conn.getReadClient();
      let sqlStatement;
      let searchConditions;
      if (roles == 'TSE') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where code='${code}'`;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'SUPER_ADMIN' || roles == 'SUPPORT' || roles === 'PORTAL_OPERATIONS') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where pcr.pc_number IS NOT NULL `;
        searchConditions = ` and (pcr.distributor_code ILIKE '%${search}%'OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'ASM') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where code ILIKE '${code.slice(
          0,
          4,
        )}%'`;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'DIST_ADMIN' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where code IN ${commonHelperModel.tseHierarchyQuery(
          user_id,
        )}`;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles === 'LOGISTIC_OFFICER') {
        sqlStatement = `SELECT DISTINCT pcr.pc_number,pcr.id, pcr.salesorg, pcr.division, pcr.distribution_channel, pcr.plant_code, pcr.code, pcr.distributor_name,
                pcr.distributor_code, pcr.comments, pcr.logistic_response, pcr.requested_type, pcr.status, pcr.created_by, pcr.update_by,
                pcr.created_on, pcr.update_on , pcr.previous_salesdetails FROM plant_code_update_request as
                pcr INNER JOIN cfa_depot_mapping on pcr.plant_code = cfa_depot_mapping.depot_code
                INNER JOIN sales_hierarchy_details on LOWER(cfa_depot_mapping.logistic_email) ILIKE CONCAT('%', LOWER(sales_hierarchy_details.email), '%') where  LOWER(sales_hierarchy_details.email) ='${email.toLowerCase()}'`;
        searchConditions = ` and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles === 'ZONAL_OFFICER') {
        let zonalQuery = `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                WHERE zone_manager_email ILIKE '%${email}%'
                OR cluster_manager_email ILIKE '%${email}%'
                AND is_deleted = 'false'`;
        sqlStatement = `SELECT DISTINCT pcr.pc_number,pcr.id, pcr.salesorg, pcr.division, pcr.distribution_channel, pcr.plant_code, pcr.code, pcr.distributor_name,
                pcr.distributor_code, pcr.comments, pcr.logistic_response, pcr.requested_type, pcr.status, pcr.created_by, pcr.update_by,
                pcr.created_on, pcr.update_on , pcr.previous_salesdetails FROM plant_code_update_request as pcr 
                INNER JOIN ( ${zonalQuery} ) AS cfa ON
                pcr.salesorg = cfa.sales_org AND pcr.division = cfa.division AND pcr.distribution_channel = cfa.distribution_channel AND pcr.plant_code = cfa.depot_code
                                WHERE pcr.pc_number IS NOT NULL `;
        searchConditions = ` and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      }
      let limitOffset = ` ORDER BY pcr.created_on DESC,pcr.status, pcr.id DESC LIMIT ${limit} OFFSET ${offset} `;
      if (status && status !== 'ALL')
        sqlStatement += ` AND pcr.status='${status}' `;
      if (search) {
        sqlStatement += `${searchConditions}`;
      }
      sqlStatement += limitOffset;
      logger.info(
        'Inside UtilModel.getPlantUpdateRequestByAdminRole: sqlstatement: ' +
        sqlStatement,
      );
      const res = await client.query(sqlStatement);
      logger.info(
        'Inside UtilModel.getPlantUpdateRequestByAdminRole: rowCount',
        res.rowCount,
      );
    
      return res;
    } catch (error) {
      logger.error(
        `Error in UtilModel.getPlantUpdateRequestByAdminRole: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },
  async getPlantUpdateRequestCountByAdminRole(
    roles,
    code,
    limit,
    offset,
    status,
    search,
    first_name,
    user_id,
    email,
  ) {
    logger.info(
      `Inside model UtilModel.getPlantUpdateRequestByAdminRole`,
    );
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getReadClient();
      let sqlStatement;
      let searchConditions;
      if (roles == 'TSE') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where STRING_TO_ARRAY(code,',') && STRING_TO_ARRAY('${code}',',') `;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'SUPER_ADMIN' || roles == 'SUPPORT' || roles === 'PORTAL_OPERATIONS') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where pcr.pc_number IS NOT NULL `;
        searchConditions = ` and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'DIST_ADMIN' || roles === 'RSM' || roles === 'CLUSTER_MANAGER') {
        sqlStatement = `SELECT * FROM plant_code_update_request as pcr where code ILIKE '${code.slice(
          0,
          4,
        )}%'`;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles == 'LOGISTIC_OFFICER') {
        sqlStatement = `SELECT DISTINCT pcr.pc_number,pcr.id, pcr.salesorg, pcr.division, pcr.distribution_channel, pcr.plant_code, pcr.code, pcr.distributor_name,
                pcr.distributor_code, pcr.comments, pcr.logistic_response, pcr.requested_type, pcr.status, pcr.created_by, pcr.update_by,
                pcr.created_on::date, pcr.update_on FROM plant_code_update_request as
                pcr INNER JOIN cfa_depot_mapping on pcr.plant_code = cfa_depot_mapping.depot_code
                INNER JOIN sales_hierarchy_details on LOWER(cfa_depot_mapping.logistic_email) ILIKE CONCAT('%', LOWER(sales_hierarchy_details.email), '%') where  LOWER(sales_hierarchy_details.email) ='${email.toLowerCase()}'`;
        searchConditions = `  and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      } else if (roles === 'ZONAL_OFFICER') {
        let zonalQuery = `SELECT depot_code::text, sales_org::text, distribution_channel::text, division::text FROM cfa_depot_mapping 
                WHERE zone_manager_email ILIKE '%${email}%'
                OR cluster_manager_email ILIKE '%${email}%'
                AND is_deleted = 'false'`;
        sqlStatement = `SELECT DISTINCT pcr.pc_number,pcr.id, pcr.salesorg, pcr.division, pcr.distribution_channel, pcr.plant_code, pcr.code, pcr.distributor_name,
                pcr.distributor_code, pcr.comments, pcr.logistic_response, pcr.requested_type, pcr.status, pcr.created_by, pcr.update_by,
                pcr.created_on, pcr.update_on , pcr.previous_salesdetails FROM plant_code_update_request as pcr 
                INNER JOIN ( ${zonalQuery} ) AS cfa ON
                pcr.salesorg = cfa.sales_org AND pcr.division = cfa.division AND pcr.distribution_channel = cfa.distribution_channel AND pcr.plant_code = cfa.depot_code
                                WHERE pcr.pc_number IS NOT NULL `;
        searchConditions = ` and (pcr.distributor_code ILIKE '%${search}%' OR pcr.plant_code ILIKE '%${search}%' OR pcr.pc_number ILIKE '%${search}%' OR pcr.distributor_name ILIKE '%${search}%') `;
      }
      if (status && status !== 'ALL')
        sqlStatement += ` AND pcr.status='${status}' `;
      if (search) {
        sqlStatement += `${searchConditions}`;
      }
      logger.info(
        'Inside UtilModel.getPlantUpdateRequestByAdminRole: sqlstatement = ' +
        sqlStatement,
      );
      const res = await client.query(sqlStatement);
      logger.info(
        'Inside UtilModel.getPlantUpdateRequestByAdminRole: rows',
        res,
      );
     
      return res;
    } catch (error) {
      logger.error(
        `Error in UtilModel.getPlantUpdateRequestByAdminRole: `,
        error,
      );
     
      return null;
    }
    finally {
      client?.release();
    }
  },

  async getCustomerGroupDetails() {

    logger.info('Inside UtilModel-> getCustomerGroupDetails');
    let client: PoolClient | null = null;
    
    try {
      client = await conn.getReadClient();
      const query = `SELECT cg.name, cg.description, cg.pdp_update_enabled , cg.pdp_unlock_enabled
            FROM customer_group_master cg
            WHERE cg.status = 'ACTIVE' AND (cg.name IS NOT NULL AND cg.name != '')`;
      const response = await client.query(query);
      return response.rows;
    } catch (error) {
    
      logger.error(
        'Inside UtilModel-> getCustomerGroupDetails, Error = ',
        error,
      );
      return null;
    }
    finally {
      client?.release();
    }
  },

  async syncAreaCodeTable() {
    logger.info('Inside UtilModel-> syncAreaCodeTable');
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      /** SOPE-1324, length check applied in area code, since area_code in forecast_configurations table is VARCHAR(4) */
      const query = `
            BEGIN;
            TRUNCATE table area_codes;
            INSERT INTO area_codes (code , group5_id)
            SELECT DISTINCT ON(dm.area_code) 
              dm.area_code AS code, dm.group5_id
            FROM distributor_master dm
            WHERE dm.deleted = FALSE AND dm.status = 'ACTIVE' AND dm.area_code IS NOT NULL AND dm.group5_id IS NOT NULL;
            COMMIT;
            `;
      const response = await client.query(query);
     
      return response;
    } catch (error) {
    
      logger.error(
        'Inside UtilModel-> syncAreaCodeTable, Error = ',
        error,
      );
      return null;
    }
    finally {
      client?.release();
    }
  },

  async syncArsToleranceTable() {
   
    logger.info('Inside UtilModel-> syncArsToleranceTable');
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      const query = `
            update
                ars_tolerance
            set
                deleted = true;

            insert
                into
                ars_tolerance (customer_group_id,
                area_code)
            select
                distinct 
                group_id ,
                area_code
            from
                distributor_master dm
            inner join area_codes ac on
                dm.area_code = ac.code
            inner join customer_group_master cgm on
                (dm.group_id = cgm.id
                    and cgm.name in ('${CUSTOMER_GROUPS_FOR_ORDERING.join("' , '")}'))
            order by
                    area_code,
                    group_id
            on
                conflict (area_code,
                customer_group_id)
                    do
            update
            set
                deleted = false;`;
      const response = await client.query(query);
      return response;
    } catch (error) {
     
      logger.error(
        'Inside UtilModel-> syncArsToleranceTable, Error = ',
        error,
      );
      return null;
    }
    finally {
      client?.release();
    }
  },
  async mapProductsToMDMData(data) {
    logger.info('Inside UtilModel-> mapProductsToMDMData');
    let client: PoolClient | null = null;
    let sqlStatement = `
        WITH csv_record AS (
            SELECT
                psku,
                psku_desc,
                sku,
                sku_desc,
                customer_name,
                plant_code,
                region,
                updated_on
            FROM
                json_populate_recordset(null::mdm_material_data, $1)
        ),
        mismatch_table AS (
            SELECT
                psku,
                psku_desc,
                sku,
                sku_desc,
                customer_name,
                plant_code,
                region,
                updated_on,
                ROW_NUMBER() OVER (PARTITION BY psku,sku, customer_name, region ) AS row_num
            FROM
                csv_record
            EXCEPT
            SELECT
                psku,
                psku_desc,
                sku,
                sku_desc,
                customer_name,
                plant_code,
                region,
                updated_on,
                ROW_NUMBER() OVER (PARTITION BY psku,sku, customer_name, region) AS row_num
            FROM
                mdm_material_data
        )
        INSERT INTO mdm_material_data (
            psku,
            psku_desc,
            sku,
            sku_desc,
            customer_name,
            plant_code,
            region,
            updated_on
        )
        SELECT
            m.psku,
            m.psku_desc,
            m.sku,
            m.sku_desc,
            m.customer_name,
            m.plant_code,
            m.region,
            m.updated_on
        FROM
            mismatch_table m
        WHERE m.row_num = 1
        ON CONFLICT (psku, sku, customer_name, region,customer_code,vendor_code,site_code,plant_code)
        DO UPDATE SET
            psku = EXCLUDED.psku,
            psku_desc = EXCLUDED.psku_desc,
            sku = EXCLUDED.sku,
            sku_desc = EXCLUDED.sku_desc,
            plant_code = EXCLUDED.plant_code,
            customer_name = EXCLUDED.customer_name,
            updated_on = EXCLUDED.updated_on           
        `;
    try {
      client = await conn.getReadClient();
      const result = await client.query(sqlStatement, [
        JSON.stringify(data),
      ]);
      logger.info(
        'Inside UtilModel-> mapProductsToMDMData: result',
        result,
      );
      if (
        (result && result.command === 'UPDATE') ||
        result.command === 'INSERT'
      ) {
        logger.info(
          'Inside UtilModel-> mapProductsToMDMData: result',
          result,
        );
        return result.rowCount;
      }
      return false;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> mapProductsToMDMData: ',
        error,
      );
      return false;
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
      logger.error(
        'CAUGHT: Error in utilModel -> getAppLevelConfigurations: ',
        error,
      );
      return null;
    } finally {
      client?.release();
    }
  },
  async updateMDMData(data) {
    logger.info('Inside UtilModel-> updateMDMData');
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      const deactivateProductsStatement =
        "UPDATE mdm_material_data set mrp = temp.mrp,primary_buying_uom = temp.primary_buying_uom,mrp_uom_buying = temp.mrp_uom_buying,l1_pack = temp.l1_pack,l1_pack_uom = temp.l1_pack_uom,l2_pack = temp.l2_pack,l2_pack_uom = temp.l2_pack_uom,l3_pack = temp.l3_pack,l3_pack_uom = temp.l3_pack_uom,l4_pack = temp.l4_pack,l4_pack_uom = temp.l4_pack_uom  FROM (SELECT mrp,psku,primary_buying_uom,mrp_uom_buying,l1_pack,l1_pack_uom,l2_pack,l2_pack_uom,l3_pack,l3_pack_uom,l4_pack,l4_pack_uom FROM json_populate_recordset (NULL::mdm_material_data, '" +
        JSON.stringify(data) +
        "')) AS temp WHERE mdm_material_data.psku = temp.psku";
      logger.info(
        'Inside UtilModel-> updateMDMData: deactivateProductsStatement',
        deactivateProductsStatement,
      );
      let result = await client.query(deactivateProductsStatement);
      logger.info('Inside UtilModel-> updateMDMData: result', result);
      return result;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> updateMDMData: ',
        error,
      );
    } finally {
      client?.release();
    }
  },
  async getReOrderData(data) {
   
    let client: PoolClient | null = null;
    const login_id = data.login_id;
    const queryData = data.queryData;
   
    try {
      client = await conn.getReadClient();
      const checkSoNumberWithDistId = `Select * FROM orders 
            WHERE so_number=${queryData.so_number} 
            AND distributor_id = '${login_id}'  `;

      const checkSoNumberWithDistIdResult = await client.query(
        checkSoNumberWithDistId,
      );
      return checkSoNumberWithDistIdResult;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> getReOrderData: ',
        error,
      );
    } finally {
      client?.release();
    }
  },

  async getAddMappingRequests(data, manager_id) {
    let client: PoolClient | null = null;
     
    try {
      client = await conn.getWriteClient();
      const sqlStatement = `select shd.user_id, shd.first_name, shd.last_name, shd.email, shd.code, up.name, up.id, mr.sh_number
        from sales_hierarchy_details shd cross join user_profile up cross join mapping_requests mr
        where shd.user_id = ('${manager_id}')
        AND up.id = '${data.distributor_code}'
        AND mr.tse_code = '${data.TSE_code}'
        AND mr.distributor_code = '${data.distributor_code}'
        AND mr.type = '${data.type}'
        AND mr.status = '${data.status}'
        AND shd.status = 'ACTIVE'        
        AND shd.deleted = 'false'
        `;

      const result = await client.query(sqlStatement);
      return result;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> getReOrderData: ',
        error,
      );
      return error;
    }
    finally {
      client?.release();
    }
  },

  async updateMappingRequestQuery(tse_code, temp_tse_code, type) {
    let client: PoolClient | null = null;
    const whereValue = type === 'tse_code' ? tse_code : temp_tse_code;
           
    try {
      client = await conn.getReadClient();
      let sqlStatement = `
              SELECT shd.first_name, shd.last_name, shd.email, shd.code
              FROM sales_hierarchy_details shd 
              WHERE shd.code = '${whereValue}' 
              AND shd.deleted = 'false'
              AND shd.status = 'ACTIVE'`
               
      const result = await client.query(sqlStatement);
      return result;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> getReOrderData: ',
        error,
      );
    }
    finally {
      client?.release();
    }
  },
  async getOrderData(so_number) {
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      const orderDataQuery = `Select order_data,ror_mail_flag,distributor_id,po_number FROM orders 
            WHERE so_number = '${so_number}' `;
      const OrderData = await client.query(
        orderDataQuery,
      );
      return OrderData
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> getOrderData: ',
        error,
      );
    } finally {
      client?.release();
    }
  },
  async insertRorData(order_data, so_number) {
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      let orderDataQuery = 'Update orders set order_data = $1 where so_number = $2'
      const OrderData = await client.query(
        orderDataQuery,
        [
          order_data,
          so_number
        ]
      );
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> insertRorData: ',
        error,
      );
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
      let orderDataQuery = 'SELECT DISTINCT distributor_id FROM orders WHERE Date(created_on) > $1'
      const OrderData = await client.query(
        orderDataQuery,
        [
          formattedDate
        ]
      );
      return OrderData;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> rorSync: ',
        error,
      );
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
      logger.error('CAUGHT: Error in utilModel -> upsertCFADepotMapping:', error)
      return null;
    } finally {
      client?.release();
    }
  },
  async getDBandTSEEmails(distributor_id) {
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      let dbEmails = `select up.name,up.email as dbEmail from distributor_master dm inner join user_profile up on dm.profile_id = up.id 
        where dm.id = $1`
      const dbEmailsData = await client.query(
        dbEmails, [distributor_id,]
      );
      let tseEmails = `select shd.email as tseEmail from sales_hierarchy_details shd where shd.code = (select tse_code from distributor_master where id = $1) and shd.deleted = 'false' and shd.status = 'ACTIVE'`
      const tseEmailsData = await client.query(
        tseEmails,
        [distributor_id,]
      );
      let mailData = []
      mailData.push(dbEmailsData.rows[0].dbemail)
      tseEmailsData.rows.forEach(element => {
        mailData.push(element.tseemail)
      });
      let data = {
        email: mailData,
        name: dbEmailsData.rows[0].name
      }
      return data;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> getDBandTSEEmails: ',
        error,
      );
    } finally {
      client?.release();
    }
  },
  async updateRorMailFlag(so_number) {
    let client: PoolClient | null = null;
    try {
      client = await conn.getWriteClient();
      let orderDataQuery = 'Update orders set ror_mail_flag = true where so_number = $1'
      const OrderData = await client.query(
        orderDataQuery,
        [
          so_number
        ]
      );
    } catch (error) {
      logger.error(
        'CAUGHT: Error in utilModel -> updateRorMailFlag: ',
        error,
      );
    } finally {
      client?.release();
    }
  },

  async runDbSyncProc(uuid:string) {
    logger.info("Inside UtilModel-> RunDbSyncProc");
    let client: PoolClient | null = null;
    try {
      const runDbSyncProcStatement = `CALL public.distributor_sync_proc('${uuid}')`
      client = await conn.getWriteClient();
      const res = await client.query(runDbSyncProcStatement);
      return res
    }
    catch(error) {
      logger.error("CAUGHT : Error in UtilModel -> RunDbSyncProc", error);
      return null;
    }
    finally {
      client?.release();
    }
  },
  async runMaterialSyncProc(uuid:string) {
    logger.info("Inside UtilModel-> runMaterialSyncProc");
    let client: PoolClient | null = null;

    try {
      const runMaterialSyncProcStatement = `CALL public.material_sync_proc('${uuid}')`
      client = await conn.getWriteClient();
      const res = await client.query(runMaterialSyncProcStatement);
      return res
    }
    catch(error) {
      logger.error("CAUGHT : Error in UtilModel -> runMaterialSyncProc", error);
      return null;
    }
    finally {
      client?.release();
    }
  },
  async runSalesHierarchySyncProc(uuid:string) {
    logger.info("Inside UtilModel-> runSalesHierarchySyncProc");
    let client: PoolClient | null = null;

    try {
      const runSHSyncProcStatement = `CALL public.sales_hierarchy_sync_proc('${uuid}')`
      client = await conn.getWriteClient();
      const res = await client.query(runSHSyncProcStatement);
      return res
    }
    catch(error) {
      logger.error("CAUGHT : Error in UtilModel -> runSalesHierarchySyncProc", error);
      return null;
    }
    finally {
      client?.release();
    }
  },

  async syncProcedureStatus(uuid:string, syncType:string) {
    logger.info("Inside UtilModel-> syncProcedureStatus");
    let client: PoolClient | null = null;

    try {
      const sqlStatement = `SELECT result FROM sync_logs where sync_uuid = '${uuid}'`;
      client = await conn.getWriteClient();
      const res = await client.query(sqlStatement);
      return res.rows ? res.rows : null
    }
    catch (error) {
      logger.error(`CAUGHT : Error in UtilModel -> syncProcedureStatus : FAILED to get ${syncType} procedure status :${error}`)
      return null;
    }
    finally {
      client?.release();
    }
  },

  async unlockNewDbsInPDPUnlockRequestWindow(){
    logger.info("Inside UtilModel-> unlockNewDbsInPDPUnlockRequestWindow");
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
    }
    catch(error) {
      logger.error("CAUGHT : Error in UtilModel -> unlockNewDbsInPDPUnlockRequestWindow", error);
      return null;
    }
    finally {
      client?.release();
    }
  },

  async enableROandBOforNewDbs(){
    logger.info("Inside UtilModel-> enableROandBOforNewDbs");
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
      logger.info("Inside UtilModel-> enableROandBOforNewDbs, dbs_updated: "+ res.rows.map(item => item.id).toString());
      return res?.rowCount;
    }
    catch(error) {
      logger.error("Inside UtilModel-> enableROandBOforNewDbs, Error: ", error);
      return null;
    }
    finally {
      client?.release();
    }
  },

  async fetchAutoClosureSOData(auditId: string, tableName: AutoClosureAuditTables) {
    logger.info(`inside UtilModel -> fetchAutoClosureSOData: auditId: ${auditId}`);
    let client: PoolClient | null = null;
    try {
      const sqlStatement = `SELECT sap_payload FROM audit.${tableName} WHERE audit_id = '${auditId}'`;
      client = await conn.getWriteClient();
      const response = await client.query(sqlStatement);
      return response?.rowCount > 0 ? response?.rows[0] : null;
    } catch (error) {
      logger.error("Error in UtilModel -> fetchAutoClosureSOData", error);
      return null;
    } finally {
      client?.release()
    }
  },

  async disableNourishcoDbsPDP(){
    logger.info("Inside UtilModel-> disableNourishcoDbsPDP");
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
      logger.info("Inside UtilModel-> disableNourishcoDbsPDP, dbs_updated: "+ res.rows.map(item => item.id).toString());
      return res?.rowCount;
    }
    catch(error) {
      logger.error("Inside UtilModel-> disableNourishcoDbsPDP, Error: ", error);
      return null;
    }
    finally {
      client?.release();
    }
  },
}