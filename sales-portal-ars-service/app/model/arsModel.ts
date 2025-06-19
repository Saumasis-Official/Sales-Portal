import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import Helper from '../helper';
import { arsHelpers } from '../helper/arsHelper';
import { EVERYDAY_PDP } from '../constants';
import _ from 'lodash';
import ResultNotFound from '../lib/ResultNotFound';
import UpdateFailedException from '../lib/UpdateFailedException';
import { UserModel } from './userModel';
import { UploadSkuSoqNorm } from '../interfaces/uploadSkuSoqNorm';
import { LogService } from '../service/logService';
import { ForecastedPskuDistWise } from '../interfaces/forecastedPskuDistWise';
import { UpdateForecastData } from '../interfaces/updateForecastData';
import { AuditModel } from './audit.model';
import AllocationAudit from '../interfaces/allocationAudit';
import { UploadClassLevelStockNorm } from '../interfaces/UploadClassLevelStockNorm';

const conn = PostgresqlConnection.getInstance();

export const ArsModel = {
    async getRegionalBrandVariants(areaCode: string) {
        logger.info('inside ArsModel -> getRegionalBrandVariants');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                                SELECT DISTINCT
                                parent_desc,
                                parent_sku
                                FROM sales_allocation
                                where asm_code = $1
                                and created_on = (select max(created_on) from sales_allocation where asm_code = $1)
                                order by parent_desc asc;`;
            const values = [areaCode];
            const result = await client.query(sqlStatement, values);

            if (result && result.rowCount > 0) {
                return result;
            }
            return null;
        } catch (error) {
            logger.error('error in ArsModel -> getRegionalBrandVariants', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getRegionalBrands(areaCode: string) {
        logger.info('inside ars.model -> getRegionalBrands');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                                SELECT DISTINCT regional_brand
                                FROM forecast_data
                                WHERE asm_code = '${areaCode}';`;
            const result = await client.query(sqlStatement);

            if (result && result.rowCount > 0) {
                return result;
            }
            return null;
        } catch (error) {
            logger.error('error in ars.model -> getRegionalBrands, Eroor : ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getForecastData(areaCode: string, psku: string, startMonth: string | null = null, endMonth: string | null = null) {
        logger.info('inside ArsModel -> getForecastData');
        /**
         * 1. We need to find the previous month forecast only when forecast for the next month is dumped, i.e. after 18th of the current month.
         * 2. if currentMonthForecastTimeStatement includes forecast_month, then we need to consider that forecast has been dumped for the next month
         * 3. We need previous month forecast to calculate Balance-to-go = (Forecast applicable for the current month - MTD)
         */
        let client: PoolClient | null = null;
        let lastForecastDate;
        try {
            client = await conn.getReadClient();
            let latestForecastSqlStmt = `
                                SELECT
                                    sa2.created_on AS date,
                                    forecast_month
                                FROM
                                    sales_allocation sa2
                                WHERE
                                    asm_code = $1
                                ORDER BY created_on DESC
                                LIMIT 1 `;
            lastForecastDate = await client.query(latestForecastSqlStmt, [areaCode]);
            const lastForecastMonth = lastForecastDate?.rows[0]?.forecast_month ?? null;
            lastForecastDate = lastForecastDate?.rows[0]?.date ?? null;
            if (!lastForecastDate || !lastForecastMonth) {
                logger.error('QUERY ERROR: in ArsModel -> getForecastData, lastForecastDate could not be fetched');
                return null;
            }

            const applicableYearMonthsRes =
                startMonth && endMonth ? arsHelpers.getDynamicYearMonth(startMonth, endMonth, lastForecastMonth) : Helper.applicableYearMonths(lastForecastMonth);
            const delta = applicableYearMonthsRes?.monthNames?.length ? applicableYearMonthsRes.monthNames.length - 1 : 3;
            const applicableYearMonthsStmt = applicableYearMonthsRes?.monthYear
                ?.slice(0, delta)
                .map((month) => `'${month}'`)
                .join(',');
            console.log(
                `inside ArsModel -> getForecastData -> applicableYearMonthsStmt: ${applicableYearMonthsStmt}; lastForecastMonth: ${lastForecastMonth}, areaCode: ${areaCode}, psku: ${psku}`,
            );
            const currentMonthForecastTimeStatement = await Helper.forecastTimeStatementForCurrentMonthForecast(areaCode, lastForecastMonth);
            const isNextMonthForecastDumped = currentMonthForecastTimeStatement.includes('forecast_month');
            let prevForecast;

            if (isNextMonthForecastDumped) {
                prevForecast = await ArsModel.getPrevForecastData(areaCode, psku, currentMonthForecastTimeStatement);
            }
            //Inner join with distributor plants used as distribution runs only on the distributors that are present in distributor_plants
            let sqlStatement = `
                        WITH
                        LATEST_FORECAST AS (
                        ${latestForecastSqlStmt}
                        ),
                        FORECAST AS
                        (SELECT KEY,
                                SOLD_TO_PARTY,
                                CUSTOMER_NAME,
                                BY_ALLOCATION,
                                FORECAST_QTY,
                                PARENT_SKU,
                                "class",
                                lf.forecast_month,
                                created_on
                            FROM SALES_ALLOCATION
                            INNER JOIN latest_forecast lf ON 
                                lf.date = created_on
                            WHERE ASM_CODE = $1
                                AND PARENT_SKU = $2),
                        L3M_SALES AS (
                        	SELECT
								sold_to_party,
								parent_sku,
								year_month,
								billing_quantity_in_base_unit,
								ROW_NUMBER() OVER (
									PARTITION BY sold_to_party,
									parent_sku,
									year_month
								ORDER BY
									created_on DESC
								) AS rn
							FROM
								monthly_sales ms
							WHERE
								ms.year_month IN (
									${applicableYearMonthsStmt}
								)
								AND ms.asm_code = $1
                                AND ms.created_on IN (SELECT MAX(created_on) FROM monthly_sales ms2 WHERE ms2.asm_code = $1)
                        ),
                        MONTHLY_SALES_DATA AS
                        (SELECT SOLD_TO_PARTY,
                                PARENT_SKU,
                                (JSONB_AGG(
                                    JSON_BUILD_OBJECT(
                                        'yearMonth',YEAR_MONTH,
                                        'sales_qty',BILLING_QUANTITY_IN_BASE_UNIT))) AS SALES_VALUE
                            FROM L3M_SALES
                            WHERE rn=1
                            GROUP BY SOLD_TO_PARTY,
                                PARENT_SKU)
                        SELECT
                            F.KEY,
                            F.SOLD_TO_PARTY AS DISTRIBUTOR_CODE,
                            F.CUSTOMER_NAME AS DISTRIBUTOR_NAME,
                            F."class",
                            COALESCE(MSD.SALES_VALUE, '[]') AS SALES_VALUE,
                            ROUND(F.BY_ALLOCATION,2)::float AS RECOMMENDED_FORECAST,
                            F.FORECAST_QTY AS RECOMMENDED_TOTAL,
                            ROUND(COALESCE (USA.UPDATED_ALLOCATION, F.BY_ALLOCATION),2)::float AS ADJUSTED_FORECAST,
                            USA.UPDATED_BY,
                            COALESCE (USA.UPDATED_ON, F.CREATED_ON) AS UPDATED_ON,
                            F.forecast_month,
                            CASE
                                WHEN dm.deleted = FALSE THEN 'Active'
                                ELSE 'Inactive'
                            END as status,
                            cgm.name as customer_group,
                            cgm.description as customer_group_description
                        FROM FORECAST F
                        LEFT JOIN MONTHLY_SALES_DATA MSD ON MSD.SOLD_TO_PARTY = F.SOLD_TO_PARTY
                        AND MSD.PARENT_SKU = F.PARENT_SKU
                        LEFT JOIN UPDATED_SALES_ALLOCATION USA ON USA.SALES_ALLOCATION_KEY = F.KEY
                        AND USA.UPDATED_ON >=  F.CREATED_ON
                        INNER JOIN distributor_master dm on dm.id = F.sold_to_party
                        INNER JOIN customer_group_master cgm on cgm.id = dm.group_id
                        ORDER BY 
                        CASE 
                            WHEN dm.deleted = false THEN 1 
                            ELSE 2 
                        END, DISTRIBUTOR_CODE ASC;`;
            const values = [areaCode, psku];
            const result = await client.query(sqlStatement, values);
            if (result?.rowCount > 0) {
                sqlStatement = `SELECT
                    FIRST_NAME,
                    LAST_NAME
                    FROM SALES_HIERARCHY_DETAILS
                    WHERE USER_ID = $1`;
                const userDetails = await client.query(sqlStatement, [result?.rows[0]?.updated_by]);
                return {
                    rows: result?.rows,
                    firstName: userDetails?.rows[0]?.first_name,
                    lastName: userDetails?.rows[0]?.last_name,
                    rowCount: result?.rowCount,
                    prev_forecast: prevForecast,
                };
            }
            return null;
        } catch (error) {
            logger.error('Error in ArsModel -> getForecastData', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getPrevForecastData(areaCode: string, psku: string, currentMonthForecastTimeStatement: string) {
        logger.info('inside ArsModel -> getPrevForecastData');

        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                            SELECT        
                                SA.KEY,
                                SA.SOLD_TO_PARTY,
                                ROUND(COALESCE (USA2.UPDATED_ALLOCATION, SA.BY_ALLOCATION)) AS PREV_FORECAST
                            FROM SALES_ALLOCATION SA
                            LEFT JOIN UPDATED_SALES_ALLOCATION USA2 ON USA2.SALES_ALLOCATION_KEY = SA.KEY
                            WHERE SA.ASM_CODE = $1
                                AND SA.PARENT_SKU = $2
                                AND SA.CREATED_ON = ( ${currentMonthForecastTimeStatement} )
                            `;
            const result = await client.query(sqlStatement, [areaCode, psku]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getPrevForecastData', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getForecastSummaryData(areaCode: string, search: string, limit: string, offset: string, l3m_res, quantityNormFlag: boolean = false, endMonth: string | null = null) {
        logger.info('Inside ArsModel -> getForecastSummaryData: quantityNormFlag: ' + quantityNormFlag);
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const lastYearMonths = l3m_res?.monthYear;
            if (lastYearMonths && lastYearMonths.length) {
                const delta = lastYearMonths.length - 1;
                const yearMonthWhereCondition = `'${lastYearMonths.slice(0, delta).join("','")}'`;
                const forecastStatement = lastYearMonths.slice(0, delta).map((month: string, idx: number) => {
                    return `COALESCE(max((ms.sales_by_month ->> '${month}'):: NUMERIC), 0) AS month_${idx + 1}`;
                });
                const avgStatement = lastYearMonths.slice(0, delta).map((month: string, idx: number) => {
                    return `svg.month_${idx + 1}`;
                });
                const searchStatement =
                    search && search.length > 0
                        ? ` AND (sa.regional_brand ILIKE '%${search}%' OR 
                                           sa.brand_variant ILIKE '%${search}%' OR 
                                           sa.parent_desc ILIKE '%${search}%' OR
                                           sa.parent_sku ILIKE '%${search}%')`
                        : '';
                let quantityNormStatement = '';
                let quantityNormWithStatement = '';
                let quantityNormJoinStatement = '';
                let quantityNormWhereStatement = '';

                if (quantityNormFlag) {
                    quantityNormStatement = ` , ua.quantity_norm, ua.buom_to_cs  `;
                    quantityNormWhereStatement = ` WHERE forecast = 0 `;
                    quantityNormWithStatement = ` ,updated_allocation AS (
                                  	SELECT  sa2.parent_sku , max(usa.updated_allocation) AS quantity_norm, mm.buom_to_cs  FROM updated_sales_allocation usa
                                  	LEFT JOIN sales_allocation sa2 ON sa2."key" = usa.sales_allocation_key
                                    LEFT JOIN material_master mm ON mm.code = sa2.parent_sku
                                  	WHERE sa2.created_on = (SELECT max(created_on) FROM sales_allocation WHERE asm_code = '${areaCode}')
                                  	GROUP BY sa2.parent_sku, mm.buom_to_cs 
                                  ) `;
                    quantityNormJoinStatement = ` LEFT JOIN updated_allocation ua ON ua.parent_sku = svg.parent_sku `;
                }
                const sqlStatement = `
                    WITH
                    max_sales_date AS (
                        SELECT
                            ms.asm_code AS area_code,
                            MAX(created_on) AS max_date
                        FROM
                            monthly_sales ms
                        WHERE
                            ms.asm_code = '${areaCode}'
                        GROUP BY
                            ms.asm_code
                    ),
                    monthly_sales AS (
                        SELECT
                            ms.parent_sku,
                            jsonb_object_agg(ms.year_month, ms.billing_quantity_in_base_unit_sum) AS sales_by_month
                        FROM
                            monthly_sales ms
                        INNER JOIN max_sales_date msd ON msd.area_code = ms.asm_code
                        WHERE
                            ms.asm_code = '${areaCode}'
                            AND ms.year_month IN (${yearMonthWhereCondition})
                            AND ms.created_on = msd.max_date
                        GROUP BY
                            ms.parent_sku
                    ),
                    forecast AS (
                        SELECT
                            sa.parent_sku,
                            sa.parent_desc,
                            ${forecastStatement.join(',')},
                            SUM(ROUND(sa.by_allocation, 2))::float AS forecast,
                            sa.forecast_month
                        FROM
                            sales_allocation sa
                        LEFT JOIN
                            monthly_sales ms ON
                            ms.parent_sku = sa.parent_sku
                        WHERE
                            sa.asm_code = '${areaCode}'
                            AND sa.created_on = (
                            SELECT
                                MAX(created_on)
                            FROM
                                sales_allocation
                            WHERE
                                asm_code = '${areaCode}'
                            )
                            ${searchStatement}
                        GROUP BY
                            sa.parent_sku,
                            sa.parent_desc,
                            sa.forecast_month
                    ),
                    sales_avg AS (
                        SELECT
                            svg.*,
                            CEIL((${avgStatement.join('+')})/${delta}) AS average_sales
                        FROM
                            forecast AS svg
                    )
                    ${quantityNormWithStatement}
                    SELECT DISTINCT
                        svg.parent_sku,
                        svg.parent_desc,
                        ${avgStatement.join(',')},
                        svg.forecast,
                        svg.forecast_month,
                        (svg.forecast - svg.average_sales) AS sales_diff
                        ${quantityNormStatement}
                    FROM sales_avg AS svg
                    ${quantityNormJoinStatement}
                    ${quantityNormWhereStatement}
                    ORDER BY sales_diff DESC;
                `;
                const result = await client.query(sqlStatement);
                if (result) {
                    //to find the row count, limit and offset is applied separately
                    const selectedRows = result.rows.slice(+offset, +offset + +limit);
                    return {
                        rows: selectedRows,
                        rowCount: selectedRows.length,
                        totalCount: result.rowCount,
                        endMonth: endMonth,
                        delta: delta,
                    };
                }
                return null;
            } else {
                logger.error('CAUGHT: Error in ArsModel -> getForecastSummaryData: lastYearMonth not found for ', areaCode);
                return null;
            }
        } catch (error) {
            logger.error('Inside ArsModel -> getForecastSummaryData, Error : ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchForecastConfigurations(areaCode: string, applicableMonth: string | null = null, nextApplicableMonth: string | null = null) {
        logger.info('inside ArsModel -> fetchForecastConfigurations');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const nextMonth = nextApplicableMonth ? nextApplicableMonth : Helper.applicableMonth('next');
            const applicableMonthStatement = applicableMonth
                ? `applicable_month = '${applicableMonth}'`
                : `applicable_month = (select max(applicable_month) from forecast_configurations where area_code = $1)`;
            const nextApplicableMonthStatement = nextApplicableMonth ? ` or applicable_month = '${nextApplicableMonth}'` : '';
            let sqlStatement = `
                    select
                        distinct
                        fc.area_code ,
                        fc.applicable_month ,
                        fc.customer_group || '#' || cgm.description as customer_group,
                        fc.weekly_week1 ,
                        fc.weekly_week2 ,
                        fc.weekly_week3 ,
                        fc.weekly_week4 ,
                        fc.fortnightly_week12 ,
                        fc.fortnightly_week34 ,
                        fc.updated_on ,
                        fc.updated_by ,
                        shd.first_name ,
                        shd.last_name ,
                        shd.user_id
                    from
                        forecast_configurations fc
                    INNER JOIN distributor_master dm ON
                    	dm.area_code = $1
                    inner join customer_group_master cgm on
                        cgm."name" = fc.customer_group
                        AND dm.group_id = cgm.id
                    left join sales_hierarchy_details shd on
                        shd.user_id = fc.updated_by
                    where
                        (
                            ${applicableMonthStatement} 
                            ${nextApplicableMonthStatement}
                        )   
                        and fc.area_code = $1`;

            if (areaCode) {
                const response = await client.query(sqlStatement, [areaCode]);
                const resp = {};
                const config_data = {};
                Object.assign(resp, {
                    area_code: areaCode,
                    applicable_month: response?.rows ? response?.rows[0]?.applicable_month : nextMonth,
                    updated_on: response?.rows[0]?.updated_on,
                    updated_by: response?.rows[0]?.updated_by,
                    first_name: response?.rows[0]?.first_name,
                    last_name: response?.rows[0]?.last_name,
                    config_data: {},
                });
                if (nextApplicableMonth) {
                    resp['config_data'] = response?.rows;
                } else {
                    response?.rows?.forEach((row) => {
                        const obj = {
                            weekly_week1: row.weekly_week1,
                            weekly_week2: row.weekly_week2,
                            weekly_week3: row.weekly_week3,
                            weekly_week4: row.weekly_week4,
                            fortnightly_week12: row.fortnightly_week12,
                            fortnightly_week34: row.fortnightly_week34,
                        };
                        config_data[row.customer_group] = obj;
                    });
                    resp['config_data'] = config_data;
                }

                return resp;
            } else {
                logger.error('Error in ArsModel -> fetchForecastConfigurations, either areaCode or applicableMonth is not present');
                return null;
            }
        } catch (error) {
            logger.error(`error in ArsModel -> fetchForecastConfigurations: `, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async updateForecastConfiguration(
        user_id: string,
        role: string,
        config: {
            area_code: string;
            applicable_month: string;
            config_data: {
                [key: string]: {
                    weekly_week1: string;
                    weekly_week2: string;
                    weekly_week3: string;
                    weekly_week4: string;
                    fortnightly_week12: string;
                    fortnightly_week34: string;
                };
            };
        },
    ) {
        logger.info('inside ArsModel -> updateForecastConfiguration');
        let client: PoolClient | null = null;
        try {
            let sqlStatement = '';

            for (let [key, value] of Object.entries(config.config_data)) {
                sqlStatement += `
                UPDATE forecast_configurations
                SET 
                weekly_week1 = '${value.weekly_week1}',
                weekly_week2 = '${value.weekly_week2}', 
                weekly_week3 = '${value.weekly_week3}', 
                weekly_week4 = '${value.weekly_week4}', 
                fortnightly_week12 = '${value.fortnightly_week12}',
                fortnightly_week34 = '${value.fortnightly_week34}',
                updated_on = NOW(),
                updated_by = '${user_id}'
                WHERE area_code = '${config.area_code}'
                    AND applicable_month = '${config.applicable_month}'
                    AND customer_group = '${key.split('#')[0]}';
                `;
            }
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error('Error in ArsModel -> updateForecastConfiguration: ', error);
            return false;
        } finally {
            if (client != null) client.release();
        }
    },

    async updateForecastData(
        data: {
            adjusted: {
                sales_allocation_key: any;
                updated_allocation: any;
            }[];
        },
        userId: string,
    ) {
        logger.info('inside ArsModel -> updateForecastData');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sql = `
            INSERT
                INTO
                updated_sales_allocation (
                updated_allocation,
                sales_allocation_key,
                updated_by )
            SELECT
                "updated_allocation" as updated_allocation,
                sales_allocation_key,
                $2 as updated_by
            FROM
                json_populate_recordset(NULL::updated_sales_allocation,$1)
            ON
                CONFLICT (sales_allocation_key) DO
            UPDATE
            SET
                updated_allocation = EXCLUDED.updated_allocation,
                updated_by = EXCLUDED.updated_by,
                updated_on = now();
            `;
            const result = await client.query(sql, [JSON.stringify(data?.adjusted), userId]);
            return result.rowCount;
        } catch (error) {
            logger.error('Error in ArsModel -> updateForecastData', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async updateForecastDistribution(areaCode: string) {
        /**
         * This function is called during updating of Forecast Configuration, so that forecast_distribution is updated based on phasing
         */
        let client: PoolClient | null = null;
        const distributionAuditPayload: {
            [key: string]: AllocationAudit;
        } = {};

        try {
            const isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(areaCode);
            const applicableMonth = isNextMonthForecastDumped ? Helper.applicableMonth('next') : Helper.applicableMonth('current');
            // const dt = new Date();
            // dt.setDate(dt.getDate() + 1);
            // const startDate: number = isNextMonthForecastDumped ? 1 : +dt.getDate();
            const startDate: number = 1;
            const totalDays = Helper.daysInMonth(applicableMonth);
            const weekStartEndWeekly: { [key: string]: number[] } = {
                weekly_week1: [1, 7, 7],
                weekly_week2: [8, 14, 7],
                weekly_week3: [15, 21, 7],
                weekly_week4: [22, totalDays, totalDays - 22 + 1],
            };
            const weekStartEndFortnightly = {
                fortnightly_week12: [1, 14, 14],
                fortnightly_week34: [15, totalDays, totalDays - 15 + 1],
            };
            const forecastConfigResult = await ArsModel.fetchForecastConfigurations(areaCode, applicableMonth);
            if (forecastConfigResult === null || forecastConfigResult === undefined) {
                throw new Error('No forecast configuration found for area ' + areaCode);
            }
            let config_data = forecastConfigResult['config_data'];

            let customer_group = Object.keys(config_data)
                .map((key) => `'${key}'`)
                .join(',');
            const idToBeUpdatedSqlStatementForecastConfiguration = `
                                                                    WITH fd_data AS (SELECT
                                                                        fd.id
                                                                        ,fd.distributor_code 
                                                                        ,fd.psku
                                                                        ,fd.pdp
                                                                        ,fd.division
                                                                        ,cgm.name || '#' || cgm.description customer_group
                                                                    FROM forecast_distribution fd 
                                                                    INNER JOIN distributor_master dm ON (dm.profile_id = fd.distributor_code)
                                                                    INNER JOIN customer_group_master cgm ON (cgm.id = dm.group_id)
                                                                    WHERE
                                                                        fd.distributor_code IN (SELECT DISTINCT sa.sold_to_party
                                                                                                FROM
                                                                                                    sales_allocation sa
                                                                                                WHERE
                                                                                                    sa.asm_code = $1)
                                                                                                AND fd.applicable_month = $2
                                                                                                ORDER BY ID ASC)
                                                                    SELECT fdd.customer_group
                                                                            ,fdd.id
                                                                            ,fdd.distributor_code
                                                                            ,fdd.psku
                                                                            ,fdd.pdp
                                                                            ,fdd.division
                                                                    FROM fd_data fdd
                                                                    WHERE fdd.customer_group IN (${customer_group})
                                                                    ORDER BY fdd.customer_group, fdd.id;`;
            const lastUpdatedValueSqlStatement = `
                SELECT
                    usa.updated_allocation,sa.class, usa.key, usa.sales_allocation_key
                FROM
                    updated_sales_allocation usa
                INNER JOIN sales_allocation sa ON
                    sa.key = usa.sales_allocation_key
                WHERE
                    sa.sold_to_party = $1
                    AND sa.parent_sku = $2
                ORDER BY
                    usa.key DESC
                LIMIT 1;`;
            client = await conn.getWriteClient();
            const idTOBeUpdated = await client.query(idToBeUpdatedSqlStatementForecastConfiguration, [areaCode, applicableMonth]);
            const pskuDbSet = {};
            let mtdResponse = null;
            // if (!isNextMonthForecastDumped) {
            //     idTOBeUpdated?.rows?.forEach((row) => {
            //         if (pskuDbSet[row.psku])
            //             pskuDbSet[row.psku] = pskuDbSet[row.psku].add(row.distributor_code);
            //         else
            //             pskuDbSet[row.psku] = new Set([row.distributor_code]);
            //     });
            //     mtdResponse = await ArsService.getMtd(pskuDbSet);
            // }

            const correspondingWeek = (date: number, weekStartEnd: { [key: string]: number[] }): [string, number[]] | null => {
                for (let [key, value] of Object.entries(weekStartEnd)) {
                    if (date >= value[0] && date <= value[1]) {
                        return [key, value];
                    }
                }
                return null;
            };

            const pskuSet = new Set(idTOBeUpdated?.rows?.map((row) => row.psku)) ?? new Set();
            const pskuArrayString = [...pskuSet]?.join(',');
            const conversion = (await ArsModel.getConversionFactor(pskuArrayString)) ?? [];
            const pskuConversions = arsHelpers.rekey(conversion, 'code', 'buom_to_cs') ?? {};
            for (let element of idTOBeUpdated?.rows || []) {
                let sqlStatement = '',
                    whereCondition = '';
                sqlStatement = `UPDATE forecast_distribution SET `;
                whereCondition = ` WHERE id = ${element?.id}`;
                if (element?.distributor_code == null) {
                    logger.error(`Error in ArsModel -> updateForecastDistribution, distributor code is undefined or null`);
                    continue;
                }
                if (element?.psku == null) {
                    logger.error(`Error in ArsModel -> updateForecastDistribution, psku is undefined or null`);
                    continue;
                }

                let updated_allocation, updatedAllocationId, salesAllocationKey, pskuClass;
                try {
                    const lastUpdatedValue = await client.query(lastUpdatedValueSqlStatement, [element?.distributor_code, element?.psku]);
                    updated_allocation = lastUpdatedValue?.rows[0]?.updated_allocation;
                    updatedAllocationId = lastUpdatedValue?.rows[0]?.key;
                    salesAllocationKey = lastUpdatedValue?.rows[0]?.sales_allocation_key;
                    pskuClass = lastUpdatedValue?.rows[0]?.class;
                } catch (error) {
                    logger.error(`QUERY CATCH: Error in ArsModel -> updateForecastDistribution, updated_allocation for ${element?.distributor_code}, ${element?.psku}`, error);
                    continue;
                }
                if (updated_allocation == null) {
                    logger.error(`Error in ArsModel -> updateForecastDistribution, updated_allocation not found for ${element?.distributor_code}, ${element?.psku}`);
                    continue;
                }
                const areaPskuKey = `${areaCode}#${element.psku}`;
                const tempDistributionAuditPayload = distributionAuditPayload[areaPskuKey] ?? {
                    area_code: areaCode,
                    psku: element.psku,
                    applicable_month: applicableMonth,
                    error_log: '',
                    payload: [],
                    query: '',
                };
                const mtd = mtdResponse?.[element?.psku]?.[element?.distributor_code] ?? 0;
                const buomToCs = pskuConversions[element?.psku] ?? 1;
                updated_allocation -= mtd * +buomToCs;
                let pdpType;
                pdpType = element?.pdp?.substring(0, 2);
                if (pdpType === 'WE') {
                    const currentWeek = correspondingWeek(startDate, weekStartEndWeekly);
                    for (let i = startDate; i <= totalDays; i++) {
                        let distribution: number = 0;

                        const [key, [start, end, length]] = correspondingWeek(i, weekStartEndWeekly) ?? [null, [null, null, null]];

                        // current month and current week. i > currentWeek[1][0] is not >= because if it is start of the week, then it is basically the entire week
                        if (!isNextMonthForecastDumped && i > currentWeek[1][0] && i <= currentWeek[1][1]) {
                            distribution = (+updated_allocation * (+config_data[element?.customer_group][key] / 100)) / (end - startDate + 1);
                        } else {
                            // upcoming
                            distribution = (+updated_allocation * (+config_data[element?.customer_group][key] / 100)) / length;
                        }
                        sqlStatement += ` "_${i}" = ${Number(distribution.toFixed(5))},`;
                    }
                } else if (pdpType === 'FN') {
                    const currentWeek = correspondingWeek(startDate, weekStartEndFortnightly);
                    // fortnightly
                    for (let i = startDate; i <= totalDays; i++) {
                        let distribution: number = 0;
                        const [key, [start, end, length]] = correspondingWeek(i, weekStartEndFortnightly) ?? [null, [null, null, null]];
                        // current month and current week
                        if (isNextMonthForecastDumped && i > currentWeek[1][0] && i <= currentWeek[1][1]) {
                            distribution = (+updated_allocation * (+config_data[element?.customer_group][key] / 100)) / (end - startDate + 1);
                        } else {
                            // upcoming
                            distribution = (+updated_allocation * (+config_data[element?.customer_group][key] / 100)) / length;
                        }
                        sqlStatement += ` "_${i}" = ${Number(distribution.toFixed(5))},`;
                    }
                }
                sqlStatement = sqlStatement.substring(0, sqlStatement.length - 1); // to remove the last comma
                sqlStatement += whereCondition;
                try {
                    tempDistributionAuditPayload.query += sqlStatement + '\n';
                    tempDistributionAuditPayload.payload.push({
                        pskuClass: pskuClass,
                        distributorCode: element.distributor_code,
                        updated_allocation: updated_allocation,
                        updatedAllocationId: updatedAllocationId,
                        salesAllocationKey: salesAllocationKey,
                    });
                    const result = await client.query(sqlStatement);
                } catch (error) {
                    logger.error(`QUERY CATCH: Error in ArsModel -> updateForecastDistribution `, error);
                    tempDistributionAuditPayload.error_log += JSON.stringify(error) + '\n';
                    continue;
                } finally {
                    distributionAuditPayload[areaPskuKey] = tempDistributionAuditPayload;
                }
            }
            logger.info('SUCCESS: ArsModel -> updateForecastDistribution');
            return true;
        } catch (error) {
            logger.error('CATCH: Error in ArsModel -> updateForecastDistribution,', error);
            return null;
        } finally {
            logger.info('inside ArsModel -> updateForecastDistribution: Job completed, forecast_distribution updated');
            AuditModel.upsertForecastDistributionLogs(Object.values(distributionAuditPayload));
            if (client != null) client.release();
        }
    },

    async getStockData(distributorCode: string, divisions: string[]) {
        //to find all the applicable psku, falling in the given division array and for the distributor
        logger.info('inside ArsModel -> getStockData');
        let client: PoolClient | null = null;

        try {
            const applicableMonth = Helper.applicableMonth();
            if (!divisions) {
                return null;
            }
            let divStr: string = '';
            divisions?.forEach((div) => {
                divStr += `'${div}'`;
            });
            const sqlStatement = `SELECT PSKU AS SKU
                                FROM FORECAST_DISTRIBUTION
                                WHERE DISTRIBUTOR_CODE = '${distributorCode}'
                                AND APPLICABLE_MONTH = '${applicableMonth}'
                                AND DIVISION IN ('${divisions.join(`','`)}')`;

            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);

            return result?.rows;
        } catch (error) {
            logger.error('Error in ArsModel -> getStockData', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async fetchLastForecastDate(areaCode: string) {
        logger.info('inside ArsModel -> fetchLastForecastDate');
        let client: PoolClient | null = null;

        try {
            const sqlStatement = `
                            SELECT
                                    sa2.created_on::text AS date,
                                    forecast_month
                                FROM
                                    sales_allocation sa2
                                WHERE
                                    asm_code = $1
                                ORDER BY created_on DESC
                                LIMIT 1`;
            client = await conn.getReadClient();
            const lastForecastDate = await client.query(sqlStatement, [areaCode]);
            return lastForecastDate;
        } catch (error) {
            logger.error('Error in ArsModel -> fetchLastForecastDate');
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async submitForecastData(areaCode: string, userId: string) {
        logger.info('Inside ArsModel -> submitForecastData');
        let client: PoolClient | null = null;

        try {
            const sqlStatement = `
            INSERT INTO updated_sales_allocation (sales_allocation_key, updated_allocation, updated_by, updated_on)
            SELECT DISTINCT ON (sa.sold_to_party, sa.parent_sku) 
                                  sa.key, 
                                  CASE
                                  WHEN sa.key = usa.sales_allocation_key THEN usa.updated_allocation
                                  ELSE sa.by_allocation
                                  END AS forecast_qty,
                                  '${userId}' AS updated_by,
                                  'NOW()' AS upd
                            FROM sales_allocation AS sa LEFT JOIN updated_sales_allocation AS usa
                            ON sa.key = usa.sales_allocation_key
                            WHERE sa.asm_code = '${areaCode}' AND sa.created_on = (SELECT max(created_on) FROM sales_allocation WHERE asm_code = '${areaCode}' )
            ON CONFLICT (sales_allocation_key) DO UPDATE SET updated_allocation= EXCLUDED.updated_allocation, updated_on = EXCLUDED.updated_on;
                `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);

            if (result && result.rowCount > 0) {
                return result.rowCount;
            }
            logger.error('Inside ArsModel -> submitForecastData, Error : SQL Query error for ' + areaCode);
            return null;
        } catch (error) {
            logger.error('Inside ArsModel -> submitForecastData, Error : ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async updateInsertForecastDistribution(
        areaCode: string,
        forecastConfigResult: any[],
        data: UpdateForecastData,
        updateForCurrentMonth: boolean = false,
        mtd: { [key: string]: number } | null = null,
        buomToCs: string | number = 1,
    ): Promise<boolean | string[]> {
        logger.info(`Inside ArsModel -> updateInsertForecastDistribution: ${areaCode}, ${data?.pskuCode}`);
        const errorMessage: string[] = [];
        let sql: string = '';
        const { pskuCode } = data;
        const applicableMonth = updateForCurrentMonth ? Helper.applicableMonth('current') : Helper.applicableMonth('next');
        const totalDays = Helper.daysInMonth(applicableMonth);
        const weekStartEndWeekly: { [key: string]: number[] } = {
            weekly_week1: [1, 7, 7],
            weekly_week2: [8, 14, 7],
            weekly_week3: [15, 21, 7],
            weekly_week4: [22, totalDays, totalDays - 22 + 1],
        };
        const weekStartEndFortnightly = {
            fortnightly_week12: [1, 14, 14],
            fortnightly_week34: [15, totalDays, totalDays - 15 + 1],
        };
        /**
         * EDGE CASE SCENARIO(TO BE HANDLED):
         * User is updating for the current month and the next month forecast has not come.
         * Then adding 1day to the current date might overshoot the given month
         */
        /**
         * SOPE-2654: (https://tataconsumer.atlassian.net/browse/SOPE-2654): Forecast should be considered from 1st of any month irrespective of the day when it is uploaded
         * reverts logic of (https://tataconsumer.atlassian.net/browse/SOPE-1289)
         */
        // const dt = new Date();
        // dt.setDate(dt.getDate() + 1);
        // const startDate: number = updateForCurrentMonth ? +dt.getDate() : 1;

        const startDate = 1;
        if (forecastConfigResult?.length <= 0) {
            errorMessage.push(`No forecast configuration found for area ${areaCode}`);
            return errorMessage;
        }

        //find distributor customer group
        const division = await ArsModel.getPskuDivision(pskuCode);
        if (!division) {
            errorMessage.push(`Division not found for PSKU: ${pskuCode}`);
            return errorMessage;
        }

        const correspondingWeek = (date: number, weekStartEnd: { [key: string]: number[] }): [string, number[]] | null => {
            for (let [key, value] of Object.entries(weekStartEnd)) {
                if (date >= value[0] && date <= value[1]) {
                    return [key, value];
                }
            }
            return null;
        };

        for (let element of data.adjusted) {
            let pdp = await ArsModel.getDistributorPdp(element.distributorCode, division);
            if (!pdp) {
                // errorMessage.push(`PDP not found for DB: ${element.distributorCode}, Division: ${division}, Hence considering everyday PDP.`);
                pdp = EVERYDAY_PDP; //considering everyday PDP, since if PDP is not defined from SAP, then the distributor can order everyday
            }
            const customerGroup = (await ArsModel.getDistributorCustomerGroup(element.distributorCode))?.split('#')?.[0];
            const config_data = forecastConfigResult?.find((i) => i.customer_group === customerGroup);
            if (!customerGroup || !config_data) {
                errorMessage.push(`Customer Group/Phasing not found for DB: ${element.distributorCode}`);
                continue;
            }
            let sqlStatement = `INSERT INTO forecast_distribution(distributor_code, psku, applicable_month, pdp,division, class`;
            let valuesStatement = `VALUES ('${element.distributorCode}', '${pskuCode}', '${applicableMonth}', '${pdp}','${division}', '${element.pskuClass}'`;

            let dateExclusionStatement = '';
            for (let i = startDate; i <= totalDays; i++) {
                dateExclusionStatement += `_${i} = EXCLUDED._${i},`;
            }

            /**
             * SCENARIO:
             * When ASM update the quantity norm, then PSKU class in forecast_distribution is "Q", but remain unchanged in sales_allocation
             * But on "Submit"/ "Auto-Submit" of the forecast,PSKU class is fetched from sales_allocation, which if not checked, will override the PSKU class "Q".
             * SOLUTION:
             * He we have applied check. if the PSKU class in forecast_distribution is not 'Q' then only update with the PSKU class of the sales_allocation.
             */
            const conflictQuery = `
                ON CONFLICT (distributor_code,psku,applicable_month) DO UPDATE SET
                ${dateExclusionStatement}
                updated_on = NOW(),
                division = EXCLUDED.division,
                "class" = CASE 
                    WHEN forecast_distribution."class" != 'Q' THEN EXCLUDED."class" 
                    WHEN forecast_distribution."class" IS NULL THEN EXCLUDED."class"
                    ELSE forecast_distribution."class" END,
                pdp = EXCLUDED.pdp;
                `;
            /**
             * SOPE-1289: Adjustment to be done by ASM in between of the month
             * Forecast readjustment:
             * newApplicableForecast = updated_allocation - MTD
             * 1. data for all elapsed days till today will be same
             * 2. For current week:
             *      remaining each day value = newApplicableForecast * (current week% / 100) / (end of the week - today)
             * 3. For each day in upcoming weeks: = newApplicableForecast * (week% / 100) / (end - start +1)
             */
            if (updateForCurrentMonth && mtd) {
                const mtdValue = mtd[element.distributorCode] ?? 0;
                element.updated_allocation -= mtdValue * +buomToCs ?? 0;
            }

            if (pdp?.substring(0, 2) === 'WE') {
                const currentWeek = correspondingWeek(startDate, weekStartEndWeekly);
                for (let i = startDate; i <= totalDays; i++) {
                    sqlStatement += `, _${i}`;
                    let distribution: number = 0;
                    const [key, [start, end, length]] = correspondingWeek(i, weekStartEndWeekly) ?? [null, [null, null, null]];

                    // current month and current week
                    if (updateForCurrentMonth && i > currentWeek[1][0] && i <= currentWeek[1][1]) {
                        distribution = (+element.updated_allocation * (+config_data[key] / 100)) / (end - startDate + 1);
                    } else {
                        // upcoming
                        distribution = (+element.updated_allocation * (+config_data[key] / 100)) / length;
                    }
                    valuesStatement += `, ${distribution.toFixed(5)}`;
                }
            } else if (pdp?.substring(0, 2) === 'FN') {
                const currentWeek = correspondingWeek(startDate, weekStartEndFortnightly);
                for (let i = startDate; i <= totalDays; i++) {
                    sqlStatement += `, _${i}`;
                    let distribution: number = 0;
                    const [key, [start, end, length]] = correspondingWeek(i, weekStartEndFortnightly) ?? [null, [null, null, null]];
                    // current month and current week
                    if (updateForCurrentMonth && i > currentWeek[1][0] && i <= currentWeek[1][1]) {
                        distribution = (+element.updated_allocation * (+config_data[key] / 100)) / (end - startDate + 1);
                    } else {
                        // upcoming
                        distribution = (+element.updated_allocation * (+config_data[key] / 100)) / length;
                    }
                    valuesStatement += `, ${distribution.toFixed(5)}`;
                }
            }
            sqlStatement += ')';
            valuesStatement += ')';
            sqlStatement += valuesStatement + conflictQuery;
            sql += sqlStatement;
            sqlStatement = '';
            valuesStatement = '';
        }

        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sql);
            if (!result) errorMessage.push(`Failed updateInsertForecastDistribution  for ${sql}`);
            else logger.info(`SUCCESS: ArsModel -> updateInsertForecastDistribution for ${areaCode}, ${data?.pskuCode}`);
        } catch (error) {
            errorMessage.push(`Caught Error in upsertForecastDistribution,SQL: ${sql} :: ERROR: ${JSON.stringify(error)}`);
        } finally {
            AuditModel.upsertForecastDistributionLogs([
                {
                    area_code: areaCode,
                    psku: data.pskuCode,
                    applicable_month: applicableMonth,
                    error_log: JSON.stringify(errorMessage),
                    payload: data.adjusted as [],
                    query: sql,
                },
            ]);
            client?.release();
        }
    },

    async getStockNorm(distributorIds: string, applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> getStockNorm, distributorIds: ' + distributorIds + ' ,applicableMonth: ' + applicableMonth);

        let client: PoolClient | null = null;
        try {
            distributorIds = distributorIds.trim();
            const db_string = distributorIds
                .split(',')
                .map((item) => `'${item.trim()}'`)
                .join(',');
            console.log('db_string', db_string);
            const db_query = distributorIds.length > 5 ? `AND snc.dist_id IN (${db_string})` : '';
            const sqlStatement = `
                            SELECT	
                                snc.dist_id
                                ,snc.psku
                                ,COALESCE(snc.stock_norm,0) AS stock_norm
                                ,COALESCE(snc.ss_percent,0) AS ss_percent
                                ,COALESCE(mm.pak_to_cs, 1) AS pak_to_cs
                                ,COALESCE(mm.buom_to_cs, 1) AS buom_to_cs
                            FROM stock_norm_config snc
                            LEFT JOIN material_master mm ON (mm.code = snc.psku)
                            WHERE snc.dist_id IS NOT NULL
                                ${db_query}
                                AND snc.applicable_month = $1
                                ORDER BY snc.dist_id , snc.psku;
                            `;
            client = await conn.getReadClient();
            // console.log('sqlStatement', sqlStatement);
            const result = await client.query(sqlStatement, [applicableMonth]);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getStockNorm', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async downloadStockNormAudit(payload: { customer_group?: string; arsEnabledDB: boolean; distIdArr?: string[] | null; areaCodes?: string[] | null }) {
        logger.info('inside ArsModel -> downloadStockNormAudit');
        let client: PoolClient | null = null;
        try {
            const arsFilter = payload.arsEnabledDB ? `and dm.ao_enable = true` : ``;
            const customerGroupFilter = payload.customer_group ? ` AND cgm."name" = '${payload.customer_group}'` : '';
            const dbFilter = payload.distIdArr && payload.distIdArr.length > 0 ? `and snc.dist_id in ('${payload.distIdArr.join("','")}')` : '';
            const areaCodeFilter = payload.areaCodes && payload?.areaCodes?.length > 0 ? ` AND dm.area_code IN ('${payload?.areaCodes.join("','")}')` : '';
            const sqlStatement = `
            WITH latest AS (
                SELECT
                    asm_code,
                    max(created_on)AS created
                FROM
                    sales_allocation sa
                GROUP BY
                    asm_code
            ),
            psku_class AS (
                SELECT
                    sold_to_party,
                    parent_sku,
                    CLASS
                FROM
                    sales_allocation sa
                INNER JOIN latest l ON
                    l.asm_code = sa.asm_code
                    AND l.created = sa.created_on
            )
            SELECT
                dm.area_code AS "Area Code",
                dm.id AS "Distributor Code",
                up.name AS "Distributor Name",
                cgm.description as "Customer Group",
                snc.psku AS "PSKU",
                mm.description AS "PSKU Description",
                pc.CLASS AS "Class",
                snc.stock_norm AS "Stock Norm(Days)"
            FROM
                stock_norm_config snc
            INNER JOIN psku_class pc ON
                pc.sold_to_party = snc.dist_id
                AND pc.parent_sku = snc.psku
            INNER JOIN distributor_master dm ON
                dm.id = snc.dist_id
            INNER JOIN customer_group_master cgm ON
                cgm.id = dm.group_id
            INNER JOIN user_profile up ON
                up.id = dm.profile_id
            INNER JOIN material_master mm ON
                mm.code = snc.psku
            INNER JOIN area_codes ac ON
                ac.code = dm.area_code
                AND ac.group5_id = dm.group5_id
            WHERE
                snc.applicable_month = (
                    SELECT
                        max(applicable_month)
                    FROM
                        stock_norm_config snc2
                )
                AND mm.status = 'ACTIVE'
                AND mm.deleted = 'false'
                ${customerGroupFilter}
                ${arsFilter}
                ${dbFilter}
                ${areaCodeFilter}
                AND dm.area_code IS NOT NULL
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            console.log('inside ArsModel -> downloadStockNormAudit', result?.rowCount);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> downloadStockNormAudit', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getStockNormAudit(payload: { limit: number; offset: number; customer_group: string; arsEnabledDB: boolean; distIdArr: string[] | null }) {
        logger.info('inside ArsModel -> getStockNormAudit');

        let client: PoolClient | null = null;
        try {
            const arsFilter = payload.arsEnabledDB ? `and dm.ao_enable = true` : ``;
            const limit = payload.limit ?? 10;
            const offset = payload.offset ?? 0;
            const customerGroup = payload.customer_group;
            const dbFilter = payload.distIdArr && payload.distIdArr.length > 0 ? `and snc.dist_id in ('${payload.distIdArr.join("','")}')` : '';

            const limitCondition = limit > 0 ? `LIMIT ${limit}` : '';

            //Added count(*) OVER() row_count to get the total rows even after the limit

            const sqlStatement = `
        WITH unique_dist AS (
          SELECT DISTINCT dist_id, dm.area_code
          FROM stock_norm_config snc
          INNER JOIN distributor_master dm ON dm.id = dist_id
          INNER JOIN customer_group_master cgm ON cgm.id = dm.group_id
          INNER JOIN material_master mm ON mm.code = snc.psku
          WHERE
              dm.deleted = false
              AND cgm."name" = '${customerGroup}'
              AND mm.status = 'ACTIVE'
              AND mm.deleted = 'false'
              ${arsFilter}
              ${dbFilter}
        ),
        distributor_pdp AS (
          SELECT 
            distributor_id,
             up."name",
            jsonb_agg(jsonb_build_object('pdp', pdp_day, 'division', division, 'division_description', division_description, 'distribution_channel', distribution_channel)) AS pdp_details
          FROM distributor_plants dp
          INNER JOIN unique_dist ud ON ud.dist_id = distributor_id
          INNER JOIN user_profile up ON dp.distributor_id = up.id
          GROUP BY distributor_id, up.name
        )
        SELECT
          unique_dist.dist_id,
          unique_dist.area_code,
          dp."name",
          dp.pdp_details,
          count(*) OVER () AS row_count
        FROM unique_dist
        LEFT JOIN distributor_pdp dp ON dp.distributor_id = unique_dist.dist_id
        ORDER BY dp."name"
        ${limitCondition}
        OFFSET ${offset}`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            logger.info('inside ArsModel -> getStockNormAudit: Query executed successfully', result?.rowCount);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getStockNormAudit', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getDistributorPdp(distributorCode: string, division: string) {
        if (!distributorCode || !division) {
            return null;
        }
        let client: PoolClient | null = null;
        try {
            const distributorPdpQuery = `SELECT PDP_DAY
                    FROM DISTRIBUTOR_PLANTS
                    WHERE DISTRIBUTOR_ID = $1
                        AND DIVISION = $2
                        AND DISTRIBUTION_CHANNEL = 10`;
            client = await conn.getReadClient();
            const distributorPdpResult = await client.query(distributorPdpQuery, [distributorCode, +division]);
            const pdp = distributorPdpResult?.rows[0]?.pdp_day;
            if (pdp) {
                return pdp;
            }
            return null;
        } catch (error) {
            logger.error('Error pdp not found', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getPskuDivision(pskuCode: string) {
        if (!pskuCode) {
            logger.error('Error: PSKU code not provided');
            return null;
        }
        let client: PoolClient | null = null;
        try {
            const pskuDivisionQuery = `SELECT 
                    DIVISION
                    FROM material_sales_details
                    WHERE MATERIAL_CODE = $1
                    LIMIT 1;`;
            client = await conn.getReadClient();
            const pskuDivisionResult = await client.query(pskuDivisionQuery, [pskuCode]);
            if (pskuDivisionResult && pskuDivisionResult.rowCount > 0) {
                const division = pskuDivisionResult?.rows[0]?.division;
                return division;
            }
            return null;
        } catch (error) {
            logger.error('Error in getPskuDivision', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getAreaCodeForDist(distId: number | string) {
        logger.info('inside ArsModel -> getAreaCodeForDist');
        let client: PoolClient | null = null;
        try {
            // Check if there is forecast for distributor and forecast is submitted
            const checkForecastQuery = `select dm.area_code from distributor_master dm where dm.id = $1 limit 1`;
            client = await conn.getReadClient();
            return client.query(checkForecastQuery, [distId]).then((res) => {
                return res.rows[0].area_code;
            });
        } catch (error) {
            logger.error('Error in ArsModel -> getAreaCodeForDist', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async checkForecastForDist(distId: number, area_code: string) {
        logger.info('inside ArsModel -> checkForecastForDist');
        let client: PoolClient | null = null;
        try {
            const timeSqlStatement = await Helper.forecastTimeStatementForCurrentMonthForecast(area_code);
            // Check if there is forecast for distributor and forecast is submitted
            const checkForecastQuery = `SELECT COUNT(sold_to_party) FROM sales_allocation sa WHERE sold_to_party = $1 
            and sa.created_on = (${timeSqlStatement})`;
            client = await conn.getReadClient();
            const result = await client.query(checkForecastQuery, [distId]);
            return result?.rows[0].count;
        } catch (error) {
            logger.error('Error in ArsModel -> getAreaCodeForDist', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async getForecastedPSKUDistWise(distId: number | string | number[] | string[], applicableMonth: string = Helper.applicableMonth()): Promise<ForecastedPskuDistWise[] | null> {
        logger.info('inside ArsModel -> getForecastedPSKUDistWise');
        let client: PoolClient | null = null;
        try {
            let distributors;
            if (typeof distId === 'number' || typeof distId === 'string') {
                distributors = [distId];
            } else {
                distributors = distId;
            }

            const getPSKUDistWiseQuery = `
            SELECT
                DISTINCT distributor_code,
                fd.psku AS sku,
                fd."class",
                mm.pak_to_cs,
                mm.buom_to_cs
            FROM
                forecast_distribution fd
            INNER JOIN material_master mm ON
                mm.code = fd.psku
            WHERE
                fd.distributor_code = ANY($1)
                AND fd.applicable_month = $2
                AND mm.status = 'ACTIVE'
                AND mm.deleted = FALSE;
            `;

            const queryConfig = {
                text: getPSKUDistWiseQuery,
                values: [distributors, applicableMonth],
            };
            client = await conn.getReadClient();
            const result = await client.query(queryConfig);
            const rows: ForecastedPskuDistWise[] = result?.rows;
            return rows ?? null;
        } catch (error) {
            logger.error('Error in ArsModel -> getForecastedPSKUDistWise', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
    async getNormCycleSafetyValues(distId: string) {
        logger.info('inside ArsModel -> getNormCycleSafetyValues');
        let client: PoolClient | null = null;
        try {
            // Make query and pull out all the PSKU in forecast for distributor
            const getPSKUDistWiseQuery = `select 
                            ms.parent_sku as psku, 
                            ms.cycle_stock as cs, 
                            ms.safety_stock as ss, ms.total_stock_norms_in_days as sn
                            from material_stock ms`;

            client = await conn.getReadClient();
            return client.query(getPSKUDistWiseQuery).then((res) => {
                let array = {};
                return res.rows.map((ele) => {
                    array[ele.psku] = ele.sn;
                    return array;
                });
            });
        } catch (error) {
            logger.error('Error in ArsModel -> getNormCycleSafetyValues', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getPdpPskuWise(distId: string, division: any, area_code: string) {
        logger.info('inside ArsModel -> getPdpPskuWise');
        let client: PoolClient | null = null;
        try {
            const pdpPskuWiseQuery = `select fd.psku as psku, fd.pdp as pdp from forecast_distribution fd 
                    where psku in (select distinct (sa.parent_sku) from sales_allocation sa
                        where sold_to_party = fd.distributor_code  and 
                        sa.created_on = (select max(sa2.created_on) from sales_allocation sa2 where sa2.asm_code = $3))
                    and fd.distributor_code = $1 and division = $2`;

            client = await conn.getReadClient();
            return client.query(pdpPskuWiseQuery, [distId, division, area_code]).then((res) => {
                return res.rows;
            });
        } catch (error) {
            logger.error('Error in ArsModel -> getPdpPskuWise', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getDistPdpDistribution(distId: number, division: Array<number> = [], applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> getDistPdpDistribution');
        let client: PoolClient | null = null;
        try {
            const divisionString = division.join(`','`);
            const divisionQuery = division.length > 0 ? ` and fd.division in ('${divisionString}')` : '';
            /**
             * SOPE-5107: https://tataconsumer.atlassian.net/browse/SOPE-5107:
             * If PDP is not defined for the distributor in distributor_plants, then it should be considered pdp available in forecast_distribution
             * If pdp is not defined in the correct format, then it should be considered as EVERYDAY_PDP
             */
            const query = `
                select
                    distinct 
                    fd.psku,
                    CASE
                        WHEN coalesce(dp.pdp_day, fd.pdp) ~ '^(WE|FN)((SU|MO|TU|WE|TH|FR|SA)+)$'
                            THEN coalesce(dp.pdp_day, fd.pdp)
                        ELSE '${EVERYDAY_PDP}'
                    END as pdp,
                    dp.division
                from
                    forecast_distribution fd
                inner join distributor_plants dp on
                    (dp.distributor_id = fd.distributor_code
                        and dp.division::text = fd.division
                        and dp.distribution_channel = 10)
                where
                    fd.distributor_code = $1
                    and fd.applicable_month = $2
                    ${divisionQuery}
                    `;

            client = await conn.getReadClient();
            return client.query(query, [distId, applicableMonth]).then((res) => {
                return res.rows;
            });
        } catch (error) {
            logger.error('Error in ArsModel -> getDistPdpDistribution', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getStockNormTotal(distId: number, weekColumnArrs: Array<number>) {
        logger.info('inside ArsModel -> getStockNormTotal');
        let client: PoolClient | null = null;
        // Initialise the variables
        let query = '',
            rows: any[] = [],
            result;

        try {
            client = await conn.getReadClient();
            for (let weekColumnArr of weekColumnArrs) {
                // Check if the overflow of days to next month exists
                // Query changes for two rows sumation
                if (Object.keys(weekColumnArr).includes('next') && weekColumnArr[weekColumnArr['current']].length > 0 && weekColumnArr[weekColumnArr['next']].length > 0) {
                    query = `select (
                    coalesce((select (${_.join(weekColumnArr[weekColumnArr['current']], ' + ')}) as val from forecast_distribution fd1 where fd1.distributor_code = fd3.distributor_code and fd1.applicable_month = $1 and fd1.psku = fd3.psku  order by fd1.division desc limit 1), 0) + 
                    coalesce((select (${_.join(weekColumnArr[weekColumnArr['next']], ' + ')}) as val from forecast_distribution fd2 where fd2.distributor_code = fd3.distributor_code and fd2.applicable_month = $2  and fd2.psku = fd3.psku order  by fd2.division desc limit 1), 0))
                    as val, fd3.psku, fd3.distributor_code from forecast_distribution fd3 where fd3.distributor_code = $3 and fd3.psku in ('${weekColumnArr['psku'].join(`','`)}')
                    group by fd3.psku, fd3.distributor_code`;
                    let result = await client.query(query, [weekColumnArr['current'], weekColumnArr['next'], distId]);
                    rows = [...rows, ...result.rows];
                } else if (weekColumnArr[weekColumnArr['current']].length > 0) {
                    // if overflow of months dosent exists then run the original query.
                    query = `select (${_.join(weekColumnArr[weekColumnArr['current']], ' + ')}) as val, fd.psku
                    from forecast_distribution fd 
                    where fd.distributor_code = $1
                    and fd.applicable_month = '${weekColumnArr['current']}'
                    and fd.psku in ('${weekColumnArr['psku'].join(`','`)}')`;

                    result = await client.query(query, [distId]);
                    rows = [...rows, ...result.rows];
                }
            }
            return rows;
        } catch (error) {
            logger.error('Error in ArsModel -> getStockNormTotal', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getMaterialConversion(area_code: string | null = null) {
        logger.info('inside ArsModel -> getMaterialConversion');

        let client: PoolClient | null = null;
        try {
            let sqlStatement = `select mm.code, mm.pak_to_cs, mm.buom_to_cs from material_master mm `;
            const whereClause: string[] = [];
            whereClause.push(`mm.status = 'ACTIVE'`);
            whereClause.push('mm.deleted = FALSE');
            area_code &&
                whereClause.push(`mm.code in (select distinct (sa.parent_sku) from sales_allocation sa
                                    where sa.created_on = (select max(sa2.created_on) from sales_allocation sa2 where sa2.asm_code = $1))`);
            client = await conn.getReadClient();
            sqlStatement += whereClause.length > 0 ? ` where ${whereClause.join(' and ')}` : '';
            const values = area_code ? [area_code] : [];
            const result = await client.query(sqlStatement, values);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getMaterialConversion', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchUpdatedForecast(areaCode: string, forecast_sync: boolean) {
        logger.info(`inside ArsModel -> fetchUpdatedForecast: Area Code: ${areaCode}`);

        let client: PoolClient | null = null;
        try {
            let timeSqlStatement = '';
            if (forecast_sync) {
                timeSqlStatement = await Helper.forecastTimeStatementForCurrentMonthForecast(areaCode);
            } else {
                timeSqlStatement = `SELECT max(created_on) FROM sales_allocation WHERE asm_code = '${areaCode}'`;
            }
            const sqlStatement = `SELECT DISTINCT ON(sa.parent_sku)
                                    sa.parent_sku,
                                    array_agg(sa.key) AS sa_id,
                                    array_agg(usa.key) AS ua_id,
                                    array_agg(sa.sold_to_party) AS distributorCode,
                                    array_agg(usa.updated_allocation) AS updated_allocation,
                                    array_agg(sa.class) as psku_class
                                    FROM sales_allocation AS sa LEFT JOIN updated_sales_allocation AS usa 
                                    ON sa.key = usa.sales_allocation_key 
                                    WHERE sa.asm_code = $1 AND sa.created_on = (${timeSqlStatement})
                                    GROUP BY sa.parent_sku`;
            const queryConfig = {
                text: sqlStatement,
                values: [areaCode],
            };
            client = await conn.getWriteClient();
            const result = await client.query(queryConfig);
            return result.rows;
        } catch (error) {
            logger.error(`Error in ArsModel -> fetchUpdatedForecast: Area Code: ${areaCode}`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchAreaCodes() {
        /**
         * Fetching the area codes for which ARS is applicable
         */
        logger.info('inside ArsModel -> fetchAreaCode');

        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `select ac.code , gm.description as region
                                from area_codes ac
                                inner join group5_master gm on(gm.id = ac.group5_id) 
                                where ac.group5_id is not null
                                and ars_applicable = TRUE
                                order by ac.code;`;
            const res = await client.query(sqlStatement);
            if (res && res.rowCount > 0) return res.rows;
            return null;
        } catch (error) {
            logger.error('Error in ArsModel -> fetchAreaCode', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async checkForecastSyncStatus(areaCode: string) {
        let client: PoolClient | null = null;
        try {
            const date = new Date();
            const currentMonth = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-01`;
            const sqlStatementSalesAllocation = `
                                                select
                                                    status
                                                from
                                                    forecast_sync_status fss
                                                where
                                                    area_code = $1
                                                    and "date"::date >= $2
                                                    and message ilike '%sales_allocation%'
                                                order by
                                                    "date" desc
                                                limit 1;`;
            const sqlStatementMonthlySales = `
                                            select
                                                status
                                            from
                                                forecast_sync_status fss
                                            where
                                                area_code = $1
                                                and "date"::date >= $2
                                                and message ilike '%monthly_sales%'
                                            order by
                                                "date" desc
                                            limit 1;`;
            /**
             * checking the last sync status for sales_allocation and monthly_sales separately
             */
            client = await conn.getReadClient();
            const salesAllocationResult = await client.query(sqlStatementSalesAllocation, [areaCode, currentMonth]);
            const monthlySalesResult = await client.query(sqlStatementMonthlySales, [areaCode, currentMonth]);
            return {
                salesAllocationStatus: salesAllocationResult?.rows[0]?.status,
                monthlySalesStatus: monthlySalesResult?.rows[0]?.status,
            };
        } catch (error) {
            logger.error('Error in ArsModel -> checkForecastSyncStatus', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async distributorLevelForecastValidation(area: string) {
        logger.info('inside ArsModel -> distributorLevelForecastValidation');

        let client: PoolClient | null = null;

        try {
            const sqlStatement = `
                                select
                                    dm.area_code,
                                    dm.profile_id as distributor_code,
                                    up.name as distributor_name
                                from
                                    distributor_master dm
                                inner join user_profile up 
                                on
                                    up.id = dm.profile_id
                                where
                                    dm.profile_id in (
                                    select
                                        dm.profile_id
                                    from
                                        distributor_master dm
                                    inner join customer_group_master cgm 
                                on
                                        cgm.id = dm.group_id
                                    where
                                        dm.area_code = $1
                                        and dm.status = 'ACTIVE'
                                        and dm.deleted = false
                                        and cgm."name"  = any ($2)
                                except
                                    select
                                        sa.sold_to_party
                                    from
                                        sales_allocation sa
                                    where
                                        sa.asm_code = $1
                                        and sa.created_on = (
                                        select
                                            max(created_on)
                                        from
                                            sales_allocation sa
                                        where
                                            sa.asm_code = $1)
                                        )
                                `;
            client = await conn.getReadClient();
            const res = await client.query(sqlStatement, [area, ['10', '31']]);
            if (res && res.rowCount > 0) return res.rows;
            return null;
        } catch (error) {
            logger.error('Error in ArsModel -> distributorLevelForecastValidation', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async fetchArsReport(areaCode: string = 'ALL') {
        logger.info('inside ArsModel -> fetchArsReport');

        let client: PoolClient | null = null;

        try {
            const areaCodeCondition = areaCode !== 'ALL' ? `where DM.AREA_CODE = '${areaCode}'` : '';
            const sqlStatement = `
                    with ArsItemset_Expanded as(
                        select
                            id,
                                jsonb_array_elements(order_data->'ArsItemset') as ars_item
                        from
                            orders o
                        where
                            O.ORDER_TYPE = 'ARS'
                            and O.STATUS != 'DRAFT'
                            and O.CREATED_ON::date = (select (CURRENT_DATE - interval '1 day')::date)
                    ),
                    Itemset_Expanded as (
                        select
                            id,
                            (order_data -> 'PDP')::jsonb #>> '{}' as PDP,
                            jsonb_array_elements(order_data->'Itemset') as item
                        from
                            orders o
                        where
                            so_number is not null
                            and so_number != ''
                            and O.ORDER_TYPE = 'ARS'
                            and O.STATUS != 'DRAFT'
                            and O.CREATED_ON::date = (select (CURRENT_DATE - interval '1 day')::date)
                    ),
                    order_details as (
                        select
                            ie.id,
                            ie.PDP as PDP,
                            item ->> 'MATERIAL' as PSKU,
                            item ->> 'DESCRIPTION' as PSKU_DESCRIPTION,
                            item ->> 'TARGET_QTY' as ORDERED_QUANTITY,
                            ars_item ->> 'original_quantity' as SUGGESTED_ORDER_QUANTITY,
                            ars_item ->> 'stock_norm_days'as stock_norm_days,
                            CASE
                                WHEN item ->> 'stock_in_hand' = 'None' OR item ->> 'stock_in_hand' = '' THEN NULL
                                ELSE item ->> 'stock_in_hand'
                            END AS STOCK_IN_HAND,
                            CASE
                                WHEN item ->> 'stock_in_transit' = 'None' OR item ->> 'stock_in_transit' = '' THEN NULL
                                ELSE item ->> 'stock_in_transit'
                            END AS STOCK_IN_TRANSIT,
                            CASE
                                WHEN item ->> 'open_order' = 'None' OR item ->> 'open_order' = '' THEN NULL
                                ELSE item ->> 'open_order'
                            END AS OPEN_ORDERS,
                            item ->> 'TENTATIVE'as TENTATIVE
                        from Itemset_Expanded  as ie
                        left join ArsItemset_Expanded as ae
                            on item->> 'MATERIAL' = ars_item ->> 'material_code'
                            and ae.id = ie.id
                    )
                    select
                        distinct
                        O.created_on  as "Order Date",
                        o.DISTRIBUTOR_ID as "Distributor ID",
                        up.name as "Distributor Name",
                        dm.TSE_CODE as "TSE Code",
                        dm.AREA_CODE as "Area Code",
                        g5m.description AS "Region",
                        cgm.name AS "Customer Group",
                        cgm.description as "Customer Group Description",
                        PO_NUMBER as "PO Number",
                        SO_NUMBER as "SO Number",
                        OD.PSKU as "Parent SKU",
                        PSKU_DESCRIPTION as "Parent SKU Description",
                        TENTATIVE as "Tentative Value(₹)",
                        ORDERED_QUANTITY::numeric as "Confirmed  Quantity(CV)",
                        coalesce (SUGGESTED_ORDER_QUANTITY::numeric, 0) as "Suggested Quantity(CV)",
                        coalesce (FD."class", 'C') AS "Class",
                        coalesce (STOCK_NORM_DAYS, '0') AS "Stock Norm(Days)",
                        case
                            when coalesce (STOCK_NORM_DAYS, '0') = '0' then 0
                            else
                                round(coalesce (nullif (SUGGESTED_ORDER_QUANTITY,''),'0')::numeric
                                    + coalesce (nullif (STOCK_IN_HAND,''),'0')::numeric
                                    + coalesce (nullif (STOCK_IN_TRANSIT,''),'0')::numeric
                                    + coalesce (nullif (OPEN_ORDERS,''),'0')::numeric)
                        end as "Stock Norm(CV)" ,
                        ceiling(coalesce (nullif (STOCK_IN_HAND,''),'0')::numeric) as "Stock In Hand(CV)",
                        ceiling(coalesce (nullif (STOCK_IN_TRANSIT,''),'0')::numeric) as "Stock In Transit(CV)",
                        ceiling(coalesce (nullif (OPEN_ORDERS,''),'0')::numeric) as "Open Order  Quantity(CV)",
                        OD.PDP
                    from orders o
                    inner join
                        ORDER_DETAILS OD on o.id = od.id
                        inner join distributor_master dm on dm.id = o.distributor_id
                        inner join user_profile up on up.id= dm.profile_id
                    left JOIN FORECAST_DISTRIBUTION FD ON
                    (
                        FD.DISTRIBUTOR_CODE = O.DISTRIBUTOR_ID
                        AND FD.PSKU = OD.PSKU
                        and FD.applicable_month = (extract(year from O.created_on)::text || LPAD(extract(month from O.created_on)::text, 2, '0'))
                    )
                    INNER JOIN group5_master g5m ON g5m.id=dm.group5_id
                    INNER JOIN customer_group_master cgm on cgm.id = dm.group_id
                    ${areaCodeCondition}`;
            client = await conn.getReadClient();
            const res = await client.query(sqlStatement);
            if (res && res.rowCount > 0) return res.rows;
            return null;
        } catch (error) {
            logger.error('Error in ArsModel -> fetchArsReport', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchSafetyStockData() {
        logger.info('inside ArsModel -> fetchSafetyStockData');
        let client: PoolClient | null = null;

        try {
            let ss_sih_cgs = Helper.ssSihCgs() != null ? `AND cgm.name IN (${Helper.ssSihCgs()})` : '';
            const sqlStatement = `
                    SELECT dm.profile_id, 
                        up.name,
                        up.email AS db_email,
                        cgm.name || ' - ' || cgm.description AS customer_group,
                        g5m.name || ' - ' || g5m.description AS region,
                        dm.tse_code,
                        shd.email AS tse_email,
                        dm.area_code,
                        s_h_d.email AS asm_email,
                        calc_ss(dm.profile_id,dm.area_code) AS ss_data
                    FROM distributor_master AS  dm 
                    INNER JOIN user_profile AS up 
                    ON dm.profile_id = up.id 
                    LEFT JOIN sales_hierarchy_details AS shd 
                    ON (shd.code LIKE '%'||dm.tse_code||'%'  AND shd.deleted = false AND 'TSE' = ANY(shd.roles))
                    LEFT JOIN sales_hierarchy_details AS s_h_d 
                    ON (s_h_d.user_id  = shd.manager_id  AND s_h_d.deleted = false AND 'ASM' = ANY(s_h_d.roles))
                    INNER JOIN customer_group_master AS cgm 
                    ON (dm.group_id = cgm.id)
                    INNER JOIN group5_master AS g5m 
                    ON (dm.group5_id = g5m.id)
                    WHERE dm.ao_enable = true AND 
                        dm.status = 'ACTIVE' AND 
                        dm.deleted = false AND 
                        dm.tse_code IS NOT NULL AND 
                        dm.area_code IS NOT NULL ${ss_sih_cgs};
                        `;
            client = await conn.getReadClient();
            const res = await client.query(sqlStatement);
            if (res && res.rowCount > 0) return res.rows;
            return null;
        } catch (error) {
            logger.error('inside ArsModel -> fetchSafetyStockData, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async enableDisablePdp(dbList: string[], isPdp: boolean, comments: string) {
        logger.info('inside ArsModel -> enableDisablePdp, pdp: ' + isPdp + ' ,dbList: ' + dbList.toString());
        let client: PoolClient | null = null;

        try {
            if (dbList.length < 1) return [];
            const dbListString = dbList.map((db) => `'${db}'`).join(',');
            const indicator = isPdp ? 'ARS_JOB_LOCK' : 'ARS_JOB_UNLOCK';
            const sqlStatement = `
                    WITH updated_dbs AS (UPDATE distributor_master 
                                        SET enable_pdp = ${isPdp} 
                                        WHERE profile_id IN (${dbListString})
                                            AND enable_pdp != ${isPdp}
                                        RETURNING id)
                    INSERT INTO pdp_lock_audit_trail (distributor_id, status, updated_by, request_id, comments)
                    SELECT id, ${isPdp}, 'SYSTEM_GENERATED', '${indicator}', '${comments}'
                    FROM updated_dbs
                    RETURNING distributor_id;
                `;
            client = await conn.getWriteClient();
            // console.log(sqlStatement);
            const res = await client.query(sqlStatement);
            const dbsUpdated = res.rows.map((row: any) => row.distributor_id);
            return dbsUpdated;
        } catch (error) {
            logger.error('inside ArsModel -> enableDisablePdp, Error: ', error);
            return false;
        } finally {
            if (client != null) client.release();
        }
    },

    async insertSihSSLog(dbList: any[]) {
        logger.info('inside ArsModel -> insertSihSSLog');
        let client: PoolClient | null = null;

        try {
            let values: string[] = [];
            dbList.forEach((l) => {
                values.push(
                    `( '${l.region}', '${l.area_code}', '${l.asm_email}', '${l.tse_code}', '${l.tse_email}', '${l.db_code}', '${l.db_email}','${l.pskus_checked}', ${l.email_sent}, '${l.email_type}')`,
                );
            });
            const sqlStatement = `
                                    INSERT INTO sih_ss_email_log(region, area_code, asm_email, tse_code, tse_email, db_code, db_email, pskus_checked, email_sent, email_type)
                                    VALUES ${values.toString()};
                                `;
            client = await conn.getWriteClient();
            const res = await client.query(sqlStatement);
            if (res && res.rowCount > 0) return true;
            return false;
        } catch (error) {
            logger.error('inside ArsModel -> insertSihSSLog, Error: ', error);
            return false;
        } finally {
            if (client != null) client.release();
        }
    },

    async forecastSummaryAll(areaCode: string) {
        /**
         * Function is being used for downloading forecast data for all distributors for an area.
         * https://tataconsumer.atlassian.net/browse/SOPE-1346: Restricting 0 values for upload and download
         * https://tataconsumer.atlassian.net/browse/SOPE-2088: Update of forecast download and upload logic to allow 0 forecast items as well
         */
        logger.info('inside ArsModel -> forecastSummaryAll');
        let client: PoolClient | null = null;
        //Inner join with distributor plants used as distribution runs only on the distributors that are present in distributor_plants
        const sqlStatement = `
        WITH snc as (
            SELECT * FROM stock_norm_config snc2 where snc2.applicable_month = $2
        )
        SELECT
            sa."key",
            sa."class",
            sa.sold_to_party,
            sa.customer_name,
            sa.parent_sku,
            sa.parent_desc,
            ROUND(sa.by_allocation,2)::float AS forecast,
            COALESCE(ROUND(usa.updated_allocation,2), ROUND(sa.by_allocation,2))::float as adjusted_forecast,
            jsonb_object_agg(
            COALESCE (ms.year_month ,to_char(now(), 'YYYYMM')),
            COALESCE (ROUND(ms.billing_quantity_in_base_unit),0)) AS monthly_sales,
            dm.tse_code,
            sa.asm_code as area_code,
            mm.buom,
            mm.buom_to_cs,
            COALESCE(snc.stock_norm,0) stock_norm,
            CASE
                WHEN dm.deleted = FALSE then 'Active'
                ELSE 'Inactive'
            END status,
            cgm.name as customer_group,
            cgm.description as customer_group_description
        FROM
            sales_allocation sa
        LEFT JOIN updated_sales_allocation usa ON
            usa.sales_allocation_key = sa."key"
        LEFT JOIN monthly_sales ms ON
            ms.sold_to_party = sa.sold_to_party
            AND ms.parent_sku = sa.parent_sku
            AND ms.created_on IN (SELECT max(ms2.created_on) from monthly_sales ms2 where ms2.asm_code = $1)
        INNER JOIN distributor_master dm ON dm.id = sa.sold_to_party
        INNER JOIN customer_group_master cgm on cgm.id = dm.group_id
        LEFT JOIN material_master mm ON mm.code = sa.parent_sku
        LEFT JOIN snc ON snc.psku = sa.parent_sku  AND dm.id = snc.dist_id
        WHERE
            sa.asm_code = $1
            AND sa.created_on = (
            SELECT
                max(created_on)
            FROM
                sales_allocation sa2
            WHERE
                asm_code = $1)
        GROUP BY
            sa."key",
            sa.sold_to_party,
            sa.customer_name ,
            sa.parent_sku ,
            sa.parent_desc ,
            sa.by_allocation,
            dm.tse_code ,
            dm.area_code,
            usa.updated_allocation,
            mm.buom,
            mm.buom_to_cs,
            snc.stock_norm,
            dm.deleted,
            sa.asm_code,
            cgm.name,
            cgm.description
        ORDER BY parent_sku, sold_to_party ;`;

        try {
            client = await conn.getReadClient();
            const isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(areaCode);
            const applicableMonth = isNextMonthForecastDumped ? Helper.applicableMonth('next') : Helper.applicableMonth('current');
            const res = await client.query(sqlStatement, [areaCode, applicableMonth]);
            if (res && res.rowCount > 0) return res.rows;

            return [];
        } catch (error) {
            logger.error('inside ArsModel -> forecastSummaryAll, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchChildMaterialCodes(code: string) {
        logger.info('inside ArsModel -> fetchChildMaterialCodes');
        let client: PoolClient | null = null;

        try {
            const sqlStatement = `
                            select
                                code,
                                description
                            from
                                material_master mm
                            where
                                product_hierarchy_code = (
                                select
                                    product_hierarchy_code
                                from
                                    material_master mm2
                                where
                                    code = $1)
                            and status = 'ACTIVE'
                            and deleted = false`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [code]);
            if (result.rowCount > 0) return result.rows;
            throw new ResultNotFound('Materials with the SKU do not exists');
        } catch (error) {
            logger.error('Caught Error in ArsModel -> fetchChildMaterialCodes', error);
            throw error;
        } finally {
            if (client != null) client.release();
        }
    },

    async fetchArsDistributorList(areaCode: string[]) {
        logger.info('inside ArsModel -> fetchArsDistributorList');
        let client: PoolClient | null = null;
        const whereClause = areaCode?.length > 0 ? `and dm.area_code in ('${areaCode.join(',')}')` : '';
        const sqlStatement = `
        select
            dp.distributor_id as distributor_code,
            array_agg(distinct dp.division) as divisions
        from
            distributor_plants dp
        where
            dp.distributor_id in (
            select
                distinct on
                (area_code)
        dm.profile_id as distributor_code
            from
                distributor_master dm
            where
                ao_enable = true
                and deleted = false
                and status = 'ACTIVE' ${whereClause}
            order by
                area_code,
                random() 
        )
        group by
            dp.distributor_id`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount > 0) return result.rows;
            throw new ResultNotFound('Distributor not found in fetchArsDistributorList');
        } catch (error) {
            logger.error('Error in ArsModel => fetchArsDistributorList', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async getMaterialConversionPSKUWise(psku: string[]) {
        logger.info('inside ArsModel -> getMaterialConversionPSKUWise');
        if (!psku || psku.length < 1) return null;

        let client: PoolClient | null = null;
        try {
            let pskuStr = psku.map((o) => `'${o}'`).toString();
            const sqlStatement = `SELECT mm.code
                                        ,mm.buom_to_cs
                                        ,(case when COALESCE(mm.pak_to_cs,1)<1 then 1 else COALESCE(mm.pak_to_cs,1) end) AS pak_to_cs
                                FROM material_master AS mm
                                WHERE mm.code IN (${pskuStr});`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('Inside ArsModel -> getMaterialConversionPSKUWise, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getMoqMappingData(area: string | null | undefined, search: string | null | undefined, role: string[], email: string, limit: number, offset: number) {
        logger.info('inside ArsModel -> getMoqMappingData');

        let client: PoolClient | null = null;
        try {
            let emailQuery: string = '';
            emailQuery = role
                .map((role) => {
                    switch (role) {
                        case 'CFA':
                            return `email ILIKE '%${email}%'`;
                        case 'LOGISTIC_OFFICER':
                            return `logistic_email ILIKE '%${email}%'`;
                        case 'ZONAL_OFFICER':
                            return `zone_manager_email ILIKE '%${email}%' OR cluster_manager_email ILIKE '%${email}%'`;
                        default:
                            return '';
                    }
                })
                .filter((query) => query !== '')
                .join(' OR ');

            if (emailQuery) {
                emailQuery = `WHERE ${emailQuery}`;
            }
            let limitQuery: string = limit !== null && offset !== null ? `LIMIT ${limit} OFFSET ${offset}` : '';
            let areaQuery: string = area && area.toUpperCase() !== 'ALL' ? `AND dm.area_code = '${area}'` : '';
            let searchQuery: string =
                search && search?.length > 2
                    ? `AND (dm.profile_id ILIKE '${search}%'
                                                                            OR up.name ILIKE '%${search}%'
                                                                            OR pm.name ILIKE '${search}%')`
                    : '';
            const sqlStatement = `WITH plant_locations AS (SELECT DISTINCT ON (depot_code)
                                                                depot_code
                                                                ,location
                                                        FROM cfa_depot_mapping
                                                        ${emailQuery})
                                        ,audit_trail AS (SELECT DISTINCT ON (moq_key) moq_key
                                                                ,moq
                                                                ,modified_by
                                                                ,modified_on
                                                        FROM moq_audit_trail
                                                        ORDER BY moq_key, modified_on DESC)	  
                                SELECT dm.area_code
                                        ,mdm.db_id
                                        ,dm.profile_id AS db_code
                                        ,up.name AS db_name
                                        ,dm.city AS db_location
                                        ,mdm.plant_id
                                        ,pm.name AS plant_code
                                        ,COALESCE(pl.location,'') AS plant_location
                                        ,COALESCE(mat.moq,mdm.moq) AS moq
                                        ,COALESCE(mat.modified_by, 'PORTAL_MANAGED') AS modified_by
                                        ,COALESCE(mat.modified_on, '2023-08-08 15:08:53.369146+05:30') AS modified_on
                                FROM moq_db_mapping AS mdm
                                LEFT JOIN distributor_master AS dm
                                ON (mdm.db_id = dm.id)
                                LEFT JOIN user_profile AS up
                                ON (mdm.db_id = up.id)
                                LEFT JOIN plant_master AS pm
                                ON (mdm.plant_id = pm.id)
                                LEFT JOIN plant_locations AS pl
                                ON (pm.name = pl.depot_code)
                                LEFT JOIN audit_trail AS mat
                                ON (mdm.key = mat.moq_key)
                                WHERE dm.area_code IS NOT NULL 
                                AND up.name IS NOT NULL
                                ${areaQuery}
                                ${searchQuery}
                                ORDER BY dm.profile_id, pm.name
                                ${limitQuery};`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Inside ArsModel -> getMoqMappingData, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getMoqMappingDataCount(area: string | null | undefined, search: string | null | undefined, role: string[], email: string) {
        logger.info('inside ArsModel -> getMoqMappingDataCount');

        let client: PoolClient | null = null;
        try {
            let emailQuery: string = '';
            emailQuery = role
                .map((role) => {
                    switch (role) {
                        case 'CFA':
                            return `email ILIKE '%${email}%'`;
                        case 'LOGISTIC_OFFICER':
                            return `logistic_email ILIKE '%${email}%'`;
                        case 'ZONAL_OFFICER':
                            return `zone_manager_email ILIKE '%${email}%' OR cluster_manager_email ILIKE '%${email}%'`;
                        default:
                            return '';
                    }
                })
                .filter((query) => query !== '')
                .join(' OR ');

            if (emailQuery) {
                emailQuery = `WHERE ${emailQuery}`;
            }
            let areaQuery: string = area && area.toUpperCase() !== 'ALL' ? `AND dm.area_code = '${area}'` : '';
            let searchQuery: string =
                search && search?.length > 2
                    ? `AND (dm.profile_id ILIKE '${search}%'
                                                                            OR up.name ILIKE '%${search}%'
                                                                            OR pm.name ILIKE '${search}%')`
                    : '';
            const sqlStatement = `WITH plant_locations AS (SELECT DISTINCT ON (depot_code)
                                                                depot_code
                                                                ,location
                                                        FROM cfa_depot_mapping
                                                        ${emailQuery})
                                        ,audit_trail AS (SELECT DISTINCT ON (moq_key) moq_key
                                                                ,moq
                                                                ,modified_by
                                                                ,modified_on
                                                        FROM moq_audit_trail
                                                        ORDER BY moq_key, modified_on DESC)	  
                                SELECT COUNT(*) AS count
                                FROM moq_db_mapping AS mdm
                                LEFT JOIN distributor_master AS dm
                                ON (mdm.db_id = dm.id)
                                LEFT JOIN user_profile AS up
                                ON (mdm.db_id = up.id)
                                LEFT JOIN plant_master AS pm
                                ON (mdm.plant_id = pm.id)
                                INNER JOIN plant_locations AS pl
                                ON (pm.name = pl.depot_code)
                                LEFT JOIN audit_trail AS mat
                                ON (mdm.key = mat.moq_key)
                                WHERE dm.area_code IS NOT NULL 
                                AND up.name IS NOT NULL
                                ${areaQuery}
                                ${searchQuery}
                                AND up.name IS NOT NULL;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows ? result.rows[0].count : 0;
        } catch (error) {
            logger.error('Inside ArsModel -> getMoqMappingDataCount, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async updateMoq(dbId: string, plantId: number, moq: number, user: any) {
        logger.info('inside ArsModel -> updateMoq');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `BEGIN;
                                UPDATE moq_db_mapping
                                SET moq= ${moq}
                                WHERE db_id ='${dbId}' AND plant_id = ${plantId};
                                    
                                INSERT INTO moq_audit_trail(moq_key, moq, modified_by)
                                VALUES ((SELECT key
                                        FROM moq_db_mapping
                                        WHERE db_id ='${dbId}' AND plant_id = ${plantId}), ${moq}, '${user.first_name} ${user.last_name} ${user.user_id}');
                                        
                                COMMIT;`;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            if (result[1]['rowCount'] === 1 && result[2]['rowCount'] === 1) return true;
            else return false;
        } catch (error) {
            logger.error('Inside ArsModel -> updateMoq, Error: ', error);
            return false;
        } finally {
            if (client) client.release();
        }
    },

    async getDistributorMoq(dbCode: string, plantCodes: string[]) {
        logger.info('inside ArsModel -> getDistributorMoq');

        let client: PoolClient | null = null;
        try {
            const plantString = plantCodes.map((o) => `'${o}'`).join(',');
            const sqlStatement = `WITH plant_details AS (SELECT id, name FROM plant_master
                                                        WHERE name IN (${plantString}))
                                SELECT 
                                pl.name AS plant_code
                                ,COALESCE(mdm.moq,0) moq
                                FROM moq_db_mapping mdm
                                RIGHT JOIN plant_details pl ON (mdm.plant_id = pl.id)
                                WHERE mdm.db_id = (SELECT DISTINCT id FROM distributor_master
                                                WHERE profile_id = '${dbCode}');`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount > 0) return result.rows;
            else return null;
        } catch (error) {
            logger.error('Inside ArsModel -> getDistributorMoq, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async updateStockNormConfig(
        data: Array<{
            id: number;
            stock_norm: number;
            ss_percent: number;
            updated_by: any;
            class_of_last_update: string;
        }>,
    ) {
        logger.info('inside ArsModel -> updateStockNormConfig');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                update
                    stock_norm_config as snc
                set
                    stock_norm = snc2.stock_norm,
                    ss_percent = snc2.ss_percent,
                    updated_by = snc2.updated_by,
                    updated_on = now(),
                    remarks = snc2.remarks,
                    class_of_last_update = snc2.class_of_last_update
                from
                    jsonb_populate_recordset(null::stock_norm_config,$1) as snc2
                where
                    snc.id = snc2.id
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data)]);

            if (result?.rowCount > 0) return true;
            return false;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateStockNormConfig', error);
            throw new UpdateFailedException(`Error while updating Stock Norm Config`);
        } finally {
            if (client) client.release();
        }
    },

    async fetchAreaCodesUnderAdmin(userId: string, role: string) {
        logger.info('inside ArsModel -> fetchAreaCodesUnderAdmin');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            if (role === 'SUPER_ADMIN' || role === 'SUPPORT' || role === 'PORTAL_OPERATIONS' || role === 'SHOPPER_MARKETING' || role === 'CHANNEL_DEVELOPMENT') {
                const sqlStatement = `SELECT DISTINCT code FROM area_codes ORDER BY code`;
                const areaCodes = await client.query(sqlStatement);
                return areaCodes?.rows;
            } else if (role === 'DIST_ADMIN' || role === 'ASM' || role === 'RSM' || role === 'CLUSTER_MANAGER') {
                const areaCodes = await client.query(Helper.areaCodeHierarchyQuery(userId));
                return areaCodes?.rows;
            }
        } catch (error) {
            logger.error('Error in ArsModel -> fetchAreaCodesUnderAdmin: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getPskuClass(distId: string, applicableMonth = Helper.applicableMonth(), ofCurrentMonth: boolean = false) {
        logger.info('inside ArsModel -> getPskuClass');
        let client: PoolClient | null = null;

        try {
            const sql = `
                    select
                        distinct
                        psku ,
                        "class"
                    from
                        forecast_distribution fd
                    where
                        fd.distributor_code = $1;
                        and fd.applicable_month = $2
                    `;
            client = await conn.getReadClient();
            const result = await client.query(sql, [distId, applicableMonth]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getPskuClass', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    /**
     *
     * @param applicableMonth : string
     * @returns
     * This method is used to find an array of distributor codes whose PDP in forecast_distribution does not match with PDP in distributor_plants table
     */
    async distributorsWithPDPMismatch(applicableMonth: string) {
        logger.info('inside ArsModel -> distributorsWithPDPMismatch');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                            select
                                array_agg (distributor_code) as dist
                            from
                                (
                                select
                                    distinct fd.distributor_code,
                                    fd.division,
                                    fd.pdp
                                from
                                    forecast_distribution fd
                                where
                                    applicable_month = $1
                                    and fd.pdp != '${EVERYDAY_PDP}'
                                except
                                    select
                                    distinct dp.distributor_id,
                                    dp.division::text,
                                    dp.pdp_day
                                from
                                    distributor_plants dp
                                where
                                    dp.distribution_channel = '10'
                            ) as distributors`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [applicableMonth]);
            return result?.rows[0]?.dist || [];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> distributorsWithPDPMismatch', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getForecastedMaterialsAutoValidation(distributorCode: string, applicableMonth: string) {
        logger.info('inside ArsModel -> getForecastedMaterialsAutoValidation');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                            select
                                distinct psku as "productCode",
                                '1' as qty
                            from
                                forecast_distribution fd
                            where
                                fd.distributor_code = $1
                                and applicable_month = $2`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distributorCode, applicableMonth]);
            if (result?.rowCount > 0) {
                logger.info(
                    `inside ArsModel -> getForecastedMaterialsAutoValidation: Forecasted PSKUs found for Dist: ${distributorCode} and Month: ${applicableMonth} = ${result?.rowCount}`,
                );
                return result?.rows;
            }
            throw new ResultNotFound(`Forecasted PSKUs not found for Dist: ${distributorCode} and Month: ${applicableMonth}`);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getForecastedMaterialsAutoValidation', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async syncStockNormConfig(applicableMonth: string) {
        logger.info('inside ArsModel -> syncStockNormConfig');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                WITH latest_sales_allocation AS (
                    SELECT
                        asm_code,
                        max(created_on) AS max_created_on
                    FROM
                        sales_allocation
                    GROUP BY
                        asm_code
                )
                ,
                latest_stock_norm AS (
                    SELECT
                        snc.dist_id,
                        snc.psku,
                        max(snc.id) AS max_id
                    FROM
                        stock_norm_config snc
                    GROUP BY
                        snc.dist_id,
                        snc.psku
                )
                INSERT
                    INTO
                    stock_norm_config (
                        applicable_month,
                        dist_id,
                        psku,
                        stock_norm,
                        ss_percent,
                        updated_by,
                        updated_on,
                        remarks,
                        class_of_last_update
                    )
                SELECT
                    DISTINCT
                    $1 AS applicable_month,
                    sa.sold_to_party,
                    sa.parent_sku,
                    snc.stock_norm,
                    COALESCE (
                        snc.ss_percent,
                        (
                            CASE
                                WHEN sa."class" = 'A' THEN snd.class_a_ss_percent
                                WHEN sa."class" = 'B' THEN snd.class_b_ss_percent
                                ELSE snd.class_c_ss_percent
                            END
                        )
                    ) AS ss_percent,
                    COALESCE(snc.updated_by,'PORTAL_MANAGED'),
                    now(),
                    snc.remarks,
                    snc.class_of_last_update
                FROM
                    sales_allocation sa
                INNER JOIN latest_sales_allocation lsa ON
                    lsa.asm_code = sa.asm_code
                    AND lsa.max_created_on = sa.created_on
                INNER JOIN distributor_master dm ON
                    dm.id = sa.sold_to_party
                INNER JOIN customer_group_master cgm ON
                    cgm.id = dm.group_id
                INNER JOIN stock_norm_default snd ON
                    snd.customer_group_id = cgm.id
                LEFT JOIN latest_stock_norm lsn ON
                    lsn.dist_id = sa.sold_to_party
                    AND lsn.psku = sa.parent_sku
                LEFT JOIN stock_norm_config snc ON
                    snc.id = lsn.max_id
                ON
                    CONFLICT (
                        dist_id,
                        applicable_month,
                        psku
                    ) DO
                UPDATE
                SET
                    updated_on = excluded.updated_on,
                    updated_by = excluded.updated_by,
                    stock_norm = excluded.stock_norm,
                    ss_percent = excluded.ss_percent,
                    psku = excluded.psku,
                    remarks = excluded.remarks,
                    class_of_last_update = excluded.class_of_last_update;
                `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [applicableMonth]);
            logger.info(`inside ArsModel -> syncStockNormConfig: result = ${result?.rowCount}`);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> syncStockNormConfig', error);
            return false;
        } finally {
            if (client) client.release();
        }
    },

    async getStockNormDefault(customerGroup: string) {
        logger.info(`inside ArsModel -> getStockNormDefault: customerGroup = ${customerGroup}`);

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    select
                        class_a_sn,
                        class_a_ss_percent,
                        class_b_sn,
                        class_b_ss_percent,
                        class_c_sn,
                        class_c_ss_percent,
                        updated_at,
                        snd.updated_by,
                        first_name,
                        last_name
                    from
                        stock_norm_default snd
                    inner join customer_group_master cgm on
                        cgm.id = snd.customer_group_id
                    left join sales_hierarchy_details shd 
                    on
                        shd.user_id = snd.updated_by
                    where
                        cgm.name = $1`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [customerGroup]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getStockNormDefault', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async updateStockNormDefault(
        customerGroup: string,
        data: {
            class_a_sn: string;
            class_a_ss_percent: string;
            class_b_sn: string;
            class_b_ss_percent: string;
            class_c_sn: string;
            class_c_ss_percent: string;
            updated_by: string;
        },
    ) {
        logger.info(`inside ArsModel -> updateStockNormDefault: customerGroup = ${customerGroup}`);

        let client: PoolClient | null = null;

        try {
            const sqlStatement = `
                    update
                        stock_norm_default
                    set
                        class_a_sn = $2,
                        class_a_ss_percent = $3,
                        class_b_sn = $4,
                        class_b_ss_percent = $5,
                        class_c_sn = $6,
                        class_c_ss_percent = $7,
                        updated_by = $8,
                        updated_at = now()
                    where
                        customer_group_id = (
                        select
                            id
                        from
                            customer_group_master
                        where
                            name = $1)`;
            const dataArray = [
                customerGroup,
                +data.class_a_sn,
                +data.class_a_ss_percent,
                +data.class_b_sn,
                +data.class_b_ss_percent,
                +data.class_c_sn,
                +data.class_c_ss_percent,
                data.updated_by,
            ];
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, dataArray);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateStockNormDefault', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async updateStockNormConfigSafetyPercentage(
        customerGroup: string,
        data: {
            class_a_sn: string;
            class_a_ss_percent: string;
            class_b_sn: string;
            class_b_ss_percent: string;
            class_c_sn: string;
            class_c_ss_percent: string;
            updated_by: string;
        },
        currentMonth: string,
        upcomingMonth: string,
        forecastCurrentMonth: string,
        forecastupcomingMonth: string,
    ) {
        logger.info(`inside ArsModel -> updateStockNormConfigSafetyPercentage customer-group: ${customerGroup}`);

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
            with sa_class as (
                select
                    sold_to_party,
                    parent_sku,
                    "class",
                    forecast_month
                from
                    sales_allocation sa
                where
                    sa.created_on in (
                    select
                        max(created_on)
                    from
                        sales_allocation sa2
                    group by
                        sa2.asm_code,
                        sa2.forecast_month
                )
                    and sa.forecast_month in ('${forecastCurrentMonth}', '${forecastupcomingMonth}')),
            snc_applicable_month as (
                select
                    snc.id as snc_id,
                    dist_id,
                    psku,
                    applicable_month,
                    case
                        when applicable_month = '${currentMonth}' then '${forecastCurrentMonth}'
                        else '${forecastupcomingMonth}'
                    end as forecast_month
                from
                    stock_norm_config snc
                join distributor_master dm on
                    dm.id = snc.dist_id
                join customer_group_master cgm on
                    cgm.id = dm.group_id
                where
                    snc.applicable_month in ('${currentMonth}', '${upcomingMonth}')
                        and cgm."name" = $4),

            snc_class_month as (
                select
                    snc_id, "class"
                from
                    snc_applicable_month as snc_month
                join sa_class on
                    snc_month.forecast_month = sa_class.forecast_month
                    and snc_month.dist_id = sa_class.sold_to_party
                    and snc_month.psku = sa_class.parent_sku

                )


            update 
                stock_norm_config set ss_percent =
                    case
                        when snc_class_month."class" = 'A' then $1::numeric
                        when snc_class_month."class" = 'B' then $2::numeric
                        when snc_class_month."class" = 'C' then $3::numeric
                        else $1
                    end,
                updated_by = '${data.updated_by}',
                updated_on = now()

            from snc_class_month
            where id = snc_class_month.snc_id
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [data.class_a_ss_percent, data.class_b_ss_percent, data.class_c_ss_percent, customerGroup]);
            return result;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateStockNormConfigSafetyPercentage', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getAllArsTolerance(customerGroup: string) {
        logger.info(`inside ArsModel -> getAllArsTolerance: customerGroup: ${customerGroup}`);

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                        select
                            at2.id,
                            at2.area_code,
                            at2.class_a_max,
                            at2.class_b_max,
                            at2.class_c_max,
                            at2.class_a_min,
                            at2.class_b_min,
                            at2.class_c_min,
                            at2.updated_by,
                            at2.updated_on,
                            at2.remarks,
                            shd.first_name,
                            shd.last_name
                        from
                            ars_tolerance at2
                        inner join customer_group_master cgm 
                        on
                            (at2.customer_group_id = cgm.id
                                and cgm.name = $1)
                        left join sales_hierarchy_details shd 
                        on
                            shd.user_id = at2.updated_by
                        left join area_codes ac
                        on
                            ac.code = at2.area_code
                        where
                            ac.ars_applicable = TRUE
                        order by at2.area_code;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [customerGroup]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel  -> getAllArsTolerance', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getArsTolerance(customerGroup: string, areaCode: string) {
        logger.info(`inside ArsModel -> getArsTolerance: customerGroup: ${customerGroup}, areaCode: ${areaCode}`);

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    select
                        at2.class_a_max as "A_max",
                        at2.class_b_max as "B_max",
                        at2.class_c_max as "C_max",
                        at2.class_a_min as "A_min",
                        at2.class_b_min as "B_min",
                        at2.class_c_min as "C_min"
                    from
                        ars_tolerance at2
                    inner join customer_group_master cgm 
                    on
                        (at2.customer_group_id = cgm.id
                            and cgm.name = $1)
                    where
                        at2.area_code = $2`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [customerGroup, areaCode]);
            return result?.rows[0];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel  -> getArsTolerance', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async updateArsTolerance(
        data: {
            class_a_max: string;
            class_b_max: string;
            class_c_max: string;
            class_a_min: string;
            class_b_min: string;
            class_c_min: string;
            remarks: string;
            id: string;
        },
        updatedBy: string,
    ) {
        logger.info('inside ArsModel -> updateArsTolerance');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                        update ars_tolerance 
                            set 
                            class_a_max = $1,
                            class_b_max = $2,
                            class_c_max = $3,
                            class_a_min = $7,
                            class_b_min = $8,
                            class_c_min = $9,
                            remarks = $4,
                            updated_by = $5,
                            updated_on  = now()
                        where id = $6`;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [
                +data.class_a_max,
                +data.class_b_max,
                +data.class_c_max,
                data.remarks,
                updatedBy,
                +data.id,
                +data.class_a_min,
                +data.class_b_min,
                +data.class_c_min,
            ]);
            return result.rowCount ?? 0;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateArsTolerance', error);
            return 0;
        } finally {
            if (client) client.release();
        }
    },

    async fetchStockNormData() {
        //TODO: CHANGES: snQuery is deprecated according to SOPE-1890. Need to update the query as per the new requirement.
        logger.info('inside ArsModel -> fetchStockNormData');
        let client: PoolClient | null = null;

        try {
            let ss_sih_cgs = Helper.ssSihCgs() != null ? `AND cgm.name IN (${Helper.ssSihCgs()})` : '';
            const snQuery = `
                            SELECT dm.profile_id
                                    ,sn.applicable_month
                                    ,sn.class_a_sn AS a
                                    ,sn.class_a_ss_percent AS a_ss
                                    ,sn.class_b_sn AS b
                                    ,sn.class_b_ss_percent AS b_ss
                                    ,sn.class_c_sn AS c
                                    ,sn.class_c_ss_percent AS c_ss
                                    ,up.name
                                    ,up.email AS db_email
                                    ,cgm.name || '#' || cgm.description AS customer_group
                                    ,g5m.name || '#' || g5m.description AS region
                                    ,dm.tse_code
                                    ,shd.email AS tse_email
                                    ,dm.area_code
                                    ,s_h_d.email AS asm_email
                                FROM distributor_master AS  dm 
                                INNER JOIN user_profile AS up 
                                ON dm.profile_id = up.id 
                                LEFT JOIN sales_hierarchy_details AS shd 
                                ON (shd.code LIKE '%'||dm.tse_code||'%'  AND shd.deleted = false AND 'TSE' = ANY(shd.roles))
                                LEFT JOIN sales_hierarchy_details AS s_h_d 
                                ON (s_h_d.user_id  = shd.manager_id  AND s_h_d.deleted = false AND 'ASM' = ANY(s_h_d.roles))
                                INNER JOIN customer_group_master AS cgm 
                                ON (dm.group_id = cgm.id)
                                INNER JOIN group5_master AS g5m 
                                ON (dm.group5_id = g5m.id)
                                INNER JOIN stock_norm_config AS sn
                                ON (sn.dist_id = dm.profile_id AND sn.applicable_month = CONCAT(to_char(current_date, 'YYYY'),to_char(current_date, 'MM')))
                                WHERE dm.ao_enable = true AND 
                                    dm.status = 'ACTIVE' AND 
                                    dm.deleted = false AND 
                                    dm.tse_code IS NOT NULL AND 
                                    dm.area_code IS NOT NULL 
                                ${ss_sih_cgs};
                            `;
            let appLevelConfigs = await UserModel.getAppLevelSettings('AO_%_ENABLE');
            client = await conn.getReadClient();
            const { rows } = await client.query(snQuery);
            if (!rows || rows.length < 1) {
                return null;
            }
            let snRes: any[] = rows;
            snRes = snRes?.filter((o: any) => {
                let isArsEnabled = false;
                let region = o.region.split('#')[0]?.trim();
                let cg = o.customer_group.split('#')[1]?.toUpperCase().trim();
                if (cg.includes('NON METRO')) cg = 'AO_NON_METRO';
                else if (cg.includes('METRO')) cg = 'AO_METRO';
                else cg = '^';
                for (let element of appLevelConfigs) {
                    if (element.key.includes(region) && element.key.includes(cg)) {
                        isArsEnabled = element.value === 'TRUE';
                        break;
                    }
                }
                return isArsEnabled;
            });
            let dist_ids = snRes?.map((o: any) => `'${o.profile_id}'`).join(',');
            const fdQuery = `
                            SELECT fd.distributor_code
                                    ,fd.psku 
                                    ,fd.class
                                    ,(case when COALESCE(mm.pak_to_cs,1)<1 then 1 else COALESCE(mm.pak_to_cs,1) end) AS pak_to_cs
                                    ,json_object_agg(fd.applicable_month, array[ _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31]) AS qty
                            FROM forecast_distribution fd
                            INNER JOIN material_master mm
                                    ON (mm.code = fd.psku)
                            WHERE
                                fd.distributor_code in (${dist_ids})
                                AND fd.applicable_month IN (CONCAT(to_char(current_date, 'YYYY'),to_char(current_date, 'MM')), CONCAT(to_char(current_date + interval '1 month', 'YYYY'),to_char(current_date + interval '1 month', 'MM')))
                            GROUP BY fd.distributor_code, fd.psku, fd.class, mm.pak_to_cs
                            ORDER BY fd.distributor_code, fd.psku;
                            `;
            const fdRes = await client.query(fdQuery);
            if (!fdRes) {
                return null;
            }
            let result = snRes.map((d) => {
                let psku_arr: string[] = [];
                let sn_arr: number[] = [];
                let ss_arr: number[] = [];
                let cs_arr: number[] = [];
                let cf_arr: number[] = [];
                fdRes.rows
                    .filter((o) => d.profile_id === o.distributor_code)
                    .forEach((o) => {
                        let sn = o.class === 'A' ? d.a : o.class === 'B' ? d.b : d.c;
                        let ss = o.class === 'A' ? d.a_ss : o.class === 'B' ? d.b_ss : d.c_ss;
                        ss = Math.round((sn * ss) / 100);
                        const arr1 = o.qty[Helper.applicableMonth()] ? o.qty[Helper.applicableMonth()] : [];
                        const arr2 = o.qty[Helper.applicableMonth('next')] ? o.qty[Helper.applicableMonth('next')] : [];
                        const normsArray = Helper.getNormQuantity(sn, ss, arr1, arr2);
                        psku_arr.push(o.psku);
                        cf_arr.push(o.pak_to_cs);
                        sn_arr.push(normsArray[0]);
                        ss_arr.push(normsArray[1]);
                        cs_arr.push(normsArray[2]);
                    });
                let ss_data = {
                    psku: psku_arr,
                    cf: cf_arr,
                    sn: sn_arr,
                    ss: ss_arr,
                    cs: cs_arr,
                };
                let result_row = {
                    profile_id: d.profile_id,
                    sn_data: ss_data,
                    name: d.name,
                    db_email: d.db_email,
                    customer_group: d.customer_group,
                    region: d.region,
                    tse_code: d.tse_code,
                    tse_email: d.tse_email,
                    area_code: d.area_code,
                    asm_email: d.asm_email,
                };
                return result_row;
            });
            return result;
        } catch (error) {
            logger.error('inside ArsModel -> fetchStockNormData, Error: ', error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getDistributorCustomerGroup(distributorCode: string) {
        let client: PoolClient | null = null;
        //this query returns the key (consisting of customer_group_name#customer_group_description) to update forecast_configuration data

        if (!distributorCode) {
            return null;
        }
        try {
            const distributorPdpQuery = `
                                    SELECT cg.name || '#' || cg.description customer_group
                                    FROM distributor_master dm
                                    INNER JOIN customer_group_master cg ON (dm.group_id = cg.id)
                                    WHERE dm.profile_id = $1`;
            client = await conn.getReadClient();
            const distributorPdpResult = await client.query(distributorPdpQuery, [distributorCode]);
            const cg = distributorPdpResult?.rows[0]?.customer_group;
            if (cg) {
                return cg;
            }
            return null;
        } catch (error) {
            logger.error('Error customer_group not found', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async safetyStockAndSafetyNorm() {
        let client: PoolClient | null = null;
        try {
            let sqlStatement = `
                                select
                                    key,
                                    value
                                from
                                    app_level_settings als
                                where
                                    als."key" in ('SAFETY_STOCK', 'STOCK_NORM')`;
            client = await conn.getReadClient();
            let res = await client.query(sqlStatement);
            if (res?.rowCount > 0) {
                return res?.rows;
            }
        } catch (error) {
            return error;
        } finally {
            if (client) client.release();
        }
    },

    async fetchForecastPhasing(areaCode: string | null, applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> fetchForecastConfigurationsPhasing');
        const whereCondition = areaCode ? ` and area_code = '${areaCode}'` : '';

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                            select
                            area_code ,
                            jsonb_agg( 
                            jsonb_build_object( 
                                'weekly_week1' , weekly_week1 ,
                                'weekly_week2' , weekly_week2 ,
                                'weekly_week3' , weekly_week3 ,
                                'weekly_week4' , weekly_week4 ,
                                'fortnightly_week12' , fortnightly_week12 ,
                                'fortnightly_week34' , fortnightly_week34 ,
                                'customer_group' , customer_group
                                )) as config
                            from
                                forecast_configurations fc
                            where
                                applicable_month = $1 ${whereCondition}
                            group by area_code `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [applicableMonth]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchForecastConfigurationsPhasing', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async fetchArsEnabledAreaCodesWithTse() {
        /**
         * Function return the ARS enabled area codes with their respective TSE codes
         */
        logger.info('inside ArsService -> fetchArsEnabledAreaCodesWithTse');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                WITH dist_details AS (
                    SELECT DISTINCT
                        dm.group_id,
                        dm."area_code",
                        dm.tse_code,
                        dm.group5_id
                    FROM
                        distributor_master dm
                    WHERE
                        ao_enable = true
                        AND dm.area_code IS NOT NULL
                )
                SELECT
                    dd.area_code,
                    ARRAY_AGG(DISTINCT dd.tse_code) AS tse
                FROM
                    dist_details dd
                LEFT JOIN ars_configurations ac
                    ON ac.region_id = dd.group5_id
                    AND ac.customer_group_id = dd.group_id
                WHERE
                    ac.configuration = 'SWITCH'
                    AND ac.auto_order = true
                GROUP BY
                    dd.area_code;
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> fetchArsEnabledAreaCodesWithTse', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getConversionFactor(sku: string, factors: string[] = ['buom_to_cs']) {
        logger.info('inside ArsModel -> getConversionFactor');

        let client: PoolClient | null = null;
        try {
            const pskuArr = sku.split(',');
            const sqlStatement = `
                select code, ${factors.join(',')}
                from material_master mm
                where code = ANY($1)
                `;
            client = await conn.getReadClient();
            // Pass the entire pskuArr as a single parameter
            const result = await client.query(sqlStatement, [pskuArr]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getConversionFactor', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async fetchAsmRsmData() {
        logger.info('inside ArsModel -> fetchAsmRsmData');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = ` SELECT DISTINCT ON (shd.code, shd.user_id)
                                        shd.code AS area_code
                                        ,shd.user_id AS asm_id
                                        ,shd.first_name || ' ' ||  shd.last_name AS asm_name
                                        ,shd.email AS asm_email
                                        ,shd.manager_id AS rsm_id
                                        ,COALESCE(s_h_d.first_name, 'undefined') || ' ' ||  COALESCE(s_h_d.last_name, 'undefined') AS rsm_name
                                        ,COALESCE(s_h_d.email, 'undefined') AS  rsm_email
                                    FROM sales_hierarchy_details shd
                                    LEFT JOIN sales_hierarchy_details s_h_d ON (shd.manager_id = s_h_d.user_id AND s_h_d.status = 'ACTIVE' AND s_h_d.deleted = false)
                                    WHERE 'ASM' = ANY(shd.roles) AND shd.status = 'ACTIVE' AND shd.deleted = false
                                    ORDER BY shd.code, shd.user_id;`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Inside ArsModel -> fetchAsmRsmData, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async fetchForecastAndConfigUpdateData() {
        logger.info('inside ArsModel -> fetchForecastAndConfigUpdateData');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = ` WITH f_data AS (SELECT DISTINCT ON (sa.asm_code)
                                                    sa.asm_code
                                                    ,usa.updated_by
                                                    ,usa.updated_on
                                                FROM sales_allocation sa
                                                INNER JOIN updated_sales_allocation usa ON (sa.key = usa.sales_allocation_key)
                                                WHERE sa.forecast_month ILIKE  '%'|| to_char(current_date + interval '1 month', 'Mon') || '-' || to_char(current_date + interval '1 month', 'YY')
                                                ORDER BY sa.asm_code,usa.updated_on DESC),
                                f_config AS    (SELECT  DISTINCT ON (fc.area_code)
                                                        fc.area_code
                                                        ,(case when to_char(age(fc.updated_on,fc.created_on), 'HH24:MI:SS') = '00:00:00' then false else true end) AS is_updated
                                                        ,fc.updated_on
                                                        ,fc.updated_by 
                                                FROM forecast_configurations fc
                                                WHERE  fc.applicable_month = CONCAT(to_char(current_date + interval '1 month', 'YYYY'),to_char(current_date + interval '1 month', 'MM'))
                                                ORDER BY fc.area_code , fc.updated_on DESC)
                                SELECT fc.area_code 
                                    ,fc.is_updated fc_is_updated
                                    ,fc.updated_on fc_updated_on
                                    ,fc.updated_by fc_updated_by
                                    ,(case when COALESCE(f.updated_by, 'PORTAL_MANAGED') = 'PORTAL_MANAGED' then false else true end) AS f_is_updated
                                    ,f.updated_on f_updated_on
                                    ,COALESCE(f.updated_by, 'PORTAL_MANAGED') f_updated_by
                                FROM f_config fc
                                LEFT JOIN f_data f ON (fc.area_code= f.asm_code);`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('Inside ArsModel -> fetchForecastAndConfigUpdateData, Error: ', error);
            return null;
        } finally {
            if (client) client.release();
        }
    },

    async getLastArsOrder(dbCode: string) {
        let client: PoolClient | null = null;
        try {
            // Make query and pull out all the PSKU in orders for distributor
            if (dbCode === '') throw new Error('Distributor Code is empty');
            const getPSKUDistWiseQuery = `WITH order_qty AS (SELECT 
                                                            arr.item_object ->> 'MATERIAL' AS psku, arr.item_object ->> 'TARGET_QTY' AS qty
                                                    FROM orders o,
                                                            jsonb_array_elements(order_data -> 'Itemset') with ordinality arr(item_object, position)
                                                    WHERE distributor_id = $1 AND order_type = 'ARS' AND status <> 'DRAFT'
                                                    AND (so_date AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
                                                    ORDER BY so_date DESC)
                                            SELECT psku, sum(qty::int) total_qty
                                            FROM order_qty
                                            GROUP BY psku
                                            ORDER BY total_qty DESC;`;
            client = await conn.getWriteClient();
            const res = await client.query(getPSKUDistWiseQuery, [dbCode]);
            logger.info(`inside ArsModel -> getLastArsOrder,DB: ${dbCode} res: ${res.rowCount}`);
            if (res?.rowCount > 0) {
                return res?.rows;
            }
            return [];
        } catch (error) {
            logger.error('inside ArsModel -> getLastArsOrder, Error: ', error);
            return [];
        } finally {
            if (client) client.release();
        }
    },

    async getLastOrdersByDivision(data: {}[], distId: string) {
        logger.info('inside ArsModel -> getLastOrdersByDivision');
        const divisionTimeValuesArr: string[] = [];
        const timeTemplate: string = `('#1', TO_TIMESTAMP('#2', 'YYYY-MM-DD HH24:MI:SS')AT TIME ZONE 'Asia/Kolkata', TO_TIMESTAMP('#3', 'YYYY-MM-DD HH24:MI:SS')AT TIME ZONE 'Asia/Kolkata')`;
        let client: PoolClient | null = null;
        try {
            Object.keys(data)?.forEach((key) => {
                const div = key;
                const { order_start, order_end } = data[key];
                if (order_start && order_end) {
                    divisionTimeValuesArr.push(timeTemplate.replace('#1', div).replace('#2', order_start).replace('#3', order_end));
                }
            });
            if (divisionTimeValuesArr.length) {
                client = await conn.getReadClient();
                const sqlStatement = `
                    WITH division_time AS (
                        SELECT
                            *
                        FROM (
                            VALUES
                            ${divisionTimeValuesArr.join(',')}
                        ) AS T(
                            div, 
                            order_start, 
                            order_end
                        )
                    ),
                    order_qty AS (
                        SELECT 
                            arr.item_object ->> 'MATERIAL' AS psku, 
                            arr.item_object ->> 'TARGET_QTY' AS qty,
                            arr.item_object ->> 'DIVISION' AS division,
                            o.po_number,
                            o.so_date
                        FROM 
                            orders o,
                            jsonb_array_elements(order_data -> 'Itemset') WITH ORDINALITY arr(item_object,POSITION)
                        INNER JOIN division_time dt ON 
                            arr.item_object ->> 'DIVISION' = dt.div
                        WHERE 
                            distributor_id = $1
                            AND status <> 'DRAFT'
                            AND so_date BETWEEN dt.order_start AND dt.order_end
                    )
                    SELECT 
                        psku, 
                        SUM(qty::int) AS total_qty,
                        array_agg(distinct po_number) as po_numbers,
                        array_agg(DISTINCT division) as divisions
                    FROM 
                        order_qty
                    GROUP BY 
                        psku;
                `;
                const result = await client.query(sqlStatement, [distId]);
                if (result?.rowCount) {
                    return result?.rows;
                }
            }
            return [];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getLastOrdersByDivision', error);
            return [];
        } finally {
            client?.release();
        }
    },

    async getRuleConfigPSKU(distId: string) {
        logger.info('inside ArsModel -> getRuleConfigPSKU');
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT
                src.area_code,
                array_agg(src.sku_code) AS excluded_psku
            FROM
                sku_rule_configurations src
            INNER JOIN (
                SELECT
                    dm.id::NUMERIC,
                    cgm.name AS customer_group,
                    dm.area_code,
                    dm.tse_code,
                    dp.channel
                FROM
                    distributor_master dm
                INNER JOIN customer_group_master cgm ON
                    cgm.id = dm.group_id
                INNER JOIN (
                    SELECT DISTINCT distributor_id,
                    CASE
                        WHEN distribution_channel = 10 OR distribution_channel = 40 THEN 'GT'
                        WHEN distribution_channel = 90 THEN 'NOURISHCO'
                        ELSE 'OTHERS'
                    END as channel
                    FROM distributor_plants
                    WHERE distributor_id = '${distId}'
                ) as dp on dp.distributor_id = dm.id
                WHERE
                    dm.id = $1
            ) AS db_details ON
                db_details.area_code = src.area_code
            WHERE
                src.tse_code = db_details.tse_code
                AND src.deleted = FALSE
                AND src.channel = db_details.channel
                AND (
                    (src.included_cg_db ->> db_details.customer_group) = FALSE::TEXT
                    OR src.included_cg_db ->> db_details.customer_group IS NULL
                    OR (
                        jsonb_typeof(src.included_cg_db -> db_details.customer_group) = 'array'
                        AND db_details.id NOT IN (
                            SELECT jsonb_array_elements_text(src.included_cg_db -> db_details.customer_group)::int
                        )
                    )
                )
            GROUP BY
                src.area_code;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distId]);
            return result?.rows[0]?.excluded_psku ?? [];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getRuleConfigPSKU', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getForecastedDBByAreaPsKu(areaCode: string, psku: string) {
        logger.info('inside ArsModel -> getForecastedDBByAreaPsKu');
        let client: PoolClient | null = null;
        const sqlStatement = `
                SELECT
            KEY,
            sold_to_party,
            sa.class
        FROM
            sales_allocation sa
        WHERE
            asm_code = $1
            AND parent_sku = $2
            AND created_on = (
            SELECT
                max(created_on)
            FROM
                sales_allocation sa2
            WHERE
                asm_code = $1)
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [areaCode, psku]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getForecastedDBByAreaPsKu', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getDefaultStockNormByDistId(distId: string) {
        logger.info('inside ArsModel -> getDefaultStockNormByDistId');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            class_a_sn,
            class_a_ss_percent,
            class_b_sn,
            class_b_ss_percent,
            class_c_sn,
            class_c_ss_percent,
            updated_at,
            snd.updated_by,
            first_name,
            last_name
        FROM
            stock_norm_default snd
        INNER JOIN customer_group_master cgm ON
            cgm.id = snd.customer_group_id
        INNER JOIN distributor_master dm ON
            dm.group_id = cgm.id
        LEFT JOIN sales_hierarchy_details shd ON
            shd.user_id = snd.updated_by
        WHERE
            dm.id = $1;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distId]);
            return result?.rows[0];
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getDefaultStockNormByDistId', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertDistributorPricingDetails(distributor_code: string, customer_group_code: number | string, area_code: string, order_details: {}, error_details: {}) {
        logger.info('inside ArsModel -> insertDistributorPricingDetails');
        let client: PoolClient | null = null;
        const sqlStatement = `
        INSERT INTO public.distributor_pricing_master
        (distributor_code, customer_group_code, area_code, order_details, error_details, created_at)
        VALUES($1, $2, $3, $4, $5, now());
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [distributor_code, customer_group_code, area_code, JSON.stringify(order_details), JSON.stringify(error_details)]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> insertDistributorPricingDetails', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getForecastedMaterialsMaterialMaster(distributorCode: string, areaCode: string, channelCode: string) {
        logger.info('inside ArsModel -> getForecastedMaterialsAutoValidation');

        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                           SELECT
                                DISTINCT
                                code AS "productCode",
                                description,
                                sales_unit,
                                pak_code,
                                pak_type,
                                appl_area_channel,
                                subquery.ton_to_suom AS ton_to_cv,
                                msd.division,
                                '1' AS qty
                            FROM
                                (
                                SELECT
                                    *,
                                    (UNNEST (appl_area_channel) -> 'area')::jsonb #>> '{}' AS appl_area,
                                    (UNNEST (appl_area_channel) -> 'channel')::jsonb #>> '{}' AS appl_channel
                                FROM
                                    material_master mm
                                WHERE
                                    mm.status = 'ACTIVE'
                                    AND mm.deleted = FALSE
                                    ) subquery
                                    LEFT JOIN material_sales_details msd ON msd.material_code = subquery.code
                            WHERE
                                appl_channel = '${channelCode}'
                                AND appl_area = '${areaCode}'`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount > 0) {
                logger.info(`inside ArsModel -> getForecastedMaterialsAutoValidation: Forecasted PSKUs found for Dist: ${distributorCode} = ${result?.rowCount}`);
                return result?.rows;
            }
            throw new ResultNotFound(`Forecasted PSKUs not found for Dist: ${distributorCode}`);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getForecastedMaterialsAutoValidation', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async fetchDistributorListForPricing(
        areaCode?: string[] | null,
        exclusion?: {
            area: string;
            customer_group: string;
            distributor_code: string[];
        },
    ) {
        /**
         * Find one distributor of each area_code/customer_group combinations.
         * It finds the distributor with the highest sales in the last 3 months for each Area/Customer Group.
         * If an exclusion object is passed, it will exclude the distributors from the result.
         */
        logger.info('inside ArsModel -> fetchDistributorListForPricing');
        let client: PoolClient | null = null;

        try {
            const whereClause = areaCode?.length ? `and dm.area_code in ('${areaCode.join("' ,'")}')` : '';
            const whereClause2 = exclusion?.area
                ? `and dm.area_code = '${exclusion.area}'
                and cgm.name = '${exclusion.customer_group}'
                and  dm.id not in ('${exclusion.distributor_code.join("', '")}')`
                : '';
            const sqlStatement = `
            WITH distributor_details AS (
                SELECT
                    dm.id AS distributor_code,
                    dm.channel_code,
                    dm.area_code,
                    cgm."name" as customer_group,
                    array_agg(DISTINCT dp.division) AS divisions
                FROM
                    distributor_master dm
                LEFT JOIN distributor_plants dp ON dp.distributor_id = dm.id
                inner join customer_group_master cgm on cgm.id = dm.group_id
                WHERE
                    dm.status = 'ACTIVE'
                    AND dm.deleted = FALSE
                    AND dm.area_code IS NOT NULL
                    AND dm.region_id IS NOT NULL
                    AND dm.group_id IS NOT NULL
                    AND dm.channel_code = 'GT' 
                    AND dp.pdp_day ilike 'WE%' ${whereClause} ${whereClause2}
                GROUP BY
                    dm.id, dm.channel_code, dm.area_code, cgm."name"
            ), total_sales AS (
                SELECT
                    o.distributor_id,
                    dd.area_code,
                    dd.channel_code,
                    dd.divisions,
                    dd.customer_group,
                    SUM(
                        CASE 
                            WHEN o.so_value ~ '^[0-9]+(\.[0-9]+)?$' THEN o.so_value::numeric
                            ELSE 0
                        END
                    ) AS total_sales
                FROM
                    orders o
                INNER JOIN distributor_details dd ON dd.distributor_code = o.distributor_id
                WHERE
                    o.so_date >= CURRENT_DATE - INTERVAL '3 months'
                GROUP BY
                    o.distributor_id, dd.area_code, dd.channel_code, dd.divisions, dd.customer_group
            ), ranked_sales AS (
                SELECT
                    ts.distributor_id,
                    ts.area_code,
                    ts.channel_code,
                    ts.divisions,
                    ts.total_sales,
                    DENSE_RANK() OVER (PARTITION BY ts.area_code, ts.customer_group ORDER BY ts.total_sales DESC) AS rank
                FROM total_sales ts
            )
            SELECT
                rs.distributor_id AS distributor_code,
                rs.area_code,
                rs.channel_code,
                rs.divisions
            FROM
                ranked_sales rs
            WHERE
                rs.rank <= 1
            ORDER BY
                rs.area_code,
                rs.rank;            
                        `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount > 0) return result.rows;
            throw new ResultNotFound('Distributor not found in fetchDistributorListForPricing');
        } catch (error) {
            logger.error('Error in ArsModel => fetchDistributorListForPricing', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },

    async findUploadedFileMismatchRecords(uploadedData: any[], existingForecast: any[] | null, considerAdjustedForecast: boolean = false) {
        logger.info('inside ArsModel -> findUploadedFileMismatchRecords');
        const adjustedForecastStatement = considerAdjustedForecast ? `adjusted_forecast,` : '';
        //The query is in transaction because it creates temporary tables which should not be persisted in the database.
        const sqlStatement = `
        BEGIN;
        CREATE TEMP TABLE temp_table_uploaded_data (
            sold_to_party TEXT,
            parent_sku TEXT,
            by_allocation TEXT,
            adjusted_forecast TEXT
        );
        CREATE TEMP TABLE temp_table_existing_forecast (
            by_allocation TEXT,
            parent_sku TEXT,
            sold_to_party TEXT,
            adjusted_forecast TEXT
        );

        INSERT INTO temp_table_uploaded_data
        SELECT
            (x->>'sold_to_party')::text as sold_to_party,
            (x->>'parent_sku')::text as parent_sku,
            (x->>'by_allocation')::text as by_allocation,
            (x->> 'adjusted_forecast')::text as adjusted_forecast
        FROM jsonb_array_elements('${JSON.stringify(uploadedData)}') AS x;

        INSERT INTO temp_table_existing_forecast
        SELECT
            (x->>'forecast')::text as by_allocation,
            (x->>'parent_sku')::text as parent_sku,
            (x->>'sold_to_party')::text as sold_to_party,
            (x->> 'adjusted_forecast')::text as adjusted_forecast
        FROM jsonb_array_elements('${JSON.stringify(existingForecast)}') AS x;

        SELECT
            ${adjustedForecastStatement}
            sold_to_party,
            parent_sku,
            by_allocation
        FROM temp_table_uploaded_data
        EXCEPT
        SELECT 
            ${adjustedForecastStatement}
            sold_to_party,
            parent_sku,
            by_allocation
        FROM temp_table_existing_forecast;
        ROLLBACK;`;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result[5]?.rows;
        } catch (error) {
            logger.error('Error in ArsModel => findUploadedFileMismatchRecords', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async downloadDlpReport() {
        logger.info('inside ArsModel ->downloadDlpReport');
        const mismatchSqlStatement = `
            SELECT
                dpm.area_code as "(A) Area Code",
                dpm.customer_group_code as "(C) Customer Group Code",
                count(arr.item_object ->> 'material_code') AS "(M) Material Code Count",
                forecasted_pskus.psku_count AS "(F) Forecasted PSKUs",
                (forecasted_pskus.psku_count - count(arr.item_object ->> 'material_code')) AS "Delta Forecast(= F-M)",
                dpm.error_details -> 'itemNumbersReceivedFromSAPValidationResponse' AS "(S) SAP Response",
                (count(arr.item_object ->> 'material_code') - (dpm.error_details -> 'itemNumbersReceivedFromSAPValidationResponse')::int) AS "Delta Response(= M-S)"
            FROM
                distributor_pricing_master dpm
                CROSS JOIN LATERAL jsonb_array_elements(dpm.order_details -> 'items') WITH ORDINALITY arr(item_object, POSITION) 
            LEFT JOIN (
                SELECT
                    appl_area,
                    count(code) AS psku_count
                FROM
                    (
                    SELECT
                        code,
                        (UNNEST (appl_area_channel) -> 'area')::jsonb #>> '{}' AS appl_area,
                        (UNNEST (appl_area_channel) -> 'channel')::jsonb #>> '{}' AS appl_channel
                    FROM
                        material_master mm
                    WHERE 
                    mm.status = 'ACTIVE'
                    AND mm.deleted = FALSE
                    ) subquery
                WHERE
                    appl_channel = 'GT'
                GROUP BY
                    appl_area
            ) AS forecasted_pskus ON
                forecasted_pskus.appl_area = dpm.area_code
            WHERE
                dpm.id IN (
                SELECT
                    max(id)
                FROM
                    distributor_pricing_master dpm2
                GROUP BY
                    dpm2.area_code,
                    dpm2.customer_group_code)
            GROUP BY
                dpm.area_code,
                dpm.customer_group_code,
            forecasted_pskus.psku_count,
            dpm.error_details 
            ORDER BY dpm.area_code, dpm .customer_group_code ;
        `;
        const dlpReportSqlStatement = `
            WITH dlp_tentative AS (
            SELECT
                dpm.id,
                dpm.distributor_code,
                dpm.created_at,
                arr.item_object ->> 'division' AS division,
                arr.item_object ->> 'material_code' AS psku,
                arr.item_object ->> 'description' AS psku_description,
                arr.item_object ->> 'tentative' AS tentative
            FROM
                distributor_pricing_master dpm,
                jsonb_array_elements(order_details -> 'items') WITH ORDINALITY arr(item_object,
                POSITION)
            ),
            dlp_errors AS (
            SELECT
                dpm.id,
                ((err.error_object ->> 'material')::jsonb ->> 'material_code')::jsonb #>> '{}' AS psku ,
                string_agg( err.error_object ->> 'message',
                ';') AS sap_error
            FROM
                distributor_pricing_master dpm,
                jsonb_array_elements(error_details -> 'errors') WITH ORDINALITY err(error_object,
                POSITION)
            GROUP BY
                dpm.id,
                psku
            ),
            area_cgs AS (
            SELECT
                dm.area_code,
                cgm."name" AS customer_group,
                max(dpm.id)AS last_execution_id
            FROM
                distributor_master dm
            INNER JOIN customer_group_master cgm ON
                cgm.id = dm.group_id
            LEFT JOIN distributor_pricing_master dpm ON
                dpm.area_code = dm.area_code
                AND dpm.customer_group_code = cgm."name"
            WHERE
                dm.channel_code = 'GT'
                AND dm.status = 'ACTIVE'
                AND dm.deleted = FALSE
            GROUP BY
                dm.area_code ,
                cgm."name"
            )
            SELECT
                ac.area_code as "Area Code",
                ac.customer_group as "Customer Group",
                ac.last_execution_id as "Last Execution ID",
                dt.distributor_code as "Distributor Code",
                dt.division as "Division",
                dt.psku as "PSKU",
                dt.psku_description as "PSKU Description",
                dt.tentative as "Tentative Amount",
                de.sap_error as "SAP Error",
                to_char((dt.created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD HH24:MI:SS') AS "Last Execution At"
            FROM
                area_cgs ac
            LEFT JOIN dlp_tentative dt ON
                dt.id = ac.last_execution_id
            LEFT JOIN dlp_errors de ON
                de.id = ac.last_execution_id
                AND de.psku = dt.psku
            WHERE ac.area_code IS NOT NULL
            ORDER BY ac.area_code, ac.customer_group, dt.psku;
        `;
        let client;
        try {
            client = await conn.getReadClient();
            const mismatchResult = await client.query(mismatchSqlStatement);
            const dlpReportResult = await client.query(dlpReportSqlStatement);
            return {
                mismatchResult: mismatchResult?.rows,
                dlpReportResult: dlpReportResult?.rows,
            };
        } catch (error) {
            logger.error('Error in ArsModel => downloadDlpReport', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async stockNormDbFilter(ao_enabled: boolean, cg: string) {
        logger.info('inside ArsModel -> getAllDb');
        const arsEnableFilter = ao_enabled ? ' dm.ao_enable = true AND ' : '';
        const sqlStatement = `
            SELECT DISTINCT
                dm.id AS dist_id,
                up.name AS distributor_name,
                dm.area_code,
                gm.description AS region
            FROM
                distributor_master dm
            INNER JOIN
                group5_master gm ON gm.id = dm.group5_id
            INNER JOIN
                user_profile up ON up.id = dm.profile_id
            INNER JOIN
                customer_group_master cgm ON cgm.id = dm.group_id
            INNER JOIN
                stock_norm_config snc ON dm.id = snc.dist_id
            WHERE
                dm.deleted = 'false' AND
                dm.area_code IS NOT NULL AND
                ${arsEnableFilter}
                cgm."name" = '${cg}'
            ORDER BY
                gm.description,
                dm.area_code,
                distributor_name;
        `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            if (result?.rowCount > 0) {
                logger.info(`inside ArsModel -> getAll`);
                return result?.rows;
            }
            throw new ResultNotFound(`Couldn't find DBs`);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getAllDb ', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },
    async getRecordsWithZeroForecast() {
        logger.info('inside ArsModel -> getRecordsWithZeroForecast');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            WITH last_forecast AS (
                SELECT
                    asm_code,
                    max(created_on) AS created_on
                FROM
                    sales_allocation
                GROUP BY
                    asm_code
                )
                SELECT
                    sa."key" ,
                    sa.sold_to_party,
                    sa.asm_code as area_code,
                    sa.parent_sku
                FROM
                    sales_allocation sa
                INNER JOIN last_forecast lf ON
                    lf.asm_code = sa.asm_code
                LEFT JOIN updated_sales_allocation usa ON
                    usa.sales_allocation_key = sa."key"
                WHERE
                    sa.created_on = lf.created_on
                    AND sa.by_allocation = 0
                    AND (usa.updated_allocation = 0 or usa.updated_allocation is null)
                ORDER BY
                    sa.asm_code
            `;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getRecordsWithZeroForecast', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async reIndexArsTables() {
        logger.info('inside ArsModel -> reIndexArsTables');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            REINDEX INDEX sales_allocation_asm_code_created_on_idx;
            REINDEX INDEX stock_norm_config_dist_id_idx;
            REINDEX INDEX forecast_distribution_distributor_applicable_month_psku_div_idx;
            `;
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error('Error in ArsModel => reIndexArsTables', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchToleranceExcludedPskus() {
        logger.info('inside ArsModel -> fetchToleranceExcludedPskus');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
                SELECT mte.psku
                    , mm.description 
                    , mte.updated_on
                    , (case when mte.updated_by = 'SYSTEM_GENERATED' then 'SYSTEM_GENERATED' else COALESCE(shd.first_name, 'SYSTEM_GENERATED') || ' ' || COALESCE(shd.last_name, '') || '-' || COALESCE(SPLIT_PART(mte.updated_by, '#', 2)) end) as updated_by
                    , mte.deleted
                FROM material_tolerance_exclusions mte
                INNER JOIN material_master mm ON(mte.psku = mm.code)
                LEFT JOIN sales_hierarchy_details shd ON (shd.user_id = SPLIT_PART(mte.updated_by,'#',1))
                ORDER BY mte.psku;
            `;
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('Error in ArsModel => fetchToleranceExcludedPskus', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateToleranceExcludedPskus(pskuData: any[], role: string[], user_id: string) {
        logger.info('inside ArsModel -> updateToleranceExcludedPskus, psku_data: ', pskuData);
        let client: PoolClient | null = null;
        try {
            const user = `${user_id}#${role.join(',')}`;
            const pskus_to_insert: string[] = pskuData.filter((psku) => !psku.deleted).map((psku) => psku.psku);
            const pskus_to_delete: string[] = pskuData.filter((psku) => psku.deleted).map((psku) => psku.psku);
            const insert_query: string = pskus_to_insert.map((psku) => `('${psku}', '${user}')`).join(',');
            const delete_query: string = pskus_to_delete.map((psku) => `'${psku}'`).join(',');
            const insertStatement = `
                                    INSERT INTO  material_tolerance_exclusions (psku,updated_by)
                                    VALUES ${insert_query}
                                    ON CONFLICT (psku) DO UPDATE SET deleted = FALSE , updated_by = EXCLUDED.updated_by , updated_on = now()
                                    RETURNING psku;
                                `;
            const deleteStatement = `
                                    UPDATE material_tolerance_exclusions 
                                    SET deleted = TRUE , updated_on = now() , updated_by = '${user}'
                                    WHERE psku IN (${delete_query})
                                    RETURNING psku;
                                `;

            client = await conn.getWriteClient();
            let insertResponse: any[] = [];
            let deleteResponse: any[] = [];
            if (pskus_to_insert.length > 0) {
                insertResponse = (await client.query(insertStatement)).rows.map((row) => row.psku);
            }
            if (pskus_to_delete.length > 0) {
                deleteResponse = (await client.query(deleteStatement)).rows.map((row) => row.psku);
            }

            return {
                inserted: insertResponse,
                deleted: deleteResponse,
            };
        } catch (error) {
            logger.error('Error in ArsModel => updateToleranceExcludedPskus', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getSNSSCheckEmailLogs() {
        logger.info('inside ArsModel -> getSNSSCheckEmailLogs');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    SELECT id
                        ,el.type
                        ,el.status
                        ,el.subject
                        ,el.recipients
                        ,el.reference
                        ,el.email_data
                        ,el.error_logs
                        ,el.created_on
                        ,el.created_by
                    FROM email_logs el
                    WHERE created_on::date = (current_date  - interval '1 day')::date
                    AND el.type IN ('HOLDINGS_BELOW_SS','HOLDINGS_BELOW_SN')`;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('Error in ArsModel => getSNSSCheckEmailLogs', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getSNSSCheckDbs() {
        logger.info('inside ArsModel -> getSNSSCheckDbs');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
                    WITH db_tses AS(SELECT dm.profile_id AS db_code
                                        ,up."name" AS db_name
                                        ,up.email AS db_email
                                        ,dm.area_code
                                        ,dm.group5_id
                                        ,dm.tse_code
                                        ,gm.description AS region
                                        ,array_agg(shd.email) AS tse_emails
                                    FROM distributor_master dm
                                    INNER JOIN user_profile up ON (dm.profile_id  = up.id)
                                    INNER JOIN sales_hierarchy_details shd ON (dm.tse_code = shd.code)
                                    LEFT JOIN group5_master gm ON (dm.group5_id = gm.id)
                                    WHERE dm.status = 'ACTIVE'
                                        AND dm.deleted = FALSE
                                        AND dm.ao_enable = TRUE
                                        AND dm.enable_pdp = TRUE
                                    GROUP BY dm.profile_id
                                            ,up."name"
                                            ,up.email
                                            ,dm.area_code
                                            ,dm.group5_id
                                            ,dm.tse_code
                                            ,gm.description
                                    ),
                        db_details AS(
                            SELECT dt.db_code
                                ,dt.db_name
                                ,dt.db_email
                                ,dt.group5_id
                                ,dt.area_code
                                ,dt.tse_emails
                                ,dt.tse_code
                                ,dt.region
                                ,array_agg(shd.email) AS asm_emails
                            FROM db_tses dt
                            INNER JOIN sales_hierarchy_details shd ON (dt.area_code = shd.code)
                            GROUP BY dt.db_code
                                ,dt.db_name
                                ,dt.db_email
                                ,dt.group5_id
                                ,dt.area_code
                                ,dt.tse_emails
                                ,dt.tse_code
                                ,dt.region
                        )
                    SELECT dd.db_code
                        ,dd.db_name
                        ,dd.db_email
                        ,dd.group5_id
                        ,dd.area_code
                        ,dd.tse_emails
                        ,dd.asm_emails
                        ,dd.tse_code
                        ,dd.region
                        ,dp.distribution_channel 
                        ,dp.division
                        ,pm."name" AS plant_code
                        ,dp.pdp_day 
                        ,dp.reference_date 
                    FROM db_details AS dd
                    INNER JOIN distributor_plants dp ON (dp.distributor_id = dd.db_code)
                    LEFT JOIN plant_master pm ON (pm.id = dp.plant_id)
                    ORDER BY dd.db_code
                        ,dp.distribution_channel
                        ,dp.division ;
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('Error in ArsModel => getSNSSCheckDbs', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncForecastTotal(applicableMonth: string = Helper.applicableMonth('next')) {
        logger.info(`inside ArsModel -> syncForecastTotal. applicableMonth: ${applicableMonth}`);
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH latest AS (
            SELECT
                max(created_on) AS max_created_on,
                asm_code
            FROM
                sales_allocation
            GROUP BY
                asm_code
        ),
        area_psku_total AS (
            SELECT
                DISTINCT
                sa.asm_code,
                parent_sku,
                sa.forecast_qty AS area_total_buom
            FROM
                sales_allocation sa
            INNER JOIN latest l ON
                l.asm_code = sa.asm_code
                AND l.max_created_on = sa.created_on
        ),
        pan_india_total AS (
            SELECT
                apl.parent_sku ,
                sum(area_total_buom) AS psku_total_buom
            FROM
                area_psku_total apl
            GROUP BY
                apl.parent_sku
        ),
        psku_forecast AS (
            SELECT
                apt.parent_sku ,
                array_agg(
                    jsonb_build_object(
                        'area', apt.asm_code,
                        'forecast_buom', apt.area_total_buom,
                        'forecast_cs', round(apt.area_total_buom / COALESCE(mm.buom_to_cs,1))
                    )
                ) AS area_forecast
            FROM
                area_psku_total apt
            LEFT JOIN material_master mm ON
                mm.code = apt.parent_sku
            GROUP BY
                apt.parent_sku
        )
        INSERT
            INTO
            ars_forecast_total (
                applicable_month,
                psku,
                forecast_buom,
                forecast_cs,
                area_forecast
            )
        SELECT
            $1 AS applicable_month,
            pit.parent_sku ,
            pit.psku_total_buom ,
            ceil(pit.psku_total_buom / COALESCE(mm.buom_to_cs,1)) AS psku_total_cs,
            pf.area_forecast
        FROM
            pan_india_total pit
        INNER JOIN psku_forecast pf ON
            pf.parent_sku = pit.parent_sku
        LEFT JOIN material_master mm ON
            mm.code = pit.parent_sku
        ON
            CONFLICT (applicable_month, psku)
        DO UPDATE SET
            forecast_buom = EXCLUDED.forecast_buom,
            forecast_cs = EXCLUDED.forecast_cs,
            area_forecast = EXCLUDED.area_forecast;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [applicableMonth]);
            logger.info(`inside ArsModel -> syncForecastTotal. Rows affected:  ${result?.rowCount}`);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> syncForecastTotal', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async upsertSoqNorms(data, updatedDivisions, userId) {
        logger.info('inside ArsModel -> upsertSoqNorms');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            UPDATE soq_norm SET deleted = TRUE WHERE division IN ('${updatedDivisions.join("', '")}');
            INSERT
                INTO
                soq_norm (
                    division,
                    range_min,
                    range_max,
                    quantity,
                    updated_by
                )
            SELECT
                division,
                range_min,
                range_max,
                quantity,
                '${userId}' AS updated_by
            FROM
                jsonb_populate_recordset(
                    NULL::soq_norm,
                    '${JSON.stringify(data)}'
                )
            ON
                CONFLICT (
                    division,
                    range_min,
                    range_max
                ) DO
            UPDATE
            SET
                quantity = EXCLUDED.quantity,
                updated_by = EXCLUDED.updated_by,
                updated_on = now(),
                deleted = FALSE;

            DELETE FROM soq_norm WHERE deleted = TRUE;
            `;
            console.log(JSON.stringify(data));
            const result = await client.query(sqlStatement);
            return result;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> upsertSoqNorms', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async deleteSoqNorm(division: string | number, userId: string) {
        /**
         * By the logic, we soft delete the items in deleteSoqNorm() function.
         * When we do update in upsertSoqNorms() function, then the soft deleted rows are permanently deleted and sent to audit_trail.
         * There is a trigger function(soq_norm_trigger_function), that saves the deleted rows in audit_trail, before actual deletion of rows in soq_norms.
         */
        logger.info('inside ArsModel -> deleteSoqNorm');
        const sqlStatement = `
        UPDATE soq_norm SET deleted = TRUE, updated_by = $2, updated_on = now() WHERE division = $1;
        `;
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [division, userId]);
            return result.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> deleteSoqNorm', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAllSoqNorms() {
        logger.info('inside ArsModel -> fetchAllSoqNorms');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            WITH division_names AS (
                SELECT DISTINCT division, division_description FROM distributor_plants dp
            ),
            division_totals AS (
                SELECT
                    msd.division ,
                    dn.division_description,
                    aft.applicable_month,
                    sum(aft.forecast_cs) forecast_cs,
                    jsonb_agg(
                        jsonb_build_object(
                            'psku', aft.psku,
                            'description', mm.description,
                            'forecast_cs', round(aft.forecast_cs)
                        )
                    ) AS psku_totals
                FROM
                    ars_forecast_total aft
                INNER JOIN material_sales_details msd ON
                    msd.material_code = aft.psku
                    AND applicable_month = (SELECT max(applicable_month::numeric)::varchar  FROM ars_forecast_total aft )
                    AND msd.distribution_channel = '10'
                INNER JOIN material_master mm ON mm.code = msd.material_code
                LEFT JOIN division_names dn ON dn.division = msd.division
                GROUP BY
                    msd.division,
                    dn.division_description,
                    aft.applicable_month
            )
            SELECT
                sq.division,
                dt.division_description AS division_name,
                round(dt.forecast_cs) AS forecast,
                dt.applicable_month,
                jsonb_agg(
                jsonb_build_object(
                'max', range_max,
                'min', range_min,
                'soq', quantity
                )) AS slabs,
                dt.psku_totals
            FROM
                soq_norm sq
            INNER JOIN division_totals dt ON
                dt.division = sq.division
            WHERE deleted = false
            GROUP BY sq.division , dt.forecast_cs, dt.division_description, dt.applicable_month, dt.psku_totals;
            `;
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchAllSoqNorms', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchSoqNormsDivisionList() {
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH division_names AS (
            SELECT DISTINCT division, division_description FROM distributor_plants dp
        )
            SELECT
                msd.division ,
                dn.division_description,
                round(sum(aft.forecast_cs)) forecast,
                jsonb_agg(
                        jsonb_build_object(
                            'psku', aft.psku,
                            'description', mm.description,
                            'forecast_cs', round(aft.forecast_cs)
                        )
                    ) AS psku_totals
            FROM
                ars_forecast_total aft
            INNER JOIN material_sales_details msd ON
                msd.material_code = aft.psku
                AND applicable_month = (SELECT max(applicable_month::numeric)::varchar  FROM ars_forecast_total aft )
                AND msd.distribution_channel = '10'
            INNER JOIN material_master mm ON mm.code = msd.material_code
            LEFT JOIN division_names dn ON dn.division = msd.division
            GROUP BY
                msd.division,
                dn.division_description;`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchSoqNormsDivisionList', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async findApplicableSoqNorms(division: string[] | null = null, applicableMonth = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> findApplicableSoqNorms');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const whereConditions: string[] = [];
            division?.length && whereConditions.push(` sn.division IN ('${division.join("', '")}')`);
            const sqlStatement = `
           WITH division_forecast AS (
                SELECT
                    msd.division ,
                    aft.psku,
                    aft.forecast_cs
                FROM
                    ars_forecast_total aft
                INNER JOIN material_sales_details msd ON
                    msd.material_code = aft.psku
                    AND applicable_month = $1
                    AND msd.distribution_channel = '10'
                    ${whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : ''}      
            )
            SELECT
                df.psku,
                sn.quantity AS soq
            FROM
                soq_norm sn
            INNER JOIN division_forecast df ON
                df.division = sn.division
            WHERE
                sn.deleted = false and
                df.forecast_cs >= sn.range_min
                AND df.forecast_cs <= COALESCE(NULLIF(sn.range_max,-999),df.forecast_cs);
            `;
            const result = await client.query(sqlStatement, [applicableMonth]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> findApplicableSoqNorms', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDistributorForArsTentativeOrders() {
        /**
         * Find list of distributors for whom both global and db level ARS flags are ON.
         */
        logger.info('inside ArsModel -> fetchDistributorForArsTentativeOrders');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            dm.id
        FROM
            distributor_master dm
        INNER JOIN customer_group_master cgm ON
            cgm.id = dm.group_id
        INNER JOIN group5_master gm ON
            gm.id = dm.group5_id
        INNER JOIN ars_configurations ac ON
            ac.customer_group_id = cgm.id
            AND gm.id = ac.region_id
        WHERE
            dm.ao_enable = TRUE
            AND ac."configuration" = 'SWITCH'
            AND ac.auto_order = TRUE;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchDistributorForArsTentativeOrders', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async upsertArsTentativeOrderStockNorm(data) {
        logger.info('inside ArsModel -> upsertArsTentativeOrderStockNorm');
        let client: PoolClient | null = null;
        try {
            const today = new Date().getDate();
            const todayColumn = `_${today}`;
            const applicableMonth = Helper.applicableMonth();
            const dataset: any[] = [];
            const batchSize = 500000;
            client = await conn.getWriteClient();

            Object.keys(data)?.forEach((db) => {
                Object.entries(data[db])?.forEach((item) => {
                    const record = {
                        distributor_code: db,
                        psku: item[0],
                        applicable_month: applicableMonth,
                        [todayColumn]: Math.ceil(+item[1]),
                    };
                    dataset.push(record);
                });
            });

            // create batches:
            const batches = Helper.chunkArray(dataset, batchSize);
            logger.info('inside ArsModel -> upsertArsTentativeOrderStockNorm: Total Batches: ' + batches.length);

            for (let i = 0; i < batches.length; i++) {
                const sqlStatement = `
                    INSERT
                        INTO
                        public.ars_tentative_order_stock_norm_cv
                        (
                            distributor_code,
                            psku,
                            applicable_month,
                            "${todayColumn}"
                        )
                    SELECT
                        src.distributor_code,
                        src.psku,
                        src.applicable_month,
                        src."${todayColumn}"
                    FROM
                        jsonb_populate_recordset(null::ars_tentative_order_stock_norm_cv, $1) AS src
                    ON CONFLICT (
                        distributor_code,
                        psku,
                        applicable_month
                    )
                    DO UPDATE
                    SET
                        "${todayColumn}" = EXCLUDED."${todayColumn}",
                        updated_on = EXCLUDED.updated_on;
                    `;
                const result = await client.query(sqlStatement, [JSON.stringify(batches[i])]);
                logger.info(`ArsModel -> ars_tentative_order_stock_norm_cv: Batch: ${i + 1}: Rows affected: ${result?.rowCount}`);
            }
            return dataset.length;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> upsertArsTentativeOrderStockNorm', error);
            throw error;
        } finally {
            client?.release();
        }
    },

    async uploadSkuSoqNormSync(data: UploadSkuSoqNorm[], userId: string) {
        logger.info('inside ArsModel -> uploadSkuSoqNormSync');
        let client: PoolClient | null = null;
        try {
            /**
             * Provision has been made to soft-delete the records that are not present in the uploaded data.
             * updated_on and updated_by will only change if the soq_norm value has been changed from the existing value.
             * Since we have [FK] constraint on distributor_code and material_code, so only those records will be inserted which are present in distributor_master and material_master.
             */
            const sqlStatement = `
            UPDATE distributor_psku_soq_norm SET deleted = TRUE;
            INSERT
                INTO
                distributor_psku_soq_norm (
                    distributor_code,
                    material_code,
                    soq_norm,
                    updated_by
                )
            SELECT DISTINCT ON (dpsq.distributor_code,dpsq.material_code)
                dpsq.distributor_code,
                dpsq.material_code,
                dpsq.soq_norm,
                '${userId}'
            FROM jsonb_populate_recordset(
                    NULL::distributor_psku_soq_norm,
                    '${JSON.stringify(data)}'
            ) AS dpsq
            INNER JOIN distributor_master dm ON
                dm.id =  dpsq.distributor_code
            INNER JOIN material_master mm ON
                mm.code = dpsq.material_code
            WHERE
                dpsq.distributor_code IS NOT NULL
                AND dpsq.material_code IS NOT NULL
            ORDER BY dpsq.distributor_code,dpsq.material_code
            ON
                CONFLICT (distributor_code,material_code) DO UPDATE
            SET
                soq_norm = EXCLUDED.soq_norm,
                updated_by = CASE
                    WHEN distributor_psku_soq_norm.soq_norm IS DISTINCT FROM EXCLUDED.soq_norm THEN EXCLUDED.updated_by
                    ELSE distributor_psku_soq_norm.updated_by
                END,
                updated_on = CASE
                    WHEN distributor_psku_soq_norm.soq_norm IS DISTINCT FROM EXCLUDED.soq_norm THEN EXCLUDED.updated_on
                    ELSE distributor_psku_soq_norm.updated_on
                END,
                deleted = FALSE ;
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            const resultData = {
                deleteCount: 0,
                upsertCount: result && (result[1]?.rowCount ?? 0),
            };
            return resultData;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> uploadSkuSoqNormSync', error);
            return null;
        } finally {
            try {
                logger.info('inside ArsModel -> uploadSkuSoqNormSync: Reindexing distributor_psku_soq_norm');
                const sqlStatement = `REINDEX TABLE distributor_psku_soq_norm;`;
                await client?.query(sqlStatement);
            } catch (error) {
                logger.error('CAUGHT: Error in ArsModel -> uploadSkuSoqNormSync: Finally:', error);
            }
            client?.release();
        }
    },

    async uploadDBCensusCustomerGroup(data, userId) {
        logger.info('inside ArsModel -> uploadDBCensusCustomerGroup');
        let client: PoolClient | null = null;
        try {
            /**
             * QUERY:
             * Insert records for distributors that are present in distributor_master
             * updated_by and updated_on are updated only if records are updated.
             */
            const sqlStatement = `
            INSERT
                INTO
                distributor_census_customer_group (
                    distributor_code,
                    customer_group,
                    pop_class,
                    updated_by
                )
            SELECT
                dccg.distributor_code,
                dccg.customer_group,
                dccg.pop_class,
                $2
            FROM
                jsonb_populate_recordset(
                    NULL::distributor_census_customer_group,
                    $1
                )AS dccg
            INNER JOIN
                distributor_master dm
            ON
                dccg.distributor_code = dm.id
            WHERE
                dccg.distributor_code IS NOT NULL
                AND dccg.customer_group IS NOT NULL
                AND dccg.pop_class IS NOT NULL
            ON
                CONFLICT (distributor_code) DO
            UPDATE
            SET
                customer_group = EXCLUDED.customer_group,
                pop_class = EXCLUDED.pop_class,
                updated_by = CASE
                                WHEN distributor_census_customer_group.customer_group IS DISTINCT FROM EXCLUDED.customer_group
                                OR distributor_census_customer_group.pop_class IS DISTINCT FROM EXCLUDED.pop_class
                                THEN EXCLUDED.updated_by
                                ELSE distributor_census_customer_group.updated_by
                            END,
                updated_on = CASE
                                WHEN distributor_census_customer_group.customer_group IS DISTINCT FROM EXCLUDED.customer_group
                                OR distributor_census_customer_group.pop_class IS DISTINCT FROM EXCLUDED.pop_class
                                THEN now()
                                ELSE distributor_census_customer_group.updated_on
                            END;
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data), userId]);
            const resultData = {
                upsertCount: result && (result?.rowCount ?? 0),
                deleteCount: 0,
            };
            return resultData;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> uploadDBCensusCustomerGroup', error);
            LogService.insertSyncLog('DISTRIBUTOR_CENSUS_CUSTOMER_GROUP', 'FAIL', null, null, error);
            return null;
        } finally {
            client?.release();
        }
    },

    async findApplicableSkuSoqNorm(distributorCode: string | string[], applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> findApplicableSkuSoqNorm');
        let client: PoolClient | null = null;
        try {
            if (typeof distributorCode === 'string') distributorCode = [distributorCode];
            const sqlStatement = `
            WITH area_forecast AS (
                SELECT
                    psku,
                    (UNNEST(area_forecast) -> 'area')::jsonb #>> '{}' AS area,
                    ((UNNEST(area_forecast) -> 'forecast_cs')::jsonb #>> '{}')::NUMERIC  AS forecast_cs
                FROM
                    ars_forecast_total aft
                WHERE
                    applicable_month = $2
            )
            SELECT
                dpsn.distributor_code,
                dpsn.material_code,
                CASE
                    WHEN af.forecast_cs <= 0 THEN 0
                    ELSE dpsn.soq_norm
                END AS soq_norm
            FROM
                distributor_psku_soq_norm as dpsn
            INNER JOIN distributor_master dm on
                dm.id = dpsn.distributor_code
            INNER JOIN area_forecast af ON
                af.psku = dpsn.material_code
                and dm.area_code = af.area
            WHERE
                dpsn.deleted = FALSE
                AND dpsn.distributor_code = ANY($1);
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distributorCode, applicableMonth]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> findApplicableSkuSoqNorm', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async distributorCensusCustomerGroupDownload() {
        logger.info('inside ArsModel -> distributorCensusCustomerGroupDownload');
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT
                distributor_code AS "DB Code",
                pop_class AS "Pop Class"
            FROM
                public.distributor_census_customer_group;
            `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> distributorCensusCustomerGroupDownload', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async skuSoqNormDownload() {
        logger.info('inside ArsModel -> skuSoqNormDownload');
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT
                distributor_code AS "Distributor Code",
                up.name AS "Distributor Name",
                material_code AS "PSKU",
                mm.description AS "PSKU Description",
                soq_norm AS "SOQ Norm"
            FROM
                public.distributor_psku_soq_norm
            INNER JOIN user_profile up ON
                up.id = distributor_code
            INNER JOIN material_master mm ON
                mm.code = material_code
            WHERE
                distributor_psku_soq_norm.deleted = FALSE;
                `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> skuSoqNormDownload', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async insertForecastUploadDownloadLogs(
        data: {
            file_name: string;
            region: string;
            areas: string[];
            type: string;
            link: string | null | undefined;
            success: boolean;
            error: string | null | undefined;
        },
        userId: string,
        role: string[],
    ) {
        logger.info('inside ArsModel -> insertForecastUploadDownloadLogs, file: ' + data.file_name);
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const user = role ? `${userId}#${role.join(',')}` : 'SYSTEM_REQUEST';
            let request_type = '';
            switch (data.type) {
                case 'upload':
                    request_type = 'UPLOAD';
                    break;
                case 'download':
                    request_type = 'DOWNLOAD';
                    break;
                case 'archive':
                    request_type = 'ARCHIVE';
                    break;
                default:
                    request_type = 'UNKNOWN';
                    break;
            }
            const areas = data.areas;
            const sqlStatement = `
                INSERT INTO forecast_upload_download_logs
                (file_name, region, areas, request_type, file_link, success, error, requested_by)
                VALUES ($1, $2, $3::varchar[], $4, $5, $6, $7, $8);
            `;
            const result = await client.query(sqlStatement, [data.file_name, data.region, areas, request_type, data.link || '', data.success, data.error || '', user]);
            return result?.rowCount;
        } catch (error) {
            logger.error('Error in ArsModel => insertForecastUploadDownloadLogs', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchForecastUploadDownloadLogs(type: string = 'all', lastDay: boolean = true) {
        logger.info('inside ArsModel -> fetchForecastUploadDownloadLogs');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const lastDayCondition = lastDay ? ` AND fl.requested_on::date = (current_date - interval '1 day')` : ' AND fl.requested_on::date = current_date';
            let typeCondition = '';
            switch (type) {
                case 'upload':
                    typeCondition = ` AND fl.request_type = 'UPLOAD' and fl.allocation_done = FALSE`;
                    break;
                case 'download':
                    typeCondition = ` AND fl.request_type = 'DOWNLOAD'`;
                    break;
                case 'archive':
                    typeCondition = ` AND fl.request_type = 'ARCHIVE'`;
                    break;
                default:
                    typeCondition = '';
                    break;
            }
            const sqlStatement = `SELECT fl.key
                                    , fl.file_name
                                    , fl.region, fl.areas
                                    , fl.requested_on
                                    , fl.requested_by
                                    , fl.request_type
                                    , fl.file_link
                                    , fl.success
                                    , fl.error
                                    , COALESCE(shd.first_name,'') || ' ' || COALESCE(shd.last_name,'') AS requested_by_name
                                    , shd.code as user_code
                                FROM forecast_upload_download_logs fl
                                INNER JOIN sales_hierarchy_details shd ON (shd.user_id = SPLIT_PART(fl.requested_by,'#',1))
                                WHERE FL.file_name IS NOT NULL ${lastDayCondition} ${typeCondition}
                                ORDER BY fl.key
                                `;
            const result = await client.query(sqlStatement);
            return result?.rows ?? [];
        } catch (error) {
            logger.error('Error in ArsModel => fetchForecastUploadDownloadLogs', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateForecastUpdateDownloadLogs(fileName: string) {
        logger.info(`inside ArsModel -> updateForecastUpdateDownloadLogs` + fileName);
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
            update forecast_upload_download_logs set
            allocation_done = true
            where key = (select max(key) from forecast_upload_download_logs where file_name = $1 and request_type = 'UPLOAD');
            `;
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [fileName]);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateForecastUpdateDownloadLogs', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async uploadStockNorm(data, userId) {
        logger.info('inside ArsModel -> uploadStockNorm');
        let client: PoolClient | null = null;
        const sqlStatement = `
                WITH uploaded_record AS (            
                    SELECT
                        dist_id,
                        psku,
                        stock_norm,
                        class_of_last_update
                    FROM
                        jsonb_populate_recordset(NULL::stock_norm_config, $1)
                )
                , record_id AS (
                    SELECT
                        max(id) AS id,
                        ur.dist_id,
                        ur.psku,
                        ur.stock_norm,
                        ur.class_of_last_update
                    FROM
                        stock_norm_config snc
                    INNER JOIN uploaded_record ur ON
                        ur.dist_id = snc.dist_id
                        AND ur.psku = snc.psku
                    WHERE snc.applicable_month = (SELECT max(snc2.applicable_month) FROM stock_norm_config snc2 WHERE snc2.dist_id = ur.dist_id AND snc2.psku = ur.psku)
                    GROUP BY
                        ur.dist_id,
                        ur.psku,
                        ur.stock_norm,
                        ur.class_of_last_update
                )
                UPDATE
                    stock_norm_config snc2
                SET
                    stock_norm = record_id.stock_norm,
                    class_of_last_update = record_id.class_of_last_update,
                    updated_by = CASE 
                                    WHEN snc2.stock_norm IS DISTINCT FROM record_id.stock_norm THEN $2
                                    ELSE snc2.updated_by
                                END,
                    updated_on =  CASE 
                                    WHEN snc2.stock_norm IS DISTINCT FROM record_id.stock_norm THEN now()
                                    ELSE snc2.updated_on
                                END
                FROM
                    record_id
                WHERE
                    snc2.id = record_id.id;
            `;
        try {
            client = await conn.getWriteClient();
            const batchSize = 500000;
            const batches = Helper.chunkArray(data, batchSize);
            logger.info('inside ArsModel -> uploadStockNormToStaging: Total batches: ' + batches.length);
            for (let i = 0; i < batches.length; i++) {
                const result = await client.query(sqlStatement, [JSON.stringify(batches[i]), userId]);
                logger.info('inside ArsModel -> uploadStockNormToStaging: Batch: ' + (i + 1));
            }
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> uploadStockNorm', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchArsConfigurations(configurations: string[] | null = null, keys: string[] | null = null, allDetails: boolean = false) {
        logger.info('inside ArsModel -> fetchArsConfigurations');
        let client: PoolClient | null = null;
        let valuesArray: any[] = [];
        const whereConditions: string[] = [];
        let salesHierarchyJoin: string = '';

        const columns = {
            GENERAL: ['key', 'values'],
            TIMELINE: ['customer_group_id', 'cgm."name" as customer_group', 'cgm.description as desc', 'enable_adjustment', 'start_date', 'end_date'],
            SWITCH: ['region_id', 'gm."name" as region', 'customer_group_id', 'cgm."name" as customer_group', 'auto_order', 'auto_order_submit'],
            DETAILS: [
                'ac.description',
                'ac.updated_on',
                'ac.updated_by',
                'ac.remarks',
                'ac.field_type',
                'ac.description',
                'ac.deleted',
                'ac.allowed_values',
                'shd.first_name',
                'shd.last_name',
            ],
            MANDATORY_DETAILS: ['ac.id', 'ac.configuration'],
        };
        try {
            let applicableConfigurations = Object.keys(columns).filter((key) => !configurations || configurations?.length === 0 || configurations?.includes(key));
            if (allDetails) {
                applicableConfigurations.push('DETAILS');
                salesHierarchyJoin = `LEFT JOIN sales_hierarchy_details shd ON shd.user_id = ac.updated_by`;
            }
            applicableConfigurations.push('MANDATORY_DETAILS');
            whereConditions.push('ac.deleted = FALSE');
            configurations?.length && whereConditions.push(`configuration IN ('${configurations.join("', '")}')`);
            keys?.length && whereConditions.push(`key IN ('${keys.join("', '")}')`);
            const sqlStatement = `
            SELECT
            ${[
                ...new Set(
                    Object.keys(columns)
                        ?.filter((col) => applicableConfigurations.includes(col))
                        .map((col) => columns[col]),
                ),
            ]?.join(',')}
                FROM
                ars_configurations ac
                LEFT JOIN group5_master gm ON gm.id = ac.region_id 
                LEFT JOIN customer_group_master cgm ON cgm.id = ac.customer_group_id
                ${salesHierarchyJoin}
                WHERE
                ${whereConditions.join(' AND ')}
                `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, valuesArray);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchArsConfigurations', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async updateArsConfigurations(
        data: {
            id: number;
            remarks: string;
            auto_order: boolean | null;
            auto_order_submit: boolean | null;
            enable_adjustment: boolean | null;
            start_date: string | null;
            end_date: string | null;
            values: string | null;
        }[],
        userId: string,
    ) {
        logger.info('inside ArsModel -> updateArsConfigurations');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const sqlStatement = `
            with updated as (
                SELECT * FROM jsonb_populate_recordset(null::ars_configurations, $1 )
            )
            UPDATE
                ars_configurations
            SET
                remarks = updated.remarks,
                auto_order = updated.auto_order,
                auto_order_submit = updated.auto_order_submit,
                enable_adjustment = updated.enable_adjustment,
                start_date = updated.start_date,
                end_date = updated.end_date,
                updated_on = now(),
                updated_by= $2,
                "values" = updated.values
            FROM
                updated
            WHERE
                ars_configurations.id = updated.id;`;
            const result = await client.query(sqlStatement, [JSON.stringify(data), userId]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> updateArsConfigurations', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAosOrderPayload(id: number) {
        logger.info(`inside ArsModel -> fetchAosOrderPayload, id: ${id}`);
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            aw.id,
            aw.distributor_code,
            aw.pdp,
            aw.order_payload
        FROM
            audit.aos_workflow aw
        WHERE
            aw.id = $1;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [id]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchAosOrderPayload', error);
            return null;
        } finally {
            client?.release();
        }
    },
    async getTentativeOrderDetails(distId: string, applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsModel -> getTentativeOrderDetails');
        let client: PoolClient | null = null;
        const today = new Date();
        const todayColumn = `_${today.getDate()}`;
        const sqlStatement = `
        SELECT
            psku,
            ${todayColumn} as stock_norm_cv
        FROM
            ars_tentative_order_stock_norm_cv
        WHERE
            distributor_code = $1
            AND applicable_month = $2;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distId, applicableMonth]);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getTentativeOrderDetails', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchForecastDistribution(distributorCode: string, applicableMonth: string, nextApplicableMonth?: string) {
        logger.info('inside ArsModel -> fetchForecastDistribution');
        let client: PoolClient | null = null;

        // Adjust the SQL query to handle optional nextApplicableMonth
        const sqlStatement = `
        WITH applicable_forecast_month AS (
            SELECT
                *
            FROM
                (
                    VALUES
                        ($2, $4)
                        ${nextApplicableMonth ? ', ($3, $5)' : ''}
                ) AS t(
                    applicable_month,
                    forecast_month
                )
            )
        ,latest AS (
            SELECT
                asm_code,
                max(created_on) AS created,
                forecast_month
            FROM
                sales_allocation
            WHERE
                sold_to_party = $1
                AND forecast_month IN (
                    $4 ${nextApplicableMonth ? ', $5' : ''}
                )
            GROUP BY
                asm_code,
                forecast_month
        )
        ,forecast AS (
            SELECT
                sa.sold_to_party,
                sa.parent_sku,
                sa.parent_desc,
                sa.by_allocation,
                usa.updated_allocation,
                sa.forecast_month
            FROM
                sales_allocation sa
            INNER JOIN latest l ON l.asm_code = sa.asm_code AND l.forecast_month = sa.forecast_month
            LEFT JOIN updated_sales_allocation usa ON
                usa.sales_allocation_key = sa.KEY
            WHERE
                sa.sold_to_party = $1
        )
        SELECT
            fd.applicable_month,
            distributor_code,
            psku,
            f.parent_desc,
            division,
            pdp,
            f.by_allocation::float AS suggested_forecast,
            f.updated_allocation::float AS updated_forecast,
            (_1 + _2 + _3 + _4 + _5 + _6 + _7 + _8 + _9 + _10 + _11 + _12 + _13 + _14 + _15 + _16 + _17 + _18 + _19 + _20 + _21 + _22 + _23 + _24 + _25 + _26 + _27 + _28 + coalesce(_29, 0) + coalesce(_30, 0) + coalesce(_31, 0))::float AS distribution_total,
            "_1"::float,
            "_2"::float,
            "_3"::float,
            "_4"::float,
            "_5"::float,
            "_6"::float,
            "_7"::float,
            "_8"::float,
            "_9"::float,
            "_10"::float,
            "_11"::float,
            "_12"::float,
            "_13"::float,
            "_14"::float,
            "_15"::float,
            "_16"::float,
            "_17"::float,
            "_18"::float,
            "_19"::float,
            "_20"::float,
            "_21"::float,
            "_22"::float,
            "_23"::float,
            "_24"::float,
            "_25"::float,
            "_26"::float,
            "_27"::float,
            "_28"::float,
            "_29"::float,
            "_30"::float,
            "_31"::float,
            created_on,
            updated_on,
            "class"
        FROM
            public.forecast_distribution fd
        INNER JOIN applicable_forecast_month afm ON
            afm.applicable_month = fd.applicable_month
        LEFT JOIN forecast f ON
            f.sold_to_party = fd.distributor_code
            AND f.parent_sku = fd.psku
            AND afm.forecast_month = f.forecast_month
        WHERE
            distributor_code = $1
            AND fd.applicable_month IN ($2 ${nextApplicableMonth ? ', $3' : ''})
        ORDER BY applicable_month, psku;
        `;

        try {
            client = await conn.getReadClient();
            const currentMonthString = Helper.formatDateToCustomString(null, applicableMonth);
            const nextMonthString = nextApplicableMonth ? Helper.formatDateToCustomString(null, nextApplicableMonth) : null;

            const queryParams = [distributorCode, applicableMonth, nextApplicableMonth, currentMonthString, nextMonthString].filter((param) => param !== null); // Remove null values if nextApplicableMonth is not provided

            const result = await client.query(sqlStatement, queryParams);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchForecastDistribution');
            return null;
        } finally {
            client?.release();
        }
    },

    async getMissingDBPskuCombination(data: {}[]): Promise<{
        missing_distributors: string[];
        missing_materials: string[];
    } | null> {
        /**
         * This function is used to find the missing distributor_code and psku combination in the uploaded data.
         * data: {distributor_code: string, material_code: string}[]
         * return: {missing_distributors: string[], missing_materials: string[]}
         */

        logger.info('inside ArsModel -> getMissingDBPskuCombination');
        let client: PoolClient | null = null;
        try {
            const sqlStatement = `
            WITH uploaded_data AS (
                SELECT
                    distributor_code,
                    material_code
                FROM
                    jsonb_populate_recordset(
                        NULL::order_history_recommendation,
                        $1
                    )
            ),
            unavailable_distributors AS (
                SELECT
                    array_agg(
                        DISTINCT ud.distributor_code
                    ) AS missing_distributors
                FROM
                    uploaded_data AS ud
                LEFT JOIN distributor_master dm ON
                    dm.id = ud.distributor_code
                WHERE
                    dm.id IS NULL
            ),
            unavailable_materials AS (
                SELECT
                    array_agg(
                        DISTINCT ud.material_code
                    ) AS missing_materials
                FROM
                    uploaded_data AS ud
                LEFT JOIN material_master mm ON
                    mm.code = ud.material_code
                WHERE
                    mm.code IS NULL
            )
            SELECT
                *
            FROM
                unavailable_distributors,
                unavailable_materials;
            `;
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data)]);
            if (result?.rowCount) {
                return result?.rows[0];
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> getMissingDBPskuCombination', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchProductHierarchyFilter(search: string, isPskuCode: boolean = false) {
        logger.info('inside ArsModel -> fetchProductHierarchyFilter');
        let client: PoolClient | null = null;
        const sqlStatement = `
        SELECT
            DISTINCT
            ${isPskuCode ? 'mm.code,' : ''}
            ${isPskuCode ? 'mm.description,' : ''}
            mm.product_hierarchy_code,
            mm.description,
            mm.brand_variant,
            mm.brand_variant_desc,
            mm.brand,
            mm.brand_desc,
            mm.global_brand,
            mm.global_brand_desc,
            mm.variant,
            mm.variant_desc,
            mm.product,
            mm.product_desc,
            mm.category,
            mm.category_desc
        FROM
            material_master mm
        WHERE
            (
                mm.product_hierarchy_code ILIKE $1
                OR mm.description ILIKE $1
                OR mm.brand_variant ILIKE $1
                OR mm.brand_variant_desc ILIKE $1
                OR mm.brand ILIKE $1
                OR mm.brand_desc ILIKE $1
                OR mm.global_brand ILIKE $1
                OR mm.global_brand_desc ILIKE $1
                OR mm.variant ILIKE $1
                OR mm.variant_desc ILIKE $1
                OR mm.product ILIKE $1
                OR mm.product_desc ILIKE $1
                OR mm.category ILIKE $1
                OR mm.category_desc ILIKE $1
                ${isPskuCode ? 'OR mm.code ILIKE $1' : ''}
                ${isPskuCode ? 'OR mm.description ILIKE $1' : ''}
            )
            AND mm.deleted = FALSE
            AND mm.status = 'ACTIVE';
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [`%${search}%`]);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchProductHierarchyFilter', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async upsertDistributorPskuTolerance(
        data: {
            customer_group: string | null;
            tse_code: string | null;
            distributor_code: string | null;
            product_hierarchy: string | null;
            psku: string | null;
            max: number;
            min: number;
            created_by: string;
        }[],
    ) {
        logger.info('inside ArsModel -> upsertDistributorPskuTolerance');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH uploaded AS (
            SELECT
                tse_code,
                customer_group,
                distributor_code,
                product_hierarchy,
                psku,
                max,
                min,
                created_by
            FROM
                jsonb_populate_recordset(
                    NULL::ars_tolerance_distributor_material,
                    $1
                )
        )
        INSERT
            INTO
            ars_tolerance_distributor_material (
                tse_code,
                customer_group,
                distributor_code,
                product_hierarchy,
                psku,
                max,
                min,
                created_by
            )
        SELECT
            tse_code,
            customer_group,
            distributor_code,
            product_hierarchy,
            psku,
            max,
            min,
            created_by
        FROM
            uploaded
        ON
            CONFLICT (
                COALESCE(tse_code, ''),
                COALESCE(customer_group, ''),
                COALESCE(distributor_code, ''),
                COALESCE(product_hierarchy, ''),
                COALESCE(psku, '')
            )
        DO
        UPDATE
        SET
            max = EXCLUDED.max,
            min = EXCLUDED.min,
            updated_by = EXCLUDED.created_by,
            updated_on = now(),
            deleted = FALSE,
            revision_id = ars_tolerance_distributor_material.revision_id + 1;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement, [JSON.stringify(data)]);
            return result?.rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> upsertDistributorPskuTolerance', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDistributorPskuTolerance(distributorCode: string, customerGroup: string, tseCode: string, auditDetails: boolean = false) {
        logger.info('inside ArsModel -> fetchDistributorPskuTolerance');
        let client: PoolClient | null = null;
        const sqlStatement = `
        WITH ranked_matches AS (
            SELECT
                mm.code AS material_code,
                ${
                    auditDetails
                        ? `
                    mm.description,
                    coalesce(atm.updated_on, atm.created_on) as last_updated_on,
                    coalesce(atm.updated_by, atm.created_by) as last_updated_by,
                    `
                        : ''
                }
                atm.id AS tolerance_id,
                atm.revision_id,
                atm.max,
                atm.min,
                ROW_NUMBER() OVER (
                    PARTITION BY mm.code
                    ORDER BY
                        CASE
                            WHEN atm.distributor_code = $1 THEN 1
                            WHEN atm.customer_group = $2 AND atm.tse_code = $3 THEN 2
                            WHEN atm.tse_code = $3 THEN 3
                            ELSE 4
                        END,
                        CASE
                            WHEN atm.psku = mm.code THEN 1
                            WHEN atm.product_hierarchy = mm.product_hierarchy_code THEN 2
                            WHEN atm.product_hierarchy = mm.brand_variant THEN 3
                            WHEN atm.product_hierarchy = mm.brand THEN 4
                            WHEN atm.product_hierarchy = mm.global_brand THEN 5
                            WHEN atm.product_hierarchy = mm.variant THEN 6
                            WHEN atm.product_hierarchy = mm.product THEN 7
                            WHEN atm.product_hierarchy = mm.category THEN 8
                            ELSE 9
                        END
                ) AS row_num
            FROM
                public.ars_tolerance_distributor_material atm
            JOIN
                public.material_master mm
            ON
                atm.psku = mm.code
                OR (
                    atm.product_hierarchy = mm.product_hierarchy_code
                    OR atm.product_hierarchy = mm.brand_variant
                    OR atm.product_hierarchy = mm.brand
                    OR atm.product_hierarchy = mm.global_brand
                    OR atm.product_hierarchy = mm.variant
                    OR atm.product_hierarchy = mm.product
                    OR atm.product_hierarchy = mm.category
                )
            WHERE
                (
                    atm.distributor_code = $1
                    OR (atm.customer_group = $2 AND atm.tse_code = $3)
                    OR atm.tse_code = $3
                )
                AND atm.deleted = FALSE
        )
        SELECT
            material_code,
            ${
                auditDetails
                    ? `
                description,
                last_updated_by,
                last_updated_on,
                shd.first_name,
                shd.last_name,
                `
                    : ''
            }
            tolerance_id,
            revision_id,
            max,
            min
        FROM
            ranked_matches
            ${auditDetails ? `left join sales_hierarchy_details shd on shd.user_id = last_updated_by ` : ''}
        WHERE
            row_num = 1;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [distributorCode, customerGroup, tseCode]);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> fetchDistributorPskuTolerance');
            return null;
        } finally {
            client?.release();
        }
    },
    async uploadRegionForecastStaging(finalData: {}[], userId: string) {
        logger.info('inside ArsModel -> uploadRegionForecastStaging');
        let client: PoolClient | null = null;

        try {
            client = await conn.getWriteClient();
            const batchSize = 500000;
            const batches = Helper.chunkArray(finalData, batchSize);
            for (let i = 0; i < batches.length; i++) {
                const sqlStatement = `
                    INSERT INTO staging.updated_sales_allocation_staging (
                        distributor_code,
                        psku,
                        adjusted_allocation,
                        updated_by
                    )
                    SELECT 
                        distributor_code,
                        psku,
                        adjusted_allocation,
                        '${userId}'
                    FROM 
                        jsonb_populate_recordset(NULL::staging.updated_sales_allocation_staging,'${JSON.stringify(batches[i])}')
                    ON CONFLICT ON CONSTRAINT updated_sales_allocation_staging_un 
                    DO UPDATE SET 
                        adjusted_allocation = EXCLUDED.adjusted_allocation,
                        updated_by = EXCLUDED.updated_by;
                `;
                await client.query(sqlStatement);
            }
            return true;
        } catch (error) {
            logger.error('CAUGHT Error in ArsModel -> uploadRegionForecastStaging', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAreaDbMapFromAllocationStatging() {
        logger.info('inside ArsModel -> fetchAreaDbMapFromAllocationStatging');
        let client: PoolClient | null = null;
        const sqlStatement = `
            SELECT jsonb_build_object(area_code,jsonb_agg(dm.id)) as area_db_map
            FROM
                staging.updated_sales_allocation_staging usas
            INNER JOIN distributor_master dm ON
                dm.id = usas.distributor_code
            WHERE dm.area_code IS NOT NULL
            GROUP BY area_code;
        `;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            if (result?.rows) return result.rows;
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error inside ArsModel -> fetchAreaDbMapFromAllocationStatging', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async allocationFromStaging(areaDbMapping) {
        logger.info('inside ArsModel -> allocationFromStaging');
        let client: PoolClient | null = null;
        const stagingToAllocationStatement = `
                WITH latest AS (
                    SELECT
                        sa.asm_code,
                        MAX(sa.created_on) AS max_created_on,
                        sa2.forecast_month AS max_forecast_month
                    FROM
                        sales_allocation sa
                    INNER JOIN (
                        SELECT asm_code, forecast_month FROM jsonb_populate_recordset(null::sales_allocation, '${JSON.stringify(areaDbMapping)}')
                    ) sa2 on sa2.asm_code = sa.asm_code
                    GROUP BY
                        sa.asm_code, sa2.forecast_month
                )
                INSERT INTO public.updated_sales_allocation (
                    sales_allocation_key,
                    updated_allocation,
                    updated_on,
                    updated_by
                )
                SELECT
                    sa."key",
                    usas.adjusted_allocation,
                    NOW(),
                    usas.updated_by
                FROM
                    sales_allocation sa
                INNER JOIN latest l ON
                    l.max_created_on = sa.created_on
                    AND l.asm_code = sa.asm_code
                    AND sa.forecast_month = l.max_forecast_month
                INNER JOIN staging.updated_sales_allocation_staging usas ON
                    usas.distributor_code = sa.sold_to_party
                    AND usas.psku = sa.parent_sku
                ON CONFLICT (sales_allocation_key)
                DO UPDATE SET
                    updated_allocation = EXCLUDED.updated_allocation,
                    updated_on = EXCLUDED.updated_on,
                    updated_by = EXCLUDED.updated_by;
        `;
        const truncateStatement = `TRUNCATE staging.updated_sales_allocation_staging`;
        try {
            client = await conn.getWriteClient();
            const res = await client.query(stagingToAllocationStatement);
            if (res && res.rowCount > 0) {
                await client.query(truncateStatement);
                return res.rowCount;
            }
            logger.error('CAUGHT : Error in ArsModel ->allocationFromStaging : Failed to insert into updated_sales_allocation');
            return null;
        } catch (error) {
            logger.error('CAUGHT : Error in ArsModel -> allocationFromStaging : ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchDbPSKUTolerance(
        limit: number,
        offset: number,
        dbCode: string | null = null,
        cg: string | null = null,
        psku: string | null = null,
        pskuHierarchy: string[] | null = null,
        zoneArea: string[] | null,
    ) {
        logger.info('inside ArsModel -> fetchDbPSKUTolerance');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const whereConditions: string[] = [];
            zoneArea && zoneArea.length > 0 && whereConditions.push(`(dm.tse_code in ('${zoneArea.join("','")}') OR atdm.tse_code in ('${zoneArea.join("','")}'))`);
            dbCode && whereConditions.push(`atdm.distributor_code ILIKE '%${dbCode}%'`);
            cg && whereConditions.push(`atdm.customer_group ILIKE '%${cg}%'`);
            psku && whereConditions.push(`atdm.psku ILIKE '%${psku}%'`);
            pskuHierarchy && pskuHierarchy.length > 0 && whereConditions.push(`ARRAY['${pskuHierarchy.join("','")}'] && regexp_split_to_array(hierarchy_path, '#')`);
            const productHierarchyJoinStatement =
                pskuHierarchy && pskuHierarchy.length > 0
                    ? `
                INNER JOIN (
                    SELECT DISTINCT
                        CASE
                            WHEN atdm.product_hierarchy IS NULL THEN atdm.psku
                            ELSE atdm.product_hierarchy
                        END AS product_hierarchy,
                        CASE
                            WHEN mm.code = atdm.psku THEN mm.code || '#' || mm.product_hierarchy_code || '#' || mm.brand_variant || '#' || mm.brand || '#' || mm.global_brand || '#' || mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.product_hierarchy_code = product_hierarchy THEN mm.product_hierarchy_code || '#' || mm.brand_variant || '#' || mm.brand || '#' || mm.global_brand || '#' || mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.brand_variant = product_hierarchy THEN mm.brand_variant || '#' || mm.brand || '#' || mm.global_brand || '#' || mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.brand = product_hierarchy THEN mm.brand || '#' || mm.global_brand || '#' || mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.global_brand = product_hierarchy THEN mm.global_brand || '#' || mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.variant = product_hierarchy THEN mm.variant || '#' || mm.product || '#' || mm.category
                            WHEN mm.product = product_hierarchy THEN mm.product || '#' || mm.category
                            WHEN mm.category = product_hierarchy THEN mm.category
                        END AS hierarchy_path
                    FROM material_master mm
                    INNER JOIN ars_tolerance_distributor_material atdm ON
                        (mm.product_hierarchy_code = product_hierarchy) OR
                        (mm.brand = product_hierarchy) OR
                        (mm.brand_variant = product_hierarchy) OR
                        (mm.global_brand = product_hierarchy) OR
                        (mm.variant = product_hierarchy) OR
                        (mm.product = product_hierarchy) OR
                        (mm.category = product_hierarchy) OR
                        (mm.code = atdm.psku)
                ) hierarchy ON hierarchy.product_hierarchy = atdm.product_hierarchy OR hierarchy.product_hierarchy = atdm.psku`
                    : ``;
            const sqlStatement = `
                SELECT
                    atdm.id, atdm.tse_code, atdm.customer_group, atdm.distributor_code,
                    CASE
                        WHEN pd."desc" IS NULL THEN mm.description
                        ELSE pd."desc"
                    END as product_hierarchy_desc, atdm.product_hierarchy, atdm.psku, atdm.max, atdm.min, COUNT(*) OVER() AS total_count
                FROM
                    ars_tolerance_distributor_material atdm
                LEFT JOIN (
                    SELECT DISTINCT ON (product_hierarchy) product_hierarchy ph,mm.*,
                        CASE
                            WHEN mm.category = product_hierarchy THEN mm.category_desc
                            WHEN mm.product_hierarchy_code = product_hierarchy THEN mm.description
                            WHEN product_hierarchy = mm.brand THEN mm.brand_desc
                            WHEN product_hierarchy = mm.brand_variant THEN mm.brand_variant_desc
                            WHEN product_hierarchy = mm.global_brand THEN mm.global_brand_desc
                            WHEN product_hierarchy = mm.variant THEN mm.variant_desc
                            WHEN product_hierarchy = mm.product THEN mm.product_desc
                            ELSE null
                        END AS "desc"
                    FROM (SELECT * FROM material_master mm WHERE mm.code IS NOT NULL AND mm.product_hierarchy_code IS NOT NULL AND mm.brand IS NOT NULL AND mm.brand_variant IS NOT NULL AND mm.global_brand IS NOT NULL AND mm.variant IS NOT NULL AND mm.product IS NOT NULL AND mm.category IS NOT NULL) mm
                	INNER JOIN ars_tolerance_distributor_material atdm ON (mm.product_hierarchy_code = product_hierarchy) OR (mm.brand = product_hierarchy) OR (mm.brand_variant =  product_hierarchy) OR (mm.global_brand = product_hierarchy) OR (mm.variant = product_hierarchy) OR (mm.product = product_hierarchy) OR (mm.category = product_hierarchy)
                ) as pd on pd.ph = atdm.product_hierarchy
                LEFT JOIN distributor_master dm on atdm.distributor_code = dm.id
                LEFT JOIN material_master mm on atdm.psku = mm.code
                ${productHierarchyJoinStatement}
                ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
                LIMIT ${limit}
                OFFSET ${offset}
            `;
            const res = await client.query(sqlStatement);
            if (res?.rows) {
                return res.rows;
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT CAUGHT Error in ArsModel -> fetchDbPSKUTolerance', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async deleteDbPSKUTolerance(ids: number[]) {
        logger.info('inside ArsModel -> deleteDbPSKUTolerance');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const whereCondition = ids.length > 0 ? `WHERE id IN (${ids.join(',')})` : '';
            const sqlStatement = `
                DELETE FROM ars_tolerance_distributor_material ${whereCondition}
            `;
            const res = await client.query(sqlStatement);
            if (res.rowCount) return res.rowCount;
            return null;
        } catch (error) {
            logger.error('CAUGHT : Error in ArsModel -> deleteDbPSKUTolerance', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async aosSimulationReport(distributorCode: string, date: string) {
        logger.info('inside ArsModel -> aosSimulationReport');
        let client: PoolClient | null = null;
        try {
            client = await conn.getReadClient();
            const orderSummarySql = `
            SELECT
                aw.distributor_code,
                up.name AS distributor_name,
                aw.order_payload -> 'partners' AS partners,
                aw.order_date,
                aw.order_id ,
                o.po_number ,
                o.so_number ,
                aw.errors,
                aw.holdings,
                aw.order_payload,
                aw.sap_validation_payload_1,
                aw.sap_validation_errors_1,
                aw.sap_validation_payload_2,
                aw.sap_validation_errors_2,
                aw.sap_submit_payload,
                aw.soq_calculations,
                aw.pdp
            FROM
                audit.aos_workflow aw
            INNER JOIN public.user_profile up ON
                up.id = aw.distributor_code
            LEFT JOIN public.orders o ON
                o.id = aw.order_id
            WHERE
                distributor_code = '${distributorCode}'
                AND aw.order_date = '${date}'
            `;
            const shippingRes = await client.query(orderSummarySql);
            if (shippingRes?.rowCount) {
                return shippingRes.rows[0];
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT : Error in ArsModel -> aosSimulationReport', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchStockNormForDistributor(distributorCode: string) {
        let client: PoolClient | null = null;
        logger.info('Inside ArsModel -> fetchStockNormForDistributor');
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
            WITH ac AS (
                SELECT area_code
                FROM distributor_master dm
                WHERE dm.id = '${distributorCode}'
            ),  
            psku_class AS (
                SELECT
                    sa.parent_sku,
                    sa.class,
                    sa.parent_desc,
                    CASE
                        WHEN class = 'A' THEN snd.class_a_ss_percent
                        WHEN class = 'B' THEN snd.class_b_ss_percent
                        WHEN class = 'C' THEN snd.class_c_ss_percent
                        ELSE snd.class_a_ss_percent
                    END AS ss
                FROM sales_allocation sa
                INNER JOIN distributor_master dm ON dm.id = sa.sold_to_party
                INNER JOIN stock_norm_default snd ON dm.group_id = snd.customer_group_id
                INNER JOIN ac ON ac.area_code = sa.asm_code
                WHERE sa.sold_to_party = '${distributorCode}'
                AND sa.created_on = (
                    SELECT max(created_on) 
                    FROM sales_allocation sa2 
                    WHERE sa2.asm_code = ac.area_code
                )
            ),
            max_applicable_date AS (
                SELECT 
                    snc.dist_id,
                    MAX(applicable_month) AS max_date
                FROM stock_norm_config snc
                WHERE snc.dist_id = '${distributorCode}'
                GROUP BY snc.dist_id
            )
            SELECT
                jsonb_agg(json_build_object(
                    'psku', psku_class.parent_sku,
                    'id', snc.id,
                    'psku_name', psku_class.parent_desc,
                    'stock_norm', snc.stock_norm,
                    'ss', psku_class.ss,
                    'class', psku_class."class",
                    'updated_by', snc.updated_by,
                    'updated_on', snc.updated_on,
                    'first_name', shd.first_name,
                    'last_name', shd.last_name,
                    'class_of_last_update', snc.class_of_last_update
                ) ORDER BY (stock_norm IS NULL) DESC, parent_desc) AS stock_norm_data
            FROM stock_norm_config snc
            INNER JOIN psku_class ON snc.psku = psku_class.parent_sku
            INNER JOIN max_applicable_date mad ON snc.dist_id = mad.dist_id
            INNER JOIN sales_hierarchy_details shd ON shd.user_id = snc.updated_by
            WHERE
                snc.applicable_month = mad.max_date
                AND snc.dist_id = '${distributorCode}'
            `;
            const result = await client.query(sqlStatement);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT : Error in ArsModel -> fetchStockNormForDistributor', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchSalesMonthByArea(areaCode: string | null = null) {
        logger.info('Inside ArsModel->fetchSalesMonthByArea for ', areaCode);
        let client: PoolClient | null = null;
        const areaQuery = areaCode ? `AND fss.area_code = '${areaCode}'` : '';
        try {
            client = await conn.getReadClient();
            const sqlStatement = `
               WITH area_date AS (
                    SELECT
                        fss.area_code AS ac,
                        MAX(fss."date") AS max_date
                    FROM
                        forecast_sync_status fss
                    WHERE
                        fss.sync_type = 'SALES_ALLOCATION'
                        AND fss.status = true
                    GROUP BY
                        fss.area_code
                )
                SELECT
                    jsonb_agg(
                        jsonb_build_object(
                            'area_code', fss.area_code,
                            'start_month', fss.start_month,
                            'end_month', fss.end_month
                        )
                    ) as area_month
                FROM
                    forecast_sync_status fss
                INNER JOIN
                    area_date ad
                ON
                    ad.max_date = fss.date
                    AND ad.ac = fss.area_code
                WHERE
                    fss.sync_type = 'SALES_ALLOCATION'
                    ${areaQuery}
                ;
            `;
            const result = await client.query(sqlStatement);
            return result?.rows[0] ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel->fetchSalesMonthByArea : ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async fetchAreaForecastDumpDetails(areaCode: string) {
        logger.info('Inside arsModel->fetchAreaForecastDumpDetails: ' + areaCode);
        let client: PoolClient | null = null;
        const sqlStatement = `
            WITH last_updated_month AS (
                SELECT
                    area_code,
                    TO_CHAR(start_month::date, 'YYYY-MM-DD') as start_month,
                    TO_CHAR(end_month::date, 'YYYY-MM-DD') as end_month
                FROM
                    forecast_sync_status fss
                WHERE
                    fss.area_code = $1
                    AND sync_type = 'SALES_ALLOCATION'
                    AND date = (
                        SELECT
                            MAX(date)
                        FROM
                            forecast_sync_status fss_inner
                        WHERE
                            fss_inner.area_code = $1
                            AND sync_type = 'SALES_ALLOCATION'
                    )
            ),
            last_forecast_month AS (
                SELECT
                    DISTINCT asm_code,
                    forecast_month
                FROM
                    sales_allocation sa
                WHERE
                    sa.asm_code = $1
                    AND sa.created_on = (
                        SELECT
                            MAX(sa2.created_on)
                        FROM
                            sales_allocation sa2
                        WHERE
                            sa2.asm_code = $1
                    )
            ),
            db_details AS (
				SELECT
					area_code,
					jsonb_agg(dm.id || '#' || up."name") AS db_codes
				FROM
					distributor_master dm
                INNER JOIN user_profile up on up.id = dm.id
				WHERE
					dm.area_code = $1
				GROUP BY dm.area_code
            )
            SELECT
                lfm.asm_code,
                lfm.forecast_month,
                lum.start_month,
                lum.end_month,
                dd.db_codes
            FROM
                last_forecast_month lfm
            LEFT JOIN
                last_updated_month lum ON lum.area_code = lfm.asm_code
            INNER JOIN
                db_details dd ON dd.area_code = lfm.asm_code;
        `;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement, [areaCode]);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in arsModel->fetchAreaForecastDumpDetails ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async uploadClassLevelStockNorm(data: UploadClassLevelStockNorm[], usrerId: string, overwrite: boolean = false) {
        logger.info('inside ArsModel -> uploadClassLevelStockNorm');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const deleteTable = 'DELETE FROM staging.sn_db_psku_class_staging;';
            const staggingSql = `
            INSERT INTO staging.sn_db_psku_class_staging(db, a, b, c, created_by)
            SELECT 
                db, a, b, c, '${usrerId}'
                FROM jsonb_populate_recordset(NULL::staging.sn_db_psku_class_staging, '${JSON.stringify(data)}')
            ON CONFLICT (db)
            DO UPDATE SET 
                a = EXCLUDED.a,
                b = EXCLUDED.b,
                c = EXCLUDED.c,
                created_by = EXCLUDED.created_by;
            `;
            const insertSql = `
            WITH latest AS (
                SELECT
                    asm_code,
                    max(created_on) AS created
                FROM
                    sales_allocation sa
                GROUP BY
                    asm_code
            )
            ,updated_sn AS (
                SELECT
                    sa.sold_to_party,
                    sa.parent_sku,
                    sa.CLASS,
                    sdpcs.created_by,
                    CASE
                        WHEN sa.CLASS = 'A' THEN sdpcs.a
                        WHEN sa.CLASS = 'B' THEN sdpcs.b
                        WHEN sa.CLASS = 'C' THEN sdpcs.c
                    END AS sn,
                    CASE
                        WHEN sa.CLASS = 'A' THEN snd.class_a_ss_percent
                        WHEN sa.CLASS = 'B' THEN snd.class_b_ss_percent
                        WHEN sa.CLASS = 'C' THEN snd.class_c_ss_percent
                    END AS ss_percent
                FROM
                    sales_allocation sa
                INNER JOIN latest l ON
                    l.asm_code = sa.asm_code
                    AND l.created = sa.created_on
                INNER JOIN staging.sn_db_psku_class_staging sdpcs ON
                    sdpcs.db = sa.sold_to_party
                INNER JOIN distributor_master dm ON
                    dm.id = sa.sold_to_party
                LEFT JOIN stock_norm_default snd ON
                    snd.customer_group_id = dm.group_id
            )
            UPDATE
                stock_norm_config
            SET
                stock_norm = updated_sn.sn,
                ss_percent = updated_sn.ss_percent,
                class_of_last_update = updated_sn.CLASS,
                updated_by = updated_sn.created_by,
                updated_on = now()
            FROM
                updated_sn
            WHERE
                applicable_month = (SELECT max(applicable_month) FROM stock_norm_config)
                AND dist_id = updated_sn.sold_to_party
                AND public.stock_norm_config.psku = updated_sn.parent_sku
                ${
                    overwrite
                        ? ''
                        : `
                    AND (
                        stock_norm != updated_sn.sn
                        or stock_norm is null 
                    )
                `
                }
        `;
            await client?.query('BEGIN;');
            await client?.query(deleteTable);
            const stagingResult = await client?.query(staggingSql);
            if (stagingResult?.rowCount) {
                const insertResult = await client?.query(insertSql);
                if (insertResult?.rowCount) {
                    await client?.query('COMMIT;');
                    logger.info('inside ArsModel -> uploadClassLevelStockNorm: Upload is successful, COMMIT changes: Rowcount: ' + insertResult.rowCount);
                    return insertResult.rowCount;
                }
            } else {
                throw new Error('Upload in staging failed');
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsModel -> uploadClassLevelStockNorm: ROLLBACK: Error: ', error);
            await client?.query('ROLLBACK;');
            return null;
        } finally {
            client?.release();
        }
    },
};
