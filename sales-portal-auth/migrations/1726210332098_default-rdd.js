/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO public.app_level_settings (key, value, updated_by, field_type, description) 
    VALUES('MT_ECOM_DEFAULT_RDD_DATE', '40', 'PORTAL_MANAGED', 'TEXT', 'To set the Default SAP Schedule line RDD date');
    `)
};

exports.down = pgm => {};
