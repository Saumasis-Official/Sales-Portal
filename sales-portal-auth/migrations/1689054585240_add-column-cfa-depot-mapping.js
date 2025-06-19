/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`ALTER TABLE IF EXISTS cfa_depot_mapping ADD COLUMN IF NOT EXISTS updated_by varchar(15);
    ALTER TABLE IF EXISTS cfa_depot_mapping ADD COLUMN IF NOT EXISTS remarks text ;`);
};

exports.down = pgm => {
    pgm.sql(`ALTER TABLE IF EXISTS cfa_depot_mapping DROP COLUMN IF EXISTS updated_by;
    ALTER TABLE IF EXISTS cfa_depot_mapping DROP COLUMN IF EXISTS remarks;`);
};



















