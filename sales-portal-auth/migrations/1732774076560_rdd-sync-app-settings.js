/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
            `INSERT INTO public.app_level_settings ("key",value,updated_by,remarks,allowed_values,field_type,description,created_on,updated_on) VALUES
            ('MT_ECOM_DEFAULT_RDD_SYNC_FROM_DATE', '30', 'PORTAL_MANAGED', NULL, NULL, 'TEXT', 'To set the RDD Sync From Date', 'NOW()', 'NOW()'),
            ('MT_ECOM_DEFAULT_RDD_SYNC_TO_DATE', '0', 'PORTAL_MANAGED', NULL, NULL, 'TEXT', 'To set the RDD Sync To Date', 'NOW()', 'NOW()') ON conflict(key) DO NOTHING;
`)};

exports.down = pgm => {};
