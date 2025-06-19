/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
         INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
             ('ENABLE_EMAIL_NOTIFICATION', 'YES', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable/disable email notification sent from the application')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, allowed_values = EXCLUDED.allowed_values, field_type = EXCLUDED.field_type, description = EXCLUDED.description;
	         `);
};

exports.down = pgm => {
    pgm.sql(`
         DELETE FROM app_level_settings where key IN ('ENABLE_EMAIL_NOTIFICATION');
	     `);
};
