/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(
        `INSERT INTO app_level_settings(
	key, value, updated_by, field_type, description)
	VALUES 
    ('GT_CREDIT_CG', '', 'PORTAL_MANAGED', 'TEXT', 
     'To enable/disable Customer Groups for GT_CREDIT_LIMIT')
    ON  CONFLICT DO NOTHING;`,
    );
};

exports.down = (pgm) => { };
