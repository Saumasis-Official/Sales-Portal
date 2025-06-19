/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(
    `
   CREATE TYPE service_request_type AS ENUM (
    'REPORT_ISSUE',
    'SD_REQUEST',
    'SD_RESPONSE');
   ALTER TABLE service_request_categories 
   ADD COLUMN type service_request_type DEFAULT 'REPORT_ISSUE' NOT NULL;`,
  );
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE service_request_categories DROP COLUMN type;
           DROP TYPE IF EXISTS service_request_type CASCADE`);
};

