/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS cart_number VARCHAR(255) DEFAULT NULL, ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS cart_number, DROP COLUMN IF EXISTS deleted;
    
    `);

};
