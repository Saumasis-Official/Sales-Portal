/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter type public.mt_ecom_status_type add VALUE if not exists 'Completely processed';
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Alter type public.mt_ecom_status_type drop VALUE if exists 'Completely processed';
        `)
};
