/**
 * @file order.model
 * @description defines order model methods
 */

import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import Helper from '../helper/index';
import UtilityFunctions from '../helper/utilityFunctions';
import moment from 'moment-timezone';
import snowflakeConnection from '../lib/snowflakeConnection';

interface RouteDetails {
  TAT: number;
  PLANT_CODE: string;
}
interface RouteMasterResponse {
  shipToNumber: string;
  formattedPlantNames: string;
  snowflakeDetails: RouteDetails | null;
}
export const OrderModel = {
  async removeDraft(poNumber: string, distributorId: string) {
    logger.info(`inside model OrderModel.removeDraft`);
    let client: PoolClient| null = null;

    try {
      const removeDraftSqlStatement = `
                UPDATE orders
                SET deleted = true,
                updated_on = now()
                WHERE distributor_id = '${distributorId}'
                AND status = 'DRAFT' 
                AND po_number = '${poNumber}'`;
      client = await conn.getWriteClient();
      const removeDraftResponse = await client.query(
        removeDraftSqlStatement,
      );

      if (removeDraftResponse && removeDraftResponse.rowCount) {
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`error in OrderModel.removeDraft: `, error);
      return false;
    } finally {
      if (client != null) client.release();
    }
  },

  async removeExpiredCarts(
    distributorId: string,
    cartExpiryWindow: number,
  ) {
    logger.info(`inside model OrderModel.removeExpiredCarts`);
    let client: PoolClient | null = null;

    try {
      const removeExpiredCartsStatement = `
                UPDATE orders 
                SET deleted = true,
                updated_on = now()
                WHERE distributor_id = '${distributorId}' 
                AND status = 'DRAFT' 
                AND DATE_PART('days', CURRENT_TIMESTAMP - created_on) > ${cartExpiryWindow}`;
      client = await conn.getWriteClient();
      const removeExpiredCartsResponse = await client.query(
        removeExpiredCartsStatement,
      );

      const removeLiquidSelfLiftingDraftsStatement = `
                DELETE FROM orders 
                WHERE distributor_id = '${distributorId}' 
                AND (status = 'LIQUID_DRAFT' OR status = 'SELF_LIFTING_DRAFT')`;
      await client.query(removeLiquidSelfLiftingDraftsStatement);

      return (
        removeExpiredCartsResponse &&
        removeExpiredCartsResponse.rowCount
      );
    } catch (error) {
      logger.error(`error in OrderModel.removeExpiredCarts: `, error);
      return false;
    } finally {
      if (client != null) client.release();
    }
  },

  async getZoneWiseOrders(fromDate: any, toDate: any) {
    logger.info(`inside model OrderModel.getZoneWiseOrders`);
    let client: PoolClient | null = null;

    try {
      const getZoneWiseOrdersStatement = `SELECT o.created_on::date as creation_date, g.name, sum(cast(coalesce( o.so_value :: numeric, '0.0') 
      as double precision)) / 100000 as sum FROM orders o
      LEFT JOIN distributor_master d ON o.distributor_id = d.id
      LEFT JOIN group5_master g on d.group5_id = g.id
      WHERE o.so_value ~ '^\\d+(\\.\\d+)?$'
      AND o.created_on::date BETWEEN '${fromDate}'::date AND '${toDate}'::date
      GROUP BY g.name, creation_date
      ORDER BY creation_date;`;

      client = await conn.getReadClient();
      const getZoneWiseOrdersStatementResponse = await client.query(
        getZoneWiseOrdersStatement,
      );

      return (
        getZoneWiseOrdersStatementResponse &&
        getZoneWiseOrdersStatementResponse.rows
      );
    } catch (error) {
      logger.error(`error in OrderModel.getZoneWiseOrders: `, error);
      return false;
    } finally {
      if (client != null) client.release();
    }
  },

  async getZoneWiseOrdersByOrderType(
    fromDate: any,
    toDate: any,
    orderType: any,
  ) {
    logger.info(`inside model ordermodel by ordertype`);
    let client: PoolClient | null = null;

    try {
      client = await conn.getReadClient();
      if (orderType == 'ALL') {
        const getZoneWiseOrdersStatement = `SELECT o.created_on::date as creation_date, g.name, sum(cast(coalesce( o.so_value :: numeric, '0.0') 
        as double precision)) / 100000 as sum FROM orders o
        LEFT JOIN distributor_master d ON o.distributor_id = d.id
        LEFT JOIN group5_master g on d.group5_id = g.id
        WHERE o.so_value ~ '^\\d+(\\.\\d+)?$'
        AND o.created_on::date BETWEEN '${fromDate}'::date AND '${toDate}'::date
        GROUP BY g.name, creation_date
        ORDER BY creation_date;`;
        const getZoneWiseOrdersStatementResponse = await client.query(
          getZoneWiseOrdersStatement,
        );

        return (
          getZoneWiseOrdersStatementResponse &&
          getZoneWiseOrdersStatementResponse.rows
        );
      } else {
        const getZoneWiseOrdersByType = `SELECT o.created_on::date as creation_date, g.name, sum(cast(coalesce( o.so_value :: numeric, '0.0') 
        as double precision)) / 100000 as sum FROM orders o
        LEFT JOIN distributor_master d ON o.distributor_id = d.id
        LEFT JOIN group5_master g on d.group5_id = g.id
        WHERE o.so_value ~ '^\\d+(\\.\\d+)?$'
        AND o.created_on::date BETWEEN '${fromDate}'::date AND '${toDate}'::date
        AND o.order_type = '${orderType}'
        AND o.so_value is not null
        GROUP BY g.name, creation_date
        ORDER BY creation_date;`;
        const getZoneWiseOrdersStatementResponseTypeByOrder =
          await client.query(getZoneWiseOrdersByType);

        return (
          getZoneWiseOrdersStatementResponseTypeByOrder &&
          getZoneWiseOrdersStatementResponseTypeByOrder.rows
        );
      }
    } catch (error) {
      logger.error(`error in OrderModel.getZoneWiseOrders: `, error);
      return false;
    } finally {
      if (client != null) client.release();
    }
  },

  async getCategoryWiseReportedIssues(
    fromDate: string,
    toDate: string,
  ) {
    logger.info(
      `inside model OrderModel.getCategoryWiseReportedIssues`,
    );
    let client: PoolClient | null = null;

    try {
      const getZoneWiseIssuesStatement = `
                SELECT sr.created_on::date as creation_date, src.label as category, count(sr.sr_no) FROM service_requests sr 
                LEFT JOIN service_request_categories src ON sr.category_id = src.id
                WHERE sr.created_on::date BETWEEN '${fromDate}'::date AND '${toDate}'::date
                AND sr.remarks != 'Portal generated validation process encountered error'
                AND sr.created_by_user_group != 'PORTAL_MANAGED'
                GROUP BY src.id, creation_date
                ORDER BY creation_date;`;
      client = await conn.getReadClient();
      const getZoneWiseIssuesStatementResponse = await client.query(
        getZoneWiseIssuesStatement,
      );

      return (
        getZoneWiseIssuesStatementResponse &&
        getZoneWiseIssuesStatementResponse.rows
      );
    } catch (error) {
      logger.error(
        `error in OrderModel.getCategoryWiseReportedIssues: `,
        error,
      );
      return false;
    } finally {
      if (client != null) client.release();
    }
  },
  async getTseAsmAdminDetails(userId) {
    let client: PoolClient | null = null;

    try {
      const sqlStatement = `
                SELECT u.id,u.name,u.mobile,u.email,d.tse_code,gm.rsm_code,d.area_code,gm.cluster_code,d.market,r.description AS region
                FROM user_profile u
                INNER JOIN distributor_master d ON d.profile_id = u.id
                INNER JOIN group5_master gm ON (d.group5_id = gm.id)
                INNER JOIN distributor_plants p ON p.distributor_id = u.id
                LEFT JOIN region_master r ON d.region_id = r.id
                WHERE u.id='${userId}'`;
      client = await conn.getReadClient();
      let { rows } = await client.query(sqlStatement);

      const resultSet = rows[0];

      const tseCode = resultSet?.tse_code || null;
      const asmCode = resultSet?.area_code || null;

      if (tseCode) {
        const tseQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code ILIKE '%${tseCode}%'
                        AND 'TSE' = ANY(roles);
                    `;
        const tseDetails = (await client.query(tseQuery)).rows;

        delete resultSet.tse_code;
        let td: any[] = [];
        if (tseDetails.length > 0) {
          td = tseDetails.map((tse) => {
            return {
              distributor_id: userId,
              user_mobile_number: tse.mobile_number || '',
              user_email: tse.email || '',
            };
          });
        }

        resultSet['tse'] = td.length > 0 ? td : null;
      }

      if (asmCode) {
        const asmQuery = `
                        SELECT DISTINCT ON (email) user_id, first_name, last_name, email, mobile_number, manager_id, code
                        FROM sales_hierarchy_details
                        WHERE deleted = FALSE 
                        AND status = 'ACTIVE'
                        AND code ILIKE '%${asmCode}%'
                        AND 'ASM' = ANY(roles);
                    `;
        const asmDetails = (await client.query(asmQuery)).rows;

        let ad: any[] = [];
        if (asmDetails.length > 0) {
          ad = asmDetails.map((asm) => {
            return {
              distributor_id: userId,
              user_mobile_number: asm.mobile_number || '',
              user_email: asm.email || '',
            };
          });
        }

        resultSet['asm'] = ad.length > 0 ? ad : null;
      }

      // if (tseCode) {
      //   const salesHierarchyDetails = await UserService.fetchSalesHierarchyDetails(tseCode);
      //   resultSet['tse'] = salesHierarchyDetails['TSE'];
      //   resultSet['tse']?.forEach(tse => {
      //     Object.assign(tse, {
      //       distributor_id: userId,
      //       user_mobile_number: resultSet.mobile || '',
      //       user_email: resultSet.email || ''
      //     })
      //   });
      //   resultSet['asm'] = salesHierarchyDetails['ASM'];
      //   resultSet['asm']?.forEach(asm => {
      //     Object.assign(asm, {
      //       distributor_id: userId,
      //       user_mobile_number: resultSet.mobile || '',
      //       user_email: resultSet.email || ''
      //     })
      //   });
      // } else {
      //   resultSet['tse'] = null;
      // }

      return resultSet;
    } catch (error) {
      logger.error(
        `error in OrderModel getTseAsmAdminDetails:`,
        error,
      );

      return { success: false };
    } finally {
      if (client != null) client.release();
    }
  },

  async getAppLevelSettings(search: string | null) {
    logger.info(
      'inside OrderModel -> getAppLevelSettings, param : search= ' +
        search,
    );
    let client: PoolClient | null = null;

    try {
      client = await conn.getReadClient();
      let searchQuery = search ? `WHERE key ILIKE '%${search}%'` : '';
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
      if (client != null) client.release();
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
      logger.error(
        'Inside OrderModel -> fetchAreaZones, Error: ',
        error,
      );
      return null;
    } finally {
      if (client != null) client.release();
    }
  },

  async getMaterialsList(
    distributorId,
    queryParams,
    isNourishco: boolean = false,
  ) {
    let client: PoolClient | null = null;
    logger.info(
      `inside orderModel -> getMaterialsList, distributorId: ${distributorId}, queryParams: ${JSON.stringify(
        queryParams,
      )}`,
    );

    try {
      client = await conn.getReadClient();
      let searchQuery = '';
      if (
        queryParams &&
        queryParams.search_query &&
        typeof queryParams.search_query === 'string'
      ) {
        logger.info(
          `if case, search query: ${queryParams.search_query}, so converting search query to ts_query`,
        );
        searchQuery = Helper.generateSearchQuery(
          queryParams.search_query,
        );
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
        const { rows } = await client.query(
          fetchChannelAreaForDistributorStatement,
        );
        const ruleConfigDistChannelString = !isNourishco
          ? 'GT'
          : 'NOURISHCO';
        const ruleConfigStatement: string = `
                left join sku_rule_configurations src
                on
                  (
                    src.sku_code = mm.code
                    and src.area_code = '${rows[0]?.area_code}'
                    and src.deleted = false
                    and src.tse_code = tt.tse_code
                    and src.channel = '${ruleConfigDistChannelString}'
                  )`;
        const ruleConfigWhereStatement: string = ` and ( src.included_cg_db ->> '${rows[0]?.customer_group_name}' = TRUE::text
                  or src.included_cg_db is null
                  OR(
                      jsonb_typeof(src.included_cg_db -> '10') = 'array'
	                    AND '${distributorId}' =  ANY(ARRAY(SELECT jsonb_array_elements_text(src.included_cg_db->'10')))
                  )
                )`;

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
          if (
            rows &&
            rows[0] &&
            rows[0].channel_code &&
            rows[0].area_code
          ) {
            sqlStatement += ` AND
            ('{"area": "${rows[0].area_code}", "channel": "${rows[0].channel_code}"}'::jsonb = ANY(mm.appl_area_channel)) AND mm.start_date <= CURRENT_TIMESTAMP`;
          }
        }
        if (isNourishco) {
          sqlStatement += ` AND ms.distribution_channel = '90'`;
        } else if (queryParams?.self_lifting === 'true') {
          sqlStatement += ` AND ms.distribution_channel = '40'`;
        } else {
          sqlStatement += ` AND ms.distribution_channel = '10'`;
        }
        const nonForecastDistChannelString = `AND nfs.channel='${
          isNourishco ? 'NOURISHCO' : 'GT'
        }'`;
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
                                  ${nonForecastDistChannelString}
                              ) )`;

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
        let mL = rows.map((o) => {
          return {
            ...o,
            stock_in_transit: '',
            stock_in_hand: '',
            open_order: '',
          };
        });
        searchedMaterials = mL ? mL : [];
      }

      logger.info(`return success with data`);
      return searchedMaterials;
    } catch (error) {
      logger.error(
        'CAUGHT: Error in materialController -> getMaterialsList: ',
        error,
      );
      return null;
    } finally {
      if (client != null) client.release();
    }
  },

  async fetchOrders(distributorId: string, queryParams: any) {
    let client: PoolClient | null = null;
    logger.info(
      `inside orderModel -> fetchOrders, loginId: ${distributorId}`,
    );

    try {
      client = await conn.getReadClient();
      logger.info(
        `inside orderModel -> fetchOrders, checking last so sync time...`,
      );
      let sync = false;
      let lastSync = new Date();
      const checkLastSyncSqlStatement = `SELECT run_at, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - run_at)) AS diff FROM sync_logs WHERE type='SO' AND distributor_id = '${distributorId}'`;
      let { rows } = await client.query(checkLastSyncSqlStatement);
      if (rows && rows.length > 0 && rows[0].diff) {
        if (
          parseInt(rows[0].diff) >= 21600 &&
          process.env.NODE_ENV === 'prod'
        ) {
          logger.info(
            `inside orderModel -> fetchOrders, checking if last sync was more than 2 hours ago - running open so sync sap api...`,
          );
          UtilityFunctions.fetchOpenSO(distributorId);
          sync = true;
        } else {
          lastSync = rows[0].run_at ? rows[0].run_at : null;
        }
      } else {
        logger.info(
          `inside orderModel -> fetchOrders, checking first sync for this distributor - running open so sync sap api...`,
        );
        UtilityFunctions.fetchOpenSO(distributorId);
        sync = true;
      }

      logger.info(
        `inside orderModel -> fetchOrders, fetching orders`,
      );

      let fetchOrdersSqlStatement = `
          SELECT 
              o.po_number, o.created_on AS po_date, o.so_number, o.so_date, o.so_value, o.delivery_no, o.invoice_no, o.status, o.distributor_id, o.product_type, o.created_by, o.created_by_user_group, o.order_type, s.first_name, s.last_name,  orq.status AS rush_status
          `;
      let fetchDraftsSqlStatement = fetchOrdersSqlStatement;
      fetchDraftsSqlStatement += `, o.order_data, o.cart_number `;
      let fetchRushDraftSqlStatement =
        fetchOrdersSqlStatement +
        `, orq.status as order_request_status, orq.request_number`;
      const joinAndWhereClause = `
          FROM 
              orders o
          LEFT JOIN
              sales_hierarchy_details s
          ON 
              o.created_by = s.user_id
          LEFT JOIN 
              order_approval_requests orq
          ON
              o.po_number = orq.po_number
          WHERE 
              o.distributor_id = '${distributorId}'`;
      const orderRequestsJoinAndWhereClause = `
          FROM 
              orders o
          INNER JOIN
              order_approval_requests orq
          ON
              o.po_number = orq.po_number
          LEFT JOIN
              sales_hierarchy_details s
          ON 
              o.created_by = s.user_id
          WHERE 
              o.distributor_id = '${distributorId}'`;
      fetchOrdersSqlStatement += `${joinAndWhereClause} AND NULLIF(o.so_number, '') IS NOT NULL AND o.so_date > current_date - interval '90' day AND (o.status != 'DRAFT' OR o.status != 'LIQUID_DRAFT' OR o.status != 'SELF_LIFTING_DRAFT' OR o.status != 'RUSH_DRAFT')`;
      fetchDraftsSqlStatement += `${joinAndWhereClause} AND o.created_on > current_date - interval '90' day AND o.status = 'DRAFT' AND o.deleted IS false`;
      fetchRushDraftSqlStatement += `${orderRequestsJoinAndWhereClause} AND o.created_on > current_date - interval '15' day AND o.status in ('DRAFT','RUSH_DRAFT') AND order_type in ('RUSH')`;

      if (queryParams) {
        if (queryParams.po_so_number) {
          logger.info(
            `inside orderModel -> fetchOrders, po_so_number exists: ${queryParams.po_so_number}`,
          );
          fetchOrdersSqlStatement += ` AND (o.po_number ILIKE '%${queryParams.po_so_number}%' OR o.so_number ILIKE '%${queryParams.po_so_number}%')`;
        }
        if (queryParams.created_by) {
          logger.info(
            `inside orderModel -> fetchOrders, created_by exists: ${queryParams.created_by}`,
          );
          let createdByStatement = ``;
          if (queryParams.created_by === 'distributor') {
            createdByStatement = ` AND o.created_by IS NULL`;
          } else if (queryParams.created_by === 'admin') {
            createdByStatement = ` AND o.created_by IS NOT NULL`;
          }
          fetchOrdersSqlStatement += createdByStatement;
          fetchDraftsSqlStatement += createdByStatement;
          fetchRushDraftSqlStatement += createdByStatement;
        }

        if (queryParams.from_date) {
          if (queryParams.to_date) {
            logger.info(
              `inside orderModel -> fetchOrders, from_date exists: ${queryParams.from_date}`,
            );
            logger.info(
              `inside orderModel -> fetchOrders, to_date exists: ${queryParams.to_date}`,
            );
            fetchOrdersSqlStatement += ` AND (o.so_date::date BETWEEN '${queryParams.from_date}'::date AND '${queryParams.to_date}'::date)`;
          }
        }
      }

      fetchOrdersSqlStatement += ` ORDER BY o.created_on DESC`;
      fetchDraftsSqlStatement += ` ORDER BY o.created_on DESC LIMIT 3`;
      fetchRushDraftSqlStatement += ` ORDER BY o.created_on DESC`;
      ({ rows } = await client.query(fetchDraftsSqlStatement));
      const drafts = rows;

      ({ rows } = await client.query(fetchRushDraftSqlStatement));
      const rushDrafts = rows;

      if (
        queryParams &&
        (queryParams.page_no || queryParams.items_per_page)
      ) {
        const pageNo: number =
          queryParams.page_no &&
          typeof queryParams.page_no === 'string'
            ? parseInt(queryParams.page_no)
            : 1;
        const itemsPerPage: number =
          queryParams.items_per_page &&
          typeof queryParams.items_per_page === 'string'
            ? parseInt(queryParams.items_per_page)
            : 10;
        logger.info(
          `inside orderModel -> fetchOrders, page no : ${pageNo}, items per page: ${itemsPerPage}`,
        );
        fetchOrdersSqlStatement +=
          ' LIMIT ' +
          itemsPerPage +
          ' OFFSET ' +
          (pageNo - 1) * itemsPerPage;
      }

      ({ rows } = await client.query(fetchOrdersSqlStatement));
      const orders = rows;

      let fetchOrdersCountStatement = `
          SELECT  count(id) AS count
          FROM orders
          WHERE distributor_id = '${distributorId}' AND NULLIF(so_number, '') IS NOT NULL AND so_date > current_date - interval '90' day AND (status != 'DRAFT' OR status != 'LIQUID_DRAFT' OR status != 'SELF_LIFTING_DRAFT' OR status != 'RUSH_DRAFT') `;

      if (queryParams) {
        if (queryParams.po_so_number) {
          logger.info(
            `inside orderModel -> fetchOrders, if case in count query - po_so_number exists: ${queryParams.po_so_number}`,
          );
          fetchOrdersCountStatement += ` AND (po_number ILIKE '%${queryParams.po_so_number}%' OR so_number ILIKE '%${queryParams.po_so_number}%')`;
        }
        if (queryParams.created_by) {
          logger.info(
            `inside orderModel -> fetchOrders, created_by exists: ${queryParams.created_by}`,
          );
          if (queryParams.created_by === 'distributor') {
            fetchOrdersCountStatement += ` AND created_by IS NULL`;
          } else if (queryParams.created_by === 'admin') {
            fetchOrdersCountStatement += ` AND created_by IS NOT NULL`;
          }
        }

        if (queryParams.from_date) {
          if (queryParams.to_date) {
            logger.info(
              `inside orderModel -> fetchOrders, from_date exists: ${queryParams.from_date}`,
            );
            logger.info(
              `inside orderModel -> fetchOrders, to_date exists: ${queryParams.to_date}`,
            );
            fetchOrdersCountStatement += ` AND (so_date::date BETWEEN '${queryParams.from_date}'::date AND '${queryParams.to_date}'::date)`;
          }
        }
      }

      ({ rows } = await client.query(fetchOrdersCountStatement));
      const totalCount =
        rows && rows[0] && rows[0].count ? rows[0].count : 0;

      return {
        orders,
        drafts,
        rushDrafts,
        totalCount,
        sync,
        lastSync,
      };
    } catch (error) {
      logger.error(
        'inside orderModel -> fetchOrders, Error: ',
        error,
      );
      return null;
    } finally {
      if (client != null) client.release();
    }
  },

  async fetchPODetails(
    poNumber: string,
    distributorId: string,
    po_index: string | undefined,
  ) {
    logger.info('Inside OrderModel -> fetchPODetails');
    let client: PoolClient | null = null;
    try {
      const poIndexStatement = po_index
        ? ` AND po_number_index = ${+po_index}`
        : '';
      const sqlStatement = `SELECT so_number, so_value, so_date, order_data, delivery_no, invoice_no, delivery_date_time,invoice_date_time, po_number, eway_bill_number, eway_bill_date_time, rdd
                            FROM orders
                            WHERE po_number = '${poNumber}' AND distributor_id = '${distributorId}' ${poIndexStatement}`;
      client = await conn.getReadClient();
      const result = await client.query(sqlStatement);
     
      const query = `WITH order_items AS (
                              SELECT 
                                  o.so_number,
                                  o.order_data,
                                  jsonb_array_elements(o.order_data->'Itemset') as itemset,
                                  pm.name as plant_name
                              FROM orders o
                              INNER JOIN distributor_plants dp ON dp.distributor_id = o.distributor_id
                              INNER JOIN plant_master pm ON pm.id = dp.plant_id
                              WHERE o.po_number = '${poNumber}'
                              AND o.distributor_id = '${distributorId}' ${poIndexStatement}
                          )
                          SELECT DISTINCT
                              oi.so_number,
                              oi.itemset->>'DIVISION' as division,
                              oi.plant_name,
                              oi.order_data->'partnerset' as partnerset
                          FROM order_items oi;
                          `;
          const result1 = await client.query(query);

          const shipToNumber = [...new Set(
              result1.rows.flatMap(row => {
                const partnerset = row.partnerset as any[];
                return partnerset
                      .filter(partner => partner.PARTN_ROLE === 'WE' || partner.PARTN_ROLE === 'SH')
                      .map(partner => partner.PARTN_NUMB)
              })
          )];
          
          const formattedPlantNames = [...new Set(result1.rows.map(row => row.plant_name))]
                                        .map(name => `'${name}'`).join(',');
            
          let snowflakeDetails: RouteDetails | null = null;
          if (shipToNumber && formattedPlantNames.length > 0) {
              const tatResponse: RouteMasterResponse = await this.fetchTATfromSnowflake(shipToNumber[0], formattedPlantNames);
              snowflakeDetails = tatResponse.snowflakeDetails;
            } 
          if (result?.rows?.length) {
              let data: any[] = [];
              result.rows.forEach((row) => {
                data.push({
                  SO_NUMBER: row.so_number,
                  SO_VALUE: row.so_value,
                  SO_DATE: moment
                    .tz(row.so_date, 'Asia/Kolkata')
                    .format('YYYY-MM-DD HH:mm:ss'),
                  ...row.order_data,
                  STATUS: row.status,
                  DELIVERY_NO: row.delivery_no,
                  INVOICE_NO: row.invoice_no,
                  DELIVERY_DATE_TIME: row.delivery_date_time,
                  INVOICE_DATE_TIME: row.invoice_date_time,
                  PO_NUMBER: row.po_number,
                  EWAY_BILL_NUMBER: row.eway_bill_number,
                  EWAY_BILL_DATE_TIME: row.eway_bill_date_time,
                  Req_Delv_Date: row.rdd,
                  TAT: snowflakeDetails?.TAT ?? 0,
                });
              });
              return { order_data: data };
            }
      return null;
    } catch (error) {
      logger.error(
        'Inside OrderModel -> fetchPODetails, Error: ',
        error,
      );
      return null;
    } finally {
      if (client != null) client.release();
    }
  },

  async fetchWarehouseDetails(distributorId: string) {
    logger.info('Inside OrderModel -> fetchWarehouseDetails');
    let client: PoolClient | null = null;

    try {
      const sqlStatement = `SELECT type, sales_org, distrbution_channel, division, json_agg((partner_code, partner_name)) as shy_points 
                            FROM  warehouse_details
                            WHERE distributor_id = '${distributorId}'
                            GROUP  BY type, sales_org, distrbution_channel, division`;
      client = await conn.getReadClient();
      const result = await client.query(sqlStatement);

      return result?.rows?.length ? result.rows[0] : null;
    } catch (error) {
      logger.error(
        'Inside OrderModel -> fetchWarehouseDetails, Error: ',
        error,
      );
      return null;
    } finally {
      if (client != null) client.release();
    }
  },

  async savePromisedCredit(data: any) {
    logger.info('Inside OrderModel -> savePromisedCredit');
    let client: PoolClient | null = null;

    try {
      client = await conn.getWriteClient();

      if (data.type == 'insert') {
        let sqlPromiseStatement = `INSERT into promise_credit 
      (po_number, distributor_id, plant, confirmed_by,credit_shortfall, order_value, reference_date) 
      values ($1, $2, $3, $4, $5, $6, $7) 
      on conflict(po_number,distributor_id) 
      do update set updated_on = now();`;
        const insertResult = await client.query(sqlPromiseStatement, [
          data.po_number,
          data.distributor_id,
          data.plant,
          data.confirmed_by,
          data.credit_shortfall,
          data.order_value,
          data.reference_date,
        ]);

        //Upsert open_order_value and credit_shortfall in promise_credit table
        let sqlInsertUpdateStatement = `INSERT INTO promise_credit 
      ( po_number,distributor_id,credit_shortfall, order_value,  confirmed_by, plant, reference_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7) 
      ON CONFLICT (po_number, distributor_id) DO UPDATE SET 
      credit_shortfall = EXCLUDED.credit_shortfall,
      order_value = EXCLUDED.order_value,
      plant = EXCLUDED.plant,
      reference_date = EXCLUDED.reference_date ;`;

        const insertUpdateResult = await client.query(
          sqlInsertUpdateStatement,
          [
            data.po_number,
            data.distributor_id,
            data.credit_shortfall,
            data.order_value,
            data.confirmed_by,
            data.plant,
            data.reference_date,
          ],
        );
        logger.info(
          'Inside OrderModel -> savePromisedCredit,(-> IF->First consent)  ',
        );
        return true;
      } else if (data.type == 'update') {
        let sqlStatement = `UPDATE promise_credit SET input_type = $1, promised_credit = $2, promised_credit_type = $3 , open_order_value = $4, 
                          promised_credit_date = $5, promised_credit_time = $6, 
                          updated_on = now()
                          WHERE po_number = $7;`;

        const updateResult = await client.query(sqlStatement, [
          data.input_type,
          data.promised_credit,
          data.promised_credit_type,
          data.open_order_value,
          data.promised_credit_date,
          data.promised_credit_time,
          data.po_number,
        ]);
        logger.info(
          'Inside OrderModel -> savePromisedCredit,(ELSE IF->First consent) ',
        );
        return true;
      } else if (
        data.input_type == 'Second consent for promise credit'
      ) {
        let sqlPromiseStatement = `INSERT into promise_credit ( distributor_id, confirmed_by,credit_shortfall,
                                   open_order_value , promised_credit_type , promised_credit_date , promised_credit_time , promised_credit, input_type  ) 
                                   values ($1, $2, $3,  $4, $5, $6 , $7, $8, $9) on conflict(po_number, distributor_id) do update set updated_on = now();`;

        const insertResult = await client.query(sqlPromiseStatement, [
          data.distributor_id,
          data.confirmed_by,
          data.credit_shortfall,
          data.open_order_value,
          data.promised_credit_type,
          data.promised_credit_date,
          data.promised_credit_time,
          data.promised_credit,
          data.input_type,
        ]);
        logger.info(
          'Inside OrderModel -> savePromisedCredit,(ELSE IF->Second consent) ',
        );
        return true;
      }
      return false;
    } catch (error) {
      logger.error(
        'Inside OrderModel -> savePromisedCredit, Error: ',
        error,
      );
      return false;
    } finally {
      if (client != null) client.release();
    }
  },

  async getAvailableRDDForAutoClosure(soList: string[]) {
    logger.info('inside OrderModel -> getAvailableRDDForAutoClosure');
    let client: PoolClient | null = null;
    try {
      const sqlStatement = `
      SELECT
        o.so_number,
        o.rdd,
        o.distributor_id ,
        rm.code AS state_code
      FROM
        orders o
      INNER JOIN distributor_master dm ON dm.id = o.distributor_id 
      INNER JOIN region_master rm ON rm.id = dm.region_id
      where 
        so_number = ANY($1) 
        and rdd is not null`;
      client = await conn.getReadClient();
      const { rows } = await client.query(sqlStatement, [soList]);
      return rows;
    } catch (error) {
      logger.error(
        'CAUGHT: Error inside OrderModel -> getAvailableRDDForAutoClosure, Error: ',
        error,
      );
      return null;
    } finally {
      client?.release();
    }
  },

  async fetchTATfromSnowflake(shipToNumber: string, formattedPlantNames: string): Promise<RouteMasterResponse> {
    try {
        const query = `WITH RankedRoutes AS (
            SELECT 
                TAT,
                PLANT_CODE,
                ROW_NUMBER() OVER (ORDER BY TAT ASC) as rn
            FROM prd_pso_dm_db.pso_dm_br.route_master 
            WHERE ship_to = '${shipToNumber}'
            AND PLANT_CODE IN (${formattedPlantNames})
        )
        SELECT TAT, PLANT_CODE
        FROM RankedRoutes
        WHERE rn = 1`;

        const response = await snowflakeConnection.query(query);
        let snowflakeDetails: RouteDetails | null = null;

        if (response?.[0]) {
            snowflakeDetails = {
              TAT: response[0].TAT,
              PLANT_CODE: response[0].PLANT_CODE.toString()
          };
            logger.info('Found route details:', {
                shipTo: shipToNumber,
                formattedPlantNames,
                snowflakeDetails
            });
        } else {
            logger.warn('No route details found for:', {
                shipTo: shipToNumber,
                formattedPlantNames
            });
        }
        return {
            shipToNumber,
            formattedPlantNames,
            snowflakeDetails
        };
    } catch (error) {
        logger.error('Error querying Snowflake:', error);
        return {
            shipToNumber,
            formattedPlantNames,
            snowflakeDetails: null
        };
    }
  },

  async fetchLastARSOrder(distributorId: string){
    logger.info('Inside OrderModel -> fetchLastARSOrder, distributorId: '+distributorId);
    let client: PoolClient | null = null;

    try {
      const sqlStatement = `SELECT od.po_number, od.so_number, od.so_value, od.so_date, od.order_data, od.created_on, dm.ao_enable 
                            FROM orders od
                            INNER JOIN distributor_master dm ON (od.distributor_id = dm.id)
                            WHERE od.distributor_id = $1 AND od.order_type = 'ARS' 
                              AND od.so_number IS NOT NULL AND od.so_number != ''
                              AND od.so_value IS NOT NULL AND od.so_value::float8 > 0.0
                            ORDER BY od.created_on DESC LIMIT 1;`;
      client = await conn.getReadClient();
      const result = await client.query(sqlStatement,[distributorId]);

      return result?.rows?.length ? result.rows[0] : {};
    } catch (error) {
      logger.error('Inside OrderModel -> fetchLastARSOrder, Error: ', error);
      return null;
    } finally {
      if (client != null) client.release();
    }
  }
};
