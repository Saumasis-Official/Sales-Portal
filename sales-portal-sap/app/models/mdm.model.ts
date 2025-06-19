import logger from '../lib/logger';
import _ from "lodash";
import { ErrorMessage } from '../constant/error.message';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { roles } from '../constant/persona';

const conn  = PostgresqlConnection.getInstance();
export const MdmModel = {

    async downloadMdmData(data) {
        logger.info('Inside MdmModel -> downloadMdmData');
        let { customerCode, kams, key, siteCode, depotCode, region, status, vendorCode, headerFilter, article_code, article_desc } = data;
        let client : PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `select  psku as "PSKU", psku_desc as "PSKU Description", sku as "SKU",sku_desc as "SKU Description",customer_code as "Customer Code", customer_name as "Customer Name",plant_code as "Plant Code",article_id as "Article ID",article_desc as "Article Description", site_code as "Site Code",vendor_code as "Vendor Code",division as "Division", region as "Region",
              priority as "Priority" from mdm_material_data `;
            let whereCondition = [];
            whereCondition.push(`is_deleted = False `);
            if (kams) whereCondition.push(`customer_name = '${kams}' `);
            if (key == false) {
                whereCondition.push(`
                 (article_id is null
                or article_desc is null
                or article_desc  = ''
                or article_id = '')
                and status is true `);
            }
            else {
                whereCondition.push(`
                article_id is not null
                and article_desc is not null
                and article_desc  != ''
                and article_id != ''
                and status is true `);
            }
            if (customerCode.length > 0) whereCondition.push(`customer_code in (${customerCode}) `);
            if (siteCode.length > 0) whereCondition.push(`site_code in ('${siteCode?.join("','")}') `);
            if (depotCode.length > 0) whereCondition.push(`plant_code in (${depotCode}) `);
            if (region.length > 0) whereCondition.push(`region in ('${region.join("','")}') `);
            if (vendorCode.length > 0) whereCondition.push(`vendor_code in (${vendorCode}) `);
            if (whereCondition.length > 0) {
                sqlStatement += `where ${whereCondition.join('and ')} `;
            }
            const response = await client.query(sqlStatement);
            return response;
        } catch (e) {
            logger.error('Error in fetching Mdm Data', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async getMdmData(req) {
        logger.info('Inside MdmModel -> getMdmData');
        const { user_id, roles: rolesArr } = req['user'];
        let { limit, offset, kams, customerCode, siteCode, depotCode, region, status, vendorCode, headerFilter,article_code ,article_desc } = req.body;
        let client : PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `select *, true as is_disabled from mdm_material_data `;
            let count = `Select count(id) from mdm_material_data `;
            let limitCondition = `limit ${limit} `;
            let offsetCondition = `offset ${offset} `;
            let orderCondition = `ORDER BY article_id = '' or  article_id is null DESC , article_desc = '' or article_desc is null DESC `;
            let whereCondition = [];
            let customer_names = '';
            let customerResponse
            if (rolesArr.includes(roles.KAMS) && !kams) {
                customer_names = `select customer_name as "Kams" from kams_customer_mapping where user_id = '${user_id}' `;
                customerResponse = await client.query(customer_names);
                if (customer_names) whereCondition.push(`customer_name in (${customerResponse.rows[0].Kams.map((e) => {
                    return `'${e}'`;
                })}) `);
            }
            if (kams) whereCondition.push(`customer_name = '${kams}' `);
            if (customerCode.length > 0) whereCondition.push(`customer_code in (${customerCode}) `);
            if (siteCode.length > 0) whereCondition.push(`site_code in ('${siteCode?.join("','")}') `);
            if (depotCode.length > 0) whereCondition.push(`plant_code in (${depotCode}) `);
            if (region.length > 0) whereCondition.push(`region in ('${region.join("','")}') `);
            if (status.length > 0) {
                status = status.map((item) => {
                    if (item == 'ACTIVE') return true;
                    else return false;
                })
                whereCondition.push(`status in (${status}) `);
            }
            if (article_code == 'AVAILABLE')
                whereCondition.push(`article_id != '' `);
            else if (article_code == 'MISSING')
                whereCondition.push(`article_id = '' `);

            if (article_desc == 'AVAILABLE')
                whereCondition.push(`article_desc != '' `);
            else if (article_desc == 'MISSING')
                whereCondition.push(`article_desc = '' `);

            if (vendorCode.length > 0) whereCondition.push(`vendor_code in ('${vendorCode?.join("','")}') `);
            if (headerFilter?.pskusearch) whereCondition.push(`psku::text ILIKE '%${headerFilter.pskusearch}%' `);
            if (headerFilter?.skuSearch) whereCondition.push(`sku::text ILIKE '%${headerFilter.skuSearch}%' `);
            if (headerFilter?.articleSearch) whereCondition.push(`article_id::text ILIKE '%${headerFilter.articleSearch}%' `);
            if (whereCondition.length > 0) {
                sqlStatement += `where ${whereCondition.join('and ')} `;
                sqlStatement += `and is_deleted = false `;
                count += `where ${whereCondition.join('and ')} `;
                count += `and is_deleted = false `;
            }
            sqlStatement += orderCondition;
            if (limit != 0) sqlStatement += limitCondition;
            if (offset != 0) sqlStatement += offsetCondition;
            const response = await client.query(sqlStatement);
            const countResponse = await client.query(count);
            if(_.intersection(rolesArr, [roles.MDM, roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.NKAMS]).length > 0){
                customer_names = `select distinct(customer_name) as "Customer Name" from mdm_material_data where is_deleted = false `;
                const tempCustomerResponse = await client.query(customer_names);
                customerResponse=tempCustomerResponse.rows??[]
            }
            else {
                customerResponse = customerResponse?.rows[0]?.Kams?.map((item) => {
                    return { 'Customer Name': item };
                })
            }
            if (kams) {
                let customerCode = `Select distinct customer_code as "Customer Code",site_code as "Site Code",plant_code as "Depot Code",region as
            "Region", vendor_code as "Vendor Code", status as "Status" FROM mdm_material_data  `;
                let siteCode =`select distinct site_code,customer_code from mdm_material_data where customer_name = '${kams}' and is_deleted = false `;
                customerCode += `where ${whereCondition.join('and ')} `;
                const customerCodeResponse = await client.query(customerCode);
                const siteCodeResponse = await client.query(siteCode);
                response['filter_data'] = customerCodeResponse.rows;
                response['site_code'] = siteCodeResponse.rows;
                customer_names += `where customer_name = '${kams}'`;
                customer_names+= ` and is_deleted = false `;
            }
            response['count'] = countResponse?.rows[0]?.count;
            response['customer_name'] = customerResponse;
            return response
        } catch (e) {
            logger.error('Error in fetching Mdm Data', e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async fieldLevelSave(rowData) {
        let client : PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            if (rowData?.article_id == '' || rowData?.article_desc == '' || rowData?.article_id == null || rowData?.article_desc == null ) return null;
            const sql = 'Update mdm_material_data set article_id = $1, article_desc = $2 where id = $3';
            const values = [rowData?.article_id, rowData?.article_desc, rowData?.id];
            const response = await client.query(sql, values);
            return response;
        }
        catch (err) {
            logger.error('Error in saving Mdm Data', err);
            return null;
        }
        finally {
            if (client != null) {
                client.release();
            }
        }
    },

    async validateUploadMismatch(data) {
        logger.info('inside MdmModel -> validateUploadMismatch');
        let client : PoolClient | null = null;
        /**
         * First creating a temp table from the json string
         * In the subquery finding out the mismatch records
         * Then joining the temp table with the mismatch records to get the complete uploaded data
         * Finally returning the mismatch records, column "id" is renamed to "__line__" to be used in the frontend as line number
         */
        const sqlStatement = `
        with csv_record as (
            select
                id,
                psku,
                psku_desc,
                sku,
                sku_desc,
                customer_name,
                customer_code,
                plant_code,
                site_code
            from
                json_populate_recordset(null::mdm_material_data,
                $1)
            )
            select
                csv_record.id as "__line__",
                mismatch_table.psku,
                mismatch_table.psku_desc,
                mismatch_table.sku,
                mismatch_table.sku_desc,
                mismatch_table.customer_name,
                mismatch_table.customer_code,
                mismatch_table.plant_code,
                mismatch_table.site_code
            from
                csv_record
            inner join
            (
                select
                    customer_name,
                    customer_code,
                    psku,
                    psku_desc,
                    sku,
                    sku_desc,
                    plant_code,
                    site_code
                from
                    csv_record
            except
                select
                    customer_name,
                    customer_code,
                    psku,
                    psku_desc,
                    sku,
                    sku_desc,
                    plant_code,
                    site_code
                from
                    mdm_material_data mmd
            ) mismatch_table
            on
                mismatch_table.customer_name = csv_record.customer_name
                and mismatch_table.customer_code = csv_record.customer_code
                and mismatch_table.psku = csv_record.psku
                and mismatch_table.psku_desc = csv_record.psku_desc
                and mismatch_table.sku = csv_record.sku
                and mismatch_table.sku_desc = csv_record.sku_desc
                and mismatch_table.plant_code = csv_record.plant_code
                and mismatch_table.site_code = csv_record.site_code
            order by "__line__"
        `;
           
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data)]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in MdmModel -> validateUploadMismatch: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async uploadMdmData(data, updatedBy: string) {
        logger.info('inside MdmModel -> uploadMdmData');
        let client : PoolClient | null = null;
        /**
         * In the subquery it finds out the mismatch records, and then updates the main table with the new data
         */
        const sqlStatement = `
            update
                mdm_material_data mdm
            set
                article_id = mdm1.article_id,
                article_desc = mdm1.article_desc,
                updated_by = $2,
                updated_on = now()
            from
                (
                select
                    customer_name,
                    customer_code,
                    psku,
                    psku_desc,
                    sku,
                    sku_desc,
                    plant_code,
                    site_code,
                    article_id,
                    article_desc
                from
                    json_populate_recordset(null::mdm_material_data,
                    $1)
            except
                select
                    customer_name,
                    customer_code,
                    psku,
                    psku_desc,
                    sku,
                    sku_desc,
                    plant_code,
                    site_code,
                    article_id,
                    article_desc
                from
                    mdm_material_data
                        ) as mdm1
            where
                mdm.customer_name = mdm1.customer_name
                and mdm.customer_code = mdm1.customer_code
                and mdm.psku = mdm1.psku
                and mdm.sku = mdm1.sku
                and mdm.plant_code = mdm1.plant_code
                and mdm.site_code = mdm1.site_code
                `;
        
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data), updatedBy]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in MdmModel -> uploadMdmData: ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getAllCustomers() {
        let client : PoolClient | null = null;
        logger.info('inside MdmModel -> getAllCustomers');
        const sqlStatement = `select distinct customer_name from mdm_material_data `;
      
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in MdmModel -> getAllCustomers: ', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async getMdmNotification() {
        logger.info('Inside MdmModel -> getMdmNotification');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            let sqlStatement = `select distinct customer_name as "Customer_Name" from mdm_material_data where article_id is null or article_desc is null or article_desc  = '' or article_id = ''`;
            const response = await client.query(sqlStatement);
            let emails = [];
            if (response?.rows?.length > 0) {
                for (let items of response?.rows) {
                    let kams = `select email from sales_hierarchy_details where user_id in (select user_id from kams_customer_mapping where '${items?.Customer_Name}' = ANY(customer_name))`;
                    let kams_response = await client.query(kams);
                    kams_response?.rows?.map((item) => {
                        emails.push({
                            email: item?.email ? item?.email : '',
                            customer: items?.Customer_Name ? items?.Customer_Name : ''
                        })
                    });
                }
            }
            return emails;
        } catch (e) {
            logger.error(ErrorMessage.MDM_DATA_MAIL_FAILED, e);
            return null;
        } finally {
            if (client != null) {
                client.release();
            }
        }
    },
    async createMdmData(rowData: {
        body: {
            psku: Number;
            psku_desc: string;
            sku: Number;
            sku_desc: string;
            division: string;
            article_id: string;
            article_desc: string;
            plant_code: Number;
            region: string;
            site_code: string;
            vendor_code: Number;
            customer_name: string;
            customer_code: Number;
            status: boolean;
            vendor_name: string;
            priority : Number;
            
        },
        user
    }) {
        logger.info('Inside MdmModel -> createMdmData');
        const { body,user } = rowData;
        let client : PoolClient | null = null;
        client = await conn.getWriteClient();
        try {
            let query = `insert into mt_ecom_audit_trail (type,updated_by,column_values) values('Create MDM Data' ,$1 ,$2)`;
            let response = await client.query(query,[user.user_id,body])
            query = `
            insert
                into
                mdm_material_data (
                psku,
                psku_desc,
                sku,
                sku_desc,
                division,
                article_id,
                article_desc,
                plant_code,
                site_code,
                vendor_code,
                region,
                customer_name,
                customer_code,
                priority)
                values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                on conflict (psku, sku, region, customer_name,article_id, customer_code, site_code, plant_code,vendor_code) 
                do update set is_deleted = FALSE ;`;
            response = await client.query(query,
                [
                body.psku,
                body.psku_desc,
                body.sku,
                body.sku_desc,
                body.division,
                body.article_id,
                body.article_desc,
                body.plant_code,
                body.site_code,
                body.vendor_code,
                body.region = 'INDIA',
                body.customer_name,
                body.customer_code,
                body.priority             
                ]);
            client.release();
            return response;
        }
        catch (err) {
            logger.error('CAUGHT: Error in MdmModel -> createMdmData: saving PSKU Data', err);
            client.release();
            return null;
        }
    },
    async deleteMdmData(rowData : any){
        logger.info('Inside MdmModel -> deleteMdmData');
        const { body,user } = rowData;
        let client : PoolClient | null = null;
        client = await conn.getWriteClient();
        try {
            let query = `insert into mt_ecom_audit_trail (type,updated_by,column_values) values('Delete MDM Data' ,$1 ,$2)`;
            let response = await client.query(query,[user.user_id,body])
            query = `UPDATE mdm_material_data 
                        SET is_deleted = true
                        WHERE 
                            psku = $1 and 
                            sku = $2 and 
                            region = $3 and
                            plant_code = $4 and 
                            site_code = $5 and 
                            vendor_code = $6 and 
                            customer_code = $7 and
                            customer_name = $8 and 
                            priority = $9;`;
            response = await client.query(query,
                [
                body.psku,
                body.sku,
                body.region,
                body.plant_code,
                body.site_code,
                body.vendor_code,
                body.customer_code,
                body.customer_name,
                body.priority
                ]);
            client.release();
            return response;
        }
        catch (err) {
            logger.error('CAUGHT: Error in MdmModel -> deleteMdmData: Unmap MDM Data', err);
            client?.release();
            return null;
        }

    },
    async editMdmData(rowData:any){
        logger.info('Inside MdmModel -> editMdmData');
        const { body,user } = rowData;
        let client : PoolClient | null = null;
        client = await conn.getWriteClient();
        try {
            let query = `Select * from mdm_material_data where
                            psku = $1 and 
                            sku = $2 and 
                            region = $3 and
                            plant_code = $4 and 
                            site_code = $5 and 
                            vendor_code = $6 and 
                            customer_code = $7 and
                            customer_name = $8 and
                            priority = $9`
            let original_data = await client.query(query,
                                [
                                body[1].psku,
                                body[1].sku,
                                body[1].region,
                                body[1].plant_code,
                                body[1].site_code,
                                body[1].vendor_code,
                                body[1].customer_code,
                                body[1].customer_name,
                                body[1].priority
                            ]);
            let data = {
                "original_data" :original_data.rows[0],
                "edited_data" : body[0]
            }
            query = `insert into mt_ecom_audit_trail (type,updated_by,column_values) values('Edit MDM Data' ,$1 ,$2)`;
            let response = await client.query(query,[user.user_id,data])
            query = `UPDATE mdm_material_data 
                        SET 
                            article_id = $1,
                            article_desc = $2,
                            plant_code = $3,
                            site_code = $4,
                            vendor_code = $5,
                            customer_code = $6,
                            priority = $7
                        WHERE 
                            psku = $8 and 
                            sku = $9 and 
                            region = $10 and
                            plant_code = $11 and 
                            site_code = $12 and 
                            vendor_code = $13 and 
                            customer_code = $14 and
                            customer_name = $15 and
                            priority = $16;`;
            response = await client.query(query,
                [
                body[0].article_id,
                body[0].article_desc,
                body[0].plant_code,
                body[0].site_code,
                body[0].vendor_code,
                body[0].customer_code,
                body[0].priority,
                body[1].psku,
                body[1].sku,
                body[1].region,
                body[1].plant_code,
                body[1].site_code,
                body[1].vendor_code,
                body[1].customer_code,
                body[1].customer_name,
                body[1].priority
                ]);
            client.release();
            return response;
        }
        catch (err) {
            logger.error('CAUGHT: Error in MdmModel -> editMdmData: Edit MDM Data', err);
            client.release();
            return null;
        }
    },
    async validateMdmData(data:any,rowData:any = ''){
        let client : PoolClient | null = null;
        client = await conn.getReadClient();
        try{
            let query= `Select * from mdm_material_data where
            psku = $1 and 
            region = $2 and
            plant_code = $3 and 
            site_code = $4 and 
            vendor_code = $5 and 
            customer_code = $6 and
            customer_name = $7 and
            priority = $8
            and is_deleted = false`;
            let response = await client.query(query,
                            [
                            rowData.psku ? rowData.psku : data.psku,
                            rowData.region ? rowData.region : data.region ? data.region : 'INDIA',
                            data.plant_code,
                            data.site_code,
                            data.vendor_code,
                            data.customer_code,
                            rowData.customer_name ? rowData.customer_name : data.customer_name,
                            data.priority
                        ]);
            client.release();
            return response;
        }
        catch (err) {
            logger.error('CAUGHT: Error in MdmModel -> validateMdmData', err);
            client.release();
            return null;
        }
       
    }
}