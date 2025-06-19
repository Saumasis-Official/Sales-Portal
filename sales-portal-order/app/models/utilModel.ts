/**
 * @file util model
 * @description defines util model methods
*/
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection?.getInstance();
import logger from '../lib/logger';

export const utilModel = {

  async updateMaterialTags(materials: string) {
    let client: PoolClient| null = null;

    try {
        client = await conn.getWriteClient();
        const updateMaterialTagsStatement =
            "UPDATE material_master SET tags = temp.tags FROM (SELECT code, tags FROM json_populate_recordset (NULL::material_master, '" + materials + "')) AS temp WHERE material_master.code = temp.code";
        const updateMaterialTagsResponse = await client.query(updateMaterialTagsStatement);
        logger.info(`UPDATE MATERIAL TAGS RESULT: `, updateMaterialTagsResponse);

        if (updateMaterialTagsResponse && updateMaterialTagsResponse.command === 'UPDATE') {
            if (updateMaterialTagsResponse.rowCount > 0) {
                const updateSearchIndexStatement =
                    "UPDATE material_master SET textsearchable_index_col = to_tsvector(coalesce(description) || ' ' || coalesce(tags->>'regional_brand_tags','') || ' ' || coalesce(tags->>'pack_measure_tags','') || ' ' || coalesce(tags->>'general_tags','') || ' ' || coalesce(tags->>'pack_type_tags',''))";
              
                await client.query(updateSearchIndexStatement);
            }
            return updateMaterialTagsResponse.rowCount;
        }
        return false;
    } catch (error) {
        logger.info(`error in UtilModel.insertMaterials`, error);
        return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async updateSalesHierarchyDetails(salesHierarchyDetails: string) {
    let client: PoolClient| null = null;

    try {
        const updateSalesHierarchyDetailsStatement =
            "INSERT INTO sales_hierarchy_details(user_id, first_name, last_name, email, mobile_number, manager_id, code) SELECT user_id, first_name, last_name, email, mobile_number, manager_id, code FROM json_populate_recordset (NULL::sales_hierarchy_details, '" + salesHierarchyDetails +
            "') ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, mobile_number = EXCLUDED.mobile_number, manager_id = EXCLUDED.manager_id, code = EXCLUDED.code";
        client = await conn.getWriteClient();
        const updateSalesHierarchyTagsResponse = await client.query(updateSalesHierarchyDetailsStatement);
        logger.info(`UPDATE SALES HIERARCHY DETAILS RESULT: `, updateSalesHierarchyTagsResponse);

        if (updateSalesHierarchyTagsResponse && updateSalesHierarchyTagsResponse.command === 'INSERT') {
            return updateSalesHierarchyTagsResponse.rowCount;
        }
        return false;
    } catch (error) {
        logger.info(`error in UtilModel.updateSalesHierarchyDetails`, error);
        return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async getSyncLogs() {
    logger.info(`inside model utilModel.getSyncJobs`);
    let client: PoolClient| null = null;

    try {
      let sqlStatement = `SELECT distinct on (type) type, run_at, success_at, upsert_count, result,filename,is_cron_job, error_log, execution_time  FROM sync_logs ORDER BY type, run_at DESC`;
        client = await conn.getReadClient();
        const { rows } = await client.query(sqlStatement);
        return rows
    } catch (error) {
        logger.error(`error in utilModel.getSyncJobs: `, error);
        return null;
    } finally {
        if (client)
            client.release();
    }
  },
  async getMaterialsTag() {
    logger.info(`inside model utilModel.getMaterialsTag`);
    let client: PoolClient| null = null;

    try {
        let sqlStatement = `SELECT code,description,tags FROM material_master WHERE deleted = false ORDER BY code`;
        client = await conn.getReadClient();
        const { rows } = await client.query(sqlStatement);
        return rows;
    } catch (error) {
        logger.error(`error in utilModel.getMaterialsTag: `, error);
        return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async insertDistributors(distributors: string) {
    logger.info('Inside UtilModel -> insertDistributors');
    let client: PoolClient| null = null;
                          
    try {
      const sqlStatement = `INSERT INTO distributor_master(id, profile_id, city, postal_code, region_id, group_id, tse_code, market) 
                                SELECT id, profile_id, city, postal_code, region_id, group_id, tse_code, market 
                                FROM json_populate_recordset (NULL::distributor_master, '${distributors}') 
                            ON CONFLICT (id) DO NOTHING;`;
      client = await conn.getWriteClient();
      const result = await client.query(sqlStatement);
      if (result && result.rowCount > 0) {
        return result.rowCount;
        }
      logger.info("Inside UtilModel -> insertDistributors, Couldn't  insert data in distributor_master");
      return null;
    } catch (error) {
      logger.error('Inside UtilModel -> insertDistributors, Error: ', error);
      return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async insertDistributorPlants(distributorsWithPlants: string) {
    logger.info('Inside UtilModel -> insertDistributorPlants');
    let client: PoolClient| null = null;
                          
    try {
      const sqlStatement = `INSERT INTO distributor_plants(distributor_id, plant_id) 
                                SELECT distributor_id, plant_id 
                                FROM json_populate_recordset (NULL::distributor_plants, '${distributorsWithPlants}') 
                            ON CONFLICT (distributor_id) DO NOTHING;`;
      client = await conn.getWriteClient();
      const result = await client.query(sqlStatement);
      if (result && result.rowCount > 0) {
        return result.rowCount;
        }
      logger.info("Inside UtilModel -> insertDistributorPlants, Couldn't  insert data in distributor_plants");
      return null;
    } catch (error) {
      logger.error('Inside UtilModel -> insertDistributorPlants, Error: ', error);
      return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async insertWarehouseDetails(warehouseDetailsRow: string) {
    logger.info('Inside UtilModel -> insertWarehouseDetails');
    let client: PoolClient| null = null;
                          
    try {
      const sqlStatement = `INSERT INTO warehouse_details(distributor_id, sales_org, distrbution_channel, division, type, partner_name, partner_code) 
                                SELECT distributor_id, sales_org, distrbution_channel, division, type, partner_name, partner_code
                                FROM json_populate_recordset (NULL::warehouse_details, '${warehouseDetailsRow}') 
                            ON CONFLICT (distributor_id) DO NOTHING;`;
      client = await conn.getWriteClient();
      const result = await client.query(sqlStatement);
      if (result && result.rowCount > 0) {
        return result.rowCount;
        }
      logger.info("Inside UtilModel -> insertWarehouseDetails, Couldn't  insert data in warehouse_details");
      return null;
    } catch (error) {
      logger.error('Inside UtilModel -> insertWarehouseDetails, Error: ', error);
      return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async insertSalesHierarchy(fileDetails: any[]) {
    logger.info('Inside UtilModel -> insertSalesHierarchy');
    let client: PoolClient| null = null;
                          
    try {
        client = await conn.getWriteClient();

        const sqlStatement = `SELECT id FROM sales_hierarchy`;
        const shResult = await client.query(sqlStatement);
        if(shResult && shResult.rowCount > 0) {
            logger.info('Inside UtilModel -> insertSalesHierarchy, sales_hierarchy table is not empty');
            return null;
        }
        let levelsMapping = {};

        const filteredL1s = fileDetails.filter( (v, i, a) => a.findIndex((t) => t.l1_code === v.l1_code) === i);
        let l1s: any = [];
            for (let data of filteredL1s) {
                l1s.push({
                code: data.l1_code,
                name: data.l1_name,
                level: 'CPSM',
                parent_id: null,
            });
        }

        const insertL1sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l1s)}') 
                                    RETURNING *;`;
        const insertL1sResult = await client.query(insertL1sStatement);
        if (!insertL1sResult || !insertL1sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l1s' data in sales_hierarchy");
            return null;
        }
        
        let rows = insertL1sResult.rows;
        for (let row of rows) {
            levelsMapping[row.code] = row.id;
        }
    
        const filteredL2s = fileDetails.filter((v, i, a) => a.findIndex((t) => t.l2_code === v.l2_code) === i);

        let l2s: any = [];
        for (let data of filteredL2s) {
            l2s.push({
                code: data.l2_code,
                name: data.l2_name,
                level: 'NSM',
                parent_id: levelsMapping[data.l1_code]
                ? levelsMapping[data.l1_code]
                : null,
            });
        }
        
        const insertL2sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l2s)}') 
                                    RETURNING *;`;
        const insertL2sResult = await client.query(insertL2sStatement);
        if (!insertL2sResult || !insertL2sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l2s' data in sales_hierarchy");
            return null;
        }

        rows = insertL2sResult.rows;
        for (let row of rows) {
            levelsMapping[row.code] = row.id;
        }
    
        const filteredL3s = fileDetails.filter((v, i, a) => a.findIndex((t) => t.l3_code === v.l3_code) === i);

        let l3s: any = [];
        for (let data of filteredL3s) {
            l3s.push({
                code: data.l3_code,
                name: data.l3_name,
                level: 'CSM',
                parent_id: levelsMapping[data.l2_code]
                ? levelsMapping[data.l2_code]
                : null,
            });
        }

        const insertL3sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l3s)}') 
                                    RETURNING *;`;
        const insertL3sResult = await client.query(insertL3sStatement);
        if (!insertL3sResult || !insertL3sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l3s' data in sales_hierarchy");
            return null;
        }

        rows = insertL3sResult.rows;
        for (let row of rows) {
            levelsMapping[row.code] = row.id;
        }

        const filteredL4s = fileDetails.filter((v, i, a) => a.findIndex((t) => t.l4_code === v.l4_code) === i);

        let l4s: any = [];
        for (let data of filteredL4s) {
            l4s.push({
                code: data.l4_code,
                name: data.l4_name,
                level: 'RSM',
                parent_id: levelsMapping[data.l3_code]
                ? levelsMapping[data.l3_code]
                : null,
            });
        }

        const insertL4sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l4s)}') 
                                    RETURNING *;`;
        const insertL4sResult = await client.query(insertL4sStatement);
        if (!insertL4sResult || !insertL4sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l4s' data in sales_hierarchy");
            return null;
        }

        rows = insertL4sResult.rows;
        for (let row of rows) {
            levelsMapping[row.code] = row.id;
        }

        const filteredL5s = fileDetails.filter((v, i, a) => a.findIndex((t) => t.l5_code === v.l5_code) === i);

        let l5s: any = [];
        for (let data of filteredL5s) {
            l5s.push({
                code: data.l5_code,
                name: data.l5_name,
                level: 'ASM',
                parent_id: levelsMapping[data.l4_code]
                ? levelsMapping[data.l4_code]
                : null,
            });
        }

        const insertL5sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l5s)}') 
                                    RETURNING *;`;
        const insertL5sResult = await client.query(insertL5sStatement);
        if (!insertL5sResult || !insertL5sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l5s' data in sales_hierarchy");
            return null;
        }

        rows = insertL5sResult.rows;
        for (let row of rows) {
            levelsMapping[row.code] = row.id;
        }

        const filteredL6s = fileDetails.filter((v, i, a) => a.findIndex((t) => t.l6_code === v.l6_code) === i);

        let l6s: any = [];
        for (let data of filteredL6s) {
            l6s.push({
                code: data.l6_code,
                name: data.l6_name,
                level: 'TSE',
                parent_id: levelsMapping[data.l5_code]
                ? levelsMapping[data.l5_code]
                : null,
            });
        }

        const insertL6sStatement = `INSERT INTO sales_hierarchy(code, name, level, parent_id) 
                                        SELECT code, name, level, parent_id 
                                        FROM json_populate_recordset (NULL::sales_hierarchy, '${JSON.stringify(l6s)}') 
                                    RETURNING *;`;
        const insertL6sResult = await client.query(insertL6sStatement);
        if (!insertL6sResult || !insertL6sResult.rows?.length) {
            logger.info("Inside UtilModel -> insertSalesHierarchy, Couldn't  insert 'l6s' data in sales_hierarchy");
            return null;
        }

        return true;
    } catch (error) {
      logger.error('Inside UtilModel -> insertSalesHierarchy, Error: ', error);
      return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async insertMaterials(materials: string) {
    logger.info('Inside UtilModel -> insertMaterials');
    let client: PoolClient| null = null;
                          
    try {
      const sqlStatement = `INSERT INTO material_master(code, description, sales_unit, pak_code, pak_type) 
                                SELECT code, description, sales_unit, pak_code, pak_type 
                                FROM json_populate_recordset (NULL::material_master, '${materials}') 
                            ON CONFLICT (code) DO NOTHING;`;
      client = await conn.getWriteClient();
      const result = await client.query(sqlStatement);
      if (result && result.rowCount > 0) {
        return result.rowCount;
        }
      logger.info("Inside UtilModel -> insertMaterials, Couldn't  insert data in material_master");
      return null;
    } catch (error) {
      logger.error('Inside UtilModel -> insertMaterials, Error: ', error);
      return null;
    } finally {
        if (client)
            client.release();
    }
  },

  async truncateMaterialMaster() {
    logger.info('Inside UtilModel -> truncateMaterialMaster');
    let client: PoolClient| null = null;
                          
    try {
      const sqlStatement = `TRUNCATE TABLE material_master RESTART IDENTITY;`;
      client = await conn.getWriteClient();
      const result = await client.query(sqlStatement);
      if (result) {
        return true;
        }
      logger.info("Inside UtilModel -> truncateMaterialMaster, Couldn't  truncate material_master");
      return false;
    } catch (error) {
      logger.error('Inside UtilModel -> truncateMaterialMaster, Error: ', error);
      return false;
    } finally {
        if (client)
            client.release();
    }
  },

  async getLastRequestId(tableName: string, pk_column: string) {
    let client: PoolClient | null = null;
    const sqlStatement = `SELECT ${pk_column} FROM ${tableName} ORDER BY id DESC LIMIT 1`;
    try {
      client = await conn.getReadClient();
      const result = await client.query(sqlStatement);
      return result;
    } catch (error) {
      logger.error('CAUGHT: Error in UtilModel.getLastRequestId ', error);
      return null;
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
      
      return result.rows ?? [];
    } catch (error) {
      logger.error('CAUGHT: Error in UtilModel.getAppSettings ', error);
      return null;
    } finally {
      client?.release();
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

};

