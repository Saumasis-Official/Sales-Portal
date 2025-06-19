/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
    `INSERT INTO app_level_settings(
	key, value, updated_by, field_type,allowed_values, description)
	VALUES 
    ('PDP_REQUEST_CGS_ENABLE', '', 'PORTAL_MANAGED', 'SET', '{"10","11","12","13","14","15","16","17","18","19","20","21","22","24","26","28","29","30","31","33","34","35","41","42","43","44","45"}', 'To enable/disable Customer Groups for PDP Update Request')
    ON  CONFLICT DO NOTHING;`
    );
};

exports.down = pgm => {};
