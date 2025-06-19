/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            INSERT INTO app_level_settings(key, value, updated_by, field_type, allowed_values, description)
            VALUES ('MOQ_ENABLE', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable MOQ')
            ON  CONFLICT DO NOTHING;
            
            INSERT INTO app_level_settings(key, value, updated_by, field_type, description)
            VALUES ('MOQ_TOLERANCE', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the MOQ tolerance level')
            ON  CONFLICT DO NOTHING;
        `);
};

exports.down = pgm => {
    pgm.sql(`
            DELETE FROM app_level_settings
            WHERE key IN ('MOQ_ENABLE','MOQ_TOLERANCE');
        `);
};
