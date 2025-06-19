/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_master DROP COLUMN IF EXISTS pdp_day;

    `);
};

exports.down = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_master ADD COLUMN IF EXISTS pdp_day;

    `)
};
