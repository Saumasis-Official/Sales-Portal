/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE if exists public.mt_ecom_header_table ADD column if not exists so_flag boolean NULL Default false;
    `);
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE if exists public.mt_ecom_header_table DROP COLUMN if exists so_flag;
    `);
};
