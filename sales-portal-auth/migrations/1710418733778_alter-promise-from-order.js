/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS orders 
    DROP COLUMN promised_credit;    
`);
};

exports.down = pgm => {};
