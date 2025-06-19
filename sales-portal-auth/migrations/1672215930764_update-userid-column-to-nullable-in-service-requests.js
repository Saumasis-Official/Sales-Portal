/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    ALTER TABLE service_requests ALTER column user_id DROP NOT NULL;

`);
};

exports.down = pgm => {};
