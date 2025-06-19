/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
         ALTER TABLE credit.cl_account_master ADD COLUMN IF NOT EXISTS file_id varchar NOT NULL;
        `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE credit.cl_account_master DROP COLUMN IF EXISTS file_id;
        `);
};
