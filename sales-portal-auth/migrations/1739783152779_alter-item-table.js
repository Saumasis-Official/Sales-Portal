/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_item_table alter column site_code type varchar 
        `)
};

exports.down = pgm => {};
