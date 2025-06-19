/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE if exists shopify.shopify_item_table add column if not exists is_deleted boolean default false;
        `)
};

exports.down = pgm => {};
