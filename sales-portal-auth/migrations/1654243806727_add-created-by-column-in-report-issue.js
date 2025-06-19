/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS service_requests ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) DEFAULT NULL, ADD COLUMN IF NOT EXISTS created_by_user_group VARCHAR(15) DEFAULT 'SELF';

    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS service_requests DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_by_user_group;
    
    `);

};
