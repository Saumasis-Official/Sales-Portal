/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS sync_uuid VARCHAR;  
    `)
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE sync_logs DROP COLUMN IF EXISTS sync_uuid;  
    `)
};
