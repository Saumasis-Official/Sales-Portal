/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CREDIT_EXTENSION_REQUEST' AND enumtypid = 'email_type'::regtype) THEN
                    ALTER TYPE email_type ADD VALUE 'CREDIT_EXTENSION_REQUEST';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CREDIT_EXTENSION_RESPONSE' AND enumtypid = 'email_type'::regtype) THEN
                    ALTER TYPE email_type ADD VALUE 'CREDIT_EXTENSION_RESPONSE';
                END IF;
            END IF;
        END
        $$;

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVER(PRIMARY)' AND enumtypid = 'roles_type'::regtype) THEN
                    ALTER TYPE roles_type ADD VALUE 'APPROVER(PRIMARY)';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVER(SECONDARY)' AND enumtypid = 'roles_type'::regtype) THEN
                    ALTER TYPE roles_type ADD VALUE 'APPROVER(SECONDARY)';
                END IF;
            END IF;
        END
        $$;

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_type') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVER(PRIMARY)' AND enumtypid = 'roles_type'::regtype) THEN
                    ALTER TYPE staging.roles_type ADD VALUE 'APPROVER(PRIMARY)';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVER(SECONDARY)' AND enumtypid = 'roles_type'::regtype) THEN
                    ALTER TYPE staging.roles_type ADD VALUE 'APPROVER(SECONDARY)';
                END IF;
            END IF;
        END
        $$;

        ALTER TABLE  IF EXISTS credit.audit_trail
        ADD COLUMN IF NOT EXISTS status credit.transaction_status, 
        ADD COLUMN IF NOT EXISTS type  credit.audit_trail_type;

    `);
};

exports.down = pgm => {
  pgm.sql(`
        ALTER TABLE IF EXISTS credit.audit_trail
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS type;
    `);
};