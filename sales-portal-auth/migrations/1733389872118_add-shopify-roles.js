/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
        ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'SHOPIFY_SUPPORT';
        ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'SHOPIFY_OBSERVER';
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
        ALTER TYPE staging.roles_type ADD VALUE IF NOT EXISTS 'SHOPIFY_SUPPORT';
        ALTER TYPE staging.roles_type ADD VALUE IF NOT EXISTS 'SHOPIFY_OBSERVER';
        ALTER TYPE staging.roles_type ADD VALUE IF NOT EXISTS 'FINANCE_CONTROLLER';
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {};
