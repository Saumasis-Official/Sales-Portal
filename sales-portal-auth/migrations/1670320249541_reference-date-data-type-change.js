/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_plants ALTER column reference_date TYPE VARCHAR;

    `);
};

exports.down = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_plants ADD COLUMN reference_date DATE;

    `);
};
