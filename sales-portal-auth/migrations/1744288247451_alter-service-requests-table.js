/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
      ALTER TABLE IF EXISTS service_requests ALTER COLUMN created_by_user_group TYPE VARCHAR(35);
    `);
};

exports.down = (pgm) => {};
