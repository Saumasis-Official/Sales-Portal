/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
         INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
             ('ENABLE_SELF_LIFTING', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable/disable the self-lifting and direct-dispatch feature in application');
	         `);
};

exports.down = pgm => {
    pgm.sql(`
         DELETE FROM app_level_settings where key IN ('ENABLE_SELF_LIFTING');
	     `);
};
