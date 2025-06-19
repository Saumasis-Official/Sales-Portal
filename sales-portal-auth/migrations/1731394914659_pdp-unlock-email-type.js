/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') THEN
                ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'PDP_WINDOW_UNLOCK_NOTIFICATION';
                ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'PDP_UNLOCK_REQUESTS_SYNC_NOTIFICATION';
            END IF;
        END
	$$;
    `);
};

exports.down = pgm => {};
