/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DROP EXTENSION IF EXISTS tablefunc;
    CREATE EXTENSION IF NOT EXISTS tablefunc;
    `)
};

exports.down = pgm => {};
