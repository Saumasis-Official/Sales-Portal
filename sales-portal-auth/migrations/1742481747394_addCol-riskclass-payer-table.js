/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE public.mt_ecom_payer_code_mapping ADD COLUMN IF NOT EXISTS risk_class varchar NULL;
         `);
};

exports.down = pgm => {
    pgm.sql(`
         ALTER TABLE public.mt_ecom_payer_code_mapping DROP COLUMN IF EXISTS risk_class varchar NULL;
         `);
};

