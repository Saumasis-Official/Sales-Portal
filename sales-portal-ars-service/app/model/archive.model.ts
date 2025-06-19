import logger from '../lib/logger';
import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
import { CUSTOMER_GROUPS_FOR_ARS, CUSTOMER_GROUPS_FOR_ORDERING, DISTRIBUTION_CHANNEL_FOR_ARS } from '../constants';
import Helper from '../helper';

const conn = PostgresqlConnection.getInstance();

const ArsArchiveModel = {
    async reindexArsRelatedTables() {
        logger.info('inside ArsArchiveModel -> reindexArsRelatedTables');
        let client: PoolClient | null = null;
        const sqlStatement = `
    REINDEX TABLE orders;
    REINDEX TABLE material_master;
    REINDEX TABLE distributor_master;
    REINDEX TABLE forecast_distribution;
    REINDEX TABLE stock_norm_config;
    REINDEX TABLE sku_rule_configurations;
    `;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            logger.info('inside ArsArchiveModel -> reindexArsRelatedTables, REINDEX COMPLETED!');
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> reindexArsRelatedTables, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncAreaCodeTable() {
        logger.info('Inside ArsArchiveModel -> syncAreaCodeTable');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            /** SOPE-1324, length check applied in area code, since area_code in forecast_configurations table is VARCHAR(4) */
            const query = `
        TRUNCATE TABLE area_codes;

        WITH ars_applicable_areas AS (
          SELECT
            dm.area_code,
            count(dm.id) AS db_count
          FROM
            distributor_master dm
          INNER JOIN customer_group_master cgm ON
            cgm.id = dm.group_id
          INNER JOIN distributor_plants dp ON
            dp.distributor_id = dm.id
          WHERE
            dm.deleted = FALSE
            AND cgm."name" IN (
              ${CUSTOMER_GROUPS_FOR_ARS.map((group) => `'${group}'`).join(',')}
            )
            AND dm.area_code IS NOT NULL
            AND dp.distribution_channel IN (
              ${DISTRIBUTION_CHANNEL_FOR_ARS.map((channel) => `'${channel}'`).join(',')}
            )
          GROUP BY
            dm.area_code
        )
        INSERT
          INTO
          area_codes (
            code ,
            group5_id,
            ars_applicable
          )
        SELECT
          DISTINCT ON
          (dm.area_code)
          dm.area_code AS code,
          dm.group5_id,
          COALESCE( aaa.db_count IS NOT NULL, FALSE) AS is_ars_applicable
        FROM
          distributor_master dm
        LEFT JOIN ars_applicable_areas aaa ON
          aaa.area_code = dm.area_code
        WHERE
          dm.area_code IS NOT NULL
          AND dm.group5_id IS NOT NULL
          AND dm.deleted = FALSE
        ON
          CONFLICT (code) DO
        UPDATE
        SET
          group5_id = EXCLUDED.group5_id,
          ars_applicable = EXCLUDED.ars_applicable;
        `;
            const response = await client.query(query);
            logger.info('inside ArsArchiveModel -> syncAreaCodeTable, COMPLETED!');
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> syncAreaCodeTable, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncArsToleranceTable() {
        logger.info('Inside ArsArchiveModel -> syncArsToleranceTable');
        let client: PoolClient | null = null;
        try {
            client = await conn.getWriteClient();
            const query = `
            update
                ars_tolerance
            set
                deleted = true;

            insert
                into
                ars_tolerance (customer_group_id,
                area_code)
            select
                distinct 
                group_id ,
                area_code
            from
                distributor_master dm
            inner join area_codes ac on
                dm.area_code = ac.code
            inner join customer_group_master cgm on
                (dm.group_id = cgm.id
                    and cgm.name in ('${CUSTOMER_GROUPS_FOR_ORDERING.join("' , '")}'))
            order by
                    area_code,
                    group_id
            on
                conflict (area_code,
                customer_group_id)
                    do
            update
            set
                deleted = false;`;
            await client.query('BEGIN');
            const response = await client.query(query);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> syncArsToleranceTable, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel-> syncArsToleranceTable, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async syncArsGlobalFlag() {
        logger.info('inside ArsArchiveModel -> syncArsGlobalFlag');
        let client: PoolClient | null = null;
        //Query to upsert SWITCH configuration for customer group 52
        const sqlStatement = `
      INSERT
      INTO
      ars_configurations(
        CONFIGURATION,
        region_id,
        customer_group_id,
        auto_order,
        auto_order_submit,
        field_type
      )
      SELECT
      DISTINCT
      'SWITCH':: ars_configuration_type,
        dm.group5_id,
        dm.group_id,
        TRUE,
        FALSE,
        'SET':: app_config_field_type
      FROM
          distributor_master dm
      INNER JOIN customer_group_master cgm ON
        cgm.id = dm.group_id
      WHERE
        cgm.name = '52'
      ON
        CONFLICT DO NOTHING;
    `;
        try {
            client = await conn.getWriteClient();
            const response = await client.query(sqlStatement);
            logger.info('inside ArsArchiveModel -> syncArsGlobalFlag, COMPLETED!');
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsArchiveModel -> syncArsGlobalFlag, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async archiveStockNormConfig(applicableMonth: number) {
        logger.info(`Inside ArsArchiveModel -> archiveStockNormConfig: applicableMonth: ${applicableMonth}`);
        let client: PoolClient | null = null;
        const sqlStatement = `
    INSERT
      INTO
      archive.stock_norm_config_archive
    (
      applicable_month,
      updated_by,
      updated_on,
      remarks,
      dist_id,
      id,
      stock_norm,
      ss_percent,
      psku,
      class_of_last_update
    )
    SELECT
      src.applicable_month,
      src.updated_by,
      src.updated_on,
      src.remarks,
      src.dist_id,
      src.id,
      src.stock_norm,
      src.ss_percent,
      src.psku,
      src.class_of_last_update
    FROM
      public.stock_norm_config AS src
    WHERE
      applicable_month::numeric < ${applicableMonth};
    
    delete from stock_norm_config where applicable_month::numeric < ${applicableMonth};
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveStockNormConfig, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveStockNormConfig, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async archiveForecastDistribution(applicableMonth: number) {
        logger.info(`inside ArsArchiveModel -> archiveForecastDistribution: applicableMonth: ${applicableMonth}`);
        let client: PoolClient | null = null;
        const sqlStatement = `
    INSERT
      INTO
      archive.forecast_distribution_archive
    (
        id,
        distributor_code,
        psku,
        applicable_month,
        pdp,
        division,
        "_1",
        "_2",
        "_3",
        "_4",
        "_5",
        "_6",
        "_7",
        "_8",
        "_9",
        "_10",
        "_11",
        "_12",
        "_13",
        "_14",
        "_15",
        "_16",
        "_17",
        "_18",
        "_19",
        "_20",
        "_21",
        "_22",
        "_23",
        "_24",
        "_25",
        "_26",
        "_27",
        "_28",
        "_29",
        "_30",
        "_31",
        created_on,
        updated_on,
        "class"
      )
    SELECT
      fd.id,
      fd.distributor_code,
      fd.psku,
      fd.applicable_month,
      fd.pdp,
      fd.division,
      fd."_1",
      fd."_2",
      fd."_3",
      fd."_4",
      fd."_5",
      fd."_6",
      fd."_7",
      fd."_8",
      fd."_9",
      fd."_10",
      fd."_11",
      fd."_12",
      fd."_13",
      fd."_14",
      fd."_15",
      fd."_16",
      fd."_17",
      fd."_18",
      fd."_19",
      fd."_20",
      fd."_21",
      fd."_22",
      fd."_23",
      fd."_24",
      fd."_25",
      fd."_26",
      fd."_27",
      fd."_28",
      fd."_29",
      fd."_30",
      fd."_31",
      fd.created_on,
      fd.updated_on,
      fd."class"
    FROM
      public.forecast_distribution AS fd
    WHERE
      fd.applicable_month::numeric < ${applicableMonth};

    delete from forecast_distribution where applicable_month::numeric < ${applicableMonth};
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveForecastDistribution, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveForecastDistribution, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async archiveForecastTotal() {
        let client: PoolClient | null = null;
        const applicableMonth = Helper.applicableMonth();
        logger.info('inside ArsArchiveModel -> archiveForecastTotal, applicableMonth: ', +applicableMonth);
        const sqlStatement = `
    INSERT
        INTO
        archive.ars_forecast_total_archive
      (
        id,
        applicable_month,
        psku,
        forecast_buom,
        forecast_cs,
        area_forecast
      )
      SELECT
        src.id,
        src.applicable_month,
        src.psku,
        src.forecast_buom,
        src.forecast_cs,
        src.area_forecast
      FROM
        public.ars_forecast_total src
      WHERE
        aft.applicable_month::numeric < ${applicableMonth};

      delete from ars_forecast_total where applicable_month::numeric < ${applicableMonth};
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveForecastTotal, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveForecastTotal, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },

    async archiveMonthlySales(archiveMonthString: string) {
        logger.info('inside ArsArchiveModel -> archiveMonthlySales');
        let client: PoolClient | null = null;
        const sqlStatement = `
    INSERT
    INTO
    archive.monthly_sales_archive
    (
      "key",
      sold_to_party,
      asm_code,
      year_month,
      parent_sku,
      parent_desc,
      product_hierarchy,
      customer_name,
      billing_quantity_in_base_unit,
      billing_quantity_in_base_unit_sum,
      percentage_sales,
      created_on
    )
    SELECT
      src."key",
      src.sold_to_party,
      src.asm_code,
      src.year_month,
      src.parent_sku,
      src.parent_desc,
      src.product_hierarchy,
      src.customer_name,
      src.billing_quantity_in_base_unit,
      src.billing_quantity_in_base_unit_sum,
      src.percentage_sales,
      src.created_on
    FROM
      public.monthly_sales AS src
    WHERE src.created_on < '${archiveMonthString}'
    ON
      CONFLICT DO NOTHING;

    delete from monthly_sales where created_on < '${archiveMonthString}';
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveMonthlySales, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveMonthlySales, Error = ', error);
        } finally {
            client?.release();
        }
    },

    async archiveSalesAllocation(archiveMonthString: string) {
        logger.info('inside ArsArchiveModel -> archiveSalesAllocation');
        let client: PoolClient | null = null;

        const sqlStatement = `
    -- Step 1: Archive data from updated_sales_allocation to archive.updated_sales_allocation_archive
    WITH archived_updated_sales_allocation AS (
        INSERT INTO archive.updated_sales_allocation_archive (
            "key",
            updated_allocation,
            updated_on,
            updated_by,
            sales_allocation_key
        )
        SELECT
            usa."key",
            usa.updated_allocation,
            usa.updated_on,
            usa.updated_by,
            usa.sales_allocation_key
        FROM
            public.updated_sales_allocation usa
        WHERE
            usa.sales_allocation_key IN (
                SELECT sa."key"
                FROM public.sales_allocation sa
                WHERE sa.created_on < '${archiveMonthString}'
            )
        RETURNING sales_allocation_key
    )

    -- Step 2: Archive data from sales_allocation to archive.sales_allocation_archive
    INSERT INTO archive.sales_allocation_archive (
        "key",
        sold_to_party,
        asm_code,
        parent_sku,
        parent_desc,
        product_hierarchy,
        customer_name,
        billing_quantity_in_base_unit,
        billing_quantity_in_base_unit_sum,
        percentage_sales,
        forecast_qty,
        forecast_uom,
        by_allocation,
        brand_variant,
        regional_brand,
        grammage,
        base_unit,
        weight_unit,
        forecast_month,
        created_on,
        contribution,
        cumulative_sum,
        "class",
        quantity_norm
    )
    SELECT
        sa."key",
        sa.sold_to_party,
        sa.asm_code,
        sa.parent_sku,
        sa.parent_desc,
        sa.product_hierarchy,
        sa.customer_name,
        sa.billing_quantity_in_base_unit,
        sa.billing_quantity_in_base_unit_sum,
        sa.percentage_sales,
        sa.forecast_qty,
        sa.forecast_uom,
        sa.by_allocation,
        sa.brand_variant,
        sa.regional_brand,
        sa.grammage,
        sa.base_unit,
        sa.weight_unit,
        sa.forecast_month,
        sa.created_on,
        sa.contribution,
        sa.cumulative_sum,
        sa."class",
        sa.quantity_norm
    FROM
        public.sales_allocation sa
    WHERE
        sa.created_on < '${archiveMonthString}';

    -- Step 3: Delete archived rows from updated_sales_allocation
    DELETE FROM public.updated_sales_allocation
    WHERE sales_allocation_key IN (
        SELECT sales_allocation_key FROM archived_updated_sales_allocation
    );

    -- Step 4: Delete archived rows from sales_allocation
    DELETE FROM public.sales_allocation
    WHERE created_on < '${archiveMonthString}';
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveSalesAllocation, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveSalesAllocation, Error = ', error);
        } finally {
            client?.release();
        }
    },

    async archiveForecastConfigurations(applicableMonth: number) {
        logger.info('inside ArsArchiveModel -> archiveForecastConfigurations');
        let client: PoolClient | null = null;
        const sqlStatement = `
    INSERT
    INTO
    archive.forecast_configurations_archive
    (
        area_code,
        applicable_month,
        weekly_week1,
        weekly_week2,
        weekly_week3,
        weekly_week4,
        fortnightly_week12,
        fortnightly_week34,
        created_on,
        updated_on,
        is_deleted,
        updated_by,
        customer_group
      )
    SELECT
      src.area_code,
      src.applicable_month,
      src.weekly_week1,
      src.weekly_week2,
      src.weekly_week3,
      src.weekly_week4,
      src.fortnightly_week12,
      src.fortnightly_week34,
      src.created_on,
      src.updated_on,
      src.is_deleted,
      src.updated_by,
      src.customer_group
    FROM
      public.forecast_configurations AS src
      where src.applicable_month::numeric < ${applicableMonth}
    ON
      CONFLICT DO NOTHING;

    delete from forecast_configurations where applicable_month::numeric < ${applicableMonth};
    `;
        try {
            client = await conn.getWriteClient();
            await client.query('BEGIN');
            const response = await client.query(sqlStatement);
            await client.query('COMMIT');
            logger.info('inside ArsArchiveModel -> archiveForecastConfigurations, COMPLETED!');
            return response;
        } catch (error) {
            await client?.query('ROLLBACK');
            logger.error('CAUGHT: Error in ArsArchiveModel -> archiveForecastConfigurations, Error = ', error);
            return null;
        } finally {
            client?.release();
        }
    },
};

export default ArsArchiveModel;
