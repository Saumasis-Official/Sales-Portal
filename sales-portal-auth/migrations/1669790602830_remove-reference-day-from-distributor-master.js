/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_master DROP COLUMN IF EXISTS reference_date;

    `);
};

exports.down = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_master ADD COLUMN IF EXISTS reference_date;

    `)
};
