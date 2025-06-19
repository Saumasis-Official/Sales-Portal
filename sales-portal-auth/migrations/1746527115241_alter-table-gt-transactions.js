/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS credit.audit_history 
        ALTER COLUMN gt_start_date TYPE DATE,
        ALTER COLUMN gt_end_date TYPE DATE;
        
        ALTER TABLE IF EXISTS credit.gt_transactions
        ALTER COLUMN start_date TYPE DATE,
        ALTER COLUMN end_date TYPE DATE;
        `);
};

exports.down = (pgm) => {
    pgm.down(`
    `);
};
