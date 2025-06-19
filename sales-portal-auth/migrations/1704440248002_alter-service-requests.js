/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `ALTER TABLE IF EXISTS service_requests ALTER COLUMN created_by_user_group TYPE varchar(25);`
    );
};

exports.down = pgm => {};
