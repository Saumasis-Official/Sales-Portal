/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    Alter table if exists staging.distributor_master_staging add column if not exists grn_type varchar;
    ALTER TABLE public.mt_ecom_customer_type ADD CONSTRAINT mt_ecom_customer_type_customer_code_ukey UNIQUE (customer_code);
    ALTER TABLE public.mt_ecom_customer_type ADD CONSTRAINT mt_ecom_customer_type_customer_code_grn_type_ukey UNIQUE (customer_code,customer_type);
    `)
};

exports.down = pgm => {};
