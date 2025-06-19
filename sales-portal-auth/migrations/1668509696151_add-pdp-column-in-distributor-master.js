/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS enable_pdp BOOLEAN DEFAULT FALSE;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS enable_pdp;
    
    `);
};
