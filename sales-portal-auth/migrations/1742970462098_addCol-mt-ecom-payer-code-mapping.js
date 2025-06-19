/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE public.mt_ecom_payer_code_mapping ADD COLUMN IF NOT EXISTS sap_base_limit varchar NULL;
         `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE public.mt_ecom_payer_code_mapping DROP COLUMN IFEXISTS sap_base_limit varchar NULL;
         `);
};



