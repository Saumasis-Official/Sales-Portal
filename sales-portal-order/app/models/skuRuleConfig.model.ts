import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import { INCLUSION_CUSTOMER_GROUPS, INCLUSION_DISTRIBUTION_CHANNEL } from '../constants';

export const SkuRuleConfigurationsModel = {
    async getCustomerGroups() {
        logger.info("inside SkuRuleConfigurationsModel -> getCustomerGroups");
        
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    select
                        id,
                        name,
                        description
                    from
                        customer_group_master cgm
                    where
                        status = 'ACTIVE'
                        and name in ${INCLUSION_CUSTOMER_GROUPS}
                        and (
                            name is not null
                            and name != ''
                            and name != ' ')
                    order by
                        name;
                        `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getCustomerGroups: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async getSKUCodes(nonForecasted: boolean, distChannels: string[] = []) {
        logger.info("inside SkuRuleConfigurationsModel -> getSKUCode");
        const channels:number[] = [];
        if (distChannels.includes('GT'))
            channels.push(...[10, 40])
        if (distChannels.includes('NOURISHCO'))
            channels.push(90);
        const nonForecastedCondition = nonForecasted ? '' : ` AND mm.status = 'ACTIVE' AND mm.deleted = false`;
        const distChannelsCondition = distChannels.length ? ` AND msd.distribution_channel IN (${channels.join(",")})` : '';
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                        SELECT DISTINCT 
                            code,
                            description,
                            appl_area_channel
                            ,array_agg(DISTINCT msd.distribution_channel) AS dist_channels
                        FROM material_master mm
                        INNER JOIN material_sales_details msd ON (mm.code = msd.material_code)
                        WHERE mm.description IS NOT NULL ${nonForecastedCondition} ${distChannelsCondition}
                        GROUP BY code, description, appl_area_channel;
                    `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getSKUCode: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async getSKUDetails(sku: string, nonForecasted: boolean) {
        logger.info("inside SkuRuleConfigurationsModel -> getSKUDetails");
        const whereCondition = nonForecasted ? '' : `AND mm.status = 'ACTIVE' and mm.deleted = false;`
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                        select
                            code,
                            description,
                            appl_area_channel,
                            coalesce(brand_desc,'') as brand_name,
                            coalesce(brand_variant_desc,'') as brand_variant,
                            msd.dist_channels
                        from
                            material_master mm
                        INNER JOIN (
                            SELECT material_code, array_agg(distribution_channel) AS dist_channels
                            FROM material_sales_details
                            WHERE material_code = $1
                            GROUP BY 1
                        )AS msd ON (msd.material_code = mm.code)
                        where
                            code = $1
                            ${whereCondition}
                        `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [sku]);
            return result.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getSKUDetails: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async upsertSkuRuleConfigurations(
        data: {
            area_code: string,
            sku_code: string,
            deleted: boolean | null,
            cg_db: {
                [key: string]: {
                    [key: string]: any
                }
            },
            dist_channels: number[],
        }[],
        updatedBy: string,
    ) {
        /**
         * there is a trigger(on insert or update) on sku_rule_configurations table which will update the audit_trail table to maintain the audit.
         * Refer: sales-portal-auth\migrations\1703662025608_add-table-sku-rule-configurations.js, for the trigger sql.
         */
        logger.info("inside SkuRuleConfigurationsModel -> upsertSkuRuleConfigurations");
        let valueString = '';
        data.forEach(row => {
            Object.keys(row.cg_db).forEach(tse => {
                let included_cg_db = "'{";
                Object.keys(row.cg_db[tse]).forEach(cg => {
                    included_cg_db = included_cg_db == "'{" ? included_cg_db : `${included_cg_db},`;
                    included_cg_db = included_cg_db + `"${cg}" : ${typeof (row.cg_db[tse][cg]) == 'boolean' ? row.cg_db[tse][cg] : `["${row.cg_db[tse][cg].join('","')}"]`}`
                })
                included_cg_db += "}'"
                const tempVal = `('${row.area_code}','${row.sku_code}','${tse}', ${included_cg_db}, '${updatedBy}', ${included_cg_db == "'{}'" ? true : row.deleted})`
                valueString = valueString + (valueString == '' ? '' : ',') + tempVal
            })
        })
        let client: PoolClient | null = null;
        try {
            const upsertStatement = `
                        insert into sku_rule_configurations (
                                area_code,
                                sku_code,
                                tse_code,
                                included_cg,
                                updated_by,
                                deleted
                                )
                        values ${valueString}
                        on conflict (area_code, sku_code, tse_code) do update set
                            included_cg = excluded.included_cg,
                            updated_by = excluded.updated_by,
                            updated_on = now(),
                            deleted = excluded.deleted
                        returning id,area_code,sku_code,updated_on,deleted;                    
                        `;
            client = await conn.getWriteClient();
            const result = await client.query(upsertStatement);
            if(result.rows.length > 0){
                const idString = result.rows.map((row: any) => row.id).join(",");
                const distChannelString = data[0].dist_channels.length ? `${data[0].dist_channels.join(",")}` : '';
                const upsertStatement2 = `
                    INSERT INTO public.sku_rule_config_dist_channels_mapping(rule_config_id, distribution_channel)
                        SELECT ir.id AS rule_config_id, dcs.dist_channel AS distribution_channel
                        FROM (SELECT UNNEST(ARRAY[${idString}]) AS id)  AS ir 
                        CROSS JOIN (SELECT UNNEST(ARRAY[${distChannelString}]) AS dist_channel) AS dcs
                    ON CONFLICT DO NOTHING
                    RETURNING rule_config_id;`
                const result2 = await client.query(upsertStatement2);
            }
            
            return result.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertSkuRuleConfigurations: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    async getSkuRuleConfigurations(areaCode: string[] | null, search: string | null, distChannels: string[] = []) {
        logger.info("inside SkuRuleConfigurationsModel -> getSkuRuleConfigurations");
        
        let client: PoolClient | null = null;
        try {
            const whereCondition = areaCode ? ` and (src.area_code in ('${areaCode?.join("' , '")}') or src.tse_code in ('${areaCode?.join("' , '")}'))` : '';
            const distChannelsCondition = distChannels.length ? ` AND src.channel in ('${distChannels.join("','")}')` : '';
            const searchCondition = search ? ` and (mm.code ilike '%${search}%' or mm.description ilike '%${search}%' or brand_desc ilike '%${search}%' or brand_variant_desc ilike '%${search}%')` : '';
            const sqlStatement = `
                SELECT
                    src.sku_code AS psku_code,
                    COALESCE(brand_desc, '') AS brand_name,
                    COALESCE(brand_variant_desc, '') AS brand_variant_desc,
                    mm.description AS psku_name,
                    mm.brand_desc,
                    jsonb_agg(
                        jsonb_build_object(
                            'area_code', src.area_code,
                            'tse_code', src.tse_code,
                            'included_cg', src.included_cg_db
                        )
                    ) AS included_cg_list
                FROM
                    sku_rule_configurations src
                INNER JOIN material_master mm ON
                    mm.code = src.sku_code
                WHERE
                    src.deleted = false
                    AND mm.status = 'ACTIVE'
                    AND mm.deleted = false
                    ${whereCondition}
                    ${distChannelsCondition}
                    ${searchCondition}
                GROUP BY
                    src.sku_code,
                    brand_name,
                    brand_variant,
                    mm.description,
                    mm.brand_variant_desc,
                    mm.brand_desc;
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getSkuRuleConfigurations: ", error);
            return null;
        } finally {
            if (client != null)
                client.release();
        }
    },

    /**
     * 
     * @param areaCodes 
     * @param tableAlias : alias used for the material master table in parent query
     * @returns string
     * To create a where clause string to search in applicable area channel in material master table.
     */
    generateApplAreaChannelCondition(areaCodes: string[] | null, tableAlias: string = 'mm') {
        const conditionArr: string[] = [];
        const tableColumnName = `${tableAlias}.appl_area_channel`;
        areaCodes?.forEach(a => {
            conditionArr.push(`'{"area": "${a}", "channel": "GT"}':: jsonb = ANY(${tableColumnName})`); // GT is the default channel
        });
        return conditionArr.join(' or ');
    },

    async fetchBrandAndBrandVariantCombinations(areaCodes: string[] | null) {
        logger.info("inside SkuRuleConfigurationsModel -> fetchBrandAndBrandVariantCombinations");

        let client: PoolClient | null = null;
        const areaCondition = areaCodes?.length ? ` and (${this.generateApplAreaChannelCondition(areaCodes)})` : '';
        const sqlStatement = `
        SELECT
            DISTINCT
            brand ,
            brand_desc ,
            brand_variant ,
            brand_variant_desc
        FROM
            material_master mm
        WHERE
            brand IS NOT NULL
            AND brand_variant IS NOT NULL
            AND brand_desc IS NOT NULL
            AND brand_variant_desc IS NOT NULL
            AND appl_area_channel IS NOT NULL
            AND deleted = FALSE
            AND mm.status = 'ACTIVE'
            ${areaCondition};
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchBrandAndBrandVariantCombinations: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchBrandVariantDetails(brandVariantCode: string) {
        logger.info("inside SkuRuleConfigurationsModel -> fetchBrandVariantDetails");
        let client: PoolClient | null = null;
        const sqlStatement = `
        select
            code,
            description,
            appl_area_channel,
            coalesce(brand,'') as brand,
            coalesce(brand_variant,'') as brand_variant,
            coalesce(brand_desc,'') as brand_desc,
            coalesce(brand_variant_desc,'') as brand_variant_desc
        from
            material_master mm
        where
            mm.status = 'ACTIVE'
            and mm.deleted = false
            AND brand_variant = $1;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [brandVariantCode]);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchBrandVariantDetails: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async upsertPrioritization(areaCode: string, brandVariant: string, priority: number | string, updatedBy: string, deleted: boolean = false) {
        /**
        * there is a trigger(on insert or update) on prioritization table which will update the audit_trail table to maintain the audit.
        * Refer: sales-portal-auth\migrations\1707207356567_prioritization.js, for the trigger sql.
        */
        logger.info("inside SkuRuleConfigurationsModel -> upsertPrioritization");
        let client: PoolClient | null = null;
        const sqlStatement = `
        INSERT
            INTO
            prioritization (
                area_code,
                brand_variant,
                priority ,
                updated_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (
            area_code,
            brand_variant)
        DO UPDATE SET
            priority = EXCLUDED.priority ,
            updated_on = now(),
            updated_by = EXCLUDED.updated_by
        RETURNING id;`;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [areaCode, brandVariant, priority, updatedBy]);
            return result?.rows[0].id;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertPrioritization: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchPrioritization(areaCode: string[] | null, search: string | null) {
        logger.info("inside SkuRuleConfigurationsModel -> fetchPrioritization");
        let client: PoolClient | null = null;
        const areaCodeCondition = areaCode?.length ? ` and p.area_code in ('${areaCode?.join("', '")}')` : '';
        const searchCondition = search ?
            `and (
                m.brand ilike '%${search}%'
                or m.brand_desc ilike '%${search}%' 
                or m.brand_variant ilike '%${search}%'
                or m.brand_variant_desc ilike '%${search}%')`
            : '';
        const sqlStatement = `
        SELECT
        DISTINCT
            p.id,
            p.priority,
            p.area_code,
            m.code,
            m.description,
            m.appl_area_channel,
            m.brand,
            m.brand_variant,
            m.brand_desc,
            m.brand_variant_desc,
            p.updated_by,
            p.updated_on,
            shd.first_name,
            shd.last_name
        FROM
            prioritization p
        INNER JOIN material_master m ON
            m.brand_variant = p.brand_variant
        LEFT JOIN sales_hierarchy_details shd ON
            shd.user_id = p.updated_by
        WHERE
            p.deleted = FALSE
            AND m.brand IS NOT NULL
            AND m.brand_variant IS NOT NULL
            AND m.brand_desc IS NOT NULL
            AND m.brand_variant_desc IS NOT NULL
            AND m.appl_area_channel IS NOT NULL
            AND m.status = 'ACTIVE'
            AND m.deleted = false
            ${areaCodeCondition}
            ${searchCondition}; `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchPrioritization: ", error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchNonForecastedPsku(areaCode: string[], distChannels: string[] = []) {
        logger.info("inside SkuRuleConfigurationsModel -> fetchNonForecastedPsku");
        const distChannelsCondition = distChannels.length ? ` and nfs.channel IN ('${distChannels.join("','")}')` : '';
        const areaCodeWhereCondition = areaCode && areaCode.length > 0 ? `and nfs.area_code in ('${areaCode.join("','")}')` : ''
        let client: PoolClient | null = null;
        const sqlStatement = `
	            SELECT 
	                nfs.psku AS psku_code,
	                mm.description AS psku_name,
	                mm.brand_variant_desc,
	                mm.brand_desc,
	                jsonb_agg(jsonb_build_object('area_code', nfs.area_code, 'included_cg', nfs.included_cg_db, 'tse_code', nfs.tse_code))  AS included_cg_list,
                    now() as updated_on
                    ,array_agg(distinct nfs.channel) AS dist_channels
	            FROM non_forecasted_sku nfs
	            JOIN material_master mm ON mm.code = nfs.psku
	            WHERE nfs.deleted = FALSE
	            ${areaCodeWhereCondition}
                ${distChannelsCondition}
	            GROUP BY
	                nfs.psku,
	                mm.description,
	                mm.brand_variant_desc,
	                mm.brand_desc
        `;
        try {
            client = await conn.getReadClient();
            const res = await client?.query(sqlStatement)
            return res.rows ?? null;
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchNonForecastedPsku: ", error);
            return null;
        }
        finally {
            client?.release();
        }
    },

    async upsertNonForecastedPsku(areaCgDbList: [
        {
            psku: string,
            area_code: string,
            deleted: boolean,
            cg_db: {
                [key: string]: {
                    [key: string]: any
                }
            },
            dist_channels: string
        }], user: string) {
        logger.info("inside SkuRuleConfigurationsModel -> upsertNonForecastedPsku");
        let client: PoolClient | null = null
        let values = ''
        areaCgDbList.forEach(item => {
            Object.keys(item.cg_db).forEach(tse => {
                let included_cg_db = "'{"
                Object.keys(item.cg_db[tse]).forEach((cg, index) => {
                    if (!item.cg_db[tse][cg] == false) {
                        included_cg_db = included_cg_db == "'{" ? included_cg_db : included_cg_db + ','
                        included_cg_db += `"${cg}":${typeof (item.cg_db[tse][cg]) == 'boolean' ? item.cg_db[tse][cg] : `["${item.cg_db[tse][cg].join('","')}"]`}`
                    }
                })
                included_cg_db += "}'"
                const tempVal = `('${item.area_code}','${item.psku}','${tse}',${included_cg_db},${included_cg_db == "'{}'" ? true : item.deleted},'${user}', '${item.dist_channels}')`
                values = values + (values == '' ? '' : ',') + tempVal
            })
        })
        const sqlStatement = `
            INSERT INTO non_forecasted_sku (area_code,psku,tse_code,included_cg_db,deleted,updated_by, channel)
            VALUES ${values}
            ON CONFLICT (area_code,tse_code,psku,channel) DO UPDATE SET
            included_cg_db = excluded.included_cg_db,
            deleted =excluded.deleted,
            updated_by = excluded.updated_by,
            updated_on = now()
            RETURNING  id, area_code, psku, updated_on, deleted
        `
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result && result.rowCount ? result.rows : null;
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertNonForecastedPsku : ", error);
            return null
        }
        finally {
            client?.release();
        }
    },

    async getDbList(distChannels: string[] = ['GT','NOURISHCO']) {
        logger.info("inside SkuRuleConfigurationsModel -> getDbList");
        const channels: number[] = [];
        if (distChannels.includes('GT')) {
            channels.push(...[10, 40])
        }
        if (distChannels.includes('NOURISHCO'))
            channels.push(90);
        const distChannelsCondition = distChannels.length ? ` WHERE distribution_channel IN (${channels.join(",")})` : '';
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT area_code, json_object_agg(temp_tbl.name, temp_tbl.db_list) AS db_list  FROM (
                SELECT
                    dm.area_code,
                    cgm.name,
                    jsonb_agg(jsonb_build_object('id',dm.id,'name',up.name,'tse_code',dm.tse_code,'deleted',dm.deleted, 'distribution_channel', ndb.distribution_channel)) AS db_list
                FROM distributor_master dm
                INNER JOIN (
                    SELECT DISTINCT distributor_id ,
                    CASE
                        WHEN distribution_channel = '10' or distribution_channel = '40' THEN 'GT'
                        WHEN distribution_channel = '90' THEN 'NOURISHCO'
                        ELSE 'GT'
                    END as distribution_channel
                    FROM distributor_plants
                    ${distChannelsCondition}
                ) AS ndb ON (ndb.distributor_id = dm.id)
                JOIN user_profile up ON
                    dm.id = up.id
                JOIN customer_group_master cgm ON
                    dm.group_id = cgm.id
                WHERE dm.area_code IS NOT NULL
                AND cgm.name IN ${INCLUSION_CUSTOMER_GROUPS}
                AND (dm.channel_code IN ${INCLUSION_DISTRIBUTION_CHANNEL} OR dm.channel_code IS NULL)
                GROUP BY dm.area_code ,
                cgm."name") AS temp_tbl GROUP BY area_code
            ;
        `
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result.rows) {
                return result.rows
            }
            return null;
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getDbList : ", error);
            return null
        }
        finally {
            client?.release();
        }
    },

    async upsertAllNonForecasted(
        payload: {
            areaCode: string,
            tseCode: string,
            pskuCode: string,
            included_cg_list: string,
            deleted: boolean,
            channel:string
        }[]
        , user: string
    ) {
        logger.info("inside SkuRuleConfigurationsModel -> upsertAllNonForecasted");
        let valueStatement = 'VALUES'
        payload.forEach((item,index) => {
            let value = index>0 ? ",(" : "("
            value += `'${item.areaCode}','${item.pskuCode}','${item.tseCode}',${item.included_cg_list},${item.deleted},'${user}', '${item.channel}')`
            valueStatement += value;
        })
        const sqlStatement = `INSERT INTO non_forecasted_sku (area_code,psku,tse_code,included_cg_db,deleted,updated_by,channel)
         ${valueStatement}
         ON CONFLICT (area_code,tse_code,psku, channel) DO UPDATE SET
            included_cg_db = excluded.included_cg_db,
            deleted =excluded.deleted,
            updated_by = excluded.updated_by,
            updated_on = now()
            RETURNING  id, area_code, psku, updated_on, deleted
         `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            let res = await client.query(sqlStatement);
            return res && res.rows ? res.rows : null;
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertAllNonForecasted : ", error)
            return null;
        }
        finally {
            client?.release();
        }
    },

    async upsertAllRuleConfiguration(
        payload: {
            areaCode: string,
            tseCode: string,
            pskuCode: string,
            included_cg_list: string,
            deleted: boolean,
        }[]
        , user: string
        , channel: string
    ) {
        logger.info("inside SkuRuleConfigurationsModel -> upsertAllRuleConfiguration");
        let valueStatement = 'VALUES'
        payload.forEach((item, index) => {
            let value = index > 0 ? ",(" : "("
            value += `'${item.areaCode}','${item.pskuCode}','${item.tseCode}',${item.included_cg_list},${item.deleted},'${user}', '${channel}')`
            valueStatement += value;
        })
        const sqlStatement = `INSERT INTO sku_rule_configurations (area_code,sku_code,tse_code,included_cg_db,deleted,updated_by, channel)
         ${valueStatement}
         ON CONFLICT (area_code,tse_code,sku_code,channel) DO UPDATE SET
            included_cg_db = excluded.included_cg_db,
            deleted =excluded.deleted,
            updated_by = excluded.updated_by,
            updated_on = now()
            RETURNING  id, area_code, sku_code, updated_on, deleted
         `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const res = await client.query(sqlStatement);
            return res && res.rowCount ? res.rows : null;
        }
        catch(error) {
            logger.error("CAUGHT : Error In SkuRuleConfigurationsModel -> upsertAllRuleConfiguration", error);
            return null;
        }
        finally {
            client?.release();
        }
    },

    async upsertRuleConfigurations(areaCgDbList: [
        {
            psku: string,
            area_code: string,
            deleted: boolean,
            cg_db: {
                [key: string]: {
                    [key: string]: any
                }
            },
        }], user: string, dist_channels:string) {
        logger.info("inside SkuRuleConfigurationsModel -> upsertRuleConfigurations");
        let client: PoolClient | null = null
        let values = ''
        areaCgDbList.forEach(item => {
            Object.keys(item.cg_db).forEach(tse => {
                let included_cg_db = "'{"
                Object.keys(item.cg_db[tse]).forEach((cg, index) => {
                    if (!item.cg_db[tse][cg] == false) {
                        included_cg_db = included_cg_db == "'{" ? included_cg_db : included_cg_db + ','
                        included_cg_db += `"${cg}":${typeof (item.cg_db[tse][cg]) == 'boolean' ? item.cg_db[tse][cg] : `["${item.cg_db[tse][cg].join('","')}"]`}`
                    }
                })
                included_cg_db += "}'"
                const tempVal = `('${item.area_code}','${item.psku}','${tse}','${dist_channels}',${included_cg_db},${included_cg_db == "'{}'" ? true : item.deleted},'${user}')`
                values = values + (values == '' ? '' : ',') + tempVal
            })
        })
        const sqlStatement = `
            INSERT INTO sku_rule_configurations (area_code,sku_code,tse_code,channel,included_cg_db,deleted,updated_by)
            VALUES ${values}
            ON CONFLICT (area_code,tse_code,sku_code,channel) DO UPDATE SET
            included_cg_db = excluded.included_cg_db,
            deleted =excluded.deleted,
            updated_by = excluded.updated_by,
            updated_on = now()
            RETURNING  id, area_code, sku_code, updated_on, deleted
        `
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            if (result.rowCount && result.rowCount > 0) 
                return result.rows;
            else return null;
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertRuleConfigurations : ", error);
            return null
        }
        finally {
            client?.release();
        }
    },
};