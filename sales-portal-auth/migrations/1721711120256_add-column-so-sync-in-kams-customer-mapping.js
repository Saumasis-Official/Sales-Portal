/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE kams_customer_mapping ADD COLUMN so_sync BOOLEAN DEFAULT FALSE;
        `);
};

exports.down = pgm => {};
