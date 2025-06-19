/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_item_table add column if not exists tot numeric default 0;
        Alter table if exists mt_ecom_item_table add column if not exists sap_tot numeric default 0;

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mt_ecom_status_type') THEN
                ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'ToT Failed';
                ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'ToT Success';
            END IF;
        END
    $$;

        `)
};

exports.down = pgm => {};
