/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table mt_ecom_header_table add column if not exists customer varchar(50) Null;`);
};

exports.down = pgm => {};
