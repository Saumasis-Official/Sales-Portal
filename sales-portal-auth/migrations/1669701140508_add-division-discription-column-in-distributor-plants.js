/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    ALTER TABLE distributor_plants ADD COLUMN division_description VARCHAR;

`);
};

exports.down = pgm => { };
