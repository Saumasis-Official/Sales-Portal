import pool from '../lib/postgresql';
import logger from '../lib/logger';
import commonHelper from '../helper'
import commonHelperModel from '../models/helper.model';
import { UserService } from '../service/user.service';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';

const conn  = PostgresqlConnection.getInstance();
export const UserModel = {

    async getAlert(user_id: any) {
        let client: PoolClient | null = null;

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
        }
        finally {
            client?.release();
        }
    },

    async getTseAsmAdminDetails(userId: string) {
        let client: PoolClient | null = null;
        client = await conn.getReadClient();

        try {
            const sqlStatement = `
            SELECT 
                u.id,u.name,u.mobile,u.email,d.tse_code,d.pdp_day,d.market,r.description AS region
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
            const tseCode = resultSet.tse_code ? resultSet.tse_code : null;
            delete resultSet.tse_code;

            if (tseCode) {
                const salesHierarchyDetails = await UserService.fetchSalesHierarchyDetails(tseCode);
                resultSet['tse'] = salesHierarchyDetails['TSE'];
                resultSet['tse']?.forEach(tse => {
                    Object.assign(tse, {
                        distributor_id: userId,
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : ''
                    })
                });
                resultSet['asm'] = salesHierarchyDetails['ASM'];
                resultSet['asm']?.forEach(asm => {
                    Object.assign(asm, {
                        distributor_id: userId,
                        user_mobile_number: resultSet.mobile ? resultSet.mobile : '',
                        user_email: resultSet.email ? resultSet.email : ''
                    })
                });
            } else {
                resultSet['tse'] = null;
            }
          
            return resultSet
        } catch (error) {
           
            throw error;
        }
        finally {
            client?.release();
        }
    },

    async updateEmail(update_value: string, user_id: string) {
        let client: PoolClient | null = null;   
       
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
        }
        finally {
            client?.release();
        }
    },

    async updateMobileEmail(cloumn_name: string, update_value: any, user_id: string) {
       let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
                UPDATE 
                user_profile 
                SET ${cloumn_name} = '${update_value}' 
                WHERE 
                id='${user_id}'`;
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error(`error in UserModel.updateMobileEmail: `, error);
           
            return null;
        }
        finally {
            client?.release();
        }
    },

    async emailidexistOrNot(email: string) {
        let client: PoolClient | null = null;
      
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT email  
                FROM user_profile 
                WHERE 
                email='${email}' `;
            const rows = await client.query(sqlStatement);
           
            return rows
        } catch (error) {
            logger.error('error in userModel.emailidexistOrNot', error);
           
            return null;
        }
        finally {
            client?.release();
        }

    },

    async insertEmailMobileOtp(value) {
   let client: PoolClient | null = null;

   try {
    let {
        distributor_id,
        mobile_number,
        otp_code,
        email
    } = value
    client = await conn.getWriteClient();
    let insertOtp
    if (!mobile_number) {
        insertOtp = `INSERT INTO otp (distributor_id,otp_code,mobile_number,email,type) VALUES ('${distributor_id}', ${otp_code}, NULL, '${email}', 'UPDATE_EMAIL') ON CONFLICT ON CONSTRAINT unique_otp DO UPDATE SET otp_code = EXCLUDED.otp_code, mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email`;
    } else {
        insertOtp = `INSERT INTO otp (distributor_id,otp_code,mobile_number,email,type) VALUES ('${distributor_id}', ${otp_code}, ${mobile_number}, NULL, 'UPDATE_MOBILE') ON CONFLICT ON CONSTRAINT unique_otp DO UPDATE SET otp_code = EXCLUDED.otp_code, mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email`;

    }
    const insertOtpResponse = await client.query(insertOtp);
   
    return insertOtpResponse;
   } catch (error) {
    throw error
   }
   finally {
   client?.release();
   }

    },

    async checkOtpExistOrNot(otp: string, login_id: string) {
        let client: PoolClient | null = null;
        
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
        }
        finally {
            client?.release();
        }
    },

    async userIdExistOrNotOtpTable(login_id: string) {
        let client : PoolClient | null = null;
        
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
        }
        finally {
            client?.release();
        }
    },

    async fetchSalesHierarchyDetails(tseCode: string) {
        let client : PoolClient | null = null;
        logger.info('inside UserModel -> fetchSalesHierarchyDetails');
       
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = commonHelperModel.tseUpperHierarchyQueryByCode(tseCode);
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0)
                return rows;
            logger.error(`Error in UserModel -> fetchSalesHierarchyDetails: ${tseCode} Result is null`);
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client)
                client?.release();
        }
    },

    async fetchASMSalesHierarchyDetails(tseCode: string) {
        logger.info('inside UserModel -> fetchASMSalesHierarchyDetails');
       let client : PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const fetchSalesHierarchyDetailsStatement = `SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id ,roles::_varchar FROM sales_hierarchy_details WHERE STRING_TO_ARRAY(code, ',') && ARRAY['${tseCode?.slice(0, 4)}'] AND deleted = false`;
            const { rows } = await client.query(fetchSalesHierarchyDetailsStatement);
            if (rows?.length > 0)
                return rows;
            logger.error('Error in UserModel -> fetchASMSalesHierarchyDetails: Result is null');
            return null;
        } catch (error) {
            logger.error('Caught Error in UserModel -> fetchASMSalesHierarchyDetails', error);
            throw error;
        } finally {
            if (client)
                client?.release();
        }
    },

    async fetchReservedCredit(dbCode: string) {
        logger.info('inside UserModel -> fetchReservedCredit');
        let client: PoolClient | null = null;
        const sqlStatement = `
        select
            rc.reserved_amount
        from
            reserve_credit rc
        where
            db_code = $1
        order by
            rc.id desc
        limit 1;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [dbCode]);
            return result?.rows[0]?.reserved_amount ?? 0;
        } catch (error) {
            logger.error("CAUGHT: Error in UserModel -> fetchReservedCredit", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertReservedCredit(dbCode: string, reserveAmount: number, createdBy: string) {
        logger.info('inside UserModel -> insertReservedCredit');
        let client: PoolClient | null = null;
        const sqlStatement = `
        insert into reserve_credit (db_code, reserved_amount, created_by) values ($1, $2, $3);
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [dbCode, reserveAmount, createdBy]);
            return result?.rowCount ?? 0;
        } catch (error) {
            logger.error("CAUGHT: Error in UserModel -> insertReservedCredit", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDistributorDetails(dbCode: string) {
        logger.info("inside UserModel -> fetchDistributorDetails");
        let client: PoolClient | null = null;
        const sqlStatement = `
        select
            dm.id,
            up."name" ,
            up.email,
            dm.tse_code
        from
            distributor_master dm
        inner join user_profile up on
            up.id = dm.profile_id
        where
            dm.id = $1
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [dbCode]);
            return result.rowCount > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error("CAUGHT: Error in UserModel -> fetchDistributorDetails", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getInvalidateSessionStatus(loginId:string,uuid:string){
        logger.info("inside UserModel -> getInvalidateSessionStatus");
        let client: PoolClient | null = null;
        let sqlStatement = `select count(*) from session_log sl where sl.login_id = $1 and sl.logout_time is not null and sl.correlation_id =$2 ;`
        try{
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement,[loginId,uuid])
            return result?.rows;
        }   
        catch(error){
            logger.error("CAUGHT: Error in SapModel -> getInvalidateSessionStatus: ", error);
            return null;
        }
        finally {
            client?.release();
        }
    },

    async getPromiseTimeFlag(distributor_id:string) {
        logger.info("inside UserModel -> getPromiseTimeFlag");
        let client: PoolClient | null = null;
        let sqlStatement= `SELECT EXISTS (
            SELECT 1
            FROM promise_credit
            WHERE distributor_id = $1
            AND input_type = 'Second consent for promise credit'
            AND DATE(created_on) = CURRENT_DATE
        ) AS consent_exists_today;`;
      
        try{
            client =await conn.getReadClient();
            const result = await client.query(sqlStatement,[distributor_id])
            return result?.rows;
        }
        catch(error){
            logger.error("CAUGHT: Error in SapModel -> getPromiseFlag: ", error);
            return false;
        }
        finally {
            client?.release();
        }

    },

    async fetchDistributorProfile(distributorId: string) {
        logger.info('inside UserModel -> fetchDistributorProfile');
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
                        ,dm.noc_enable
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
                logger.error('inside UserModel -> fetchDistributorProfile, Error: Distributor not found');
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
            logger.error('inside UserModel -> fetchDistributorProfile, Error: ', error);
            return null;
        } finally {
            if (client)
                client.release();
        }
    }, 



}