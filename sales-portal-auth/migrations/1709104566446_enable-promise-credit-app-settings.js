/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings(
        key, value, updated_by, field_type,allowed_values, description)
        VALUES 
        ('ENABLE_PROMISE_CREDIT', 'YES', 'PORTAL_MANAGED', 'SET', '{"YES", "NO"}', 'To enable/disable promise credit')
        ON CONFLICT DO NOTHING;   
        `)
};

exports.down = pgm => {
    pgm.sql(`
    DELETE FROM app_level_settings WHERE key='ENABLE_PROMISE_CREDIT';
`);
};
