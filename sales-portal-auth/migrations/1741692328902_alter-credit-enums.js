/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t
                           JOIN pg_enum e ON t.oid = e.enumtypid
                           WHERE t.typname = 'credit.audit_trail_type' AND e.enumlabel = 'REVERTED') THEN
                ALTER TYPE credit.audit_trail_type ADD VALUE 'REVERTED';
            END IF;
        END $$;

        ALTER TABLE credit.transactions ADD COLUMN IF NOT EXISTS expiry_type varchar NULL;
        
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE credit.trasactions DROP COLUMN IF EXISTS expiry_type;
        `);
};
