/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS credit.audit_history 
        ADD COLUMN IF NOT EXISTS gt_start_date timestamptz NULL,
        ADD COLUMN IF NOT EXISTS gt_end_date timestamptz NULL;
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE credit.audit_history 
        DROP COLUMN IF EXISTS gt_start_date,
        DROP COLUMN IF EXISTS gt_end_date;
        `);
};
