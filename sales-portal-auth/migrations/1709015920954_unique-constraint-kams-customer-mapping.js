/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE kams_customer_mapping
ADD CONSTRAINT unique_user_id UNIQUE (user_id);
    `);
};

exports.down = pgm => {};
