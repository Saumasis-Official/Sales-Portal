/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `INSERT INTO app_level_settings(
        key, value, updated_by, field_type,allowed_values, description)
        VALUES 
        ('AO_METRO_ADJUSTMENT_START_DATE', '24', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date form which the user will be able to edit the forecast. Applicable for all 12 months'),
        ('AO_METRO_ADJUSTMENT_END_DATE', '27', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date till which the user will be able to edit the forecast. Applicable for all 12 months'),
        ('AO_NON_METRO_ADJUSTMENT_START_DATE', '24', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date form which the user will be able to edit the forecast. Applicable for all 12 months'),
        ('AO_NON_METRO_ADJUSTMENT_END_DATE', '27', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date till which the user will be able to edit the forecast. Applicable for all 12 months')
       ON  CONFLICT DO NOTHING;`
    );
};

exports.down = pgm => { };
