/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT NULL;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master DROP COLUMN IF EXISTS tags;
    
    `);

};
