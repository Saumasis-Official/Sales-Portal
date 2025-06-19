import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import Email from '../helper/email';
import moment from 'moment';
import { OrderService } from '../service/order.service';
import commonHelper from '../helper/index';
import _ from 'lodash';

export const ServiceDeliveryRequestModel = {
  async getSDList(
    roles: string[],
    userId: string,
    limit: number,
    offset: number,
    search: string,
    userEmail: string,
    status: string,
    code: string = ''
  ) {
    logger.info('inside ServiceDeliveryRequestModel->getSDList');
    
    let client: PoolClient| null = null;
    try {
      userEmail = userEmail.toLowerCase();
      let dbQuery = '';
      const codesString = code?.length ? code.split(',').map((c) => `'${c}'`).join(',') : '';
      const roleBasedDbQuery = {
        'ASM': `SELECT DISTINCT dm.profile_id FROM distributor_master dm WHERE dm.area_code IN (${codesString})`,
        'TSE': `SELECT DISTINCT dm.profile_id FROM distributor_master dm WHERE dm.tse_code IN (${codesString})`,
        'RSM': `SELECT DISTINCT dm.profile_id FROM distributor_master dm
                INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                WHERE gm.rsm_code = ${codesString}`,
        'CLUSTER_MANAGER': `SELECT DISTINCT dm.profile_id FROM distributor_master dm
                            INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                            WHERE gm.cluster_code = ${codesString}`,
      };
      dbQuery = roleBasedDbQuery[roles.find(role => roleBasedDbQuery[role]) ?? ''] ?? '';
      dbQuery = dbQuery.length ? ` sdr.distributor_id IN (${dbQuery})` : '';
      const query = `
              SELECT DISTINCT ON(sdr.id, sdr.sd_request_date)
              sdr.sd_number,
              sdr.sd_request_date,
              sdr.material_description,
              o.so_number,
              sdr.distributor_id,
              up.name,
              src.label as req_reason,
              _src.label as cfa_res_reason,
              sdr.sd_req_comments,
              sdr.sd_response_date,
              sdr.status,
              sdr.cfa_email,
              sdr.cfa_name,
              sdr.cfa_contact,
              sdr.sd_res_comments,
              sdr.plant_code,
              cfa.location
              FROM service_delivery_requests sdr
              LEFT JOIN user_profile up ON sdr.distributor_id=up.id
              LEFT JOIN service_request_categories src ON sdr.req_reason_id=src.id
              LEFT JOIN service_request_categories _src ON sdr.cfa_reason_id=_src.id
              LEFT JOIN orders o ON sdr.order_id=o.id
              LEFT JOIN (
                SELECT DISTINCT
                depot_code, location
                FROM cfa_depot_mapping
              ) as cfa ON sdr.plant_code=cfa.depot_code
              WHERE sdr.is_deleted=false`;
      let recursiveSalesHierarchyQuery = `
              sdr.distributor_id IN (
              SELECT 
              dm.profile_id
              FROM distributor_master dm
              LEFT JOIN user_profile up ON dm.profile_id=up.id
              WHERE dm.tse_code IN ${commonHelper.tseHierarchyQuery(userId)})`;
      let cfaQuery = `LOWER(sdr.cfa_email) IN (
                SELECT DISTINCT  LOWER(email)
                FROM cfa_depot_mapping
                WHERE LOWER(email) ='${userEmail}'
                OR STRING_TO_ARRAY(LOWER(logistic_email),',') && ARRAY['${userEmail}']
                OR STRING_TO_ARRAY(LOWER(zone_manager_email),',') && ARRAY['${userEmail}']
                OR STRING_TO_ARRAY(LOWER(cluster_manager_email),',') && ARRAY['${userEmail}']
                AND is_deleted = 'false'
              )`;
      let searchConditions = `
        (
          sdr.sd_number ILIKE '%${search}%'
          OR sdr.distributor_id ILIKE '%${search}'
          OR o.so_number ILIKE '%${search}%'
          OR up.name ILIKE '%${search}%'
          OR src.label ILIKE '%${search}%'
          OR sdr.plant_code ILIKE '%${search}%'
          OR cfa.location ILIKE '%${search}%'
        )`;
      let limitOffset = `
          ORDER BY  sdr.sd_request_date DESC, sdr.id DESC
          LIMIT ${limit} OFFSET ${offset}`;
      let sqlStatement = query;
      
      let statusQuery= status && status !== 'ALL' ? ` AND sdr.status= '${status}'`: '';
      sqlStatement += statusQuery;
      
      if (userId) {
        if (search) {
          sqlStatement += ` AND ${searchConditions}`;
        }
        if (_.intersection(roles, ['DIST_ADMIN', 'ASM', 'TSE', 'RSM', 'CLUSTER_MANAGER']).length>0) {
          // sqlStatement += ` AND ${recursiveSalesHierarchyQuery}`;
          sqlStatement += ` AND ${dbQuery}`;
        } else if (_.intersection(roles, ['CFA', 'LOGISTIC_OFFICER', 'ZONAL_OFFICER']).length > 0) {
          sqlStatement += ` AND ${cfaQuery}`;
        }
      }

      sqlStatement += limitOffset;
      client = await conn.getReadClient();
      const rows = await client.query(sqlStatement);
      return rows;
    } catch (error) {
      logger.error('error in ServiceDeliveryRequestModel->getSDList',error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },
  async getSDListCount(
                      roles: string[],
                      userId: string,
                      search: string,
                      userEmail: string,
                      status: string,
                      code : string  = ''
                    ) {
    logger.info('inside ServiceDeliveryRequestModel->getSDListCount');
    
    let client: PoolClient| null = null;
    try {
      userEmail = userEmail.toLowerCase();
      let dbQuery = '';
      const codesString = code?.length ? code.split(',').map((c) => `'${c}'`).join(',') : '';
      const roleBasedDbQuery = {
        'ASM': `SELECT DISTINCT dm.profile_id FROM distributor_master dm 
                WHERE dm.area_code IN (${codesString})`,
        'TSE': `SELECT DISTINCT dm.profile_id FROM distributor_master dm 
                WHERE dm.tse_code IN (${codesString})`,
        'RSM': `SELECT DISTINCT dm.profile_id FROM distributor_master dm
                INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                WHERE gm.rsm_code = ${codesString}`,
        'CLUSTER_MANAGER': `SELECT DISTINCT dm.profile_id FROM distributor_master dm
                            INNER JOIN group5_master gm ON (dm.group5_id = gm.id)
                            WHERE gm.cluster_code = ${codesString}`,
      };
      dbQuery = roleBasedDbQuery[roles.find(role => roleBasedDbQuery[role]) ?? ''] ?? '';
      dbQuery = (dbQuery.length) ? ` sdr.distributor_id IN (${dbQuery})` : '';
      const query = `
          SELECT 
          Count(distinct sdr.sd_number)
          FROM service_delivery_requests sdr
          LEFT JOIN user_profile up ON sdr.distributor_id=up.id
          LEFT JOIN service_request_categories src ON sdr.req_reason_id=src.id
          LEFT JOIN service_request_categories _src ON sdr.cfa_reason_id=_src.id
          LEFT JOIN orders o ON sdr.order_id=o.id
          LEFT JOIN (
            SELECT DISTINCT
            depot_code, location
            FROM cfa_depot_mapping
          ) as cfa ON sdr.plant_code=cfa.depot_code
          WHERE sdr.is_deleted=false`;
      let recursiveSalesHierarchyQuery = `
          sdr.distributor_id IN (
          SELECT 
          dm.profile_id
          FROM distributor_master dm
          LEFT JOIN user_profile up ON dm.profile_id=up.id
          WHERE dm.tse_code IN ${commonHelper.tseHierarchyQuery(userId)})`;
      let cfaQuery = `LOWER(sdr.cfa_email) IN (
          SELECT DISTINCT  LOWER(email)
          FROM cfa_depot_mapping
          WHERE LOWER(email) ='${userEmail}'
          OR STRING_TO_ARRAY(LOWER(logistic_email),',') && ARRAY['${userEmail}']
          OR STRING_TO_ARRAY(LOWER(zone_manager_email),',') && ARRAY['${userEmail}']
          OR STRING_TO_ARRAY(LOWER(cluster_manager_email),',') && ARRAY['${userEmail}']
          AND is_deleted = 'false'
        )`;
      let searchConditions = `
        (
          sdr.sd_number ILIKE '%${search}%'
          OR sdr.distributor_id ILIKE '%${search}'
          OR o.so_number ILIKE '%${search}%'
          OR up.name ILIKE '%${search}%'
          OR src.label ILIKE '%${search}%'
          OR sdr.plant_code ILIKE '%${search}%'
          OR cfa.location ILIKE '%${search}%'
        )`;
      let sqlStatement = query;

      let statusQuery= status && status !== 'ALL' ? ` AND sdr.status= '${status}'`: '';
      sqlStatement += statusQuery;

      if (userId) {
        if (search) {
          sqlStatement += ` AND ${searchConditions}`;
        }
        if (_.intersection(roles, ['DIST_ADMIN', 'ASM', 'TSE', 'RSM', 'CLUSTER_MANAGER']).length > 0) {
          // sqlStatement += ` AND ${recursiveSalesHierarchyQuery}`;
          sqlStatement += ` AND ${dbQuery}`;
        } else if (_.intersection(roles, ['CFA', 'LOGISTIC_OFFICER', 'ZONAL_OFFICER']).length > 0) {
          sqlStatement += ` AND ${cfaQuery}`;
        }
      }
      client = await conn.getReadClient();
      const rows = await client.query(sqlStatement);
      return rows;
    } catch (error) {
      logger.error('error in ServiceDeliveryRequestModel->getSDListCount',error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },
  async addSDRequest(serviceDeliveryRequestData: any, user: any) {
    logger.info('inside ServiceDeliveryRequestModel addSDRequest');
    let client: PoolClient| null = null;
    try {
      client = await conn.getWriteClient();
      let lastSDNumberSerial = await generateSDNumber();
      let sd_number =
        'SD-' + getMMYYFormat(new Date()) + '-' + lastSDNumberSerial;

      let orderIdQuery = `SELECT id FROM orders WHERE so_number = '${serviceDeliveryRequestData.so_number}'`;
      let orderId = await client.query(orderIdQuery);
      orderId = orderId && orderId.rows && orderId.rows[0].id;

      let created_by = null;
      let created_by_usergroup = 'SELF';

      if (user.hasOwnProperty('roles')) {
        created_by = user.user_id;
        created_by_usergroup = user.roles.join(',');
      }

      let query = `INSERT INTO service_delivery_requests (distributor_id, req_reason_id, sd_number, order_id, sd_response_date, sd_req_comments, created_by, created_by_usergroup, material_code, material_description, plant_code, cfa_name, cfa_email, cfa_contact) 
      VALUES ('${serviceDeliveryRequestData.distributor_id}', '${serviceDeliveryRequestData.req_reason_id}', '${sd_number}', '${orderId}', null, '${serviceDeliveryRequestData.sd_req_comments}', '${created_by}', '${created_by_usergroup}', '${serviceDeliveryRequestData.material_code}', '${serviceDeliveryRequestData.material_description}', '${serviceDeliveryRequestData.plant_code}', '${serviceDeliveryRequestData.cfa_name}', '${serviceDeliveryRequestData.cfa_email}', '${serviceDeliveryRequestData.cfa_contact}') 
      RETURNING distributor_id, order_id as so_number, req_reason_id, sd_number, sd_request_date, sd_req_comments, created_by, created_by_usergroup, status, material_code, material_description, plant_code, cfa_name, cfa_email, cfa_contact;
      `;
      let response = await client.query(query);
      try {
        if (response && response.rows && response.rows[0]) {
          let adminData = await OrderService.getTseAsmAdminDetails(
            response.rows[0].distributor_id,
          );

          let reqReasonQuery = `SELECT label FROM service_request_categories where id = ${response.rows[0].req_reason_id}`;
          let reqReason: any;
          try {
            reqReason = await client.query(reqReasonQuery);
          } catch (error) {
            logger.error(
              `error while retrieving label against req_reason_id in ServiceDeliveryRequestModel addSDRequest`,
              error,
            );
          }

          let zoneManagerEmailsQuery = `SELECT zone_manager_email FROM cfa_depot_mapping WHERE LOWER(email) = LOWER('${response.rows[0].cfa_email}')`;

          let zoneManagerEmailsResponse: any;

          let zoneManagerEmailsArray: any;

          try {
            zoneManagerEmailsResponse = await client.query(
              zoneManagerEmailsQuery,
            );

            zoneManagerEmailsArray =
              zoneManagerEmailsResponse.rows[0].zone_manager_email
                .split(',')
                .map(function (item) {
                  return item.trim();
                });
          } catch (error) {
            logger.error(
              `error while retrieving zone manager emails against cfa email in ServiceDeliveryRequestModel addSDRequest`,
            );
          }

          let otpData = {
            distributor_id: response.rows[0].distributor_id,
            distributor_name: adminData.name,
            sd_number: response.rows[0].sd_number,
            sd_request_date: response.rows[0].sd_request_date
              ? moment(response.rows[0].sd_request_date).format(
                  'DD/MM/YYYY',
                )
              : '',
            so_number: serviceDeliveryRequestData.so_number,
            material_code: response.rows[0].material_code,
            material_description:
              response.rows[0].material_description,
            plant_code: response.rows[0].plant_code,
            cfa_name: response.rows[0].cfa_name,
            cfa_email: response.rows[0].cfa_email,
            cfa_contact: response.rows[0].cfa_contact,
            req_reason: reqReason.rows[0].label,
            sd_req_comments: response.rows[0].sd_req_comments,
            admin_details: adminData,
            zone_manager_emails: zoneManagerEmailsArray,
          };
          Email.sdr_created(
            { email: response.rows[0].cfa_email },
            otpData,
          );
        }
      } catch (error) {
        logger.error(`error while sending email in ServiceDeliveryRequestModel addSDRequest`,error);
      }
      return response;
    } catch (error) {
      logger.error(`Error inside ServiceDeliveryRequestModel addSDRequest`, error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },

  async sdrReport(to :string, from: string){
    logger.info('inside ServiceDeliveryRequestModel->sdrReport');

    let client: PoolClient| null = null;
    try{
      const sqlStatement = 
                          `SELECT sdr.id, sdr.status, sdr.sd_request_date, src.label 
                           FROM service_delivery_requests AS sdr 
                           INNER JOIN service_request_categories src ON sdr.req_reason_id = src.id 
                           WHERE sdr.sd_request_date BETWEEN '${to}' AND '${from}'`;
      client = await conn.getReadClient();
      const rows= await client.query(sqlStatement);

      return rows;
    }catch(error){
      logger.error('error in ServiceDeliveryRequestModel->getSDList',error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },

  async sdResponseReport(to :string, from: string){
    logger.info('inside ServiceDeliveryRequestModel->sdResponseReport');

    let client: PoolClient| null = null;
    try{
      const sqlStatement = 
                          `SELECT sdr.id, sdr.status, sdr.sd_response_date, src.label 
                           FROM service_delivery_requests AS sdr 
                           INNER JOIN service_request_categories src ON sdr.cfa_reason_id = src.id 
                           WHERE sdr.sd_response_date BETWEEN '${to}' AND '${from}'`;
      client = await conn.getReadClient();
      const rows= await client.query(sqlStatement);
      
      return rows;
    }catch(error){
      logger.error('error in ServiceDeliveryRequestModel->sdResponseReport',error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },
  async getEmailsForSDReport(region: string) {
    logger.info('Entering ServiceDeliveryRequestModel->getAllEmails');

    let client: PoolClient | null = null;
    try {
      client = await conn.getReadClient();
      const sqlStatement = `
        WITH all_emails AS (
            SELECT DISTINCT
                LOWER(email) AS email,
                LOWER(zone_manager_email) AS zone_manager_email,
                LOWER(logistic_email) AS logistic_email,
                zone AS region
            FROM cfa_depot_mapping
            WHERE email != 'PORTAL_MANAGED' AND email != '' AND zone_manager_email != '' AND logistic_email != ''
        ),
        aggregate_emails AS (
            SELECT
                region,
                STRING_AGG(DISTINCT email, ',') AS to_emails,
                STRING_AGG(DISTINCT zone_manager_email, ',') || 
                CASE 
                    WHEN COUNT(DISTINCT logistic_email) > 0 THEN ',' || STRING_AGG(DISTINCT logistic_email, ',') 
                    ELSE '' 
                END AS all_cc_emails
            FROM all_emails
            GROUP BY region
        ),
        exploded_emails AS (
            SELECT
                region,
                unnest(string_to_array(to_emails, ',')) AS distinct_to_email,
                unnest(string_to_array(all_cc_emails, ',')) AS cc_email
            FROM aggregate_emails
        )
        SELECT
            region,
            STRING_AGG(DISTINCT distinct_to_email, ',') AS to_emails,
            STRING_AGG(DISTINCT cc_email, ',') AS cc_emails  
        FROM exploded_emails
        GROUP BY region
        HAVING region = $1;
      `;
      const result = await client.query(sqlStatement, [region]);
      
        // Extract the email data for the specified zone
        const row = result.rows[0];

        return {
            toEmails: row.to_emails,
            ccEmails: row.cc_emails
        };
    } catch (error) {
      logger.error('Error in ServiceDeliveryRequestModel->getAllEmails', error);
      return null;
    } finally {
      if (client != null) {
        client.release();
      }
    }
  },
  async getSDReport(region: string) {
    logger.info('Entering ServiceDeliveryRequestModel->getSDReport');
  
    let client: PoolClient | null = null;
    try {  
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const query = `
        SELECT 
          g5m.description AS region,
          COUNT(CASE WHEN sdr.status = 'OPEN' THEN 1 END) AS open_tickets,
          COUNT(CASE WHEN sdr.sd_request_date::date = $1 THEN 1 END) AS raised_tickets,
          COUNT(CASE WHEN sdr.sd_response_date::date = $1 THEN 1 END) AS responded_tickets
        FROM service_delivery_requests sdr
        JOIN distributor_master dm ON sdr.distributor_id = dm.profile_id
        LEFT JOIN group5_master g5m ON dm.group5_id = g5m.id
        WHERE g5m.description = $2
        GROUP BY g5m.description
      `;
      client = await conn.getReadClient();
      const result = await client.query(query, [yesterdayDate, region]);
      
      return result.rows;
  
    } catch (error) {
      logger.error('Error in ServiceDeliveryRequestModel->getSDReport', { error });
      throw new Error('Failed to get service delivery report'); 
    } finally {
      if (client) {
        client.release();
      }
    }
  },
  async getAllRegions() {
    logger.info('Entering ServiceDeliveryRequestModel->getAllRegions');
  
    let client: PoolClient | null = null;
    try {
      client = await conn.getReadClient();
      const query = `
        SELECT DISTINCT g5m.description AS region
        FROM group5_master g5m
        JOIN distributor_master dm ON g5m.id = dm.group5_id
        WHERE g5m.description IN (
          'East 1', 'East 2', 'Central 2', 'Central 1', 
          'North 2', 'North 1', 'West 1', 'South 3', 
          'South 2', 'South 1', 'West 2'
        )      `;
      const result = await client.query(query);
      return result.rows.map(row => row.region);
    } catch (error) {
      logger.error('Error in ServiceDeliveryRequestModel->getAllRegions', error);
      return null;
    } finally {
      if (client) {
        client.release();
      }
    }
  },  
  async getSDExcelData(region: string) {
    logger.info('inside ServiceDeliveryRequestModel -> getSDExcelData');
    let client: PoolClient | null = null;
    try {  
      const query = `
      SELECT DISTINCT ON(sdr.id, sdr.sd_request_date)
             g5m.description as region,
             sdr.sd_number,
             sdr.sd_request_date,
             coalesce(brand_desc,'') as brand_name,
             coalesce(brand_variant_desc,'') as brand_variant,
             sdr.material_description,
             o.so_number,
             sdr.distributor_id,
             up.name,
             dm.tse_code,
             dm.area_code,
             src.label as req_reason,
             _src.label as cfa_res_reason,
             sdr.sd_req_comments,
             sdr.sd_response_date,
             sdr.status,
             sdr.sd_res_comments,
             sdr.plant_code,
             cfa.location
             FROM service_delivery_requests sdr
             LEFT JOIN user_profile up ON sdr.distributor_id=up.id
             LEFT JOIN service_request_categories src ON sdr.req_reason_id=src.id
             LEFT JOIN service_request_categories _src ON sdr.cfa_reason_id=_src.id
             LEFT JOIN orders o ON sdr.order_id=o.id
             LEFT JOIN (
               SELECT DISTINCT
               depot_code, location
               FROM cfa_depot_mapping
             ) as cfa ON sdr.plant_code=cfa.depot_code
             LEFT JOIN distributor_master dm ON sdr.distributor_id = dm.profile_id
             LEFT JOIN group5_master g5m ON dm.group5_id = g5m.id
             LEFT JOIN material_master mm ON sdr.material_code  = mm.code
             WHERE sdr.is_deleted=false 
             AND sdr.sd_request_date >= DATE_TRUNC('month', CURRENT_DATE)
             AND sdr.sd_request_date < CURRENT_DATE
             AND g5m.description = $1 
             `;
      client = await conn.getReadClient();
      const result = await client.query(query,[region]);
      
      return result.rows;
  
    } catch (error) {
      logger.error('Error in ServiceDeliveryRequestModel->getSDExcelData', { error });
      throw new Error('Failed to get service delivery report'); 
    } finally {
      if (client) {
        client.release();
      }
    }

  },
  async updateSDRequest(serviceDeliveryRequestData: any, user: any) {
    logger.info('inside ServiceDeliveryRequestModel -> updateSDRequest');
    
    let client: PoolClient| null = null;
    try {
      client = await conn.getWriteClient();
      let previousSDRQuery = `SELECT * FROM service_delivery_requests WHERE sd_number = '${serviceDeliveryRequestData.sd_number}'`;
      let previousSDRRecord = await client.query(previousSDRQuery);

      let sd_response_date = new Date().toISOString();
      let updatedByQuery = `SELECT user_id FROM sales_hierarchy_details WHERE email = '${user.email}'`;

      let updated_by = await client.query(updatedByQuery);
      updated_by = updated_by && updated_by.rows && updated_by.rows[0].user_id;
      let query = `UPDATE service_delivery_requests
        SET cfa_reason_id = '${serviceDeliveryRequestData.cfa_reason_id}',  sd_res_comments='${serviceDeliveryRequestData.sd_res_comments}', status = '${serviceDeliveryRequestData.status}', updated_by='${updated_by}', sd_response_date='${sd_response_date}' 
	      WHERE  sd_number = '${serviceDeliveryRequestData.sd_number}'
        RETURNING distributor_id, order_id as so_number, req_reason_id, sd_number, sd_request_date, sd_req_comments, created_by, created_by_usergroup, status, material_code, material_description, plant_code, cfa_reason_id, sd_res_comments, sd_response_date, status, cfa_name, cfa_email, cfa_contact;
        `;
      let response = await client.query(query);

      try {
        if (response && response.rows && response.rows[0] && (previousSDRRecord.rows[0].cfa_reason_id != response.rows[0].cfa_reason_id || previousSDRRecord.rows[0].sd_res_comments != response.rows[0].sd_res_comments)) {
          let adminData = await OrderService.getTseAsmAdminDetails(
            response.rows[0].distributor_id,
          );
          
          let reqReasonQuery = `SELECT label FROM service_request_categories where id = ${response.rows[0].req_reason_id}`;
          let reqReason: any;
          try {
            reqReason = await client.query(reqReasonQuery);
          } catch (error) {
            logger.error(
              `error while retrieving label against req_reason_id in ServiceDeliveryRequestModel updateSDRequest`,
              error,
            );
          }

          let cfaReasonQuery = `SELECT label FROM service_request_categories where id = ${response.rows[0].cfa_reason_id}`;
          let cfaReason: any;
          try {
            cfaReason = await client.query(cfaReasonQuery);
          } catch (error) {
            logger.error(
              `error while retrieving label against cfa_reason_id in ServiceDeliveryRequestModel updateSDRequest`,
              error,
            );
          }

          let soNumberQuery = `SELECT so_number FROM orders where id = ${response.rows[0].so_number}`;
          let soNumber: any;
          try {
            soNumber = await client.query(soNumberQuery);
          } catch (error) {
            logger.error(
              `error while retrieving so_number from orders table in ServiceDeliveryRequestModel updateSDRequest`,
              error,
            );
          }

          let zoneManagerEmailsQuery = `SELECT zone_manager_email FROM cfa_depot_mapping WHERE LOWER(email) = LOWER('${response.rows[0].cfa_email}')`;
          let zoneManagerEmailsResponse: any;
          let zoneManagerEmailsArray: any;

          try {
            zoneManagerEmailsResponse = await client.query(
              zoneManagerEmailsQuery,
            );
            zoneManagerEmailsArray =
              zoneManagerEmailsResponse.rows[0].zone_manager_email
                .split(',')
                .map(function (item) {
                  return item.trim();
                });
          } catch (error) {
            logger.error(
              `error while retrieving zone manager emails against cfa email in ServiceDeliveryRequestModel addSDRequest`,
            );
          }
          let otpData = {
            distributor_id: response.rows[0].distributor_id,
            distributor_name: adminData.name,
            sd_number: response.rows[0].sd_number,
            req_reason: reqReason.rows[0].label,
            sd_req_comments: response.rows[0].sd_req_comments,
            sd_request_date: response.rows[0].sd_request_date
              ? moment(response.rows[0].sd_request_date).format(
                  'DD/MM/YYYY',
                )
              : '',
            so_number: soNumber.rows[0].so_number,
            material_code: response.rows[0].material_code,
            material_description:
              response.rows[0].material_description,
            plant_code: response.rows[0].plant_code,
            cfa_reason: cfaReason.rows[0].label,
            sd_res_comments: response.rows[0].sd_res_comments,
            sd_response_date: response.rows[0].sd_response_date
              ? moment(response.rows[0].sd_request_date).format(
                  'DD/MM/YYYY',
                )
              : '',
            cfa_name: response.rows[0].cfa_name,
            cfa_email: response.rows[0].cfa_email,
            cfa_contact: response.rows[0].cfa_contact,
            admin_details: adminData,
            zone_manager_emails: zoneManagerEmailsArray,
            responder_email: user.email
          };
          Email.cfa_response(
            { email: response.rows[0].cfa_email },
            otpData,
          );
        }
      } catch (error) {
        logger.error(
          `Error while sending email in ServiceDeliveryRequestModel addSDRequest`,
          error,
        );
      }

      return response;
    } catch (error) {
      logger.error(`Error inside ServiceDeliveryRequestModel updateSDRequest`,error);
      return null;
    } finally {
      if (client != null)
          client.release();
    }
  },
};

function getMMYYFormat(date: any) {
  let mm = date.getMonth() + 1; // Months start at 0!
  let yy = date.getFullYear();
  if (mm < 10) mm = '0' + mm;
  yy = yy.toString().substring(2);
  return `${mm}${yy}`;
}

async function generateSDNumber() {
  logger.info('inside ServiceDeliveryModel generateSDNumber');
  let client: PoolClient| null = null;
  try {
    logger.info(`Fetching last added sd_number from service_delivery_table`);
    const fetchLastSDNumberQuery = `
      SELECT sd_number FROM service_delivery_requests ORDER BY id DESC LIMIT 1
      `;
    client = await conn.getReadClient();
    let lastSDNumber = await client.query(fetchLastSDNumberQuery);
    if (
      lastSDNumber &&
      lastSDNumber.rows &&
      typeof lastSDNumber.rows[0] != 'undefined'
    ) {
      logger.info(
        `current SDNumber : ${
          lastSDNumber &&
          lastSDNumber.rows &&
          lastSDNumber.rows[0].sd_number
        }`,
      );
      lastSDNumber =
        lastSDNumber &&
        lastSDNumber.rows &&
        lastSDNumber.rows[0].sd_number;
      let lastMonth = lastSDNumber.toString().substring(3, 5);
      let today = new Date();
      let newMonth = getMMYYFormat(today).substring(0, 2);

      let lastSDNumberSerial = parseInt(
        lastSDNumber.toString().substring(8),
      );
      if (lastMonth != newMonth) {
        lastSDNumberSerial = 10000;
      } else {
        lastSDNumberSerial = lastSDNumberSerial + 1;
      }
      return lastSDNumberSerial;
    } else {
      return 10000; //for first sd-request
    }
  } catch (error) {
    logger.error(`Error in fetching last added sd_number : `, error);
    return null;
  } finally {
    if (client != null)
        client.release();
  }
}

