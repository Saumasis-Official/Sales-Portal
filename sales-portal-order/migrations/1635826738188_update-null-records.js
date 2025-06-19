/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    UPDATE orders SET so_date = created_on WHERE so_date IS NULL AND so_number <>'';
    `);
};

exports.down = pgm => { };
