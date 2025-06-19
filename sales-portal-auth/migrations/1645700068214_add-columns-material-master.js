/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS appl_area_channel JSONB[] DEFAULT NULL;

    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master DROP COLUMN IF EXISTS appl_area_channel;
    
    `);

};
