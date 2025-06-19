/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
    ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS ao_enable boolean default false;

`);
};

exports.down = pgm => {
    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS ao_enable;
    
    `);
};

