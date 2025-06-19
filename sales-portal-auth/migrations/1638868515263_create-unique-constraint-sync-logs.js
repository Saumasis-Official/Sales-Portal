/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS sync_logs ADD CONSTRAINT sync_logs_ukey UNIQUE (distributor_id);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS sync_logs DROP CONSTRAINT IF EXISTS sync_logs_ukey;
    
    `);

};
