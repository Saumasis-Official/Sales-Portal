/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
       ALTER TABLE IF EXISTS kams_customer_mapping ADD COLUMN IF NOT EXISTS payer_code jsonb[];
        `)
};

exports.down = pgm => {};
