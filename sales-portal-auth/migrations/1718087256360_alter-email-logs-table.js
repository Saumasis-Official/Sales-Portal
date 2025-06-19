/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE public.email_logs ADD IF NOT EXISTS created_by varchar(30) DEFAULT 'SYSTEM_GENERATED';
   `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE public.email_logs DROP COLUMN IF EXISTS created_by;
   `);
};