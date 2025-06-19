/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `ALTER TABLE IF EXISTS orders ALTER COLUMN created_by_user_group TYPE varchar(50);`
    );
};

exports.down = pgm => { };
