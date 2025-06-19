/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS session_log ADD COLUMN IF NOT EXISTS user_type varchar DEFAULT 'distributor';
    ALTER TABLE IF EXISTS session_log ALTER COLUMN login_id TYPE varchar(100) USING login_id::varchar(100);
`)};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS session_log DROP COLUMN IF EXISTS user_type;
`)};
