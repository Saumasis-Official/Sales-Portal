/* eslint-disable camelcase */

exports.shorthORs = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('ENABLE_BOM_EXPLODE', 'SHOW', 'PORTAL_MANAGED', '{"SHOW", "HIDE"}', 'SET', 'To allow distributor to see the promo/bom items while placing order'); 
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DELETE FROM app_level_settings where key IN ('ENABLE_BOM_EXPLODE');
    `);
};
