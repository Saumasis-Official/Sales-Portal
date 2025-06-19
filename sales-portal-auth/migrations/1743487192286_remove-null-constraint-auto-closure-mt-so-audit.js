/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE audit.auto_closure_mt_ecom_so_audit ALTER COLUMN revision_id DROP NOT NULL;
        ALTER TABLE audit.auto_closure_mt_ecom_so_audit ALTER COLUMN rule_id DROP NOT NULL;
    `);
};

exports.down = (pgm) => {};
