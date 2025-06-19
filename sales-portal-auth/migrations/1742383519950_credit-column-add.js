/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.mt_ecom_payer_code_mapping ADD COLUMN IF NOT EXISTS base_limit varchar NULL;
        ALTER TABLE IF EXISTS credit.transactions ADD COLUMN IF NOT EXISTS sap_response jsonb NULL;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.mt_ecom_payer_code_mapping DROP COLUMN IF EXISTS base_limit;
        ALTER TABLE IF EXISTS credit.transactions DROP COLUMN IF EXISTS sap_response;
    `);
};
