/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('ENABLE_DRAFT', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To allow distributor and admins to view the drafts or not');
    
    `);

};

exports.down = pgm => {

    pgm.sql(`

        DELETE FROM app_level_settings WHERE key = 'ENABLE_DRAFT';
    
    `);

};
