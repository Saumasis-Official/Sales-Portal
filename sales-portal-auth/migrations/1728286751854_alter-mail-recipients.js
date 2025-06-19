/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `Alter table if exists public.mt_ecom_mail_recipients add column if not exists sales_org varchar;
        `
    )
};

exports.down = pgm => {
    pgm.sql(
        `Alter table if exists public.mt_ecom_mail_recipients drop column if exists sales_org;
        `
    )
};
