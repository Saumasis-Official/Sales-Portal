/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_plants ADD COLUMN reference_date DATE;

        ALTER TABLE distributor_plants ADD COLUMN pdp_day VARCHAR;

    `);
};

exports.down = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_master DROP COLUMN IF EXISTS pdp_day;

    `);
};
