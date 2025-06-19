
import logger from '../lib/logger';
import commonHelper from '../helper';

import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

const tableColumns = {
    forecast_configurations: [
        'area_code',
        'applicable_month',
        'weekly_week1',
        'weekly_week2',
        'weekly_week3',
        'weekly_week4',
        'fortnightly_week12',
        'fortnightly_week34',
        'created_on',
        'updated_on',
        'is_deleted',
        'updated_by',
        'customer_group'
    ],
    forecast_distribution: [
        'distributor_code',
        'psku',
        'applicable_month',
        'pdp',
        'division',
        '_1',
        '_2',
        '_3',
        '_4',
        '_5',
        '_6',
        '_7',
        '_8',
        '_9',
        '_10',
        '_11',
        '_12',
        '_13',
        '_14',
        '_15',
        '_16',
        '_17',
        '_18',
        '_19',
        '_20',
        '_21',
        '_22',
        '_23',
        '_24',
        '_25',
        '_26',
        '_27',
        '_28',
        '_29',
        '_30',
        '_31',
        'created_on',
        'updated_on',
        'class'
    ],
    stock_norm_config: [
        'applicable_month',
        'class_a_sn',
        'class_a_ss_percent',
        'class_b_sn',
        'class_b_ss_percent',
        'class_c_sn',
        'class_c_ss_percent',
        'updated_by',
        'updated_on',
        'remarks',
        'dist_id'
    ],
    monthly_sales: [
        'sold_to_party',
        'asm_code',
        'year_month',
        'parent_sku',
        'parent_desc',
        'product_hierarchy',
        'customer_name',
        'billing_quantity_in_base_unit',
        'billing_quantity_in_base_unit_sum',
        'percentage_sales',
        'created_on'
    ],
    sales_allocation: [
        'key',
        'sold_to_party',
        'asm_code',
        'parent_sku',
        'parent_desc',
        'product_hierarchy',
        'customer_name',
        'billing_quantity_in_base_unit',
        'billing_quantity_in_base_unit_sum',
        'percentage_sales',
        'forecast_qty',
        'forecast_uom',
        'by_allocation',
        'brand_variant',
        'regional_brand',
        'grammage',
        'base_unit',
        'weight_unit',
        'forecast_month',
        'created_on',
        'contribution',
        'cumulative_sum',
        'class'
    ],
    updated_sales_allocation: [
        'key',
        'updated_allocation',
        'updated_on',
        'updated_by',
        'sales_allocation_key'
    ],
}

export const SeedModel = {
    async getForecastConfiguration(applicableMonths: string[]) {
        let client: any = null;
        const sqlStatement = `
        select
            ${tableColumns.forecast_configurations.join(', ')}
        from
            public.forecast_configurations
        where
            applicable_month in ('${applicableMonths.join("', '")}');`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getForecastConfiguration()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedForecastConfigurations(data: string) {
        const conflictColumns = [
            'area_code',
            'applicable_month',
            'customer_group'
        ];
        const updateColumns = tableColumns.forecast_configurations.filter((column) => !conflictColumns.includes(column));
        const updateStatement = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
        const sqlStatement = `
        INSERT INTO forecast_configurations
        (${tableColumns.forecast_configurations.join(', ')})
        SELECT 
            ${tableColumns.forecast_configurations.join(', ')}
        FROM json_populate_recordset(null::forecast_configurations, '${data}')
        ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateStatement};
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const { rowCount } = await client.query(sqlStatement);
            return rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedForecastConfigurations()', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getForecastDistribution(applicableMonths: string[]) {
        let client: any = null;
        const sqlStatement = `
        select
            ${tableColumns.forecast_distribution.join(', ')}
        from
            public.forecast_distribution
        where
            applicable_month in ('${applicableMonths.join("', '")}');`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getForecastDistribution()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedForecastDistribution(data: string) {
        const conflictColumns = [
            'distributor_code',
            'psku',
            'applicable_month',
            'division',
        ];
        const updateColumns = tableColumns.forecast_distribution.filter((column) => !conflictColumns.includes(column));
        const updateStatement = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
        const sqlStatement = `
        BEGIN;
        INSERT INTO forecast_distribution
        (${tableColumns.forecast_distribution.join(', ')})
        SELECT 
            ${tableColumns.forecast_distribution.join(', ')}
        FROM json_populate_recordset(null::forecast_distribution, '${data}')
        ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateStatement};
        SELECT setval('forecast_distribution_id_seq', (SELECT max(id) FROM forecast_distribution));
        COMMIT;
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response[1].rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedForecastDistribution()', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getStockNormConfig(applicableMonths: string[]) {
        let client: any = null;
        const sqlStatement = `
        select
            ${tableColumns.stock_norm_config.join(', ')}
        from
            public.stock_norm_config
        where
            applicable_month in ('${applicableMonths.join("', '")}');`;
        try {
            client = await conn.getReadClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getStockNormConfig()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedStockNormConfig(data: string) {
        const conflictColumns = [
            'dist_id',
            'applicable_month',
        ];
        const updateColumns = tableColumns.stock_norm_config.filter((column) => !conflictColumns.includes(column));
        const updateStatement = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
        const sqlStatement = `
        BEGIN;
        INSERT INTO stock_norm_config
        (${tableColumns.stock_norm_config.join(', ')})
        SELECT 
            ${tableColumns.stock_norm_config.join(', ')}
        FROM json_populate_recordset(null::stock_norm_config, '${data}')
        ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateStatement};
        SELECT setval('stock_norm_config_id_seq', (SELECT max(id) FROM stock_norm_config) );
        COMMIT;
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response[1].rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedStockNormConfig()', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getAllAreaCodes() {
        const sqlStatement = `
        SELECT code
        FROM area_codes;`;
        const client = await conn.getReadClient();
        try {
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getAllAreaCodes()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async getMonthlySales(applicableMonths: string[], areaCode: string) {
        const dumpingDates = commonHelper.generateDumpingDate(applicableMonths);

        let client: any = null;
        const sqlStatement = `
            select
                ${tableColumns.monthly_sales.join(', ')}
            from
                public.monthly_sales
            where
                created_on::text similar to '(${dumpingDates})%'
                and asm_code = '${areaCode}';`;
        try {
            client = await conn.getWriteClient();
            const result = await client.query(sqlStatement);
            return result.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getMonthlySales()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedMonthlySales(data: string) {
        const sqlStatement = `
        BEGIN;
        INSERT INTO monthly_sales
        (${tableColumns.monthly_sales.join(', ')})
        SELECT 
            ${tableColumns.monthly_sales.join(', ')}
        FROM json_populate_recordset(null::monthly_sales, '${data?.replace(/'/g, "''")}');
        SELECT setval('monthly_sales_key_seq', (SELECT max(key) FROM monthly_sales));
        COMMIT;
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response[1].rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedMonthlySales()', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getSalesAllocation(applicableMonths: string[], areaCode: string) {
        const forecastMonth = commonHelper.generateForecastMonthDate(applicableMonths);
        const sqlStatement = `
        select
            ${tableColumns.sales_allocation.join(', ')}
        from
            public.sales_allocation
        where
            forecast_month similar to '%(${forecastMonth})%'
            and asm_code = '${areaCode}'`;
        const client = await conn.getReadClient();
        try {
            const result = await client.query(sqlStatement);
            return result?.rows;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getSalesAllocation()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedSalesAllocation(data: string) {
        const conflictColumns = [
            'key'
        ];
        const updateColumns = tableColumns.sales_allocation.filter((column) => !conflictColumns.includes(column));
        const updateStatement = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
        const sqlStatement = `
        BEGIN;
        INSERT INTO sales_allocation
        (${tableColumns.sales_allocation.join(', ')})
        SELECT 
            ${tableColumns.sales_allocation.join(', ')}
        FROM json_populate_recordset(null::sales_allocation, '${data.replace(/'/g, "''")}')
        ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateStatement};
        SELECT setval('sales_allocation_key_seq', (SELECT max(key) FROM sales_allocation));
        COMMIT;
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response[1].rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedSalesAllocation()', error);
            return false;
        } finally {
            client?.release();
        }
    },

    async getUpdateSalesAllocation(keys: number[]) {
        const sqlStatement = `
        select
            ${tableColumns.updated_sales_allocation.join(', ')}
        from
            public.updated_sales_allocation
        where
            sales_allocation_key in (${keys.join(',')})`;

        const client = await conn.getReadClient();
        try {
            let result;
            if (keys.length > 0)
                result = await client.query(sqlStatement);
            return result?.rows ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> getUpdateSalesAllocation()', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async seedUpdateSalesAllocation(data: string) {
        const conflictColumns = [
            'sales_allocation_key'
        ];
        const updateColumns = tableColumns.updated_sales_allocation.filter((column) => !conflictColumns.includes(column));
        const updateStatement = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');

        const sqlStatement = `
        BEGIN;
        INSERT INTO updated_sales_allocation
        (${tableColumns.updated_sales_allocation.join(', ')})
        SELECT 
            ${tableColumns.updated_sales_allocation.join(', ')}
        FROM json_populate_recordset(null::updated_sales_allocation, '${data}')
        ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateStatement};
        SELECT setval('updated_sales_allocation_key_seq', (SELECT max(key) FROM updated_sales_allocation));
        COMMIT;
        `;
        let client: any = null;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            return response[1].rowCount;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedModel -> seedUpdateSalesAllocation()', error);
            return false;
        } finally {
            client?.release();
        }
    }
}