/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS forecast_configurations
    (
        area_code varchar(4) NOT NULL,
        applicable_month varchar(6) NOT NULL,
        weekly_week1 varchar(6),
        weekly_week2 varchar(6),
        weekly_week3 varchar(6),
        weekly_week4 varchar(6),
        fortnightly_week12 varchar(6),
        fortnightly_week34 varchar(6),
        created_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_on timestamp with time zone NOT NULL DEFAULT NOW(),
        is_deleted boolean DEFAULT false,
        updated_by varchar(255),
        UNIQUE (area_code, applicable_month),
        PRIMARY KEY (area_code, applicable_month)
    );`);
};

exports.down = pgm => {};
