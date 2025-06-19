/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE if exists staging.distributor_master_staging
        ADD COLUMN if not exists payer_code varchar(20) NULL,
        ADD COLUMN if not exists payer_name varchar(255) NULL;

        ALTER TABLE if exists public.distributor_master
        ADD COLUMN if not exists payer_code varchar(20) NULL,
        ADD COLUMN if not exists payer_name varchar(255) NULL;

        ALTER TABLE if exists mt_ecom_payer_code_mapping
        ADD CONSTRAINT unique_customer_code_payer_code UNIQUE (customer_code, payer_code);

        ALTER TABLE IF EXISTS mt_ecom_payer_code_mapping
        ADD COLUMN IF NOT EXISTS updated_on TIMESTAMPTZ DEFAULT NOW();
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE if exists staging.distributor_master_staging
        DROP COLUMN payer_code,
        DROP COLUMN payer_name;

        ALTER TABLE if exists public.distributor_master
        DROP COLUMN payer_code,
        DROP COLUMN payer_name;

        ALTER TABLE if exists mt_ecom_payer_code_mapping
        DROP CONSTRAINT unique_customer_code_payer_code;

        ALTER TABLE IF EXISTS mt_ecom_payer_code_mapping
        DROP COLUMN IF EXISTS updated_on;
    `);
};
