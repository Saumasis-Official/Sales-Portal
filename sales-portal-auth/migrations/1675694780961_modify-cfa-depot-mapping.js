/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE if exists cfa_depot_mapping
    ALTER COLUMN  contact_number TYPE VARCHAR(50);
    `)
};

exports.down = pgm => {};
