/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_audit_trail add column if not exists item_number varchar;
        Alter table if exists mt_ecom_audit_trail add column if not exists message_logs varchar;
        `)
};

exports.down = pgm => {};
