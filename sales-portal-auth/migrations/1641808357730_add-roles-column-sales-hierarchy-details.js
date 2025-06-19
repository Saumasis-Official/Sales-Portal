/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE roles_type AS ENUM (
        'SUPER_ADMIN',
        'DIST_ADMIN',
        'TSE'
    );
    ALTER TABLE IF EXISTS sales_hierarchy_details ADD COLUMN IF NOT EXISTS roles roles_type NOT NULL DEFAULT 'TSE';
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TYPE roles_type;
    ALTER TABLE IF EXISTS sales_hierarchy_details DROP COLUMN IF EXISTS roles;
    `);
};
