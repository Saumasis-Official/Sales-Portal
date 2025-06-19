/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`INSERT INTO public.app_level_settings ("key",value,updated_by,remarks,allowed_values,field_type,description,created_on,updated_on) VALUES
        ('CCO_PO_VALIDITY', '30', 'PORTAL_MANAGED', NULL, NULL, 'TEXT', 'To set PO Validity date as Current day + 30 days.', 'NOW()', 'NOW()') ON conflict(key) DO NOTHING;
 `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('CCO_PO_VALIDITY');`);
};
