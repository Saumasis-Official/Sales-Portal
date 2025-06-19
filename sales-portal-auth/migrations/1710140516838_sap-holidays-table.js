/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS sap_holidays
        (
            key serial NOT NULL PRIMARY KEY,
            year character varying(4),
            state_code character varying(2) NOT NULL,
            state_description character varying(50) NOT NULL,
            holiday_date character varying(10) NOT NULL
        );

    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS sap_holidays;
    `);
};
