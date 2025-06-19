/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE if exists public.promise_credit ALTER COLUMN po_number DROP NOT NULL;
    `)
};

exports.down = pgm => {};
