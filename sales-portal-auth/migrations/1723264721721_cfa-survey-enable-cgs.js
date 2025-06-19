/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(
        `INSERT INTO app_level_settings(
	key, value, updated_by, field_type, allowed_values, description)
	VALUES 
    ('CFA_SURVEY_CGS_ENABLE', '', 'PORTAL_MANAGED', 'SET', '{"50","DMS","34","22","24","12","19","21","46","38","26","25","45","17","10","14","20","35","62","51","33","27","29","18","13","28","41","37","42","30","43","15","44","11","16","31","48","63"}', 'To enable/disable Customer Groups for CFA SURVEY')
    ON  CONFLICT DO NOTHING;`,
    );
};

exports.down = (pgm) => { };
