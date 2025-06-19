/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings(key, value, updated_by, field_type, description)
        VALUES ('PDP_APPROVERS', '', 'PORTAL_MANAGED', 'TEXT', 'To set the emails who are allowed to respond to PDP unlock requests')
        ON CONFLICT DO NOTHING;   
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM app_level_settings WHERE key='PDP_APPROVERS';
    `);
};
