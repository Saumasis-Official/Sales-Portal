/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
    ALTER TABLE IF EXISTS plant_code_update_request ADD COLUMN IF NOT EXISTS previous_salesDetails varchar(15) default null;

`);
};

exports.down = pgm => {
    pgm.sql(`
    
        ALTER TABLE IF EXISTS plant_code_update_request DROP COLUMN IF EXISTS previous_salesDetails;
    
    `);
};
