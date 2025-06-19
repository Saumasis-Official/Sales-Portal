/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_request_type') THEN
        ALTER TYPE service_request_type ADD VALUE IF NOT EXISTS 'CFA_REPORT_ISSUE';
        END IF;
    END
    $$;
       
`);
};

exports.down = pgm => {};
