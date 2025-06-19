/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(
    `ALTER TABLE kams_customer_mapping ADD COLUMN customer_group VARCHAR(255) DEFAULT NULL;`,
  );
};

exports.down = (pgm) => {
  pgm.sql(
    `AlTER TABLE kams_customer_mapping DROP COLUMN customer_group;`,
  );
};
