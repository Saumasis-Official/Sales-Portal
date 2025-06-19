/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE forecast_distribution DROP CONSTRAINT IF EXISTS forecast_distribution_distributor_code_psku_applicable_mont_key;
    ALTER TABLE forecast_distribution DROP CONSTRAINT IF EXISTS forecast_distribution_distributor_code_psku_month_div_key;
    ALTER TABLE forecast_distribution ADD CONSTRAINT forecast_distribution_distributor_code_psku_month_div_key UNIQUE (distributor_code, psku, applicable_month, division);
    `);
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE forecast_distribution DROP CONSTRAINT IF EXISTS forecast_distribution_distributor_code_psku_month_div_key;
    ALTER TABLE forecast_distribution DROP CONSTRAINT IF EXISTS forecast_distribution_distributor_code_psku_applicable_mont_key;
    ALTER TABLE forecast_distribution ADD CONSTRAINT IF NOT EXISTS forecast_distribution_distributor_code_psku_applicable_mont_key UNIQUE (distributor_code, psku, applicable_month, pdp);
    `);

};
