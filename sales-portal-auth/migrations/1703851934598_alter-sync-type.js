/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'MDM_SYNC';
    INSERT INTO public.app_level_settings (key, value, updated_by, allowed_values, field_type, description) 
    VALUES('MDM_SYNC', 'YES', 'PORTAL_MANAGED', '{YES,NO}', 
     'SET', 'To enable the proccesing of SKU Forecast file for MDM table')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, allowed_values = EXCLUDED.allowed_values, field_type = EXCLUDED.field_type, description = EXCLUDED.description;

    `);
};

exports.down = pgm => {pgm.sql(
    `
    DELETE FROM app_level_settings where key IN ('MDM_SYNC');`
)};
