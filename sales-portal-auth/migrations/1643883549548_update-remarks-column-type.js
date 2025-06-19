/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS service_requests ALTER COLUMN remarks TYPE TEXT;
    
    `);

};

exports.down = pgm => { 

    pgm.sql(`
    
        ALTER TABLE IF EXISTS service_requests ALTER COLUMN remarks TYPE VARCHAR(255);
    
    `);

};
