/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS otp ADD COLUMN IF NOT EXISTS invalid_count INT DEFAULT 0, 
        ADD COLUMN IF NOT EXISTS invalid_time TIMESTAMP DEFAULT NULL;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS otp DROP COLUMN IF EXISTS invalid_count, 
        DROP COLUMN IF EXISTS invalid_time;
    
    `);

};
