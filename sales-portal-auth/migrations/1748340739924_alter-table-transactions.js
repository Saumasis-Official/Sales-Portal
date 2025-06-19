/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE credit.transactions
        ALTER COLUMN reason TYPE VARCHAR,
        ALTER COLUMN approver1_remarks TYPE VARCHAR,
        ALTER COLUMN approver2_remarks TYPE VARCHAR,
        ALTER COLUMN approver3_remarks TYPE VARCHAR;
        `);
};

exports.down = (pgm) => {};
