/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS archive.monthly_sales_archive (
            "key" int8 NULL,
            sold_to_party varchar NULL,
            asm_code varchar(6) NULL,
            year_month varchar(6) NULL,
            parent_sku varchar(18) NULL,
            parent_desc varchar NULL,
            product_hierarchy varchar(18) NULL,
            customer_name varchar NULL,
            billing_quantity_in_base_unit numeric NULL,
            billing_quantity_in_base_unit_sum numeric NULL,
            percentage_sales numeric NULL,
            created_on timestamptz NULL,
            parent_sku_desc varchar(50) NULL
        );

        CREATE TABLE IF NOT EXISTS archive.sales_allocation_archive (
            "key" int8 NULL,
            sold_to_party varchar NULL,
            asm_code varchar(6) NULL,
            parent_sku varchar(18) NULL,
            parent_desc varchar NULL,
            product_hierarchy varchar(18) NULL,
            customer_name varchar NULL,
            billing_quantity_in_base_unit numeric NULL,
            billing_quantity_in_base_unit_sum numeric NULL,
            percentage_sales numeric NULL,
            forecast_qty numeric NULL,
            forecast_uom varchar(8) NULL,
            by_allocation numeric NULL,
            brand_variant varchar NULL,
            regional_brand varchar NULL,
            grammage varchar NULL,
            base_unit varchar(8) NULL,
            weight_unit varchar(8) NULL,
            forecast_month varchar(15) NULL,
            created_on timestamptz NULL,
            contribution numeric NULL,
            cumulative_sum numeric NULL,
            "class" varchar(1) NULL,
            quantity_norm varchar(50) NULL
        );


        CREATE TABLE IF NOT EXISTS archive.updated_sales_allocation_archive (
            "key" int8 NULL,
            updated_allocation numeric NULL,
            updated_on timestamptz NULL,
            updated_by varchar NULL,
            sales_allocation_key int8 NULL
        );

        CREATE TABLE IF NOT EXISTS archive.forecast_configurations_archive (
            area_code varchar(4) NULL,
            applicable_month varchar(6) NULL,
            weekly_week1 varchar(6) NULL,
            weekly_week2 varchar(6) NULL,
            weekly_week3 varchar(6) NULL,
            weekly_week4 varchar(6) NULL,
            fortnightly_week12 varchar(6) NULL,
            fortnightly_week34 varchar(6) NULL,
            created_on timestamptz  NULL,
            updated_on timestamptz  NULL,
            is_deleted bool NULL,
            updated_by varchar(255) NULL,
            customer_group varchar NULL
        );
        `);
};

exports.down = (pgm) => {};
