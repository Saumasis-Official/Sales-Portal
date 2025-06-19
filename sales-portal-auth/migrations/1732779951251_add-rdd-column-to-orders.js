/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS rdd varchar DEFAULT NULL; 
    
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
    
        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS rdd;
    
    `);
};
