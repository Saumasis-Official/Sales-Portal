/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS ro_enable boolean default false;
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS bo_enable boolean default false;
`);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS ro_enable;
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS bo_enable;
    `);
};