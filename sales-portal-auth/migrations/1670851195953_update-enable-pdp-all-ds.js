/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

   UPDATE distributor_master SET enable_pdp = true;

    `);
};

exports.down = pgm => { };
