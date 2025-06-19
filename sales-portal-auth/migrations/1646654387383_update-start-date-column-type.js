/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master ALTER COLUMN start_date TYPE DATE;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS material_master ALTER COLUMN start_date TYPE timestamptz;

    `);

};
