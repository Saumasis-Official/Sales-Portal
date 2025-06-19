/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mt_ecom_status_type') THEN
                ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'Base Price Failed';
                ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'Base Price Success';
            END IF;
        END
    $$;
    `)
};

exports.down = pgm => {};
