/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
       ALTER TABLE if exists public.mt_ecom_header_table ALTER COLUMN  site_code TYPE varchar;
       ALTER TABLE if exists public.mt_ecom_header_table ALTER COLUMN  po_number TYPE varchar;

        `)
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE if exists public.mt_ecom_header_table ALTER COLUMN site_code TYPE varchar(10);
        ALTER TABLE if exists public.mt_ecom_header_table ALTER COLUMN po_number TYPE varchar(15);
        `)
};
