/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
    ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS reg_enable boolean default true;

`);
};

exports.down = pgm => {
    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS reg_enable;
    
    `);
};