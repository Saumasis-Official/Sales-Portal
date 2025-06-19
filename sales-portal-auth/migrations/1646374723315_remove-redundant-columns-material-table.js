/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master DROP COLUMN IF EXISTS appl_areas, DROP COLUMN IF EXISTS appl_channels;
    
    `);

};

exports.down = pgm => {

    
};
