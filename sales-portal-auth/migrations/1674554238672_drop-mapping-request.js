/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
     Drop table if exists mapping_requests
    `)
};

exports.down = pgm => {};
