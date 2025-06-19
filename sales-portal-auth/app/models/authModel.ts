/**
 * @file auth model
 * @description defines auth model methods
 */
import { PoolClient } from 'pg';
import _ from "lodash";
import logger from '../lib/logger';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { EXPIRE_TIME } from '../constant';
import { pegasus } from '../constant/persona';
const conn = PostgresqlConnection.getInstance();
export const AuthModel = {
    async getMaintenanceStatus() {
        //need to check with logger
        let client: any = null;

        try {
            client = await conn.getReadClient();
            logger.info('inside get maintenance status model');
            const sqlStatement = `SELECT * FROM maintenance_history order by id DESC limit 1`;
            const respose = await client.query(sqlStatement);
            return respose;
        } catch (e) {
            logger.error('error in get maintenance status query', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async addNewMaintenanceStatus(
        data: any,
        user_id: any,
        userName: any,
    ) {
        logger.info('inside start maintenance model', data);
        let client: any = null;

        try {
            client = await conn.getWriteClient();
            const sqlStatement = `INSERT INTO maintenance_history (status,start_date_time,duration,remark,user_id ,user_name) VALUES ($1,$2,$3,$4,$5,$6 );`;
            const response = await client.query(sqlStatement, [
                data.status,
                new Date().toISOString(),
                data.duration,
                data.remark,
                user_id,
                userName
            ]);
            logger.info('maintenance started successfully', response);
            return response;
        } catch (e) {
            logger.error('error in maintenance start query', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async updateMaintenanceStatus(data, user_id, userName) {
        let client: any = null;
        logger.info('inside update maintenance status query', data);
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `UPDATE maintenance_history
         SET status=$1, end_date_time =$2 ,remark=$3,user_id=$4,user_name=$5
         WHERE id=$6;`;
            const respose = await client.query(sqlStatement, [
                data.status,
                new Date().toISOString(),
                data.remark,
                user_id,
                userName,
                data.id,
            ]);
            return respose;
        } catch (e) {
            logger.info('Error while updating maintenance status query', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getUserById(login_id: any) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `SELECT u.id,u.name,u.email,u.mobile,u.type,u.password,d.status FROM user_profile AS u INNER JOIN distributor_master AS d ON u.id = d.profile_id WHERE u.id='${login_id}' AND d.deleted = false`;

            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.getUserById: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async updatePassword({ hash, login_id }) {
        let client: any = null;

        try {
            client = await conn.getWriteClient();
            const updateSql = `UPDATE user_profile SET password = '${hash}' WHERE id='${login_id}' RETURNING *`;
            const { rows } = await client.query(updateSql);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.updatePassword: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getSessionLogs(data) {
        const { type = '', from, to, login_id, search } = data;
        let client: any = null;
        try {
            client = await conn.getReadClient();
            let commonSqlStatement = `SELECT * FROM session_log`;

            let sqlStatement = `${commonSqlStatement} WHERE ((login_time BETWEEN '${from}' AND '${to}')
                            OR (failed_attempt_time BETWEEN '${from}' AND '${to}') OR (logout_time BETWEEN '${from}' AND '${to}'))`;
            if (type === 'success') {
                sqlStatement = `${commonSqlStatement} WHERE ((login_time BETWEEN '${from}' AND '${to}') OR (logout_time BETWEEN '${from}' AND '${to}')) AND failed_attempts_count=0`;
            } else if (type === 'failure') {
                sqlStatement = `${commonSqlStatement} WHERE failed_attempts_count!=0 AND failed_attempt_time BETWEEN '${from}' AND '${to}'`;
            } else if (type === 'active') {
                sqlStatement = `${commonSqlStatement} sl1 WHERE ${login_id ? `login_id='${login_id}'` : ''
                    } ${login_id ? 'AND' : ''
                    } sl1.login_time IS NOT NULL AND sl1.failed_attempts_count=0 AND sl1.login_time BETWEEN '${from}' AND '${to}' AND sl1.correlation_id not in (select sl2.correlation_id from session_log sl2 where sl2.logout_time is not null and sl2.logout_time >= now() - interval '1' hour )`;
            }

            if (search) {
                sqlStatement += ` AND login_id ILIKE '%${search}%'`;
            }
            const { rows } = await client.query(sqlStatement);

            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.getLastFailedAttemptCount: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getTotalSessionLogsCount(data) {
        const { type = '', from, to, login_id, search } = data;
        let client: any = null;

        try {
            client = await conn.getReadClient();
            let commonSqlStatement = `SELECT count(id) FROM session_log`;

            let sqlStatement = `${commonSqlStatement} WHERE ((login_time BETWEEN '${from}' AND '${to}')
                            OR (failed_attempt_time BETWEEN '${from}' AND '${to}') OR (logout_time BETWEEN '${from}' AND '${to}'))`;
            if (type === 'success') {
                sqlStatement = `${commonSqlStatement} WHERE failed_attempts_count=0 AND ((login_time BETWEEN '${from}' AND '${to}') OR (logout_time BETWEEN '${from}' AND '${to}'))`;
            } else if (type === 'failure') {
                sqlStatement = `${commonSqlStatement} WHERE failed_attempts_count!=0 AND failed_attempt_time BETWEEN '${from}' AND '${to}'`;
            } else if (type === 'active') {
                sqlStatement = `${commonSqlStatement} sl1 WHERE ${login_id ? `login_id='${login_id}'` : ''
                    } ${login_id ? 'AND' : ''
                    } sl1.login_time IS NOT NULL AND sl1.failed_attempts_count=0 AND sl1.login_time BETWEEN '${from}' AND '${to}' AND sl1.correlation_id not in (select sl2.correlation_id from session_log sl2 where sl2.logout_time is not null and sl2.logout_time >= now() - interval '1' hour )`;
            }

            if (search) {
                sqlStatement += ` AND login_id ILIKE '%${search}%'`;
            }
            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.getTotalSessionLogsCount: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getLastFailedAttemptCount(login_id) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `SELECT * FROM session_log WHERE login_id='${login_id}' ORDER BY id`;

            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.getLastFailedAttemptCount: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async insertSession(data) {
        const { failedAttemptCount, login_id, UUID, role="distributor" } = data;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            let insertStatement = '';

            if (!failedAttemptCount && failedAttemptCount !== 0) {
                insertStatement = `INSERT INTO session_log (login_id,logout_time,correlation_id,user_type) 
                               VALUES ('${login_id}', CURRENT_TIMESTAMP, '${UUID}', '${role}') returning failed_attempt_time;`;
            } else {
                if (failedAttemptCount === 0) {
                    insertStatement = `INSERT INTO session_log (login_id,login_time,failed_attempts_count,correlation_id,user_type) 
                                   VALUES ('${login_id}', CURRENT_TIMESTAMP, ${failedAttemptCount}, '${UUID}', '${role}');`;
                } else {
                    insertStatement = `INSERT INTO session_log (login_id,failed_attempts_count,failed_attempt_time,correlation_id) 
                                   VALUES ('${login_id}', ${failedAttemptCount}, CURRENT_TIMESTAMP, '${UUID}')  returning failed_attempt_time;`;
                }
            }
            const insertResponse = await client.query(insertStatement);
            return insertResponse;
        } catch (error) {
            logger.error(
                `error in authModel.insertSession: `, error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getSSOUserDetail(emailId) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `SELECT *, roles::_varchar FROM sales_hierarchy_details WHERE LOWER(email) = LOWER('${emailId}') AND deleted=false AND status='ACTIVE'`;

            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.getSSOUserDetail: `,
                error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async fetchAppLevelSettings(roles?: string[] | undefined) {
        logger.info(`inside authModel.fetchAppLevelSettings`);
        let client: any = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = '';
            if (roles && _.intersection(roles, pegasus.ADMIN).length) {
                sqlStatement = `SELECT a.key,a.value,a.updated_by,a.remarks,a.allowed_values,a.field_type,a.description,s.first_name,s.last_name,s.user_id FROM app_level_settings AS a LEFT JOIN sales_hierarchy_details AS s ON a.updated_by = s.user_id ORDER BY a.key ASC`;
            } else {
                sqlStatement = `SELECT key, value FROM app_level_settings`;
            }
            const { rows } = await client.query(sqlStatement);
            return rows ? rows : [];
        } catch (error) {
            logger.error(
                `error in authModel.fetchAppLevelSettings: `,
                error,
            );
            return [];
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async getRetryOTPCount(distributorId: string, type: string) {
        logger.info(`inside AuthModel -> getRetryOTPCount: DB: ${distributorId}`);
        let client: PoolClient | null = null;
        const retryOtpSqlStatement = `
                SELECT retry_count, retry_time FROM otp 
                WHERE distributor_id = $1 AND type = $2`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(retryOtpSqlStatement, [distributorId, type]);
            return result;
        } catch (error) {
            logger.error(`CAUGHT: Error in AuthModel -> getRetryOTPCount: DB: ${distributorId}`, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateOTPRetry(distributorId: string, type: string) {
        logger.info(`inside AuthModel -> updateOTPRetry: BD: ${distributorId}`);
        let client: PoolClient | null = null;
        const updateOtpRetrySqlStatement = `
                            UPDATE otp set retry_count = 0, retry_time = CURRENT_TIMESTAMP 
                            WHERE distributor_id = $1 AND type = $2`;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(updateOtpRetrySqlStatement, [distributorId, type]);
            return result;
        } catch (error) {
            logger.error(`CAUGHT: Error in AuthModel -> updateOTPRetry: DB: ${distributorId}`, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getInvalidCount(distributorId: string, type: string) {
        logger.info("inside AuthModel -> getInvalidCount");
        let client: PoolClient | null = null;
        const retryOtpSqlStatement = `
                SELECT invalid_count, invalid_time FROM otp 
                WHERE distributor_id = $1 AND type = $2`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(retryOtpSqlStatement, [distributorId, type]);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getInvalidCount: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async resetInvalidOTPCount(id: string) {
        logger.info("inside AuthModel -> resetInvalidOTPCount");
        let client: PoolClient | null = null;
        const invalidOtpCounterSqlStatement = `
                UPDATE otp SET invalid_count = 0
                WHERE distributor_id = '${id}' AND type = 'RESET_PASS'`;
        try {
            client = await conn.getWriteClient();
            await client.query(invalidOtpCounterSqlStatement);
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> resetInvalidOTPCount: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateInvalidOTPCount(id: string) {
        logger.info("inside AuthModel -> updateInvalidOTPCount");
        let client: PoolClient | null = null;
        const invalidOtpCounterSqlStatement = `
                UPDATE otp SET invalid_count = invalid_count + 1,
                invalid_time =   
                CASE  
                    WHEN invalid_count = 0 THEN CURRENT_TIMESTAMP 
                    ELSE invalid_time
                END 
                WHERE distributor_id = '${id}' AND type = 'RESET_PASS'`;
        try {
            client = await conn.getWriteClient();
            await client.query(invalidOtpCounterSqlStatement);
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> updateInvalidOTPCount: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async expireOTP(id: string) {
        logger.info("inside AuthModel -> expireOTP"+ id);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const expireOtpSqlStatement = `
            UPDATE otp 
            SET expires_at = CURRENT_TIMESTAMP
            WHERE distributor_id = '${id}' AND expires_at >= NOW() AND type = 'RESET_PASS'`;
            await client.query(expireOtpSqlStatement);
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> expireOTP: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async sendAndSaveOTP(login_id: string, mobile: any, otp: string, referenceCode: string) {
        logger.info("inside AuthModel -> sendAndSaveOTP");
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    INSERT INTO 
                        otp (distributor_id, mobile_number, otp_code, refrence_code, expires_at, type, retry_count, retry_time) 
                    VALUES 
                        ('${login_id}', ${mobile}, ${otp}, '${referenceCode}', CURRENT_TIMESTAMP + (interval '3 minute'), 'RESET_PASS', 1, CURRENT_TIMESTAMP) 
                    ON CONFLICT ON CONSTRAINT unique_otp DO UPDATE SET
                        mobile_number = EXCLUDED.mobile_number, otp_code = EXCLUDED.otp_code, retry_count = otp.retry_count + 1, refrence_code = EXCLUDED.refrence_code, expires_at = EXCLUDED.expires_at
                    RETURNING *`;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> sendAndSaveOTP: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getOTPId(distributorId: string, otp: number) {
        logger.info("inside AuthModel -> getOTPId");
        let client: PoolClient | null = null;
        const sqlStatement = `SELECT id FROM otp WHERE distributor_id='${distributorId}' AND otp_code=${otp} AND expires_at >= NOW() ORDER BY created_on DESC LIMIT 1`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getOTPId: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getUserProfileById(distributorId: string) {
        logger.info("inside AuthModel -> getUserProfileById");
        let client: PoolClient | null = null;
        const sqlStatement = `SELECT * FROM user_profile INNER JOIN distributor_master ON user_profile.id = distributor_master.profile_id WHERE user_profile.id='${distributorId}' AND distributor_master.deleted = false`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getUserProfileById: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getUserProfileDetails(id: string) {
        logger.info("inside AuthModel -> getUserProfileDetails" + id);
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT 
            tbl1.id,tbl1.name,tbl1.email,tbl1.mobile,tbl2.city,tbl2.postal_code,tbl2.region_id,tbl2.group_id,tbl2.tse_code,tbl2.market 
            FROM 
            user_profile tbl1 
            INNER JOIN 
            distributor_master tbl2 
            ON 
            tbl2.profile_id = tbl1.id 
            WHERE 
            tbl1.id='${id}' AND tbl2.deleted = false
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getUserProfileDetails: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async setPassword(hash: string, login_id: string) {
        logger.info("inside AuthModel -> setPassword");
        let client: PoolClient | null = null;
        const updateSql = `UPDATE user_profile SET password = '${hash}' WHERE id='${login_id}' RETURNING *`;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(updateSql);
            return result;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> setPassword: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getActiveSessionReport(to: string, from: string ) {
        logger.info("inside AuthModel -> getActiveSessionReport");
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH hours AS (
            SELECT generate_series(
                (SELECT date_trunc('hour', MIN(login_time)) FROM session_log WHERE login_time IS NOT NULL),
                (SELECT date_trunc('hour', MAX(login_time)) FROM session_log WHERE login_time IS NOT NULL),
                '1 hour'::interval
            ) AS date_time
        ),
        counts AS (
            SELECT
                date_trunc('hour', login_time) AS date_time,
                COUNT(*) AS active_sessions
            FROM
                session_log
            WHERE
                failed_attempts_count = 0
                AND login_time IS NOT NULL
            GROUP BY
                date_trunc('hour', login_time)
        )
        SELECT
            TO_CHAR((hours.date_time AT TIME ZONE 'Asia/Kolkata'), 'MM/DD/YYYY, HH12:MI:SS AM') as date_time,
            COALESCE(counts.active_sessions, 0) AS "Login Session"
        FROM
            hours
        LEFT JOIN
            counts ON hours.date_time = counts.date_time
        WHERE
            hours.date_time BETWEEN $1 AND $2
        ORDER BY
            hours.date_time;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [to, from ]);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT: Error in AuthModel -> getActiveSessionReport: ", error);
            return null;
        }
        finally {
            client?.release();
        }
    },
    async getInvalidateSessionStatus(loginId:string,uuid:string){
        logger.info("inside AuthModel -> getInvalidateSessionStatus");
        let client: PoolClient | null = null;
        let sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`
        try{
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement,[loginId,uuid])
            return result?.rows;
        }   
        catch(error){
            logger.error("CAUGHT: Error in AuthModel -> getInvalidateSessionStatus: ", error);
            return null;
        }
        finally {
            client?.release();
        }
    },

    async invalidateOtherSessions(to_date:string,from_date:string,session_id:string,login_id:string){
        logger.info("inside AuthModel -> invalidateOtherSessions, to_date: "+ to_date + " ,from_date: " + from_date + " ,session_id: " + session_id);
        let client: PoolClient | null = null;
        try{
            client = await conn.getWriteClient();
            const sqlStatement = `
                    WITH sctive_sessions AS(
                        SELECT * 
                        FROM session_log sl1 
                        WHERE login_id= $1 
                            AND sl1.login_time IS NOT NULL 
                            AND sl1.failed_attempts_count=0 
                            AND sl1.login_time BETWEEN $2 AND $3
                            AND sl1.correlation_id not in (select sl2.correlation_id from session_log sl2 where sl2.logout_time is not null and sl2.logout_time >= now() - interval '1' hour )
                            AND sl1.correlation_id != $4
                    )
                    INSERT INTO session_log (login_id,logout_time,correlation_id,user_type) 
                        SELECT acs.login_id , CURRENT_TIMESTAMP AS logout_time , acs.correlation_id, acs.user_type
                        FROM sctive_sessions acs
                    RETURNING correlation_id;
            `;
            const result = await client.query(sqlStatement,[login_id,from_date,to_date,session_id]);
            logger.info("invalidateOtherSessions result: "+ result?.rows.toString());
            return result?.rowCount;
        }catch(error){
            logger.error("CAUGHT: Error in AuthModel -> invalidateOtherSessions: ", error);
            return null;
        }finally{
            client?.release();
        }
    },
};