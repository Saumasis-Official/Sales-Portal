/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`ALTER TABLE IF EXISTS pdp_unlock_request ADD COLUMN IF NOT EXISTS plant_codes _varchar DEFAULT '{}';`);
};

exports.down = (pgm) => {
    pgm.sql(`AlTER TABLE IF EXISTS pdp_unlock_request DROP COLUMN IF EXISTS plant_codes;`);
};
