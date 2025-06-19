/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE cfa_survey_questionnaire 
            ADD COLUMN IF NOT EXISTS survey_link TEXT ;
        `)
};

exports.down = pgm => {};
