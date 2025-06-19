/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists shopify.shopify_header_table add column if not exists ror varchar;
        `)
};

exports.down = pgm => {};
