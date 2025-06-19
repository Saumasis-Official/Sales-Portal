/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS service_requests ADD COLUMN IF NOT EXISTS created_on timestamptz NOT NULL DEFAULT NOW();

    `);

};

exports.down = pgm => {};
