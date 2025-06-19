/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS noc_enable boolean default false;
`);
};

exports.down = (pgm) => {
  pgm.sql(`
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS noc_enable;
    `);
};
