/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_lock_audit_trail ADD COLUMN IF NOT EXISTS comments text DEFAULT null;
        ALTER TABLE IF EXISTS pdp_lock_audit_trail ALTER COLUMN distributor_id DROP NOT NULL;

`);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_lock_audit_trail DROP COLUMN IF EXISTS comments;
    `);
};
