/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE pdp_lock_audit_trail DROP CONSTRAINT request_id_fkey;
    `);
};

exports.down = pgm => {};
