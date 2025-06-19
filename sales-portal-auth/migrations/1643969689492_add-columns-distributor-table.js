/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS area_code VARCHAR(10) DEFAULT NULL, ADD COLUMN IF NOT EXISTS channel_code VARCHAR(5) DEFAULT NULL; 
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS area_code, DROP COLUMN IF EXISTS channel_code;
    
    `);

};
