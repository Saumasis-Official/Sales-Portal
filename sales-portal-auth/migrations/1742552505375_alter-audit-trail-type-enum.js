/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t
                           JOIN pg_enum e ON t.oid = e.enumtypid
                           WHERE t.typname = 'credit.audit_trail_type' AND e.enumlabel = 'MASTER_UPLOAD') THEN
                ALTER TYPE credit.audit_trail_type ADD VALUE 'MASTER_UPLOAD';
            END IF;
        END $$;
        
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type t
                       JOIN pg_enum e ON t.oid = e.enumtypid
                       WHERE t.typname = 'audit_trail_type' AND e.enumlabel = 'MASTER_UPLOAD') THEN
                DELETE FROM pg_enum
                WHERE enumlabel = 'MASTER_UPLOAD' AND enumtypid = 'audit_trail_type'::regtype;
            END IF;
        END $$;
        `);
};
