/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
    ALTER TABLE IF EXISTS cfa_depot_mapping ADD COLUMN IF NOT EXISTS Logistic_email Varchar(255) default null;

`);
};

exports.down = pgm => {
    
    pgm.sql(`
    
        ALTER TABLE IF EXISTS cfa_depot_mapping DROP COLUMN IF EXISTS Logistic_email;
    
    `);
};
