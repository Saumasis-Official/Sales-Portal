import logger from '../lib/logger';
import helper from '../helper/index';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { PoolClient } from 'pg';
import { AdminModel } from './AdminModel';
const conn = PostgresqlConnection.getInstance();

export const SurveyModel = {
    async fetchCfaDetailsOfDepot(depot: string) {
        //need to check with logger
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> fetchCfaDetailsOfDepot');
            if (!depot) {
                throw new Error('Depot code to fetch CFA details is missing');
            }
            const sqlStatement = `SELECT DISTINCT ON (email) 
                                    name cfa_name, address cfa_address, email cfa_email, COALESCE(contact_person,'-') cfa_contact_person, COALESCE(contact_number,'-') cfa_mobile
                                    FROM cfa_depot_mapping
                                    WHERE depot_code = $1 ;`;
            const respose = await client.query(sqlStatement, [depot]);
            if (!respose?.rows?.length) {
                return [];
            }
            return respose?.rows;
        } catch (e) {
            logger.error('inside SurveyModel -> fetchCfaDetailsOfDepot, error: ', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async fetchDepotForLogistics(email: string | null) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> fetchDepotForLogistics');
            if (email && !helper.validateTCPLEmail(email)) {
                throw new Error(email + ' is not a valid TCPL email');
            }
            const whereCondition = email
                ? `
                                            left join cfa_depot_mapping cdm on
                                                cdm.depot_code = db_depot_details.depot_code
                                            WHERE cdm.zone_manager_email ILIKE '%${email}%'
                                            OR cdm.cluster_manager_email ILIKE '%${email}%'
                                            OR cdm.logistic_email ILIKE '%${email}%'`
                : '';
            const sqlStatement = `
            select
                db_depot_details.depot_code,
                description,
                jsonb_object_agg(
                    db_depot_details.id,
                    db_depot_details.name || '$' || db_depot_details.customer_group || '$' || db_depot_details.customer_group_description
            ) as all_distributors
            from
                (
                select
                    distinct
                    dm.id,
                    up."name" ,
                    cgm.name as customer_group,
                    cgm.description as customer_group_description,
                    pm.description ,
                    pm.name as depot_code
                from
                    distributor_master dm
                inner join distributor_plants dp on
                    dp.distributor_id = dm.id
                inner join plant_master pm on
                    pm.id = dp.plant_id
                inner join user_profile up on
                    up.id = dm.profile_id
                inner join customer_group_master cgm on
                    cgm.id = dm.group_id
                where
                      cgm.name in (
                      SELECT unnest(string_to_array(value, ',')) 
                      FROM app_level_settings 
                      WHERE key = 'CFA_SURVEY_CGS_ENABLE'
                      )
                order by
                    pm.name ,
                    dm.id
                ) as db_depot_details
            ${whereCondition}
            group by
                db_depot_details.depot_code,
                db_depot_details.description;`;
            const response = await client.query(sqlStatement);
            if (!response?.rows?.length) {
                return [];
            }
            return response?.rows;
        } catch (e) {
            logger.error('inside SurveyModel -> fetchDepotForLogistics, error: ', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async upsertCfaSurveyQuestionnaire(
        logistic_id: string | null,
        depot_code_distributors: { depot_code: string; applicable_distributors: string[] }[],
        questions: any,
        survey_start: any,
        survey_end: any,
    ) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            logger.info('inside SurveyModel -> upsertCfaSurveyQuestionnaire');
            logistic_id = !logistic_id ? 'PORTAL_MANAGED' : logistic_id;
            questions = JSON.stringify(questions);
            survey_start = new Date(survey_start.toString()).toISOString();
            survey_end = new Date(survey_end.toString()).toISOString();
            const sqlStatement = `INSERT INTO cfa_survey_questionnaire(logistic_id, depot_code, questions, updated_on, survey_start, survey_end, applicable_distributors)
                                        VALUES ($1, $2, $3, now(), $4, $5, $6)`;
            const availabilitySqlStatement = `
              select
                id
            from
                cfa_survey_questionnaire csq
            where
                csq.depot_code = $1
                and csq.survey_start > current_date;`;
            const updateStatement = `
                update
                    cfa_survey_questionnaire
                set
                    questions = $1,
                    updated_on = now(),
                    survey_start = $2,
                    survey_end = $3,
                    logistic_id = $4,
                    applicable_distributors = $5
                where
                    id = $6`;
            for (let { depot_code, applicable_distributors } of depot_code_distributors) {
                /**
                 * To check if questions is already present for the depot, check depot_code and survey_start > current_date
                 */
                const availabilityResponse = await client.query(availabilitySqlStatement, [depot_code]);
                if (availabilityResponse?.rows[0]?.id) {
                    const updateResponse = await client.query(updateStatement, [
                        questions,
                        survey_start,
                        survey_end,
                        logistic_id,
                        applicable_distributors,
                        availabilityResponse?.rows[0]?.id,
                    ]);
                    if (!updateResponse?.rowCount) {
                        return false;
                    }
                } else {
                    const response = await client.query(sqlStatement, [logistic_id, depot_code, questions, survey_start, survey_end, applicable_distributors]);
                    if (!response?.rowCount) {
                        return false;
                    }
                }
            }
            return true;
        } catch (e) {
            logger.error('inside SurveyModel -> upsertCfaSurveyQuestionnaire, error: ', e);
            return false;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async fetchCfaSurveyQuestions(logistic_id: string | null, depot_code: string[] | null) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> fetchCfaSurveyQuestions');
            let logistic_condition = logistic_id ? ` AND logistic_id = '${logistic_id}'` : '';
            let depot_condition = depot_code && depot_code.length ? ` AND csq.depot_code IN (${depot_code.map((depot) => `'${depot}'`).toString()}) OR csq.depot_code = '' ` : '';
            const sqlStatement = `SELECT DISTINCT ON (csq.depot_code)
                                        csq.id
                                        ,csq.depot_code
                                        ,cdm.location
                                        ,csq.logistic_id
                                        ,COALESCE(shd.first_name,'PORTAL') || ' ' || COALESCE(shd.last_name, 'MANAGED') AS logistics_name
                                        ,csq.questions
                                        ,csq.updated_on
                                        ,csq.survey_start
                                        ,csq.survey_end
                                        ,csq.survey_link
                                        ,array_agg(csr.db_code) dbs_responded
                                        ,csq.applicable_distributors
                                FROM cfa_survey_questionnaire csq
                                LEFT JOIN sales_hierarchy_details shd ON (shd.user_id = csq.logistic_id)
                                LEFT JOIN cfa_survey_response csr ON (csq.id = csr.questionnaire_id AND csq.survey_start::date = csr.survey_start::date)
                                LEFT JOIN cfa_depot_mapping cdm ON (cdm.depot_code = csq.depot_code)
                                WHERE 
                                  logistic_id IS NOT NULL 
                                  ${logistic_condition} 
                                 ${depot_condition}
                                GROUP BY csq.id, csq.depot_code, cdm.location, csq.logistic_id, shd.first_name, shd.last_name, csq.questions, csq.updated_on, csq.survey_start, csq.survey_end, csq.applicable_distributors
                                ORDER BY csq.depot_code, csq.updated_on DESC;`;
            const response = await client.query(sqlStatement);
            if (!response?.rows?.length) {
                return null;
            }
            return response?.rows;
        } catch (e) {
            logger.error('inside SurveyModel -> fetchCfaSurveyQuestions, error: ', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async saveDbResponse(questionnaire_id: number, db_code: string, response: any, updated_by: string | null, survey_start: string, survey_end: string, cfa_data: any) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            logger.info('inside SurveyModel -> saveDbResponse');
            response = JSON.stringify(response);
            survey_start = new Date(survey_start.toString()).toISOString();
            survey_end = new Date(survey_end.toString()).toISOString();
            let ub = updated_by != null ? updated_by : 'DISTRIBUTOR';
            let sqlStatement = `INSERT INTO cfa_survey_response(questionnaire_id, db_code, response, updated_on, updated_by, survey_start, survey_end, db_cfa_details)
                                    VALUES ($1, $2, $3, now(), $4, $5, $6, $7)
                                    ON CONFLICT (questionnaire_id, db_code) 
                                    DO UPDATE SET response= EXCLUDED.response
                                                  ,updated_on = now()
                                                  ,updated_by = EXCLUDED.updated_by
                                                  ,survey_start = EXCLUDED.survey_start
                                                  ,survey_end = EXCLUDED.survey_end
                                                  ,db_cfa_details = EXCLUDED.db_cfa_details;`;
            const dbResponse = await client.query(sqlStatement, [questionnaire_id, db_code, response, ub, survey_start, survey_end, cfa_data]);
            if (!dbResponse?.rowCount) {
                return false;
            }
            sqlStatement = `INSERT INTO cfa_survey_response_audit_trail(response_id, response, survey_start, survey_end, db_cfa_details, updated_on, updated_by)
                                SELECT id, response, survey_start, survey_end, db_cfa_details, updated_on, updated_by
                                FROM cfa_survey_response
                                WHERE questionnaire_id= $1 AND db_code = $2;`;
            const auditTrailResponse = await client.query(sqlStatement, [questionnaire_id, db_code]);
            if (!auditTrailResponse?.rowCount) {
                return false;
            }
            return true;
        } catch (e) {
            logger.error('inside SurveyModel -> saveDbResponse, error: ', e);
            return false;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async surveyNotification() {
        /**
         * Find the questionnaires which are active by timestamp, on the day this function is called
         * Find the users who have not completed the questionnaires
         * Check the last notification sent date
         * If last date is more than 3 days  or it has not been sent before, send the notification
         * If number of notification sent is 0 then send the initial notification, else send follow-up notification
         * Store the logs in the database
         */
        /**
         * QUERY LOGIC BREAKDOWN:
         * Find DB details with plant code
         * Find plant codes with active survey (current date is between start and end date) and the latest record for a depot_code
         * Find DBs who have not submitted survey (DB code not present in survey response table)
         * Find DBs who have not been notified in last 3 days (notification_id is null or notification_date is more than 3 days)
         */
        const notification_interval_days: number = 3;
        const sqlStatement = `
            with active_surveys as (
                select
                    csq.depot_code,
                    max(csq.id ) as survey_id
                from
                        cfa_survey_questionnaire csq
                where
                        now() between csq.survey_start and csq.survey_end
                group by csq.depot_code
                )
                 select
                    distinct on
                    (dm.id,
                    asy.survey_id)
                    dm.id as db_id,
                    up.email as db_email,
                    up."name" as db_name,
                    csq.survey_end as survey_end_date,
                    asy.survey_id as questionnaire_id,
                    coalesce (snl.notification_count,0) as notification_count,
                    snl.id as notification_id,
                    csq.applicable_distributors
                from
                    distributor_master dm
                inner join distributor_plants dp on
                    dm.id = dp.distributor_id
                inner join plant_master pm on
                    pm.id = dp.plant_id
                inner join user_profile up on
                    up.id = dm.profile_id
                inner join active_surveys asy on
                    asy.depot_code = pm.name
                inner join cfa_survey_questionnaire csq on
                	csq.id = asy.survey_id
                left join cfa_survey_response csr on
                    (asy.survey_id = csr.questionnaire_id
                        and csr.db_code = dm.id )
                left join cfa_survey_notification_logs snl on
                    (snl.distributor_id = dm.id
                        and snl.questionnaire_id = asy.survey_id)
                inner join customer_group_master cgm on
                    cgm.id = dm.group_id
                where
                    csr.id is null
                    and (
                    (current_date - snl.last_notification::date) > ${notification_interval_days}
                        or snl.id is null)
                    and dm.deleted = false
                    and dm.status = 'ACTIVE'
                    and cgm.name in (
                      SELECT unnest(string_to_array(value, ',')) 
                      FROM app_level_settings 
                      WHERE key = 'CFA_SURVEY_CGS_ENABLE'
                      )
                order by
                    dm.id;`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> surveyNotification', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async upsertSurveyNotification(
        details: {
            db_id: string;
            questionnaire_id: number;
            db_email: string;
            notification_count: number;
            notification_id: number | null;
        },
        emailType: string,
    ) {
        logger.info('inside SurveyModel -> upsertSurveyNotification');
        const insertQuery = `
        insert
            into
            cfa_survey_notification_logs 
            (distributor_id,
            questionnaire_id,
            email_to,
            email_type,
            first_notification,
            last_notification,
            notification_count)
        values ($1,$2,$3,$4,'now()','now()',1)`;
        const updateQuery = `
        update
            cfa_survey_notification_logs
        set
            last_notification = now(),
            notification_count = $1
        where
            id = $2`;
        const insertValues = [details.db_id, details.questionnaire_id, details.db_email, emailType];
        const updateValues = [details.notification_count + 1, details?.notification_id];
        /**If notification_id is present then it is an update request, else it is an insert request. */
        let sqlStatement = insertQuery;
        let values = insertValues;
        if (details?.notification_id) {
            sqlStatement = updateQuery;
            values = updateValues;
        }
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, values);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> upsertSurveyNotification', error);
            return null;
        } finally {
            client?.release();
        }
    },

    /**
     * To dump survey questions for the next survey
     * @param depotCodes: string[]: all the depots for which survey has completed
     * @param startDate: string | Date: start date of the next survey
     * @param endDate: string | Date: end date of the next survey
     */
    async surveyQuestionsDump(startDate: string | Date, endDate: string | Date) {
        logger.info('inside SurveyModel -> surveyQuestionsDump');
        /**
         * QUERY LOGIC BREAKDOWN
         * 1. Create a temp. table with last survey questions of each depot_code
         * 2. Find the depot_codes for which survey questions are not present( All depot_codes from cfa_depot_mapping - depot_codes whose survey end date is greater than current date)
         * 3. Insert the survey questions of the depot_codes found in step 2 from the temp. table created in step 1, with the (default questions and all distributor_codes) or (questions and distributor_codes from the last survey) if it exists.
         */
        const defaultQuestions = JSON.stringify({
            1: 'How satisfied you are with the time taken to deliver your orders?',
            2: 'How would you rate the product quality at the time of delivery?',
            3: 'How would you rate the quality of truck (cleanliness/tarpaulin etc.) which was carrying our product?',
            4: 'How satisfied are you with the communication and responsiveness of our CFA during the delivery process?',
            5: 'How satisfied are you with our speed of resolution of issues like shortage, damage products etc.',
            6: 'Overall rating on your experience with CFA',
        });
        const sqlStatement = `
        with last_records_ids as (
            select
                depot_code,
                max(id) last_record_id
            from
                cfa_survey_questionnaire csq
            group by
                depot_code
        ),
        last_record as (
            select
                csq2.id,
                csq2.questions,
                csq2.depot_code,
                csq2.updated_on,
                csq2.survey_start,
                csq2.survey_end,
                csq2.applicable_distributors
            from
                cfa_survey_questionnaire csq2
            inner join last_records_ids as lri on
                lri.last_record_id = csq2.id
        ),
        required_depot_codes as (
            select
                cdm.depot_code
            from
                cfa_depot_mapping cdm
            except
            select
                lr.depot_code
            from
                last_record lr
            where
                lr.survey_end > current_date
        ),
        db_depot_mapping as (
            select
                array_agg(distinct dm.id) applicable_distributors,
                pm.name as depot_code
            from
                distributor_master dm
            inner join distributor_plants dp on
                dp.distributor_id = dm.id
            inner join plant_master pm on
                pm.id = dp.plant_id
            inner join customer_group_master cgm on
                cgm.id = dm.group_id
            where
                  cgm.name in (
                  SELECT unnest(string_to_array(value, ',')) 
                  FROM app_level_settings 
                  WHERE key = 'CFA_SURVEY_CGS_ENABLE'
                  )
            group by
                pm.name
        )
        insert
            into
            cfa_survey_questionnaire(
            depot_code,
            questions,
            survey_start,
            survey_end,
            applicable_distributors)
        select
            rdc.depot_code,
            coalesce (lr2.questions, $1) as questions,
            $2 as survey_start,
            $3 as survey_end,
            coalesce (lr2.applicable_distributors, ddm.applicable_distributors) as applicable_distributors
        from
            required_depot_codes rdc
        left join last_record lr2 on
            lr2.depot_code = rdc.depot_code
        inner join db_depot_mapping ddm on
            ddm.depot_code = rdc.depot_code;`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const survey_start = new Date(startDate.toString()).toISOString();
            const survey_end = new Date(endDate.toString()).toISOString();
            await client.query(sqlStatement, [defaultQuestions, survey_start, survey_end]);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> surveyQuestionsDump', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async fetchCfaSurveyResponse(depotCodes: string[]) {
        logger.info('inside SurveyModel -> fetchCfaSurveyResponse');
        const sqlStatement = `
        select
        dm.area_code,
        csq.depot_code ,
        pm.description as depot_name,
        csr.db_code ,
        csr.response ,
        csr.survey_start::date ,
        csr.survey_end::date ,
        csr.updated_on::date,
        csr.db_cfa_details
    from
        cfa_survey_response csr
    inner join cfa_survey_questionnaire csq on
        csr.questionnaire_id = csq.id
    left join plant_master pm on 
        csq.depot_code = pm."name"
    inner join distributor_master dm on
        dm.id = csr.db_code
    inner join customer_group_master cgm on
        cgm.id = dm.group_id
    where
        csr.survey_end::date < current_date
        and csq.depot_code in ('${depotCodes?.join("','")}')
        and cgm.name in (
            SELECT unnest(string_to_array(value, ',')) 
            FROM app_level_settings 
            WHERE key = 'CFA_SURVEY_CGS_ENABLE'
            );`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const response = await client.query(sqlStatement);
            return response?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> fetchCfaSurveyResponse', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchSurveyReportStatistics(areaCodes: string[], zones: string[], limit: number | string, offset: number | string, headerFilter: any) {
        logger.info('inside SurveyModel -> fetchSurveyReportStatistics');
        if (!areaCodes?.length && !zones?.length) {
            logger.error('Error in SurveyModel -> fetchSurveyReportStatistics: areaCodes and zones are empty', areaCodes, zones);
            return null;
        }
        const searchCondition: string[] = [];
        const whereCondition: string[] = [];
        areaCodes?.length && whereCondition.push(`dm.area_code in ('${areaCodes.join("','")}')`);
        zones?.length && whereCondition.push(`gm.description in ('${zones.join("','")}')`);
        headerFilter?.depoSearch && searchCondition?.push(` ls.depot_code::text ILIKE '%${headerFilter.depoSearch}%' `);
        const searchStatement =
            searchCondition.length > 0
                ? `
    and ${searchCondition.join(' and ')}
    `
                : '';

        /**
         * QUERY LOGIC BREAKDOWN:
         * 1. Find the depots which have been surveyed and the survey end date is less than current date
         * 2. Find the last survey for each depot
         * 3. Find the db details for each depot
         * 4. Find the response for each db in the last survey
         * 5. Find the total number of dbs for each depot
         *
         * NOTE:
         * Data stored in the tables is at depot/DB level, but report generated is at area/depot/DB level
         * Hence, the total number of applicable DBs, number of DB responded have been calculated separately, considering their area code also.
         */
        const sqlStatement = `
    with mapped_depot_db as (
      select
        distinct pm.name as depot_code,
        dm.area_code,
        dm.id
      from
        distributor_master dm
      inner join distributor_plants dp on
        dp.distributor_id = dm.id
      inner join plant_master pm on
        pm.id = dp.plant_id
      inner join group5_master gm on
        gm.id = dm.group5_id
      inner join customer_group_master cgm on
        cgm.id = dm.group_id
      where
            cgm.name in (
            SELECT unnest(string_to_array(value, ',')) 
            FROM app_level_settings 
            WHERE key = 'CFA_SURVEY_CGS_ENABLE'
            )
        and (
            ${whereCondition.join(' or ')}
          )
      ),
      last_survey as (
      select
        csq.depot_code,
        md.area_code,
        max(csq.id) as survey_id
      from
        cfa_survey_questionnaire csq
      inner join mapped_depot_db md on
        csq.depot_code = md.depot_code
      where
        csq.survey_end < current_date
      group by
        csq.depot_code,
        md.area_code
      )
      select
        ls.depot_code,
        ls.area_code,
        csq.survey_start ,
        csq.survey_end ,
        json_object_agg(csr.db_code , csr.response) filter (where csr.db_code is not null and csr.response is not null) as db_response,
        coalesce (count(mdd.id), 0) as total_dbs
      from
        last_survey ls
      inner join cfa_survey_questionnaire csq on
        csq.id = ls.survey_id
      inner join mapped_depot_db mdd on
        mdd.depot_code = ls.depot_code
        and mdd.area_code = ls.area_code
      left join cfa_survey_response csr on
        csr.questionnaire_id = ls.survey_id
        and csr.db_code = mdd.id
      where
        mdd.id = any(csq.applicable_distributors) ${searchStatement}
      group by
        ls.depot_code,
        ls.area_code,
        csq.survey_start ,
        csq.survey_end,
        csq.applicable_distributors
      limit $1 offset $2;
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const response = await client.query(sqlStatement, [limit, offset]);
            return response?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> fetchSurveyReportStatistics', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchActivePlantDistributors() {
        logger.info('inside SurveyModel -> fetchActivePlantDistributors');
        const sqlStatement = `
    with last_records_ids as (
      select
        depot_code,
        max(id) last_record_id
      from
        cfa_survey_questionnaire csq
      group by
        depot_code
    )
    select
      distinct
      csq2.id,
      csq2.depot_code,
      csq2.applicable_distributors,
      case
        when current_date between csq2.survey_start::date and csq2.survey_end::date
        then true
        else false
      end active_survey
    from
      cfa_survey_questionnaire csq2
    inner join last_records_ids as lri on
      lri.last_record_id = csq2.id;
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> fetchActivePlantDistributors', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async saveSurveyLink(survey_start: string, survey_end: string, survey_link: string) {
        logger.info('inside SurveyModel -> saveSurveyLink');
        const distributors = await AdminModel.fetchDistributorsByAdminRole([], null, null, 0, 0, '', [], [], [], [], false, [], 'ACTIVE');
        if (!distributors) {
            logger.error('Error fetching distributors');
            return null;
        }
        survey_start = new Date(survey_start.toString()).toISOString();
        survey_end = new Date(survey_end.toString()).toISOString();
        const distributorIds = distributors.rows.map((distributor) => distributor.id);
        const sqlStatement = `
      INSERT INTO cfa_survey_questionnaire(
      logistic_id,
      depot_code,
      questions,
      updated_on, 
      survey_start, 
      survey_end, 
      survey_link, 
      applicable_distributors)
      VALUES ('', '', '{}', now(), $1, $2, $3,  $4)
      ON CONFLICT (id) DO NOTHING;
    `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement, [survey_start, survey_end, survey_link, distributorIds]);
            return response?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyModel -> saveSurveyLink', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async saveSurveyResponse(
        questionnaire_id: number,
        db_code: string,
        survey_start: string,
        survey_end: string,
        response: object = {},
        updated_by: string = '',
        db_cfa_details: object = {},
    ) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            logger.info('inside SurveyModel -> saveSurveyResponse');
            survey_start = new Date(survey_start.toString()).toISOString();
            survey_end = new Date(survey_end.toString()).toISOString();
            let sqlStatement = `INSERT INTO cfa_survey_response(
                            questionnaire_id, 
                            db_code, 
                            response, 
                            updated_on, 
                            updated_by, 
                            survey_start, 
                            survey_end, 
                            db_cfa_details
                          )
                          VALUES ($1, $2, $3, now(), $4, $5, $6, $7)
                          ON CONFLICT (questionnaire_id, db_code) 
                          DO UPDATE SET updated_on = now(),
                                        response = EXCLUDED.response,
                                        updated_by = EXCLUDED.updated_by,
                                        survey_start = EXCLUDED.survey_start,
                                        survey_end = EXCLUDED.survey_end,
                                        db_cfa_details = EXCLUDED.db_cfa_details`;
            const dbResponse = await client.query(sqlStatement, [
                questionnaire_id,
                db_code,
                JSON.stringify(response),
                updated_by,
                survey_start,
                survey_end,
                JSON.stringify(db_cfa_details),
            ]);
            if (!dbResponse?.rowCount) {
                return false;
            }
            return true;
        } catch (e) {
            logger.error('inside SurveyModel -> saveSurveyResponse, error: ', e);
            return false;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async saveNocResponse(distributor_id: number, agreement_status: string) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            logger.info('inside SurveyModel -> saveNocResponse');
            let sqlStatement = `INSERT INTO distributor_agreements(
                            distributor_id, 
                            agreement_status, 
                            created_at
                          )
                          VALUES ($1, $2, now())
                      ON CONFLICT (distributor_id) DO NOTHING`;
            const dbResponse = await client.query(sqlStatement, [distributor_id, agreement_status]);
            if (!dbResponse?.rowCount) {
                return false;
            }
            return true;
        } catch (e) {
            logger.error('inside SurveyModel -> saveNocResponse, error: ', e);
            return false;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async fetchDistributorAgreements(limit, offset, status, search) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> fetchDistributorAgreements');

            let totalCountQuery = `
            SELECT COUNT(*) AS total_count
            FROM distributor_agreements da
            JOIN distributor_master dm ON da.distributor_id = dm.id
            INNER JOIN user_profile up ON (dm.profile_id = up.id)
        `;

            const totalCountParams = [];
            let totalCountIndex = 1;

            if (status && status !== 'ALL') {
                totalCountQuery += ` AND agreement_status = $${totalCountIndex}`;
                totalCountParams.push(status);
                totalCountIndex++;
            }

            if (search) {
                totalCountQuery += ` AND (CAST(distributor_id AS TEXT) LIKE $${totalCountIndex} OR up.name ILIKE $${totalCountIndex} OR dm.city ILIKE $${totalCountIndex})`;
                totalCountParams.push(`%${search}%`);
                totalCountIndex++;
            }

            const totalCountResponse = await client.query(totalCountQuery, totalCountParams);
            const totalCount = parseInt(totalCountResponse.rows[0].total_count, 10);

            let paginatedDetailsQuery = `
            SELECT distributor_id, up.name AS distributor_name, dm.city, dm.tse_code, dm.area_code, agreement_status, created_at
            FROM distributor_agreements da
            JOIN distributor_master dm ON da.distributor_id = dm.id
            INNER JOIN user_profile up ON (dm.profile_id = up.id)
        `;

            const queryParams = [limit, offset];
            let queryIndex = 3;

            if (status && status !== 'ALL') {
                paginatedDetailsQuery += ` AND agreement_status = $${queryIndex}`;
                queryParams.push(status);
                queryIndex++;
            }

            if (search) {
                paginatedDetailsQuery += ` AND (CAST(distributor_id AS TEXT) LIKE $${queryIndex} OR up.name ILIKE $${queryIndex} OR dm.city ILIKE $${queryIndex})`;
                queryParams.push(`%${search}%`);
                queryIndex++;
            }

            paginatedDetailsQuery += ` ORDER BY distributor_id LIMIT $1 OFFSET $2`;

            const dbResponse = await client.query(paginatedDetailsQuery, queryParams);

            return {
                success: true,
                dbResponse: dbResponse.rows,
                dbResponseCount: totalCount,
            };
        } catch (e) {
            logger.error('inside SurveyModel -> fetchDistributorAgreements, error: ', e);
            return {
                success: false,
                dbResponse: [],
                dbResponseCount: 0,
            };
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async fetchDistributorIDs() {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> fetchDistributorAgreements');
            let sqlStatement = `SELECT distributor_id FROM distributor_agreements`;
            const dbResponse = await client.query(sqlStatement);
            if (dbResponse?.rows?.length) {
                const distributor_ids = dbResponse.rows.map((row) => row.distributor_id);
                return { success: true, distributor_ids: distributor_ids };
            } else {
                return { success: false, distributor_ids: [] };
            }
        } catch (e) {
            logger.error('inside SurveyModel -> fetchDistributorAgreements, error: ', e);
            return { success: false, distributor_ids: [] };
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async submitSurvey(db_code: string, combinedResponse: string) {
        logger.info('inside SurveyModel -> submitSurvey');
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            INSERT INTO cfa_survey_response (
                questionnaire_id,
                db_code,
                response,
                updated_on,
                updated_by,
                survey_start,
                survey_end,
                db_cfa_details
            )
            SELECT
                csq.id,
                $1,  
                $2, 
                NOW(), 
                'DISTRIBUTOR', 
                csq.survey_start,
                csq.survey_end,
                '{}' 
            FROM
                cfa_survey_questionnaire csq
                WHERE
               csq.questions = '"ACCOUNTING_SOFTWARE_SURVEY"'
              `;

            const dbResponse = await client.query(sqlStatement, [db_code, combinedResponse]);
            return dbResponse.rowCount > 0;
        } catch (error) {
            logger.error('Error in SurveyModel -> submitSurvey', error);
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    },

    async getSurveyResponses() {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            logger.info('inside SurveyModel -> getSurveyResponses');

            const sqlStatement = `
                select
                    csq.applicable_distributors,
                    csq.survey_end
                from
                    cfa_survey_questionnaire csq
                where
                    csq.questions = '"ACCOUNTING_SOFTWARE_SURVEY"'           
        `;

        const sqlResponseStatement = ` select db_code from cfa_survey_response csr where csr.questionnaire_id = (select
                csq.id
                from
                    cfa_survey_questionnaire csq
                where
                    csq.questions = '"ACCOUNTING_SOFTWARE_SURVEY"')`;

            const dbResponse = await client.query(sqlStatement);
            const dbCodesResponse = await client.query(sqlResponseStatement);

            const dbCodes = dbCodesResponse.rows.map((row) => row.db_code);
            const applicableDistributors = dbResponse.rows[0]?.applicable_distributors || [];
            const surveyEnd = dbResponse.rows[0]?.survey_end;

            return {
                success: true,
                dbResponse: dbCodes,
                applicableDistributors: applicableDistributors,
                surveyEnd: surveyEnd,
            };
        } catch (e) {
            logger.error('inside SurveyModel -> getSurveyResponses, error: ', e);
            return {
                success: false,
                dbResponse: [],
                applicableDistributors: [],
            };
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
};
