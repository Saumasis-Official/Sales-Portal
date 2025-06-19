/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`ALTER TABLE if exists material_master ADD COLUMN if not exists buom varchar;`);
};

exports.down = pgm => {
    pgm.sql(`ALTER TABLE if exists material_master DROP COLUMN if exists buom;`);
};
