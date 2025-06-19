/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table if exists shopify.shopify_header_table alter column customer type varchar;
    Alter table if exists shopify.shopify_header_table add column if not exists so_date timestamp;
    Alter table if exists shopify.shopify_item_table add column if not exists material_description varchar;
    `)
};

exports.down = pgm => {};
