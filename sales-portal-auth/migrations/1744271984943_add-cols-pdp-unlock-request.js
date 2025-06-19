/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_unlock_request ADD COLUMN IF NOT EXISTS distribution_channels _varchar DEFAULT '{}';
        ALTER TABLE IF EXISTS pdp_unlock_request ADD COLUMN IF NOT EXISTS customer_groups _varchar DEFAULT '{}';
        ALTER TABLE IF EXISTS pdp_unlock_request ADD COLUMN IF NOT EXISTS states _varchar DEFAULT '{}';
        
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_unlock_request DROP COLUMN IF EXISTS distribution_channels;
        ALTER TABLE IF EXISTS pdp_unlock_request DROP COLUMN IF EXISTS customer_groups;
        ALTER TABLE IF EXISTS pdp_unlock_request DROP COLUMN IF EXISTS states;
    `);
};
