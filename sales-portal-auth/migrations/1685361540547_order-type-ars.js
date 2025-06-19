/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
                ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'ARS';
            END IF;
        END
	$$;
    `)
};

exports.down = pgm => {};
