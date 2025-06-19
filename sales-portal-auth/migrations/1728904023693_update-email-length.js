/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        ALTER TABLE public.cfa_depot_mapping ALTER COLUMN email TYPE varchar USING email::varchar;
        `);
};

exports.down = (pgm) => {};
