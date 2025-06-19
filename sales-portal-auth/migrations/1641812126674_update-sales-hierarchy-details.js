/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS sales_hierarchy_details ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS sales_hierarchy_details DROP COLUMN IF EXISTS deleted;
    
    `);

};
