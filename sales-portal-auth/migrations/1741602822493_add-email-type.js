/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') THEN
                ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'PREAPPROVED_PDP_UNLOCK_REQUEST';
            END IF;
        END
	$$;
    `);
};

exports.down = (pgm) => {};
