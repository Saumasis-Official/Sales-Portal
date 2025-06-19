/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`   
            INSERT INTO forecast_configurations(area_code, applicable_month, weekly_week1, weekly_week2, weekly_week3, weekly_week4, fortnightly_week12, fortnightly_week34, created_on, updated_on, is_deleted, updated_by, customer_group)
                    SELECT area_code, applicable_month, weekly_week1, weekly_week2, weekly_week3, weekly_week4, fortnightly_week12, fortnightly_week34, created_on, updated_on, is_deleted, updated_by, '10' AS customer_group
                    FROM forecast_configurations
                    WHERE applicable_month = (SELECT CONCAT(to_char(current_date, 'YYYY'),to_char(current_date, 'MM')))
            ON CONFLICT DO NOTHING;
    `);
};

exports.down = pgm => {};
