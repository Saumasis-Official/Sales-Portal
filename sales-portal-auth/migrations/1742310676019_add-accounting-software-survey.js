/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO cfa_survey_questionnaire (
      logistic_id,
      questions,
      depot_code,
      updated_on,
      survey_start,
      survey_end,
      applicable_distributors
    )
    SELECT
      'PORTAL_MANAGED',
      '"ACCOUNTING_SOFTWARE_SURVEY"',
      '',
      NOW(),
      '2025-03-01T00:00:00+05:30',
      '2025-03-31T23:59:59+05:30',
      ARRAY(
        SELECT
          dm.id
        FROM
          distributor_master dm
        INNER JOIN
          customer_group_master cgm ON dm.group_id = cgm.id
        WHERE
          cgm.name IN ('10', '11', '31', '48')
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM cfa_survey_questionnaire
      WHERE questions = '"ACCOUNTING_SOFTWARE_SURVEY"'
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM cfa_survey_questionnaire
    WHERE questions = '"ACCOUNTING_SOFTWARE_SURVEY"';
  `);
};
