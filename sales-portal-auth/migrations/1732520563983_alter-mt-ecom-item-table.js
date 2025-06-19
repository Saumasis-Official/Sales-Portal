/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_item_table add column if not exists uom varchar;
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_item_table drop column if exists uom;
        `)
};
