/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_audit_trail add column if not exists request_id varchar;
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_audit_trail drop column if exists request_id;
        `)
};
