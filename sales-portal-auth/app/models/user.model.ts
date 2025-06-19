/**
 * @file user.model
 * @description defines user model methods
*/
// import pool from '../lib/postgresql';
import logger from '../lib/logger';
import commonHelper from '../helper';
import { UserService } from '../service/user.service';

import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();


export const UserModel = {


    /**
    * returns updated data
    * @param cloumn_name -name of the cloumn
    * @param update_value - want to update value
    * @param user_id - where condition
    */
    async updateAlert(cloumn_name: any, update_value: any, user_id: any) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
        UPDATE 
        notification_preferences 
        SET ${cloumn_name} = ${update_value} 
        WHERE 
        user_profile_id='${user_id}' `;
            const { rows } = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(
                `error in authModel.updateAlert: `,
                error,
            );
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    /**
    * returns data
    * @param user_id - where condition
    */
    async getAlert(user_id: any) {
        let client: any = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                Select * FROM  
                notification_preferences 
                WHERE 
                user_profile_id='${user_id}' `;
            const { rows } = await client.query(sqlStatement);
            return rows
        } catch (error) {
            logger.error(`error in UserModel.getAlert: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    /**
    * Select value from user profile table and insert into notifictaion prefrences
    */
    async insertIntoNotificationTable() {
        let readClient: PoolClient | null = null;
        let writeClient: PoolClient | null = null;
        try {
            readClient = await conn.getReadClient();
            writeClient = await conn.getWriteClient();
            const sqlStatement = `
        Select id FROM  
        user_profile WHERE id NOT IN( SELECT user_profile_id from notification_preferences)`;
            const { rows } = await readClient.query(sqlStatement);

            let loginId: any = [];
            for (let data of rows) {
                let profileRow = {
                    user_profile_id: data.id
                };

                loginId.push(profileRow);
            }
            let loginIdArray: any = [];
            loginIdArray = JSON.stringify(loginId);
            const insertProfilesStatement = "INSERT INTO notification_preferences(user_profile_id) SELECT user_profile_id FROM json_populate_recordset (NULL::notification_preferences, '" + loginIdArray + "')";
            const insertProfilesResponse = await writeClient.query(insertProfilesStatement);
            return true;
        } catch (error) {
            logger.error(`error in UserModel.insertIntoNotificationTable: `, error);
            return null;
        } finally {
            readClient?.release();
            writeClient?.release();
        }

    },
    /**
    * returns data
    * @param user_id - where condition
    */
    async insertEmailMobileOtp(value) {
        let {
            distributor_id,
            mobile_number,
            otp_code,
            email
        } = value;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            let insertOtp;
            if (!mobile_number) {
                insertOtp = `INSERT INTO otp (distributor_id,otp_code,mobile_number,email,type) VALUES ('${distributor_id}', ${otp_code}, NULL, '${email}', 'UPDATE_EMAIL') ON CONFLICT ON CONSTRAINT unique_otp DO UPDATE SET otp_code = EXCLUDED.otp_code, mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email`;
            } else {
                insertOtp = `INSERT INTO otp (distributor_id,otp_code,mobile_number,email,type) VALUES ('${distributor_id}', ${otp_code}, ${mobile_number}, NULL, 'UPDATE_MOBILE') ON CONFLICT ON CONSTRAINT unique_otp DO UPDATE SET otp_code = EXCLUDED.otp_code, mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email`;

            }
            const insertOtpResponse = await client.query(insertOtp);
            return insertOtpResponse;
        } catch (error) {
            logger.error(`error in UserModel.insertEmailMobileOtp: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }

    },

    /**
   * returns data
   * @param moobile - where condition
   */
    // removed duplicate check for SOPE-58
    // async mobileNumberexistOrNot(mobile: string) {

    //     const client = await pool.connect();
    //     try {
    //         const sqlStatement = `
    //             SELECT mobile  
    //             FROM user_profile 
    //             WHERE 
    //             mobile='${mobile}' `;
    //         const rows = await client.query(sqlStatement);
    //         client.release();
    //         return rows
    //     } catch (error) {
    //         logger.error('error in userModel.mobileNumberexistOrNot', error);
    //         client.release();
    //         return null;
    //     }

    // },

    /**
     * returns data
     * @param moobile - where condition
    */
    async emailidexistOrNot(email: string) {
        let client: any = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT email  
                FROM user_profile 
                WHERE 
                email='${email}' `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error('error in userModel.emailidexistOrNot', error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }

    },

    /**
    * returns data
    * @param otp - where condition
    * @param login_id - where condition
   */
    async checkOtpExistOrNot(otp: string, login_id: string) {

        let client: any = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT *  
                FROM otp 
                WHERE distributor_id = '${login_id}' 
                AND type = 'UPDATE_MOBILE' 
                AND mobile_number IS NOT NULL 
                ORDER BY id DESC`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in userModel.checkOtpExistOrNot: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    /**
   * returns updated data
   * @param cloumn_name -name of the cloumn
   * @param update_value - want to update value
   * @param user_id - where condition
   */
    async updateMobileEmail(cloumn_name: string, update_value: any, user_id: string) {
        let client: any = null;

        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                UPDATE 
                user_profile 
                SET ${cloumn_name} = ${update_value} 
                WHERE 
                id='${user_id}'`;
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error(`error in UserModel.updateMobileEmail: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },

    /**
   * returns data
   * @param login_id - where condition
  */
    async userIdExistOrNotOtpTable(login_id: string) {
        let client: any = null;

        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT *  
                FROM otp 
                WHERE distributor_id = '${login_id}' 
                AND type = 'UPDATE_EMAIL' 
                AND email IS NOT NULL 
                ORDER BY id DESC `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in userModel.userIdExistOrNotOtpTable: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async updateEmail(update_value: string, user_id: string) {
        let client: any = null;

        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                UPDATE 
                user_profile 
                SET email = '${update_value}' 
                WHERE 
                id='${user_id}' `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in UserModel.updateEmail: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async insertNotificationPrefrenceTable(user_id: any) {
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
        INSERT INTO 
        notification_preferences 
        (user_profile_id) VALUES ('${user_id}')`;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in UserModel.insertNotificationPrefrenceTable: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getDistributorListByTseCode(tseCode: string, limit: number, offset: number) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
        SELECT up.id,up.name,up.email,dm.city,dm.postal_code,rm.description,np.po_so_sms,
        CASE WHEN np.po_so_sms IS NULL THEN false
            ELSE true
            END AS po_so_sms,
        CASE WHEN np.po_so_email IS NULL THEN false
            ELSE true
            END AS po_so_email,
        CASE WHEN np.invoice_details_sync_sms IS NULL THEN false
            ELSE true
            END AS invoice_details_sync_sms,
        CASE WHEN np.invoice_details_sync_email IS NULL THEN false
            ELSE true
            END AS invoice_details_sync_email,
        CASE WHEN np.sms_tse_asm IS TRUE THEN true
            ELSE false
            END AS sms_tse_asm,
        CASE WHEN np.email_tse_asm IS TRUE THEN true
            ELSE false
            END AS email_tse_asm,
        CASE WHEN dm.status = 'ACTIVE' THEN true
            ELSE false
            END AS status
        
         from user_profile up LEFT JOIN distributor_master dm ON up.id = dm.profile_id LEFT JOIN region_master rm ON dm.region_id = rm.id LEFT JOIN notification_preferences np ON np.user_profile_id = up.id 
           LIMIT ${limit} OFFSET ${offset} `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in UserModel.getDistributorListByTseCode: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getDistributorListByTseCodeCount(tseCode: string) {
        let client: any = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
        SELECT COUNT(up.id)
         from user_profile up LEFT JOIN distributor_master dm ON up.id = dm.profile_id LEFT JOIN region_master rm ON dm.region_id = rm.id LEFT JOIN notification_preferences np ON np.user_profile_id = up.id 
         WHERE rm.status = 'ACTIVE' `;
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in UserModel.getDistributorListByTseCodeCount: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getTseAsmAdminDetails(userId: string) {
        const client = await conn.getReadClient();
        try {
            const sqlStatement = `
            SELECT 
                u.id,u.name,u.mobile,u.email,d.tse_code,d.market,r.description AS region
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
            WHERE 
                u.id='${userId}' AND d.deleted = false`;

            let { rows } = await client.query(sqlStatement);
            const resultSet = rows[0];
            const tseCode = resultSet?.tse_code || null;
            delete resultSet.tse_code;

            if (tseCode) {
                const salesHierarchyDetails = await UserService.fetchSalesHierarchyDetails(tseCode);
                resultSet['tse'] = salesHierarchyDetails['TSE'];
                resultSet['tse']?.forEach((tse: any) => {
                    Object.assign(tse, {
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : ''
                    })
                });
                resultSet['asm'] = salesHierarchyDetails['ASM'];
                resultSet['asm']?.forEach((asm: any) => {
                    Object.assign(asm, {
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : ''
                    })
                });
            } else {
                resultSet['tse'] = null;
            }
            return resultSet;
        } catch (error) {
            logger.error(`error in UserModel.getTseAsmAdminDetails: `, error);
            return null;
        } finally {
            client?.release();
        }
    },
    async getAlertCommentList(distributorId: string, userType: string, alert_setting_changes_type: string) {
        logger.info(`inside model UserModel.getAlertCommentList`);
        let client: any = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `
            SELECT ah.id,ah.alert_setting_changes,ah.remarks ,ah.created_on, case when sh.user_id is not null then concat(sh.first_name,' ',sh.last_name) else up.name end as name, case when sh.user_id is not null then sh.email else up.email end as email, case when sh.user_id is not null then sh.user_id else up.id end as user_id
            FROM alert_history ah
            LEFT JOIN sales_hierarchy_details sh
            ON sh.user_id = ah.changed_by
            LEFT JOIN user_profile up
            ON up.id = ah.changed_by
            WHERE ah.distributor_id = '${distributorId}' AND ah.remarks != 'PORTAL_MANAGED'`;
            if (userType == 'distributor') {
                sqlStatement += ` 
                AND (ah.alert_setting_changes->'${alert_setting_changes_type}') is not null
                ORDER BY ah.id DESC LIMIT 1`;
            }
            else if (userType == 'admin') {
                sqlStatement += ` ORDER BY ah.id DESC LIMIT 5`;
            }
            const rows = await client.query(sqlStatement);
            return rows;
        } catch (error) {
            logger.error(`error in UserModel.getAlertCommentList: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }

    },

    async getDbMoqDetails(distributorId: string) {
        logger.info(`inside model UserModel-> getDbMoqDetails`);
        let client: any = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `WITH cfa AS (SELECT DISTINCT ON (depot_code) depot_code, location FROM cfa_depot_mapping)
                                SELECT dp.distribution_channel || '^' || pm.name || '^' || pm.description || '^' || COALESCE(cfa.location,'-') || '^' || mdm.moq || '^' || string_agg(dp.division || '',',') AS plant_moq
                                FROM distributor_plants dp
                                LEFT JOIN plant_master pm ON (dp.plant_id = pm.id)
                                LEFT JOIN moq_db_mapping mdm ON (dp.distributor_id = mdm.db_id AND dp.plant_id = mdm.plant_id)
                                LEFT JOIN cfa cfa ON (pm.name = cfa.depot_code)
                                WHERE dp.distribution_channel IS NOT NULL 
                                    AND dp.division IS NOT NULL
                                    AND dp.distributor_id = '${distributorId}'
                                GROUP BY dp.distribution_channel, pm.name, pm.description, cfa.location, mdm.moq
                                ORDER BY dp.distribution_channel, pm.name`;
            const response = await client.query(sqlStatement);
            if (response && response.rows)
                return response.rows;
            else return null;
        } catch (error) {
            logger.error(`inside UserModel-> getDbMoqDetails, Error: `, error);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }

    },

    async fetchSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchSalesHierarchyDetails');
        let client;
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = commonHelper.tseUpperHierarchyQueryByCode(tseCode);
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0)
                return rows;
            logger.error('Error in UserModel -> fetchSalesHierarchyDetails: Result is null');
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client)
                client.release();
        }
    },

    async fetchASMSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchASMSalesHierarchyDetails');
        let client;
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = `SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id ,roles FROM sales_hierarchy_details WHERE STRING_TO_ARRAY(code, ',') && ARRAY['${tseCode.slice(0, 4)}'] AND deleted = false`;
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0)
                return rows;
            logger.error(`Error in UserModel -> fetchASMSalesHierarchyDetails: Result is null for tseCode: ${tseCode}`);
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchASMSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client)
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
            const dbDetails = (await client.query(sqlStatement,[distributorId])).rows[0] || {};
            if(Object.keys(dbDetails).length === 0){
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
            if(tseDetails.length == 0){
                tseDetails.push({"code": dbDetails.tse_code});
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
            if(asmDetails.length == 0){
                asmDetails.push({"code": dbDetails.area_code});
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
            const rsmDetails = (await client.query(rsmQuery,[dbDetails.rsm_code])).rows;
            if(rsmDetails.length == 0){
                rsmDetails.push({"code": dbDetails.rsm_code});
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
            const clusterDetails = (await client.query(clusterQuery,[dbDetails.cluster_code])).rows;
            if(clusterDetails.length == 0){
                clusterDetails.push({"code": dbDetails.cluster_code});
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
            const salesDetails = (await client.query(salesQuery,[distributorId])).rows;
            dbDetails['distributor_sales_details'] = salesDetails;
            
            return dbDetails;
        } catch (error) {
            logger.error('inside UserModel -> fetchDistributorDetails, Error: ', error);
            return null;
        } finally {
            if (client)
                client.release();
        }
    },
}

