/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings(
        key, value, updated_by, field_type,allowed_values, description)
        VALUES 
        ('ENABLE_MT_ECOM_SO_SYNC', 'YES', 'PORTAL_MANAGED', 'SET', '{"YES", "NO"}', 'To enable/disable SO Sync for MT ECOM')
        ON CONFLICT DO NOTHING;
    `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('ENABLE_MT_ECOM_SO_SYNC');`);
};
