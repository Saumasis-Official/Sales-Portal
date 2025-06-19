/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS reference_date DATE DEFAULT NULL;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS reference_date;

    `);

};
