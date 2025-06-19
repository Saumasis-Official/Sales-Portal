/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings(key, value, updated_by, field_type, description)
        VALUES ('RO_APPROVERS', 'punit.gupta@tataconsumer.com,jehangir.katrak@tataconsumer.com', 'PORTAL_MANAGED', 'TEXT', 'To set the emails who are allowed to respond to Rush Order requests')
        ON CONFLICT DO NOTHING;   
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM app_level_settings WHERE key='RO_APPROVERS';
    `);
};
