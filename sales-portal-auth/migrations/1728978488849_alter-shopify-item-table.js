/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists shopify.shopify_item_table add column if not exists ror_trail varchar;
        `)
};

exports.down = pgm => {};
