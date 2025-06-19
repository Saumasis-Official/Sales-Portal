/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
         ALTER TABLE kams_customer_mapping DROP column if exists so_sync;
        `);
};

exports.down = pgm => {};