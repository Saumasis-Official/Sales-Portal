/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
      ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'GT_PRIMARY_APPROVER';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
      ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'GT_SECONDARY_APPROVER';
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {};
