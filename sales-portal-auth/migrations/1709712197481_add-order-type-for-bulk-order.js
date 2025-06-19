/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'BULK';

 `);
};

exports.down = pgm => {};
