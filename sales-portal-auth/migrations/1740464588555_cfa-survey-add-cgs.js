/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(
        `UPDATE app_level_settings
        SET allowed_values = '{"50","DMS","34","22","24","12","19","21","46","38","26","25","45","17","10","14","20","35","62","51","33","27","29","18","13","28","41","37","42","30","43","15","44","11","16","31","48","63","69","70"}'
        WHERE KEY = 'CFA_SURVEY_CGS_ENABLE';`
    );
};

exports.down = (pgm) => { };
