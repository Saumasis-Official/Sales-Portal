/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    
        ALTER TABLE IF EXISTS sync_logs ADD COLUMN IF NOT EXISTS success_at timestamp with time zone DEFAULT NULL;
        ALTER TABLE IF EXISTS sync_logs ADD COLUMN IF NOT EXISTS filename character varying DEFAULT NULL;
    
    `);
};

exports.down = pgm => {
    pgm.sql(`
    
         ALTER TABLE IF EXISTS sync_logs DROP COLUMN IF EXISTS success_at;
         ALTER TABLE IF EXISTS sync_logs DROP COLUMN IF EXISTS filename;

    `);
};
