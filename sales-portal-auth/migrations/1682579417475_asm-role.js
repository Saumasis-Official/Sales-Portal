/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
                ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'ASM';
            END IF;
        END
	$$;
    `)
};

exports.down = pgm => {};
