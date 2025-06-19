/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ADD UNIQUE (po_number);
    
    `);

};

exports.down = pgm => {};
