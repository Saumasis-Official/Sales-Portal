/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS audit.auto_closure_mt_ecom_so_audit ADD IF NOT EXISTS process_details jsonb NULL;
        ALTER TABLE IF EXISTS audit.auto_closure_mt_ecom_so_audit ADD IF NOT EXISTS error TEXT NULL;
        `);
};

exports.down = (pgm) => {
    pgm.down(`
        DROP COLUMN IF EXISTS audit.auto_closure_mt_ecom_so_audit.process_details;
        `);
};
