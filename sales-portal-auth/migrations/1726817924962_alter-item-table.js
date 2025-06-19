/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table if exists mt_ecom_item_table add column if not exists remaining_caselot varchar;
    `)
};

exports.down = pgm => {};
