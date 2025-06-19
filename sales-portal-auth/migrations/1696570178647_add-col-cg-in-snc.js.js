/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`   
    ALTER TABLE IF EXISTS forecast_configurations ADD IF NOT EXISTS customer_group character varying NOT NULL DEFAULT '31'; 
    ALTER TABLE IF EXISTS forecast_configurations DROP CONSTRAINT IF EXISTS forecast_configurations_area_code_applicable_month_key;
    ALTER TABLE IF EXISTS forecast_configurations ADD CONSTRAINT area_code_applicable_month_customer_group_key UNIQUE (area_code, applicable_month, customer_group);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS forecast_configurations DROP IF EXISTS customer_group;
        ALTER TABLE IF EXISTS forecast_configurations DROP CONSTRAINT IF EXISTS area_code_applicable_month_customer_group_key;
        ALTER TABLE IF EXISTS forecast_configurations ADD CONSTRAINT IF NOT EXISTS forecast_configurations_area_code_applicable_month_key UNIQUE (area_code, applicable_month);
    `);
};
