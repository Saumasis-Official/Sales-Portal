/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table mt_ecom_logs ALTER COLUMN log_type TYPE varchar(100);
    Alter table mt_ecom_logs ALTER COLUMN po_number TYPE varchar(50);
    `)
};

exports.down = pgm => {};
