/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        ALTER TABLE material_master ALTER COLUMN pak_code TYPE varchar (15);
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        ALTER TABLE material_master ALTER COLUMN pak_code TYPE varchar (5);
    `);
};
