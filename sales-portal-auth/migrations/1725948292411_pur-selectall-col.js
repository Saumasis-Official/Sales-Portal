/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_unlock_request ADD COLUMN IF NOT EXISTS select_all boolean default false;
`);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS pdp_unlock_request DROP COLUMN IF EXISTS select_all;
    `);
};