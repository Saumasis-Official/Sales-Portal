/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE if exists public.mt_ecom_item_table ADD column if not exists invoice_tax json NULL;
        `)
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE if exists public.mt_ecom_item_table DROP column if exists invoice_tax;
        `)
};
