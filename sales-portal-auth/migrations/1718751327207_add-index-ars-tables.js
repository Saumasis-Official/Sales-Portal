/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS sales_allocation_asm_code_created_on_idx ON sales_allocation(asm_code, created_on);
        CREATE INDEX IF NOT EXISTS stock_norm_config_dist_id_idx ON stock_norm_config(dist_id);
        CREATE INDEX IF NOT EXISTS forecast_distribution_distributor_applicable_month_psku_div_idx ON forecast_distribution(distributor_code, applicable_month, psku, division);
        `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP INDEX IF EXISTS sales_allocation_asm_code_created_on_idx;
        DROP INDEX IF EXISTS stock_norm_config_dist_id_idx;
        DROP INDEX IF EXISTS forecast_distribution_distributor_applicable_month_psku_div_idx;
        `);
};
