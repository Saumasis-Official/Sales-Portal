/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
                ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DRAFT';
            END IF;
        END
        $$;

        ALTER TABLE IF EXISTS orders ALTER COLUMN status SET DEFAULT 'DRAFT';
    
    `);

};

exports.down = pgm => {

};
