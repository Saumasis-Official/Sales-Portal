/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        
    DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_trail_type') THEN
                CREATE TYPE credit.audit_trail_type AS ENUM ('REQUESTED', 'APPROVER1', 'APPROVER2', 'APPROVER3');
            END IF;
        END
        $$;

        ALTER TABLE IF EXISTS credit.transactions 
        ADD COLUMN IF NOT EXISTS filename varchar(255), 
        ADD COLUMN IF NOT EXISTS file_link varchar(255),
        ADD COLUMN IF NOT EXISTS approver1_remarks varchar(255),
        ADD COLUMN IF NOT EXISTS  payer_name varchar(255),
        ALTER COLUMN expirydate TYPE timestamptz USING expirydate::timestamptz;

        
        ALTER TABLE  IF EXISTS credit.audit_trail
        DROP COLUMN IF EXISTS "type",
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS user_id;

        ALTER TABLE IF EXISTS credit.audit_history
        ALTER COLUMN expiry_date TYPE timestamptz USING expiry_date::timestamptz;
                       
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TYPE IF EXISTS audit_trail_type;
    `);
};