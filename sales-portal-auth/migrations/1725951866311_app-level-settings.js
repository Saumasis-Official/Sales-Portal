/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO public.app_level_settings (key, value, updated_by, field_type, description) 
    VALUES('MT_ECOM_DEFAULT_SYNC_DATE', '60', 'PORTAL_MANAGED', 'TEXT', 'To set the first time sync date for KAMS');
    INSERT INTO public.app_level_settings (key, value, updated_by, field_type, description) 
    VALUES('MT_ECOM_DEFAULT_PO_EXPIRY_DATE', '180', 'PORTAL_MANAGED', 'TEXT', 'To set the default expiry date for so sync');
    `)
};

exports.down = pgm => {};
