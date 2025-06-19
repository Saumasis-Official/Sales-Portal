/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings(
        key, value, updated_by, field_type,allowed_values, description)
        VALUES 
        ('ENABLE_PROMISE_CREDIT_SECOND', 'YES', 'PORTAL_MANAGED', 'SET', '{"YES", "NO"}', 'To enable/disable 2nd promise credit from Dashboard')
        ON CONFLICT DO NOTHING;   
        
    UPDATE app_level_settings SET key='ENABLE_PROMISE_CREDIT_FIRST' WHERE key='ENABLE_PROMISE_CREDIT';
        `)

        

};
 
exports.down = pgm => {
    pgm.sql(`
    DELETE FROM app_level_settings WHERE key='ENABLE_PROMISE_CREDIT_SECOND';
`);
};
