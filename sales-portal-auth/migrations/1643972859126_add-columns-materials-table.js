/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS appl_areas TEXT[] DEFAULT NULL, ADD COLUMN IF NOT EXISTS appl_channels TEXT[] DEFAULT NULL, ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT NULL; 
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master DROP COLUMN IF EXISTS appl_areas, DROP COLUMN IF EXISTS appl_channels, DROP COLUMN IF EXISTS start_date;

    `);

};
