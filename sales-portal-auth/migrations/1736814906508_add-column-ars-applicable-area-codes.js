/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE area_codes ADD COLUMN IF NOT EXISTS ars_applicable  BOOLEAN DEFAULT FALSE;
        `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE area_codes DROP COLUMN IF EXISTS ars_applicable;
        `);
};
