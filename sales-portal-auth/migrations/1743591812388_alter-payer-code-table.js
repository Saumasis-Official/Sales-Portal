/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists  mt_ecom_payer_code_mapping add column if not exists is_deleted boolean default false
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Alter table if exists  mt_ecom_payer_code_mapping drop column if exists is_deleted
        `)
};
