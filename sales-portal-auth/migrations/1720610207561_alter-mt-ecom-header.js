/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'Partially processed';
        ALTER TABLE public.kams_customer_mapping ADD CONSTRAINT kams_customer_mapping_ukey UNIQUE (user_id);
        ALTER TABLE public.kams_customer_mapping ALTER COLUMN customer_name DROP NOT NULL;
        `)
};

exports.down = pgm => {};
