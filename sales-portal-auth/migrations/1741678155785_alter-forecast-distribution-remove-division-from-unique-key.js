/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE public.forecast_distribution DROP CONSTRAINT forecast_distribution_distributor_code_psku_month_div_key;
        ALTER TABLE public.forecast_distribution ADD CONSTRAINT forecast_distribution_distributor_code_psku_month_key UNIQUE (distributor_code, psku, applicable_month);
    `);
};

exports.down = (pgm) => {};
