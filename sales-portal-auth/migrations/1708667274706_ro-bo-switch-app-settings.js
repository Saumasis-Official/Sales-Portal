/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
             ('ENABLE_RO_REQUEST', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable/disable rush order requests created from Purchase Order page'),
             ('ENABLE_BO', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable/disable bulk order created from Purchase Order page'),
             ('ENABLE_RO_RESPONSE', 'YES', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable/disable rush order approval/rejection made from Requests window')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, allowed_values = EXCLUDED.allowed_values, field_type = EXCLUDED.field_type, description = EXCLUDED.description;
	         `);
};

exports.down = pgm => {
    pgm.sql(`DELETE FROM app_level_settings where key IN ('ENABLE_RO_REQUEST','ENABLE_BO','ENABLE_RO_RESPONSE');`);
};
