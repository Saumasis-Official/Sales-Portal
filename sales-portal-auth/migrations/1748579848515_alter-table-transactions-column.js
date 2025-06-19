/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE credit.audit_trail
        ALTER COLUMN comments TYPE VARCHAR;
        `);
};

exports.down = (pgm) => {};
